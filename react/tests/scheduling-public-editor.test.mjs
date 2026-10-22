import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypescript, hookRuntime } from './helpers/hook-runtime.mjs';
globalThis.window = {location:{origin:'http://127.0.0.1:5197'}};
const root = new URL('../src/app/ComplementaryModules/Scheduling/',import.meta.url);
const load = (path,resolve = () => ({})) => loadTypescript(new URL(path,root).pathname,resolve);
const jsx = {jsx:(type,props) => ({type,props}),jsxs:(type,props) => ({type,props}),Fragment:'Fragment'};
const stub = new Proxy({}, {get:(_,key) => key});
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value,...nodes(value.props?.children)];
const appearance = load('utils/publicAppearance.ts'), labels = load('translations/publicAgendaEditorCopy.ts'), setup = load('translations/schedulingSetupCopy.ts');
const {getSchedulingCopy} = load('translations/schedulingCopy.ts',() => load('translations/schedulingWorkspaceCopy.ts'));
const copy = getSchedulingCopy('es-MX'), text = labels.getPublicAgendaEditorCopy('es-MX');
const savedPage = {id:7,alias:'mi-agenda',title:'Título anterior',description:'Descripción anterior',published:true,version:4,publicUrl:'/book/mi-agenda',appearance:{brandName:'Marca pública',accentColor:'#123456',surfaceColor:'#FFF4D4',buttonLabel:'Solicitar atención',layout:'compact'}};
function harness(page = null,flags = {}) {
  const runtime = hookRuntime(),writes = [];
  const {PageEditor} = load('components/PageEditor.tsx',id => {
    if (id === 'react') return runtime.hooks;
    if (id === 'react/jsx-runtime') return jsx;
    if (id.endsWith('/context')) return {useLanguage:() => ({currentLanguage:{code:'es-MX'}})};
    if (id.endsWith('/schedulingSetupCopy')) return setup;
    if (id.endsWith('/publicAgendaEditorCopy')) return labels;
    if (id.endsWith('/publicAppearance')) return appearance;
    if (id.endsWith('/schedulingIdentity')) return {schedulingEmoji:{publicAgenda:'🌐'}};
    if (id.endsWith('/setupValidation')) return load('utils/setupValidation.ts');
    if (id.endsWith('/schedulingApi')) return {schedulingApi:{savePage:async body => {writes.push(body);return {...body,id:7,title:body.title.trim(),version:(body.version ?? 0)+1,publicUrl:`/book/${body.alias}`,appearance:{...body.appearance,brandName:body.appearance.brandName.trim()}};}}};
    return stub;
  });
  runtime.render(() => PageEditor({page,copy,onClose(){},onSaved(){},readiness:{companyName:'Empresa legal',suggestedAlias:'agenda-local',bookingReady:true,...flags},...flags}));
  return {runtime,writes,view:() => runtime.result.props.children};
}
const field = (h,label) => nodes(h.view()).find(node => node.type === 'Field' && node.props.label === label).props.children;
const next = async h => {assert.equal(h.runtime.result.props.validate(),undefined);h.runtime.result.props.navigation.onContinue();await h.runtime.flush();};
const back = async h => {h.runtime.result.props.navigation.onBack();await h.runtime.flush();};
const change = async(h,label,value) => {field(h,label).props.onChange({target:{value}});await h.runtime.flush();};
const design = h => nodes(h.view()).find(node => node.type === 'PublicAgendaDesign');

