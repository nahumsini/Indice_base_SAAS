import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),app=new URL('../src/app/',import.meta.url);
const load=(file,dep=()=>{throw Error('Unexpected import');})=>loadTypescript(new URL(file,app).pathname,dep);
const model=load('BasicModules/Sales/Funneling/ideasBoardModel.ts');
const workspace=load('ComplementaryModules/IdeasBoard/workspaceCopy.ts');
const recursive=createTypeScriptLoader({}, {crypto});
const catalog=recursive(new URL('ComplementaryModules/IdeasBoard/systemCatalog.ts',app).pathname);
const catalogCopy=recursive(new URL('ComplementaryModules/IdeasBoard/systemCatalogCopy.ts',app).pathname);
const channels=recursive(new URL('ComplementaryModules/IdeasBoard/systemChannelSymbols.ts',app).pathname);
const system=recursive(new URL('ComplementaryModules/IdeasBoard/systemBoardModel.ts',app).pathname);
const appearance=load('BasicModules/Sales/Funneling/nodeAppearance.ts');
const interaction=load('BasicModules/Sales/Funneling/boardInteractionCopy.ts');
const copy=load('ComplementaryModules/IdeasBoard/systemElementCopy.ts');
const workbench=load('BasicModules/Sales/Funneling/boardWorkbenchCopy.ts');
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function fields(node,upload=async()=>({id:'private-photo'}),options={}) {
 const runtime=hookRuntime(),busy=[],changes=[],api={photoUrl:id=>'/private/'+id,upload};let value=node;
 const {SystemElementFields}=load('ComplementaryModules/IdeasBoard/SystemElementFields.tsx',id=>{
  if(id==='react')return{...runtime.hooks,useId:()=> 'synthetic-id'};
  if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return Object.fromEntries(['Camera','ImagePlus','RotateCcw','Trash2'].map(key=>[key,()=>null]));
  if(id.endsWith('/systemBoardModel')||id==='./systemBoardModel')return system;
  if(id.endsWith('/nodeAppearance'))return appearance;
  if(id.endsWith('/NodeAppearanceControls'))return{NodeAppearanceControls:()=>null};
  if(id.endsWith('/boardInteractionCopy'))return interaction;
  if(id==='./systemChannelSymbols')return channels;
  if(id==='./systemCatalog')return catalog;
  if(id==='./systemCatalogCopy')return catalogCopy;
  if(id==='./SystemCatalogPicker')return {SystemCatalogPicker:'catalog-picker'};
  if(id==='./ProcessStepsFields')return {ProcessStepsFields:'process-steps'};
  if(id.endsWith('/boardWorkbenchCopy'))return workbench;
  if(id==='./workspaceCopy')return workspace;
  if(id==='./systemElementCopy')return copy;
  if(id==='./boardElementFormCopy')return recursive(new URL('ComplementaryModules/IdeasBoard/boardElementFormCopy.ts',app).pathname);
  throw Error(id);
 });
 const render=()=>SystemElementFields({node:value,locale:'es-MX',api,actor:'private:1:2',onChange:n=>{value=n;changes.push(n);},onBusyChange:n=>busy.push(n),...options});
 runtime.render(render);
 return{runtime,busy,changes,value:()=>value,all:()=>elements(runtime.result),rerender:()=>runtime.render(render)};
}
test('diagnostic shortcuts place all four kinds clockwise without restoring a per-area cap',()=>{
 let content=model.emptyBoard();for(const area of system.areaOrder){const n=system.createSystemElement(content,area);assert.equal(n.category,area);assert.equal(n.icon,system.areas[area].icon);assert.ok(n.y>=system.areas[area].y+100);assert.ok(n.x+n.width<=system.areas[area].x+1100);assert.ok(n.y+n.height<=system.areas[area].y+800);content={...content,nodes:[...content.nodes,n]};}
 for(let i=0;i<40;i++){const n=system.createSystemElement(content,'PERSON');assert.ok(n);assert.ok(n.x+n.width<1100&&n.y+n.height<800);content={...content,nodes:[...content.nodes,n]};}
 assert.equal(content.nodes.filter(n=>n.category==='PERSON').length,41);
 assert.equal(system.createSystemElement({...content,nodes:Array.from({length:100},()=>content.nodes[0])},'PERSON'),null);
});
test('editing a diagnostic name preserves appearance, geometry, photo ownership and metadata',()=>{
 const original={...system.createSystemElement(model.emptyBoard(),'PERSON'),text:'Ana',kind:'IMAGE',assetId:'existing',appearance:{...appearance.defaultAppearance(model.textNode(0,0)),fontFamily:'SERIF'}};
 const e=fields(original);e.all().find(n=>n.type==='input'&&n.props.placeholder?.includes('Ana')).props.onChange({target:{value:'Ana · Ventas'}});
 assert.equal(e.value().text,'Ana · Ventas');for(const key of ['id','category','icon','width','height','x','y','assetId','appearance'])assert.deepEqual(e.value()[key],original[key]);
 assert.equal(e.all().find(n=>n.type==='details'&&n.props.className.includes('appearance')).props.open,undefined);
});
test('financial icons suggest simple names while keeping a user-authored name',()=>{
 const n={...system.createSystemElement(model.emptyBoard(),'FINANCE'),text:'Balance general'},e=fields(n);
 e.all().find(v=>v.type==='catalog-picker').props.onChange('CASH_FLOW');assert.equal(e.value().text,'Flujo de efectivo');assert.equal(e.value().icon,'CASH_FLOW');
 const custom=fields({...n,text:'Mi flujo de caja'});custom.all().find(v=>v.type==='catalog-picker').props.onChange('CASH_FLOW');assert.equal(custom.value().text,'Mi flujo de caja');
});
test('a failed private photo upload preserves the node and retries the exact asset request',async()=>{
 const calls=[];let fail=true;const original={...system.createSystemElement(model.emptyBoard(),'PERSON'),text:'Ana'};
 const e=fields(original,async(file,id,actor)=>{calls.push({file,id,actor});if(fail)throw Error('offline');return{id};});
 const file={name:'synthetic.png',size:100,type:'image/png'},input=e.all().find(n=>n.type==='input'&&n.props.type==='file');
 input.props.onChange({target:{files:[file],value:'synthetic.png'}});await e.runtime.flush();assert.equal(e.changes.length,0);assert.deepEqual(e.busy,[true,false]);assert.equal(e.all().some(n=>n.props?.role==='alert'),true);
 fail=false;e.all().find(n=>n.type==='button'&&n.props['aria-label']==='Reintentar').props.onClick();await e.runtime.flush();
 assert.equal(calls.length,2);assert.equal(calls[0].id,calls[1].id);assert.equal(calls[1].actor,'private:1:2');assert.equal(e.value().assetId,calls[1].id);assert.equal(e.value().text,'Ana');assert.equal(e.value().kind,'IMAGE');
});
test('invalid photos do not start uploads or replace an existing photo',async()=>{
 let calls=0;const n={...system.createSystemElement(model.emptyBoard(),'PERSON'),text:'Ana',kind:'IMAGE',assetId:'keep'};const e=fields(n,async()=>{calls++;});
 const input=e.all().find(n=>n.type==='input'&&n.props.type==='file');input.props.onChange({target:{files:[{name:'bad.svg',size:100,type:'image/svg+xml'}],value:''}});await e.runtime.flush();assert.equal(calls,0);assert.equal(e.value().assetId,'keep');assert.ok(e.all().some(n=>n.props?.role==='alert'));
});
test('all eight locales provide complete tools and four explicit add/save labels',()=>{
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=copy.systemElementCopy(locale),w=workbench.boardWorkbenchCopy(locale);for(const area of system.areaOrder){assert.ok(c.add[area]);assert.ok(c.save[area]);assert.ok(c.help[area]);}for(const value of Object.values(w))assert.ok(value);}
});
test('process steps can be completed without disturbing the graph and blank rows block saving',()=>{
 const n={...system.createSystemElement(model.emptyBoard(),'PROCESS'),text:'Preparar pedido'},e=fields(n);
 e.all().find(v=>v.type==='process-steps').props.onChange(['Revisa el pedido','Prepara el paquete','Entrega al cliente']);
 assert.equal(e.value().steps.length,3);assert.equal(e.value().id,n.id);assert.equal(e.value().x,n.x);assert.equal(system.validSystemElement(e.value()),true);
 assert.equal(system.validSystemElement({...e.value(),steps:['']}),false);assert.equal(system.validSystemElement({...e.value(),steps:['a'.repeat(501)]}),false);
});
test('industry changes preserve service base and channel catalogue is independent',()=>{
 const n={...system.createSystemElement(model.emptyBoard(),'PRODUCT'),text:'Limpieza de oficina',offeringType:'SERVICE'},e=fields(n);
 e.all().find(v=>v.type==='catalog-picker').props.onChange('CLEANING');assert.equal(e.value().offeringType,'SERVICE');assert.equal(e.value().text,n.text);assert.equal(e.value().icon,'CLEANING');
 const channel=fields({...system.createSystemElement(model.emptyBoard(),'PRODUCT',true),text:'Mi canal'}),picker=channel.all().find(v=>v.type==='catalog-picker');
 for(const icon of ['CRM','POS','SALES_FUNNEL','GOOGLE_ADS','AI_ADS','ACTIVATIONS'])assert.ok(picker.props.items.some(item=>item.id===icon));
 picker.props.onChange('GOOGLE_ADS');assert.equal(channel.value().icon,'GOOGLE_ADS');assert.equal(channel.value().text,'Mi canal');
});

