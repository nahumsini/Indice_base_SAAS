import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadConfig } from "../config.js";

const config = loadConfig();
if (!config.accessToken) {
  throw new Error("INDICE_ACCESS_TOKEN is required for the delegated HTTP contract test.");
}
const client = new Client({ name: "indice-local-http-contract-runner", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(
  new URL(`http://${config.host}:${config.port}/mcp`),
  { requestInit: { headers: { Authorization: `Bearer ${config.accessToken}` } } }
);

await client.connect(transport);
try {
  const tools = await client.listTools();
  if (!tools.tools.some(tool => tool.name === "get_sales_today")) {
    throw new Error("get_sales_today was not registered over Streamable HTTP.");
  }
  if (!tools.tools.some(tool => tool.name === "get_business_snapshot")) {
    throw new Error("get_business_snapshot was not registered over Streamable HTTP.");
  }
  const salesResult = await client.callTool({
    name: "get_sales_today",
    arguments: { preferred_currency: config.preferredCurrency }
  });
  if (salesResult.isError) {
    throw new Error(firstText(salesResult.content) || "Sales tool call failed over Streamable HTTP.");
  }
  const snapshotResult = await client.callTool({
    name: "get_business_snapshot",
    arguments: { period: "monthly", preferred_currency: config.preferredCurrency }
  });
  if (snapshotResult.isError) {
    throw new Error(firstText(snapshotResult.content) || "Business snapshot tool call failed over Streamable HTTP.");
  }
  process.stdout.write(`${JSON.stringify({
    salesToday: salesResult.structuredContent,
    businessSnapshot: snapshotResult.structuredContent
  }, null, 2)}\n`);
} finally {
  await client.close();
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
