import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router';
import {LanguageProvider,useLanguage} from '../../src/app/context/LanguageContext';
import {FavoritesProvider,useFavorites} from '../../src/app/shared/context/FavoritesContext';
import {WorkbarLayoutProvider} from '../../src/app/components/workbar/WorkbarLayoutContext';
import PersonalIdeasBoard from '../../src/app/ComplementaryModules/IdeasBoard/PersonalIdeasBoard';
import {personalIdeasBoardApi} from '../../src/app/ComplementaryModules/IdeasBoard/personalIdeasBoardApi';
import {ideasBoardApi} from '../../src/app/BasicModules/Sales/Funneling/ideasBoardApi';
import {emptyBoard,type SavedBoard} from '../../src/app/BasicModules/Sales/Funneling/ideasBoardModel';
import {addFiveSTemplate,newFiveSAction,localDateKey} from '../../src/app/ComplementaryModules/IdeasBoard/fiveSModel';
import {ApiClientError} from '../../src/app/lib/apiClient';
import {authApi} from '../../src/app/api/auth';
import {setCachedAuthSession} from '../../src/app/api/authSessionStore';
import {workspaceStateApi} from '../../src/app/api/workspaceState';
import {dashboardApi} from '../../src/app/api/dashboard';
import {ModuleSection} from '../../src/app/Dashboard/components/ModuleSection';
import {mapBackendModuleToCard} from '../../src/app/config/moduleCatalog';
import {Lightbulb} from 'lucide-react';
import '../../src/styles/index.css';
const fiveSEvidenceFixture=new URLSearchParams(window.location.search).get('fixture')==='five-s-evidence';
const fiveSFilterFixture=new URLSearchParams(window.location.search).get('fixture')==='five-s-filters';
if(fiveSEvidenceFixture||fiveSFilterFixture||new URLSearchParams(window.location.search).get('fixture')==='projects')localStorage.setItem('frontend-indice-language','es-MX');
const session={user:{id:-7,name:'Prueba',role:'user',module_slugs:['ideas_board'],tab_permissions_configured:true,tab_permission_keys:['ideas_board.canvas']},company:{id:-7,name:'Empresa de prueba',role:'user',active:true},companies:[],csrfToken:'synthetic'} as never;
setCachedAuthSession(session);authApi.getSessionOrNull=async()=>session;
workspaceStateApi.get=async()=>({state:{},schemaVersion:1} as never);workspaceStateApi.save=async(_m,_t,state)=>({state,schemaVersion:1});
const modules=[{slug:'ideas_board',name:'Pizarra de ideas',category:'complementary',module_category:'complementary',route_key:'ideas-board',lifecycle_status:'pilot',is_active:true,assignment_enabled:true}];
dashboardApi.listModules=async()=>modules as never;
let salesRequests=0;
ideasBoardApi.get=async()=>{salesRequests++;throw Error('Sales must stay isolated');};
ideasBoardApi.save=async()=>{salesRequests++;throw Error('Sales must stay isolated');};
ideasBoardApi.upload=async()=>{salesRequests++;throw Error('Sales must stay isolated');};
Object.assign(window,{personalFixture:{salesRequests:()=>salesRequests}});
let ideaBoard: SavedBoard = { content: emptyBoard(), version: 0, updatedAt: null, actorKey: 'ideas_board:-7:-7' };
let photos: Record<string, string> = {}, boardFailure: string | null = null, boardSaves = 0;
try { ideaBoard = JSON.parse(sessionStorage.getItem('synthetic-personal-ideas-board') || 'null') || ideaBoard; photos = JSON.parse(sessionStorage.getItem('synthetic-personal-ideas-photos') || '{}'); } catch { /* Synthetic fixture only. */ }
// Isolated synthetic actions exercise filters without touching a functional company.
if((fiveSEvidenceFixture||fiveSFilterFixture)&&!ideaBoard.content.nodes.length){
 const content=addFiveSTemplate(emptyBoard(),'Oficina · Prueba de filtros','es-MX')!;
 const today=localDateKey(),offset=(days:number)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+days);return localDateKey(d);};
 const rows=[
  ['SORT','Retirar materiales duplicados','Andrea','PENDING',offset(-2)],
  ['SORT','Separar documentos vigentes','Luis','IN_PROGRESS',today],
  ['ORDER','Etiquetar carpetas del equipo','Andrea','VERIFIED',today],
  ['ORDER','Asignar lugar a las herramientas','Luis','PENDING',offset(3)],
  ['CLEAN','Revisar equipos de trabajo','Andrea','IN_PROGRESS',offset(5)],
  ['CLEAN','Limpiar el área compartida','','PENDING',null],
  ['STANDARDIZE','Acordar una lista de revisión','Luis','VERIFIED',offset(-1)],
  ['SUSTAIN','Revisar los acuerdos de la semana','Andrea','PENDING',offset(10)],
 ] as const;
 for(const [section,text,owner,status,dueDate] of rows){const node=newFiveSAction(content,content.nodes[0].fiveS!,section)!;node.text=text;node.fiveS={...node.fiveS!,action:text,owner,status,dueDate,result:status==='VERIFIED'?'Resultado de prueba registrado':'',reviewDate:section==='SUSTAIN'?offset(2):null};content.nodes.push(node);}
 if(fiveSEvidenceFixture){const action=content.nodes.find(n=>n.fiveS?.role==='ACTION')!;action.fiveS={...action.fiveS!,beforeAssetId:'synthetic-before',afterAssetId:'synthetic-after'};}
 ideaBoard={...ideaBoard,content};
}
if(fiveSEvidenceFixture){photos['synthetic-before']='/tests/fixtures/five-s-evidence-before.png';photos['synthetic-after']='/tests/fixtures/five-s-evidence-after.png';}
personalIdeasBoardApi.get = async () => structuredClone(ideaBoard);
personalIdeasBoardApi.save = async (input, actorKey) => {
  await new Promise(resolve => setTimeout(resolve, 30));
  const failure = boardFailure; boardFailure = null;
  if (failure === 'network') throw new Error('Synthetic offline');
  if (failure === 'conflict' || actorKey !== ideaBoard.actorKey) throw new ApiClientError('Synthetic conflict', 409);
  if (input.version !== ideaBoard.version) {
    if (JSON.stringify(input.content) === JSON.stringify(ideaBoard.content) && input.version + 1 === ideaBoard.version) return structuredClone(ideaBoard);
    throw new ApiClientError('Synthetic stale version', 409);
  }
  ideaBoard = { content: structuredClone(input.content), version: input.version + 1, actorKey, updatedAt: new Date().toISOString() }; boardSaves++;
  sessionStorage.setItem('synthetic-personal-ideas-board', JSON.stringify(ideaBoard));
  if (failure === 'lost') throw new Error('Synthetic lost response');
  return structuredClone(ideaBoard);
};
personalIdeasBoardApi.upload = async (file, id) => {
  if (boardFailure === 'photo') { boardFailure = null; throw new Error('Synthetic upload failure'); }
  photos[id] = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }); sessionStorage.setItem('synthetic-personal-ideas-photos', JSON.stringify(photos));
  return { id, name: file.name, contentType: file.type, size: file.size };
};
personalIdeasBoardApi.photoUrl = id => photos[id] || '';
Object.assign(window, { boardFixture: { failNext: (mode: string) => { boardFailure = mode; }, stats: () => ({ saves: boardSaves, board: structuredClone(ideaBoard) }),
 remotePan: () => { ideaBoard = { ...ideaBoard, version: ideaBoard.version + 1, content: { ...ideaBoard.content, viewport: { ...ideaBoard.content.viewport, x: ideaBoard.content.viewport.x + 200 } } }; sessionStorage.setItem('synthetic-personal-ideas-board', JSON.stringify(ideaBoard)); },
 remoteEdit: () => { ideaBoard = { ...ideaBoard, version: ideaBoard.version + 1, content: { ...ideaBoard.content, nodes: ideaBoard.content.nodes.map((node, index) => index ? node : { ...node, text: 'Cambio desde otra ventana' }) } }; sessionStorage.setItem('synthetic-personal-ideas-board', JSON.stringify(ideaBoard)); } } });
