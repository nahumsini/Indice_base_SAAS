import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer, type IndiceBusinessReader } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import type { IndiceMcpConfig } from "../config.js";

const draft = { title: "Follow up", description: null, priority: "high" as const, dueDate: null,
  assignee: "Synthetic assignee", assigneeUserCompanyId: 52, unitId: 4, unitName: "Test unit",
  businessId: 9, businessName: "Test business", status: "pending" };
const preview = { confirmationToken: "idx_confirm_synthetic_preview", expiresAt: "2026-09-25T00:05:00Z",
  requiresConfirmation: true as const, task: draft };
const result = { replayed: false, correlationId: "550e8400-e29b-41d4-a716-446655440000",
  task: { id: 701, folio: "T-701", title: draft.title, status: "pending", dueDate: null,
    assigneeUserCompanyId: 52, assignee: "Synthetic assignee" } };
const base: IndiceBusinessReader = {
  async getSalesToday() { throw new Error("Unused"); },
  async getBusinessSnapshot() { throw new Error("Unused"); },
  async previewCreateTask() { return preview; }, async createTask() { return result; }
};
async function connect(reader: IndiceBusinessReader, allowed?: Set<string>) {
  const server = createIndiceMcpServer(reader, allowed);
  const client = new Client({ name: "isolated-task-test", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await client.connect(left);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

test("delegation resolves membership IDs, previews recipient and rejects injected authority", async () => {
  let previews = 0;
  const page = { generatedAt: "2026-09-25T00:00:00Z", scopeType: "TASK_ASSIGNMENT_SCOPE",
    items: [{ userCompanyId: 52, name: "Synthetic assignee", unitId: 4, unitName: "Test unit", businessId: 9, businessName: "Test business" }],
    returnedCount: 1, totalCount: 1, hasMore: false, nextCursor: null };
  const session = await connect({ ...base,
    async searchTaskAssignees(request) { assert.equal(request?.query, "Synthetic"); return page; },
    async previewCreateTask(request) { previews++; assert.equal(request.assigneeUserCompanyId, 52); return preview; }
  });
  try {
    assert.deepEqual((await session.client.callTool({ name: "search_task_assignees", arguments: { query: "Synthetic" } })).structuredContent, page);
    const prepared = await session.client.callTool({ name: "preview_create_task", arguments: { title: draft.title, assignee_user_company_id: 52 } });
    assert.equal(prepared.isError, undefined);
    assert.match(JSON.stringify(prepared.content), /Synthetic assignee/);
    for (const forbidden of [{ company_id: 2 }, { user_id: 2 }, { role: "admin" }, { employee_id: 2 }]) {
      assert.equal((await session.client.callTool({ name: "preview_create_task", arguments: { title: draft.title, ...forbidden } })).isError, true);
    }
    assert.equal(previews, 1);
  } finally { await session.close(); }
});

test("editing preserves omitted fields and commits only the immutable confirmation", async () => {
  let commits = 0;
  const session = await connect({ ...base,
    async previewUpdateTask(request) {
      assert.deepEqual(JSON.parse(JSON.stringify(request)), { taskId: 701, priority: "high", assigneeUserCompanyId: 52 });
      return { ...preview, before: { ...draft, priority: "low", assignee: "Previous assignee" },
        task: { ...draft, taskId: 701, expectedVersion: "version", changedFields: ["priority", "assignedUserCompanyId"] } };
    },
    async updateTask(request) {
      commits++;
      assert.deepEqual(request, { confirmationToken: preview.confirmationToken, idempotencyKey: "synthetic-retry-key" });
      return result;
    }
  });
  try {
    const tools = (await session.client.listTools()).tools;
    assert.equal(tools.find(tool => tool.name === "update_task")?.annotations?.destructiveHint, true);
    assert.equal(tools.find(tool => tool.name === "preview_update_task")?.annotations?.destructiveHint, false);
    const prepared = await session.client.callTool({ name: "preview_update_task", arguments: { task_id: 701, priority: "high", assignee_user_company_id: 52 } });
    assert.equal(prepared.isError, undefined);
    assert.match(JSON.stringify(prepared.content), /Previous assignee.*Synthetic assignee/);
    assert.match(JSON.stringify(prepared.content), /low.*high/);
    assert.equal(commits, 0);
    const args = { confirmation_token: preview.confirmationToken, idempotency_key: "synthetic-retry-key" };
    for (const name of ["create_task", "update_task"]) {
      assert.equal((await session.client.callTool({ name, arguments: { ...args, title: "Unconfirmed" } })).isError, true);
    }
    assert.equal((await session.client.callTool({ name: "update_task", arguments: args })).isError, undefined);
    assert.equal(commits, 1);
  } finally { await session.close(); }
});

test("old capability manifests cannot discover or execute new task tools", async () => {
  const session = await connect(base, new Set(["list_tasks", "preview_create_task", "create_task"]));
  try {
    assert.deepEqual(new Set((await session.client.listTools()).tools.map(tool => tool.name)), new Set(["list_tasks", "preview_create_task", "create_task"]));
    for (const name of ["search_task_assignees", "preview_update_task", "update_task"]) {
      assert.equal((await session.client.callTool({ name, arguments: {} })).isError, true);
    }
  } finally { await session.close(); }
});

const config: IndiceMcpConfig = { backendUrl: new URL("http://127.0.0.1:8082"), authMode: "delegated",
  accessToken: "idx_ai_synthetic", preferredCurrency: "MXN", timeoutMs: 2000, transport: "http", host: "127.0.0.1", port: 3010,
  oauthIssuer: new URL("http://localhost:8080"), resourceUrl: new URL("http://localhost:3010/mcp"),
  oauthResourceMetadataUrl: new URL("http://localhost:8080/.well-known/oauth-protected-resource") };

test("update HTTP contract preserves field names and does not retry writes automatically", async () => {
  const requests: { url: string; body: unknown }[] = [];
  const client = new IndiceClient(config, (async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(preview), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch);
  await client.previewUpdateTask({ taskId: 701, clearDueDate: true });
  assert.deepEqual(requests, [{ url: "http://127.0.0.1:8082/api/v1/ai/tools/tasks/update/preview", body: { taskId: 701, clearDueDate: true } }]);
  let attempts = 0;
  const unavailable = new IndiceClient(config, (async () => { attempts++; return new Response("internal detail", { status: 503 }); }) as typeof fetch);
  await assert.rejects(() => unavailable.updateTask({ confirmationToken: preview.confirmationToken, idempotencyKey: "synthetic-retry-key" }), error => error instanceof Error && !error.message.includes("internal detail"));
  assert.equal(attempts, 1);
});
