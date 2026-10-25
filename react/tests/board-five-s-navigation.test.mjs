import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),app=new URL('../src/app/',import.meta.url);
const load=(path,imports=()=>{throw Error('unexpected import');})=>loadTypescript(new URL(path,app).pathname,imports);
const {projectBoardTab}=load('ComplementaryModules/IdeasBoard/fiveSNavigation.ts');
const {fiveSCopy}=load('ComplementaryModules/IdeasBoard/fiveSCopy.ts');
const scope=load('access/tabScopeCatalog.ts');
const fileContext={active:true,ready:true,capture:()=>({actor:'ideas_board:7:9',content:{nodes:[],connections:[],viewport:{x:0,y:0,zoom:1}}})};
function descendants(root){return [root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(descendants)];}
function ownerHarness(initial){
 const runtime=hookRuntime();let activeTab=initial;
 const component=load('ComplementaryModules/IdeasBoard/PersonalIdeasBoard.tsx',id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return {FolderOpen:'folder',Lightbulb:'lamp',Network:'network',X:'close'};
  if(id.endsWith('.css'))return {};
  if(id==='../../components/frontend-os')return {IndiceModuleShell:'shell'};
  if(id==='../../context/LanguageContext')return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id==='../../hooks/useAuthorizationRevision')return {useAuthorizationRevision:()=>3};
  if(id==='../../hooks/useRoutedModuleTab')return {useRoutedModuleTab:(_default,tabs)=>{assert.ok(tabs.includes(activeTab));return {activeTab,setActiveTab:tab=>{activeTab=tab;}};}};
  if(id.endsWith('/IdeasBoard'))return {IdeasBoard:'editor'};
  if(id.endsWith('/ideasBoardCopy'))return {ideasBoardCopy:()=>({title:'Pizarra',subtitle:'Ideas',close:'Cerrar'})};
  if(id==='./personalIdeasBoardApi')return {personalIdeasBoardApi:{resource:'/api/v1/ideas-board'}};
  if(id==='./SystemBoard')return {SystemBoard:'system'};
  if(id==='./freeformBoardLayout')return {freeformBoardLayout:()=>({title:'Mi pizarra'})};
  if(id==='./systemBoardLayout')return {personalBoardSymbols:()=>[]};
  if(id==='./IdeaProjects')return {IdeaProjects:'projects',SaveProjectDialog:'save-dialog'};
  if(id==='./systemBoardModel')return {toSystemDocument:x=>x};
  if(id==='./workspaceCopy')return {workspaceCopy:()=>({myBoard:'Mi pizarra',system:'Diagnóstico',projects:'Mis proyectos'})};
  if(id==='./FiveSWorkspace')return {FiveSWorkspace:'five-s-workspace'};
  if(id==='./fiveSCopy')return {fiveSCopy};
  if(id==='./personalBoardViews')return {personalCanvasView:{key:'canvas'},personalFiveSView:{key:'five-s'}};
  if(id==='./fiveSNavigation')return {projectBoardTab};
  if(id==='./BoardFileControls')return {BoardFileControls:'files'};
  if(id==='./boardFileCopy')return {boardFileCopy:()=>({fullscreen:'Ampliar',exitFullscreen:'Cerrar'})};
  throw Error(id);
 }).default;
 const element=component({});const render=()=>runtime.render(()=>element.type(element.props));render();
 return {runtime,render,go:tab=>{activeTab=tab;render();},editor:()=>descendants(runtime.result).find(n=>n.type==='editor')};
}
test('5S is a routable native tab with the same fail-closed permission as the private board',()=>{
 assert.equal(scope.tabPermissionKey('ideas-board','five-s'),'ideas_board.canvas');
 assert.equal(scope.canAccessModuleTab('ideas-board','five-s',null),false);
 const session={user:{role:'user',tab_permissions_configured:true,tab_permission_keys:['ideas_board.canvas']}};
 assert.equal(scope.canAccessModuleTab('ideas-board','five-s',session),true);
 session.user.tab_permission_keys=['crm.funneling'];assert.equal(scope.canAccessModuleTab('ideas-board','five-s',session),false);
});
test('direct entry and tab changes reuse one draft owner while only the dedicated tab renders 5S',()=>{
 const h=ownerHarness('five-s');const first=h.editor();assert.ok(first);assert.equal(first.props.active,true);
 assert.deepEqual(h.runtime.result.props.tabs.map(t=>t.id),['canvas','five-s','system','projects']);
 assert.equal(first.props.fileTools.documentView.key,'five-s');assert.equal(first.props.fileTools.title,'Tablero 5S');assert.equal(first.props.fileTools.renderWorkspace(fileContext).type,'five-s-workspace');
 h.go('canvas');const canvas=h.editor();assert.equal(canvas.type,first.type);assert.equal(canvas.key,first.key);assert.equal(canvas.props.api,first.props.api);assert.equal(canvas.props.fileTools.renderWorkspace,undefined);assert.equal(canvas.props.fileTools.title,'Mi pizarra');assert.equal(canvas.props.fileTools.documentView.key,'canvas');
 assert.equal(descendants(h.runtime.result).filter(n=>n.type==='editor').length,1);
 h.go('projects');assert.equal(h.editor().props.active,false);h.go('five-s');assert.equal(h.editor().props.fileTools.renderWorkspace(fileContext).type,'five-s-workspace');h.runtime.unmount();
});
test('using a saved 5S project navigates to its methodology tab without rewriting its snapshot',()=>{
 const project={summary:{kind:'FREEFORM'},freeform:{nodes:[{fiveS:{role:'SECTION'}}]}};
 const old=JSON.stringify(project);assert.equal(projectBoardTab(project),'five-s');assert.equal(JSON.stringify(project),old);
 assert.equal(projectBoardTab({summary:{kind:'FREEFORM'},freeform:{nodes:[]}}),'canvas');
 assert.equal(projectBoardTab({summary:{kind:'SYSTEM'},freeform:null}),'system');
 const h=ownerHarness('projects');descendants(h.runtime.result).find(n=>n.type==='projects').props.onUseProject(project);h.render();h.render();assert.equal(h.runtime.result.props.activeTab,'five-s');assert.equal(h.editor().props.fileTools.render(fileContext).props.openRequest.project,project);h.runtime.unmount();
});
test('all supported locales label the tab and explain creation without referring to My board',()=>{
 for(const locale of ['es-MX','en-CA','fr-CA','pt-BR','ko','zh']){const c=fiveSCopy(locale);assert.ok(c.tab.includes('5S'));assert.ok(c.emptyTitle);assert.ok(c.emptyHint);assert.doesNotMatch(c.preserve,/Mi pizarra|My Board|Mon tableau|Meu quadro/);}
});
