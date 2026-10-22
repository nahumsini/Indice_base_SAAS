import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/ComplementaryModules/Email/',import.meta.url);
const load=(file,resolve)=>loadTypescript(new URL(file,root).pathname,resolve);
const language={useLanguage:()=>({currentLanguage:{code:'es-MX'}})};
const editorCopy=loadTypescript(new URL('../src/app/components/mail-editor/mailEditorCopy.ts',import.meta.url).pathname,()=>language);
const extra=load('translations.extra.ts',()=>({}));
const translations=load('translations.ts',id=>id.endsWith('translations.extra')?extra:language);
const experience=load('emailExperienceCopy.ts',()=>language);
const mailbox=load('mailboxCopy.ts',()=>language);
const workspaceCopy=load('mailWorkspaceCopy.ts',()=>language);
const completion=load('completionCopy.ts',()=>language);
const folderPresentation=load('mailFolderPresentation.ts',()=>({}));
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
const stub=new Proxy({},{get:(_,key)=>key});
const nodes=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
class ApiClientError extends Error {}
function resolver(runtime,api={}){return id=>{
 if(id==='react')return runtime.hooks;if(id.endsWith('/mailEditorCopy'))return editorCopy;if(id==='react/jsx-runtime')return jsx;
 if(id.endsWith('/translations'))return translations;
 if(id.endsWith('/emailExperienceCopy'))return experience;
 if(id.endsWith('/mailWorkspaceCopy'))return workspaceCopy;
 if(id.endsWith('/mailFormat'))return {cleanEditorHtml:value=>value};
 if(id.endsWith('/mailboxCopy'))return mailbox;
 if(id.endsWith('/mailDailyCopy'))return load('mailDailyCopy.ts',()=>language);
 if(id.endsWith('/mailBulk'))return load('mailBulk.ts',()=>({}));
 if(id.endsWith('/completionCopy'))return completion;
 if(id.endsWith('/mailFolderPresentation'))return folderPresentation;
 if(id.endsWith('/apiClient'))return {ApiClientError};
 if(id.endsWith('/emailApi'))return {emailAccountsApi:api};
 return stub;
};}
const saved={id:'synthetic-account',label:'Cuenta ficticia',email:'demo@example.com',displayName:'Demo',smtpHost:'mail.example.com',smtpPort:465,smtpSecurity:'TLS',smtpUsername:'demo@example.com',hasSmtpPassword:true,receiveProtocol:'IMAP',receiveHost:'mail.example.com',receivePort:993,receiveUsername:'demo@example.com',hasReceivePassword:true,mailingEnabled:true,version:4};
const copy=translations.useEmailCopy().copy;
test('account editing preserves secrets, payload and unsaved input after a rejected save',async()=>{
 globalThis.window={addEventListener(){},removeEventListener(){}};
 const runtime=hookRuntime(),requests=[];
 const {AccountEditor}=load('AccountEditor.tsx',resolver(runtime,{save:async(id,input)=>{requests.push({id,input});throw new Error('synthetic failure');}}));
 let closed=0;runtime.render(()=>AccountEditor({account:saved,onClose:()=>closed++,onSaved:()=>assert.fail('failed save must not report success')}));
 const inputs=()=>nodes(runtime.result).filter(n=>n.type==='Input');
 assert.deepEqual(inputs().filter(n=>n.props.type==='password').map(n=>({value:n.props.value,required:n.props.required})),[{value:'',required:false},{value:'',required:false}]);
 inputs().find(n=>n.props['aria-label']===copy.label).props.onChange({target:{value:'Nombre pendiente'}});await runtime.flush();
 nodes(runtime.result).find(n=>n.type==='form').props.ref.current={reportValidity:()=>true};
 runtime.result.props.footer.props.onClick();await runtime.flush();
 assert.equal(requests.length,1);assert.equal(requests[0].id,saved.id);assert.equal(requests[0].input.version,4);
 assert.equal(requests[0].input.smtpPassword,'');assert.equal(requests[0].input.receivePassword,'');
 assert.equal(requests[0].input.label,'Nombre pendiente');assert.equal(inputs().find(n=>n.props['aria-label']===copy.label).props.value,'Nombre pendiente');
 assert.equal(nodes(runtime.result).find(n=>n.props?.role==='alert').props.children,copy.saveError);
 runtime.result.props.footerLeading.props.onClick();await runtime.flush();assert.equal(runtime.result.props.modalType,'confirmation');assert.equal(closed,0);runtime.unmount();
});
test('new accounts retain required passwords and secure port choices',()=>{
 globalThis.window={addEventListener(){},removeEventListener(){}};const runtime=hookRuntime();
 const {AccountEditor}=load('AccountEditor.tsx',resolver(runtime));runtime.render(()=>AccountEditor({account:null,onClose(){},onSaved(){}}));
 assert.equal(nodes(runtime.result).filter(n=>n.type==='Input'&&n.props.type==='password'&&n.props.required).length,1);
 assert.deepEqual(nodes(runtime.result).filter(n=>n.type==='option').map(n=>n.props.value),[465,587,'NONE','IMAP','POP3']);runtime.unmount();
});
test('message rows preserve selection, unread/attachment signals and open the chosen message',()=>{
 const runtime=hookRuntime(),resolve=resolver(runtime),opens=[];
 const {MailMessageList}=load('MailMessageList.tsx',id=>id.endsWith('/MailMessageDetail')?{messageState:()=> 'Recibido'}:resolve(id));
 const message={id:'message-demo',state:'RECEIVED',fromName:'Contacto de prueba',fromAddress:'contact@example.com',to:['demo@example.com'],subject:'Propuesta de prueba',read:false,starred:true,hasAttachments:true,occurredAt:'2026-10-18T18:00:00Z'};
 const tree=MailMessageList({messages:[message],selectedId:message.id,busy:false,onOpen:m=>opens.push(m)});
 const button=nodes(tree).find(n=>n.type==='button');assert.equal(button.props['aria-pressed'],true);button.props.onClick();assert.deepEqual(opens,[message]);
 assert.equal(JSON.stringify(tree).includes('Recibido'),false);
 assert.ok(nodes(tree).some(n=>n.props?.['aria-label']===copy.notRead));assert.ok(nodes(tree).some(n=>n.props?.['aria-label']===experience.useEmailExperienceCopy().attachment));
});
test('reply tools precede content and preserve the owner actions',()=>{
 const runtime=hookRuntime(),calls=[];
 const {MailMessageDetail}=load('MailMessageDetail.tsx',resolver(runtime));
 const message={id:'demo-message',folderId:'inbox',state:'RECEIVED',subject:'Prueba',occurredAt:'2026-10-18T18:00:00Z',fromName:'Prueba',fromAddress:'contact@example.com',to:['demo@example.com'],cc:[],bcc:[],bodyText:'Contenido ficticio',read:true};
 runtime.render(()=>MailMessageDetail({account:'demo-account',accountVersion:1,message,folders:[{id:'inbox',kind:'INBOX'}],busy:false,onBack(){},onWrite:mode=>calls.push(mode),onAction(){},onDiscard(){}}));
 const tree=nodes(runtime.result),bodyIndex=tree.findIndex(n=>n.type==='SafeMailView');
 const actions=tree.filter(n=>['Button','DropdownMenuItem'].includes(n.type));for(const action of actions.filter(action=>[copy.reply,copy.forward,mailbox.useMailboxCopy().replyAll].some(label=>JSON.stringify(action.props.children).includes(label))))(action.props.onClick??action.props.onSelect)();
 assert.deepEqual(calls,['reply','all','forward']);assert.ok(tree.findIndex(n=>n.type==='Button'&&JSON.stringify(n.props.children).includes(copy.reply))<bodyIndex);runtime.unmount();
});

