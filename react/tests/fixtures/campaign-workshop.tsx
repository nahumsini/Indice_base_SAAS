import { ideasBoardApi } from '../../src/app/BasicModules/Sales/Funneling/ideasBoardApi';
import { emptyBoard, type SavedBoard } from '../../src/app/BasicModules/Sales/Funneling/ideasBoardModel';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider } from '../../src/app/context/LanguageContext';
import '../../src/styles/index.css';
import Funneling from '../../src/app/BasicModules/Sales/Funneling/Funneling';
import { funnelApi } from '../../src/app/BasicModules/Sales/Funneling/funnelApi';
import { newCampaignIdea } from '../../src/app/BasicModules/Sales/Funneling/campaignModel';
import { previewConversion, type FunnelPlan } from '../../src/app/BasicModules/Sales/Funneling/funnelModel';
import { ApiClientError } from '../../src/app/lib/apiClient';
import { authApi } from '../../src/app/api/auth';
import { workspaceStateApi } from '../../src/app/api/workspaceState';
import { contentCalendarApi } from '../../src/app/BasicModules/Sales/Funneling/calendar/contentCalendarApi';
import type { ContentCalendar } from '../../src/app/BasicModules/Sales/Funneling/calendar/contentCalendarModel';
let calendars: Record<string,ContentCalendar> = {}, calendarFailure: string | null = null, calendarSaves = 0;
let calendarMutations: Record<string,string> = {};
try { calendars = JSON.parse(sessionStorage.getItem('synthetic-content-calendars') || '{}'); } catch { /* Synthetic fixture only. */ }
const emptyCalendar = (): ContentCalendar => ({ content:{timeZone:'UTC',settings:null,entries:[]},version:0,updatedAt:null,actorKey:'-7:-7' });
contentCalendarApi.get = async id => structuredClone(calendars[id] ?? emptyCalendar());
contentCalendarApi.save = async (id,input,actorKey) => {
  await new Promise(resolve => setTimeout(resolve,80));
  const failure = calendarFailure; calendarFailure = null;
  if (failure === 'network') throw new Error('Synthetic offline');
  const previous = calendars[id] ?? emptyCalendar();
  if (failure === 'conflict' || actorKey !== previous.actorKey) throw new ApiClientError('Synthetic conflict',409);
  if (input.version !== previous.version) {
    if (input.version + 1 === previous.version && calendarMutations[id] === input.mutationId && JSON.stringify(input.content) === JSON.stringify(previous.content)) return structuredClone(previous);
    throw new ApiClientError('Synthetic stale version',409);
  }
  calendars[id] = { content:structuredClone(input.content),version:input.version+1,updatedAt:new Date().toISOString(),actorKey };
  calendarMutations[id] = input.mutationId; calendarSaves++;
  sessionStorage.setItem('synthetic-content-calendars',JSON.stringify(calendars));
  if (failure === 'lost') throw new Error('Synthetic lost response');
  return structuredClone(calendars[id]);
};
Object.assign(window,{ calendarFixture:{ failNext:(mode:string) => { calendarFailure=mode; },stats:() => ({saves:calendarSaves,calendars:structuredClone(calendars)}) } });
authApi.getSessionOrNull=async()=>({company:{id:-7},user:{id:-7}} as never);
workspaceStateApi.get=async()=>({state:{},schemaVersion:1} as never);workspaceStateApi.save=async(_m,_t,state)=>({state,schemaVersion:1});
let ideaBoard: SavedBoard = { content: emptyBoard(), version: 0, updatedAt: null, actorKey: '-7:-7' };
let photos: Record<string, string> = {}, boardFailure: string | null = null, boardSaves = 0;
try { ideaBoard = JSON.parse(sessionStorage.getItem('synthetic-ideas-board') || 'null') || ideaBoard; photos = JSON.parse(sessionStorage.getItem('synthetic-ideas-photos') || '{}'); } catch { /* Synthetic fixture only. */ }
ideasBoardApi.get = async () => structuredClone(ideaBoard);
ideasBoardApi.save = async (input, actorKey) => {
  await new Promise(resolve => setTimeout(resolve, 30));
  const failure = boardFailure; boardFailure = null;
  if (failure === 'network') throw new Error('Synthetic offline');
  if (failure === 'conflict' || actorKey !== ideaBoard.actorKey) throw new ApiClientError('Synthetic conflict', 409);
  if (input.version !== ideaBoard.version) {
    if (JSON.stringify(input.content) === JSON.stringify(ideaBoard.content) && input.version + 1 === ideaBoard.version) return structuredClone(ideaBoard);
    throw new ApiClientError('Synthetic stale version', 409);
  }
  ideaBoard = { content: structuredClone(input.content), version: input.version + 1, actorKey, updatedAt: new Date().toISOString() }; boardSaves++;
  sessionStorage.setItem('synthetic-ideas-board', JSON.stringify(ideaBoard));
  if (failure === 'lost') throw new Error('Synthetic lost response');
  return structuredClone(ideaBoard);
};
ideasBoardApi.upload = async (file, id) => {
  if (boardFailure === 'photo') { boardFailure = null; throw new Error('Synthetic upload failure'); }
  photos[id] = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }); sessionStorage.setItem('synthetic-ideas-photos', JSON.stringify(photos));
  return { id, name: file.name, contentType: file.type, size: file.size };
};
ideasBoardApi.photoUrl = id => photos[id] || '';
Object.assign(window, { boardFixture: { failNext: (mode: string) => { boardFailure = mode; }, stats: () => ({ saves: boardSaves, board: structuredClone(ideaBoard) }),
 remotePan: () => { ideaBoard = { ...ideaBoard, version: ideaBoard.version + 1, content: { ...ideaBoard.content, viewport: { ...ideaBoard.content.viewport, x: ideaBoard.content.viewport.x + 200 } } }; sessionStorage.setItem('synthetic-ideas-board', JSON.stringify(ideaBoard)); },
 remoteEdit: () => { ideaBoard = { ...ideaBoard, version: ideaBoard.version + 1, content: { ...ideaBoard.content, nodes: ideaBoard.content.nodes.map((node, index) => index ? node : { ...node, text: 'Cambio desde otra ventana' }) } }; sessionStorage.setItem('synthetic-ideas-board', JSON.stringify(ideaBoard)); } } });
