import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { McpHttpTraffic, mcpTrafficPolicy } from "../httpTraffic.js";
import { httpFixture, json } from "./httpFixture.js";

test("aggregate quota, refill and concurrency remain bounded with idempotent release", () => {
  let now = 0;
  const guard = new McpHttpTraffic(() => now);
  const releases = Array.from({ length: 8 }, () => guard.acquire());
  assert.ok(releases.every(Boolean));
  assert.equal(guard.acquire(), undefined);
  releases[0]!(); releases[0]!();
  const replacement = guard.acquire();
  assert.ok(replacement);
  assert.equal(guard.acquire(), undefined);
  for (const release of releases) release!();
  replacement();
  for (let i = 9; i < 40; i++) guard.acquire()!();
  assert.equal(guard.acquire(), undefined);
  now = 50;
  guard.acquire()!();
  assert.equal(guard.acquire(), undefined);
  now = 2000;
  for (let i = 0; i < 39; i++) guard.acquire()!();
});

test("validated grant quotas are independent, bounded, refilled and idle-expiring", () => {
  let now = 0;
  const guard = new McpHttpTraffic(() => now);
  for (let i = 0; i < mcpTrafficPolicy.grantBurst; i++) assert.equal(guard.admitValidatedGrant("synthetic-A"), true);
  assert.equal(guard.admitValidatedGrant("synthetic-A"), false);
  assert.equal(guard.admitValidatedGrant("synthetic-B"), true);
  now = 125;
  assert.equal(guard.admitValidatedGrant("synthetic-A"), true);
  assert.equal(guard.admitValidatedGrant("synthetic-A"), false);
  for (let i = 2; i < 1024; i++) assert.equal(guard.admitValidatedGrant(`synthetic-${i}`), true);
  assert.equal(guard.admitValidatedGrant("synthetic-over-capacity"), false);
  // Filling the map cannot evict an existing, exhausted connection and bypass its quota.
  assert.equal(guard.admitValidatedGrant("synthetic-A"), false);
  now += mcpTrafficPolicy.grantIdleMs;
  assert.equal(guard.admitValidatedGrant("synthetic-over-capacity"), true);
});

function headersOnly(url: URL, authorization?: string, length: number | null = 12 * 1024 * 1024) {
  return new Promise<{ status: number; headers: Record<string, unknown>; body: string }>((resolve, reject) => {
    const request = httpRequest(url, { method: "POST", agent: false, headers: {
      "Content-Type": "application/json", ...(length === null ? { "Transfer-Encoding": "chunked" } : { "Content-Length": length }),
      ...(authorization ? { Authorization: authorization } : {})
    } }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", data => { body += data; });
      response.on("end", () => { resolve({ status: response.statusCode!, headers: response.headers, body }); request.destroy(); });
    });
    request.setTimeout(1500, () => request.destroy(new Error("Response waited for untrusted body")));
    request.on("error", reject);
    request.flushHeaders(); // Deliberately never send or finish the declared large body.
  });
}

test("authentication and read-only size rejection happen before a declared large body arrives", async () => {
  const calls: string[] = [];
  const fixture = await httpFixture((async (input, init) => {
    calls.push(new URL(String(input)).pathname);
    const token = new Headers(init?.headers).get("Authorization");
    if (token === "Bearer idx_ai_expired") return json({}, 401);
    if (token === "Bearer idx_ai_denied") return json({}, 403);
    return json({ version: "v1", tools: ["list_tasks"] });
  }) as typeof fetch);
  try {
    for (const [authorization, status] of [[undefined, 401], ["Basic private-secret", 401],
      ["Bearer idx_ai_expired", 401], ["Bearer idx_ai_denied", 403], ["Bearer idx_ai_readonly", 413]] as const) {
      const response = await headersOnly(fixture.url, authorization);
      assert.equal(response.status, status);
      assert.equal(response.headers["cache-control"], "no-store");
      assert.doesNotMatch(response.body, /idx_ai_|private-secret/);
    }
    assert.equal(calls.length, 3);
    assert.ok(calls.every(path => path.endsWith("/capabilities")));
    assert.equal(fixture.server.requestTimeout, 30_000);
    assert.equal(fixture.server.headersTimeout, 15_000);
    assert.doesNotMatch(JSON.stringify(fixture.events), /idx_ai_|private-secret/);
  } finally { await fixture.close(); }
});

