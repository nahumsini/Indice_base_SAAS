import assert from 'node:assert/strict';
import test from 'node:test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createIndiceMcpServer} from '../mcpServer.js';
import {IndiceClient} from '../indiceClient.js';
import {loadConfig} from '../config.js';
import {meetingChangeSchemas,meetingCommitSchema} from '../meetingTools.js';
import {isRetryableRead} from '../toolPolicy.js';
const meeting={id:7,title:'Synthetic review',meetingType:'WORKING',status:'IN_PROGRESS',startAt:'2026-10-23T12:00:00Z',endAt:'2026-10-23T13:00:00Z',timezone:'UTC',ownerId:42,ownerName:'Synthetic coordinator',participantCount:1,hasMinutes:false,version:1};
const detail={meeting,agenda:'Review delivery',location:'',minutes:'',decisions:'',participants:[{id:43,name:'Synthetic participant'}],history:[],planning:null};
test('meeting protocol preserves confirmed notes and rejects replacement authority before HTTP',async()=>{
  const calls:Array<{url:string;body:unknown}>=[];
  const backend=new IndiceClient(loadConfig({INDICE_BACKEND_URL:'http://127.0.0.1:8082',INDICE_MCP_TRANSPORT:'http'}),(async(input,init)=>{
    const url=String(input),body=JSON.parse(String(init?.body));calls.push({url,body});
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer idx_ai_synthetic');
    const value=url.endsWith('/preview')?{tool:'save_meeting_minutes',confirmationToken:'idx_confirm_'+'a'.repeat(43),expiresAt:'2026-10-23T12:05:00Z',requiresConfirmation:true,prepared:{action:'save_meeting_minutes',change:body,before:{meetingTitle:meeting.title,minutes:'',decisions:''},after:{meetingTitle:meeting.title,minutes:'Reviewed notes',decisions:'Reviewed decision'}},consequences:['Save the confirmed changes.']}
      :url.endsWith('/commit')?{tool:'save_meeting_minutes',replayed:false,result:{kind:'meeting',id:7,meetingId:7},record:{...detail,minutes:'Reviewed notes',decisions:'Reviewed decision'}}:detail;
    return new Response(JSON.stringify(value));
  }) as typeof fetch,'idx_ai_synthetic');
  const server=createIndiceMcpServer(backend,new Set(['get_meeting','preview_save_meeting_minutes','save_meeting_minutes','delegate_meeting_agreement_task']));
  const client=new Client({name:'meeting-regression',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
  try{
    const tools=(await client.listTools()).tools;assert.equal(tools.length,4);
    assert.deepEqual(tools.find(t=>t.name==='delegate_meeting_agreement_task')?._meta?.securitySchemes,[{type:'oauth2',scopes:['meeting_agreements.manage','tasks.create','tasks.delegate']}]);
    assert.equal((await client.callTool({name:'get_meeting',arguments:{meetingId:7}})).isError,undefined);
    const change={meetingId:7,expectedVersion:1,minutes:'Reviewed notes',decisions:'Reviewed decision'};
    assert.equal((await client.callTool({name:'preview_save_meeting_minutes',arguments:change})).isError,undefined);
    const commit={confirmationToken:'idx_confirm_'+'a'.repeat(43),idempotencyKey:'meeting-retry-001'};
    assert.equal((await client.callTool({name:'save_meeting_minutes',arguments:commit})).isError,undefined);
    assert.equal((await client.callTool({name:'save_meeting_minutes',arguments:{...commit,minutes:'Replacement'}})).isError,true);
    assert.equal(calls.length,3);assert.deepEqual(calls[1]?.body,change);assert.deepEqual(calls[2]?.body,commit);
  }finally{await client.close();await server.close();}
});
test('meeting actions cannot inject identity, votes, attendance or fulfilment and never auto retry',()=>{
  const change={meetingId:7,expectedVersion:1,title:'Deliver approved work',assigneeId:43,dueDate:'2026-10-30'};
  for(const field of ['companyId','role','userId','status','attendance','votes','fulfilledAt'])assert.equal(meetingChangeSchemas.create_meeting_agreement.safeParse({...change,[field]:'injected'}).success,false);
  assert.equal(meetingCommitSchema.safeParse({confirmationToken:'idx_confirm_'+'a'.repeat(43),idempotencyKey:'meeting-retry-001',assigneeId:99}).success,false);
  for(const name of ['list_meetings','get_meeting','get_meeting_agreements','get_meeting_agreement_performance'])assert.equal(isRetryableRead('/api/v1/ai/tools/meetings/'+name,'POST'),true);
  for(const name of ['save_meeting_minutes','create_meeting_agreement','delegate_meeting_agreement_task'])for(const stage of ['preview','commit'])assert.equal(isRetryableRead(`/api/v1/ai/tools/meetings/${name}/${stage}`,'POST'),false);
});
