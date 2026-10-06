import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { processTaskMetricsSchema } from "../processTaskKpiTools.js";

test("process KPIs preserve owner nulls, summaries and pagination and reject injected authority", async () => {
  const metrics = Object.fromEntries(Object.keys(processTaskMetricsSchema.shape).map(key => [key,
    key === "ratingDistribution" ? [0, 0, 0, 0, 0] : /Rate|median|average/.test(key) ? null : 0]));
  const requests: { url: string; body: unknown }[] = [];
  const config = loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http" });
  const expected = { definitionVersion: 1, from: "2026-10-01", to: "2026-10-06", cutoffDate: "2026-10-06", upcomingThrough: "2026-10-06",
    summary: metrics, activity: [], items: [], returnedCount: 0, totalCount: 0, hasMore: false, nextCursor: null };
  const backend = new IndiceClient(config, (async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ ...expected, rawSql: "private" }));
  }) as typeof fetch, "idx_ai_test");
  const server = createIndiceMcpServer(backend, new Set(["get_process_task_kpis"]));
  const client = new Client({ name: "kpi-contract", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  try {
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ["get_process_task_kpis"]);
    const args = { from: expected.from, to: expected.to, entity: "project", focus: "team", unitId: 4, businessId: 5, limit: 1 };
    const result = await client.callTool({ name: "get_process_task_kpis", arguments: args });
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, expected);
    assert.equal(requests[0]?.url, "http://127.0.0.1:8082/api/v1/ai/tools/kpis/get_process_task_kpis");
    assert.deepEqual(requests[0]?.body, args);
    assert.equal((await client.callTool({ name: "get_process_task_kpis", arguments: { ...args, companyId: 99 } })).isError, true);
    assert.equal(requests.length, 1);
  } finally { await client.close(); await server.close(); }
});