test('new element details and appearance start collapsed, with names managed only once in batches',()=>{
 const n={...system.createSystemElement(model.emptyBoard(),'PROCESS'),text:'Preparar pedido'},e=fields(n);
 const disclosures=e.all().filter(v=>v.type==='details');assert.equal(disclosures.length,2);assert.equal(disclosures[0].props.open,false);assert.equal(disclosures[1].props.open,undefined);
 const batched=fields(n,undefined,{nameManaged:true});assert.equal(batched.all().filter(v=>v.type==='input'&&v.props.required).length,0);
 const picker=e.all().find(v=>v.type==='catalog-picker'&&v.props.compact);assert.ok(picker);assert.equal(picker.props.value,n.icon);
 // Expanding optional sections never changes the draft or starts an upload.
 disclosures[0].props.onToggle({currentTarget:{open:true}});assert.equal(e.changes.length,0);assert.deepEqual(e.busy,[]);
});
test('incomplete steps are visible on entry and reopening details does not erase the work',async()=>{
 const n={...system.createSystemElement(model.emptyBoard(),'PROCESS'),text:'Pedido',steps:['Revisar','']},e=fields(n);
 let disclosure=e.all().find(v=>v.type==='details');assert.equal(disclosure.props.open,true);
 disclosure.props.onToggle({currentTarget:{open:false}});await e.runtime.flush();assert.equal(e.value().steps[0],'Revisar');
 e.all().find(v=>v.type==='process-steps').props.onChange(['Revisar','Entregar']);e.rerender();await e.runtime.flush();assert.equal(system.validSystemElement(e.value()),true);
 e.all().find(v=>v.type==='process-steps').props.onChange(['Revisar','']);e.rerender();await e.runtime.flush();assert.equal(e.all().find(v=>v.type==='details').props.open,true);assert.equal(system.validSystemElement(e.value()),false);
});
test('all catalog selectors retain their options and a legacy current icon without mutating on render',()=>{
 const runtime=hookRuntime();let changes=[];
 const {SystemCatalogPicker}=load('ComplementaryModules/IdeasBoard/SystemCatalogPicker.tsx',id=>{
  if(id==='react')return{...runtime.hooks,useId:()=> 'type-id'};
  if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return{Search:()=>null};
  if(id==='./systemCatalog')return catalog;
  if(id==='./systemCatalogCopy')return catalogCopy;
  if(id==='./systemBoardModel')return system;
  if(id==='./systemChannelSymbols')return channels;
  throw Error(id);
 });
 for(const items of [catalog.processCatalog,catalog.offeringCatalog,catalog.channelCatalog,catalog.financeCatalog]){
  runtime.render(()=>SystemCatalogPicker({items,value:'LEGACY_ICON',locale:'es-MX',label:'Tipo',compact:true,onChange:value=>changes.push(value)}));
  const all=elements(runtime.result),options=all.filter(v=>v.type==='option');assert.equal(options.length,items.length+1);assert.equal(options[0].props.value,'LEGACY_ICON');assert.ok(all.some(v=>v.type==='optgroup'));
  assert.equal(changes.length,0);all.find(v=>v.type==='select').props.onChange({target:{value:items.at(-1).id}});assert.equal(changes.pop(),items.at(-1).id);
 }
});
test('optional-section labels are localized in every supported regional locale',()=>{
 const formCopy=recursive(new URL('ComplementaryModules/IdeasBoard/boardElementFormCopy.ts',app).pathname);
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=formCopy.boardElementFormCopy(locale);for(const value of Object.values(c))assert.ok(value.trim());assert.ok(c.configuring.includes('{name}'));assert.ok(c.stepsCount.includes('{n}'));}
});

