import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {createBrowserRouter,createMemoryRouter,Link,Outlet,RouterProvider} from 'react-router';
import {Button} from '../../src/app/components/ui/button';
import {LanguageProvider} from '../../src/app/shared/context';
import {setCachedAuthSession,setCachedCsrfToken} from '../../src/app/api/authSessionStore';
import Conversations from '../../src/app/BasicModules/Sales/Conversations/Conversations';
import Settings from '../../src/app/BasicModules/Sales/Conversations/ConversationConnectionSettings';
import {conversationsApi,type Context,type Capability,type Conversation,type Message,type Note,type Event,type Member} from '../../src/app/BasicModules/Sales/Conversations/conversationsApi';
import {ApiClientError} from '../../src/app/lib/apiClient';
import '../../src/styles/index.css';
const preview=location.pathname.startsWith('/sales/');
if(preview&&!localStorage.getItem('frontend-indice-language'))localStorage.setItem('frontend-indice-language','es-MX');
const id='00000000-0000-4000-8000-000000000001',connectionId='00000000-0000-4000-8000-000000000002';
const caps:Capability[]=['READ_OWN','TAKE','READ_ALL','REPLY','TRANSFER','RESOLVE','NOTE','LINK','TASK'];
const context:Context={enabled:true,ingressEnabled:true,outboundEnabled:true,membershipId:7,canManage:true,capabilities:caps,connection:{id:connectionId,displayPhone:'+14165550111',status:'CONNECTED',version:1,unitId:null,businessId:null,verifiedAt:new Date().toISOString(),reasonCode:null}};
const chat:Conversation={id,connectionId,phone:'+14165550110',status:'OPEN',assigneeMembershipId:null,contactId:null,opportunityId:null,version:1,changeSeq:1,lastInboundAt:new Date().toISOString(),lastActivityAt:new Date().toISOString()};
let messages:Message[]=[{id:'inbound-1',direction:'IN',type:'TEXT',body:'Quiero conocer sus servicios.',dispatchState:'RECEIVED',authorMembershipId:null,authorName:'Cliente de prueba',createdAt:new Date().toISOString(),sentAt:null,deliveredAt:null,readAt:null,errorCode:null,changeSeq:1}],notes:Note[]=[],events:Event[]=[];
let members:Member[]=[{membershipId:7,name:'Administración de prueba',capabilities:caps,active:true,version:1},{membershipId:8,name:'Ana de prueba',capabilities:['READ_OWN','TAKE','REPLY','NOTE'],active:true,version:1}];
let writes:{key:string;body:string;note:boolean;attachments:string[]}[]=[],failNext=false,networkOnce=false,tenant=1;
const session=(company:number)=>({user:{id:7,name:'Administración de prueba',role:'superadmin',module_slugs:['crm'],tab_permissions_configured:true,tab_permission_keys:['crm.conversations','crm.conversations_manage']},company:{id:company,user_company_id:7,name:'Empresa sintética',role:'superadmin',active:true},companies:[],csrfToken:'synthetic-csrf'} as never);
setCachedAuthSession(session(1));setCachedCsrfToken('synthetic-csrf');
function event(type:string){chat.changeSeq++;events.push({seq:chat.changeSeq,type,actorMembershipId:7,targetMembershipId:null,actorName:'Administración de prueba',targetName:'',createdAt:new Date().toISOString()});}
conversationsApi.context=async()=>structuredClone(context);conversationsApi.connectionContext=conversationsApi.context;
conversationsApi.list=async(box,q,page)=>({items:tenant===1&&chat.phone.includes(q)&&(box==='ALL'||box==='RESOLVED'&&chat.status==='RESOLVED'||box==='MINE'&&chat.assigneeMembershipId===7&&chat.status==='OPEN'||box==='UNASSIGNED'&&chat.assigneeMembershipId===null&&chat.status==='OPEN')?[structuredClone(chat)]:[],total:tenant===1?1:0,page,pageSize:25,cursor:chat.changeSeq});
conversationsApi.timeline=async(_id,after=0)=>{if(tenant!==1)throw new ApiClientError('Not found',404);return {conversation:structuredClone(chat),messages:structuredClone(messages.filter(m=>m.changeSeq>after)),notes:structuredClone(notes),events:structuredClone(events.filter(e=>e.seq>after)),cursor:chat.changeSeq,hasEarlier:false,capabilities:caps};};
conversationsApi.command=async(_id,input)=>{if(input.version!==chat.version)throw new ApiClientError('Synthetic conflict',409);
 if(input.action==='OPT_OUT')chat.outboundBlocked=true;if(input.action==='TAKE')chat.assigneeMembershipId=7;if(input.action==='TRANSFER')chat.assigneeMembershipId=input.targetMembershipId!;if(input.action==='RESOLVE')chat.status='RESOLVED';if(input.action==='REOPEN')chat.status='OPEN';if(input.action!=='READ')chat.version++;event(input.action);return {id,version:chat.version,outcome:input.action};};
