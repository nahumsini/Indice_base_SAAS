import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { processInputs,processActionNames } from "../processWorkflowContracts.js";
import { isRetryableRead,toolScopes } from "../toolPolicy.js";

const empty={project:null,process:null,run:null,occasionalPlan:null,recurringPlans:[],archived:false};
const project={name:"Synthetic project",status:"active" as const,unitId:2,businessId:3};
const process={title:"Synthetic process",description:"Instructions",frequency:"daily" as const,priority:"medium" as const,distributionMode:"individual" as const,activationMode:"occasional" as const,organizationMode:"parallel" as const,includeWeekends:true,isActive:true,graceDays:0,generationWindowDays:45,evidenceRequired:false,taskTemplates:[{title:"Synthetic task",priority:"medium" as const,stage:1,scheduledOffsetDays:0,deadlineOffsetDays:1,evidenceRequired:true,assigneeUserCompanyIds:[4]}]};
test("workflow protocol sends only the reviewed preparation and immutable commit identity",async()=>{
  const requests:{url:string;body:unknown}[]=[];
  const config=loadConfig({INDICE_BACKEND_URL:"http://127.0.0.1:8082",INDICE_MCP_TRANSPORT:"http"});
  const backend=new IndiceClient(config,(async(input,init)=>{
    const url=String(input),body=JSON.parse(String(init?.body));requests.push({url,body});
    assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer idx_ai_synthetic");
    return new Response(JSON.stringify(url.endsWith("/preview")?{action:"create_process",confirmationToken:"idx_confirm_"+"a".repeat(43),expiresAt:"2026-10-06T10:05:00Z",requiresConfirmation:true,before:empty,after:empty,changes:body,effects:["Review every generated task."]}:{action:"create_process",replayed:false,correlationId:"synthetic",result:empty}));
  }) as typeof fetch,"idx_ai_synthetic");
  const server=createIndiceMcpServer(backend,new Set(["preview_create_process","create_process"]));const client=new Client({name:"workflow-contract",version:"1"});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
  try{
    const tools=(await client.listTools()).tools;assert.equal(tools.length,2);
    assert.deepEqual(tools[0]?._meta?.securitySchemes,[{type:"oauth2",scopes:["processes.manage"]}]);
    const prepared=await client.callTool({name:"preview_create_process",arguments:{process}});assert.equal(prepared.isError,undefined);
    const committed=await client.callTool({name:"create_process",arguments:{confirmation_token:"idx_confirm_"+"a".repeat(43),idempotency_key:"synthetic-retry"}});assert.equal(committed.isError,undefined);
    assert.deepEqual(requests,[{url:"http://127.0.0.1:8082/api/v1/ai/tools/process_workflows/create_process/preview",body:{process}},{url:"http://127.0.0.1:8082/api/v1/ai/tools/process_workflows/create_process/commit",body:{confirmationToken:"idx_confirm_"+"a".repeat(43),idempotencyKey:"synthetic-retry"}}]);
    assert.equal((await client.callTool({name:"create_process",arguments:{confirmation_token:"idx_confirm_"+"a".repeat(43),idempotency_key:"synthetic-retry",process}})).isError,true);assert.equal(requests.length,2);
  }finally{await client.close();await server.close();}
});
test("closed workflow actions reject caller authority and only reads can auto retry",()=>{
  for(const action of processActionNames){
    const args=action==="create_project"?{project}:action==="update_project"?{id:1,project}:action==="create_process"?{process}:action==="update_process"?{id:1,process}:action==="create_process_run"?{id:1,run:{reference:"Report",startDate:"2026-10-06",allowDuplicateReference:false}}:{id:1};
    assert.equal(processInputs[action].safeParse(args).success,true);
    assert.equal(processInputs[action].safeParse({...args,companyId:99}).success,false);
    assert.equal(isRetryableRead(`/api/v1/ai/tools/process_workflows/${action}/preview`,"POST"),false);
    assert.equal(isRetryableRead(`/api/v1/ai/tools/process_workflows/${action}/commit`,"POST"),false);
  }
  assert.equal(toolScopes.create_process_run,"processes.run");assert.equal(toolScopes.update_project,"projects.manage");
  assert.equal(isRetryableRead("/api/v1/ai/tools/process_workflows/list_process_runs","POST"),true);
});