test('three quick-capture rows keep independent names, switch the active element and stop adding while full or uploading',()=>{
 const runtime=hookRuntime(),selected=[],changed=[],removed=[];let additions=0,busy=false;
 const batchCopy=load('BasicModules/Sales/Funneling/boardBatchCopy.ts');
 const {BoardBatchControls}=load('BasicModules/Sales/Funneling/BoardBatchControls.tsx',id=>{
  if(id==='react')return{...runtime.hooks,useId:()=> 'batch-id'};
  if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return{Plus:()=>null,SlidersHorizontal:()=>null,Trash2:()=>null};
  if(id==='./boardBatchCopy')return batchCopy;
  throw Error(id);
 });
 const nodes=['Uno','Dos','Tres'].map(text=>({...system.createSystemElement(model.emptyBoard(),'PERSON'),text}));
 const render=()=>BoardBatchControls({nodes,activeId:nodes[1].id,locale:'es-MX',busy,canAdd:false,valid:system.validSystemElement,onSelect:id=>selected.push(id),onChange:n=>changed.push(n),onAdd:()=>additions++,onRemove:id=>removed.push(id)});
 runtime.render(render);let all=elements(runtime.result);
 assert.equal(all.filter(v=>v.type==='input').length,3);assert.equal(all.find(v=>v.type==='button'&&v.props.onClick&&v.props.disabled).props.disabled,true);
 all.find(v=>v.props?.['aria-label']==='Configurar elemento 1').props.onClick();assert.equal(selected[0],nodes[0].id);
 all.filter(v=>v.type==='input')[2].props.onChange({target:{value:'Equipo nuevo'}});assert.equal(changed[0].id,nodes[2].id);assert.equal(changed[0].text,'Equipo nuevo');assert.equal(nodes[0].text,'Uno');assert.equal(additions,0);
 busy=true;runtime.render(render);all=elements(runtime.result);assert.ok(all.filter(v=>v.type==='button'||v.type==='input').every(v=>v.props.disabled));
});