test('custom folder move and safe send failure are exposed without sending again',()=>{
 const runtime=hookRuntime(),calls=[];const {MailMessageDetail}=load('MailMessageDetail.tsx',resolver(runtime));
 const message={id:'m',folderId:'inbox',state:'RECEIVED',subject:'Prueba',occurredAt:'2026-10-18T18:00:00Z',fromAddress:'client@example.com',to:[],cc:[],bcc:[],read:true};
 const props={account:'a',accountVersion:1,message,folders:[{id:'inbox',kind:'INBOX',name:'INBOX'},{id:'clients',kind:'CUSTOM',name:'Clientes'}],busy:false,onBack(){},onWrite:mode=>calls.push(mode),onAction:(...args)=>calls.push(args),onDiscard(){}};
 runtime.render(()=>MailMessageDetail(props));
 const move=nodes(runtime.result).find(n=>n.type==='DropdownMenuItem'&&n.props.children==='Clientes');move.props.onSelect();assert.deepEqual(calls,[['MOVE','clients']]);
 props.message={...message,state:'FAILED',failureCode:'email_send_recipient_rejected'};runtime.render(()=>MailMessageDetail(props));
 assert.equal(nodes(runtime.result).find(n=>n.props?.role==='status').props.children,workspaceCopy.useMailWorkspaceCopy().recipient);
 props.message={...message,state:'UNKNOWN',failureCode:'email_send_unknown'};runtime.render(()=>MailMessageDetail(props));
 assert.equal(nodes(runtime.result).filter(n=>n.type==='Button').length,1);runtime.unmount();
});
test('folder editor retains input on failure and blocks double submit',async()=>{
 const runtime=hookRuntime();let calls=0;let reject;const api={createFolder:()=>{calls++;return new Promise((_,no)=>{reject=no;});}};
 const base=resolver(runtime);const {MailFolderDialog}=load('MailFolderDialog.tsx',id=>id.endsWith('/mailboxApi')?{mailboxApi:api}:base(id));
 runtime.render(()=>MailFolderDialog({account:{id:'a',version:1},onClose(){},onSaved(){assert.fail('rejected operation');}}));
 nodes(runtime.result).find(n=>n.type==='Input').props.onChange({target:{value:'Clientes'}});await runtime.flush();
 const form=nodes(runtime.result).find(n=>n.type==='form');void form.props.onSubmit({preventDefault(){}});void form.props.onSubmit({preventDefault(){}});assert.equal(calls,1);
 reject(new Error('synthetic'));await runtime.flush();
 assert.equal(nodes(runtime.result).find(n=>n.type==='Input').props.value,'Clientes');assert.ok(nodes(runtime.result).some(n=>n.props?.role==='alert'));runtime.unmount();
});
test('workspace routes filters to the server and synchronizes the selected remote folder',async()=>{
 const timers=new Map();let timerId=0;const lists=[],syncs=[];
 globalThis.window={setTimeout(fn,delay){timers.set(++timerId,{fn,delay});return timerId;},clearTimeout(id){timers.delete(id);},setInterval(){return 1;},clearInterval(){}};
 globalThis.document={visibilityState:'visible'};
 const runtime=hookRuntime(),base=resolver(runtime);
 const account={id:'a',email:'owner@example.com',label:'Owner',receiveProtocol:'IMAP',version:1};
 const workspace={folders:[{id:'inbox',kind:'INBOX',name:'INBOX'},{id:'clients',kind:'CUSTOM',name:'Clientes'}],lastSyncAt:'2026-10-18T18:00:00Z'};
 const api={accounts:async()=>[account],workspace:async()=>workspace,list:async(...args)=>{lists.push(args);return {items:[],hasMore:false};},sync:async(...args)=>{syncs.push(args);return workspace;}};
 const {LiveMailboxWorkspace}=load('LiveMailboxWorkspace.tsx',id=>id.endsWith('/mailboxApi')?{mailboxApi:api}:id.endsWith('/useWorkspaceNavigationMemory')?{useWorkspaceNavigationMemory(){}}:base(id));
 runtime.render(()=>LiveMailboxWorkspace({}));await runtime.flush();
 async function tick(){for(const [id,task] of [...timers]){if(!timers.has(id))continue;timers.delete(id);task.fn();await runtime.flush();}}
 await tick();await tick();assert.equal(syncs[0][0],'a');assert.equal(syncs[0][1],'inbox');
 nodes(runtime.result).find(n=>n.type==='MailWorkspaceFilters').props.onQuick('STARRED');await runtime.flush();await tick();
 assert.equal(lists.at(-1)[5],'STARRED');
 const nav=nodes(runtime.result).find(n=>n.type==='MailFolderRail');nav.props.onChange('clients');await runtime.flush();await tick();await tick();
 assert.equal(syncs.at(-1)[1],'clients');assert.equal(lists.at(-1)[1],'clients');assert.equal(lists.at(-1)[5],'ALL');runtime.unmount();
});


