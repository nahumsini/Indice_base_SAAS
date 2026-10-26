import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),base=new URL('../src/app/',import.meta.url),file=p=>new URL(p,base).pathname;
const load=createTypeScriptLoader({}, {crypto,Date}),model=load(file('ComplementaryModules/IdeasBoard/fiveSModel.ts')),canvas=load(file('BasicModules/Sales/Funneling/ideasBoardModel.ts'));
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function harness({seed=false}={}){
 const runtime=hookRuntime(),writes=[];let content=model.addFiveSTemplate(canvas.emptyBoard(),'Oficina','es-MX');
 if(seed){const node=model.newFiveSAction(content,content.nodes[0].fiveS,'SORT');node.text='Ordenar carpetas';node.fiveS={...node.fiveS,action:'Ordenar carpetas',owner:'Equipo de oficina',dueDate:'2026-11-02',details:'Conservar contratos',beforeAssetId:'private-before'};content.nodes.push(node);}
 const context={active:true,ready:true,capture:()=>({actor:'ideas_board:7:9',content:structuredClone(content)}),replace:(expected,next)=>{writes.push({expected,next});if(JSON.stringify(content)!==JSON.stringify(expected.content))return false;content=structuredClone(next);return true;},notify:()=>{}};
 const {FiveSWorkspace}=loadTypescript(file('ComplementaryModules/IdeasBoard/FiveSWorkspace.tsx'),id=>{
  if(id.endsWith('/IndiceWorkspaceNavigation'))return{IndiceWorkspaceNavigation:'navigation'};if(id==='./fiveSWizardCopy')return load(file('ComplementaryModules/IdeasBoard/fiveSWizardCopy.ts'));
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return {Plus:'plus',Pencil:'pencil',ChevronRight:'chevron'};
  if(id==='../../components/indice-modal')return{IndiceModalFrame:'frame'};if(id==='../../components/ui/button')return{Button:'button'};
  if(id==='./fiveSFiltersModel')return load(file('ComplementaryModules/IdeasBoard/fiveSFiltersModel.ts'));if(id==='./fiveSFiltersCopy')return load(file('ComplementaryModules/IdeasBoard/fiveSFiltersCopy.ts'));if(id==='./FiveSFilters')return{FiveSFilters:'filters'};
  if(id==='./fiveSCopy')return load(file('ComplementaryModules/IdeasBoard/fiveSCopy.ts'));if(id==='./fiveSModel')return model;
  if(id==='./FiveSActionCard')return{FiveSActionCard:'action-card'};if(id==='./FiveSProgressDialog')return{FiveSProgressDialog:'progress-dialog'};if(id==='./FiveSFields')return {FiveSFields:'fields'};if(id==='./FiveSCreateWizard')return{FiveSCreateWizard:'wizard'};
  if(id==='./personalIdeasBoardApi')return{personalIdeasBoardApi:{}};if(id.endsWith('.css'))return{};throw Error(id);
 });
 const render=()=>runtime.render(()=>FiveSWorkspace({context,locale:'es-MX'}));render();
 const frame=()=>elements(runtime.result).find(n=>n.type==='frame');
 const fields=()=>elements(frame()).find(n=>n.type==='fields');
 const click=(label)=>{elements(runtime.result).find(n=>n.type==='button'&&[n.props.children].flat(Infinity).includes(label)).props.onClick();render();};
 return{runtime,writes,render,frame,fields,click,context,cards:()=>elements(runtime.result).filter(n=>n.type==='action-card'),progressDialog:()=>elements(runtime.result).find(n=>n.type==='progress-dialog'),get content(){return content;},save:()=>{elements(frame().props.footer).find(n=>n.type==='button'&&n.props.children==='Guardar acción').props.onClick();render();},change:patch=>{const editor=fields();editor.props.onChange({...editor.props.node,...patch});render();},race:()=>{content={...content,nodes:[...content.nodes,canvas.textNode(0,0)]};}};
}
test('action capture is a standard form and only confirmation adds one pending action with its original context',()=>{
 const h=harness();h.click('Agregar acción');assert.equal(h.frame().props.modalType,'standard-form');assert.ok(h.frame().props.footerSummary.includes('Escribe'));
 assert.equal(h.content.nodes.length,5);const draft=h.fields().props.node;
 h.change({text:'Etiquetar carpetas',fiveS:{...draft.fiveS,action:'Etiquetar carpetas',owner:'Equipo',dueDate:'2026-11-02'}});
 assert.equal(h.content.nodes.length,5);assert.equal(h.frame().props.footerSummary,undefined);h.save();
 assert.equal(h.content.nodes.length,6);assert.equal(h.writes.length,1);assert.equal(h.writes[0].expected.actor,'ideas_board:7:9');
 const action=h.content.nodes.at(-1);assert.equal(action.fiveS.area,'Oficina');assert.equal(action.fiveS.section,'SORT');assert.equal(action.fiveS.status,'PENDING');assert.equal(action.fiveS.owner,'Equipo');assert.equal(action.fiveS.dueDate,'2026-11-02');assert.equal(h.frame(),undefined);h.runtime.unmount();
});
test('cancel never writes and a changed board keeps the edited action open with its data',()=>{
 const h=harness();h.click('Agregar acción');h.frame().props.onOpenChange(false);h.render();assert.equal(h.writes.length,0);assert.equal(h.frame(),undefined);
 h.click('Agregar acción');const draft=h.fields().props.node;h.change({text:'Acción conservada',fiveS:{...draft.fiveS,action:'Acción conservada',owner:'Equipo'}});
 h.race();h.save();assert.ok(h.frame());assert.equal(h.fields().props.node.fiveS.owner,'Equipo');assert.equal(h.content.nodes.length,6);assert.equal(h.content.nodes.filter(n=>n.fiveS?.role==='ACTION').length,0);h.runtime.unmount();
});
test('upload activity blocks closing and save, while verified state explains its required result',()=>{
 const h=harness();h.click('Agregar acción');const draft=h.fields().props.node;h.change({text:'Acción',fiveS:{...draft.fiveS,action:'Acción',status:'VERIFIED'}});
 assert.ok(h.frame().props.footerSummary.includes('resultado'));
 h.fields().props.onBusyChange(true);h.render();assert.equal(h.frame().props.busy,true);h.frame().props.onOpenChange(false);h.render();assert.ok(h.frame());
 assert.ok(elements(h.frame().props.footer).filter(n=>n.type==='button').every(n=>n.props.disabled));assert.equal(h.writes.length,0);h.runtime.unmount();
});
test('starting, verifying and reopening use the captured document and preserve action metadata',()=>{
 const h=harness({seed:true}),original=structuredClone(h.content.nodes.at(-1));
 h.cards()[0].props.onProgress();h.render();assert.equal(h.content.nodes.at(-1).fiveS.status,'IN_PROGRESS');assert.equal(h.writes.length,1);assert.equal(h.writes[0].expected.actor,'ideas_board:7:9');
 h.cards()[0].props.onProgress();h.render();assert.ok(h.progressDialog());assert.equal(h.writes.length,1);
 assert.equal(h.progressDialog().props.onConfirm('Carpetas etiquetadas','2026-11-09'),true);h.render();const verified=h.content.nodes.at(-1);
 assert.equal(verified.fiveS.status,'VERIFIED');assert.equal(verified.fiveS.result,'Carpetas etiquetadas');assert.equal(verified.fiveS.owner,original.fiveS.owner);assert.equal(verified.fiveS.dueDate,original.fiveS.dueDate);assert.equal(verified.fiveS.details,original.fiveS.details);assert.equal(verified.fiveS.beforeAssetId,'private-before');assert.equal(h.progressDialog(),undefined);
 h.cards()[0].props.onProgress();h.render();assert.equal(h.content.nodes.at(-1).fiveS.status,'IN_PROGRESS');assert.equal(h.content.nodes.at(-1).fiveS.result,'Carpetas etiquetadas');assert.equal(h.content.nodes.length,6);h.runtime.unmount();
});
test('cancelled or stale verification does not change progress or discard its expected context',()=>{
 const h=harness({seed:true});h.cards()[0].props.onProgress();h.render();h.cards()[0].props.onProgress();h.render();
 h.progressDialog().props.onClose();h.render();assert.equal(h.content.nodes.at(-1).fiveS.status,'IN_PROGRESS');assert.equal(h.writes.length,1);
 h.cards()[0].props.onProgress();h.render();h.race();assert.equal(h.progressDialog().props.onConfirm('Resultado nuevo',null),false);h.render();assert.ok(h.progressDialog());assert.equal(h.content.nodes.find(n=>n.fiveS?.role==='ACTION').fiveS.status,'IN_PROGRESS');h.runtime.unmount();
});
test('stale quick actions report the failure and an unavailable or inactive board cannot advance',()=>{
 const h=harness({seed:true});h.race();h.cards()[0].props.onProgress();h.render();assert.ok(h.cards()[0].props.error);assert.equal(h.content.nodes.find(n=>n.fiveS?.role==='ACTION').fiveS.status,'PENDING');
 h.context.ready=false;h.render();assert.equal(h.cards()[0].props.disabled,true);h.cards()[0].props.onProgress();assert.equal(h.writes.length,1);
 h.context.ready=true;h.context.active=false;h.render();h.cards()[0].props.onProgress();assert.equal(h.writes.length,1);h.runtime.unmount();
});

