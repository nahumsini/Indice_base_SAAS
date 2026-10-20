import test from 'node:test';
import assert from 'node:assert/strict';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/BasicModules/Sales/Postventa/workspace/', import.meta.url);
const model = loadTypescript(new URL('continuityModel.ts', root).pathname, () => { throw Error('Unexpected import'); });
const locales = loadTypescript(new URL('continuityLocales.ts', root).pathname, () => { throw Error('Unexpected import'); });
const copy = loadTypescript(new URL('continuityCopy.ts', root).pathname, () => locales);
const base = {kind:'lost',sourceId:1,reference:'OPP-001',title:'Synthetic prospect',clientName:'Synthetic client',contactName:'Test',phone:'',email:'',workId:null,version:0,flowId:0,stageKey:'unscheduled',ownerId:2,ownerName:'Seller',nextAction:'Review',nextActionDate:null,notes:'',lossReason:'Budget timing',recoveryStatus:'unscheduled',recoveredOpportunityId:null};
const workspace = { flows:[{id:0,name:'Default',stages:[{key:'pending',label:'Pending'},{key:'completed',label:'Completed'}]}],owners:[{id:2,name:'Seller'}],today:'2026-10-18',timezone:'America/Toronto',canReactivate:true };
function setup(overrides={}) {
  const runtime=hookRuntime(); let current={...base,...overrides};const saves=[],activations=[];let fail=false;
  const api={ detail:async()=>({item:current,history:[]}),save:async(_kind,_id,command)=>{saves.push(command);if(fail){fail=false;throw new Error('Connection lost');}current={...current,...command,workId:10,version:1};return {item:current,history:[]};},reactivate:async(_id,command)=>{activations.push(command);current={...current,recoveredOpportunityId:99,recoveryStatus:'recovered',version:2};return {item:current,history:[]};} };
  const {ContinuityWorkModal}=loadTypescript(new URL('ContinuityWorkModal.tsx',root).pathname,id=>{
    if(id==='react')return runtime.hooks;
    if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
    if(id.endsWith('salesModalStyles'))return {getSalesModalActionClassNames:()=>({primary:'primary'})};
    if(id==='react-router')return {useNavigate:()=>()=>{}};
    if(id.endsWith('postSaleWorkspaceApi'))return {postSaleWorkspaceApi:api};
    if(id.endsWith('continuityModel'))return model;
    if(id.endsWith('continuityCopy'))return copy;
    return new Proxy({}, {get:(_,key)=>key});
  });
  const t=copy.continuityCopy('es-MX');runtime.render(()=>ContinuityWorkModal({item:{...base,...overrides},workspace,t,onClose(){},onSaved(){}}));
  return {runtime,saves,activations,t,failNext(){fail=true;}};
}
function nodes(value){ if(!value || typeof value!=='object')return []; if(Array.isArray(value))return value.flatMap(nodes);return [value,...Object.values(value.props??{}).flatMap(nodes)]; }
function find(runtime,predicate){const node=nodes(runtime.result).find(predicate);assert.ok(node,'Expected rendered control');return node;}
function button(runtime,text){return find(runtime,n=>n.type==='Button'&&n.props.children===text).props;}

