import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { request } from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { registerFileTools } from "../fileTools.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { sample, sampleIdSchema } from "./visualProbe/samples.js";
import { startVisualProbe } from "./visualProbe/server.js";

async function fixture() {
  const server = await startVisualProbe();
  const client = new Client({ name: "synthetic-visual-probe-test", version: "1" });
  await client.connect(new StreamableHTTPClientTransport(server.url));
  return { ...server, client, async close() { await client.close(); await server.close(); } };
}
function bytes(result: CallToolResult) {
  assert.ok(!result.isError);
  const block = result.content[0];
  if (block?.type === "image") return Buffer.from(block.data, "base64");
  if (block?.type === "resource" && "blob" in block.resource) return Buffer.from(block.resource.blob, "base64");
  throw Error("No binary MCP content.");
}

test("probe discovers exactly three read-only synthetic tools and metadata never includes image bytes", async () => {
  const f = await fixture();
  try {
    const tools = (await f.client.listTools()).tools;
    assert.deepEqual(tools.map(tool => tool.name).sort(), ["get_visual_probe_image", "get_visual_probe_resource", "list_visual_probe_samples"]);
    assert.ok(tools.every(tool => tool.annotations?.readOnlyHint && tool.annotations.destructiveHint === false));
    const result = await f.client.callTool({ name: "list_visual_probe_samples", arguments: {} });
    assert.equal((result.structuredContent as { items: unknown[] }).items.length, 2);
    assert.ok((result.content as { type: string }[]).every(block => block.type === "text"));
    assert.ok(!JSON.stringify(result).includes(sample("synthetic-png").bytes.toString("base64")));
  } finally { await f.close(); }
});

for (const id of sampleIdSchema.options) test(`${id} reaches an HTTP SDK client byte-for-byte in both representations`, async () => {
  const f = await fixture();
  try {
    const image = await f.client.callTool({ name: "get_visual_probe_image", arguments: { sampleId: id, clientSupportsImages: true } }) as CallToolResult;
    const resource = await f.client.callTool({ name: "get_visual_probe_resource", arguments: { sampleId: id } }) as CallToolResult;
    assert.equal(image.content[0]?.type, "image"); assert.equal(resource.content[0]?.type, "resource");
    assert.deepEqual(bytes(image), sample(id).bytes); assert.deepEqual(bytes(resource), bytes(image));
    assert.ok(!JSON.stringify(image.structuredContent).includes(sample(id).bytes.toString("base64")));
    for (const result of [image, resource]) {
      const metadata = (result.structuredContent as { sample: { sha256: string; sizeBytes: number } }).sample;
      assert.equal(metadata.sha256, createHash("sha256").update(bytes(result)).digest("hex"));
      assert.equal(metadata.sizeBytes, bytes(result).length);
      assert.ok(!JSON.stringify(result).includes("https://"));
    }
  } finally { await f.close(); }
});

test("unsupported and unknown client image support return only metadata, never a false visual success", async () => {
  const f = await fixture();
  try {
    for (const arguments_ of [{ sampleId: "synthetic-png", clientSupportsImages: false }, { sampleId: "synthetic-jpeg" }]) {
      const result = await f.client.callTool({ name: "get_visual_probe_image", arguments: arguments_ });
      assert.ok((result.content as { type: string }[]).every(block => block.type === "text"));
      assert.equal((result.structuredContent as { status: string }).status, "CLIENT_IMAGE_UNSUPPORTED");
      assert.equal((result.structuredContent as { representation: string }).representation, "metadata");
    }
  } finally { await f.close(); }
});

test("probe rejects arbitrary files, URLs, tenant authority, formats and batches", async () => {
  const f = await fixture();
  try {
    const invalid = [{ sampleId: "../../private.png" }, { sampleId: "https://example.test/private.png" },
      { sampleId: "synthetic-svg" }, { sampleId: "synthetic-png", companyId: 2 },
      { sampleId: "synthetic-png", objectKey: "private" }, { sampleId: "synthetic-png", role: "root" },
      { sampleId: "synthetic-png", url: "http://127.0.0.1:8083" },
      { sampleId: "synthetic-png", sampleIds: ["a", "b", "c", "d"] }];
    for (const input of invalid) {
      const result = await f.client.callTool({ name: "get_visual_probe_image", arguments: input });
      assert.equal(result.isError, true);
    }
  } finally { await f.close(); }
});

test("probe bounds requests and host headers, disables caching, and has no ERP route", async () => {
  const f = await fixture();
  try {
    const response = await fetch(f.url, { method: "GET" });
    assert.equal(response.status, 405); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await fetch(f.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ excessive: "x".repeat(5000) }) })).status, 413);
    assert.equal((await fetch(f.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status, 400);
    // Fetch may normalize Host; use the HTTP client to put the intended header on the wire.
    const rejectedHost = await new Promise<number | undefined>((resolve, reject) => {
      const operation = request(f.url, { headers: { Host: "untrusted.example.test" } }, response => {
        response.resume(); resolve(response.statusCode);
      });
      operation.once("error", reject); operation.end();
    });
    assert.equal(rejectedHost, 403);
    assert.equal((await fetch(new URL("/api/v1/sales/funnels", f.url))).status, 404);
  } finally { await f.close(); }
});

test("embedded probe bytes match the existing production get_operational_file representation", async () => {
  const server = new McpServer({ name: "synthetic-existing-file-contract", version: "1" });
  const source = sample("synthetic-png");
  registerFileTools(server, { async getOperationalFile() { return {
    uri: "indice://files/inventory_product_image/1/1", fileName: source.metadata.fileName,
    mimeType: source.metadata.mimeType, sizeBytes: source.metadata.sizeBytes,
    sha256: source.metadata.sha256, contentBase64: source.bytes.toString("base64")
  }; } }, new Set(["get_operational_file"]));
  const client = new Client({ name: "synthetic-existing-file-client", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  const probe = await fixture();
  try {
    const existing = await client.callTool({ name: "get_operational_file", arguments: { purpose: "inventory_product_image", targetId: 1, attachmentId: 1 } }) as CallToolResult;
    const result = await probe.client.callTool({ name: "get_visual_probe_resource", arguments: { sampleId: "synthetic-png" } }) as CallToolResult;
    assert.equal(existing.content[0]?.type, result.content[0]?.type);
    assert.deepEqual(bytes(existing), bytes(result));
    assert.equal((existing.structuredContent as { sha256: string }).sha256, source.metadata.sha256);
  } finally { await probe.close(); await client.close(); await server.close(); }
});

test("production discovery never registers the isolated visual probe tools", async () => {
  const unavailable = async (): Promise<never> => { throw Error("No backend in this discovery test."); };
  const server = createIndiceMcpServer({ getSalesToday: unavailable, getBusinessSnapshot: unavailable,
    previewCreateTask: unavailable, createTask: unavailable });
  const client = new Client({ name: "production-catalog-regression", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  try { assert.ok((await client.listTools()).tools.every(tool => !tool.name.includes("visual_probe"))); }
  finally { await client.close(); await server.close(); }
});

test("private tunnel stdio entry point returns the same synthetic image without a backend or listener", async () => {
  const client = new Client({ name: "synthetic-stdio-probe-test", version: "1" });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL("./visualProbe/stdio.js", import.meta.url))], stderr: "pipe" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 3);
    const result = await client.callTool({ name: "get_visual_probe_image", arguments: { sampleId: "synthetic-png", clientSupportsImages: true } }) as CallToolResult;
    assert.deepEqual(bytes(result), sample("synthetic-png").bytes);
  } finally { await client.close(); }
});