const filterModel=load(file('ComplementaryModules/IdeasBoard/fiveSFiltersModel.ts'));
const filtersView=h=>elements(h.runtime.result).find(n=>n.type==='filters');
test('workspace filters change only the view, reveal matching phone category and clear all facets',()=>{
 const h=harness({seed:true});const node=model.newFiveSAction(h.content,h.content.nodes[0].fiveS,'ORDER');node.text='Etiquetar archivos';node.fiveS={...node.fiveS,action:node.text,owner:'Andrea',status:'VERIFIED',result:'Listo'};h.content.nodes.push(node);h.render();
 filtersView(h).props.onChange({...filterModel.defaultFiveSFilters,owner:'name:Andrea',status:'VERIFIED'});h.render();
 assert.equal(h.cards().length,1);assert.equal(h.cards()[0].props.node.id,node.id);assert.equal(filtersView(h).props.progress.total,1);
 assert.equal(elements(h.runtime.result).find(n=>n.type==='section'&&n.props['data-selected']).props['data-section'],'ORDER');assert.equal(h.writes.length,0);
 filtersView(h).props.onChange({...filterModel.defaultFiveSFilters,search:'sin coincidencias'});h.render();assert.equal(h.cards().length,0);assert.ok(elements(h.runtime.result).find(n=>n.props?.className==='five-s-filter-empty'));
 h.click('Limpiar filtros');assert.equal(h.cards().length,2);assert.equal(h.writes.length,0);h.runtime.unmount();
});
test('switching areas resets dependent filters and never includes another area in counts',()=>{
 const h=harness({seed:true}),second=model.addFiveSTemplate(h.content,'Almacén','es');h.content.nodes.splice(0,h.content.nodes.length,...second.nodes);h.render();
 assert.equal(filtersView(h).props.progress.total,0);
 const area=()=>elements(h.runtime.result).find(n=>n.type==='select'&&n.props.children.length===2);
 const first=h.content.nodes[0].fiveS.templateId;area().props.onChange({target:{value:first}});h.render();assert.equal(filtersView(h).props.progress.total,1);
 filtersView(h).props.onChange({...filterModel.defaultFiveSFilters,status:'PENDING',owner:'name:Equipo de oficina'});h.render();
 area().props.onChange({target:{value:second.nodes.at(-1).fiveS.templateId}});h.render();assert.equal(filtersView(h).props.filters.owner,'ALL');assert.equal(filtersView(h).props.filters.status,'ALL');assert.equal(h.writes.length,0);h.runtime.unmount();
});
test('quick progress refreshes a status-filtered view and retains the genuine denominator',()=>{
 const h=harness({seed:true});filtersView(h).props.onChange({...filterModel.defaultFiveSFilters,status:'PENDING'});h.render();
 h.cards()[0].props.onProgress();h.render();assert.equal(h.cards().length,0);assert.equal(filtersView(h).props.progress.total,1);assert.equal(filtersView(h).props.progress.counts.IN_PROGRESS,1);
 assert.equal(filtersView(h).props.progress.percent,0);assert.equal(h.writes.length,1);h.runtime.unmount();
});

