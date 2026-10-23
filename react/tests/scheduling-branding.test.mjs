import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Scheduling/',import.meta.url);
const load=(path,resolve=()=>({}))=>loadTypescript(new URL(path,root).pathname,resolve);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},stub=new Proxy({},{get:(_,key)=>key});
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
const labels=load('translations/publicAgendaBrandCopy.ts'),logo=load('utils/publicAgendaLogo.ts');
const sample='data:image/png;base64,aGVsbG8=';
test('brand copy covers eight locales and unsafe image sources never enter public markup',()=>{
 for(const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']){const c=labels.getPublicAgendaBrandCopy(locale);assert.deepEqual(Object.keys(c),Object.keys(labels.getPublicAgendaBrandCopy('en-CA')));assert.ok(Object.values(c).every(value=>value.trim()));}
 assert.equal(logo.safeAgendaLogo(sample),sample);
 for(const value of ['https://example.com/logo.png','javascript:alert(1)','data:image/svg+xml;base64,AAAA','data:image/png;base64,!!!!',sample+'A'.repeat(175000)])assert.equal(logo.safeAgendaLogo(value),'');
});
test('image preparation rejects oversized and unsupported uploads before decoding',async()=>{
 await assert.rejects(logo.readAgendaLogo({size:1048577,type:'image/png'}),/logo_size/);
 for(const file of [{size:0,type:'image/png'},{size:12,type:'image/svg+xml'},{size:12,type:'application/pdf'}])await assert.rejects(logo.readAgendaLogo(file),/logo_invalid/);
});
test('a delayed logo uses the current appearance callback, blocks navigation while reading, and removal clears it',async()=>{
 const runtime=hookRuntime(),calls=[],busy=[];let release,onChange=value=>calls.push(['old',value]);
 const {PublicAgendaLogo}=load('components/PublicAgendaLogo.tsx',id=>id==='react'?{...runtime.hooks,useId:()=> 'logo'}:id==='react/jsx-runtime'?jsx:id.endsWith('/publicAgendaBrandCopy')?labels:id.endsWith('/publicAgendaLogo')?{...logo,readAgendaLogo:()=>new Promise(resolve=>{release=resolve;})}:stub);
 runtime.render(()=>PublicAgendaLogo({value:sample,onChange,locale:'es-MX',onBusyChange:value=>busy.push(value)}));
 const upload=nodes(runtime.result).find(n=>n.type==='input');const pending=upload.props.onChange({target:{files:[{name:'logo.png'}],value:'logo.png'}});await runtime.flush();assert.equal(nodes(runtime.result).find(n=>n.type==='input').props.disabled,true);
 onChange=value=>calls.push(['current',value]);runtime.render();release(sample);await pending;await runtime.flush();assert.deepEqual(calls,[['current',sample]]);assert.deepEqual(busy,[true,false]);
 nodes(runtime.result).find(n=>n.type==='ActionButton'&&Array.isArray(n.props.children)&&n.props.children.includes('Quitar logo')).props.onClick();assert.deepEqual(calls.at(-1),['current','']);runtime.unmount();
});
