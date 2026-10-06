import assert from "node:assert/strict";
import test from "node:test";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";
import {createIndiceMcpServer} from "../mcpServer.js";
import {IndiceClient} from "../indiceClient.js";
import {loadConfig} from "../config.js";
import {terminalInputs,terminalReadNames,terminalActionNames,terminalCommittedSchema} from "../terminalContracts.js";
import {isRetryableRead,toolScopes} from "../toolPolicy.js";
const config=loadConfig({INDICE_BACKEND_URL:"http://127.0.0.1:8082",INDICE_MCP_TRANSPORT:"http"});
const confirmation="idx_confirm_"+"a".repeat(43),empty={payments:[],refunds:[],returns:[],bindings:[]};
test("terminal SDK recovers an explicitly retried lost response with the same reviewed identity",async()=>{
 const requests:{url:string;body:unknown}[]=[];let commits=0;
 const backend=new IndiceClient(config,(async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));requests.push({url,body});
  assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer idx_ai_synthetic");
  if(url.endsWith("/preview"))return new Response(JSON.stringify({action:"recover_pos_terminal_payment",confirmationToken:confirmation,expiresAt:"2026-10-06T10:05:00Z",requiresConfirmation:true,before:empty,changes:body,checkout:null,refundAmount:null,currency:"CAD",effects:["Recover the original terminal attempt."]}));
  commits++;if(commits===1)return new Response(JSON.stringify({code:"provider_response_uncertain",message:"Recover the original request."}),{status:503});
  return new Response(JSON.stringify({action:"recover_pos_terminal_payment",replayed:true,correlationId:"original-server-identity",result:{action:"recover_pos_terminal_payment",requestKey:"original-server-identity",records:{...empty,payments:[{provider:"SQUARE",id:3,cashRegisterId:7,shiftId:9,requestKey:"original-payment-identity",status:"WAITING",amount:"10.25",currency:"CAD",ticketId:null,saleState:"PENDING",version:1}]}}}));
 }) as typeof fetch,"idx_ai_synthetic");
 const server=createIndiceMcpServer(backend,new Set(["preview_recover_pos_terminal_payment","recover_pos_terminal_payment"]));
 const client=new Client({name:"terminal-regression",version:"1"}),[a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
 try{
  const tools=(await client.listTools()).tools;assert.equal(tools.length,2);for(const tool of tools)assert.deepEqual(tool._meta?.securitySchemes,[{type:"oauth2",scopes:["pos.terminal.manage"]}]);
  assert.equal((await client.callTool({name:"preview_recover_pos_terminal_payment",arguments:{id:3,provider:"SQUARE"}})).isError,undefined);
  const identity={confirmation_token:confirmation,idempotency_key:"terminal-original-001"};assert.equal((await client.callTool({name:"recover_pos_terminal_payment",arguments:identity})).isError,true);assert.equal(commits,1);
  const recovered=await client.callTool({name:"recover_pos_terminal_payment",arguments:identity});assert.equal(recovered.isError,undefined);const value=terminalCommittedSchema.parse(recovered.structuredContent);assert.equal(value.replayed,true);assert.equal(value.result.records.payments[0]?.ticketId,null);assert.equal(value.result.records.payments[0]?.status,"WAITING");assert.equal(value.result.records.payments[0]?.amount,"10.25");assert.deepEqual(requests[1]?.body,requests[2]?.body);
 }finally{await client.close();await server.close();}
});
test("terminal inputs reject merchant authority and never retry financial writes automatically",()=>{
 assert.equal(terminalInputs.create_pos_terminal_payment.safeParse({provider:"SQUARE",checkout:{cashRegisterId:7,currency:"CAD",merchantId:"forged",items:[{productId:3,quantity:1,unitPrice:10}]}}).success,false);
 assert.equal(terminalInputs.recover_pos_terminal_payment.safeParse({id:3,provider:"SQUARE",paid:true}).success,false);
 for(const name of terminalReadNames)assert.equal(isRetryableRead(`/api/v1/ai/tools/terminal_workflows/${name}`,"POST"),true);
 for(const name of terminalActionNames){assert.equal(isRetryableRead(`/api/v1/ai/tools/terminal_workflows/${name}/preview`,"POST"),false);assert.equal(isRetryableRead(`/api/v1/ai/tools/terminal_workflows/${name}/commit`,"POST"),false);assert.equal(toolScopes[name],name.includes("refund")||name.includes("return")?"pos.returns.manage":"pos.terminal.manage");}
});
