import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const base='src/app/BasicModules/Sales/Prospectos/';
const colors=loadTypescript(resolve(base+'utils/flowPersonalColors.ts'),()=>({}));
const {flowManagerCopy}=loadTypescript(resolve(base+'modals/flowManagerCopy.ts'),()=>({}));
const {esMX}=loadTypescript(resolve(base+'translations/prospectosTranslations.ts'),()=>({}));
const stages=[{key:'new',label:'Nueva',type:'OPEN',colorToken:'BLUE',defaultProbabilityPercent:20,required:false,position:0,opportunityCount:2},{key:'won',label:'Ganada',type:'WON',colorToken:'GREEN',defaultProbabilityPercent:100,required:true,position:1,opportunityCount:1},{key:'lost',label:'Perdida',type:'LOST',colorToken:'CORAL',defaultProbabilityPercent:0,required:true,position:2,opportunityCount:0}];
const element=(type,props)=>({type,props});
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children),...nodes(v.props?.footer)];
const text=v=>typeof v==='string'?v:Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):'';

test('private colors accept bounded hex values and never alter company stage fields',()=>{
 const normalized=colors.normalizeFlowColors({new:'#c026d3',won:'red',lost:'url(secret)',bad:'javascript:bad','<tag>':'#123456'});
 assert.deepEqual(normalized,{new:'#C026D3'});assert.equal(Object.keys(colors.normalizeFlowColors(Object.fromEntries(Array.from({length:20},(_,i)=>['s'+i,'#123456'])))).length,12);
 const applied=colors.applyFlowColors(stages,normalized);assert.equal(applied[0].personalColor,'#C026D3');assert.equal(applied[1].personalColor,undefined);assert.equal(stages[0].personalColor,undefined);assert.equal(applied[0].colorToken,'BLUE');assert.equal(applied[0].defaultProbabilityPercent,20);
});
test('chosen foreground is readable across every supplied swatch',()=>{
 const luminance=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 for(const hex of colors.flowColorPalette){const background=luminance(hex),foreground=luminance(colors.colorForeground(hex));assert.ok((Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05)>=4.5,hex);}
});
test('new management copy is complete and localized in all supported languages',()=>{
 const keys=Object.keys(flowManagerCopy('en-CA')).sort();for(const locale of ['es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA','en-US']){const copy=flowManagerCopy(locale);assert.deepEqual(Object.keys(copy).sort(),keys);for(const value of Object.values(copy))assert.ok(value.trim());}assert.notEqual(flowManagerCopy('es-MX').deleteFlow,flowManagerCopy('en-CA').deleteFlow);
});
function preferencesHarness(){
 const runtime=hookRuntime(),requests=[],writes=[];let session={company:{id:1},user:{id:2}},fail=false,ids=[5];
 const {useOpportunityFlowColors}=loadTypescript(resolve(base+'hooks/useOpportunityFlowColors.ts'),id=>{
  if(id==='react')return runtime.hooks;if(id.endsWith('/authSessionStore'))return{getCachedAuthSession:()=>session};if(id.endsWith('/useAuthorizationRevision'))return{useAuthorizationRevision:()=>0};if(id.endsWith('/flowPersonalColors'))return colors;
  if(id.endsWith('/workspaceState'))return{workspaceStateApi:{get:()=>new Promise(resolve=>requests.push(resolve)),save:async(...args)=>{writes.push(args);if(fail)throw Error('offline');}}};throw Error(id);
 });runtime.render(()=>useOpportunityFlowColors(ids));
 return{runtime,requests,writes,switch:()=>{session={company:{id:9},user:{id:2}};runtime.render();},fail:()=>{fail=true}};
}
test('a late color response from another company never appears in the new workspace',async()=>{
 const h=preferencesHarness();h.switch();h.requests[0]({state:{colors:{new:'#FF6B5E'}}});h.requests[1]({state:{colors:{new:'#C026D3'}}});await h.runtime.flush();assert.equal(h.runtime.result.colors[5].new,'#C026D3');h.runtime.unmount();
});
test('color saves wait for server acknowledgement and failed saves do not change displayed preferences',async()=>{
 const h=preferencesHarness();h.requests[0]({state:{colors:{new:'#FF6B5E'}}});await h.runtime.flush();h.fail();await assert.rejects(h.runtime.result.save(5,{new:'#C026D3'}));await h.runtime.flush();assert.equal(h.runtime.result.colors[5].new,'#FF6B5E');assert.equal(h.writes[0][1],'opportunity-colors-5');h.runtime.unmount();
});
test('factory stage view contains no disabled editing form and personal palette leaves stages unchanged',async()=>{
 const runtime=hookRuntime();let changed=0,personal;
 const {OpportunityFlowStageEditor}=loadTypescript(resolve(base+'modals/OpportunityFlowStageEditor.tsx'),id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:element,jsxs:element};if(id.endsWith('/flowPersonalColors'))return colors;return new Proxy({},{get:(_,key)=>key});
 });let mode='team';runtime.render(()=>OpportunityFlowStageEditor({stages,canEdit:false,busy:false,copy:esMX.flow,onChange:()=>changed++,mode,colors:{},onColorsChange:value=>personal=value,text:flowManagerCopy('es-MX'),colorsReady:true}));
 assert.equal(nodes(runtime.result).filter(n=>n.type==='Input').length,0);
 mode='colors';runtime.render();const purple=nodes(runtime.result).find(n=>n.type==='button'&&n.props['aria-label']==='#C026D3');purple.props.onClick();assert.deepEqual(personal,{new:'#C026D3'});assert.equal(changed,0);runtime.unmount();
});
test('stage removal and terminal movement remain protected while editing custom flows',async()=>{
 const runtime=hookRuntime();const {OpportunityFlowStageEditor}=loadTypescript(resolve(base+'modals/OpportunityFlowStageEditor.tsx'),id=>{if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:element,jsxs:element};if(id.endsWith('/flowPersonalColors'))return colors;return new Proxy({},{get:(_,key)=>key});});
 runtime.render(()=>OpportunityFlowStageEditor({stages,canEdit:true,busy:false,copy:esMX.flow,onChange:()=>assert.fail('Protected action ran'),mode:'team',colors:{},onColorsChange(){},text:flowManagerCopy('es-MX'),colorsReady:true}));
 const remove=nodes(runtime.result).find(n=>n.type==='Button'&&text(n).includes(esMX.flow.remove));assert.equal(remove.props.disabled,true);
 nodes(runtime.result).find(n=>n.type==='button'&&text(n).includes('Ganada')).props.onClick();await runtime.flush();assert.equal(nodes(runtime.result).find(n=>n.type==='Button'&&n.props['aria-label']===esMX.flow.moveUp).props.disabled,true);runtime.unmount();
});
test('an uncertain retirement keeps its command identity, blocks dismissal and safely retries',async()=>{
 const oldWindow=global.window;global.window={addEventListener(){},removeEventListener(){}};
 const runtime=hookRuntime(),sent=[];let closes=0,saved=0,fail=true;
 const {OpportunityFlowRetirementModal}=loadTypescript(resolve(base+'modals/OpportunityFlowRetirementModal.tsx'),id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:element,jsxs:element};
  if(id.endsWith('/authSessionStore'))return{getCachedAuthSession:()=>({company:{id:1},user:{id:2}})};
  if(id.endsWith('/salesApi'))return{salesApi:{previewFlowRetirement:async()=>({signature:'a'.repeat(64),opportunityCount:0,stages:[]}),retireOpportunityFlow:async(_,command)=>{sent.push(command);if(fail)throw Error('Connection lost');return{flowId:2,targetFlowId:1};}}};
  if(id.endsWith('/apiClient'))return{ApiClientError:class extends Error{}};
  if(id.endsWith('/flowManagerCopy'))return loadTypescript(resolve(base+'modals/flowManagerCopy.ts'),()=>({}));
  return new Proxy({},{get:(_,key)=>key});
 });
 try{runtime.render(()=>OpportunityFlowRetirementModal({flow:{id:2,name:'Test',stages:[],factory:false},flows:[{id:1,name:'Factory',factory:true,stages:[]}],copy:esMX.flow,text:flowManagerCopy('es-MX'),onClose:()=>closes++,onSaved:async()=>saved++}));await runtime.flush();
 nodes(runtime.result).find(n=>n.type==='Button'&&text(n).includes('Revisar y confirmar')).props.onClick();await runtime.flush();
 nodes(runtime.result).find(n=>n.type==='Button'&&text(n).includes('Eliminar flujo')).props.onClick();await runtime.flush();
 assert.equal(runtime.result.props.busy,true);runtime.result.props.onOpenChange(false);assert.equal(closes,0);assert.equal(saved,0);
 fail=false;nodes(runtime.result).find(n=>n.type==='Button'&&text(n).includes('Reintentar')).props.onClick();await runtime.flush();assert.equal(saved,1);assert.equal(sent.length,2);assert.deepEqual(sent[0],sent[1]);
 }finally{runtime.unmount();global.window=oldWindow;}
});
test('duplicating a flow clears counts and can be created directly without editing its suggested name',async()=>{
 const previousWindow=global.window;global.window={addEventListener(){},removeEventListener(){}};const runtime=hookRuntime();let created=0;
 const utils=loadTypescript(resolve(base+'utils/prospectosFlow.ts'),()=>({}));const localized=loadTypescript(resolve(base+'modals/flowManagerCopy.ts'),()=>({}));
 const flow={id:2,name:'Consultoría',key:'consultoria',factory:false,defaultFlow:false,stages};
 const {OpportunityFlowManagerModal}=loadTypescript(resolve(base+'modals/OpportunityFlowManagerModal.tsx'),id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:element,jsxs:element};if(id.endsWith('/context'))return{useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
  if(id.endsWith('/prospectosFlow'))return utils;if(id.endsWith('/flowPersonalColors'))return colors;if(id.endsWith('/flowManagerCopy'))return localized;
  if(id.endsWith('/salesCrmContext'))return{defaultOpportunityFlowStages:stages};return new Proxy({},{get:(_,key)=>key});
 });
 try{runtime.render(()=>OpportunityFlowManagerModal({open:true,flows:[flow],selectedFlowId:2,canManage:true,loadError:'',copy:esMX.flow,localizedDefaultLabels:{},onOpenChange(){},onRetry(){},onSelectFlow:async()=>{},onCreate:async(name,copied)=>{created++;assert.equal(name,'Copia de Consultoría');assert.ok(copied.every(s=>s.opportunityCount===0));return{...flow,id:3,name,stages:copied};},onUpdate:async()=>assert.fail('Copy edited original')}));await runtime.flush();
 nodes(runtime.result).find(n=>n.type==='OpportunityFlowListCard').props.onDuplicate();await runtime.flush();const create=nodes(runtime.result).find(n=>n.type==='Button'&&text(n).includes(esMX.flow.create));assert.equal(create.props.disabled,false);create.props.onClick();await runtime.flush();assert.equal(created,1);
 }finally{runtime.unmount();global.window=previousWindow;}
});

test('custom stage keys never inherit colors from object prototypes',()=>{
 const stage={...stages[0],key:'constructor'};assert.equal(colors.applyFlowColors([stage],{})[0].personalColor,undefined);assert.equal(colors.applyFlowColors([stage],colors.normalizeFlowColors({constructor:'#123456'}))[0].personalColor,'#123456');
});