test('date shortcuts use calendar days across DST, month and year boundaries',()=>{
 assert.equal(model.addCalendarDays('2026-10-30',7),'2026-11-06');assert.equal(model.addCalendarDays('2026-12-25',15),'2027-01-09');
});
test('paused and recovered prospects and completed sales are not overdue',()=>{
 for(const item of [{...base,recoveryStatus:'paused'},{...base,recoveryStatus:'recovered'},{...base,kind:'won',stageKey:'completed'}])assert.equal(model.continuityUrgency({...item,nextActionDate:'2026-01-01'},'2026-10-18'),'done');
 assert.equal(model.continuityUrgency({...base,nextActionDate:'2026-10-17'},'2026-10-18'),'overdue');
});
test('lost recovery requires saved follow-up and explicit separate action',async()=>{
 const {runtime,saves,activations,t}=setup();await runtime.flush();assert.equal(button(runtime,t.reactivate).disabled,true);
 button(runtime,t.save).onClick();await runtime.flush();assert.equal(saves.length,1);assert.equal(activations.length,0);assert.equal(button(runtime,t.reactivate).disabled,false);
 button(runtime,t.reactivate).onClick();await runtime.flush();assert.equal(activations.length,1);assert.equal(button(runtime,t.openOpportunity).disabled,undefined);
});
test('rapid save is guarded and uncertain retry uses exactly the same request key and payload',async()=>{
 const {runtime,saves,t,failNext}=setup();await runtime.flush();failNext();const save=button(runtime,t.save);save.onClick();save.onClick();await runtime.flush();assert.equal(saves.length,1);
 assert.equal(find(runtime,n=>n.type==='fieldset').props.disabled,true);assert.equal(button(runtime,t.close).disabled,true);
 button(runtime,t.save).onClick();await runtime.flush();assert.equal(saves.length,2);assert.equal(saves[0],saves[1]);assert.ok(saves[0].requestKey);
 assert.equal(button(runtime,t.close).disabled,false);
});
test('an unsaved edit blocks reactivation and shortcut sets date without creating an opportunity',async()=>{
 const {runtime,saves,activations,t}=setup({workId:10,version:1});await runtime.flush();assert.equal(button(runtime,t.reactivate).disabled,false);
 const input=find(runtime,n=>n.props?.['aria-label']===t.notes);input.props.onChange({target:{value:'New commitment'}});await runtime.flush();assert.equal(button(runtime,t.reactivate).disabled,true);assert.equal(saves.length,0);assert.equal(activations.length,0);
});
test('draft retains operational data while normalizing lost stage, never includes financial fields',()=>{
 const draft=model.workDraft({...base,notes:'Keep history',recoveryStatus:'paused'});assert.equal(draft.stageKey,'pending');assert.equal(draft.paused,true);assert.equal(draft.notes,'Keep history');assert.equal('totalAmount' in draft,false);
});

test('every supported locale supplies the complete post-sales catalog',()=>{const keys=Object.keys(copy.continuityCopy('en-CA')).sort();for(const locale of ['es-MX','es-CO','en-US','fr-CA','pt-BR','ko-CA','zh-CA']) {const translated=copy.continuityCopy(locale);assert.deepEqual(Object.keys(translated).sort(),keys);assert.ok(Object.values(translated).every(value=>typeof value==='string'&&value.length));}});