test('post-it styling stays optional in personal boards while the Sales form keeps its original controls',()=>{
 const {BoardElementFields}=load('BasicModules/Sales/Funneling/BoardElementFields.tsx',id=>{
  if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return{Check:()=>null};
  if(id==='./NodeAppearanceControls')return{NodeAppearanceControls:'appearance-controls'};
  return recursive(new URL('BasicModules/Sales/Funneling/'+id.slice(2),app).pathname);
 });
 const node={...model.textNode(20,30),text:'Una idea'},changes=[];
 for(const customizable of [false,true]){
  const all=elements(BoardElementFields({node,onChange:n=>changes.push(n),locale:'es-MX',customizable}));
  assert.equal(all.find(v=>v.type==='textarea').props.rows,customizable?3:5);
  assert.equal(all.filter(v=>v.type==='details').length,customizable?1:0);
  const palette=all.filter(v=>v.type==='button'&&v.props['data-color']);assert.equal(palette.length,6);
  if(customizable)assert.ok(elements(all.find(v=>v.type==='details')).includes(palette[0]));
  palette.find(v=>v.props['data-color']==='MINT').props.onClick();assert.equal(changes.at(-1).color,'MINT');assert.equal(changes.at(-1).id,node.id);assert.equal(changes.at(-1).text,node.text);
 }
});