test('friendly folder names never combine distinct provider folders or change their authority',()=>{
 const folders=[{id:'a',name:'INBOX.Archive',kind:'ARCHIVE'},{id:'j',name:'INBOX.Junk',kind:'CUSTOM'},{id:'s',name:'INBOX.spam',kind:'JUNK'},{id:'c',name:'INBOX.Clientes',kind:'CUSTOM'},{id:'n',name:'Clientes',kind:'CUSTOM'}];
 const labels={ARCHIVE:'Archivo',JUNK:'Spam'};
 const shown=folderPresentation.presentMailFolders(folders,labels);
 assert.deepEqual(shown.map(f=>[f.id,f.name,f.kind]),folders.map(f=>[f.id,f.name,f.kind]));
 assert.deepEqual(shown.map(f=>f.label),['Archivo','Junk','Spam','Clientes · INBOX.Clientes','Clientes · Clientes']);
});

test('formatted reader retains the isolated sandbox and text alternative',async()=>{
 const runtime=hookRuntime();const {SafeMailView}=load('SafeMailView.tsx',resolver(runtime));
 runtime.render(()=>SafeMailView({text:'Plain alternative',html:'<table><tr><td>Sanitized content</td></tr></table>'}));
 const frame=nodes(runtime.result).find(n=>n.type==='iframe');
 assert.equal(frame.props.sandbox,'allow-popups allow-popups-to-escape-sandbox');assert.equal(frame.props.referrerPolicy,'no-referrer');
 assert.ok(frame.props.srcDoc.includes("default-src 'none'"));assert.ok(frame.props.srcDoc.includes("form-action 'none'"));
 assert.equal(nodes(runtime.result).find(n=>n.type==='details').props.open,undefined);
 nodes(runtime.result).find(n=>n.type==='Button').props.onClick();await runtime.flush();
 assert.equal(nodes(runtime.result).some(n=>n.type==='iframe'),false);
 assert.ok(nodes(runtime.result).some(n=>n.type==='p'&&n.props.children==='Plain alternative'));
 nodes(runtime.result).find(n=>n.type==='Button').props.onClick();await runtime.flush();
 assert.equal(nodes(runtime.result).find(n=>n.type==='iframe').props.sandbox,'allow-popups allow-popups-to-escape-sandbox');runtime.unmount();
});


