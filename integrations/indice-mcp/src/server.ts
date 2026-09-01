#!/usr/bin/env node

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { IndiceClient } from "./indiceClient.js";
import { createIndiceMcpServer } from "./mcpServer.js";

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.transport === "stdio") {
    const indiceClient = new IndiceClient(config);
    const server = createIndiceMcpServer(indiceClient);
    await server.connect(new StdioServerTransport());
    console.error("Indice MCP is ready on stdio.");
    return;
  }

  const app = createMcpExpressApp({ host: config.host });
  const supportedScopes = [
    "sales.today:read", "business.snapshot:read", "hr.people:read", "hr.attendance:read",
    "tasks.read", "sales.read", "pos.read", "inventory.read", "expenses.read",
    "petty_cash.read", "receivables.read", "tasks.create", "expenses.create",
    "petty_cash.expense:create", "petty_cash.deposit:create"
  ];
  const bearerChallenge = (error?: string) => `Bearer ${[
    `resource_metadata=\"${config.oauthResourceMetadataUrl.toString()}\"`,
    `scope=\"${supportedScopes.join(" ")}\"`,
    ...(error ? [`error=\"${error}\"`] : [])
  ].join(", ")}`;

  app.get("/.well-known/oauth-protected-resource", (_request, response) => {
    response
      .status(200)
      .header("Cache-Control", "no-store")
      .json({
        resource: config.resourceUrl.toString(),
        authorization_servers: [config.oauthIssuer.toString().replace(/\/$/, "")],
        scopes_supported: supportedScopes,
        resource_documentation: `${config.oauthIssuer.toString().replace(/\/$/, "")}/home-panel/integrations`
      });
  });
  app.post("/mcp", async (request, response) => {
    const authorization = request.header("authorization");
    if (!authorization?.toLowerCase().startsWith("bearer ")) {
      response
        .status(401)
        .header("WWW-Authenticate", bearerChallenge())
        .json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Authorization required" },
          id: null
        });
      return;
    }
    const accessToken = authorization.slice("bearer ".length).trim();
    const indiceClient = new IndiceClient(config, fetch, accessToken);
    try {
      if (!await indiceClient.hasValidDelegatedAccess()) {
        response
          .status(401)
          .header("WWW-Authenticate", bearerChallenge("invalid_token"))
          .json({
            jsonrpc: "2.0",
            error: { code: -32001, message: "Invalid or expired authorization" },
            id: null
          });
        return;
      }
    } catch {
      response.status(502).json({
        jsonrpc: "2.0",
        error: { code: -32002, message: "Indice authorization service is unavailable" },
        id: null
      });
      return;
    }
    const server = createIndiceMcpServer(indiceClient);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch {
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });
  app.get("/mcp", (_request, response) => response.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed" },
    id: null
  }));
  app.delete("/mcp", (_request, response) => response.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed" },
    id: null
  }));

  const httpServer = app.listen(config.port, config.host, () => {
    console.error(`Indice MCP is ready at http://${config.host}:${config.port}/mcp.`);
  });
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    const shutdown = () => httpServer.close(error => error ? reject(error) : resolve());
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Indice MCP failed to start.";
  console.error(message);
  process.exit(1);
});
