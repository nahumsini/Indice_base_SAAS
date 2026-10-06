import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { salesWorkflowActionNames, salesWorkflowInputs, salesWorkflowReadNames, salesWorkflowPreviewSchema, salesWorkflowReadSchema } from "../salesWorkflowContracts.js";
import { isRetryableRead, toolScopes } from "../toolPolicy.js";

const empty = {sales: [], contracts: [], followUps: [], rules: []};
const config = loadConfig({INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http"});
const key = "idx_confirm_" + "a".repeat(43);

test("salesWorkflow protocol binds reviewed action and retries without resending stock authority", async () => {
  const requests: {url: string; body: unknown}[] = [];
  const backend = new IndiceClient(config, (async (input, init) => {
    const url = String(input), body = JSON.parse(String(init?.body)); requests.push({url, body});
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer idx_ai_synthetic");
    return new Response(JSON.stringify(url.endsWith("/preview") ? {
      action: "confirm_sale_collection", confirmationToken: key, expiresAt: "2026-10-06T10:05:00Z", requiresConfirmation: true,
      before: empty, after: empty, changes: body, stock: [], collection: null, effects: ["Review stock, warehouses and reservations."],
    } : {action: "confirm_sale_collection", replayed: requests.length > 2, correlationId: "synthetic-salesWorkflow", result: {action: "confirm_sale_collection", records: empty}}));
  }) as typeof fetch, "idx_ai_synthetic");
  const server = createIndiceMcpServer(backend, new Set(["preview_confirm_sale_collection", "confirm_sale_collection"]));
  const client = new Client({name: "salesWorkflow-contract", version: "1"});
  const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(b); await client.connect(a);
  try {
    const tools = (await client.listTools()).tools; assert.equal(tools.length, 2);
    for (const tool of tools) assert.deepEqual(tool._meta?.securitySchemes, [{type: "oauth2", scopes: ["sales.collections.confirm"]}]);
    const changes = {id: 2, collection: {paymentMethod: "cash"}};
    assert.equal((await client.callTool({name: "preview_confirm_sale_collection", arguments: changes})).isError, undefined);
    const identity = {confirmation_token: key, idempotency_key: "salesWorkflow-retry-001"};
    assert.equal((await client.callTool({name: "confirm_sale_collection", arguments: identity})).isError, undefined);
    const replay = await client.callTool({name: "confirm_sale_collection", arguments: identity}); assert.equal(replay.isError, undefined); assert.equal((replay.structuredContent as Record<string, unknown>)?.replayed, true);
    assert.deepEqual(requests[0], {url: "http://127.0.0.1:8082/api/v1/ai/tools/sales_workflows/confirm_sale_collection/preview", body: changes});
    assert.deepEqual(requests[1], {url: "http://127.0.0.1:8082/api/v1/ai/tools/sales_workflows/confirm_sale_collection/commit", body: {confirmationToken: key, idempotencyKey: identity.idempotency_key}});
    assert.deepEqual(requests[1], requests[2]);
    assert.equal((await client.callTool({name: "confirm_sale_collection", arguments: {...identity, companyId: 99}})).isError, true); assert.equal(requests.length, 3);
  } finally { await client.close(); await server.close(); }
});

test("closed salesWorkflow action schemas reject company authority and preserve lifecycle consent boundaries", () => {
  const sale={customerId:1,warehouseId:2,currency:"CAD",items:[{productId:3,quantity:1,unitPrice:10}]};
  const contract={customerId:1,title:"Synthetic",contractType:"service_agreement"};
  const followUp={customerId:1,relationType:"recurrent_customer",postSaleType:"support"};
  const rule={name:"Synthetic",type:"percentage_of_sale",value:5};
  const samples: Record<string,unknown>={create_commercial_sale:{sale},update_commercial_sale:{id:1,sale},convert_quote_to_sale:{sale:{quoteId:1}},approve_sale_commercial:{id:1},confirm_sale_inventory:{id:1},confirm_sale_collection:{id:1,collection:{paymentMethod:"cash"}},update_sale_delivery:{id:1,status:"delivered"},cancel_commercial_sale:{id:1,reason:"Correction"},create_sales_contract:{contract},update_sales_contract:{id:1,contract},review_sales_contract:{id:1},cancel_sales_contract:{id:1,reason:"Correction"},create_sales_follow_up:{followUp},update_sales_follow_up:{id:1,followUp},set_sales_follow_up_status:{id:1,status:"completed"},create_commission_rule:{rule},update_commission_rule:{id:1,rule},set_commission_rule_status:{id:1,status:"inactive"}};
  for (const action of salesWorkflowActionNames) {
    const args = samples[action] as Record<string, unknown>; assert.equal(salesWorkflowInputs[action].safeParse(args).success, true, action);
    assert.equal(salesWorkflowInputs[action].safeParse({...args, companyId: 99}).success, false);
    assert.equal(isRetryableRead(`/api/v1/ai/tools/sales_workflows/${action}/preview`, "POST"), false);
    assert.equal(isRetryableRead(`/api/v1/ai/tools/sales_workflows/${action}/commit`, "POST"), false);
    assert.equal(toolScopes[action], toolScopes[`preview_${action}`]);
  }
  for (const read of salesWorkflowReadNames) assert.equal(isRetryableRead(`/api/v1/ai/tools/sales_workflows/${read}`, "POST"), true);
  assert.notEqual(toolScopes.cancel_commercial_sale, toolScopes.create_commercial_sale);
  assert.notEqual(toolScopes.confirm_sale_collection,toolScopes.create_commercial_sale);
  assert.equal(salesWorkflowInputs.convert_quote_to_sale.safeParse({sale:{quoteId:1,items:[]}}).success,false);
  assert.equal(salesWorkflowInputs.create_commercial_sale.safeParse({sale:{...sale,companyId:99}}).success,false);
});

test("sales workflow malformed results cannot claim confirmation or fabricate signatures", () => {
 const p={action:"confirm_sale_collection",confirmationToken:key,expiresAt:"2026-10-06T10:05:00Z",requiresConfirmation:true,before:empty,after:empty,changes:{id:1,collection:{paymentMethod:"cash"}},stock:[],collection:null,effects:["Confirm"]};
 assert.equal(salesWorkflowPreviewSchema.safeParse(p).success,true);
 assert.equal(salesWorkflowPreviewSchema.safeParse({...p,requiresConfirmation:false}).success,false);
 assert.equal(salesWorkflowPreviewSchema.safeParse({...p,action:"arbitrary_sql"}).success,false);
 assert.equal(salesWorkflowReadSchema.safeParse({records:empty,totalCount:0,hasMore:false,nextCursor:null,scope:"CORPORATE_OFFICE",secret:"bad"}).success,false);
});
