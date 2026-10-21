// Isolated UI fixture: all API requests terminate here; no backend proxy or provider access.
import {resolve} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const root=resolve(import.meta.dirname,'..');
const account={id:'00000000-0000-4000-8000-000000000001',label:'Horizonte · Atención a clientes',email:'equipo@example.com',displayName:'Equipo Horizonte',smtpHost:'mail.example.com',smtpPort:465,smtpSecurity:'TLS',smtpUsername:'equipo@example.com',hasSmtpPassword:true,receiveProtocol:'IMAP',receiveHost:'mail.example.com',receivePort:993,receiveUsername:'equipo@example.com',hasReceivePassword:true,mailingEnabled:true,smtpStatus:'NOT_TESTED',receiveStatus:'VERIFIED',smtpCheckedAt:null,receiveCheckedAt:'2026-10-18T18:00:00Z',version:1};
const folders=[{id:'inbox-demo',name:'Bandeja de entrada',kind:'INBOX',hasOlder:true,syncedAt:'2026-10-18T18:00:00Z'},{id:'archive-demo',name:'INBOX.Archive',kind:'ARCHIVE',hasOlder:false,syncedAt:'2026-10-18T18:00:00Z'}];
folders.push({id:'sent-demo',name:'Sent',kind:'SENT',hasOlder:false},{id:'junk-demo',name:'INBOX.spam',kind:'JUNK',hasOlder:false},{id:'trash-demo',name:'Trash',kind:'TRASH',hasOlder:false},{id:'clients-demo',name:'Clientes',kind:'CUSTOM',hasOlder:false});
const messages=Array.from({length:12},(_,i)=>({id:`message-${i}`,folderId:'inbox-demo',state:'RECEIVED',subject:['Seguimiento de nuestra propuesta de servicios','Confirmación de la reunión del próximo jueves','Documentación para comenzar el proyecto'][i%3],fromAddress:`contacto${i}@example.com`,fromName:['Mariana · Empresa de prueba','Equipo comercial · Demo','Administración · Demo'][i%3],to:['equipo@example.com'],cc:[],bcc:[],replyTo:[],bodyText:'Hola, equipo:\n\nGracias por la información. Nos gustaría revisar los siguientes pasos de la propuesta y confirmar una reunión para resolver las dudas pendientes.\n\n¿Podemos conversar el jueves?\n\nSaludos.\n\nMensaje ficticio para revisión de interfaz.',bodyHtml:null,bodyTruncated:false,hasAttachments:false,read:i>2,starred:i===0,occurredAt:'2026-10-18T18:00:00Z',version:1,failureCode:null}));
folders.push({id:'other-junk-demo',name:'INBOX.Junk',kind:'CUSTOM',hasOlder:false});
messages[0].bodyHtml='<table><tr><td><table><tr><td><h2>El siguiente paso para tu proyecto</h2><p>Hola, equipo. Gracias por compartir la propuesta.</p><p>Queremos confirmar los entregables y acordar una fecha de inicio.</p><ul><li>Revisar el alcance del servicio.</li><li>Confirmar la reunión del jueves.</li></ul><p>Quedamos atentos a sus comentarios.</p><blockquote>Propuesta comercial recibida.</blockquote></td></tr></table></td></tr></table>';
messages[0].cc=['administracion@example.com'];
const workspace={folders,lastSyncAt:'2026-10-18T18:00:00Z',lastError:null};
const drafts=new Map(), attachments=new Map();
let preferences={backgroundEnabled:true,sentFolder:null,version:1,signature:'Equipo Horizonte\nAtención a clientes',failures:0,nextSyncAt:null};
const server=await createServer({root,configFile:false,plugins:[{name:'email-workspace-preview',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
 if(req.url==='/')req.url='/tests/browser/email-workspace.html';
 if(req.url?.startsWith('/fixture-upload/')){
  const file=attachments.get(req.url.split('/').pop());if(!file){res.writeHead(404);return res.end();}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);file.bytes=Buffer.concat(chunks);
  res.writeHead(200);return res.end();
 }
 if(!req.url?.startsWith('/api/'))return next();
 const path=new URL(req.url,'http://fixture.invalid').pathname; let result;
 const draftPath=path.match(/\/drafts\/([^/]+)$/), uploadPath=path.match(/\/messages\/([^/]+)\/attachments\/upload$/),registerPath=path.match(/\/messages\/([^/]+)\/attachments\/([^/]+)\/register$/),listPath=path.match(/\/messages\/([^/]+)\/attachments$/);
 if(path.endsWith('/preferences')) {if(req.method==='PUT'){const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());preferences={...input,version:input.version+1};}result=preferences;}
 else if(path==='/api/v1/mailing/contacts')result={items:[{id:1,name:'Lucía Cliente',email:'lucia@example.com'}],total:1};
 else if(path==='/api/v1/mailing/templates')result={items:[{id:'template-one',name:'Seguimiento comercial',subject:'Siguiente paso',bodyText:'',status:'ACTIVE',version:1}],total:1};
 else if(path==='/api/v1/mailing/templates/template-one')result={id:'template-one',name:'Seguimiento comercial',subject:'Siguiente paso',bodyText:'Gracias por tu interés. Revisemos tu propuesta.',status:'ACTIVE',version:1};
 else if(path==='/api/v1/auth/csrf')result={csrfToken:'isolated-fixture-only'};
 else if(draftPath&&req.method==='PUT'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());
  result={...input,id:draftPath[1],state:'DRAFT',version:input.version+1,hasAttachments:false};drafts.set(result.id,result);
 } else if(uploadPath){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());
  const id=String(attachments.size+1);attachments.set(id,{...input,id,messageId:uploadPath[1],ready:false});result={id,url:`http://127.0.0.1:5199/fixture-upload/${id}`,headers:{'Content-Type':input.contentType}};
 } else if(registerPath){
  const file=attachments.get(registerPath[2]);file.ready=true;result={...drafts.get(registerPath[1]),version:file.version+1,hasAttachments:true};drafts.set(result.id,result);
 } else if(listPath)result=[...attachments.values()].filter(file=>file.ready&&file.messageId===listPath[1]).map(({id,filename,contentType,sizeBytes})=>({id,filename,contentType,sizeBytes,remote:false}));
 else if(path==='/api/v1/email/accounts')result={items:[account],configurationAvailable:true};
 else if(path===`/api/v1/email/accounts/${account.id}/test`)result={...account,smtpStatus:'VERIFIED',failureCode:null};
 else if(path==='/api/v1/email/mailboxes')result=[account];
 else if(path.endsWith('/open')){const m=messages.find(m=>path.includes('/'+m.id+'/'));m.read=true;m.version++;result=m;}
 else if(path.endsWith('/folders')&&req.method==='POST'){const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());folders.push({id:'custom-'+folders.length,name:input.name,kind:'CUSTOM',hasOlder:false});result=workspace;}
 else if(path.endsWith('/action')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());const m=messages.find(m=>path.includes('/'+m.id+'/'));if(input.action==='MOVE')m.folderId=input.targetFolderId;if(input.action==='STAR')m.starred=true;if(input.action==='UNSTAR')m.starred=false;if(input.action==='UNREAD')m.read=false;if(input.action==='READ')m.read=true;m.version++;result=m;}
 else if(path.endsWith('/messages')){const params=new URL(req.url,'http://fixture.invalid').searchParams;result={items:messages.filter(m=>m.folderId===params.get('folder')&&(params.get('filter')!=='UNREAD'||!m.read)&&(params.get('filter')!=='STARRED'||m.starred)&&(!params.get('query')||JSON.stringify(m).toLowerCase().includes(params.get('query').toLowerCase()))),hasMore:false};}
 else if(path===`/api/v1/email/mailboxes/${account.id}`||path.endsWith('/sync'))result={...workspace,folders:folders.map(f=>({...f,unreadCount:messages.filter(m=>m.folderId===f.id&&!m.read).length}))};
 res.writeHead(result?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify(result??{message:'No provider or persistent writes in this isolated fixture'}));
 });}},react(),tailwindcss()],resolve:{alias:{'@':resolve(root,'src')}},server:{host:'127.0.0.1',port:5199,strictPort:true}});
await server.listen();console.log('Email UI fixture: http://127.0.0.1:5199/tests/browser/email-workspace.html');
