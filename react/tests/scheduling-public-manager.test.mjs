import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Scheduling/',import.meta.url);
const load=(path,resolve=()=>({}))=>loadTypescript(new URL(path,root).pathname,resolve);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
const stub=new Proxy({}, {get:(_,key)=>key});
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
const managerCopy=load('translations/publicAgendaManagerCopy.ts'),editorCopy=load('translations/publicAgendaEditorCopy.ts');
const pages=[{id:1,title:'Diagnóstico',alias:'diagnostico',published:true,publicUrl:'/book/diagnostico'},{id:2,title:'Seguimiento',alias:'seguimiento',published:false,publicUrl:'/book/seguimiento'}];
function harness(flags={}){
  const runtime=hookRuntime(),events=[];
  const {PublicAgendaManager}=load('components/PublicAgendaManager.tsx',id=>{
    if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return jsx;
    if(id.endsWith('/publicAgendaManagerCopy'))return managerCopy;if(id.endsWith('/publicAgendaEditorCopy'))return editorCopy;return stub;
  });
  runtime.render(()=>PublicAgendaManager({pages,staff:[],copy:{status:'Estado',published:'Publicada',edit:'Editar'},locale:'es-MX',publicAccessEnabled:true,disabled:false,onCreate:()=>events.push(['create']),onEdit:page=>events.push(['edit',page.id]),onPreview:page=>events.push(['preview',page.id]),onUnpublish:page=>events.push(['unpublish',page.id]),...flags}));
  return {runtime,events,all:()=>nodes(runtime.result),rows:()=>nodes(runtime.result).filter(node=>node.type==='li')};
}
test('saved directory filters by name/link and publication without altering the input',async()=>{
  const h=harness();assert.equal(h.rows().length,2);
  h.all().find(node=>node.type==='IndiceFilterSearch').props.onValueChange('SEGUIMIENTO');await h.runtime.flush();assert.equal(h.rows().length,1);assert.equal(nodes(h.rows()[0]).find(node=>node.type==='h3').props.children,'Seguimiento');
  h.all().find(node=>node.type==='IndiceFilterSearch').props.onClear();h.all().find(node=>node.type==='IndiceFilterSelect').props.onValueChange('published');await h.runtime.flush();assert.equal(h.rows().length,1);assert.equal(pages[1].published,false);
});
test('creation remains available above the directory, including an empty or filtered list',async()=>{
  for(const flags of [{},{pages:[]}]){
    const h=harness(flags);const create=()=>h.all().find(node=>node.type==='ActionButton'&&Array.isArray(node.props.children)&&node.props.children.includes('Nueva agenda'));
    assert.equal(create().props.disabled,false);create().props.onClick();assert.deepEqual(h.events,[['create']]);
    h.all().find(node=>node.type==='IndiceFilterSearch').props.onValueChange('no-match');await h.runtime.flush();
    assert.equal(h.rows().length,0);create().props.onClick();assert.deepEqual(h.events,[['create'],['create']]);
  }
});
test('saved sharing is per agenda and only published rows offer unpublish',async()=>{
  const h=harness();const action=name=>h.all().find(node=>node.type==='ActionButton'&&node.props['aria-label']===name);
  assert.equal(h.all().filter(node=>node.type==='ActionButton'&&String(node.props['aria-label']).startsWith('Ocultar agenda:')).length,1);
  action('Compartir agenda: Seguimiento').props.onClick();await h.runtime.flush();assert.equal(h.all().find(node=>node.type==='PublicAgendaLinks').props.page.id,2);
  action('Editar: Seguimiento').props.onClick();action('Vista previa: Diagnóstico').props.onClick();assert.deepEqual(h.events,[['edit',2],['preview',1]]);
});
test('blocked and empty states are explicit; stale/loading data disables operational actions',()=>{
  const h=harness({publicAccessEnabled:false,disabled:true});assert.ok(h.all().some(node=>node.props?.role==='status'));assert.ok(h.all().filter(node=>node.type==='ActionButton').every(node=>node.props.disabled));
  const empty=harness({pages:[]});assert.equal(empty.all().find(node=>node.type==='IndiceViewState').props.title,'Crea tu primera agenda');
});
test('public agenda manager copy covers eight locales with en-CA fallback',()=>{
  for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){const text=managerCopy.getPublicAgendaManagerCopy(locale);assert.deepEqual(Object.keys(text),Object.keys(managerCopy.getPublicAgendaManagerCopy('en-CA')));assert.ok(Object.values(text).every(value=>value.trim()));}
  assert.equal(managerCopy.getPublicAgendaManagerCopy('unknown'),managerCopy.getPublicAgendaManagerCopy('en-CA'));
});
