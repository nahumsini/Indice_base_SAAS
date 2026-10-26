import test from 'node:test';
import assert from 'node:assert/strict';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
const load=createTypeScriptLoader({}, {crypto,Date}),base=new URL('../src/app/',import.meta.url),model=load(new URL('ComplementaryModules/IdeasBoard/fiveSModel.ts',base).pathname),canvas=load(new URL('BasicModules/Sales/Funneling/ideasBoardModel.ts',base).pathname);
const plain=x=>JSON.parse(JSON.stringify(x));
function board(){return model.addFiveSTemplate(canvas.emptyBoard(),'Oficina','es-MX');}
test('template adds five named areas without replacing current nodes, arrows or camera',()=>{
 const n=canvas.textNode(0,0),old={nodes:[n],connections:[],viewport:{x:4,y:8,zoom:1}},before=JSON.stringify(old),next=model.addFiveSTemplate(old,'Oficina','es-MX');
 assert.equal(JSON.stringify(old),before);assert.equal(next.nodes.length,6);assert.deepEqual(plain(next.nodes[0]),plain(n));assert.deepEqual(plain(next.viewport),plain(old.viewport));assert.equal(new Set(next.nodes.slice(1).map(n=>n.fiveS.templateId)).size,1);assert.deepEqual(plain(next.nodes.slice(1).map(n=>n.fiveS.section)),['SORT','ORDER','CLEAN','STANDARDIZE','SUSTAIN']);
 assert.ok(next.nodes[1].x>=n.x+n.width);assert.equal(model.fiveSTemplates(next).length,1);
});
test('limits reject a whole template, never partially add or overwrite a board',()=>{
 const old=canvas.emptyBoard();old.nodes=Array.from({length:96},()=>canvas.textNode(0,0));assert.equal(model.addFiveSTemplate(old,'Oficina','es-MX'),null);assert.equal(model.addFiveSTemplate(canvas.emptyBoard(),' ','es-MX'),null);
 const b=board();b.nodes[0].x=9999;b.nodes[0].width=1000;assert.equal(model.addFiveSTemplate(b,'Area','es-MX'),null);
});
test('action factory uses the requested section and keeps template instances distinct',()=>{
 const a=board(),b=model.addFiveSTemplate(a,'Archivos','es-MX');assert.equal(model.fiveSTemplates(b).length,2);
 const f=model.fiveSTemplates(b)[1].fiveS,n=model.newFiveSAction(b,f,'CLEAN');assert.equal(n.fiveS.section,'CLEAN');assert.equal(n.fiveS.area,'Archivos');assert.equal(n.fiveS.templateId,f.templateId);assert.equal(n.fiveS.status,'PENDING');assert.equal(n.text,'');assert.equal(model.validFiveSAction(n),false);
 n.text='Ordenar';n.fiveS.action='Poner etiquetas';assert.equal(model.validFiveSAction(n),true);n.fiveS.status='VERIFIED';assert.equal(model.validFiveSAction(n),false);n.fiveS.result='Se encuentra en 10 segundos';assert.equal(model.validFiveSAction(n),true);
});
test('actionable counts use local calendar dates and never count area headers',()=>{
 const b=board(),n=model.newFiveSAction(b,b.nodes[0].fiveS,'SORT');n.fiveS.dueDate='2026-10-24';n.fiveS.reviewDate='2026-10-31';
 assert.equal(model.matchesFiveS(n,'OVERDUE','2026-10-25'),true);assert.equal(model.matchesFiveS(n,'REVIEWS','2026-10-25'),true);n.fiveS.dueDate='2026-10-25';assert.equal(model.matchesFiveS(n,'OVERDUE','2026-10-25'),false);
 n.fiveS.status='VERIFIED';assert.equal(model.matchesFiveS(n,'PENDING','2026-10-25'),false);assert.equal(model.matchesFiveS(n,'OVERDUE','2026-10-25'),false);assert.equal(model.matchesFiveS(b.nodes[0],'ALL'),false);
});
test('structured-only edits participate in CAS comparison, history and immutable snapshots',()=>{
 const b=board(),n=model.newFiveSAction(b,b.nodes[0].fiveS,'SORT');n.text='Contratos';n.fiveS.action='Clasificar';b.nodes.push(n);const next=structuredClone(b);next.nodes[5].fiveS.owner='Persona';assert.equal(canvas.sameBoardIdeas(b,next),false);const history=canvas.record({past:[],current:b,future:[]},next);assert.equal(history.past.length,1);assert.equal(canvas.stepHistory(history,'undo').current.nodes[5].fiveS.owner,'');assert.equal(JSON.parse(JSON.stringify(next)).nodes[5].fiveS.owner,'Persona');
 const pan=structuredClone(b);pan.viewport.x=500;assert.equal(canvas.sameBoardIdeas(b,pan),true);
});
test('all supported languages have complete instructions and saved nodes remain portable readable text',()=>{
 for(const locale of ['es-MX','es-CO','en-CA','en-US','fr-CA','pt-BR','ko-CA','zh-CA']){const c=load(new URL('ComplementaryModules/IdeasBoard/fiveSCopy.ts',base).pathname).fiveSCopy(locale);assert.ok(Object.values(c).every(s=>typeof s==='string'&&s.trim()));const b=model.addFiveSTemplate(canvas.emptyBoard(),'Area',locale);assert.equal(b.nodes.length,5);assert.ok(model.fiveSNodeText(b.nodes[0],locale).includes('Area'));}
});

