import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer, type IndiceBusinessReader } from "../mcpServer.js";
import { commercialTools } from "../commercialTools.js";
import { IndiceClient } from "../indiceClient.js";
import { isRetryableRead } from "../toolPolicy.js";
import type { IndiceMcpConfig } from "../config.js";

const record = { kind: "customer", id: null, code: null, name: "Synthetic customer", customerId: null, opportunityId: null,
  contactPerson: null, phone: null, email: null, source: null, status: "active", lifecycleStatus: null, ownerUserCompanyId: 52,
  ownerName: "Synthetic seller", notes: null, currency: null, amount: null, stage: null, expectedCloseDate: null,
  nextAction: null, expirationDate: null, terms: null, items: [] };
const confirmationToken = "idx_confirm_" + "x".repeat(43);
const preview = { action: "create_customer", confirmationToken, expiresAt: "2026-09-25T00:05:00Z", requiresConfirmation: true,
  before: null, after: record, effects: ["Save customer"] };
const base: IndiceBusinessReader = { async getSalesToday() { throw new Error("Unused"); }, async getBusinessSnapshot() { throw new Error("Unused"); },
  async previewCreateTask() { throw new Error("Unused"); }, async createTask() { throw new Error("Unused"); } };
async function connect(reader: IndiceBusinessReader, allowed?: Set<string>) {
  const server = createIndiceMcpServer(reader, allowed); const client = new Client({ name: "isolated-commercial-test", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair(); await server.connect(right); await client.connect(left);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

test("all commercial tools declare exact consent and appropriate mutation metadata", async () => {
  const session = await connect(base);
  try {
    const tools = (await session.client.listTools()).tools;
    for (const [name, definition] of Object.entries(commercialTools)) {
      const tool = tools.find(t => t.name === name); assert.ok(tool, name);
      assert.deepEqual(tool._meta?.securitySchemes, [{ type: "oauth2", scopes: [definition.scope] }]);
      assert.equal(tool.annotations?.readOnlyHint, definition.mode === "read");
      assert.equal(tool.annotations?.destructiveHint, definition.mode === "update");
    }
  } finally { await session.close(); }
});

test("customer preview cannot inject authority and commits cannot inject unconfirmed fields", async () => {
  let previews = 0, commits = 0;
  const session = await connect({ ...base, async commercial(tool, input) {
    if (tool === "preview_create_customer") { previews++; assert.deepEqual(input, { name: record.name, ownerUserCompanyId: 52 }); return preview; }
    commits++; assert.deepEqual(input, { confirmationToken, idempotencyKey: "same-attempt-01" });
    return { action: tool, replayed: false, correlationId: "synthetic", record: { ...record, id: 701, code: "CON-701" } };
  } });
  try {
    for (const injected of [{ companyId: 9 }, { role: "root" }, { userId: 3 }, { unitId: 6 }, { employeeId: 52 }]) {
      assert.equal((await session.client.callTool({ name: "preview_create_customer", arguments: { name: record.name, ...injected } })).isError, true);
    }
    const result = await session.client.callTool({ name: "preview_create_customer", arguments: { name: record.name, ownerUserCompanyId: 52 } });
    assert.equal(result.isError, undefined); assert.equal(previews, 1); assert.equal(commits, 0);
    assert.deepEqual(result.structuredContent, preview);
    assert.equal((await session.client.callTool({ name: "create_customer", arguments: { confirmationToken, idempotencyKey: "same-attempt-01", name: "Injected" } })).isError, true);
    assert.equal((await session.client.callTool({ name: "create_customer", arguments: { confirmationToken, idempotencyKey: "same-attempt-01" } })).isError, undefined);
    assert.equal(commits, 1);
  } finally { await session.close(); }
});

test("partial quote edits preserve omitted items; malformed and fake-total lines are rejected", async () => {
  const edit = commercialTools.preview_update_quote!.input;
  assert.deepEqual(edit.parse({ id: 12, notes: "Only this" }), { id: 12, notes: "Only this" });
  assert.equal(edit.safeParse({ id: 12, amount: 1 }).success, false);
  assert.equal(edit.safeParse({ id: 12, status: "closed_won" }).success, false);
  assert.equal(edit.safeParse({ id: 12, items: [{ productName: "Test", quantity: 1, unitPrice: 2, taxPercent: 16, total: 1 }] }).success, false);
  assert.equal(edit.safeParse({ id: 12, items: [{ productName: "Test", quantity: 1, unitPrice: 2 }] }).success, false);
  assert.equal(edit.safeParse({ id: 12, items: [{ productName: "Test", quantity: -1, unitPrice: 2, taxPercent: 0 }] }).success, false);
});

test("old consent neither discovers nor executes commercial writes", async () => {
  const session = await connect(base, new Set(["search_customers", "list_sales"]));
  try {
    const tools = (await session.client.listTools()).tools;
    assert.equal(tools.some(t => t.name === "create_customer" || t.name === "list_quotes"), false);
    assert.equal((await session.client.callTool({ name: "preview_create_customer", arguments: { name: "Test" } })).isError, true);
  } finally { await session.close(); }
});

const config: IndiceMcpConfig = { backendUrl: new URL("http://127.0.0.1:8082"), authMode: "delegated", accessToken: "idx_ai_synthetic",
  preferredCurrency: "MXN", timeoutMs: 2000, transport: "http", host: "127.0.0.1", port: 3010, oauthIssuer: new URL("http://localhost:8080"),
  resourceUrl: new URL("http://localhost:3010/mcp"), oauthResourceMetadataUrl: new URL("http://localhost:8080/.well-known/oauth-protected-resource") };
test("commercial HTTP preserves requested fields, validates response and never retries an uncertain write", async () => {
  const seen: unknown[] = [];
  const client = new IndiceClient(config, (async (url, init) => {
    assert.equal(String(url), "http://127.0.0.1:8082/api/v1/ai/tools/commercial/preview_create_customer");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer idx_ai_synthetic");
    seen.push(JSON.parse(String(init?.body))); return Response.json(preview);
  }) as typeof fetch);
  await client.commercial("preview_create_customer", { name: record.name }); assert.deepEqual(seen, [{ name: record.name }]);
  let attempts = 0;
  const failing = new IndiceClient(config, (async () => { attempts++; return new Response("private SQL detail", { status: 503 }); }) as typeof fetch);
  await assert.rejects(() => failing.commercial("create_customer", { confirmationToken, idempotencyKey: "same-attempt-01" }), e => e instanceof Error && !e.message.includes("private SQL"));
  assert.equal(attempts, 1);
  for (const [name, definition] of Object.entries(commercialTools)) assert.equal(isRetryableRead(`/api/v1/ai/tools/commercial/${name}`, "POST"), definition.mode === "read");
});
