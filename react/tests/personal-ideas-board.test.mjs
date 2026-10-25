import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const app=new URL('../src/app/',import.meta.url);
const load=(path,require=()=>{throw Error('unexpected import');})=>loadTypescript(new URL(path,app).pathname,require);
const nav=load('config/navigation.ts');
const access=load('access/tabScopeCatalog.ts');
test('standalone module has its own canonical route, alias and permission scope',()=>{
 assert.equal(nav.resolvePageId('ideas_board'),'ideas-board');
 assert.equal(nav.getPagePath('ideas-board','canvas'),'/ideas-board/canvas');
 assert.equal(nav.moduleRoutes.ideasBoard,'ideas-board');
 assert.deepEqual(access.MODULE_TAB_SCOPE_CATALOG['ideas-board'],{moduleSlug:'ideas_board',tabs:{canvas:'canvas','five-s':'canvas',projects:'canvas',system:'canvas'}});
 const session={user:{role:'user',tab_permissions_configured:true,tab_permission_keys:['crm.funneling']},company:{id:7}};
 assert.equal(access.canAccessModuleTab('ideas-board','canvas',session),false);
 assert.equal(access.canAccessModuleTab('ideas-board','canvas',{...session,user:{...session.user,tab_permission_keys:['ideas_board.canvas']}}),true);
});
test('personal and Sales API ports keep document, binary upload and photo paths separate',async()=>{
 const calls=[];const api=load('BasicModules/Sales/Funneling/ideasBoardApi.ts',id=>{assert.equal(id,'../../../lib/apiClient');return{apiClient:async(path,options)=>{calls.push({path,options});return{};},buildApiUrl:path=>'local'+path};});
 const personal=api.createIdeasBoardApi('/api/v1/ideas-board');
 const input={content:{nodes:[]},version:0,mutationId:'synthetic'};const file={name:'Foto con espacio.png',type:'image/png'};
 await personal.get();await personal.save(input,'ideas_board:7:9');await personal.upload(file,'photo-id','ideas_board:7:9');
 assert.deepEqual(calls.map(c=>c.path),['/api/v1/ideas-board','/api/v1/ideas-board','/api/v1/ideas-board/assets/photo-id']);
 assert.equal(calls[1].options.headers['X-Idea-Board-Actor'],'ideas_board:7:9');assert.deepEqual(JSON.parse(calls[1].options.body),input);
 assert.equal(calls[2].options.body,file);assert.equal(calls[2].options.headers['X-Idea-Photo-Name'],'Foto%20con%20espacio.png');
 assert.equal(personal.photoUrl('a/b'),'local/api/v1/ideas-board/assets/a%2Fb');
 await api.ideasBoardApi.get();assert.equal(calls.at(-1).path,'/api/v1/sales/funnels/ideas-board');
});
test('native complementary metadata and owner page use the independent port',()=>{
 const metadata=readFileSync(new URL('config/moduleCatalog.ts',app),'utf8');
 assert.match(metadata,/ideas_board:[\s\S]*?route: 'ideas-board'[\s\S]*?category: 'complementary'/);
 const page=readFileSync(new URL('ComplementaryModules/IdeasBoard/PersonalIdeasBoard.tsx',app),'utf8');
 assert.match(page,/currentModule="ideas-board"/);assert.match(page,/api=\{personalIdeasBoardApi\}/);assert.match(page,/key=\{revision\}/);
});
