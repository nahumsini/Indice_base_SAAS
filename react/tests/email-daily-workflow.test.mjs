import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypescript, hookRuntime } from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Email/',import.meta.url);
const load=(file,resolve=()=>({}))=>loadTypescript(new URL(file,root).pathname,resolve);
const language={useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
const editorCopy=loadTypescript(new URL('../src/app/components/mail-editor/mailEditorCopy.ts',import.meta.url).pathname,()=>language);
const daily=load('mailDailyCopy.ts',()=>language),mailbox=load('mailboxCopy.ts',()=>language),extra=load('translations.extra.ts'),translations=load('translations.ts',id=>id.endsWith('translations.extra')?extra:language);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},stub=new Proxy({},{get:(_,key)=>key});
const nodes=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const {organizeMail}=load('mailBulk.ts');
const model=load('mailboxModel.ts');
class ApiClientError extends Error {constructor(status){super();this.status=status;}}
function composer(api){
 const timers=new Map();let serial=0;globalThis.window={setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial;},clearTimeout(id){timers.delete(id);},addEventListener(){},removeEventListener(){}};
 const runtime=hookRuntime(),done=[];const account={id:'account',version:4,email:'owner@example.com',displayName:'Owner'};
 const {MailComposer}=load('MailComposer.tsx',id=>{
  if(id==='react')return runtime.hooks;if(id.endsWith('/mailEditorCopy'))return editorCopy;if(id==='react/jsx-runtime')return jsx;
  if(id.endsWith('/mailDailyCopy'))return daily;if(id.endsWith('/mailboxCopy'))return mailbox;if(id.endsWith('/translations'))return translations;
  if(id.endsWith('/mailboxModel'))return model;if(id.endsWith('/MailRichEditor'))return {MailRichEditor:'MailRichEditor',plainMailHtml:v=>v};
  if(id.endsWith('/apiClient'))return {ApiClientError};
  if(id.endsWith('/mailboxApi'))return {mailboxApi:{preferences:async()=>({signature:'Equipo de prueba'}),...api}};return stub;
 });
 runtime.render(()=>MailComposer({account,initial:{version:0,accountVersion:4,to:[],cc:[],bcc:[],subject:'',bodyText:'',replyToMessageId:null},onClose(){},onDone:v=>done.push(v)}));
 return {runtime,done,async tick(){for(const [id,t] of [...timers])if(t.ms===1500&&timers.has(id)){timers.delete(id);t.fn();await runtime.flush();}},body(value){nodes(runtime.result).find(n=>n.type==='MailRichEditor').props.onChange(value,`<p>${value}</p>`);},button(label){return nodes(runtime.result.props.footer).find(n=>n.type==='Button'&&n.props.children===label);}};
}
test('bulk operations are sequential, report partial failure and never retry',async()=>{
 const calls=[],results=[],progress=[];let active=0;
 const result=await organizeMail([{id:'one'},{id:'two'},{id:'three'}],async m=>{assert.equal(active++,0);calls.push(m.id);await Promise.resolve();active--;if(m.id==='two')throw Error('unknown result');return {...m,version:2};},m=>results.push(m.id),v=>progress.push(v),()=>true);
 assert.deepEqual(calls,['one','two','three']);assert.deepEqual(results,['one','three']);assert.deepEqual(progress,[1,2,3]);assert.deepEqual(result,{completed:2,failed:['two']});
});
test('switching account or unmounting stops a pending bulk batch without publishing stale results',async()=>{
 let live=true;const calls=[],updates=[];
 await organizeMail([{id:'one'},{id:'two'}],async m=>{calls.push(m.id);live=false;return m;},m=>updates.push(m),()=>{},()=>live);
 assert.deepEqual(calls,['one']);assert.deepEqual(updates,[]);
});
test('autosave uses current optimistic version and never loses text typed while saving',async()=>{
 const writes=[];let finish;
 const h=composer({save:(a,id,value)=>{writes.push(value);return new Promise(resolve=>{finish=()=>resolve({...value,id,state:'DRAFT',version:value.version+1});});},send:()=>assert.fail('autosave cannot send')});
 await h.runtime.flush();await h.tick();assert.equal(writes.length,0);
 h.body('Primera versión');await h.runtime.flush();await h.tick();assert.equal(writes.length,1);
 h.body('Texto escrito mientras guarda');await h.runtime.flush();await h.tick();assert.equal(writes.length,1,'no overlapping write');
 finish();await h.runtime.flush();assert.equal(nodes(h.runtime.result).find(n=>n.type==='MailRichEditor').props.text,'Texto escrito mientras guarda');
 await h.tick();assert.equal(writes.length,2);assert.equal(writes[1].version,1);assert.equal(writes[1].bodyText,'Texto escrito mientras guarda');finish();await h.runtime.flush();assert.equal(h.done.length,0,'autosave stays in composer');h.runtime.unmount();
});
test('failed autosave pauses retries, preserves input and manual save resumes with valid version',async()=>{
 let calls=0;
 const h=composer({get:async()=>{throw new ApiClientError(404);},save:async(a,id,value)=>{calls++;if(calls===1)throw Error('offline');return {...value,id,state:'DRAFT',version:1};}});
 h.body('Texto conservado');await h.runtime.flush();await h.tick();await h.runtime.flush();assert.equal(calls,1);
 h.body('Continúo escribiendo');await h.runtime.flush();await h.tick();assert.equal(calls,1);
 assert.equal(nodes(h.runtime.result).find(n=>n.props?.role==='alert').props.children,daily.useMailDailyCopy().saveFailed);
 h.button(translations.useEmailCopy().copy.saveDraft).props.onClick();await h.runtime.flush();assert.equal(calls,2);assert.equal(h.done[0].bodyText,'Continúo escribiendo');h.runtime.unmount();
});
test('send requires review, double click submits once and ambiguous outcome only checks status',async()=>{
 const calls=[];let rejectSend;
 const h=composer({save:async(a,id,value)=>({...value,id,state:'DRAFT',version:value.version+1}),send:()=>{calls.push('send');return new Promise((_,reject)=>{rejectSend=reject;});},get:async()=>({state:'UNKNOWN'})});
 const recipients=nodes(h.runtime.result).find(n=>n.type==='MailRecipients');recipients.props.onChange('client@example.com, ');
 nodes(h.runtime.result).find(n=>n.type==='Input').props.onChange({target:{value:'Propuesta'}});h.body('Texto');await h.runtime.flush();
 h.button(mailbox.useMailboxCopy().sendReview).props.onClick();await h.runtime.flush();assert.equal(h.runtime.result.props.title,mailbox.useMailboxCopy().reviewTitle);
 const send=nodes(h.runtime.result.props.footer).find(n=>n.type==='Button');send.props.onClick();send.props.onClick();await h.runtime.flush();assert.deepEqual(calls,['send']);
 rejectSend(Error('response lost'));await h.runtime.flush();await h.tick();assert.deepEqual(calls,['send']);
 nodes(h.runtime.result.props.footer).find(n=>n.type==='Button').props.onClick();await h.runtime.flush();assert.deepEqual(h.done,[{state:'UNKNOWN'}]);assert.deepEqual(calls,['send']);h.runtime.unmount();
});
test('signature and template insertion preserve existing text and draft subject',async()=>{
 const h=composer({save:()=>assert.fail('no timer fired')});await h.runtime.flush();h.body('Texto original');await h.runtime.flush();
 nodes(h.runtime.result).find(n=>n.type==='MailComposerLibrary').props.onTemplate('Asunto sugerido','Texto plantilla');await h.runtime.flush();
 assert.equal(nodes(h.runtime.result).find(n=>n.type==='Input').props.value,'Asunto sugerido');
 nodes(h.runtime.result).find(n=>n.type==='Button'&&n.props.children===daily.useMailDailyCopy().insertSignature).props.onClick();await h.runtime.flush();
 assert.equal(nodes(h.runtime.result).find(n=>n.type==='MailRichEditor').props.text,'Texto original\n\nTexto plantilla\n\nEquipo de prueba');h.runtime.unmount();
});