const receipts=new Map<string,{id:string;version:number;outcome:string}>();
conversationsApi.text=async(_id,note,input)=>{writes.push({key:input.requestKey,body:input.body,note,attachments:input.attachmentIds??[]});if(receipts.has(input.requestKey))return receipts.get(input.requestKey)!;await new Promise(r=>setTimeout(r,80));if(failNext){failNext=false;chat.version++;throw new ApiClientError('Synthetic conflict',409);}
 if(input.version!==chat.version)throw new ApiClientError('Synthetic conflict',409);const messageId=crypto.randomUUID();event(note?'INTERNAL_NOTE':'MESSAGE_QUEUED');
 if(note)notes.push({id:messageId,authorMembershipId:7,authorName:'Administración de prueba',body:input.body,createdAt:new Date().toISOString()});
 else{messages.push({id:messageId,direction:'OUT',type:input.attachmentIds?.length?'IMAGE':'TEXT',attachments:input.attachmentIds?.map(id=>({id,fileName:'proof.png',contentType:'image/png',sizeBytes:68,state:'READY'})),body:input.body,dispatchState:'ACCEPTED',authorMembershipId:7,authorName:'Administración de prueba',createdAt:new Date().toISOString(),sentAt:null,deliveredAt:null,readAt:null,errorCode:null,changeSeq:chat.changeSeq});chat.version++;}
 const receipt={id:messageId,version:chat.version,outcome:note?'INTERNAL_NOTE':'QUEUED'};receipts.set(input.requestKey,receipt);if(networkOnce){networkOnce=false;throw new Error('Synthetic lost acknowledgement');}return receipt;};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zaAAAAAASUVORK5CYII=';
