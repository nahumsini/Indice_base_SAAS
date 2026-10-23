import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer, type IndiceBusinessReader } from "../mcpServer.js";

test("published tool schemas preserve standard prefix patterns after the validator security update", async () => {
  const reader: IndiceBusinessReader = {
    async getSalesToday() { throw Error("Unused fixture read"); },
    async getBusinessSnapshot() { throw Error("Unused fixture read"); },
    async previewCreateTask() { throw Error("Unused fixture mutation"); },
    async createTask() { throw Error("Unused fixture mutation"); },
  };
  const server = createIndiceMcpServer(reader), client = new Client({ name: "schema-compatibility", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await client.connect(left);
  try {
    const tools = (await client.listTools()).tools;
    let prefixConstraints = 0;
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      const object = value as Record<string, unknown>;
      // These Zod-only formats are not JSON Schema formats. Strict MCP clients
      // must continue receiving the existing interoperable pattern constraint.
      assert.ok(!["starts_with", "ends_with", "includes"].includes(String(object.format)));
      if (typeof object.pattern === "string" && object.pattern.startsWith("^idx_confirm_")) prefixConstraints++;
      Object.values(object).forEach(visit);
    };
    tools.forEach(tool => { visit(tool.inputSchema); visit(tool.outputSchema); });
    assert.ok(prefixConstraints > 10, "Existing confirmation constraints must remain published");
    const create = tools.find(tool => tool.name === "create_task");
    const properties = create?.inputSchema.properties as Record<string, { pattern?: string; format?: string }>;
    const token = properties.confirmation_token;
    assert.ok(token);
    assert.equal(token.pattern, "^idx_confirm_.*");
    assert.equal(token.format, undefined);
  } finally { await client.close(); await server.close(); }
});
