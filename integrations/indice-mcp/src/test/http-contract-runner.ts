import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadConfig } from "../config.js";

const config = loadConfig();
const client = new Client({ name: "indice-local-http-contract-runner", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(
  new URL(`http://${config.host}:${config.port}/mcp`)
);

await client.connect(transport);
try {
  const tools = await client.listTools();
  if (!tools.tools.some(tool => tool.name === "get_sales_today")) {
    throw new Error("get_sales_today was not registered over Streamable HTTP.");
  }
  const result = await client.callTool({
    name: "get_sales_today",
    arguments: { preferred_currency: config.preferredCurrency }
  });
  if (result.isError) {
    throw new Error(firstText(result.content) || "Tool call failed over Streamable HTTP.");
  }
  process.stdout.write(`${JSON.stringify(result.structuredContent, null, 2)}\n`);
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
