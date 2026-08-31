import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig } from "../config.js";
import { IndiceClient } from "../indiceClient.js";
import { createIndiceMcpServer } from "../mcpServer.js";

const config = loadConfig();
const server = createIndiceMcpServer(new IndiceClient(config));
const client = new Client({ name: "indice-local-contract-runner", version: "0.1.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

await server.connect(serverTransport);
await client.connect(clientTransport);
try {
  const tools = await client.listTools();
  if (!tools.tools.some(tool => tool.name === "get_sales_today")) {
    throw new Error("get_sales_today was not registered.");
  }
  const result = await client.callTool({
    name: "get_sales_today",
    arguments: { preferred_currency: config.preferredCurrency }
  });
  if (result.isError) {
    const message = firstText(result.content) || "Tool call failed.";
    throw new Error(message);
  }
  process.stdout.write(`${JSON.stringify(result.structuredContent, null, 2)}\n`);
} finally {
  await client.close();
  await server.close();
}

function firstText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  const first: unknown = content[0];
  if (typeof first !== "object" || first === null || !("type" in first) || !("text" in first)) {
    return "";
  }
  return first.type === "text" && typeof first.text === "string" ? first.text : "";
}
