import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { loadConfig } from "../config.js";
import { IndiceClient } from "../indiceClient.js";
import { backendRequest } from "../backendTransport.js";
import { json, queryResult } from "./httpFixture.js";

const config = { ...loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http" }), retryDelayMs: 0 };
test("read-only POST retries transient responses but never authentication or permission failures", async () => {
  for (const status of [429, 502, 503, 504, 400, 401, 403, 404, 409, 500]) {
    let attempts = 0;
    const client = new IndiceClient(config, (async () => ++attempts === 1 ? json({}, status)
      : json(queryResult("list_tasks"))) as typeof fetch, "synthetic");
    if ([429, 502, 503, 504].includes(status)) {
      assert.equal((await client.queryBusiness("list_tasks")).count, 1);
      assert.equal(attempts, 2);
    } else {
      await assert.rejects(() => client.queryBusiness("list_tasks"));
      assert.equal(attempts, 1);
    }
  }
});

test("previews, commits, OAuth and unknown POSTs are never replayed after network loss", async () => {
  for (const path of ["/api/v1/ai/tools/tasks/preview", "/api/v1/ai/tools/tasks/commit",
    "/api/v1/ai/tools/finance/actions/create_expense_draft/commit",
    "/api/v1/ai/tools/finance/actions/register_fund_expense/commit",
    "/api/v1/ai/tools/finance/actions/add_money_to_fund/commit",
    "/api/v1/ai/tools/finance/actions/create_expense_draft/preview",
    "/api/v1/ai/oauth/token", "/api/v1/unknown"]) {
    let attempts = 0;
    await assert.rejects(() => backendRequest(config, (async () => {
      attempts++; throw new Error("private network message");
    }) as typeof fetch, path, { method: "POST" }, {}));
    assert.equal(attempts, 1);
  }
});

test("reads recover from network loss and broken response bodies", async () => {
  for (const fault of ["network", "body"]) {
    let attempts = 0;
    const client = new IndiceClient(config, (async () => {
      if (++attempts === 1) {
        if (fault === "network") throw new TypeError("socket lost");
        return new Response(new ReadableStream({ start(controller) { controller.error(new Error("body lost")); } }));
      }
      return json({ version: "v1", tools: ["list_tasks"] });
    }) as typeof fetch, "synthetic");
    assert.deepEqual((await client.getDelegatedToolCapabilities())?.tools, ["list_tasks"]);
    assert.equal(attempts, 2);
  }
});

test("read retry budget is bounded and honours long Retry-After without retrying early", async () => {
  let attempts = 0;
  const client = new IndiceClient(config, (async () => {
    attempts++; return json({}, 503, { "Retry-After": "120" });
  }) as typeof fetch, "synthetic");
  await assert.rejects(() => client.getDelegatedToolCapabilities());
  assert.equal(attempts, 1);
  attempts = 0;
  const unavailable = new IndiceClient(config, (async () => { attempts++; return json({}, 503); }) as typeof fetch, "synthetic");
  await assert.rejects(() => unavailable.getDelegatedToolCapabilities());
  assert.equal(attempts, 2);
});

test("a disconnected caller stops recovery instead of continuing in the background", async () => {
  const cancellation = new AbortController();
  let attempts = 0;
  const client = new IndiceClient(config, (async () => {
    attempts++; cancellation.abort(); throw new Error("cancelled");
  }) as typeof fetch, "synthetic", { signal: cancellation.signal });
  await assert.rejects(() => client.getDelegatedToolCapabilities());
  assert.equal(attempts, 1);
});

test("header and body timeouts each recover within a bounded read budget", async () => {
  for (const stage of ["headers", "body"]) {
    let attempts = 0;
    const events: unknown[] = [];
    const client = new IndiceClient({ ...config, timeoutMs: 20 }, (async (_input, init) => {
      if (++attempts > 1) return json({ version: "v1", tools: ["list_tasks"] });
      if (stage === "headers") {
        await delay(2000, undefined, { signal: init?.signal ?? undefined });
        throw new Error("Unexpected timeout bypass");
      }
      return new Response(new ReadableStream({ start(controller) {
        init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason), { once: true });
      } }));
    }) as typeof fetch, "synthetic", { observe: event => events.push(event) });
    // Keep a ref'ed timer alive while AbortSignal.timeout's unref'ed timer fires in the synthetic body.
    const keepAlive = setInterval(() => {}, 1000);
    try { assert.deepEqual((await client.getDelegatedToolCapabilities())?.tools, ["list_tasks"]); }
    finally { clearInterval(keepAlive); }
    assert.equal(attempts, 2);
    assert.match(JSON.stringify(events), /timeout/);
  }
});

test("unreadable or stalled auth error bodies never cause another authorization attempt", async () => {
  for (const status of [401, 403]) {
    let calls = 0;
    let cancelled = false;
    const client = new IndiceClient(config, (async () => {
      calls++;
      return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status });
    }) as typeof fetch, "synthetic");
    if (status === 401) assert.equal(await client.getDelegatedToolCapabilities(), undefined);
    else await assert.rejects(() => client.getDelegatedToolCapabilities());
    assert.equal(calls, 1);
    assert.equal(cancelled, true);
  }
});
