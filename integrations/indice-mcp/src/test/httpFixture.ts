import { once } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createIndiceHttpApp } from "../httpApp.js";
import { loadConfig, type IndiceMcpConfig } from "../config.js";

export async function httpFixture(fetcher: typeof fetch, overrides: Partial<IndiceMcpConfig> = {}) {
  const events: unknown[] = [];
  const config = { ...loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http",
    INDICE_OAUTH_ISSUER: "https://app.indiceapp.com", INDICE_MCP_RESOURCE: "https://app.indiceapp.com/api/v1/ai/mcp",
    INDICE_OAUTH_RESOURCE_METADATA_URL: "https://app.indiceapp.com/.well-known/oauth-protected-resource",
    INDICE_RETRY_DELAY_MS: "0" }), ...overrides };
  const server = createIndiceHttpApp(config, { fetcher, log: event => events.push(event) }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP listener");
  const url = new URL(`http://127.0.0.1:${address.port}/mcp`);
  const clients: Client[] = [];
  return {
    url, config, events,
    async client(token = "idx_ai_synthetic_A") {
      const client = new Client({ name: "indice-continuity-test", version: "1" });
      clients.push(client);
      await client.connect(new StreamableHTTPClientTransport(url, {
        requestInit: { headers: { Authorization: `Bearer ${token}` } }
      }));
      return client;
    },
    async close() {
      for (const client of clients) await client.close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };
}

export const json = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", ...headers }
});

export function queryResult(tool: string, tenant = "A") {
  return { tool, generatedAt: new Date().toISOString(), scope: "BUSINESS_OFFICE", count: 1,
    summary: { tenant }, items: [{ id: 1, name: `Synthetic ${tenant}` }] };
}
