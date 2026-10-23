import { once } from "node:events";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import express from "express";
import type { ErrorRequestHandler } from "express";
import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createVisualProbeServer } from "./tools.js";

/** Anonymous only because every asset is a fixed public synthetic fixture. Loopback only. */
export async function startVisualProbe(port = 0) {
  const app = express();
  app.use(hostHeaderValidation(["localhost", "127.0.0.1"]));
  app.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.post("/mcp", express.json({ limit: "4kb", inflate: false }), async (request, response) => {
    const server = createVisualProbeServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.once("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch {
      if (!response.headersSent) response.status(500).json({ error: "visual_probe_failed" });
      await transport.close(); await server.close();
    }
  });
  app.all("/mcp", (_request, response) => response.header("Allow", "POST").sendStatus(405));
  const invalidBody: ErrorRequestHandler = (error, _request, response, _next) => {
    const large = error?.type === "entity.too.large";
    response.status(large ? 413 : 400).json({ error: large ? "visual_probe_request_too_large" : "visual_probe_invalid_json" });
  };
  app.use(invalidBody);
  const http = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, app).listen(port, "127.0.0.1");
  await once(http, "listening");
  const address = http.address();
  if (!address || typeof address === "string") throw Error("Visual probe has no loopback listener.");
  return { url: new URL(`http://127.0.0.1:${address.port}/mcp`), async close() {
    http.closeAllConnections();
    await new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve()));
  } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--port" || !/^\d+$/.test(args[1] ?? "") || Number(args[1]) < 1024 || Number(args[1]) > 65535)
    throw Error("Usage: node dist/test/visualProbe/server.js --port <1024..65535>");
  const probe = await startVisualProbe(Number(args[1]));
  process.stdout.write(`Synthetic-only MCP: ${probe.url}\nNo ERP access. No authentication. Do not expose production or private files.\n`);
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void probe.close(); });
}
