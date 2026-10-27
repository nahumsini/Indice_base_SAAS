import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";

const context = {
  generatedAt: "2026-10-27T00:00:00Z", companyId: 1, companyName: "Synthetic company",
  userId: 1, userCompanyId: 1, userName: "Synthetic owner", role: "root",
  scopeType: "CORPORATE_OFFICE", assignedUnitId: null, assignedUnitName: null,
  assignedBusinessId: null, assignedBusinessName: null
};

test("completed HTTP requests release their request graphs after cancellation", () => {
  const fixtureUrl = new URL("./httpFixture.js", import.meta.url).href;
  const source = `
    import { setTimeout as delay } from "node:timers/promises";
    import { httpFixture, json } from ${JSON.stringify(fixtureUrl)};
    const fixture = await httpFixture((async input => String(input).endsWith("/capabilities")
      ? json({version:"v1",tools:["get_my_business_context"]}) : json(${JSON.stringify(context)})));
    try {
      const client = await fixture.client();
      const request = async () => {
        await client.callTool({name:"get_my_business_context",arguments:{}});
        await delay(150);
      };
      for(let i=0;i<5;i++) await request();
      global.gc();
      const before = process.memoryUsage().heapUsed;
      for(let i=0;i<35;i++) await request();
      await delay(50);global.gc();
      console.log(JSON.stringify({growthBytes:process.memoryUsage().heapUsed-before}));
    } finally { await fixture.close(); }
  `;
  const result = execFileSync(process.execPath, ["--expose-gc", "--max-old-space-size=256",
    "--input-type=module", "-e", source], { encoding: "utf8", timeout: 60_000 });
  const measured = JSON.parse(result.trim()) as { growthBytes: number };
  assert.ok(measured.growthBytes < 16 * 1024 * 1024,
    `Completed synthetic requests retained ${Math.round(measured.growthBytes / 1024 / 1024)} MiB`);
  console.log(JSON.stringify({ requestCleanupGrowthBytes: measured.growthBytes }));
});
