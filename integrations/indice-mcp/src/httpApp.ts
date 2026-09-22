import { createHash, randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ErrorRequestHandler, Request, Response } from "express";
import { allowedMcpHosts, type IndiceMcpConfig } from "./config.js";
import { indiceToolNameSchema } from "./contracts.js";
import { IndiceApiError, IndiceClient } from "./indiceClient.js";
import { createIndiceMcpServer } from "./mcpServer.js";
import { bearerChallenge, supportedScopes } from "./toolPolicy.js";
import type { BackendAttempt } from "./backendTransport.js";

type DiagnosticEvent = BackendAttempt | {
  event: "mcp_request"; requestId: string; method: string; tool?: string; status: number;
  durationMs: number; outcome: string; toolCount?: number; catalogFingerprint?: string;
};
export interface HttpDependencies {
  fetcher?: typeof fetch;
  log?: (event: DiagnosticEvent) => void;
}

export function createIndiceHttpApp(config: IndiceMcpConfig, dependencies: HttpDependencies = {}) {
  const fetcher = dependencies.fetcher ?? fetch;
  const log = dependencies.log ?? (event => console.error(JSON.stringify({ timestamp: new Date().toISOString(), ...event })));
  const app = createMcpExpressApp({ host: config.host, allowedHosts: allowedMcpHosts(config.host, config.resourceUrl) });
  app.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Loopback only, outside the exact public /api/v1/ai/mcp proxy route. No user credentials.
  app.get("/healthz", (_request, response) => { response.json({ status: "alive" }); });
  app.get("/readyz", async (_request, response) => {
    try {
      const result = await fetcher(new URL("/api/v1/health", config.backendUrl), {
        redirect: "error", signal: AbortSignal.timeout(Math.min(config.timeoutMs, 1500))
      });
      const body = await result.json() as { status?: string; name?: string };
      if (!result.ok || body.status !== "ok" || body.name !== "indice-erp-api") throw new Error("not_ready");
      response.json({ status: "ready", backend: "reachable" });
    } catch {
      response.status(503).json({ status: "not_ready", backend: "unavailable" });
    }
  });

  const resourceMetadata = (_request: Request, response: Response) => {
    response.header("Access-Control-Allow-Origin", "https://chatgpt.com").json({
      resource: config.resourceUrl.toString(),
      authorization_servers: [config.oauthIssuer.toString().replace(/\/$/, "")],
      scopes_supported: supportedScopes,
      resource_documentation: `${config.oauthIssuer.toString().replace(/\/$/, "")}/support`
    });
  };
  app.get("/.well-known/oauth-protected-resource", resourceMetadata);
  app.get("/.well-known/oauth-protected-resource/mcp", resourceMetadata);

  app.post("/mcp", async (request, response) => {
    const requestId = randomUUID();
    response.setHeader("X-Request-ID", requestId);
    const start = performance.now();
    const cancellation = new AbortController();
    const methods = new Set(["initialize", "notifications/initialized", "ping", "tools/list", "tools/call"]);
    const method = methods.has(request.body?.method) ? request.body.method as string : "other";
    const candidate = method === "tools/call" ? indiceToolNameSchema.safeParse(request.body?.params?.name) : undefined;
    const tool = candidate ? candidate.success ? candidate.data : "unknown" : undefined;
    let outcome = "processing";
    let toolCount: number | undefined;
    let catalogFingerprint: string | undefined;
    let finished = false;
    let cleanup: (() => void) | undefined;
    response.once("finish", () => { finished = true; });
    response.once("close", () => {
      cancellation.abort();
      cleanup?.();
      log({ event: "mcp_request", requestId, method, tool, status: response.statusCode,
        durationMs: Math.round(performance.now() - start), outcome: finished ? outcome : "client_disconnected",
        toolCount, catalogFingerprint });
    });
    const rpcError = (status: number, code: number, message: string) => {
      if (response.destroyed || response.headersSent) return;
      const id = typeof request.body?.id === "number" || typeof request.body?.id === "string" ? request.body.id : null;
      response.status(status).json({ jsonrpc: "2.0", error: { code, message }, id });
    };
    const authorization = request.header("authorization");
    if (!authorization?.toLowerCase().startsWith("bearer ") || !authorization.slice(7).trim() || authorization.length > 4096) {
      outcome = "authorization_required";
      response.header("WWW-Authenticate", bearerChallenge(config.oauthResourceMetadataUrl));
      rpcError(401, -32001, "Authorization required");
      return;
    }
    const reader = new IndiceClient(config, fetcher, authorization.slice(7).trim(), {
      requestId, signal: cancellation.signal,
      observe: event => {
        if (event.operation !== "capabilities") {
          outcome = event.outcome === "response" && (event.status ?? 500) < 400 ? "completed" : "tool_failed";
        }
        log(event);
      }
    });
    let allowedTools: ReadonlySet<string>;
    try {
      const capabilities = await reader.getDelegatedToolCapabilities();
      if (!capabilities) {
        outcome = "authorization_invalid";
        response.header("WWW-Authenticate", bearerChallenge(config.oauthResourceMetadataUrl, "invalid_token"));
        rpcError(401, -32001, "Invalid or expired authorization");
        return;
      }
      allowedTools = new Set(capabilities.tools);
      toolCount = allowedTools.size;
      catalogFingerprint = createHash("sha256").update([...allowedTools].sort().join("\n")).digest("hex").slice(0, 16);
    } catch (error) {
      if (error instanceof IndiceApiError && error.status === 403) {
        outcome = "authorization_denied";
        rpcError(403, -32003, "Current Indice permissions deny access");
        return;
      }
      outcome = "capabilities_unavailable";
      response.header("Retry-After", "1");
      rpcError(503, -32002, "Indice is temporarily unavailable. Retry; reconnect only if authorization is rejected.");
      return;
    }
    if (cancellation.signal.aborted || response.destroyed) return;
    // Stateless by design: reauthorize every request, without cross-user or stale catalog caches.
    const server = createIndiceMcpServer(reader, allowedTools);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const send = transport.send.bind(transport);
    transport.send = async (message, options) => {
      // SDK 1.x preserves _meta but does not emit this OpenAI descriptor extension.
      // Mirror it at the wire boundary without replacing SDK discovery/schema handling.
      if (method === "tools/list" && "result" in message && Array.isArray(message.result.tools)) {
        message = { ...message, result: { ...message.result,
          tools: message.result.tools.map(descriptor => ({ ...descriptor,
            securitySchemes: descriptor._meta?.securitySchemes })) } };
      }
      // Inspect only the result flag, never serialize or log business payloads.
      if (method === "tools/call" && "result" in message && outcome !== "tool_not_available") {
        outcome = message.result.isError === true ? "tool_failed" : "completed";
      }
      return send(message, options);
    };
    cleanup = () => { void transport.close().catch(() => {}); void server.close().catch(() => {}); };
    try {
      outcome = tool && !allowedTools.has(tool) ? "tool_not_available" : toolCount === 0 ? "no_authorized_tools" : "completed";
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch {
      outcome = "protocol_error";
      rpcError(500, -32603, "Unable to process this MCP request");
      cleanup();
    }
  });

  const unsupported = (request: Request, response: Response) => {
    if (!request.header("authorization")?.toLowerCase().startsWith("bearer ")) {
      response.header("WWW-Authenticate", bearerChallenge(config.oauthResourceMetadataUrl))
        .status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Authorization required" }, id: null });
      return;
    }
    response.header("Allow", "POST").status(405)
      .json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  };
  app.get("/mcp", unsupported);
  app.delete("/mcp", unsupported);
  const malformed: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    const oversized = typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large";
    if (!response.headersSent) response.header("Cache-Control", "no-store").status(oversized ? 413 : 400)
      .json({ jsonrpc: "2.0", error: { code: -32700, message: "Invalid or oversized JSON request" }, id: null });
  };
  app.use(malformed);
  return app;
}
