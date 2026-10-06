import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { httpFixture,json } from "./httpFixture.js";
import { stageFileRequestSchema,fileContentSchema,fileActionSchema,commerceReportRequestSchema } from "../fileContracts.js";
import { isRetryableRead } from "../toolPolicy.js";

const sha=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const stageId="11111111-1111-4111-8111-111111111111";
const confirmation="idx_confirm_"+"a".repeat(43);

test("commerce report travels through the real HTTP SDK as a private resource without publishing its bytes",async()=>{
  const bytes=Buffer.from('currency,amount\n"CAD","10.25"\n');let payload:unknown;
  const fixture=await httpFixture((async(input,init)=>{
    if(new URL(String(input)).pathname.endsWith("/capabilities"))return json({version:"v1",tools:["export_commerce_report"]});
    payload=JSON.parse(String(init?.body));return json({uri:"indice://commerce-reports/pos_tickets/csv",fileName:"pos_tickets.csv",mimeType:"text/csv",sizeBytes:bytes.length,sha256:sha(bytes),contentBase64:bytes.toString("base64")});
  }) as typeof fetch);
  try{const client=await fixture.client();const response=await client.callTool({name:"export_commerce_report",arguments:{report:"pos_tickets",format:"csv",shiftId:7}});
    assert.equal(response.isError,undefined);assert.deepEqual(payload,{report:"pos_tickets",format:"csv",shiftId:7});
    assert.equal(((response.content as unknown[])[0] as {type:string}).type,"resource");assert.ok(!JSON.stringify(response.structuredContent).includes(bytes.toString("base64")));assert.ok(!JSON.stringify(fixture.events).includes(bytes.toString("base64")));
  }finally{await fixture.close();}
});
test("commerce reports reject unsupported filters and require the original POS selection",()=>{
  for(const input of [{report:"pos_tickets",format:"csv"},{report:"pos_closings",format:"csv",shiftId:7},{report:"inventory_products",format:"csv",from:"2026-10-01",to:"2026-10-06"},{report:"commercial_sales",format:"csv",from:"2025-01-01",to:"2026-10-06"},{report:"inventory_balances",format:"csv",companyId:99}])assert.equal(commerceReportRequestSchema.safeParse(input).success,false);
  assert.equal(isRetryableRead("/api/v1/ai/tools/files/export_commerce_report","POST"),true);
  assert.equal(stageFileRequestSchema.safeParse({purpose:"inventory_product_image",targetId:1,fileName:"file.pdf",mimeType:"application/pdf",contentBase64:Buffer.from("%PDF-1.4").toString("base64"),idempotencyKey:"synthetic-key"}).success,false);
});
test("real HTTP uploads beyond 100 KB and confirms an exact file before returning a private resource",async()=>{
  const bytes=Buffer.alloc(200*1024,32);bytes.write("%PDF-1.4");const content=bytes.toString("base64");
  const staged={stagedFileId:stageId,purpose:"employee_document",targetId:7,documentType:"resume",fileName:"synthetic.pdf",mimeType:"application/pdf",sizeBytes:bytes.length,sha256:sha(bytes),expiresAt:"2026-10-06T12:15:00Z"};
  const allowed=["stage_operational_file","preview_attach_employee_document","attach_employee_document","list_operational_files","get_operational_file"];
  const requests:{path:string;body:unknown}[]=[];
  const fixture=await httpFixture((async(input,init)=>{
    const path=new URL(String(input)).pathname;
    if(path.endsWith("/capabilities"))return json({version:"v1",tools:allowed});
    const body=JSON.parse(String(init?.body));requests.push({path,body});
    if(path.endsWith("stage_operational_file"))return json(staged);
    if(path.endsWith("/preview"))return json({action:"attach_employee_document",confirmationToken:confirmation,expiresAt:"2026-10-06T12:05:00Z",requiresConfirmation:true,file:staged,targetName:"Synthetic employee",previousFileName:null,effects:["Register only after approval."]});
    if(path.endsWith("/commit"))return json({action:"attach_employee_document",replayed:false,correlationId:"synthetic",result:{purpose:"employee_document",targetId:7,attachmentId:8,fileName:staged.fileName,mimeType:staged.mimeType,sizeBytes:bytes.length,sha256:sha(bytes)}});
    if(path.endsWith("list_operational_files"))return json({purpose:"employee_document",targetId:7,items:[{attachmentId:8,fileName:staged.fileName,mimeType:staged.mimeType,sizeBytes:bytes.length,documentType:"resume"}]});
    return json({uri:"indice://files/employee_document/7/8",fileName:staged.fileName,mimeType:staged.mimeType,sizeBytes:bytes.length,sha256:sha(bytes),contentBase64:content,objectKey:"must-not-leak",downloadUrl:"https://private.invalid/must-not-leak"});
  }) as typeof fetch);
  try {
    const client=await fixture.client();const tools=(await client.listTools()).tools;assert.equal(tools.length,allowed.length);
    const args={purpose:"employee_document",targetId:7,documentType:"resume",fileName:"synthetic.pdf",mimeType:"application/pdf",contentBase64:content,idempotencyKey:"synthetic-file-retry"};
    const prepared=await client.callTool({name:"stage_operational_file",arguments:args});assert.equal(prepared.isError,undefined);assert.deepEqual(prepared.structuredContent,staged);
    const preview=await client.callTool({name:"preview_attach_employee_document",arguments:{stagedFileId:stageId}});assert.equal(preview.isError,undefined);
    const registered=await client.callTool({name:"attach_employee_document",arguments:{confirmation_token:confirmation,idempotency_key:"synthetic-commit"}});assert.equal(registered.isError,undefined);
    const listed=await client.callTool({name:"list_operational_files",arguments:{purpose:"employee_document",targetId:7}});assert.equal(listed.isError,undefined);
    const received=await client.callTool({name:"get_operational_file",arguments:{purpose:"employee_document",targetId:7,attachmentId:8}});assert.equal(received.isError,undefined);
    const resource=(received.content as unknown[])[0] as {type:string;resource:{blob:string}};assert.equal(resource.type,"resource");assert.equal(resource.resource.blob,content);
    assert.ok(!JSON.stringify(received.structuredContent).includes(content));assert.ok(!JSON.stringify(received).includes("must-not-leak"));
    assert.deepEqual(requests[2]?.body,{confirmationToken:confirmation,idempotencyKey:"synthetic-commit"});
    assert.deepEqual(tools.find(t=>t.name==="attach_employee_document")?._meta?.securitySchemes,[{type:"oauth2",scopes:["files.attach","hr.people.manage"]}]);
    assert.ok(!JSON.stringify(fixture.events).includes(content));
  }finally{await fixture.close();}
});
test("file schemas reject caller authority, unknown paths and altered binary outputs; only reads auto retry",()=>{
  const input={purpose:"task_evidence",targetId:1,fileName:"evidence.pdf",mimeType:"application/pdf",contentBase64:Buffer.from("%PDF-1.4").toString("base64"),idempotencyKey:"synthetic-retry"};
  assert.equal(stageFileRequestSchema.safeParse(input).success,true);
  for(const extra of [{companyId:99},{userId:99},{objectKey:"foreign"},{url:"https://external.invalid/file"},{fileName:"../evidence.pdf"}])assert.equal(stageFileRequestSchema.safeParse({...input,...extra}).success,false);
  assert.equal(fileContentSchema.safeParse({uri:"indice://file",fileName:"file.pdf",mimeType:"application/pdf",sizeBytes:8,sha256:"a".repeat(64),contentBase64:input.contentBase64}).success,false);
  assert.equal(isRetryableRead("/api/v1/ai/tools/files/stage_operational_file","POST"),false);
  for(const action of fileActionSchema.options)for(const step of ["preview","commit"])assert.equal(isRetryableRead(`/api/v1/ai/tools/files/${action}/${step}`,"POST"),false);
  for(const read of ["list_operational_files","get_operational_file","export_hr_payroll"])assert.equal(isRetryableRead(`/api/v1/ai/tools/files/${read}`,"POST"),true);
});
test("large HTTP messages cannot expand the ordinary limit or upload without a bearer header",async()=>{
  const fixture=await httpFixture((async()=>json({version:"v1",tools:[]})) as typeof fetch);
  try {
    for(const [name,token,status] of [["list_tasks","idx_ai_synthetic",413],["stage_operational_file",null,401]] as const) {
      const result=await fetch(fixture.url,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:{contentBase64:"a".repeat(110*1024)}}})});
      assert.equal(result.status,status);assert.ok(!(await result.text()).includes("aaaa"));
    }
  }finally{await fixture.close();}
});
