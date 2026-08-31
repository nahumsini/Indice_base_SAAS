import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";

test("lists and executes get_sales_today through MCP", async () => {
  const server = createIndiceMcpServer({
    async getSalesToday(preferredCurrency) {
      assert.equal(preferredCurrency, "MXN");
      return summary();
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name), ["get_sales_today"]);
    assert.equal(tools.tools[0]?.annotations?.readOnlyHint, true);

    const result = await client.callTool({
      name: "get_sales_today",
      arguments: { preferred_currency: "MXN" }
    });

    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, summary());
    assert.match(firstText(result.content), /2 ventas/);
  } finally {
    await client.close();
    await server.close();
  }
});

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

function summary() {
  return {
    date: "2026-08-31",
    timezone: "America/Toronto",
    saleCount: 2,
    monetaryTotal: {
      preferredCurrency: "MXN",
      preferredTotal: 500,
      nativeTotals: [{ currency: "MXN", amount: 500 }],
      exchangeRate: { mode: "daily", effectiveDate: "2026-08-31", source: "Official" },
      partial: false,
      excludedRecords: 0,
      excludedCurrencies: []
    }
  };
}
