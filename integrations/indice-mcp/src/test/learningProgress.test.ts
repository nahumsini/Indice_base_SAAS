import assert from 'node:assert/strict';
import test from 'node:test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createIndiceMcpServer} from '../mcpServer.js';
import {IndiceClient} from '../indiceClient.js';
import {loadConfig} from '../config.js';
import {learningChangeSchema,learningCommitSchema} from '../learningProgressTools.js';
import {isRetryableRead,toolScopes} from '../toolPolicy.js';

const chapter={chapterId:'processes.calendar',version:2,stage:2,module:'processes',tab:'calendar',pageId:'processes-tasks',label:'Tasks',status:'pending',understoodAt:null,appliedAt:null,journey:true,companion:true,steps:[{id:'prepare',title:'Before starting',description:'Choose scope and assignee.'}]};
const progress={catalogVersion:'reviewed',currentChapterId:'processes.calendar',stages:[{stage:2,total:1,understood:0,applied:0}],chapters:[chapter],nextMission:chapter};

test('learning protocol preserves immutable commit identity and filters discovery',async()=>{
  const requests:Array<{url:string;body:unknown}>=[];
  const backend=new IndiceClient(loadConfig({INDICE_BACKEND_URL:'http://127.0.0.1:8082',INDICE_MCP_TRANSPORT:'http'}),(async(input,init)=>{
    const url=String(input),body=JSON.parse(String(init?.body));requests.push({url,body});
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer idx_ai_synthetic');
    const result=url.endsWith('/preview')?{tool:'update_learning_progress',confirmationToken:'idx_confirm_'+'a'.repeat(43),expiresAt:'2026-10-06T12:05:00Z',requiresConfirmation:true,previousChapterId:null,change:body,consequences:['Saves only private progress.']}
      :url.endsWith('/commit')?{tool:'update_learning_progress',replayed:false,progress}:progress;
    return new Response(JSON.stringify(result));
  }) as typeof fetch,'idx_ai_synthetic');
  const server=createIndiceMcpServer(backend,new Set(['get_learning_progress','get_next_learning_mission','preview_update_learning_progress','update_learning_progress']));
  const client=new Client({name:'learning-regression',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
  try{
    const tools=(await client.listTools()).tools;assert.equal(tools.length,4);
    assert.deepEqual(tools.find(t=>t.name==='update_learning_progress')?._meta?.securitySchemes,[{type:'oauth2',scopes:['learning.manage']}]);
    const next=await client.callTool({name:'get_next_learning_mission',arguments:{locale:'en-CA'}});assert.equal(next.isError,undefined);assert.deepEqual(next.structuredContent,{catalogVersion:'reviewed',mission:chapter});
    assert.equal((await client.callTool({name:'preview_update_learning_progress',arguments:{chapterId:'processes.calendar',version:2,operation:'understood',locale:'en-CA'}})).isError,undefined);
    assert.equal((await client.callTool({name:'update_learning_progress',arguments:{confirmationToken:'idx_confirm_'+'a'.repeat(43),idempotencyKey:'learning-retry-001'}})).isError,undefined);
    assert.equal((await client.callTool({name:'update_learning_progress',arguments:{confirmationToken:'idx_confirm_'+'a'.repeat(43),idempotencyKey:'learning-retry-001',chapterId:'foreign'}})).isError,true);
    assert.equal(requests.length,3);assert.deepEqual(requests[2]?.body,{confirmationToken:'idx_confirm_'+'a'.repeat(43),idempotencyKey:'learning-retry-001'});
  }finally{await client.close();await server.close();}
});

test('learning rejects caller identity and application claims; writes never auto retry',()=>{
  const request={chapterId:'processes.calendar',version:2,operation:'understood'};
  for(const field of ['companyId','userId','role','appliedAt'])assert.equal(learningChangeSchema.safeParse({...request,[field]:999}).success,false);
  assert.equal(learningChangeSchema.safeParse({...request,operation:'applied'}).success,false);
  assert.equal(learningCommitSchema.safeParse({...request,confirmationToken:'idx_confirm_'+'a'.repeat(43),idempotencyKey:'retry-001'}).success,false);
  assert.equal(isRetryableRead('/api/v1/ai/tools/learning/progress','POST'),true);
  for(const path of ['/preview','/commit'])assert.equal(isRetryableRead('/api/v1/ai/tools/learning/progress'+path,'POST'),false);
  assert.equal(toolScopes.get_learning_progress,'learning.read');assert.equal(toolScopes.update_learning_progress,'learning.manage');
});