const initial=newCampaignIdea();initial.name='Servicio de consultoría · ejemplo';initial.workshop!.idea='Quiero explicar mis servicios y recibir solicitudes de información.';
let rows:FunnelPlan[]=[{...initial,id:'00000000-0000-4000-8000-000000000001',version:1,updatedAt:new Date().toISOString(),estimatedConversion:null,stageEstimates:[]}];
rows.push({...initial,id:'00000000-0000-4000-8000-000000000002',name:'Funnel anterior · ejemplo',workshop:null,objective:'Solicitar una asesoría',audience:'Empresas de servicios',channel:'SOCIAL',version:4,updatedAt:new Date().toISOString(),estimatedConversion:10,stageEstimates:[{estimatedAdvance:null},{estimatedAdvance:20},{estimatedAdvance:50}],stages:[{name:'Descubrir',action:'Ver publicaciones',measure:'Personas alcanzadas',target:1000},{name:'Conversar',action:'Pedir información',measure:'Conversaciones',target:200},{name:'Agendar',action:'Reservar una cita',measure:'Reservas',target:100}]});
const storageKey = 'indice-campaign-fixture-v1';
try { const saved = sessionStorage.getItem(storageKey); if (saved) rows = JSON.parse(saved); } catch { /* Synthetic test memory only. */ }
let fail: 'network' | 'conflict' | null = null, saveDelay = 0, attempts = 0, saves = 0;
Object.assign(window, { campaignFixture: {
  failNext: (mode: 'network' | 'conflict') => { fail = mode; },
  delaySave: (milliseconds: number) => { saveDelay = Math.max(0, Math.min(1000, milliseconds)); },
  stats: () => ({ attempts, saves, rows: structuredClone(rows) }),
} });
funnelApi.list=async query=>{const search=(query.get('search')??'').toLowerCase(),status=query.get('status');const items=rows.filter(row=>(!status||status==='ALL'||row.status===status)&&[row.name,row.objective,row.workshop?.idea].some(s=>s?.toLowerCase().includes(search)));return structuredClone({items,total:items.length,page:1,pageSize:Number(query.get('pageSize'))||25});};
funnelApi.save=async(id,input)=>{
 attempts++;
 if(saveDelay)await new Promise(resolve=>setTimeout(resolve,saveDelay));
 if(fail){const failure=fail;fail=null;if(failure==='conflict')throw new ApiClientError('Synthetic conflict',409);throw new Error('Synthetic save failure');}
 const existing=rows.find(row=>row.id===id);if(existing&&existing.version!==input.version)throw new ApiClientError('conflict',409);
 const value={...structuredClone(input),workshop:input.workshop??existing?.workshop??null,contentGuide:input.contentGuide??existing?.contentGuide??null,id,version:input.version+1,updatedAt:new Date().toISOString(),estimatedConversion:previewConversion(input.stages),stageEstimates:input.stages.map(()=>({estimatedAdvance:null}))};
 rows=[value,...rows.filter(row=>row.id!==id)];sessionStorage.setItem(storageKey,JSON.stringify(rows));saves++;return structuredClone(value);
};
funnelApi.get=async id=>structuredClone(rows.find(row=>row.id===id)!);
function Fixture(){const [dark,setDark]=useState(false);useEffect(()=>{document.documentElement.classList.toggle('dark',dark);return()=>document.documentElement.classList.remove('dark');},[dark]);return <div><div className="min-h-dvh bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><header className="mb-4 flex flex-wrap justify-between gap-3 text-sm"><span>Prueba aislada · datos sintéticos en memoria</span><div className="flex gap-4"><button onClick={()=>setDark(!dark)}>Cambiar tema</button><button onClick={()=>{fail='network';}}>Simular error de guardado</button></div></header><Funneling/></div></div>;}
createRoot(document.getElementById('root')!).render(<BrowserRouter><LanguageProvider><Fixture/></LanguageProvider></BrowserRouter>);
