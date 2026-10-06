import assert from "node:assert/strict";
import test from "node:test";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";
import {createIndiceMcpServer} from "../mcpServer.js";
import {IndiceClient} from "../indiceClient.js";
import {loadConfig} from "../config.js";
import {posInputs,posReadNames,posActionNames,posPreviewSchema} from "../posContracts.js";
import {procurementInputs,procurementReadNames,procurementActionNames,procurementPreviewSchema} from "../procurementContracts.js";
import {inventoryCatalogReadNames,inventoryCatalogActionNames,inventoryCatalogInputs} from "../inventoryCatalogContracts.js";
import {isRetryableRead,toolScopes} from "../toolPolicy.js";
const config=loadConfig({INDICE_BACKEND_URL:"http://127.0.0.1:8082",INDICE_MCP_TRANSPORT:"http"});
const confirmation="idx_confirm_"+"a".repeat(43);
for(const d of [
 {name:"pos",action:"complete_pos_checkout",scope:"pos.checkout",empty:{registers:[],shifts:[],tickets:[],cashMovements:[],receipts:[],returns:[],closings:[]},args:{checkout:{cashRegisterId:7,currency:"CAD",items:[{productId:3,quantity:2,unitPrice:10}],payments:[{method:"CASH",amount:20}]}},extra:{checkout:null,receipt:null,returnPlan:null,settlements:[]}},
 {name:"procurement",action:"receive_purchase_order",scope:"inventory.procurement.receive",empty:{orders:[],submissions:[],invoices:[],supplierLinks:[]},args:{id:3,receipt:{items:[{orderItemId:7,receivedQuantity:2}]}},extra:{stock:[],finance:[],catalog:[]}},
 {name:"commission",action:"set_sales_commission_schedule_status",scope:"sales.commissions.schedule",empty:{cuts:[],schedules:[]},args:{id:3,status:"paused",reason:"Pause future monthly cuts"},extra:{incentives:[],monetarySummary:null}},
 {name:"pos_operations",action:"claim_pos_preticket",scope:"pos.orders.manage",empty:{closings:[],settlements:[],sources:[]},args:{id:3,source:{cashRegisterId:7}},extra:{}},
 {name:"inventory_catalog",action:"set_inventory_discount_status",scope:"inventory.discounts.manage",empty:{providers:[],discounts:[],evaluation:[]},args:{id:3,status:"PAUSED",reason:"Campaign temporarily suspended"},extra:{}},
])test(d.name+" real SDK protocol retains reviewed confirmation and original retry identity",async()=>{
 const requests:{url:string;body:unknown}[]=[];
 const backend=new IndiceClient(config,(async(input,init)=>{const url=String(input),body=JSON.parse(String(init?.body));requests.push({url,body});assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer idx_ai_synthetic");return new Response(JSON.stringify(url.endsWith("/preview")?{action:d.action,confirmationToken:confirmation,expiresAt:"2026-10-06T10:05:00Z",requiresConfirmation:true,before:d.empty,after:d.empty,changes:body,...d.extra,effects:["Review native currency, original tender and stock effects."]}:{action:d.action,replayed:requests.length>2,correlationId:"synthetic-commerce",result:{action:d.action,...(d.name==="pos"?{requestKey:"synthetic-original-request-001"}:{}),records:d.empty}}));}) as typeof fetch,"idx_ai_synthetic");
 const server=createIndiceMcpServer(backend,new Set(["preview_"+d.action,d.action]));const client=new Client({name:"commerce-contract",version:"1"});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
 try {const tools=(await client.listTools()).tools;assert.equal(tools.length,2);for(const tool of tools)assert.deepEqual(tool._meta?.securitySchemes,[{type:"oauth2",scopes:[d.scope]}]);
 assert.equal((await client.callTool({name:"preview_"+d.action,arguments:d.args})).isError,undefined);
 const identity={confirmation_token:confirmation,idempotency_key:"commerce-retry-001"};assert.equal((await client.callTool({name:d.action,arguments:identity})).isError,undefined);const replay=await client.callTool({name:d.action,arguments:identity});assert.equal(replay.isError,undefined);assert.equal((replay.structuredContent as Record<string,unknown>).replayed,true);assert.deepEqual(requests[1]?.body,{confirmationToken:confirmation,idempotencyKey:"commerce-retry-001"});assert.deepEqual(requests[2]?.body,requests[1]?.body);
 } finally {await client.close();await server.close();}
});
test("closed commerce inputs exclude tenant authority, manual paid state and raw file URLs",()=>{
 assert.equal(posInputs.complete_pos_checkout.safeParse({checkout:{cashRegisterId:7,companyId:999,currency:"CAD",items:[{productId:3,quantity:2,unitPrice:10}],payments:[{method:"CASH",amount:20}]}}).success,false);
 assert.equal(posInputs.confirm_pos_cash_return.safeParse({id:2,returnConfirmation:{cashReturned:true,paid:true}}).success,false);
 assert.equal(procurementInputs.submit_supplier_invoice.safeParse({invoice:{providerId:3,number:"TEST",subtotal:10,currency:"CAD",documentUrl:"https://example.test/private"}}).success,false);
 assert.equal(procurementInputs.receive_purchase_order.safeParse({id:3,receipt:{companyId:999,items:[{orderItemId:7,receivedQuantity:2}]}}).success,false);
});
test("catalog inputs cannot forge organization, gateway bindings or discount authorization",()=>{
 assert.equal(inventoryCatalogInputs.create_inventory_provider.safeParse({provider:{name:"Synthetic",unitId:999}}).success,false);
 assert.equal(inventoryCatalogInputs.create_inventory_provider.safeParse({provider:{name:"Synthetic",metadata:{gatewaySecret:"forbidden"}}}).success,false);
 assert.equal(inventoryCatalogInputs.set_inventory_discount_status.safeParse({id:3,status:"PAUSED",reason:"Synthetic pause",role:"root"}).success,false);
});
test("only named commerce reads can retry automatically",()=>{
 for(const [name,reads,actions] of [["pos",posReadNames,posActionNames],["procurement",procurementReadNames,procurementActionNames],["inventory_catalog",inventoryCatalogReadNames,inventoryCatalogActionNames]] as const){
 for(const read of reads){assert.equal(isRetryableRead("/api/v1/ai/tools/"+name+"_workflows/"+read,"POST"),true);assert.match(toolScopes[read],/\.read$/);}
 for(const action of actions){const path="/api/v1/ai/tools/"+name+"_workflows/"+action;assert.equal(isRetryableRead(path+"/preview","POST"),false);assert.equal(isRetryableRead(path+"/commit","POST"),false);}
 assert.equal(isRetryableRead("/api/v1/ai/tools/"+name+"_workflows/arbitrary_collection","POST"),false);
 }
});
