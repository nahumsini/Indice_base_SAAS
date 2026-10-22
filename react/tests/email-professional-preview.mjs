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
const contacts=[{id:1,name:'Lucía Cliente',email:'lucia@example.com',companyName:'Consultoría Norte',source:'Web',owner:'7',ownerName:'Ana',tags:['VIP'],eligibility:'READY'},{id:2,name:'Carlos Demo',email:'carlos@example.com',companyName:'Estudio Sur',source:'Referido',owner:'8',ownerName:'Luis',tags:['Nuevo'],eligibility:'READY'}];
const templates=new Map([['template-one',{id:'template-one',name:'Seguimiento comercial',subject:'Siguiente paso',previewText:'',bodyText:'Gracias por tu interés. Revisemos tu propuesta.',bodyHtml:'<p style="color:#2563eb"><b>Gracias por tu interés.</b> Revisemos tu propuesta.</p>',status:'ACTIVE',version:1,updatedAt:new Date().toISOString()}]]);
const drafts=new Map(), attachments=new Map();
let preferences={backgroundEnabled:true,sentFolder:null,version:1,signature:'Equipo Horizonte\nAtención a clientes',failures:0,nextSyncAt:null};
const server=await createServer({root,cacheDir:resolve(root,'.vite-professional'),configFile:false,plugins:[{name:'email-workspace-preview',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
 if(req.url==='/')req.url='/tests/browser/email-workspace.html';
 if(req.url?.startsWith('/fixture-upload/')){
  const file=attachments.get(req.url.split('/').pop());if(!file){res.writeHead(404);return res.end();}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);file.bytes=Buffer.concat(chunks);
  res.writeHead(200);return res.end();
 }
 if(!req.url?.startsWith('/api/'))return next();
 const path=new URL(req.url,'http://fixture.invalid').pathname; let result;
 const draftPath=path.match(/\/drafts\/([^/]+)$/), uploadPath=path.match(/\/messages\/([^/]+)\/attachments\/upload$/),registerPath=path.match(/\/messages\/([^/]+)\/attachments\/([^/]+)\/register$/),listPath=path.match(/\/messages\/([^/]+)\/attachments$/);
 if(path.match(/\/attachments\/[^/]+\/download$/)){const file=attachments.get(path.split('/').at(-2));res.writeHead(file?.ready?200:404,{'Content-Type':file?.contentType??'text/plain'});return res.end(file?.bytes??'Not found');}
 if(path.endsWith('/preferences')) {if(req.method==='PUT'){const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());preferences={...input,version:input.version+1};}result=preferences;}
 else if(path.endsWith('/counts')){const query=new URL(req.url,'http://fixture.invalid').searchParams.get('query')?.toLowerCase()??'';const matches=m=>!query||[m.subject,m.fromAddress,m.fromName,...m.to].join(' ').toLowerCase().includes(query);result={unread:messages.filter(m=>m.folderId==='inbox-demo'&&!m.read&&matches(m)).length,starred:messages.filter(m=>m.folderId==='inbox-demo'&&m.starred&&matches(m)).length,drafts:[...drafts.values()].filter(matches).length,review:0};}
 else if(path==='/api/v1/mailing/audience/options')result={sources:['Web','Referido'],owners:[{value:'7',label:'Ana'},{value:'8',label:'Luis'}],tags:['VIP','Nuevo']};
 else if(path==='/api/v1/mailing/audience/lists')result=[{id:'list-one',name:'Clientes VIP',version:1,contactCount:1}];
 else if(path==='/api/v1/mailing/audience'){const q=new URL(req.url,'http://fixture.invalid').searchParams;const items=contacts.filter(c=>(!q.get('search')||JSON.stringify(c).toLowerCase().includes(q.get('search').toLowerCase()))&&(!q.get('source')||c.source===q.get('source'))&&(!q.get('owner')||c.owner===q.get('owner'))&&(!q.get('tag')||c.tags.includes(q.get('tag')))&&(!q.get('listId')||c.id===1));result={items,total:items.length,page:1,pageSize:25};}
 else if(path==='/api/v1/mailing/templates'){const q=new URL(req.url,'http://fixture.invalid').searchParams;const items=[...templates.values()].filter(t=>(!q.get('search')||t.name.toLowerCase().includes(q.get('search').toLowerCase()))&&(!q.get('status')||q.get('status')==='ALL'||t.status===q.get('status')));result={items:items.map(t=>({...t,bodyText:'',bodyHtml:null})),total:items.length,canManage:true,page:1,pageSize:25};}
 else if(path.startsWith('/api/v1/mailing/templates/')){const id=path.split('/')[5];if(req.method==='PUT'){const chunks=[];for await(const c of req)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks).toString());templates.set(id,{...input,id,version:input.version+1,status:'ACTIVE',updatedAt:new Date().toISOString()});}else if(req.method==='POST'){const chunks=[];for await(const c of req)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks).toString());templates.set(id,{...templates.get(id),...input,version:input.version+1});}result=templates.get(id);}
 else if(path==='/api/v1/auth/csrf')result={csrfToken:'isolated-fixture-only'};
 else if(draftPath&&req.method==='PUT'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());
  result={...input,id:draftPath[1],state:'DRAFT',version:input.version+1,hasAttachments:[...attachments.values()].some(f=>f.messageId===draftPath[1]&&f.ready),read:true,fromAddress:account.email,fromName:account.displayName,occurredAt:new Date().toISOString()};drafts.set(result.id,result);
 } else if(path.includes('/messages/')&&drafts.has(path.split('/').pop())){result=drafts.get(path.split('/').pop());
 } else if(uploadPath){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());
  const id=String(attachments.size+1);attachments.set(id,{...input,id,messageId:uploadPath[1],ready:false});result={id,url:`http://127.0.0.1:5237/fixture-upload/${id}`,headers:{'Content-Type':input.contentType}};
 } else if(registerPath){
  const file=attachments.get(registerPath[2]);file.ready=true;result={...drafts.get(registerPath[1]),version:file.version+1,hasAttachments:true};drafts.set(result.id,result);
 } else if(listPath)result=[...attachments.values()].filter(file=>file.ready&&file.messageId===listPath[1]).map(({id,filename,contentType,sizeBytes})=>({id,filename,contentType,sizeBytes,remote:false}));
 else if(path==='/api/v1/email/accounts')result={items:[account],configurationAvailable:true};
 else if(path===`/api/v1/email/accounts/${account.id}/test`)result={...account,smtpStatus:'VERIFIED',failureCode:null};
 else if(path==='/api/v1/email/mailboxes')result=[account];
 else if(path.endsWith('/open')){const m=[...messages,...drafts.values()].find(m=>path.includes('/'+m.id+'/'));if(m){m.read=true;if(m.state==='RECEIVED')m.version++;}result=m;}
 else if(path.endsWith('/folders')&&req.method==='POST'){const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());folders.push({id:'custom-'+folders.length,name:input.name,kind:'CUSTOM',hasOlder:false});result=workspace;}
 else if(path.endsWith('/action')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString());const m=messages.find(m=>path.includes('/'+m.id+'/'));if(input.action==='MOVE')m.folderId=input.targetFolderId;if(input.action==='STAR')m.starred=true;if(input.action==='UNSTAR')m.starred=false;if(input.action==='UNREAD')m.read=false;if(input.action==='READ')m.read=true;m.version++;result=m;}
 else if(path.endsWith('/messages')){const params=new URL(req.url,'http://fixture.invalid').searchParams;result={items:(params.get('folder')==='DRAFTS'?[...drafts.values()]:messages).filter(m=>(params.get('folder')==='DRAFTS'||m.folderId===params.get('folder'))&&(params.get('filter')!=='UNREAD'||!m.read)&&(params.get('filter')!=='STARRED'||m.starred)&&(!params.get('query')||JSON.stringify(m).toLowerCase().includes(params.get('query').toLowerCase()))),hasMore:false};}
 else if(path===`/api/v1/email/mailboxes/${account.id}`||path.endsWith('/sync'))result={...workspace,folders:folders.map(f=>({...f,unreadCount:messages.filter(m=>m.folderId===f.id&&!m.read).length}))};
 res.writeHead(result?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify(result??{message:'No provider or persistent writes in this isolated fixture'}));
 });}},react(),tailwindcss()],resolve:{alias:{'@':resolve(root,'src')}},server:{host:'127.0.0.1',port:5237,strictPort:true}});
await server.listen();console.log('Email UI fixture: http://127.0.0.1:5237/tests/browser/email-workspace.html');