import {createRequire} from 'node:module';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url);
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
const evidence=h=>elements(h.runtime.result).find(e=>e.type==='evidence').props;
function fieldsHarness(readonly=false,{empty=false}={}){
 const runtime=hookRuntime(),requests=[],changes=[],busy=[];const b=board();let n=model.newFiveSAction(b,b.nodes[0].fiveS,'SORT');if(!empty){n.text='Proof';n.fiveS.action='Arrange';}
 const fields=loadTypescript(new URL('ComplementaryModules/IdeasBoard/FiveSFields.tsx',base).pathname,id=>{
  if(id==='./FiveSEvidence')return{FiveSEvidence:'evidence'};if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return{Camera:'camera',RotateCcw:'retry',Trash2:'trash'};if(id==='./fiveSModel')return model;if(id==='./fiveSSetupModel')return load(new URL('ComplementaryModules/IdeasBoard/fiveSSetupModel.ts',base).pathname);if(id==='./fiveSCopy')return load(new URL('ComplementaryModules/IdeasBoard/fiveSCopy.ts',base).pathname);throw Error(id);
 },{crypto});
 const api={photoUrl:id=>'/private/'+id,upload:(file,id,actor)=>new Promise((resolve,reject)=>requests.push({file,id,actor,resolve,reject}))};
 const render=()=>runtime.render(()=>fields.FiveSFields({node:n,onChange:next=>{changes.push(next);n=next;},locale:'es-MX',api,actor:'ideas_board:8:7',onBusyChange:v=>busy.push(v),readonly}));render();return{runtime,requests,changes,busy,render,get node(){return n;},setNode:value=>{n=value;render();}};
}
test('evidence upload retains the draft and retries the same private asset after failure',async()=>{
 const h=fieldsHarness(),file={type:'image/png',size:10,name:'proof.png'};
 evidence(h).onUpload(file,'beforeAssetId');h.render();assert.equal(h.requests[0].actor,'ideas_board:8:7');assert.equal(h.busy[0],true);h.requests[0].reject(Error('offline'));await h.runtime.flush();h.render();assert.equal(h.changes.length,0);
 evidence(h).onRetry();assert.equal(h.requests[1].id,h.requests[0].id);h.requests[1].resolve({id:h.requests[1].id});await h.runtime.flush();h.render();assert.equal(h.changes[0].fiveS.beforeAssetId,h.requests[0].id);assert.equal(h.changes[0].text,'Proof');h.runtime.unmount();
});
test('readonly views never expose file inputs and an unmounted field ignores late uploads',async()=>{
 const r=fieldsHarness(true);assert.equal(evidence(r).readonly,true);evidence(r).onUpload({type:'image/png',size:10,name:'proof.png'},'beforeAssetId');assert.equal(r.requests.length,0);r.runtime.unmount();
 const h=fieldsHarness(),file={type:'image/png',size:10,name:'proof.png'};evidence(h).onUpload(file,'beforeAssetId');h.runtime.unmount();h.requests[0].resolve({id:h.requests[0].id});await h.runtime.flush();assert.equal(h.changes.length,0);
});
test('a single action description prepares a valid card while optional sections remain closed',()=>{
 const h=fieldsHarness(false,{empty:true}),top=h.runtime.result.props.children;
 const main=elements(top[0]);assert.equal(main.filter(e=>e.type==='textarea').length,1);assert.equal(main.filter(e=>e.type==='input').length,2);
 const disclosures=elements(h.runtime.result).filter(e=>e.type==='details');assert.equal(disclosures.length,3);assert.ok(disclosures.every(e=>!e.props.open));
 const answer='Etiquetar las carpetas para encontrar cada documento.';
 main.find(e=>e.type==='textarea').props.onChange({target:{value:answer}});h.render();
 assert.equal(h.node.text,answer);assert.equal(h.node.fiveS.action,answer);assert.equal(h.node.fiveS.owner,'');assert.ok(model.validFiveSAction(h.node));
 elements(h.runtime.result).find(e=>e.type==='textarea').props.onChange({target:{value:'Una mejora '.repeat(35)+'\nCon todos sus pasos.'}});h.render();
 assert.ok(h.node.text.length<=180);assert.ok(h.node.fiveS.action.endsWith('Con todos sus pasos.'));assert.ok(model.validFiveSAction(h.node));h.runtime.unmount();
});
test('editing an existing custom title preserves it while owner, date and description change independently',()=>{
 const h=fieldsHarness();
 const main=()=>elements(h.runtime.result.props.children[0]);
 main().find(e=>e.type==='textarea').props.onChange({target:{value:'Una nueva descripción'}});h.render();assert.equal(h.node.text,'Proof');
 main().find(e=>e.type==='input'&&e.props.maxLength===120).props.onChange({target:{value:'Equipo de oficina'}});h.render();
 main().find(e=>e.type==='input'&&e.props.type==='date').props.onChange({target:{value:'2026-11-02'}});h.render();
 assert.equal(h.node.fiveS.owner,'Equipo de oficina');assert.equal(h.node.fiveS.dueDate,'2026-11-02');assert.equal(h.node.fiveS.action,'Una nueva descripción');
 elements(h.runtime.result).find(e=>e.type==='input'&&e.props.maxLength===180).props.onChange({target:{value:''}});h.render();assert.equal(h.node.text,'Una nueva descripción');h.runtime.unmount();
});
test('verification reveals the required result without losing the description or optional follow-up',()=>{
 const h=fieldsHarness();elements(h.runtime.result).find(e=>e.type==='select'&&e.props.value==='PENDING').props.onChange({target:{value:'VERIFIED'}});h.render();
 assert.equal(elements(h.runtime.result).find(e=>e.type==='details').props.open,true);assert.equal(model.validFiveSAction(h.node),false);
 const result=elements(h.runtime.result).find(e=>e.type==='textarea'&&e.props.required&&e.props.rows===2);assert.ok(result);
 result.props.onChange({target:{value:'Se encuentra cada documento en menos de un minuto.'}});h.render();assert.ok(model.validFiveSAction(h.node));assert.equal(h.node.fiveS.action,'Arrange');h.runtime.unmount();
});

