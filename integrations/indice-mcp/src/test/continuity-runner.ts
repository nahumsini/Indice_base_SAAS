import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { httpFixture, json, queryResult } from "./httpFixture.js";

// Synthetic backend only: never accepts credentials or contacts a real ERP/database.
const durationSeconds = Number(process.env.INDICE_CONTINUITY_SECONDS ?? 1200);
if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 1800) {
  throw new Error("INDICE_CONTINUITY_SECONDS must be an integer from 1 to 1800");
}
let transientFailures = 0;
let unavailable = false;
let revoked = false;
let restricted = false;
let backendAttempts = 0;
const fixture = await httpFixture((async (input, init) => {
  backendAttempts++;
  const isB = new Headers(init?.headers).get("Authorization") === "Bearer idx_ai_synthetic_B";
  const path = new URL(String(input)).pathname;
  if (path.endsWith("/capabilities")) {
    if (revoked && !isB) return json({}, 401);
    if (unavailable || transientFailures-- > 0) return json({}, 503);
    return json({ version: "v1", tools: isB || restricted ? ["list_tasks"] : ["list_tasks", "get_funds_status"] });
  }
  return json(queryResult(path.split("/").at(-1)!, isB ? "B" : "A"));
}) as typeof fetch);
const start = performance.now();
let rounds = 0;
let nextReport = 0;
try {
  let a = await fixture.client();
  const b = await fixture.client("idx_ai_synthetic_B");
  do {
    rounds++;
    for (const name of ["get_funds_status", "list_tasks", "get_funds_status"]) {
      assert.equal((await a.callTool({ name, arguments: {} })).isError, undefined);
    }
    assert.deepEqual((await b.listTools()).tools.map(tool => tool.name), ["list_tasks"]);
    const result = await b.callTool({ name: "list_tasks", arguments: {} });
    assert.equal((result.structuredContent as { summary: { tenant: string } }).summary.tenant, "B");
    if (rounds % 5 === 0) {
      transientFailures = 1;
      assert.equal((await a.listTools()).tools.length, 2);
      unavailable = true;
      await assert.rejects(() => a.listTools(), /temporarily unavailable/);
      unavailable = false;
      assert.equal((await a.listTools()).tools.length, 2);
      restricted = true;
      assert.deepEqual((await a.listTools()).tools.map(tool => tool.name), ["list_tasks"]);
      restricted = false;
      await a.close();
      a = await fixture.client();
      assert.equal((await a.listTools()).tools.length, 2);
    }
    const elapsedSeconds = Math.round((performance.now() - start) / 1000);
    if (elapsedSeconds >= nextReport) {
      console.log(JSON.stringify({ event: "synthetic_continuity", elapsedSeconds, rounds, backendAttempts }));
      nextReport = elapsedSeconds + 60;
    }
    const remaining = durationSeconds * 1000 - (performance.now() - start);
    if (remaining > 0) await delay(Math.min(5000, remaining));
  } while (performance.now() - start < durationSeconds * 1000);
  revoked = true;
  await assert.rejects(() => a.listTools(), /401|unauthorized|authorization/i);
  assert.equal((await b.listTools()).tools.length, 1);
  assert.doesNotMatch(JSON.stringify(fixture.events), /idx_ai_synthetic/);
  console.log(JSON.stringify({ event: "synthetic_continuity_passed", rounds, backendAttempts,
    elapsedSeconds: Math.round((performance.now() - start) / 1000), realOAuthOrVoiceValidated: false }));
} finally { await fixture.close(); }
