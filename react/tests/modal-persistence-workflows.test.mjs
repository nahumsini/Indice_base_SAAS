import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = resolve(import.meta.dirname, '../src/app/BasicModules/Sales');
const stub = new Proxy({}, { get: (_, key) => key });
const copy = new Proxy(function () { return 'Fixture'; }, { get: (_, key) => key === Symbol.toPrimitive ? () => 'Fixture' : copy });
function elements(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
  const found = node.type === type ? [node] : [];
  return [...found, ...elements(node.props?.children, type)];
}
const { importContactDrafts } = loadTypescript(resolve(root, 'Contactos/utils/importContacts.ts'), () => stub);

test('contact import counts only confirmed writes, keeps failures, and skips successful duplicates on retry', async () => {
  const drafts = ['ok','bad','duplicate'].map((name,index) => ({ contactPerson: name, company: name, email: index === 2 ? 'ok@example.invalid' : `${name}@example.invalid`, phone: '', role: '', notes: '' }));
  const saved = [], progress = [];
  const result = await importContactDrafts(drafts, [], async draft => { if (draft.contactPerson === 'bad') throw new Error('offline'); saved.push(draft); }, value => value.trim().toLowerCase(), value => value, (done,total) => progress.push([done,total]));
  assert.equal(result.imported, 1); assert.equal(result.skipped, 1); assert.deepEqual(result.failed, [drafts[1]]);
  assert.deepEqual(progress, [[1,3],[2,3],[3,3]]);
  const retry = await importContactDrafts(result.failed, saved, async draft => saved.push(draft), value => value, value => value);
  assert.equal(retry.imported, 1); assert.equal(saved.length, 2);
});

test('warehouse creation requires full scope, waits for save, blocks double attempts and retains draft on failure', async () => {
  const runtime = hookRuntime(); let reject, calls = 0;
  const { WarehouseManagementWorkspace } = loadTypescript(resolve(root,'Inventory/components/warehouses/WarehouseManagementWorkspace.tsx'), id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('useLocalStorageState')) return { useLocalStorageState: (_,initial) => [initial,()=>{}] };
    if (id.endsWith('inventoryCalculations')) return { getWarehouseMetrics: () => ({}), getWarehouseInventorySummary: () => ({ totalUnits: 0 }) };
    return stub;
  });
  const props = { warehouses: [], rows: [], businessUnits: [{id:'1',name:'Fixture'}], businesses:[{id:'2',businessUnitId:'1',name:'Fixture'}], responsibleOptions:[], t:copy,
    onSubmit: async () => { calls++; await new Promise((_,fail) => {reject=fail;}); }, onUpdate:async()=>{},onDeleteWarehouse:async()=>{},onTransferAndDeleteWarehouse:async()=>{},onViewInventory(){} };
  const render = () => runtime.render(() => WarehouseManagementWorkspace(props));
  let ui = render(); elements(ui,'SalesTitleBar')[0].props.actions.props.children[1].props.onClick();
  ui=render(); let form=elements(ui,'WarehouseFormView')[0];
  form.props.onChange({...form.props.draft,name:'Fixture'});
  ui=render(); let frame=elements(ui,'SalesModalFrame')[0]; frame.props.footer.props.onClick();
  ui=render(); frame=elements(ui,'SalesModalFrame')[0];
  assert.equal(frame.props.footer.props.disabled,true,'missing unit/business must block continuation');
  form=elements(ui,'WarehouseFormView')[0]; form.props.onChange({...form.props.draft,businessUnitId:'1',businessId:'2'});
  ui=render(); elements(ui,'SalesModalFrame')[0].props.footer.props.onClick();
  ui=render(); const submit=elements(ui,'SalesModalFrame')[0].props.footer.props.onClick;
  submit(); submit(); assert.equal(calls,1);
  ui=render(); assert.equal(elements(ui,'SalesModalFrame')[0].props.busy,true);
  elements(ui,'SalesModalFrame')[0].props.onOpenChange(false);
  assert.equal(elements(render(),'SalesModalFrame')[0].props.open,true);
  reject(new Error('No se pudo guardar.')); await runtime.flush();
  ui=render(); assert.equal(elements(ui,'WarehouseFormView')[0].props.draft.name,'Fixture');
  assert.ok(elements(ui,'IndiceModalValidation').some(item=>item.props.messages?.includes('No se pudo guardar.')));
  props.onSubmit = async () => {calls++;}; ui=render(); elements(ui,'SalesModalFrame')[0].props.footer.props.onClick(); await runtime.flush();
  assert.equal(calls,2); assert.equal(elements(render(),'SalesModalFrame')[0].props.open,false);
});

