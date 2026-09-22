#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { IndiceClient } from "./indiceClient.js";
import { createIndiceMcpServer } from "./mcpServer.js";
import { createIndiceHttpApp } from "./httpApp.js";

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.transport === "stdio") {
    await createIndiceMcpServer(new IndiceClient(config)).connect(new StdioServerTransport());
    console.error("Indice MCP is ready on stdio.");
    return;
  }
  const app = createIndiceHttpApp(config);
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

main().catch(() => {
  console.error("Indice MCP failed to start. Check configuration and listener availability.");
  process.exitCode = 1;
});