test('folder layout memory and expanded reading preserve selection, scroll and request scope',async()=>{
 const timers=new Map(),listeners=new Map();let timerId=0, memory;const lists=[],opens=[];
 globalThis.window={setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},setInterval(){return 1;},clearInterval(){},addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);}};
 let menuOpen=false;globalThis.document={visibilityState:'visible',querySelector(){return menuOpen?{}:null;}};
 const runtime=hookRuntime(),base=resolver(runtime);
 const account={id:'a',email:'owner@example.com',label:'Owner',receiveProtocol:'IMAP',version:1};
 const workspace={folders:[{id:'inbox',kind:'INBOX',name:'INBOX'}],lastSyncAt:'2026-10-18T18:00:00Z'};
 const message={id:'m',folderId:'inbox',state:'RECEIVED',read:true,subject:'Test',to:[],cc:[],bcc:[]};
 const api={accounts:async()=>[account],workspace:async()=>workspace,list:async(...args)=>{lists.push(args);return {items:[message],hasMore:false};},sync:async()=>workspace,open:async(...args)=>{opens.push(args);return message;}};
 const {LiveMailboxWorkspace}=load('LiveMailboxWorkspace.tsx',id=>id.endsWith('/mailboxApi')?{mailboxApi:api}:id.endsWith('/useWorkspaceNavigationMemory')?{useWorkspaceNavigationMemory(options){memory=options;}}:base(id));
 runtime.render(()=>LiveMailboxWorkspace({}));await runtime.flush();
 async function tick(){for(const [id,fn] of [...timers]){if(!timers.has(id))continue;timers.delete(id);fn();await runtime.flush();}}
 await tick();await tick();
 assert.equal(memory.moduleKey,'email');assert.equal(memory.tabKey,'mail');
 memory.onRestore({...memory.state,foldersCollapsed:'invalid'});await runtime.flush();assert.equal(memory.state.foldersCollapsed,false);
 nodes(runtime.result).find(n=>n.type==='Button'&&n.props['aria-label']===workspaceCopy.useMailWorkspaceCopy().collapseFolders).props.onClick();await runtime.flush();
 assert.equal(memory.state.foldersCollapsed,true);
 const requestCount=lists.length;
 const list=nodes(runtime.result).find(n=>n.props?.['data-mail-message-list']!==undefined);list.props.ref.current={scrollTop:222};
 nodes(runtime.result).find(n=>n.type==='MailMessageList').props.onOpen(message);await runtime.flush();
 const detail=()=>nodes(runtime.result).find(n=>n.type==='MailMessageDetail');
 detail().props.onToggleExpanded();await runtime.flush();
 assert.equal(detail().props.expanded,true);assert.equal(detail().props.message.id,'m');
 assert.ok(nodes(runtime.result).some(n=>n.type==='MailMessageList')); // Remains mounted while hidden.
 assert.equal(memory.state.readerExpanded,undefined);assert.equal(memory.state.selected,undefined);
 menuOpen=true;listeners.get('keydown')({key:'Escape'});await runtime.flush();assert.equal(detail().props.expanded,true);
 menuOpen=false;listeners.get('keydown')({key:'Escape'});await runtime.flush();
 assert.equal(detail().props.expanded,false);assert.equal(detail().props.message.id,'m');assert.equal(list.props.ref.current.scrollTop,222);
 assert.equal(memory.state.foldersCollapsed,true);assert.equal(lists.length,requestCount);assert.equal(opens.length,1);
 nodes(runtime.result).find(n=>n.type==='Button'&&n.props['aria-label']===workspaceCopy.useMailWorkspaceCopy().folders).props.onClick();await runtime.flush();
 assert.equal(nodes(runtime.result).find(n=>n.type==='Sheet').props.open,true);
 nodes(runtime.result).find(n=>n.type==='MailFolderRail').props.onChange('INBOX');await runtime.flush();
 assert.equal(nodes(runtime.result).find(n=>n.type==='Sheet').props.open,false);assert.equal(memory.state.foldersCollapsed,true);
 runtime.unmount();
});


