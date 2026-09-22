import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { httpFixture, json, queryResult } from "./httpFixture.js";
import { supportedScopes, toolScopes } from "../toolPolicy.js";
import { indiceToolNameSchema } from "../contracts.js";

test("real HTTP retains tools across turns, temporary failures, reconnection, tenants and revocation", async () => {
  let unavailable = false;
  let transientFailures = 0;
  let revoked = false;
  let allowed = ["list_tasks", "get_funds_status"];
  let attempts = 0;
  const fixture = await httpFixture((async (input, init) => {
    const path = new URL(String(input)).pathname;
    const isB = new Headers(init?.headers).get("Authorization") === "Bearer idx_ai_synthetic_B";
    if (path.endsWith("/capabilities")) {
      attempts++;
      if (revoked && !isB) return json({}, 401);
      if (unavailable || transientFailures-- > 0) return json({ private: "must-not-leak" }, 503);
      return json({ version: "v1", tools: isB ? ["list_tasks"] : allowed });
    }
    return json(queryResult(path.split("/").at(-1)!, isB ? "B" : "A"));
  }) as typeof fetch);
  try {
    const a = await fixture.client();
    const b = await fixture.client("idx_ai_synthetic_B");
    for (const name of ["get_funds_status", "list_tasks", "get_funds_status"]) {
      assert.equal((await a.callTool({ name, arguments: {} })).isError, undefined);
    }
    transientFailures = 1;
    const before = attempts;
    assert.equal((await a.listTools()).tools.length, 2);
    assert.equal(attempts - before, 2);
    unavailable = true;
    await assert.rejects(() => a.listTools(), /temporarily unavailable/);
    unavailable = false;
    assert.equal((await a.listTools()).tools.length, 2);
    const reconnected = await fixture.client();
    assert.equal((await reconnected.listTools()).tools.length, 2);
    assert.deepEqual((await b.listTools()).tools.map(tool => tool.name), ["list_tasks"]);
    const bResult = await b.callTool({ name: "list_tasks", arguments: {} });
    assert.equal((bResult.structuredContent as { summary: { tenant: string } }).summary.tenant, "B");
    allowed = ["get_funds_status"];
    assert.deepEqual((await a.listTools()).tools.map(tool => tool.name), allowed);
    assert.equal((await a.callTool({ name: "list_tasks", arguments: {} })).isError, true);
    revoked = true;
    await assert.rejects(() => a.listTools(), /401|authorization/i);
    assert.equal((await b.listTools()).tools.length, 1);
    const logs = JSON.stringify(fixture.events);
    assert.ok(logs.includes("catalogFingerprint"));
    assert.ok(logs.includes("capabilities_unavailable"));
    assert.ok(!logs.includes("idx_ai_synthetic"));
    assert.ok(!logs.includes("must-not-leak"));
  } finally { await fixture.close(); }
});

test("tool-level authorization expiry provides OAuth recovery metadata, and errors never leak secrets", async () => {
  let toolStatus = 401;
  let calls = 0;
  const fixture = await httpFixture((async input => {
    if (String(input).endsWith("/capabilities")) return json({ version: "v1", tools: ["list_tasks"] });
    calls++;
    return json({ password: "private-body", sql: "private-SQL" }, toolStatus);
  }) as typeof fetch);
  try {
    const client = await fixture.client();
    const descriptor = (await client.listTools()).tools[0]!;
    assert.deepEqual(descriptor._meta?.securitySchemes, [{ type: "oauth2", scopes: ["tasks.read"] }]);
    // The core SDK strips OpenAI's top-level extension; also verify the actual wire descriptor.
    const wire = await fetch(fixture.url, { method: "POST", headers: {
      "Content-Type": "application/json", Accept: "application/json, text/event-stream",
      Authorization: "Bearer idx_ai_synthetic_A"
    }, body: JSON.stringify({ jsonrpc: "2.0", id: 91, method: "tools/list" }) });
    const data = (await wire.text()).split("\n").find(line => line.startsWith("data: "));
    assert.ok(data);
    const wireDescriptor = JSON.parse(data.slice(6)).result.tools[0];
    assert.deepEqual(wireDescriptor.securitySchemes, descriptor._meta?.securitySchemes);
    const expired = await client.callTool({ name: "list_tasks", arguments: {} });
    assert.equal(calls, 1);
    assert.equal(expired.isError, true);
    assert.match(String(expired._meta?.["mcp/www_authenticate"]), /invalid_token.*error_description/);
    toolStatus = 403;
    const forbidden = await client.callTool({ name: "list_tasks", arguments: {} });
    assert.equal(calls, 2);
    assert.equal(forbidden._meta?.["mcp/www_authenticate"], undefined);
    assert.doesNotMatch(JSON.stringify([expired, forbidden, fixture.events]), /private-body|private-SQL/);
  } finally { await fixture.close(); }
});

test("liveness, backend readiness and authenticated availability are separate", async () => {
  let healthy = true;
  const fixture = await httpFixture((async () => healthy
    ? json({ status: "ok", name: "indice-erp-api", private: "must-not-leak" }) : json({}, 503)) as typeof fetch);
  try {
    assert.equal((await fetch(new URL("/healthz", fixture.url))).status, 200);
    assert.equal((await fetch(new URL("/readyz", fixture.url))).status, 200);
    healthy = false;
    assert.equal((await fetch(new URL("/healthz", fixture.url))).status, 200);
    const readiness = await fetch(new URL("/readyz", fixture.url));
    assert.equal(readiness.status, 503);
    assert.equal(readiness.headers.get("Cache-Control"), "no-store");
    assert.doesNotMatch(await readiness.text(), /private|must-not-leak/);
    assert.equal((await fetch(fixture.url)).status, 401);
    const metadata = await (await fetch(new URL("/.well-known/oauth-protected-resource", fixture.url))).json();
    assert.deepEqual(metadata.scopes_supported, supportedScopes);
  } finally { await fixture.close(); }
});