import {systemBoardApi,ideaWorkspaceApi,type Project,type ProjectInput} from '../../src/app/ComplementaryModules/IdeasBoard/ideaWorkspaceApi';
let system:SavedBoard={content:emptyBoard(),version:0,updatedAt:null,actorKey:'ideas_board:-7:-7'};
let projects:Record<string,Project>={},requests:Record<string,ProjectInput>={},systemFailure:string|null=null,projectFailure:string|null=null,systemSaves=0,projectSaves=0,lastSystemMutation='';
try{system=JSON.parse(sessionStorage.getItem('synthetic-system-board')||'null')||system;projects=JSON.parse(sessionStorage.getItem('synthetic-board-projects')||'{}');requests=JSON.parse(sessionStorage.getItem('synthetic-board-project-requests')||'{}');}catch{}
systemBoardApi.get=async()=>structuredClone(system);
systemBoardApi.save=async(input,actorKey)=>{
 await new Promise(r=>setTimeout(r,40));const failure=systemFailure;systemFailure=null;if(failure==='network')throw Error('Synthetic offline');
 if(input.version!==system.version||actorKey!==system.actorKey){if(input.mutationId===lastSystemMutation&&input.version+1===system.version&&JSON.stringify(input.content)===JSON.stringify(system.content))return structuredClone(system);throw new ApiClientError('Synthetic stale',409);}
 system={content:structuredClone(input.content),version:input.version+1,updatedAt:new Date().toISOString(),actorKey};systemSaves++;lastSystemMutation=input.mutationId;sessionStorage.setItem('synthetic-system-board',JSON.stringify(system));if(failure==='lost')throw Error('Synthetic lost response');return structuredClone(system);
};
systemBoardApi.upload=personalIdeasBoardApi.upload;systemBoardApi.photoUrl=personalIdeasBoardApi.photoUrl;
ideaWorkspaceApi.save=async(id,input)=>{
 await new Promise(r=>setTimeout(r,60));const failure=projectFailure;projectFailure=null;if(failure==='network')throw Error('Synthetic offline');
 if(projects[id]){if(JSON.stringify(requests[id])!==JSON.stringify(input))throw new ApiClientError('Immutable snapshot',409);return structuredClone(projects[id]);}
 const nodes=input.system?.elements??input.freeform?.nodes??[],connections=input.system?.connections??input.freeform?.connections??[];
 const value:Project={summary:{id,name:input.name.trim(),kind:input.kind,nodeCount:nodes.length,connectionCount:connections.length,createdAt:new Date().toISOString()},freeform:structuredClone(input.freeform),system:structuredClone(input.system)};
 projects[id]=value;requests[id]=structuredClone(input);projectSaves++;sessionStorage.setItem('synthetic-board-projects',JSON.stringify(projects));sessionStorage.setItem('synthetic-board-project-requests',JSON.stringify(requests));if(failure==='lost')throw Error('Synthetic lost response');return structuredClone(value);
};
ideaWorkspaceApi.list=async(q='',page=1,_signal?:AbortSignal,pageSize=12)=>{const items=Object.values(projects).map(p=>p.summary).filter(p=>p.name.toLowerCase().includes(q.toLowerCase())).reverse();return {items:structuredClone(items.slice((page-1)*pageSize,page*pageSize)),total:items.length,page,pageSize};};
ideaWorkspaceApi.get=async(id)=>{if(!projects[id])throw new ApiClientError('Missing',404);return structuredClone(projects[id]);};
Object.assign(window,{workspaceFixture:{stats:()=>({system:structuredClone(system),projects:structuredClone(projects),systemSaves,projectSaves}),failProject:(mode:string)=>{projectFailure=mode;},failSystem:(mode:string)=>{systemFailure=mode;},remoteIcon:()=>{system={...system,version:system.version+1,content:{...system.content,nodes:system.content.nodes.map((n,i)=>i?n:{...n,icon:'LEADER'} as never)}};sessionStorage.setItem('synthetic-system-board',JSON.stringify(system));}}});

