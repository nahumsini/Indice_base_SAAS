import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { inventoryActionNames, inventoryInputs, inventoryReadNames, inventoryPreviewSchema, inventorySummarySchema } from "../inventoryContracts.js";
import { isRetryableRead, toolScopes } from "../toolPolicy.js";

const empty = {products: [], warehouses: [], balances: [], movements: []};
const config = loadConfig({INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http"});
const key = "idx_confirm_" + "a".repeat(43);

test("inventory protocol binds reviewed action and retries without resending stock authority", async () => {
  const requests: {url: string; body: unknown}[] = [];
  const backend = new IndiceClient(config, (async (input, init) => {
    const url = String(input), body = JSON.parse(String(init?.body)); requests.push({url, body});
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer idx_ai_synthetic");
    return new Response(JSON.stringify(url.endsWith("/preview") ? {
      action: "transfer_inventory_stock", confirmationToken: key, expiresAt: "2026-10-06T10:05:00Z", requiresConfirmation: true,
      before: empty, after: empty, changes: body, effects: ["Review stock, warehouses and reservations."],
    } : {action: "transfer_inventory_stock", replayed: requests.length > 2, correlationId: "synthetic-inventory", result: {action: "transfer_inventory_stock", records: empty}}));
  }) as typeof fetch, "idx_ai_synthetic");
  const server = createIndiceMcpServer(backend, new Set(["preview_transfer_inventory_stock", "transfer_inventory_stock"]));
  const client = new Client({name: "inventory-contract", version: "1"});
  const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(b); await client.connect(a);
  try {
    const tools = (await client.listTools()).tools; assert.equal(tools.length, 2);
    for (const tool of tools) assert.deepEqual(tool._meta?.securitySchemes, [{type: "oauth2", scopes: ["inventory.movements.create"]}]);
    const movement = {fromWarehouseId: 2, toWarehouseId: 3, date: "2026-10-06", reason: "Synthetic transfer", items: [{productId: 4, quantity: "2.125"}]};
    assert.equal((await client.callTool({name: "preview_transfer_inventory_stock", arguments: {movement}})).isError, undefined);
    const identity = {confirmation_token: key, idempotency_key: "inventory-retry-001"};
    assert.equal((await client.callTool({name: "transfer_inventory_stock", arguments: identity})).isError, undefined);
    const replay = await client.callTool({name: "transfer_inventory_stock", arguments: identity}); assert.equal(replay.isError, undefined); assert.equal((replay.structuredContent as Record<string, unknown>)?.replayed, true);
    assert.deepEqual(requests[0], {url: "http://127.0.0.1:8082/api/v1/ai/tools/inventory_workflows/transfer_inventory_stock/preview", body: {movement}});
    assert.deepEqual(requests[1], {url: "http://127.0.0.1:8082/api/v1/ai/tools/inventory_workflows/transfer_inventory_stock/commit", body: {confirmationToken: key, idempotencyKey: identity.idempotency_key}});
    assert.deepEqual(requests[1], requests[2]);
    assert.equal((await client.callTool({name: "transfer_inventory_stock", arguments: {...identity, movement}})).isError, true); assert.equal(requests.length, 3);
  } finally { await client.close(); await server.close(); }
});

test("closed inventory action schemas reject company authority and preserve lifecycle consent boundaries", () => {
  const samples: Record<string, unknown> = {
    create_inventory_product: {product: {name: "Synthetic", currency: "CAD", inventoryUnit: "Kilogram"}},
    update_inventory_product: {id: 1, product: {price: "10.50"}}, inactivate_inventory_product: {id: 1, reason: "Inactive"},
    create_inventory_warehouse: {warehouse: {name: "Synthetic", unitId: 2, businessId: 3}}, update_inventory_warehouse: {id: 1, warehouse: {name: "Edited"}}, inactivate_inventory_warehouse: {id: 1, reason: "Inactive"},
    configure_inventory_stock: {stock: {productId: 1, warehouseId: 2, minimumQuantity: 0, enableInventory: true}},
    receive_inventory_stock: {movement: {toWarehouseId: 2, providerId: 3, date: "2026-10-06", reason: "Receive", items: [{productId: 4, quantity: 2, unitCost: "1.2345"}]}},
    issue_inventory_stock: {movement: {fromWarehouseId: 2, date: "2026-10-06", reason: "Damage", items: [{productId: 4, quantity: 2}]}},
    transfer_inventory_stock: {movement: {fromWarehouseId: 2, toWarehouseId: 3, date: "2026-10-06", reason: "Move", items: [{productId: 4, quantity: 2}]}},
    count_inventory_stock: {movement: {fromWarehouseId: 2, date: "2026-10-06", reason: "Count empty", items: [{productId: 4, quantity: 0}]}}, cancel_inventory_movement: {id: 1, reason: "Correction"},
  };
  for (const action of inventoryActionNames) {
    const args = samples[action] as Record<string, unknown>; assert.equal(inventoryInputs[action].safeParse(args).success, true, action);
    assert.equal(inventoryInputs[action].safeParse({...args, companyId: 99}).success, false);
    assert.equal(isRetryableRead(`/api/v1/ai/tools/inventory_workflows/${action}/preview`, "POST"), false);
    assert.equal(isRetryableRead(`/api/v1/ai/tools/inventory_workflows/${action}/commit`, "POST"), false);
    assert.equal(toolScopes[action], toolScopes[`preview_${action}`]);
  }
  for (const read of inventoryReadNames) assert.equal(isRetryableRead(`/api/v1/ai/tools/inventory_workflows/${read}`, "POST"), true);
  assert.notEqual(toolScopes.cancel_inventory_movement, toolScopes.transfer_inventory_stock);
  assert.equal(inventoryInputs.create_inventory_product.safeParse({product: {name: "Synthetic", currency: "CAD", metadata: {authority: "root"}}}).success, false);
  assert.equal(inventoryInputs.receive_inventory_stock.safeParse({movement: {toWarehouseId: 2, date: "2026-10-06", reason: "No supplier", items: [{productId: 4, quantity: 2, unitCost: 1}]}}).success, false);
});

test("inventory totals are native and full population; malformed backend preparation fails closed", () => {
  const summary = inventorySummarySchema.parse({balanceCount: 123, belowMinimumCount: 7, values: [{currency: "CAD", inventoryValue: "312.3400"}, {currency: "MXN", inventoryValue: "400.0000"}], scope: "CORPORATE_OFFICE"});
  assert.equal(summary.balanceCount, 123); assert.equal(summary.values.length, 2);
  assert.equal(inventoryPreviewSchema.safeParse({action: "transfer_inventory_stock", confirmationToken: key, expiresAt: "2026-10-06T10:05:00Z", requiresConfirmation: false, before: empty, after: empty, changes: {}, effects: ["Confirm"]}).success, false);
  assert.equal(inventoryPreviewSchema.safeParse({action: "arbitrary_sql", confirmationToken: key, expiresAt: "2026-10-06T10:05:00Z", requiresConfirmation: true, before: empty, after: empty, changes: {}, effects: ["Confirm"]}).success, false);
});
