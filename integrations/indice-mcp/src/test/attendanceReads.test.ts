import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";

for (const scenario of [
  { name:"get_hr_attendance_calendar", args:{id:3,month:"2026-10"}, expected:{userCompanyId:3,employeeName:"Synthetic",month:"2026-10",items:[]} },
  { name:"get_my_attendance_calendar", args:{month:"2026-10"}, expected:{userCompanyId:3,employeeName:"Synthetic",month:"2026-10",items:[]} },
  { name:"get_my_attendance_events",args:{startDate:"2026-10-05"},expected:{items:[{id:1,type:"check_in",timestamp:"2026-10-05T08:00:00",date:"2026-10-05",resultStatus:"on_time",kind:"check_in",notes:"Synthetic",supersedesEventId:null}],returnedCount:1,totalCount:1,hasMore:false,nextPage:null,nextCursor:null} },
  { name:"get_hr_attendance_events",args:{id:3,startDate:"2026-10-05"},expected:{items:[],returnedCount:0,totalCount:0,hasMore:false,nextPage:null,nextCursor:null} },
  { name:"list_hr_schedule_candidates",args:{startDate:"2026-10-12",endDate:"2026-10-13",availableOnly:true,page:{query:"Synthetic",limit:5}},expected:{items:[{userCompanyId:3,employeeName:"Synthetic",position:"Operator",department:"Operations",status:"active",unitId:4,unitName:"Unit",businessId:9,businessName:"Business",available:true,busyReason:""}],returnedCount:1,totalCount:1,hasMore:false,nextPage:null,nextCursor:null} }
] as const) {
  test(`${scenario.name}: complete typed read with derived authority and no private media`, async () => {
    const requests: unknown[]=[];
    const config=loadConfig({INDICE_BACKEND_URL:"http://127.0.0.1:8082",INDICE_MCP_TRANSPORT:"http"});
    const backend=new IndiceClient(config,(async(input,init)=>{
      assert.equal(String(input),`http://127.0.0.1:8082/api/v1/ai/tools/hr/${scenario.name}`);
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({...scenario.expected,photoUrl:"must-not-leak",faceSession:"private"}));
    }) as typeof fetch,"idx_ai_synthetic");
    const server=createIndiceMcpServer(backend,new Set([scenario.name]));
    const client=new Client({name:"attendance-contract",version:"1"});
    const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
    try {
      const result=await client.callTool({name:scenario.name,arguments:scenario.args});
      assert.equal(result.isError,undefined);assert.deepEqual(result.structuredContent,scenario.expected);
      assert.deepEqual(requests[0],scenario.args);
      assert.equal((await client.callTool({name:scenario.name,arguments:{...scenario.args,userId:99}})).isError,true);
      assert.equal(requests.length,1);
    } finally {await client.close();await server.close();}
  });
}
