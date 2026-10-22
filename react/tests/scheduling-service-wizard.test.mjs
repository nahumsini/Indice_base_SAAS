import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypescript, hookRuntime } from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/ComplementaryModules/Scheduling/', import.meta.url);
const load = (file,resolve = () => ({})) => loadTypescript(new URL(file,root).pathname,resolve);
const jsx = { jsx:(type,props) => ({ type,props }),jsxs:(type,props) => ({ type,props }),Fragment:'Fragment' };
const stub = new Proxy({}, { get:(_,key) => key });
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value,...nodes(value.props?.children)];
const setup = load('translations/schedulingSetupCopy.ts'), labels = load('translations/serviceEditorCopy.ts'), validation = load('utils/setupValidation.ts');
const { getSchedulingCopy } = load('translations/schedulingCopy.ts',() => load('translations/schedulingWorkspaceCopy.ts'));
const terms = load('translations/serviceTermsCopy.ts');
const copy = getSchedulingCopy('es-MX'), text = labels.getServiceEditorCopy('es-MX');
const item = { id:501,name:'Consulta de seguimiento',description:'Descripción del catálogo',sku:'SRV-501',active:true };
function harness(service,configuredServices = service ? [service] : []) {
  const runtime = hookRuntime(), writes = [], edits = [], exits = [];
  const { ServiceEditor } = load('components/ServiceEditor.tsx',id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/context')) return { useLanguage:() => ({ currentLanguage:{ code:'es-MX' } }) };
    if (id.endsWith('/schedulingSetupCopy')) return setup;
    if (id.endsWith('/serviceEditorCopy')) return labels;
    if (id.endsWith('/serviceTermsCopy')) return terms;
    if (id.endsWith('/setupValidation')) return validation;
    if (id.endsWith('/schedulingIdentity')) return { schedulingEmoji:{ services:'🔧' } };
    if (id.endsWith('/schedulingApi')) return { schedulingApi:{ saveService:async (body,id) => writes.push({ body,id }) } };
    return stub;
  });
  runtime.render(() => ServiceEditor({ service,configuredServices,copy,onClose() {},onSaved() {},onEditConfigured:id => edits.push(id) }));
  return { runtime,writes,edits,exits,view:() => runtime.result.props.children({ requestExit:action => exits.push(action) }) };
}
const picker = h => nodes(h.view()).find(node => node.type === 'ServiceCatalogPicker');
const next = async h => { assert.equal(h.runtime.result.props.validate(),undefined);h.runtime.result.props.navigation.onContinue();await h.runtime.flush(); };
const back = async h => { h.runtime.result.props.navigation.onBack();await h.runtime.flush(); };
const source = async (h,value) => { nodes(h.view()).find(node => node.type === 'input' && node.props.name === 'service-source' && node.props.value === value).props.onChange();await h.runtime.flush(); };

test('an independent free session preserves both source drafts and saves without an Inventory item',async () => {
  const h = harness();picker(h).props.onSelect(item);await h.runtime.flush();
  await source(h,'agenda');assert.equal(picker(h),undefined);assert.ok(h.runtime.result.props.validate());
  nodes(h.view()).find(node => node.type === 'input' && node.props.maxLength === 180).props.onChange({target:{value:'Demo individual'}});await h.runtime.flush();
  await source(h,'inventory');assert.equal(picker(h).props.selected.id,501);await next(h);await back(h);
  await source(h,'agenda');assert.equal(nodes(h.view()).find(node => node.type === 'input' && node.props.maxLength === 180).props.value,'Demo individual');
  await next(h);nodes(h.view()).find(node => node.type === 'select' && node.props.value === 'TO_BE_AGREED').props.onChange({target:{value:'NO_CHARGE'}});await h.runtime.flush();
  await next(h);await back(h);await next(h);await h.runtime.result.props.onSave();
  assert.equal(h.writes[0].body.productId,undefined);assert.equal(h.writes[0].body.name,'Demo individual');assert.equal(h.writes[0].body.chargePolicy,'NO_CHARGE');
});

