import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { indiceToolNameSchema, toolCapabilitiesSchema } from "../contracts.js";

const page = { generatedAt: "2026-09-22T04:00:00Z", scopeType: "BUSINESS_OFFICE", returnedCount: 1,
  totalCount: 2, hasMore: true, nextCursor: "djE6MQ" };
const entity = { id: 8, name: "Example", status: "ACTIVE", unitId: 10, businessId: 101 };
const definitions = [
  { tool: "search_customers", method: "searchCustomers", path: "customers", item: { ...entity, code: "CON8" } },
  { tool: "search_providers", method: "searchProviders", path: "providers", item: { ...entity, legalName: "Example LLC", paymentTermsDays: 30 } },
  { tool: "list_warehouses", method: "listWarehouses", path: "warehouses", item: { ...entity, code: "WH8", type: "MAIN" } },
  { tool: "search_budget_lines", method: "searchBudgetLines", path: "budget-lines", item: { ...entity, budgetId: 4, categoryKey: "operations",
    currencyCode: "MXN", plannedAmount: 1000, committedAmount: 200, actualExpenseAmount: 300, availableAmount: 500, healthStatus: "HEALTHY" } },
  { tool: "search_accounting_accounts", method: "searchAccountingAccounts", path: "accounting-accounts", item: { ...entity, code: "5100", groupKey: "EXPENSE" } }
] as const;

for (const definition of definitions) {
  test(`${definition.tool}: delegated MCP roundtrip, redaction, pagination and authority rejection`, async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    const config = loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http" });
    const backend = new IndiceClient(config, (async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response(JSON.stringify({ ...page, items: [{ ...definition.item, taxId: "must-not-leak", metadata: "private" }] }), {
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch, "idx_ai_test-token");
    const server = createIndiceMcpServer(backend, new Set([definition.tool]));
    const client = new Client({ name: "reference-contract", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(b); await client.connect(a);
    try {
      assert.match(client.getInstructions() ?? "", /Lupita/);
      const tools = await client.listTools();
      assert.deepEqual(tools.tools.map(t => t.name), [definition.tool]);
      assert.equal(tools.tools[0]?.annotations?.readOnlyHint, true);
      const result = await client.callTool({ name: definition.tool, arguments: { query: "Example", limit: 1 } });
      assert.equal(result.isError, undefined);
      assert.deepEqual(result.structuredContent, { ...page, items: [definition.item] });
      assert.equal(requests[0]?.url, `http://127.0.0.1:8082/api/v1/ai/tools/references/${definition.path}`);
      assert.equal(new Headers(requests[0]?.init?.headers).get("Authorization"), "Bearer idx_ai_test-token");
      assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), { query: "Example", limit: 1 });
      const unauthorized = await client.callTool({ name: definition.tool, arguments: { companyId: 999 } });
      assert.equal(unauthorized.isError, true);
      assert.equal(requests.length, 1);
      await client.callTool({ name: definition.tool, arguments: { cursor: page.nextCursor, limit: 1 } });
      assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), { cursor: page.nextCursor, limit: 1 });
    } finally { await client.close(); await server.close(); }
  });
}

test("new catalog is closed and accepts all 40 implemented tools", () => {
  assert.equal(indiceToolNameSchema.options.length, 40);
  assert.equal(toolCapabilitiesSchema.parse({ version: "v1", tools: indiceToolNameSchema.options }).tools.length, 40);
  assert.equal(toolCapabilitiesSchema.safeParse({ version: "v1", tools: ["pay_anything"] }).success, false);
});

test("invalid operational output and internal errors are never exposed as business data", async () => {
  for (const response of [
    new Response(JSON.stringify({ ...page, items: [{ id: "invalid", secret: "private" }] })),
    new Response("private SQL credentials", { status: 500 })
  ]) {
    const config = loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http" });
    const backend = new IndiceClient(config, (async () => response) as typeof fetch, "idx_ai_test-token");
    await assert.rejects(() => backend.searchCustomers(), error => error instanceof Error && !error.message.includes("private"));
  }
});