test('canonical mailbox filters use shared controls, search first, and explicit reset actions',()=>{
 const runtime=hookRuntime(),calls=[];const base=resolver(runtime);
 const {MailWorkspaceFilters}=load('MailWorkspaceFilters.tsx',id=>id.endsWith('/frontend-os')?{
   ...Object.fromEntries(['IndiceFilterBar','IndiceFilterDisclosureActions','IndiceFilterSearch','IndiceFilterSelect'].map(key=>[key,key])),
   useIndiceFilterDisclosureCopy:()=>({clearFilters:'Limpiar filtros',moreFilters:'Más filtros'}),
 }:base(id));
 const props={accounts:[{id:'a',label:'Demo',email:'owner@example.com'}],accountId:'a',query:'proposal',quick:'STARRED',busy:false,
   onQuery:value=>calls.push(['query',value]),onAccount:value=>calls.push(['account',value]),onQuick:value=>calls.push(['quick',value]),onClear:()=>calls.push(['clear'])};
 runtime.render(()=>MailWorkspaceFilters(props));
 const bar=nodes(runtime.result).find(n=>n.type==='IndiceFilterBar');
 assert.equal(bar.props.title,'Filtros');
 assert.deepEqual(nodes(bar.props.children).map(n=>n.type),['IndiceFilterSearch','IndiceFilterSelect','IndiceFilterSelect']);
 const search=nodes(bar.props.children)[0];search.props.onValueChange('client');search.props.onClear();
 const selectors=nodes(bar.props.children).filter(n=>n.type==='IndiceFilterSelect');
 selectors[0].props.onValueChange('a');selectors[1].props.onValueChange('UNREAD');
 assert.equal(bar.props.summary.props.showAdvancedToggle,false);assert.equal(bar.props.summary.props.hasActiveFilters,true);
 bar.props.summary.props.onClear();assert.deepEqual(calls,[['query','client'],['query',''],['account','a'],['quick','UNREAD'],['clear']]);
 runtime.render(()=>MailWorkspaceFilters({...props,busy:true}));assert.equal(runtime.result.props.disabled,true);
 assert.ok(nodes(runtime.result).filter(n=>n.type==='IndiceFilterSelect').every(n=>n.props.options.every(o=>o.disabled)));runtime.unmount();
});

