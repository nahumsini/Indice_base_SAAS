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
import {ApiClientError} from '../../src/app/lib/apiClient';
import {authApi} from '../../src/app/api/auth';
import {setCachedAuthSession} from '../../src/app/api/authSessionStore';
import {workspaceStateApi} from '../../src/app/api/workspaceState';
import {dashboardApi} from '../../src/app/api/dashboard';
import {ModuleSection} from '../../src/app/Dashboard/components/ModuleSection';
import {mapBackendModuleToCard} from '../../src/app/config/moduleCatalog';
import {Lightbulb} from 'lucide-react';
import '../../src/styles/index.css';
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

function Fixture(){
 const [page,setPage]=useState('dashboard');const {t}=useLanguage();const {favorites,toggleFavorite}=useFavorites();
 const cards=modules.map(module=>mapBackendModuleToCard(module,t)!);
 return <div className="h-dvh bg-slate-50 dark:bg-slate-950">{page==='dashboard'?<main className="p-5 sm:p-10"><ModuleSection icon={<Lightbulb/>} title={t.sections.complementaryModules} label="Más herramientas para conectar y organizar tu negocio." modules={cards} favoriteIds={favorites} onToggleFavorite={toggleFavorite} onModuleClick={setPage} singleRow/></main>:<PersonalIdeasBoard onNavigate={target=>setPage(target??'dashboard')}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/ideas-board/canvas']}><LanguageProvider><FavoritesProvider><WorkbarLayoutProvider><Routes><Route path="/:pageId/*" element={<Fixture/>}/></Routes></WorkbarLayoutProvider></FavoritesProvider></LanguageProvider></MemoryRouter>);