test('lost autosave response is reconciled before retry without overwriting a concurrent draft',async()=>{
 const writes=[];let server;
 const h=composer({save:async(a,id,value)=>{writes.push(value);server={...value,id,state:'DRAFT',version:value.version+1};if(writes.length===1)throw Error('response lost');return server;},get:async()=>server});
 h.body('Primer texto');await h.runtime.flush();await h.tick();h.body('Texto nuevo conservado');await h.runtime.flush();
 h.button(translations.useEmailCopy().copy.saveDraft).props.onClick();await h.runtime.flush();assert.equal(writes[1].version,1);assert.equal(h.done[0].bodyText,'Texto nuevo conservado');h.runtime.unmount();
 const protectedWrites=[];const other=composer({save:async(a,id,value)=>{protectedWrites.push(value);throw Error('lost');},get:async()=>({id:'draft',state:'DRAFT',version:9,subject:'Other editor',bodyText:'Other edit',to:[],cc:[],bcc:[]})});
 other.body('Local text');await other.runtime.flush();await other.tick();other.button(translations.useEmailCopy().copy.saveDraft).props.onClick();await other.runtime.flush();assert.equal(protectedWrites.length,1);assert.equal(other.done.length,0);assert.equal(nodes(other.runtime.result).find(n=>n.type==='MailRichEditor').props.text,'Local text');assert.equal(nodes(other.runtime.result).find(n=>n.props?.role==='alert').props.children,mailbox.useMailboxCopy().conflict);other.runtime.unmount();
});