test("request correlation is server-generated, propagated and free of caller bodies or authority", async () => {
  const received: string[] = [];
  const fixture = await httpFixture((async (_input, init) => {
    received.push(new Headers(init?.headers).get("X-Request-ID")!);
    return json({ version: "v1", tools: ["list_tasks"] });
  }) as typeof fetch);
  try {
    const response = await fetch(fixture.url, { method: "POST", headers: {
      "Content-Type": "application/json", Accept: "application/json, text/event-stream",
      Authorization: "Bearer idx_ai_synthetic_secret", "X-Request-ID": "private-user-supplied"
    }, body: JSON.stringify({ jsonrpc: "2.0", id: "private-rpc-id", method: "tools/call",
      params: { name: "private-fake-tool", arguments: { password: "private-password" } } }) });
    await response.text();
    await delay(10);
    assert.match(response.headers.get("X-Request-ID")!, /^[0-9a-f-]{36}$/);
    assert.deepEqual(received, [response.headers.get("X-Request-ID")]);
    assert.doesNotMatch(JSON.stringify(fixture.events), /private-|idx_ai_/);
  } finally { await fixture.close(); }
});

test("metadata has one scope per tool and remains consistent with Spring supported OAuth scopes", () => {
  assert.deepEqual(Object.keys(toolScopes).sort(), [...indiceToolNameSchema.options].sort());
  const source = readFileSync(new URL("../../../../src/main/java/com/indice/erp/ai/access/AiAccessTokenService.java", import.meta.url), "utf8");
  const javaScopes = [...source.matchAll(/public static final String \w+ = "([^"]+)";/g)].map(match => match[1]);
  assert.deepEqual(supportedScopes, javaScopes.sort());
});

test("denied, malformed and legitimately empty capability manifests remain distinct and fail closed", async () => {
  let status = 200;
  let tools: string[] = [];
  let attempts = 0;
  const fixture = await httpFixture((async () => {
    attempts++;
    return json({ version: "v1", tools }, status);
  }) as typeof fetch);
  try {
    const client = await fixture.client();
    assert.deepEqual((await client.listTools()).tools, []);
    tools = ["unrecognized_tool"];
    await assert.rejects(() => client.listTools(), /temporarily unavailable/);
    status = 403;
    const before = attempts;
    await assert.rejects(() => client.listTools(), /permissions deny access/);
    assert.equal(attempts - before, 1);
    status = 200;
    tools = ["list_tasks"];
    assert.equal((await client.listTools()).tools.length, 1);
  } finally { await fixture.close(); }
});

test("a lost commit response is not replayed automatically and an explicit retry preserves its key", async () => {
  const bodies: unknown[] = [];
  let calls = 0;
  const fixture = await httpFixture((async (input, init) => {
    if (String(input).endsWith("/capabilities")) return json({ version: "v1", tools: ["create_task"] });
    bodies.push(JSON.parse(String(init?.body)));
    if (++calls === 1) throw new TypeError("synthetic connection lost after commit");
    return json({ replayed: true, correlationId: "11111111-1111-4111-8111-111111111111",
      task: { id: 1, folio: null, title: "Synthetic task", status: "pending", dueDate: null } });
  }) as typeof fetch);
  try {
    const client = await fixture.client();
    const args = { confirmation_token: "idx_confirm_synthetic", idempotency_key: "synthetic-original-key" };
    const uncertain = await client.callTool({ name: "create_task", arguments: args });
    assert.equal(uncertain.isError, true);
    assert.equal(calls, 1);
    const replay = await client.callTool({ name: "create_task", arguments: args });
    assert.equal(replay.isError, undefined);
    assert.equal((replay.structuredContent as { replayed: boolean }).replayed, true);
    assert.equal(calls, 2);
    assert.deepEqual(bodies, Array(2).fill({ confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key }));
  } finally { await fixture.close(); }
});

test("malformed and oversized HTTP requests never reach the backend or echo submitted content", async () => {
  let calls = 0;
  const fixture = await httpFixture((async () => { calls++; return json({}); }) as typeof fetch);
  try {
    for (const [body, status] of [["{private-malformed", 400], [JSON.stringify({ private: "x".repeat(110000) }), 413]] as const) {
      const response = await fetch(fixture.url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      assert.equal(response.status, status);
      assert.doesNotMatch(await response.text(), /private/);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
    }
    assert.equal(calls, 0);
  } finally { await fixture.close(); }
});

test("HTTP caller disconnection aborts capability lookup without retrying", async () => {
  let calls = 0;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const fixture = await httpFixture((async (_input, init) => {
    calls++;
    started();
    await delay(2000, undefined, { signal: init?.signal ?? undefined });
    return json({ version: "v1", tools: ["list_tasks"] });
  }) as typeof fetch);
  try {
    const cancellation = new AbortController();
    const response = fetch(fixture.url, { method: "POST", signal: cancellation.signal, headers: {
      "Content-Type": "application/json", Accept: "application/json, text/event-stream",
      Authorization: "Bearer idx_ai_synthetic_A"
    }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
    // Attach the rejection handler before cancelling to avoid an unhandled rejection.
    const rejected = assert.rejects(response);
    await entered;
    cancellation.abort();
    await rejected;
    await delay(50);
    assert.equal(calls, 1);
    assert.match(JSON.stringify(fixture.events), /client_disconnected/);
    assert.match(JSON.stringify(fixture.events), /cancelled/);
  } finally { await fixture.close(); }
});