test('file retry reuses its approved upload and does not upload or reserve twice after registration failure', async () => {
  const calls=[]; let failed=true; const previous=globalThis.fetch;
  globalThis.fetch = async (...args) => {calls.push(['PUT',...args]); return {ok:true};};
  try {
    const {inventoryMovementFiles,validMovementFile}=loadTypescript(resolve(root,'Inventory/services/inventoryMovementFiles.ts'),id=>{
      if(id.endsWith('apiClient'))return {apiClient:async(path,options)=>{calls.push([path,options]); if(path.endsWith('presign-upload')) return {objectKey:'fixture-key',uploadUrl:'https://example.invalid/upload'}; if(failed){failed=false;throw new Error('offline');}return {id:'1',registered:true};}};
      if(id.endsWith('salesStorageUrls'))return {resolveSalesStorageUrl:value=>value};
      return stub;
    });
    const file={name:'invoice.pdf',size:8,type:'application/pdf'};
    assert.equal(validMovementFile(file),true); assert.equal(validMovementFile({...file,name:'x.svg',type:'image/svg+xml'}),false);
    assert.equal(validMovementFile({...file,size:0}),false);
    const state={}; await assert.rejects(inventoryMovementFiles.upload('99',file,state));
    await inventoryMovementFiles.upload('99',file,state);
    assert.equal(calls.filter(call=>call[0]==='PUT').length,1);
    assert.equal(calls.filter(call=>call[0].endsWith?.('presign-upload')).length,1);
    assert.equal(calls.filter(call=>call[0].endsWith?.('/attachments')).length,2);
  } finally {globalThis.fetch=previous;}
});

