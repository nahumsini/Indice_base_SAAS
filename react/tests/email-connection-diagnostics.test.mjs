import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Email/',import.meta.url);
const load=(name,resolve=()=>({}))=>loadTypescript(new URL(name,root).pathname,resolve);
const extra=load('translations.extra.ts');
const {connectionTestMessage}=load('connectionDiagnostics.ts');
function labels(locale){return load('translations.ts',id=>id.endsWith('translations.extra')?extra:{useLanguage:()=>({currentLanguage:{code:locale}})}).useEmailCopy().copy;}
const codes=['AUTHENTICATION_FAILED','DNS_FAILED','CONNECTION_TIMEOUT','CONNECTION_FAILED','TLS_FAILED','DESTINATION_REJECTED'];
test('all locales distinguish each connection category and unknown diagnostics stay generic',()=>{
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){
  const copy=labels(locale),messages=codes.map(code=>connectionTestMessage(code,copy));
  assert.equal(new Set(messages).size,codes.length);assert.ok(messages.every(x=>x&&x!==copy.testFailure));
  for(const unknown of [undefined,null,'UNKNOWN','provider-private-password'])assert.equal(connectionTestMessage(unknown,copy),copy.testFailure);
 }
});
function nodes(n){if(n==null||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return[n,...nodes(n.props?.children)];}
const contains=(n,t)=>n===t||Array.isArray(n)&&n.some(x=>contains(x,t))||n&&typeof n==='object'&&contains(n.props?.children,t);
function setup(result){
 const runtime=hookRuntime(),copy=labels('es-MX'),calls=[];
 const account={id:'synthetic',label:'Synthetic account',email:'sender@example.com',receiveProtocol:'IMAP',version:1,smtpStatus:'NOT_TESTED',receiveStatus:'NOT_TESTED'};
 const {EmailAccountsWorkspace}=load('EmailAccountsWorkspace.tsx',id=>{
  if(id==='react')return runtime.hooks;
  if(id==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
  if(id.endsWith('emailExperienceCopy'))return load('emailExperienceCopy.ts',()=>({useLanguage:()=>({currentLanguage:{code:'es-MX'}})}));
  if(id.endsWith('translations'))return{useEmailCopy:()=>({copy,locale:'es-MX'})};
  if(id.endsWith('connectionDiagnostics'))return{connectionTestMessage};
  if(id.endsWith('useAuthorizationRevision'))return{useAuthorizationRevision:()=>0};
  if(id.endsWith('emailApi'))return{emailAccountsApi:{list:async()=>({items:[account],configurationAvailable:true}),test:async(a,ch)=>{calls.push(ch);return{...a,...result};}}};
  return new Proxy({},{get:(_,key)=>key});
 });
 runtime.render(()=>EmailAccountsWorkspace({}));return{runtime,copy,calls};
}
test('SMTP rejection shows the safe authentication reason and updates only the tested status',async()=>{
 const s=setup({smtpStatus:'ERROR',failureCode:'AUTHENTICATION_FAILED'});await s.runtime.flush();
 const button=nodes(s.runtime.result).find(n=>n.type==='Button'&&contains(n.props.children,s.copy.testSmtp));assert.ok(button);await button.props.onClick();await s.runtime.flush();
 const error=nodes(s.runtime.result).find(n=>n.props?.role==='alert');assert.equal(error.props.children,`SMTP: ${s.copy.testAuthentication}`);assert.deepEqual(s.calls,['SMTP']);
 const statuses=nodes(s.runtime.result).filter(n=>typeof n.type==='function'&&n.type.name==='ConnectionBadge').map(n=>n.props.status);assert.deepEqual(statuses,['ERROR','NOT_TESTED']);s.runtime.unmount();
});
test('successful reception displays verified without a stale failure',async()=>{
 const s=setup({receiveStatus:'VERIFIED',failureCode:null});await s.runtime.flush();
 const button=nodes(s.runtime.result).find(n=>n.type==='Button'&&contains(n.props.children,s.copy.testReceive));await button.props.onClick();await s.runtime.flush();
 assert.ok(!nodes(s.runtime.result).some(n=>n.props?.role==='alert'));assert.ok(contains(nodes(s.runtime.result).find(n=>n.props?.role==='status').props.children,s.copy.verified));assert.deepEqual(s.calls,['RECEIVE']);s.runtime.unmount();
});
