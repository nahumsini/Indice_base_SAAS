import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { sample, sampleIdSchema } from "./samples.js";
import { startVisualProbe } from "./server.js";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--out-dir" || !args[1])
  throw Error("Usage: node dist/test/visualProbe/runner.js --out-dir <evidence-directory>");
const output = resolve(args[1]);
await mkdir(output, { recursive: true });
const probe = await startVisualProbe();
const client = new Client({ name: "indice-visual-probe-sdk", version: "0.1.0" });
const results: object[] = [];
try {
  await client.connect(new StreamableHTTPClientTransport(probe.url));
  const tools = (await client.listTools()).tools;
  assert.equal(tools.length, 3);
  for (const id of sampleIdSchema.options) {
    for (const mode of ["image", "resource"] as const) {
      const started = performance.now();
      const result = await client.callTool({ name: `get_visual_probe_${mode}`,
        arguments: { sampleId: id, ...(mode === "image" ? { clientSupportsImages: true } : {}) } }) as CallToolResult;
      assert.ok(!result.isError);
      const block = result.content[0];
      const base64 = block?.type === "image" ? block.data : block?.type === "resource" && "blob" in block.resource ? block.resource.blob : null;
      assert.ok(base64);
      const bytes = Buffer.from(base64, "base64");
      const expected = sample(id);
      assert.deepEqual(bytes, expected.bytes);
      const fileName = `${id}-${mode}.${id.endsWith("png") ? "png" : "jpg"}`;
      await writeFile(resolve(output, fileName), bytes);
      // Synthetic responses only; kept for explicit renderer/host inspection, never business files.
      await writeFile(resolve(output, `${id}-${mode}.json`), JSON.stringify(result, null, 2));
      results.push({ sampleId: id, mode, blockType: block!.type, mimeType: expected.metadata.mimeType,
        sizeBytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
        responseBytes: Buffer.byteLength(JSON.stringify(result)), elapsedMs: Math.round(performance.now() - started), fileName });
    }
  }
  const fallback = await client.callTool({ name: "get_visual_probe_image", arguments: { sampleId: "synthetic-png", clientSupportsImages: false } });
  assert.ok((fallback.content as { type: string }[]).every(block => block.type === "text"));
  const report = { generatedAt: new Date().toISOString(), server: "synthetic-loopback-only", protocol: client.getServerVersion(),
    transport: "PASS: SDK Streamable HTTP byte-for-byte comparison", results,
    fallback: { simulated: true, result: fallback.structuredContent },
    interpretation: "PENDING: requires a model-visible rendering, not just SDK delivery",
    generation: "PENDING: requires an external image generation tool and visual evaluation",
    chatGptNativeConnection: "PENDING: no real ChatGPT/Lupita connection exercised by this runner" };
  await writeFile(resolve(output, "transport-report.json"), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally { await client.close(); await probe.close(); }