test('public page saves only on final review and adopts returned version and normalized appearance',async () => {
  const h = harness(savedPage);assert.equal(h.runtime.result.props.modalType,'wizard');assert.equal(h.runtime.result.props.hasChanges,false);assert.equal(h.runtime.result.props.footerSummary,copy.published);
  await assert.rejects(h.runtime.result.props.onSave(),/scheduling_setup_required/);
  await change(h,text.publicName,' Nueva marca ');assert.equal(h.runtime.result.props.footerSummary,text.unsaved);await change(h,`${copy.pageTitle} *`,' Mi consulta ');
  await change(h,copy.description,'Texto propio\nSegunda línea');await change(h,copy.buttonLabel,'Solicitar mi cita');await next(h);
  design(h).props.onChange({...design(h).props.appearance,accentColor:'#047857',surfaceColor:'#ECFDF5',layout:'cards'});await h.runtime.flush();
  await next(h);assert.equal(h.writes.length,0);assert.equal(h.runtime.result.props.hasChanges,true);
  await h.runtime.result.props.onSave();await h.runtime.flush();assert.equal(h.runtime.result.props.hasChanges,false);
  assert.equal(h.writes[0].alias,'mi-agenda');assert.equal(h.writes[0].version,4);assert.equal(h.writes[0].published,true);
  assert.equal(nodes(h.view()).find(node => node.type === 'PublicAgendaPreview').props.appearance.brandName,'Nueva marca');
  await back(h);await back(h);assert.equal(field(h,`${copy.pageTitle} *`).props.value,'Mi consulta');
  await next(h);await next(h);await h.runtime.result.props.onSave();assert.equal(h.writes[1].version,5);
});
test('new page stays draft and publication fails closed without readiness or public access',async () => {
  for (const flags of [{bookingReady:false},{publicAccessEnabled:false}]) {
    const h = harness(null,flags);await next(h);await next(h);
    const publication = nodes(h.view()).find(node => node.type === 'input' && node.props.role === 'switch');
    assert.equal(publication.props.checked,false);assert.equal(publication.props.disabled,true);
    await h.runtime.result.props.onSave();assert.equal(h.writes[0].published,false);assert.equal(h.writes[0].alias,'agenda-local');
  }
});
test('Back retains content and theme, preview mode is not dirty, links use the saved page',async () => {
  const h = harness(savedPage);await change(h,copy.description,'Cambio no guardado');await next(h);
  const {id,...palette} = appearance.publicAgendaPalettes[1];design(h).props.onChange({...design(h).props.appearance,...palette});await h.runtime.flush();await back(h);
  assert.equal(field(h,copy.description).props.value,'Cambio no guardado');await next(h);assert.equal(design(h).props.appearance.accentColor,'#B63B32');
  await next(h);assert.equal(nodes(h.view()).find(node => node.type === 'PublicAgendaLinks').props.page,savedPage);
  const untouched = harness(savedPage);await next(untouched);await next(untouched);
  nodes(untouched.view()).find(node => node.type === 'button' && node.props.children === text.mobile).props.onClick();await untouched.runtime.flush();
  assert.equal(nodes(untouched.view()).find(node => node.type === 'PublicAgendaPreview').props.mobile,true);assert.equal(untouched.runtime.result.props.hasChanges,false);
});
test('validation rejects blank or oversized content, unsafe colours and unknown layouts',async () => {
  const h = harness(savedPage);await change(h,`${copy.pageTitle} *`,' ');assert.equal(h.runtime.result.props.validate(),text.contentInvalid);
  await change(h,`${copy.pageTitle} *`,'Título');await next(h);design(h).props.onChange({...design(h).props.appearance,accentColor:'url(bad)'});await h.runtime.flush();assert.equal(h.runtime.result.props.validate(),text.designInvalid);
  assert.equal(appearance.validPublicAppearance({...savedPage.appearance,layout:'invented'}),false);
  assert.equal(appearance.validPublicContent({title:'Valid',description:''},{...savedPage.appearance,buttonLabel:'x'.repeat(81)}),false);
});
test('public editor copy covers eight locales with an explicit en-CA fallback',() => {
  const keys = Object.keys(labels.getPublicAgendaEditorCopy('en-CA'));
  for (const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']) {
    assert.deepEqual(Object.keys(labels.getPublicAgendaEditorCopy(locale)),keys);assert.ok(Object.values(labels.getPublicAgendaEditorCopy(locale)).every(value => value.trim()));
  }
  assert.equal(labels.getPublicAgendaEditorCopy('unknown'),labels.getPublicAgendaEditorCopy('en-CA'));
});

test('public cards preserve service and event selection values, full-event disablement and explicit charge terms',() => {
  const terms = load('translations/serviceTermsCopy.ts'),changes = [];
  const {PublicServiceChoices} = load('components/PublicServiceChoices.tsx',id => {
    if(id === 'react') return {useId:() => 'public-service-test'};
    if(id === 'react/jsx-runtime') return jsx;
    if(id.endsWith('/serviceTermsCopy')) return terms;
    return stub;
  });
  const tree = PublicServiceChoices({catalog:{services:[{id:8,name:'Demo',description:'Una sesión',durationMinutes:30,chargePolicy:'NO_CHARGE'}],events:[{id:9,title:'Lleno',description:'Evento',durationMinutes:60,availablePlaces:0}]},value:'service:8',onChange:value=>changes.push(value),copy,locale:'es-MX'});
  const radios = nodes(tree).filter(node=>node.type==='input');assert.equal(radios[0].props.checked,true);assert.equal(radios[1].props.disabled,true);
  radios[0].props.onChange();assert.deepEqual(changes,['service:8']);assert.ok(nodes(tree).some(node=>node.props?.children==='Sin cobro'));
});
