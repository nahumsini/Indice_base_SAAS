import { LanguageProvider } from '../../src/app/context/LanguageContext';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { SellerWorkspace } from '../../src/app/BasicModules/Sales/Prospectos/seller/SellerWorkspace';
import { sellerApi, type CallScript, type CallInteraction } from '../../src/app/BasicModules/Sales/Prospectos/seller/sellerApi';
import { toFrontendOpportunity } from '../../src/app/BasicModules/Sales/adapters/salesApiAdapters';
import { defaultOpportunityFlowStages } from '../../src/app/BasicModules/Sales/types/opportunities';
import { esMX as copy } from '../../src/app/BasicModules/Sales/Prospectos/translations/prospectosTranslations';
import { authApi } from '../../src/app/api/auth';
import { workspaceStateApi } from '../../src/app/api/workspaceState';
// Test-only entrypoint. All calls are in-memory; no company/business mutations.
authApi.getSessionOrNull=async()=>({company:{id:-1},user:{id:-1}} as never);
workspaceStateApi.get=async()=>({state:{},schemaVersion:1} as never);
workspaceStateApi.save=async(_m,_t,state)=>({state,schemaVersion:1});
const names=['Mariana Torres','Ricardo Salas','Fernanda Vega','Carlos Méndez','Sofía Ríos','Laura Gómez','Daniel Ortiz','Lucía Cruz','Ana López','Pedro Ruiz'];
const rows=Array.from({length:30},(_,i)=>({id:i+1,opportunityName:'Programa empresarial · '+names[i%10],companyName:'Empresa de demostración '+(i+1),contactPerson:names[i%10],phone:'+1 202 555 '+String(100+i).padStart(4,'0'),email:'demo@example.com',stage:'new',lifecycleStatus:'OPEN',status:'active',flowId:1,ownerName:'Usuario Demo',ownerUserCompanyId:1,nextAction:'call',nextActionAt:i<3?'2026-10-18 09:00':'2026-10-19 10:00',probabilityPercent:10,temperature:'warm',estimatedValue:0,currency:'MXN',notes:'Interés inicial en conocer opciones para su equipo. Confirmar necesidades y acordar una presentación.'}));
const content={name:'Primer contacto · Soluciones empresariales',goal:'Conocer la necesidad y acordar una reunión de 15 minutos.',stageKey:'new',blocks:[
 {title:'Apertura',text:'Hola {{contact}}, soy {{seller}}.\n\nGracias por tu interés. ¿Tienes dos minutos para conversar sobre lo que buscan en {{company}}?'},
 {title:'Preguntas',text:'¿Qué les gustaría mejorar en este momento?\n\n¿Cómo lo resuelven hoy?\n\n¿Qué tendría que cambiar para que una propuesta les resulte útil?'},
 {title:'Propuesta de valor',text:'Por lo que me comentas, vale la pena revisar una opción que se ajuste a su equipo. Podemos preparar una propuesta con alcance y condiciones claras.'},
 {title:'Está ocupado',text:'Entiendo. ¿Qué día y hora te resulta más cómodo para retomar esta conversación? Confirmemos el horario antes de terminar.'},
 {title:'Pide precio',text:'Con gusto revisamos las opciones. Para darte una referencia útil, ¿me compartes el alcance que necesitan y cuántas personas participarían?'},
 {title:'Siguiente paso',text:'Entonces quedamos en revisar las opciones en una reunión de 15 minutos. ¿Te funciona mañana a las 10?\n\nGracias por tu tiempo, {{contact}}.'},
]};
let scripts:CallScript[]=[{id:1,version:1,publishedVersion:1,archived:false,content,published:content}];
const history=new Map<number,CallInteraction[]>();
sellerApi.scripts=async()=>structuredClone(scripts);
sellerApi.summary=async()=>({date:'2026-10-18',timezone:'America/Toronto',attempts:[...history.values()].flat().length,conversations:[...history.values()].flat().filter(r=>r.outcome==='answered').length,followups:[...history.values()].flat().filter(r=>r.followupMode==='schedule').length});
sellerApi.opportunity=async(_flow,id)=>({revision:'fixture',opportunity:rows.find(row=>row.id===id)!});
sellerApi.history=async(_flow,id)=>({items:history.get(id)??[],nextCursor:null});
sellerApi.record=async(_flow,id,value)=>{const entry={id:Date.now(),outcome:value.outcome,notes:value.notes,actorName:'Usuario Demo',createdAt:new Date().toISOString(),scriptName:content.name,scriptVersion:value.scriptVersion,followupMode:value.followupMode,nextAction:value.nextAction,nextActionAt:value.nextActionAt};history.set(id,[entry,...history.get(id)??[]]);return {interaction:entry,current:{revision:'fixture',opportunity:rows.find(row=>row.id===id)!}};};
sellerApi.saveScript=async(_flow,value)=>{const old=scripts.find(item=>item.id===value.id);const version=(old?.version??0)+1;const item={id:old?.id??scripts.length+1,version,publishedVersion:value.status==='PUBLISHED'?version:old?.publishedVersion??null,archived:value.status==='ARCHIVED',content:value.content,published:value.status==='PUBLISHED'?value.content:old?.published??null};scripts=[item,...scripts.filter(script=>script.id!==item.id)];return item;};
function Fixture(){const [dark,setDark]=useState(false);return <div className={dark?'dark':''}><div className="flex h-dvh flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"><header className="flex items-center justify-between border-b p-3"><h1 className="text-xl font-medium">Modo vendedor · Flujo comercial</h1><span className="text-xs text-slate-500">Prueba aislada · datos sintéticos · sin envíos</span><button onClick={()=>setDark(!dark)}>Cambiar tema</button></header><div className="min-h-0 flex-1"><SellerWorkspace flowId={1} flowName="Flujo comercial" opportunities={rows.map(toFrontendOpportunity)} stages={defaultOpportunityFlowStages} timezone="America/Toronto" locale="es-MX" ownerId={1} sellerName="Usuario Demo" copy={copy} active onRefresh={async()=>{}} onNextAction={()=>{}} onOpenFiles={()=>{}} onOpenHistory={()=>{}} onEdit={()=>{}} onStageChange={()=>{}} /></div></div></div>;}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Fixture/></LanguageProvider>);