test('linking an existing independent service preserves its name, description, hours, terms and identity',async () => {
  const service = { id:15,productId:null,name:'Demo propia',description:'Conservar',durationMinutes:30,bufferMinutes:5,noticeHours:0,active:true,version:3,days:[],chargePolicy:'NO_CHARGE' };
  const h = harness(service);await source(h,'inventory');picker(h).props.onSelect(item);await h.runtime.flush();await next(h);await next(h);await h.runtime.result.props.onSave();
  const { id,...body } = service;assert.deepEqual(h.writes,[{id,body:{...body,productId:501}}]);
});

test('service creation selects Inventory once and only the complete review writes the owner payload',async () => {
  const h = harness(); assert.equal(h.runtime.result.props.modalType,'wizard');assert.equal(h.runtime.result.props.navigation.disabled,true);
  assert.equal(h.runtime.result.props.validate(),text.selectionRequired);
  assert.throws(() => h.runtime.result.props.onSave(),/scheduling_catalog_service_unavailable/);
  picker(h).props.onSelect(item);await h.runtime.flush();await next(h);
  assert.equal(h.runtime.result.props.navigation.disabled,false);
  assert.equal(nodes(h.view()).find(node => node.type === 'input' && node.props['aria-required']).props.value,item.name);
  await next(h);assert.equal(h.writes.length,0);assert.equal(h.runtime.result.props.navigation.onContinue,undefined);
  await h.runtime.result.props.onSave();
  assert.deepEqual(h.writes,[{ id:undefined,body:{ chargePolicy:'TO_BE_AGREED',productId:501,name:item.name,description:item.description,durationMinutes:60,bufferMinutes:15,noticeHours:24,active:true,days:[],version:undefined } }]);
});

test('linked editing retains product identity, optimistic version, custom copy and split hours across Back',async () => {
  const service = { id:7,productId:501,name:'Nombre de reserva',description:'Texto público',durationMinutes:90,bufferMinutes:20,noticeHours:12,active:false,version:4,
    days:[{dayOfWeek:1,startTime:'09:00:00',endTime:'12:00:00'},{dayOfWeek:1,startTime:'13:00:00',endTime:'17:00:00'}] };
  const h = harness(service);assert.equal(picker(h),undefined);await next(h);
  nodes(h.view()).find(node => node.type === 'input' && node.props['aria-required']).props.onChange({ target:{ value:'Nombre personalizado' } });await h.runtime.flush();
  await back(h);await next(h);await next(h);await h.runtime.result.props.onSave();
  const { id,...expected } = service;
  assert.deepEqual(h.writes,[{ id,body:{ ...expected,chargePolicy:'TO_BE_AGREED',name:'Nombre personalizado' } }]);assert.equal(service.name,'Nombre de reserva');
});

test('legacy services remain editable without requiring a backfilled Inventory link',async () => {
  const service = { id:9,name:'Servicio anterior',description:'',durationMinutes:45,bufferMinutes:0,noticeHours:0,active:true,version:2,days:[] };
  const h = harness(service);assert.equal(picker(h),undefined);await next(h);await next(h);await h.runtime.result.props.onSave();
  assert.equal(h.writes[0].body.productId,undefined);assert.equal(h.writes[0].body.version,2);assert.equal(h.writes[0].id,9);
});

