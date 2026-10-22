// All records are synthetic. No backend proxy, credentials or provider writes.
import {resolve} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const root=resolve(import.meta.dirname,'..');
const people=[{id:42,name:'Ana · Coordinación'},{id:43,name:'Luis · Comercial'}];
const today=new Date(), date=new Date(today.getFullYear(),today.getMonth(),today.getDate(),10,0);
const rows=Array.from({length:5},(_,i)=>({id:i+1,title:['Revisar propuesta comercial','Seguimiento de entregas','Decidir prioridades','Coordinar al equipo','Cierre de acuerdos'][i],meetingType:'WORKING',status:i===0?'IN_PROGRESS':'PLANNED',startAt:new Date(date.getTime()+i*3600000).toISOString(),endAt:new Date(date.getTime()+(i+1)*3600000).toISOString(),timezone:'America/Toronto',ownerId:42,ownerName:people[0].name,participantCount:2,hasMinutes:false,version:1}));
const content=new Map(),attendance=new Map(),agreements=[];
const page=(items,q)=>{const n=Number(q.get('page')||1),size=Number(q.get('pageSize')||25);return {items:items.slice((n-1)*size,n*size),total:items.length,page:n,pageSize:size};};
const full=meeting=>({meeting,participants:people,agenda:'1. Revisar resultados\n2. Escuchar al equipo\n3. Definir próximos pasos',location:'Sala de juntas',minutes:content.get(meeting.id)?.minutes||'',decisions:content.get(meeting.id)?.decisions||'',history:[],planning:{objective:'Alinear las prioridades comerciales',expectedResult:'Tres acciones con responsable y fecha',minutesOwner:people[1],reminderMinutes:15,seriesId:null}});
const actor={user:{id:42,name:people[0].name,role:'superadmin',module_slugs:['control_minutas'],tab_permissions_configured:true,tab_permission_keys:[]},company:{id:8,name:'Empresa sintética',active:true,role:'superadmin'},csrfToken:'synthetic-csrf'};
const server=await createServer({root,cacheDir:resolve(root,'.vite-calendar-order'),configFile:false,define:{'import.meta.env.VITE_API_BASE_URL':'""'},plugins:[{name:'synthetic-meeting-calendar',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 if(path.startsWith('/minutes-control/')){req.url='/tests/browser/meeting-calendar-order.html';return next();}
 if(path==='/__fixture/conflict'){rows[0].version++;res.end('{}');return;}
 if(!path.startsWith('/api/'))return next();
 let result,status=200;
 if(path==='/api/v1/auth/me')result=actor;
 else if(path==='/api/v1/auth/csrf')result={csrfToken:'synthetic-csrf'};
 else if(path==='/api/v1/modules')result=[{slug:'control_minutas',name:'Control de juntas',category:'complementary',locked:false}];
 else if(path.startsWith('/api/v1/workspace-state/'))result={state:{},schemaVersion:1};
 else if(path==='/api/v1/learning/progress')result={catalogVersion:'synthetic',currentChapterId:null,stages:[],chapters:[],nextMission:null};
 else if(path==='/api/v1/meetings/members')result={items:people,total:people.length};
 else if(path==='/api/v1/meetings/flows')result=[{id:90,name:'Seguimiento comercial',version:1,settings:{title:'Seguimiento comercial',meetingType:'WORKING',objective:'Revisar oportunidades',expectedResult:'Acordar próximos pasos',ownerId:42,minutesOwnerId:43,participantIds:[43],agenda:'Revisar avances',location:'Sala de juntas',durationMinutes:30,reminderMinutes:15}}];
 else if(path==='/api/v1/meetings/planning/preview'||path==='/api/v1/meetings/planning'){
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));const meeting=body.meeting;
 const count=body.recurrence?.count??1;const start=new Date(meeting.startAt),duration=Date.parse(meeting.endAt)-start.getTime();
 const occurrences=Array.from({length:count},(_,i)=>{const at=new Date(start);if(body.recurrence?.frequency==='MONTHLY')at.setMonth(at.getMonth()+i*body.recurrence.interval);else at.setDate(at.getDate()+i*(body.recurrence?.frequency==='WEEKLY'?7:1)*(body.recurrence?.interval??1));return {number:i+1,startAt:at.toISOString(),endAt:new Date(at.getTime()+duration).toISOString(),conflicts:0};});
 if(path.endsWith('/preview'))result={occurrences,count,timezone:meeting.timezone,monthlyClamp:false,overlapUsesEarlierOffset:false};
 else {const firstMeetingId=500+rows.length;occurrences.forEach((o,i)=>rows.push({...meeting,...o,id:firstMeetingId+i,status:'PLANNED',ownerName:people.find(p=>p.id===meeting.ownerId)?.name??people[0].name,participantCount:new Set([meeting.ownerId,...meeting.participantIds]).size,hasMinutes:false,version:1}));result={firstMeetingId,seriesId:count>1?7:null,count,flowId:null};}
 }
 else if(path==='/api/v1/meetings/calendar'||path==='/api/v1/meetings'){
 const q=url.searchParams;const selected=rows.filter(r=>(!q.get('search')||r.title.toLowerCase().includes(q.get('search').toLowerCase()))&&(!q.get('status')||r.status===q.get('status'))&&(!q.get('ownerId')||q.get('ownerId')==='0'||r.ownerId===Number(q.get('ownerId')))&&(!q.get('from')||r.startAt>=q.get('from'))&&(!q.get('to')||r.startAt<q.get('to')));result=page(selected,q);
 }else if(/^\/api\/v1\/meetings\/\d+$/.test(path)){const meeting=rows.find(r=>r.id===Number(path.split('/').pop()));if(meeting)result=full(meeting);else{status=404;result={code:'not_found'};}}
 else if(/^\/api\/v1\/meetings\/\d+\/(minutes|attendance|status)$/.test(path)){
  const [,idText,kind]=path.match(/meetings\/(\d+)\/(minutes|attendance|status)/);const meeting=rows.find(r=>r.id===Number(idText));
  if(req.method==='GET')result={people:people.map(p=>({userId:p.id,name:p.name,status:attendance.get(meeting.id)?.[p.id]||'UNMARKED'})),version:meeting.version};
  else {const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());
   if(body.expectedVersion!==meeting.version){status=409;result={code:'meeting_conflict'};}
   else {meeting.version++;if(kind==='minutes'){content.set(meeting.id,body);meeting.hasMinutes=Boolean(body.minutes.trim());}else if(kind==='status')meeting.status=body.status;else attendance.set(meeting.id,{...attendance.get(meeting.id),...Object.fromEntries(body.entries.map(e=>[e.userId,e.status]))});result=full(meeting);}
  }
 }
 else if(path==='/api/v1/meetings/agreement-meetings/search'){const q=url.searchParams;const selected=rows.filter(r=>(!Number(q.get('selected'))||r.id===Number(q.get('selected')))&&(!q.get('search')||r.title.toLowerCase().includes(q.get('search').toLowerCase()))).map(r=>({id:r.id,title:r.title,participants:people}));result=page(selected,q);}
 else if(path==='/api/v1/meetings/agreements'){
  if(req.method==='POST'){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());const meeting=rows.find(r=>r.id===body.meetingId);result={...body,id:agreements.length+1,status:'OPEN',version:1,meetingTitle:meeting.title,meetingOwnerId:42,assigneeName:people.find(p=>p.id===body.assigneeId)?.name||'',resolution:''};agreements.push(result);}
  else {const q=url.searchParams;result=page(agreements.filter(a=>(!q.get('meetingId')||a.meetingId===Number(q.get('meetingId')))&&(!q.get('status')||a.status===q.get('status'))&&(!q.get('attention')||a.dueDate<new Date().toISOString().slice(0,10))),q);}
 }
 else if(/^\/api\/v1\/meetings\/agreements\/\d+$/.test(path)){const a=agreements.find(a=>a.id===Number(path.split('/').pop()));result={agreement:a,history:[],task:null,canLinkTask:false};}
 else if(path.endsWith('/ballots'))result={items:[],total:0,page:1,pageSize:10};
 else if(path.endsWith('/availability'))result={available:true,alternatives:[]};
 else {status=404;result={code:'synthetic_unavailable'};}
 res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
 });}},react(),tailwindcss()],resolve:{alias:{'@':resolve(root,'src')}},server:{host:'127.0.0.1',port:5198,strictPort:true}});
await server.listen();console.log('Synthetic meeting UI: http://127.0.0.1:5198/minutes-control/meetings');