test("anonymous and revoked chunked uploads are rejected without waiting for a body", async () => {
  let calls = 0;
  const fixture = await httpFixture((async () => { calls++; return json({}, 401); }) as typeof fetch);
  try {
    assert.equal((await headersOnly(fixture.url, undefined, null)).status, 401);
    assert.equal(calls, 0);
    assert.equal((await headersOnly(fixture.url, "Bearer idx_ai_revoked", null)).status, 401);
    assert.equal(calls, 1);
  } finally { await fixture.close(); }
});

test("authorized malformed/oversized ordinary and non-intake file-grant bodies cannot reach tools", async () => {
  const calls: string[] = [];
  const fixture = await httpFixture((async (input, init) => {
    calls.push(new URL(String(input)).pathname);
    const file = new Headers(init?.headers).get("Authorization") === "Bearer idx_ai_file";
    return json({ version: "v1", tools: file ? ["stage_operational_file", "list_tasks"] : ["list_tasks"] });
  }) as typeof fetch);
  try {
    for (const [token, body, status] of [["idx_ai_readonly", "{private-malformed", 400],
      ["idx_ai_readonly", JSON.stringify({ private: "x".repeat(110000) }), 413],
      ["idx_ai_file", JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: { name: "list_tasks", arguments: { private: "x".repeat(110000) } } }), 413]] as const) {
      const response = await fetch(fixture.url, { method: "POST", headers: {
        Authorization: `Bearer ${token}`, "Content-Type": "application/json"
      }, body });
      assert.equal(response.status, status);
      assert.doesNotMatch(await response.text(), /private/);
    }
    assert.equal(calls.length, 3);
    assert.ok(calls.every(path => path.endsWith("/capabilities")));
  } finally { await fixture.close(); }
});

test("saturated requests return 429 before authorization while health works; cancellation releases capacity", async () => {
  let calls = 0;
  const fixture = await httpFixture((async (_input, init) => {
    calls++;
    await delay(3000, undefined, { signal: init?.signal ?? undefined });
    return json({ version: "v1", tools: [] });
  }) as typeof fetch);
  const controllers = Array.from({ length: 8 }, () => new AbortController());
  const pending = controllers.map(controller => fetch(fixture.url, { method: "POST", signal: controller.signal,
    headers: { Authorization: "Bearer idx_ai_synthetic", "Content-Type": "application/json" }, body: "{}"
  }).catch(() => undefined));
  try {
    for (let i = 0; i < 100 && calls < 8; i++) await delay(10);
    assert.equal(calls, 8);
    const limited = await fetch(fixture.url, { method: "POST", headers: { "X-Forwarded-For": "198.51.100.99" }, body: "private-secret" });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("Retry-After"), "1");
    assert.equal(limited.headers.get("Cache-Control"), "no-store");
    assert.equal((await limited.json()).id, null);
    assert.equal(calls, 8);
    assert.equal((await fetch(new URL("/healthz", fixture.url))).status, 200);
    controllers.forEach(controller => controller.abort());
    await Promise.all(pending);
    await delay(30);
    assert.equal((await headersOnly(fixture.url)).status, 401);
    assert.equal(calls, 8);
    assert.doesNotMatch(JSON.stringify(fixture.events), /private-secret|idx_ai_/);
  } finally { controllers.forEach(controller => controller.abort()); await Promise.all(pending); await fixture.close(); }
});

test("HTTP per-grant rate rejection does not execute tools or masquerade as an expired token", async () => {
  let calls = 0;
  const fixture = await httpFixture((async () => { calls++; return json({ version: "v1", tools: [] }); }) as typeof fetch);
  try {
    let limited = false;
    for (let i = 0; i < 35; i++) {
      const response = await fetch(fixture.url, { method: "POST", headers: {
        Authorization: "Bearer idx_ai_fast", "Content-Type": "application/json"
      }, body: "{" });
      if (response.status === 429) {
        limited = true;
        assert.equal(response.headers.get("Retry-After"), "1");
        assert.equal(response.headers.get("WWW-Authenticate"), null);
        assert.match(await response.text(), /connection rate/);
        break;
      }
      assert.equal(response.status, 400);
    }
    assert.equal(limited, true);
    assert.ok(calls >= 25);
  } finally { await fixture.close(); }
});
