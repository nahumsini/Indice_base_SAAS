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

// Resolve local schema references independently to compare the complete published
// input contract with the SDK registration, including every nested constraint.
function expandedSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const root = schema as Record<string, unknown>;
  const expand = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(expand);
    if (!value || typeof value !== "object") return value;
    const object = value as Record<string, unknown>;
    if (typeof object.$ref === "string" && object.$ref.startsWith("#/definitions/schema")) {
      assert.deepEqual(Object.keys(object), ["$ref"]);
      const definitions = root.definitions as Record<string, unknown>;
      const target = definitions[object.$ref.slice("#/definitions/".length)];
      assert.ok(target, "Discovery emitted a dangling schema reference");
      return expand(target);
    }
    return Object.fromEntries(Object.entries(object).map(([key, child]) => [key, expand(child)]));
  };
  const { definitions: _definitions, ...result } = expand(root) as Record<string, unknown>;
  return result;
}

test("complete HTTP discovery preserves inputs and metadata with bounded output envelopes", async () => {
  const unused = async (): Promise<never> => { throw Error("Unexpected fixture operation"); };
  const server = createIndiceMcpServer({ getSalesToday: unused, getBusinessSnapshot: unused,
    previewCreateTask: unused, createTask: unused });
  const reference = new Client({ name: "catalog-contract-reference", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await reference.connect(left);
  const fixture = await httpFixture((async input => String(input).endsWith("/capabilities")
    ? json({ version: "v1", tools: Object.keys(toolScopes) }) : json(context)) as typeof fetch);
  const client = new Client({ name: "paginated-catalog-contract", version: "1" });
  const wirePageBytes: number[] = [];
  try {
    const expected = new Map((await reference.listTools()).tools.map(tool => [tool.name, tool]));
    // Synchronous SDK schema compilation can outlast this co-located fixture's idle socket.
    // Fresh connections keep metadata assertions independent of idle keep-alive timing.
    await client.connect(new StreamableHTTPClientTransport(fixture.url, {
      requestInit: { headers: { Authorization: "Bearer idx_ai_synthetic_A", Connection: "close" } },
      fetch: (async (input, init) => {
        const response = await fetch(input, init);
        if (typeof init?.body === "string" && JSON.parse(init.body).method === "tools/list") {
          // Include SSE/JSON-RPC framing and descriptor extensions stripped by the SDK parser.
          wirePageBytes.push(Buffer.byteLength(await response.clone().text()));
        }
        return response;
      }) as typeof fetch
    }));
    const names = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    let largestPageBytes = 0;
    let catalogBytes = 0;
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined);
      assert.ok(page.tools.length > 0 && page.tools.length <= 64, "Discovery must not send the full catalog in one response");
      const bytes = Buffer.byteLength(JSON.stringify(page));
      assert.ok(bytes < 256 * 1024, "A discovery page exceeded the reviewed wire-size budget");
      largestPageBytes = Math.max(largestPageBytes, bytes);
      catalogBytes += bytes;
      if (pages === 0) assert.ok(page.tools.some(tool => tool.name === "get_my_business_context"));
      for (const tool of page.tools) {
        assert.ok(!names.has(tool.name), "Repeated discovery tool");
        const { outputSchema, ...original } = expected.get(tool.name)!;
        assert.ok(outputSchema, "Every registered tool must retain its complete server output validator");
        assert.deepEqual(tool.outputSchema, { type: "object" }, "HTTP must advertise the compact object output contract");
        assert.deepEqual({ ...tool, inputSchema: expandedSchema(tool.inputSchema) },
          { ...original, inputSchema: expandedSchema(original.inputSchema), outputSchema: { type: "object" } },
          "Complete input constraints, annotations and OAuth metadata must remain intact");
        names.add(tool.name);
      }
      cursor = page.nextCursor;
      assert.ok(++pages <= expected.size, "Discovery cursor did not advance");
    } while (cursor);
    assert.ok(pages > 1);
    assert.deepEqual([...names].sort(), [...expected.keys()].sort());
    assert.equal(names.size, Object.keys(toolScopes).length);
    assert.ok(catalogBytes < 1024 * 1024, "The complete discovery catalog exceeded its aggregate wire budget");
    assert.ok(pages <= 10, "Full-catalog import needs too many discovery round trips");
    assert.equal(wirePageBytes.length, pages);
    assert.ok(Math.max(...wirePageBytes) < 256 * 1024, "An actual HTTP discovery response exceeded its wire budget");
    const actualWireBytes = wirePageBytes.reduce((total, bytes) => total + bytes, 0);
    assert.ok(actualWireBytes < 1024 * 1024, "Actual HTTP discovery exceeded the aggregate wire budget");
    assert.deepEqual((await client.callTool({ name: "get_my_business_context", arguments: {} })).structuredContent, context);
    console.log(JSON.stringify({ discoveryTools: names.size, pages, largestPageBytes, catalogBytes,
      actualWireBytes, largestWirePageBytes: Math.max(...wirePageBytes) }));
  } finally { await client.close(); await fixture.close(); await reference.close(); await server.close(); }
});

test("discovery projection does not remove registered output validation or change HTTP results", async () => {
  const unused = async (): Promise<never> => { throw Error("Unexpected fixture operation"); };
  const server = createIndiceMcpServer({ getSalesToday: unused, getBusinessSnapshot: unused,
    previewCreateTask: unused, createTask: unused,
    getMyBusinessContext: async () => ({ ...context, companyId: -1 }) }, new Set(["get_my_business_context"]));
  const reference = new Client({ name: "server-output-validation", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await reference.connect(left);
  let malformed = false;
  const fixture = await httpFixture((async input => String(input).endsWith("/capabilities")
    ? json({ version: "v1", tools: ["get_my_business_context"] })
    : json({ ...context, ...(malformed ? { companyId: -1 } : {}) })) as typeof fetch);
  try {
    const registered = (await reference.listTools()).tools[0]!;
    assert.ok(registered.outputSchema, "Stdio must keep its complete output schema");
    const rejected = await reference.callTool({ name: "get_my_business_context", arguments: {} });
    assert.equal(rejected.isError, true, "The registered SDK output validator must reject invalid owner results");
    assert.match(JSON.stringify(rejected.content), /Output validation error/);
    assert.equal(rejected.structuredContent, undefined);

    const client = await fixture.client();
    const published = (await client.listTools()).tools[0]!;
    assert.deepEqual(published.outputSchema, { type: "object" });
    assert.deepEqual((await client.callTool({ name: "get_my_business_context", arguments: {} })).structuredContent, context);
    malformed = true;
    const invalid = await client.callTool({ name: "get_my_business_context", arguments: {} });
    assert.equal(invalid.isError, true, "Invalid backend output must still fail after HTTP discovery");
    assert.equal(invalid.structuredContent, undefined);
  } finally { await fixture.close(); await reference.close(); await server.close(); }
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