// Synthetic project-management API; never uses a functional company or real sharing grants.
import {projectManagementApi} from '../../src/app/ComplementaryModules/IdeasBoard/projectManagementApi';
const fixtureMembers=[{id:9,name:'Andrea · Equipo',available:true},{id:10,name:'Luis · Equipo',available:false},{id:11,name:'María · Comercial',available:true},{id:12,name:'Pedro · Operaciones',available:true},{id:13,name:'Laura · Diseño',available:true},{id:14,name:'Carlos · Dirección',available:true}];
let fixtureShares:Record<string,number[]>={},fixtureMutations:Record<string,string>={};
try{fixtureShares=JSON.parse(sessionStorage.getItem('synthetic-project-shares')||'{}');}catch{}
function persistProjects(){sessionStorage.setItem('synthetic-board-projects',JSON.stringify(projects));sessionStorage.setItem('synthetic-project-shares',JSON.stringify(fixtureShares));}
function managed(id:string){const p=projects[id];if(!p)throw new ApiClientError('Missing',404);return p;}
if(new URLSearchParams(window.location.search).get('fixture')==='projects'){
 for(const [index,name,kind,owned,trashed] of [[1,'Propuesta de campaña','FREEFORM',true,false],[2,'Diagnóstico de cafetería','SYSTEM',true,false],[3,'Plan de atención al cliente','SYSTEM',false,false],[4,'Sesión anterior','FREEFORM',true,true],[5,'Propuesta para la temporada de fin de año','FREEFORM',false,false],[6,'Ideas para mejorar la atención','SYSTEM',false,false],[7,'Diagnóstico para la apertura de una nueva sucursal','SYSTEM',true,true]] as const){
  const id=`00000000-0000-4000-8000-00000000000${index}`,node={id:crypto.randomUUID(),kind:'TEXT' as const,text:name,x:80,y:150,width:240,height:160,shape:'NOTE' as const,color:'YELLOW' as const,assetId:null},freeform={nodes:[node],connections:[],viewport:{x:0,y:0,zoom:1}};
  if(projects[id])continue;
  const nodes=kind==='SYSTEM'?[
   {...node,text:'Equipo',x:230,y:220,color:'BLUE' as const},
   {...node,id:crypto.randomUUID(),text:'Atender pedidos',x:1450,y:300,color:'YELLOW' as const},
   {...node,id:crypto.randomUUID(),text:'Café y desayunos',x:1450,y:1300,color:'CORAL' as const},
   {...node,id:crypto.randomUUID(),text:'Resultados',x:230,y:1120,color:'MINT' as const},
  ]:[{...node,text:'Idea de campaña',x:-150,y:100},{...node,id:crypto.randomUUID(),text:'Preparar propuesta',x:210,y:100,color:'BLUE' as const},{...node,id:crypto.randomUUID(),text:'Presentar al cliente',x:570,y:200,color:'MINT' as const}];
  const connections=nodes.slice(1).map((n,i)=>({id:crypto.randomUUID(),from:nodes[i].id,to:n.id,label:i===0?'Siguiente':'',direction:'BOTH' as const}));
  projects[id]={summary:{id,name,kind,nodeCount:nodes.length,connectionCount:connections.length,createdAt:trashed?'2026-09-12T12:00:00Z':new Date().toISOString(),version:0,owned,ownerId:owned?7:index===5?12:index===6?13:8,ownerName:owned?'Prueba':index===5?'María Fernanda González · Atención a clientes':index===6?undefined:'Andrea · Equipo',shareCount:0,deletedAt:trashed?(index===4?'2026-10-23T12:00:00Z':'2026-10-20T12:00:00Z'):null},freeform:kind==='FREEFORM'?{...freeform,nodes,connections}:null,system:kind==='SYSTEM'?{elements:nodes.map((n,i)=>({node:n,category:(['PERSON','PROCESS','PRODUCT','FINANCE'] as const)[i],icon:['PERSON','CHECKLIST','COFFEE','INCOME'][i]})),connections,viewport:{x:0,y:0,zoom:.2}}:null};
  if(index===2)fixtureShares[id]=[9,10];
 }persistProjects();
}
ideaWorkspaceApi.list=async(q='',page=1,_signal?:AbortSignal,pageSize=12,scope='OWNED',kind='ALL',sort='NEWEST')=>{const items=Object.values(projects).map(p=>({...p.summary,owned:p.summary.owned??true,version:p.summary.version??0,shareCount:(fixtureShares[p.summary.id]??[]).length})).filter(p=>scope==='TRASH'?p.owned&&!!p.deletedAt:scope==='SHARED'?!p.owned&&!p.deletedAt:p.owned&&!p.deletedAt).filter(p=>p.name.toLowerCase().includes(q.toLowerCase())).filter(p=>kind==='ALL'||p.kind===kind).sort((a,b)=>sort==='NAME_ASC'?a.name.localeCompare(b.name):sort==='NAME_DESC'?b.name.localeCompare(a.name):sort==='OLDEST'?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt));return {items:structuredClone(items.slice((page-1)*pageSize,page*pageSize)),total:items.length,page,pageSize};};
ideaWorkspaceApi.get=async(id)=>structuredClone(managed(id));
projectManagementApi.change=async(id,input)=>{await new Promise(r=>setTimeout(r,60));const p=managed(id);if(fixtureMutations[input.mutationId])return structuredClone(p);if((p.summary.version??0)!==input.version)throw new ApiClientError('Stale',409);p.summary={...p.summary,name:input.name??p.summary.name,deletedAt:input.trashed===undefined?p.summary.deletedAt:input.trashed?new Date().toISOString():null,version:input.version+1};if(input.trashed){fixtureShares[id]=[];p.summary.shareCount=0;}fixtureMutations[input.mutationId]=id;persistProjects();return structuredClone(p);};
projectManagementApi.copy=async(item,id,name)=>{await new Promise(r=>setTimeout(r,60));if(projects[id])return structuredClone(projects[id]);const p=structuredClone(managed(item.id));p.summary={...p.summary,id,name,createdAt:new Date().toISOString(),version:0,owned:true,ownerId:7,ownerName:'Prueba',shareCount:0,deletedAt:null};projects[id]=p;persistProjects();return structuredClone(p);};
projectManagementApi.members=async(q)=>structuredClone(fixtureMembers.filter(m=>m.available&&m.name.toLowerCase().includes(q.toLowerCase())));
projectManagementApi.sharing=async(id)=>({version:managed(id).summary.version??0,members:fixtureMembers.filter(m=>(fixtureShares[id]??[]).includes(m.id))});
projectManagementApi.share=async(id,version,mutationId,users)=>{await new Promise(r=>setTimeout(r,60));const p=managed(id);if(!fixtureMutations[mutationId]){if((p.summary.version??0)!==version)throw new ApiClientError('Stale',409);fixtureShares[id]=users;p.summary={...p.summary,shareCount:users.length,version:version+1};fixtureMutations[mutationId]=id;persistProjects();}return {version:p.summary.version!,members:fixtureMembers.filter(m=>users.includes(m.id))};};
projectManagementApi.assetUrl=(_project,id)=>photos[id]||'';

