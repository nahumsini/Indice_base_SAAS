import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Scheduling/',import.meta.url);
const load=(path,resolve=()=>({}))=>loadTypescript(new URL(path,root).pathname,resolve);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const stub=new Proxy({},{get:(_,key)=>key});
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const copy=load('translations/schedulingCopy.ts',()=>load('translations/schedulingWorkspaceCopy.ts')).getSchedulingCopy('es-MX');
const compact=load('translations/publicAgendaCompactCopy.ts');
const appearance=load('utils/publicAppearance.ts');
const saved={id:7,version:4,published:true,publicUrl:'/book/saved-page'};
globalThis.window={location:{origin:'http://127.0.0.1:5198'}};

test('short preview is inert, limits catalogue size and retains an optional full form without submission authority',async()=>{
 const {PublicAgendaPreview}=load('components/PublicAgendaPreview.tsx',id=>id==='react/jsx-runtime'?jsx:id.endsWith('/publicAppearance')?appearance:id.endsWith('/publicAgendaEditorCopy')?load('translations/publicAgendaEditorCopy.ts'):id.endsWith('/agendaExperienceCopy')?load('translations/agendaExperienceCopy.ts'):id.endsWith('/publicAgendaCompactCopy')?compact:stub);
 const catalog={services:Array.from({length:5},(_,i)=>({id:i+1,name:'Service '+i,active:true})),events:[],staff:[{id:1,publicName:'Public name'}]};
 const props={catalog,title:'Title',description:'Description',appearance:appearance.defaultAppearance,copy,locale:'es-MX'};
 const short=PublicAgendaPreview({...props,condensed:true});
 assert.equal(nodes(short).filter(n=>n.type==='BookingForm').length,0);
 assert.equal(nodes(short).find(n=>n.type==='PublicServiceChoices').props.catalog.services.length,2);
 assert.ok(nodes(short).some(n=>n.props?.inert===true));assert.equal(catalog.services.length,5);
 const full=PublicAgendaPreview(props),form=nodes(full).find(n=>n.type==='BookingForm');
 assert.equal(form.props.presentationOnly,true);assert.equal(form.props.catalog.services.length,5);assert.equal(form.props.catalog.clientSelectionEnabled,false);
 assert.deepEqual(await form.props.loadSlots(),{timezone:'UTC',starts:[]});await assert.rejects(form.props.onSubmit(),/Preview cannot send requests/);
 const empty=PublicAgendaPreview({...props,condensed:true,catalog:{...catalog,services:[]}});
 assert.equal(nodes(empty).filter(n=>n.type==='PublicServiceChoices'||n.type==='BookingForm').length,0);
});

function links(page=saved,enabled=true){
 const runtime=hookRuntime(),writes=[];Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async value=>writes.push(value)}},configurable:true});
 const {PublicAgendaLinks}=load('components/PublicAgendaLinks.tsx',id=>id==='react'?runtime.hooks:id==='react/jsx-runtime'?jsx:stub);
 runtime.render(()=>PublicAgendaLinks({compact:true,page,publicAccessEnabled:enabled,title:'Saved links',copy,staff:[{id:2,publicName:'Active',active:true},{id:3,publicName:'Inactive',active:false}]}));
 return {runtime,writes};
}
test('compact sharing copies only the saved public URL and active staff links',async()=>{
 const h=links(),all=nodes(h.runtime.result);
 assert.equal(all.find(n=>n.type==='input').props.value,'http://127.0.0.1:5198/book/saved-page');
 assert.ok(!JSON.stringify(h.runtime.result).includes('Inactive'));
 await all.find(n=>n.type==='ActionButton'&&n.props['aria-label']===copy.copy).props.onClick();await h.runtime.flush();
 await nodes(h.runtime.result).find(n=>n.type==='ActionButton'&&n.props['aria-label']===`${copy.copy}: Active`).props.onClick();await h.runtime.flush();
 assert.deepEqual(h.writes,['http://127.0.0.1:5198/book/saved-page','http://127.0.0.1:5198/book/saved-page?consultant=2']);
 assert.ok(nodes(h.runtime.result).some(n=>n.props?.role==='status'));
});
test('unpublished pages and a disabled adapter do not expose open/copy actions',()=>{
 for(const h of [links({...saved,published:false}),links(saved,false)]) {
  assert.equal(nodes(h.runtime.result).filter(n=>n.type==='a'||n.type==='ActionButton').length,0);
 }
 assert.equal(links(null).runtime.result,null);
});
test('compact wizard labels cover eight locales with the established fallback',()=>{
 const en=compact.getPublicAgendaCompactCopy('en-CA');
 for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){
  const labels=compact.getPublicAgendaCompactCopy(locale);assert.deepEqual(Object.keys(labels),Object.keys(en));assert.ok(Object.values(labels).every(value=>value.trim()));
 }
 assert.equal(compact.getPublicAgendaCompactCopy('unknown'),en);
});