test('evidence replaces only its chosen slot, keeps the previous photo on failure and blocks competing changes while busy',async()=>{
 const h=fieldsHarness(),file={type:'image/jpeg',size:20,name:'after.jpg'};
 h.setNode({...h.node,fiveS:{...h.node.fiveS,beforeAssetId:'before-existing',afterAssetId:'after-existing'}});
 evidence(h).onUpload(file,'afterAssetId');h.render();assert.equal(evidence(h).uploadingKey,'afterAssetId');
 evidence(h).onRemove('beforeAssetId');evidence(h).onUpload(file,'beforeAssetId');assert.equal(h.requests.length,1);assert.equal(h.node.fiveS.beforeAssetId,'before-existing');
 h.requests[0].reject(Error('offline'));await h.runtime.flush();h.render();assert.equal(h.node.fiveS.afterAssetId,'after-existing');assert.equal(evidence(h).error.key,'afterAssetId');
 evidence(h).onRetry();h.requests[1].resolve({id:h.requests[0].id});await h.runtime.flush();h.render();assert.equal(h.node.fiveS.beforeAssetId,'before-existing');assert.equal(h.node.fiveS.afterAssetId,h.requests[0].id);
 evidence(h).onRemove('beforeAssetId');h.render();assert.equal(h.node.fiveS.beforeAssetId,null);assert.equal(h.node.fiveS.afterAssetId,h.requests[0].id);h.runtime.unmount();
});
test('invalid evidence never uploads, and changing action identity ignores a late private upload',async()=>{
 const h=fieldsHarness();for(const file of [{type:'text/plain',size:10,name:'bad.txt'},{type:'image/png',size:0,name:'empty.png'},{type:'image/webp',size:5*1024*1024+1,name:'large.webp'}]){evidence(h).onUpload(file,'afterAssetId');h.render();assert.equal(evidence(h).error.key,'afterAssetId');}
 assert.equal(h.requests.length,0);evidence(h).onUpload({type:'image/png',size:10,name:'before.png'},'beforeAssetId');
 const other={...h.node,id:crypto.randomUUID()};h.setNode(other);h.requests[0].resolve({id:'late-private-photo'});await h.runtime.flush();h.render();assert.equal(h.changes.length,0);assert.equal(h.node.fiveS.beforeAssetId,undefined);h.runtime.unmount();
});

test('each category offers the same distinct question in the wizard and action form in every language',()=>{
 const copy=load(new URL('ComplementaryModules/IdeasBoard/fiveSCopy.ts',base).pathname),wizard=load(new URL('ComplementaryModules/IdeasBoard/fiveSWizardCopy.ts',base).pathname);
 for(const locale of ['es-MX','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){
  const c=copy.fiveSCopy(locale),w=wizard.fiveSWizardCopy(locale);assert.equal(new Set(model.fiveSSections.map(s=>c[s+'Help'])).size,5);
  for(const section of model.fiveSSections){assert.equal(c[section+'Help'],w[section+'Question']);assert.ok(c[section+'Example'].trim());}
 }
});
