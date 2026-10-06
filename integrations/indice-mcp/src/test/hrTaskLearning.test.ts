import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer, type IndiceBusinessReader } from "../mcpServer.js";
import { taskOperationNameSchema } from "../contracts.js";
import { hrActionNameSchema, hrPreviewSchema, type HrActionName, type HrChange } from "../hrContracts.js";
import { toolScopes } from "../toolPolicy.js";
import { isRetryableRead } from "../toolPolicy.js";
import { attendanceFixtures } from "./attendanceFixtures.js";

const task = { title:"Synthetic task",description:null,priority:"medium" as const,dueDate:null,assignee:"Synthetic person",status:"pending",taskId:7 };
const preview = { confirmationToken:"idx_confirm_synthetic_preview",expiresAt:"2026-10-06T04:05:00Z",requiresConfirmation:true as const,task };
const result = { replayed:false,correlationId:"550e8400-e29b-41d4-a716-446655440000",task:{ id:7,folio:"T-7",title:task.title,status:"pending",dueDate:null } };
const base:IndiceBusinessReader={async getSalesToday(){throw Error("Unused");},async getBusinessSnapshot(){throw Error("Unused");},async previewCreateTask(){return preview;},async createTask(){return result;}};
async function connect(reader:IndiceBusinessReader,allowed?:Set<string>){
  const server=createIndiceMcpServer(reader,allowed),client=new Client({name:"isolated-workflow",version:"1"});
  const [left,right]=InMemoryTransport.createLinkedPair();await server.connect(right);await client.connect(left);
  return{client,close:async()=>{await client.close();await server.close();}};
}
const inputs={update_task_dependency:{task_id:7,predecessor_task_id:6,lag_days:2},schedule_task:{task_id:7,agenda_date:"2027-01-12",start_time:"09:00",time_zone:"America/Toronto"},add_task_follow_up:{task_id:7,comment:"Synthetic decision",follow_up_date:"2027-01-12",entry_type:"decision"},update_task_contribution:{task_id:7,contribution_status:"ready"},share_task:{task_id:7,collaborator_user_company_ids:[2,3]},complete_task:{task_id:7,completion_percent:100,notes:"Verified"},audit_task:{task_id:7,weighting:4},cancel_task:{task_id:7}};
for(const action of taskOperationNameSchema.options){
  test(`${action}: explicit preview, authority rejection, immutable commit and exact consent`,async()=>{
    let previews=0,commits=0;
    const session=await connect({...base,async previewTaskOperation(name,request){assert.equal(name,action);assert.equal(request.taskId,7);assert.equal(request.operation.action,action);previews++;return{...preview,task:{...task,operation:request.operation}};},async commitTaskOperation(name,request){assert.equal(name,action);assert.deepEqual(Object.keys(request).sort(),["confirmationToken","idempotencyKey"]);commits++;return result;}});
    try{
      const tools=(await session.client.listTools()).tools;
      assert.equal(toolScopes[action],action==="audit_task"?"tasks.audit":"tasks.operate");
      assert.equal(tools.find(t=>t.name===action)?.annotations?.idempotentHint,true);
      for(const extra of [{company_id:2},{user_id:3},{role:"root"}]) assert.equal((await session.client.callTool({name:`preview_${action}`,arguments:{...inputs[action],...extra}})).isError,true);
      assert.equal((await session.client.callTool({name:`preview_${action}`,arguments:inputs[action]})).isError,undefined);
      assert.equal(previews,1);assert.equal(commits,0);
      const args={confirmation_token:preview.confirmationToken,idempotency_key:"synthetic-workflow-key"};
      assert.equal((await session.client.callTool({name:action,arguments:{...args,status:"completed"}})).isError,true);
      assert.equal((await session.client.callTool({name:action,arguments:args})).isError,undefined);
      assert.equal(commits,1);
    }finally{await session.close();}
  });
}
test("HR catalog and consent remain closed; old connections cannot execute new writes",async()=>{
  const session=await connect(base,new Set(["list_tasks"]));
  try{
    assert.deepEqual((await session.client.listTools()).tools.map(t=>t.name),["list_tasks"]);
    for(const action of hrActionNameSchema.options){
      assert.equal((await session.client.callTool({name:`preview_${action}`,arguments:{company_id:1}})).isError,true);
      assert.equal((await session.client.callTool({name:action,arguments:{}})).isError,true);
    }
  }finally{await session.close();}
});
const employeeInput={firstName:"Synthetic",lastName:"Employee",email:"synthetic@example.test",position:"Operator",department:"Operations",unitId:4,businessId:9,salary:150,payPeriod:"weekly",salaryType:"daily" as const,contractType:"permanent",registrationCountry:"CA" as const};
const employeeStored={...employeeInput,phone:null,hireDate:null,hourlyRate:null,contractStartDate:null,contractEndDate:null};
const assetInput={assetType:"equipment",name:"Synthetic laptop",unitId:4,valueAmount:1000,valueCurrency:"CAD"};
const announcementInput={title:"Synthetic notice",content:"Test content",audienceType:"units" as const,unitIds:[4]};
const hrInputs:Record<HrActionName,HrChange>={prepare_hr_payroll:{payroll:{payPeriod:"weekly",periodStartDate:"2026-10-05"}},adjust_hr_payroll_line:{id:9,payroll:{lineId:10,manualItems:[{category:"earning",label:"Synthetic adjustment",amount:100}]}},recalculate_hr_payroll:{id:9},approve_hr_payroll:{id:9},register_hr_payroll_paid:{id:9},cancel_hr_payroll:{id:9},...attendanceFixtures,create_hr_incentive:{incentive:{name:"Synthetic incentive",amount:100,currency:"CAD",startDate:"2026-10-12",scopeType:"employees",employeeIds:[3]}},cancel_hr_incentive:{id:9},
create_my_hr_permission:{permission:{type:"vacation",startDate:"2026-10-12",endDate:"2026-10-13",reason:"Synthetic leave"}},withdraw_my_hr_permission:{id:9},approve_hr_permission:{id:9,permission:{reviewNotes:"Synthetic approval"}},reject_hr_permission:{id:9,permission:{}},create_employee:{employee:employeeInput},update_employee:{id:9,employee:{position:"Operator"}},import_employees:{employees:[employeeInput]},inactivate_employee:{id:9},create_hr_asset:{asset:assetInput},create_announcement:{announcement:announcementInput},
terminate_employee:{id:9,termination:{exitDate:"2026-10-01",reasonType:"resignation",summary:"Synthetic termination"}},
update_hr_asset:{id:9,asset:{name:"Updated laptop"}},reassign_hr_asset:{id:9,assignment:{responsibleUserCompanyId:3,status:"assigned"}},change_hr_asset_status:{id:9,assignment:{status:"maintenance"}},
update_announcement:{id:9,announcement:announcementInput},mark_announcement_read:{id:9},mark_announcement_unread:{id:9},
create_hr_record:{record:{userCompanyId:3,type:"observation",title:"Synthetic record",description:"Synthetic agreement",eventDate:"2026-01-01T00:00:00"}},
update_hr_record:{id:9,record:{userCompanyId:3,type:"warning",severity:"high",status:"resolved",title:"Synthetic warning",description:"Test description",eventDate:"2026-01-01T00:00:00",witnesses:[{name:"Synthetic witness"}]}}};
const hrChanges={
  create_employee:{id:null,employee:employeeStored,employees:null,asset:null,announcement:null},
  update_employee:{id:9,employee:employeeStored,employees:null,asset:null,announcement:null},
  import_employees:{id:null,employee:null,employees:[employeeStored],asset:null,announcement:null},
  inactivate_employee:{id:9,employee:null,employees:null,asset:null,announcement:null},
  create_hr_asset:{id:null,employee:null,employees:null,asset:{...assetInput,assetCode:null,model:null,serialNumber:null,responsibleUserCompanyId:null,status:"available" as const,assignedAt:null,notes:null},announcement:null},
  create_announcement:{id:null,employee:null,employees:null,asset:null,announcement:{...announcementInput,type:"general" as const,status:"draft" as const,scheduledFor:null,userCompanyIds:null,departmentNames:null}}
};
const extendedChanges=Object.fromEntries(Object.entries(hrInputs).map(([action,input])=>[action,{id:null,employee:null,employees:null,asset:null,announcement:null,...input}]));
const allChanges:Record<HrActionName,HrPreviewChanges>={...extendedChanges,update_hr_record:{...extendedChanges.update_hr_record,record:{...hrInputs.update_hr_record.record!,witnesses:[{userCompanyId:null,name:"Synthetic witness"}]}},...hrChanges} as Record<HrActionName,HrPreviewChanges>;
type HrPreviewChanges = import("zod").infer<typeof hrPreviewSchema>["changes"];
for(const action of hrActionNameSchema.options){
  test(`${action}: normalized nullable preview, strict input and immutable approval roundtrip`,async()=>{
    let preparations=0,commits=0;
    const empty={employees:[],asset:null,announcement:null};
    const session=await connect({...base,
      async previewHr(name,request){assert.equal(name,action);assert.deepEqual(request,hrInputs[action]);preparations++;return{action,confirmationToken:preview.confirmationToken,expiresAt:preview.expiresAt,requiresConfirmation:true,before:empty,after:empty,changes:allChanges[action],effects:["Synthetic reviewed effects"]};},
      async commitHr(name,request){assert.equal(name,action);assert.deepEqual(request,{confirmationToken:preview.confirmationToken,idempotencyKey:"synthetic-hr-key"});commits++;return{action,replayed:true,correlationId:result.correlationId,result:empty};}
    });
    try{
      assert.equal((await session.client.callTool({name:`preview_${action}`,arguments:{...hrInputs[action],company_id:99}})).isError,true);
      const approved=await session.client.callTool({name:`preview_${action}`,arguments:hrInputs[action]});
      assert.equal(approved.isError,undefined);assert.deepEqual(hrPreviewSchema.parse(approved.structuredContent).changes,allChanges[action]);
      assert.equal(preparations,1);assert.equal(commits,0);
      const commit={confirmation_token:preview.confirmationToken,idempotency_key:"synthetic-hr-key"};
      assert.equal((await session.client.callTool({name:action,arguments:{...commit,employee:{role:"root"}}})).isError,true);
      assert.equal((await session.client.callTool({name:action,arguments:commit})).isError,undefined);
      assert.equal(commits,1);
    }finally{await session.close();}
  });
}
test("guide roundtrip retains reviewed steps and rejects client authority",async()=>{
  const guide={version:"2026-10-05.v1",locale:"en-CA",systemLogic:"People and processes",modules:[{module:"processes",pageId:"processes-tasks",purpose:"Execution",tabs:[{tab:"calendar",label:"Agenda",title:"Plan work",purpose:"Visible tasks",effect:"Accountability",steps:[{title:"Plan",description:"Choose an authorized assignee."}],navigation:"Open Processes/Tasks.",availableTools:["list_tasks"]}]}]};
  let calls=0;
  const session=await connect({...base,async getSystemGuide(request){assert.deepEqual(request,{module:"processes",tab:"calendar",locale:"en-CA"});calls++;return guide;}});
  try{
    const args={module:"processes",tab:"calendar",locale:"en-CA"};
    assert.equal((await session.client.callTool({name:"get_system_guide",arguments:{...args,company_id:3}})).isError,true);
    assert.deepEqual((await session.client.callTool({name:"get_system_guide",arguments:args})).structuredContent,guide);
    assert.equal(calls,1);
  }finally{await session.close();}
});
test("task organization and complete HR pagination are preserved through MCP",async()=>{
  const page={generatedAt:"2026-10-06T04:00:00Z",scopeType:"TASK_ORGANIZATION_SCOPE",items:[{referenceType:"BUSINESS" as const,id:9,name:"Synthetic business",unitId:4,unitName:"Synthetic unit",status:"active"}],returnedCount:1,totalCount:2,hasMore:true,nextCursor:"synthetic-cursor"};
  const session=await connect({...base,async listTaskOrganization(request){assert.equal(request?.cursor,"previous-cursor");return page;},async readHr(name,request){assert.equal(name,"list_hr_assets");assert.deepEqual(request,{page:{page:2,limit:1}});return{items:[],returnedCount:0,totalCount:0,hasMore:false,nextPage:null,nextCursor:null};}});
  try{
    assert.deepEqual((await session.client.callTool({name:"list_task_organization",arguments:{cursor:"previous-cursor"}})).structuredContent,page);
    const result=await session.client.callTool({name:"list_hr_assets",arguments:{page:2,limit:1}});
    assert.equal(result.isError,undefined);assert.match(JSON.stringify(result.content),/Consulta completa/);
  }finally{await session.close();}
});
test("announcement recipients use their own tab and consent and retain an opaque continuation",async()=>{
  const page={items:[{referenceType:"UNIT" as const,id:4,name:"Synthetic unit",unitId:null,unitName:"",activeUserCount:2}],returnedCount:1,totalCount:2,hasMore:true,nextPage:2,nextCursor:"synthetic-audience-cursor"};
  const session=await connect({...base,async readHr(name,request){assert.equal(name,"list_announcement_audience");assert.deepEqual(request,{page:{query:"Synthetic",limit:1,cursor:"previous-cursor"}});return page;}},new Set(["list_announcement_audience"]));
  try{
    const tools=(await session.client.listTools()).tools;
    assert.equal(tools.length,1);assert.equal(toolScopes.list_announcement_audience,"hr.announcements.manage");
    assert.deepEqual((await session.client.callTool({name:"list_announcement_audience",arguments:{query:"Synthetic",limit:1,cursor:"previous-cursor"}})).structuredContent,page);
    assert.equal(isRetryableRead("/api/v1/ai/tools/hr/list_announcement_audience","POST"),true);
    assert.equal(isRetryableRead("/api/v1/ai/tools/hr/create_announcement/preview","POST"),false);
    assert.equal(isRetryableRead("/api/v1/ai/tools/hr/create_announcement/commit","POST"),false);
  }finally{await session.close();}
});
