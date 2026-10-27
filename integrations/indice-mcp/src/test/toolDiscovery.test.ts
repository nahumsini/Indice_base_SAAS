import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { toolScopes } from "../toolPolicy.js";
import { httpFixture, json } from "./httpFixture.js";

const context = {
  generatedAt: "2026-10-27T00:00:00Z", companyId: 1, companyName: "Synthetic company",
  userId: 1, userCompanyId: 1, userName: "Synthetic owner", role: "root",
  scopeType: "CORPORATE_OFFICE", assignedUnitId: null, assignedUnitName: null,
  assignedBusinessId: null, assignedBusinessName: null
};

test("complete HTTP tool discovery has bounded pages and preserves every actual tool contract", async () => {
  const unused = async (): Promise<never> => { throw Error("Unexpected fixture operation"); };
  const server = createIndiceMcpServer({ getSalesToday: unused, getBusinessSnapshot: unused,
    previewCreateTask: unused, createTask: unused });
  const reference = new Client({ name: "catalog-contract-reference", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await reference.connect(left);
  const fixture = await httpFixture((async input => String(input).endsWith("/capabilities")
    ? json({ version: "v1", tools: Object.keys(toolScopes) }) : json(context)) as typeof fetch);
  const client = new Client({ name: "paginated-catalog-contract", version: "1" });
  try {
    const expected = new Map((await reference.listTools()).tools.map(tool => [tool.name, tool]));
    // Synchronous SDK schema compilation can outlast this co-located fixture's idle socket.
    // Fresh connections keep metadata assertions independent of idle keep-alive timing.
    await client.connect(new StreamableHTTPClientTransport(fixture.url, {
      requestInit: { headers: { Authorization: "Bearer idx_ai_synthetic_A", Connection: "close" } }
    }));
    const names = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    let largestPageBytes = 0;
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined);
      assert.ok(page.tools.length > 0 && page.tools.length <= 32, "Discovery must not send the full catalog in one response");
      const bytes = Buffer.byteLength(JSON.stringify(page));
      assert.ok(bytes < 4 * 1024 * 1024, "A discovery page exceeded the reviewed wire-size budget");
      largestPageBytes = Math.max(largestPageBytes, bytes);
      if (pages === 0) assert.ok(page.tools.some(tool => tool.name === "get_my_business_context"));
      for (const tool of page.tools) {
        assert.ok(!names.has(tool.name), "Repeated discovery tool");
        assert.deepEqual(tool, expected.get(tool.name), "Input/output schemas, annotations and OAuth metadata must remain intact");
        names.add(tool.name);
      }
      cursor = page.nextCursor;
      assert.ok(++pages <= expected.size, "Discovery cursor did not advance");
    } while (cursor);
    assert.ok(pages > 1);
    assert.deepEqual([...names].sort(), [...expected.keys()].sort());
    assert.equal(names.size, Object.keys(toolScopes).length);
    assert.deepEqual((await client.callTool({ name: "get_my_business_context", arguments: {} })).structuredContent, context);
    console.log(JSON.stringify({ discoveryTools: names.size, pages, largestPageBytes }));
  } finally { await client.close(); await fixture.close(); await reference.close(); await server.close(); }
});

test("discovery continuations reauthorize and reject changed or different grant catalogs", async () => {
  let reduced = false;
  let revoked = false;
  const fixture = await httpFixture((async (_input, init) => {
    const other = new Headers(init?.headers).get("Authorization") === "Bearer idx_ai_synthetic_B";
    if (revoked && !other) return json({}, 401);
    return json({ version: "v1", tools: reduced || other ? ["get_my_business_context"] : Object.keys(toolScopes) });
  }) as typeof fetch);
  try {
    const client = await fixture.client();
    const first = await client.listTools();
    assert.ok(first.nextCursor);
    const other = await fixture.client("idx_ai_synthetic_B");
    await assert.rejects(() => other.listTools({ cursor: first.nextCursor }), /catalog changed/i);
    reduced = true;
    await assert.rejects(() => client.listTools({ cursor: first.nextCursor }), /catalog changed/i);
    const current = await client.listTools();
    assert.deepEqual(current.tools.map(tool => tool.name), ["get_my_business_context"]);
    assert.equal(current.nextCursor, undefined);
    reduced = false;
    revoked = true;
    await assert.rejects(() => client.listTools({ cursor: first.nextCursor }), /401|authorization/i);
    assert.equal((await other.listTools()).tools.length, 1);
    assert.doesNotMatch(JSON.stringify(fixture.events), /idx_ai_synthetic|idx_discovery_/);
  } finally { await fixture.close(); }
});

test("malformed discovery cursors fail without leaking tools or request values", async () => {
  const fixture = await httpFixture((async () => json({ version: "v1", tools: Object.keys(toolScopes) })) as typeof fetch);
  try {
    const client = await fixture.client();
    for (const cursor of ["", "private-invalid-cursor", "x".repeat(257), "idx_discovery_bm90LWpzb24"]) {
      await assert.rejects(() => client.listTools({ cursor }), /Invalid tool discovery cursor/i);
    }
    assert.doesNotMatch(JSON.stringify(fixture.events), /private-invalid-cursor|idx_discovery_/);
  } finally { await fixture.close(); }
});