test('canonical title actions and filter reset retain mailbox scope, paging and compose ownership',async()=>{
 const timers=new Map(),lists=[];let timerId=0,memory,navigated=0;
 globalThis.window={setTimeout(fn,delay){timers.set(++timerId,{fn,delay});return timerId;},clearTimeout(id){timers.delete(id);},setInterval(){return 1;},clearInterval(){},addEventListener(){},removeEventListener(){}};
 globalThis.document={visibilityState:'visible'};
 const runtime=hookRuntime(),base=resolver(runtime);
 const a={id:'a',email:'owner@example.com',label:'Owner',receiveProtocol:'IMAP',version:1};
 const b={...a,id:'b',email:'other@example.com'};
 const workspace={folders:[{id:'inbox',kind:'INBOX',name:'INBOX'},{id:'clients',kind:'CUSTOM',name:'Clientes'}],lastSyncAt:'2026-10-18T18:00:00Z'};
 const api={accounts:async()=>[a,b],workspace:async()=>workspace,list:async(...args)=>{lists.push(args);return {items:[],hasMore:true};},sync:async()=>workspace};
 const {LiveMailboxWorkspace}=load('LiveMailboxWorkspace.tsx',id=>id.endsWith('/mailboxApi')?{mailboxApi:api}:id.endsWith('/mailboxModel')?{initialDraft:account=>({accountVersion:account.version,to:[],subject:'',bodyText:''})}:id.endsWith('/useWorkspaceNavigationMemory')?{useWorkspaceNavigationMemory(value){memory=value;}}:base(id));
 const props={onAccounts:()=>navigated++};runtime.render(()=>LiveMailboxWorkspace(props));await runtime.flush();
 async function tick(){for(const [id,task] of [...timers]){if(!timers.has(id))continue;timers.delete(id);task.fn();await runtime.flush();}}
 await tick();await tick();
 const filters=()=>nodes(runtime.result).find(n=>n.type==='MailWorkspaceFilters');
 const title=()=>nodes(runtime.result).find(n=>n.type==='IndiceTitleBar');
 assert.equal(title().props.subtitle,workspaceCopy.useMailWorkspaceCopy().mailboxSubtitle);
 const actions=()=>nodes(title().props.actions);
 assert.equal(actions().filter(n=>n.type==='Button').length,3);
 actions().find(n=>n.type==='IndiceTitleBarOverflow').props.items[0].onSelect();assert.equal(navigated,1);
 const action=label=>actions().find(n=>n.type==='Button'&&JSON.stringify(n.props.children).includes(label));
 action(completion.useMailCompletionCopy().preferences).props.onClick();await runtime.flush();
 nodes(runtime.result).find(n=>n.type==='MailPreferences').props.onClose();await runtime.flush();
 action(copy.compose).props.onClick();await runtime.flush();
 assert.equal(nodes(runtime.result).find(n=>n.type==='MailComposer').props.account.id,'a');
 nodes(runtime.result).find(n=>n.type==='MailComposer').props.onClose();await runtime.flush();
 nodes(runtime.result).find(n=>n.type==='MailFolderRail').props.onChange('clients');await runtime.flush();await tick();await tick();
 nodes(runtime.result).find(n=>n.type==='Button'&&n.props.children===mailbox.useMailboxCopy().next).props.onClick();await runtime.flush();await tick();assert.equal(lists.at(-1)[3],25);
 const before=lists.length;filters().props.onQuery('old');await runtime.flush();filters().props.onQuery('proposal');await runtime.flush();
 assert.ok([...timers.values()].some(t=>t.delay===300));await tick();
 assert.equal(lists.length,before+1);assert.equal(lists.at(-1)[2],'proposal');assert.equal(lists.at(-1)[3],0);
 filters().props.onQuick('STARRED');await runtime.flush();await tick();assert.equal(lists.at(-1)[5],'STARRED');
 nodes(runtime.result).find(n=>n.type==='Button'&&n.props['aria-label']===workspaceCopy.useMailWorkspaceCopy().collapseFolders).props.onClick();await runtime.flush();
 filters().props.onClear();await runtime.flush();await tick();
 assert.equal(lists.at(-1)[1],'clients');assert.equal(lists.at(-1)[2],'');assert.equal(lists.at(-1)[5],'ALL');assert.equal(memory.state.foldersCollapsed,true);
 filters().props.onAccount('unauthorized');await runtime.flush();assert.equal(filters().props.accountId,'a');
 filters().props.onAccount('b');await runtime.flush();await tick();await tick();
 assert.equal(lists.at(-1)[0],'b');assert.equal(lists.at(-1)[1],'inbox');assert.equal(memory.state.foldersCollapsed,true);
 props.onAccounts=undefined;runtime.render(()=>LiveMailboxWorkspace(props));await runtime.flush();
 assert.equal(actions().find(n=>n.type==='IndiceTitleBarOverflow').props.items[0].id,'expand');assert.equal(actions().filter(n=>n.type==='Button').length,3);
 runtime.unmount();
});
