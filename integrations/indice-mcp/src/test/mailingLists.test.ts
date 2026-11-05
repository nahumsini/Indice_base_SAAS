import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { mailingAssignmentInput, mailingAssignmentResult, mailingListToolNames } from "../mailingListContracts.js";

const config = loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8083", INDICE_MCP_TRANSPORT: "http" });
const list = {
  id: "57729a14-dd71-450f-ad37-0d31fe2c1ce1",
  name: "Prospecting",
  version: 1,
  contactCount: 1,
  updatedAt: "2026-11-04T18:00:00Z",
};

test("Mailing tools preserve legacy discovery and forward only the confirmed action", async () => {
  const token = "idx_confirm_" + "a".repeat(43);
  const calls: { path: string; body: unknown }[] = [];
  const reader = new IndiceClient(config, (async (input, init) => {
    const path = new URL(String(input)).pathname;
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer idx_ai_test");
    const body = JSON.parse(String(init?.body));
    calls.push({ path, body });
    if (path.endsWith("list_mailing_lists")) return Response.json({ lists: [list], total: 1, filters: { sources: ["website"], owners: [], tags: [] } });
    if (path.endsWith("/preview")) return Response.json({
      list, additions: [{ id: 2, name: "Fixture", companyName: "Synthetic" }], alreadyInList: 1,
      projectedCount: 2, confirmationToken: token, expiresAt: "2026-11-04T18:05:00Z", confirmationRequired: true,
    });
    return Response.json({ result: { list: { ...list, version: 2, contactCount: 2 }, added: 1 }, replayed: calls.length === 4, correlationId: "test" });
  }) as typeof fetch, "idx_ai_test");
  const legacyTools = ["search_customers", "preview_update_customer", "update_customer"];
  for (const allowed of [legacyTools, [...legacyTools, ...mailingListToolNames]]) {
    const server = createIndiceMcpServer(reader, new Set(allowed));
    const client = new Client({ name: "Mailing regression", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(b);
    await client.connect(a);
    try {
      const tools = (await client.listTools()).tools;
      assert.deepEqual(tools.map(tool => tool.name).sort(), [...allowed].sort());
      if (allowed.length === legacyTools.length) continue;
      const [read, preview, commit] = mailingListToolNames;
      assert.deepEqual(tools.find(t => t.name === read)?._meta?.securitySchemes, [{ type: "oauth2", scopes: ["mailing.lists.read"] }]);
      assert.deepEqual(tools.find(t => t.name === commit)?._meta?.securitySchemes, [{ type: "oauth2", scopes: ["mailing.lists.assign"] }]);
      assert.equal((await client.callTool({ name: read, arguments: {} })).isError, undefined);
      const filters = { source: "website", listId: "none" };
      assert.equal((await client.callTool({ name: preview, arguments: { listId: list.id, filters } })).isError, undefined);
      assert.deepEqual(calls[1]?.body, { listId: list.id, filters });
      const confirmation = { confirmation_token: token, idempotency_key: "mailing-retry-001" };
      assert.equal((await client.callTool({ name: commit, arguments: confirmation })).isError, undefined);
      const replay = await client.callTool({ name: commit, arguments: confirmation });
      assert.equal(mailingAssignmentResult.parse(replay.structuredContent).replayed, true);
      assert.deepEqual(calls[2]?.body, { confirmationToken: token, idempotencyKey: "mailing-retry-001" });
      assert.deepEqual(calls[2], calls[3]);
      assert.equal((await client.callTool({ name: commit, arguments: { ...confirmation, contactIds: [99] } })).isError, true);
      assert.equal(calls.length, 4);
    } finally { await client.close(); await server.close(); }
  }
});

test("Mailing preview accepts a bounded selection or explicit filters", () => {
  assert.equal(mailingAssignmentInput.safeParse({ listId: list.id, contactIds: [3] }).success, true);
  assert.equal(mailingAssignmentInput.safeParse({ listId: list.id, filters: { owner: 3 } }).success, true);
  for (const input of [
    { filters: {} }, { contactIds: [] }, { filters: { companyId: 5 } },
    { contactIds: [3], filters: { owner: 3 } }, { contactIds: Array.from({ length: 501 }, (_, i) => i + 1) },
  ]) {
    assert.equal(mailingAssignmentInput.safeParse({ listId: list.id, ...input }).success, false);
  }
});