function Fixture(){
 const [page,setPage]=useState(fiveSEvidenceFixture||fiveSFilterFixture||new URLSearchParams(window.location.search).get('fixture')==='projects'?'ideas-board':'dashboard');const {t}=useLanguage();const {favorites,toggleFavorite}=useFavorites();
 const cards=modules.map(module=>mapBackendModuleToCard(module,t)!);
 return <div className="h-dvh bg-slate-50 dark:bg-slate-950">{page==='dashboard'?<main className="p-5 sm:p-10"><ModuleSection icon={<Lightbulb/>} title={t.sections.complementaryModules} label="Más herramientas para conectar y organizar tu negocio." modules={cards} favoriteIds={favorites} onToggleFavorite={toggleFavorite} onModuleClick={setPage} singleRow/></main>:<PersonalIdeasBoard onNavigate={target=>setPage(target??'dashboard')}/>}</div>;
}
const fixtureRoot=createRoot(document.getElementById('root')!);
fixtureRoot.render(<MemoryRouter initialEntries={[fiveSEvidenceFixture||fiveSFilterFixture?'/ideas-board/five-s':new URLSearchParams(window.location.search).get('fixture')==='projects'?'/ideas-board/projects':'/ideas-board/canvas']}><LanguageProvider><FavoritesProvider><WorkbarLayoutProvider><Routes><Route path="/:pageId/*" element={<Fixture/>}/></Routes></WorkbarLayoutProvider></FavoritesProvider></LanguageProvider></MemoryRouter>);

if(import.meta.hot)import.meta.hot.dispose(()=>fixtureRoot.unmount());
