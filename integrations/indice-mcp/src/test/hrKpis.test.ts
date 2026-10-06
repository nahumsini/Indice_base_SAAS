import assert from "node:assert/strict";
import test from "node:test";
import { hrKpiRequestSchema,hrKpiResultSchema } from "../hrKpiTools.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
test("HR KPI read keeps N/A and source availability without exposing private source rows",async()=>{
  const args={date:"2026-10-06",from:"2026-10-01",to:"2026-10-31",unitId:3,department:"Operations"};
  const expected={definitionVersion:1,date:args.date,from:args.from,to:args.to,previousDate:"2026-10-05",workforce:{total:1,active:1,inactive:0,terminated:0},attendance:{scheduled:1,onTime:0,late:0,absence:0,pending:1,rest:0,leave:0,unconfigured:0,present:0,completedSample:0,attendanceRate:null,punctualityRate:null},previousAttendance:null,assets:null,records:null,permissions:null,sources:[{name:"assets",available:false,reason:"current_source_permission_required"}]};
  const config=loadConfig({INDICE_BACKEND_URL:"http://127.0.0.1:8082",INDICE_MCP_TRANSPORT:"http"});
  const backend=new IndiceClient(config,(async(input,init)=>{assert.equal(String(input),"http://127.0.0.1:8082/api/v1/ai/tools/kpis/get_hr_kpis");assert.deepEqual(JSON.parse(String(init?.body)),args);return new Response(JSON.stringify({...expected,employeeBankAccount:"must-not-leak"}));}) as typeof fetch,"idx_ai_synthetic");
  assert.deepEqual(await backend.getHrKpis(args),hrKpiResultSchema.parse(expected));assert.equal(hrKpiRequestSchema.safeParse({...args,companyId:99}).success,false);
});
