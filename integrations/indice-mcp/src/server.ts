#!/usr/bin/env node

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { IndiceClient } from "./indiceClient.js";
import { createIndiceMcpServer } from "./mcpServer.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const indiceClient = new IndiceClient(config);
  if (config.transport === "stdio") {
    const server = createIndiceMcpServer(indiceClient);
    await server.connect(new StdioServerTransport());
    console.error("Indice MCP is ready on stdio.");
    return;
  }

  const app = createMcpExpressApp({ host: config.host });
  app.post("/mcp", async (request, response) => {
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

  app.listen(config.port, config.host, () => {
    console.error(`Indice MCP is ready at http://${config.host}:${config.port}/mcp.`);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Indice MCP failed to start.";
  console.error(message);
  process.exit(1);
});