conversationsApi.prepareUpload=async()=>({id:'fixture-file',uploadUrl:location.origin+'/__fixture/upload',headers:{'Content-Type':'image/png'},expiresAt:new Date(Date.now()+600000).toISOString(),attachment:null});
conversationsApi.finalizeUpload=async()=>({id:'fixture-file',fileName:'proof.png',contentType:'image/png',sizeBytes:68,state:'READY'});
conversationsApi.attachmentUrl=()=>png;
conversationsApi.crm=async()=>({canReadContacts:true,canReadOpportunities:true,contact:chat.contactId?{id:101,name:'Cliente creado',companyName:'Negocio de prueba',phone:chat.phone,phoneMatches:true}:null,opportunity:chat.opportunityId?{id:201,contactId:101,name:'Oportunidad de prueba',stage:'new',ownerMembershipId:7}:null,candidates:[{id:102,name:'Cliente existente',companyName:'Negocio',phone:chat.phone,phoneMatches:true}],opportunities:[],flows:{items:[{id:1,name:'Flujo de prueba',defaultFlow:true,stages:[{key:'new',label:'Nueva',type:'OPEN'}]}]}});
let tasks:{id:number;folio:string;title:string;dueDate:string}[]=[];
conversationsApi.taskContext=async()=>({allowed:true,assignees:[{membershipId:7,name:'Administración de prueba'},{membershipId:8,name:'Ana de prueba'}],tasks:structuredClone(tasks)});
conversationsApi.history=async()=>({messages:[],notes:[],events:[],hasEarlier:false});
conversationsApi.ownerCommand=async(_id,action,input)=>{if(input.version!==chat.version)throw new ApiClientError('Synthetic conflict',409);if(action==='create-contact')chat.contactId=101;if(action==='create-opportunity')chat.opportunityId=201;if(action==='links'){chat.contactId=input.contactId as number|null;chat.opportunityId=input.opportunityId as number|null;}if(action==='tasks')tasks.push({id:301,folio:'TASK-301',title:input.title as string,dueDate:input.dueDate as string});else chat.version++;event(action);return {id:'synthetic-owner-receipt',version:chat.version,outcome:action};};
conversationsApi.eligible=async()=>structuredClone(members);conversationsApi.members=async()=>structuredClone(members);conversationsApi.candidates=async()=>structuredClone(members);
conversationsApi.grant=async(_id,member,input)=>{members=members.map(m=>m.membershipId===member?{...m,...input,version:m.version+1}:m);return structuredClone(members);};
conversationsApi.control=async(_id,input)=>{if(!context.connection||input.version!==context.connection.version)throw new ApiClientError('Synthetic conflict',409);context.connection={...context.connection,status:input.action==='DISCONNECT'?'REVOKED':'RECONNECT_REQUIRED',version:context.connection.version+1};context.outboundEnabled=false;if(input.action==='DISCONNECT'){members=members.map(m=>({...m,active:false,capabilities:[],version:m.version+1}));context.capabilities=[];chat.assigneeMembershipId=null;}return structuredClone(context.connection);};
conversationsApi.setup=async()=>{context.connection={...context.connection!,status:'CONFIGURING',displayPhone:'',verifiedAt:null};return structuredClone(context.connection);};
Object.assign(window,{whatsappFixture:{fail:()=>{failNext=true;},loseAcknowledgement:()=>{networkOnce=true;},writes:()=>structuredClone(writes),read:()=>{event('PROVIDER_READ');messages=messages.map(m=>m.direction==='OUT'?{...m,readAt:new Date().toISOString(),changeSeq:chat.changeSeq}:m);},unknown:()=>{event('MESSAGE_UNKNOWN');messages=messages.map(m=>m.direction==='OUT'?{...m,dispatchState:'UNKNOWN',sentAt:null,deliveredAt:null,readAt:null,changeSeq:chat.changeSeq}:m);},switchTenant:()=>{tenant=2;setCachedAuthSession(session(2));},resetConnection:()=>{context.connection=null;},stats:()=>({notes:notes.length,messages:messages.length,tenant})}});
const initial=new URLSearchParams(location.search).has('settings')?'/sales/whatsapp-settings':'/sales/conversations';
function PreviewFrame(){
 const [dark,setDark]=useState(document.documentElement.classList.contains('dark'));
 return <div className="min-h-screen min-w-0 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <header className="flex flex-wrap items-center justify-between gap-3 bg-blue-600 px-5 py-4 text-white"><strong>ÍNDICE · Ventas</strong><nav className="flex flex-wrap items-center gap-2" aria-label="Vista de Conversaciones"><Button asChild variant="secondary"><Link to="/sales/conversations">Conversaciones</Link></Button><Button asChild variant="secondary"><Link to="/sales/whatsapp-settings">Conexión WhatsApp</Link></Button><Button variant="secondary" onClick={()=>{document.documentElement.classList.toggle('dark');setDark(!dark);}}>{dark?'Modo claro':'Modo oscuro'}</Button><Button variant="secondary" onClick={()=>location.reload()}>Reiniciar prueba</Button></nav></header>
  <div role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">Vista previa con datos de prueba. Las respuestas, archivos y cambios se simulan; no se envía nada a WhatsApp. Al recargar se reinicia la prueba.</div>
  <main className="p-4 md:p-6"><Outlet/></main>
 </div>;
}
const routes=[{path:'/sales/conversations',element:<Conversations/>},{path:'/sales/whatsapp-settings',element:<Settings/>}];
const router=preview?createBrowserRouter([{element:<PreviewFrame/>,children:routes}]):createMemoryRouter(routes,{initialEntries:[initial]});
createRoot(document.getElementById('root')!).render(<LanguageProvider>{preview?<RouterProvider router={router}/>:<main className="min-h-screen min-w-0 bg-slate-50 p-4 md:p-6 dark:bg-slate-950 dark:text-white"><RouterProvider router={router}/></main>}</LanguageProvider>);