test('receipt file failure retains pending evidence and retry never creates another inventory movement', async () => {
  const runtime=hookRuntime(); let creates=0,uploads=0,closes=0,fail=true;
  const {AddInventoryModal}=loadTypescript(resolve(root,'Inventory/components/movements/AddInventoryModal.tsx'),id=>{
    if(id==='react')return runtime.hooks; if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('/shared/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
    if(id.endsWith('formFeedbackCopy'))return {getFormFeedbackCopy:()=>({saving:'Guardando'})};
    if(id.endsWith('movementFileCopy'))return {getMovementFileCopy:()=>({pending:'Movimiento guardado, reintenta archivos.',help:'PDF'})};
    if(id.endsWith('inventoryMovementFiles'))return {validMovementFile:()=>true,movementFileError:(_,fallback)=>fallback,movementFileAccept:'.pdf',inventoryMovementFiles:{upload:async()=>{uploads++;if(fail)throw new Error('offline');return{id:'1'};}}};
    if(id.endsWith('salesModalStyles'))return {getSalesModalActionClassNames:()=>({})};
    if(id.endsWith('InventoryModalPrimitives'))return {...stub,sortInventoryOptions:options=>options};
    if(id.endsWith('MovementProductLines'))return {MovementProductLines:'MovementProductLines',createMovementProductLine:(productId)=>({id:'line',productId,quantity:1})};
    return stub;
  });
  const props={open:true,rows:[{productId:'p1',name:'Fixture'}],warehouses:[{id:'w1',name:'Fixture',status:'active',businessUnitId:'1',businessId:'2'}],suppliers:[{id:'s1',name:'Fixture'}],t:copy,initialProductId:'p1',initialWarehouseId:'w1',onOpenChange:()=>closes++,onSubmit:async()=>{creates++;return{movementId:'99'};}};
  const render=()=>runtime.render(()=>AddInventoryModal(props)); render(); await runtime.flush();
  render().props.footer.props.onClick(); render().props.footer.props.onClick();
  let ui=render(); const picker=elements(ui,'input').find(item=>item.props.type==='file'); assert.ok(picker);
  picker.props.onChange({target:{files:[{name:'invoice.pdf',size:8,type:'application/pdf'}]}});
  ui=render(); const save=ui.props.footer.props.onClick; save();save(); await runtime.flush();
  assert.equal(creates,1);assert.equal(uploads,1);assert.equal(closes,0);
  ui=render();assert.ok(elements(ui,'IndiceModalValidation').some(item=>item.props.messages?.[0]?.includes('reintenta')));
  // A refreshed rows/options array must not erase the pending draft.
  props.rows=[...props.rows];props.warehouses=[...props.warehouses]; render();await runtime.flush();
  assert.ok(elements(render(),'input').some(item=>item.props.type==='file'&&item.props.disabled));
  fail=false;render().props.footer.props.onClick();await runtime.flush();
  assert.equal(creates,1);assert.equal(uploads,2);assert.equal(closes,1);
});

test('import modal blocks repeat submit and close, then keeps only failed contacts for retry', async () => {
  const runtime=hookRuntime();let calls=0,closes=0,resolveImport;
  const drafts=[{contactPerson:'Saved fixture',company:'Fixture',email:'saved@example.invalid',phone:'',role:'',notes:''},{contactPerson:'Failed fixture',company:'Fixture',email:'failed@example.invalid',phone:'',role:'',notes:''}];
  const {ImportContactsModal}=loadTypescript(resolve(root,'Contactos/components/ImportContactsModal.tsx'),id=>{
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('/shared/context'))return {useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
    if(id.endsWith('formFeedbackCopy'))return {getFormFeedbackCopy:()=>({saving:'Guardando',saveFailed:'No se pudo guardar'})};
    if(id.endsWith('salesModalStyles'))return {getSalesModalActionClassNames:()=>({})};
    if(id.endsWith('/utils'))return {cn:(...args)=>args.join(' ')};
    if(id.endsWith('contactImportUtils'))return {parseContactFile:()=>drafts};
    return stub;
  });
  const props={copy,isOpen:true,onOpenChange:()=>closes++,onImportContacts:async()=>{calls++;return new Promise(resolve=>{resolveImport=resolve;});}};
  const render=()=>runtime.render(()=>ImportContactsModal(props));
  let ui=render();await elements(ui,'input')[0].props.onChange({target:{files:[{name:'fixture.csv',text:async()=> 'fixture'}]}});await runtime.flush();
  ui=render();const submit=ui.props.footer.props.children[1].props.onClick;submit();submit();
  assert.equal(calls,1);ui=render();assert.equal(ui.props.busy,true);ui.props.onOpenChange(false);assert.equal(closes,0);
  resolveImport({imported:1,skipped:0,failed:[drafts[1]]});await runtime.flush();ui=render();
  assert.equal(ui.props.busy,false);assert.ok(elements(ui,'p').some(item=>item.props.children==='Failed fixture'));
  assert.ok(!elements(ui,'p').some(item=>item.props.children==='Saved fixture'));
  assert.ok(elements(ui,'IndiceModalValidation').some(item=>item.props.messages?.includes('No se pudo guardar')));
  props.onImportContacts=async selected=>{calls++;assert.deepEqual(selected,[drafts[1]]);return {imported:1,skipped:0,failed:[]};};
  render().props.footer.props.children[1].props.onClick();await runtime.flush();
  assert.equal(calls,2);assert.equal(render().props.footer.props.children[1].props.disabled,true);
});