test('service hours and numeric bounds gate review; disabling restrictions sends no windows without erasing the draft',async () => {
  const h = harness();picker(h).props.onSelect(item);await h.runtime.flush();await next(h);
  const restriction = () => nodes(h.view()).find(node => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked === false);
  restriction().props.onChange({ target:{ checked:true } });await h.runtime.flush();
  const hours = () => nodes(h.view()).find(node => node.type === 'WeeklyHours');
  hours().props.onChange([{dayOfWeek:1,startTime:'17:00',endTime:'09:00'}]);await h.runtime.flush();
  assert.equal(h.runtime.result.props.validate(),setup.getSchedulingSetupCopy('es-MX').hoursInvalid);
  hours().props.onChange([]);await h.runtime.flush();assert.ok(h.runtime.result.props.validate());
  const split = [{dayOfWeek:1,startTime:'09:00',endTime:'12:00'},{dayOfWeek:1,startTime:'13:00',endTime:'17:00'}];
  hours().props.onChange(split);await h.runtime.flush();
  const duration = () => nodes(h.view()).find(node => node.type === 'input' && node.props.max === 180);
  duration().props.onChange({target:{value:'14'}});await h.runtime.flush();assert.equal(h.runtime.result.props.validate(),text.settingsInvalid);
  duration().props.onChange({target:{value:'60'}});await h.runtime.flush();
  nodes(h.view()).filter(node => node.type === 'input' && node.props.type === 'checkbox').at(-1).props.onChange({target:{checked:false}});await h.runtime.flush();
  await next(h);await back(h);
  restriction().props.onChange({target:{checked:true}});await h.runtime.flush();assert.deepEqual(hours().props.days,split);
  nodes(h.view()).filter(node => node.type === 'input' && node.props.type === 'checkbox').at(-1).props.onChange({target:{checked:false}});await h.runtime.flush();
  await next(h);await h.runtime.result.props.onSave();assert.deepEqual(h.writes[0].body.days,[]);
});

test('configured services use guarded navigation and cannot become a duplicate create payload',async () => {
  const existing = { id:8,productId:501,name:'Ya configurado',description:'',durationMinutes:60,bufferMinutes:15,noticeHours:24,active:true,version:3,days:[] };
  const h = harness(undefined,[existing]);picker(h).props.onEditConfigured(8);assert.deepEqual(h.edits,[]);assert.equal(h.exits.length,1);
  h.exits[0]();assert.deepEqual(h.edits,[8]);
  picker(h).props.onSelect(item);await h.runtime.flush();assert.equal(h.runtime.result.props.validate(),text.duplicateHint);assert.equal(h.writes.length,0);
});

test('Inventory navigation requires both its module entitlement and product-tab permission',() => {
  const access = loadTypescript(new URL('../src/app/access/tabScopeCatalog.ts',import.meta.url).pathname,() => ({}));
  const {canOpenInventoryProducts:canOpen} = load('utils/schedulingNavigation.ts',() => access);
  const admin = { user:{role:'admin',tab_permissions_configured:true,tab_permission_keys:['inventory.products']} };
  assert.equal(canOpen(admin,[{slug:'inventory',locked:false}]),true);
  assert.equal(canOpen(admin,[]),false);assert.equal(canOpen(admin,[{slug:'inventory',locked:true}]),false);
  assert.equal(canOpen({user:{...admin.user,tab_permission_keys:['scheduling.configuration']}},[{slug:'inventory'}]),false);
  assert.equal(canOpen(null,[{slug:'inventory'}]),false);
});

test('service wizard copy covers eight locales with an explicit en-CA fallback',() => {
  const keys = Object.keys(labels.getServiceEditorCopy('en-CA')).sort();
  for (const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']) {
    assert.deepEqual(Object.keys(labels.getServiceEditorCopy(locale)).sort(),keys);assert.ok(Object.values(labels.getServiceEditorCopy(locale)).every(value => value.trim()));
  }
  assert.equal(labels.getServiceEditorCopy('unknown'),labels.getServiceEditorCopy('en-CA'));
  for (const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']) {
    assert.deepEqual(Object.keys(terms.getServiceTermsCopy(locale)),Object.keys(terms.getServiceTermsCopy('en-CA')));
    assert.ok(Object.values(terms.getServiceTermsCopy(locale)).every(value => value.trim()));
    assert.notEqual(terms.serviceChargeLabel(undefined,locale),terms.serviceChargeLabel('NO_CHARGE',locale));
    assert.equal(terms.serviceChargeLabel(undefined,locale),terms.serviceChargeLabel('TO_BE_AGREED',locale));
  }
});