const sectionNav=h=>elements(h.runtime.result).find(n=>n.type==='navigation');
test('native mobile sections preserve filters, retain zero-result sections and never write board content',()=>{
 const h=harness({seed:true});filtersView(h).props.onChange({...filterModel.defaultFiveSFilters,search:'carpetas',status:'PENDING'});h.render();assert.equal(sectionNav(h).props.variant,'workbar');assert.equal(sectionNav(h).props.items.length,5);
 sectionNav(h).props.onValueChange('CLEAN');h.render();assert.equal(sectionNav(h).props.value,'CLEAN');assert.equal(filtersView(h).props.filters.search,'carpetas');assert.equal(filtersView(h).props.filters.status,'PENDING');assert.ok(sectionNav(h).props.items.find(n=>n.id==='CLEAN').label.endsWith('0'));
 filtersView(h).props.onChange({...filtersView(h).props.filters,search:'nothing matches'});h.render();assert.ok(sectionNav(h));assert.equal(sectionNav(h).props.items.length,5);assert.equal(h.writes.length,0);h.runtime.unmount();
});
test('removing only the date filter preserves search, owner and status and reveals the matching S',()=>{
 const h=harness({seed:true});filtersView(h).props.onChange({...filterModel.defaultFiveSFilters,search:'carpetas',owner:'name:Equipo de oficina',status:'PENDING',date:'REVIEWS_PENDING'});h.render();assert.equal(h.cards().length,0);h.click('Quitar filtro de fecha');assert.equal(filtersView(h).props.filters.date,'ALL');assert.equal(filtersView(h).props.filters.search,'carpetas');assert.equal(filtersView(h).props.filters.owner,'name:Equipo de oficina');assert.equal(filtersView(h).props.filters.status,'PENDING');assert.equal(h.cards().length,1);assert.equal(h.writes.length,0);h.runtime.unmount();
});