test('notification opens once, stays closed after permission refresh, and opens again for a new navigation',async()=>{
 const runtime=hookRuntime();let ready=true;let location={search:'?kind=lost&source=2',key:'first'};let reads=0;
 const previousWindow=globalThis.window;
 globalThis.window={location:{href:'http://localhost/sales/after-sales?kind=lost&source=2'},history:{state:{},replaceState(_state,_title,url){globalThis.window.location.href='http://localhost'+url;}}};
 const data={...workspace,items:[],counts:{total:0,overdue:0,today:0,unscheduled:0,completed:0},page:1,pageSize:50};
 const api={workspace:async()=>data,detail:async()=>{reads++;return {item:{...base,sourceId:2},history:[]};}};
 const {default:Postventa}=loadTypescript(new URL('../Postventa.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
  if(id==='react-router')return {useLocation:()=>location};
  if(id.endsWith('/shared/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id.endsWith('useWorkspaceNavigationMemory'))return {useWorkspaceNavigationMemory:()=>ready};
  if(id.endsWith('postSaleWorkspaceApi'))return {postSaleWorkspaceApi:api};
  if(id.endsWith('continuityCopy'))return copy;
  if(id.endsWith('continuityModel'))return model;
  return new Proxy({}, {get:(_,key)=>key});
 });
 try {
  runtime.render(()=>Postventa());await runtime.flush();assert.equal(reads,1);
  find(runtime,n=>n.type==='ContinuityWorkModal').props.onClose();await runtime.flush();assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityWorkModal'),false);assert.equal(new URL(window.location.href).searchParams.has('source'),false);
  ready=false;runtime.render();await runtime.flush();ready=true;runtime.render();await runtime.flush();assert.equal(reads,1);assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityWorkModal'),false);
  location={...location,key:'second'};runtime.render();await runtime.flush();assert.equal(reads,2);assert.ok(find(runtime,n=>n.type==='ContinuityWorkModal'));
 } finally {runtime.unmount();globalThis.window=previousWindow;}
});

function setupWorkspace(restored = {}, total = 83) {
 const runtime=hookRuntime(); const reads=[]; let memory; let fail=false;
 const item={...base,kind:'won',sourceId:8,reference:'SAL-008',stageKey:'pending'};
 const {default:Postventa}=loadTypescript(new URL('../Postventa.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
  if(id==='react-router')return {useLocation:()=>({search:'',key:'table-test'})};
  if(id.endsWith('/shared/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id.endsWith('useWorkspaceNavigationMemory'))return {useWorkspaceNavigationMemory:(options)=>{memory=options;return true;}};
  if(id.endsWith('postSaleWorkspaceApi'))return {postSaleWorkspaceApi:{workspace:async(params)=>{reads.push(params);if(fail){fail=false;throw new Error('Synthetic read failure');}return {...workspace,items:[params.kind === 'lost' ? base : item],counts:{total,overdue:0,today:0,unscheduled:total,completed:0},page:params.page,pageSize:params.pageSize};}}};
  if(id.endsWith('continuityCopy'))return copy;
  if(id.endsWith('continuityModel'))return model;
  return new Proxy({}, {get:(_,key)=>key});
 });
 runtime.render(()=>Postventa()); memory.onRestore({...memory.defaults,...restored});
 return {runtime,reads,item,memory:()=>memory,failNext(){fail=true;}};
}
function viewButton(runtime,label) {return find(runtime,n=>n.type==='Button'&&Array.isArray(n.props.children)&&n.props.children.includes(label)).props;}
test('won view restores and switching layouts retains filters, page and server result without refetch',async()=>{
 const {runtime,reads,memory}=setupWorkspace({wonView:'table',page:2,search:'clinic',owner:'2'}); await runtime.flush();
 assert.ok(find(runtime,n=>n.type==='ContinuityTable'));const count=reads.length;
 viewButton(runtime,'Tablero').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityBoard'));
 viewButton(runtime,'Tabla').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityTable'));
 assert.equal(reads.length,count);assert.equal(memory().state.page,2);assert.equal(memory().state.search,'clinic');assert.equal(memory().state.owner,'2');assert.equal(memory().state.wonView,'table');
 viewButton(runtime,'Ganadas').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityTable'));assert.equal(memory().state.page,1);
 viewButton(runtime,'Ganadas').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityTable'));
 viewButton(runtime,'Perdidas').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityBoard'));assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityTable'),false);
 viewButton(runtime,'Ganadas').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityTable'));runtime.unmount();
});
test('table pagination requests the complete server page and resets after changing size',async()=>{
 const {runtime,reads,memory}=setupWorkspace({wonView:'table',page:2});await runtime.flush();
 const pagination=find(runtime,n=>n.type==='DataTablePagination').props;
 assert.equal(pagination.totalCount,83);assert.equal(pagination.pageStart,51);assert.equal(pagination.pageEnd,83);
 assert.deepEqual(pagination.pageSizeOptions,[10,25,50,100]);pagination.onPageSizeChange(10);await runtime.flush();
 assert.equal(reads.at(-1).page,1);assert.equal(reads.at(-1).pageSize,10);assert.equal(memory().state.pageSize,10);
 find(runtime,n=>n.type==='DataTablePagination').props.onPageChange(3);await runtime.flush();assert.equal(reads.at(-1).page,3);runtime.unmount();
});
test('restored invalid size and removed last page normalize to a valid server page',async()=>{
 const {runtime,reads,memory}=setupWorkspace({wonView:'invalid',page:9,pageSize:200},12);await runtime.flush();
 assert.equal(memory().state.wonView,'board');assert.equal(memory().state.pageSize,50);assert.equal(reads.at(-1).page,1);runtime.unmount();
});
function setupTable() {
 const runtime=hookRuntime();const opened=[];const widthKeys=[];
 const {ContinuityTable}=loadTypescript(new URL('ContinuityTable.tsx',root).pathname,id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
  if(id.endsWith('postSaleWorkspaceApi'))return {continuitySortColumns:['client','sale','stage','owner','lossReason','nextAction']};
  if(id.endsWith('usePersistentColumnWidths'))return {usePersistentColumnWidths:({defaults,storageKey})=>{widthKeys.push(storageKey);return {columnWidths:defaults,resizeColumn(){}};}};
  if(id.endsWith('IndiceTableEngine'))return {...Object.fromEntries(['IndiceTableShell','IndiceOperationalTable','IndiceTableColGroup','IndiceTableHeaderRow','IndiceTableActionGroup'].map(key=>[key,key])),getIndiceTableMinimumWidth:()=>1280};
  if(id.endsWith('salesCommunicationUtils'))return {getPhoneHref:phone=>'tel:'+phone};
  if(id.endsWith('continuityCopy'))return copy;if(id.endsWith('continuityModel'))return model;
  return new Proxy({}, {get:(_,key)=>key});
 });
 return {runtime,opened,widthKeys,ContinuityTable};
}
test('won table opens the existing follow-up with the original record and preserves completed urgency',()=>{
 const {runtime,opened,ContinuityTable}=setupTable();
 const item={...base,kind:'won',stageKey:'completed',nextActionDate:'2026-01-01',phone:'+12025550100',email:'synthetic@example.com'};const t=copy.continuityCopy('es-MX');
 const props={kind:'won',items:[item],flow:workspace.flows[0],today:'2026-10-18',locale:'es-MX',t,busy:false,pagination:'pagination',onOpen:value=>opened.push(value)};
 runtime.render(()=>ContinuityTable(props));find(runtime,n=>n.props?.['aria-label']===`${t.nextAction} · ${item.reference}`).props.onClick();assert.equal(opened[0],item);
 assert.ok(nodes(runtime.result).some(n=>n.type==='span'&&n.props.children===t.completed));assert.equal(nodes(runtime.result).some(n=>n.type==='span'&&n.props.children===t.overdue),false);
 const actions=nodes(runtime.result).filter(n=>n.type==='OpportunityActionButton');assert.equal(actions.length,3);assert.equal(actions[1].props.href,'tel:+12025550100');assert.equal(actions[2].props.href,'mailto:synthetic@example.com');actions[0].props.onClick();assert.equal(opened[1],item);
 runtime.render(()=>ContinuityTable({...props,busy:true}));assert.equal(find(runtime,n=>n.props?.['aria-label']===`${t.nextAction} · ${item.reference}`).props.disabled,true);
 runtime.render(()=>ContinuityTable({...props,items:[]}));assert.ok(find(runtime,n=>n.type==='TableCell'&&n.props.children===t.empty));runtime.unmount();
});

test('lost table restores independently and preserves recovery filters without fetching on a layout switch',async()=>{
 const {runtime,reads,memory}=setupWorkspace({kind:'lost',lostView:'table',wonView:'board',page:2,stage:'scheduled',search:'clinic',owner:'2'});await runtime.flush();
 assert.equal(find(runtime,n=>n.type==='ContinuityTable').props.kind,'lost');const count=reads.length;
 assert.equal(reads.at(-1).stage,'scheduled');assert.equal(reads.at(-1).flow,undefined);
 viewButton(runtime,'Tarjetas').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityBoard'));
 viewButton(runtime,'Tabla').onClick();await runtime.flush();assert.equal(reads.length,count);
 assert.equal(memory().state.page,2);assert.equal(memory().state.stage,'scheduled');assert.equal(memory().state.owner,'2');assert.equal(memory().state.search,'clinic');
 viewButton(runtime,'Ganadas').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityBoard'));assert.equal(memory().state.wonView,'board');
 viewButton(runtime,'Perdidas').onClick();await runtime.flush();assert.equal(find(runtime,n=>n.type==='ContinuityTable').props.kind,'lost');
 const pagination=find(runtime,n=>n.type==='DataTablePagination').props;pagination.onPageSizeChange(10);await runtime.flush();
 assert.equal(reads.at(-1).kind,'lost');assert.equal(reads.at(-1).page,1);assert.equal(reads.at(-1).pageSize,10);
 find(runtime,n=>n.type==='DataTablePagination').props.onPageChange(3);await runtime.flush();assert.equal(reads.at(-1).page,3);
 runtime.unmount();
});
test('lost invalid view falls back to cards without changing the won preference',async()=>{
 const {runtime,memory}=setupWorkspace({kind:'lost',lostView:'invalid',wonView:'table'});await runtime.flush();
 assert.equal(memory().state.lostView,'board');assert.equal(memory().state.wonView,'table');assert.ok(find(runtime,n=>n.type==='ContinuityBoard'));runtime.unmount();
});
test('lost table uses recovery labels, loss reason and review date, and opens the original lost item',()=>{
 const {runtime,opened,widthKeys,ContinuityTable}=setupTable();const t=copy.continuityCopy('es-MX');
 const props={kind:'lost',items:[],today:'2026-10-18',locale:'es-MX',t,busy:false,pagination:'pagination',onOpen:value=>opened.push(value)};
 for(const [recoveryStatus,label] of [['unscheduled',t.unscheduled],['scheduled',t.scheduled],['paused',t.paused],['recovered',t.reactivated]]) {
  const item={...base,recoveryStatus,nextActionDate:recoveryStatus==='unscheduled'?null:'2026-10-17'};
  runtime.render(()=>ContinuityTable({...props,items:[item]}));
  const headers=find(runtime,n=>n.type==='IndiceTableHeaderRow').props.columns;
  assert.deepEqual(headers.map(c=>c.label),[t.client,t.opportunity,t.recoveryState,t.owner,t.lossReason,t.nextAction]);
  assert.ok(nodes(runtime.result).some(n=>n.type==='TableCell'&&n.props.children===item.lossReason));
  const status=find(runtime,n=>n.type==='span'&&n.props.className?.startsWith('inline-flex items-center gap-2'));
  assert.ok(status.props.children.includes(label));
  assert.equal(nodes(runtime.result).some(n=>n.type==='span'&&n.props.children===t.completed),false);
  if(['paused','recovered'].includes(recoveryStatus))assert.equal(nodes(runtime.result).some(n=>n.type==='span'&&n.props.children===t.overdue),false);
  find(runtime,n=>n.props?.['aria-label']===`${t.nextAction} · ${item.reference}`).props.onClick();assert.equal(opened.at(-1),item);
  const actions=nodes(runtime.result).filter(n=>n.type==='OpportunityActionButton');assert.equal(actions.length,1);actions[0].props.onClick();assert.equal(opened.at(-1).kind,'lost');
 }
 assert.ok(widthKeys.every(key=>key==='indice:sales:post-sales:lost:columns:v1'));
 runtime.render(()=>ContinuityTable(props));assert.ok(find(runtime,n=>n.type==='TableCell'&&n.props.children===t.empty));runtime.unmount();
});

test('each table restores its own sorting and header clicks sort the full result from page one',async()=>{
 const {runtime,reads,memory}=setupWorkspace({wonView:'table',wonSortColumn:'owner',wonSortDirection:'desc',lostView:'table',lostSortColumn:'stage',lostSortDirection:'asc',page:2,search:'clinic',owner:'2'});await runtime.flush();
 assert.equal(reads.at(-1).sort,'owner');assert.equal(reads.at(-1).direction,'desc');
 find(runtime,n=>n.type==='ContinuityTable').props.onSort('client');await runtime.flush();
 assert.equal(reads.at(-1).sort,'client');assert.equal(reads.at(-1).direction,'asc');assert.equal(reads.at(-1).page,1);assert.equal(reads.at(-1).search,'clinic');assert.equal(reads.at(-1).owner,2);
 find(runtime,n=>n.type==='ContinuityTable').props.onSort('client');await runtime.flush();assert.equal(reads.at(-1).direction,'desc');
 find(runtime,n=>n.type==='DataTablePagination').props.onPageChange(2);await runtime.flush();assert.equal(reads.at(-1).sort,'client');assert.equal(reads.at(-1).direction,'desc');
 viewButton(runtime,'Perdidas').onClick();await runtime.flush();assert.equal(reads.at(-1).sort,'stage');assert.equal(reads.at(-1).direction,'asc');
 find(runtime,n=>n.type==='ContinuityTable').props.onSort('stage');await runtime.flush();assert.equal(reads.at(-1).direction,'desc');
 viewButton(runtime,'Ganadas').onClick();await runtime.flush();assert.equal(reads.at(-1).sort,'client');assert.equal(reads.at(-1).direction,'desc');
 assert.equal(memory().state.wonSortColumn,'client');assert.equal(memory().state.lostSortColumn,'stage');assert.equal(memory().state.lostSortDirection,'desc');runtime.unmount();
});
test('invalid saved sort normalizes by domain and failed reads do not present stale rows under a new sort',async()=>{
 const {runtime,reads,memory,failNext}=setupWorkspace({wonView:'table',wonSortColumn:'lossReason',wonSortDirection:'sideways',lostSortColumn:'DROP TABLE',lostSortDirection:'invalid'});await runtime.flush();
 assert.equal(memory().state.wonSortColumn,'nextAction');assert.equal(memory().state.wonSortDirection,'asc');assert.equal(memory().state.lostSortColumn,'nextAction');assert.equal(memory().state.lostSortDirection,'asc');
 failNext();find(runtime,n=>n.type==='ContinuityTable').props.onSort('sale');await runtime.flush();assert.equal(reads.at(-1).sort,'sale');
 assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityTable'),false);assert.ok(find(runtime,n=>n.props?.role==='alert'));
 button(runtime,'Actualizar').onClick();await runtime.flush();assert.ok(find(runtime,n=>n.type==='ContinuityTable'));assert.equal(nodes(runtime.result).some(n=>n.props?.role==='alert'),false);runtime.unmount();
});
test('shared table headers expose active order in the module tone and guard sorting while a move is uncertain',()=>{
 const {runtime,ContinuityTable}=setupTable();const changes=[];const t=copy.continuityCopy('es-MX');const sortState={columnId:'nextAction',direction:'desc'};
 const props={kind:'lost',items:[base],today:'2026-10-18',locale:'es-MX',t,busy:false,pagination:null,onOpen(){},sortState,onSort:value=>changes.push(value)};
 runtime.render(()=>ContinuityTable(props));const header=find(runtime,n=>n.type==='IndiceTableHeaderRow').props;
 assert.equal(header.sortState,sortState);assert.equal(header.tone,'coral');assert.ok(header.columns.every(column=>column.sortable));header.onSort('owner');assert.deepEqual(changes,['owner']);
 runtime.render(()=>ContinuityTable({...props,busy:true}));find(runtime,n=>n.type==='IndiceTableHeaderRow').props.onSort('client');assert.deepEqual(changes,['owner']);runtime.unmount();
});

test('a workspace refresh failure preserves an already open follow-up modal',async()=>{
 const {runtime,item,failNext}=setupWorkspace({wonView:'table'});await runtime.flush();
 find(runtime,n=>n.type==='ContinuityTable').props.onOpen(item);await runtime.flush();
 failNext();find(runtime,n=>n.type==='ContinuityWorkModal').props.onSaved();await runtime.flush();
 assert.equal(find(runtime,n=>n.type==='ContinuityWorkModal').props.item,item);
 assert.equal(nodes(runtime.result).some(n=>n.type==='ContinuityTable'),false);runtime.unmount();
});
