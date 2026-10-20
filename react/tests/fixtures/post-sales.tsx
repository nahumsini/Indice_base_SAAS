import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider } from '../../src/app/context/LanguageContext';
import '../../src/styles/index.css';
import Postventa from '../../src/app/BasicModules/Sales/Postventa/Postventa';
import { postSaleWorkspaceApi as api, type ContinuityItem, type ContinuityFlow, type ContinuityDetail } from '../../src/app/BasicModules/Sales/Postventa/workspace/postSaleWorkspaceApi';
import { authApi } from '../../src/app/api/auth';
import { workspaceStateApi } from '../../src/app/api/workspaceState';
authApi.getSessionOrNull=async()=>({company:{id:-2},user:{id:-2}} as never);
workspaceStateApi.get=async()=>({state:{},schemaVersion:1} as never);
workspaceStateApi.save=async(_m,_t,state)=>({state,schemaVersion:1});
const stages=[{key:'pending',label:'Pending',colorToken:'BLUE'},{key:'coordination',label:'Coordination',colorToken:'AQUA'},{key:'delivery',label:'Delivery',colorToken:'YELLOW'},{key:'verification',label:'Verification',colorToken:'VIOLET'},{key:'completed',label:'Completed',colorToken:'GREEN'}];
let flows:ContinuityFlow[]=[{id:0,name:'Delivery and service',stages,version:0,archived:false}];
let rows:ContinuityItem[]=Array.from({length:33},(_,i)=>({kind:i<30?'won':'lost',sourceId:i+1,reference:(i<30?'SAL-':'OPP-')+String(i+1).padStart(5,'0'),title:'Programa de servicio '+(i+1),clientName:['Clínica Horizonte','Consultorios del Valle','Centro Médico Alba','Salud Empresarial'][i%4]+' · '+(i+1),contactName:['Mariana Torres','Ricardo Salas','Fernanda Vega'][i%3],phone:'',email:'',contactId:null,opportunityId:null,workId:i<30?i+1:null,version:i<30?1:0,flowId:0,stageKey:i<24?'pending':i<30?'delivery':'unscheduled',ownerId:1,ownerName:'Vendedor de prueba',nextAction:i<30?'Confirmar entrega y documentación':'',nextActionDate:i<5?'2026-10-17':i<30?'2026-10-20':null,notes:'',lossReason:i<30?'':'Revisar presupuesto el próximo mes',recoveryStatus:'unscheduled',recoveredOpportunityId:null}));
const events=new Map<number,ContinuityDetail['history']>();const receipts=new Map<string,ContinuityDetail>();let failNext=false;
// This fixture emulates the server's global order before slicing the page.
api.workspace=async(params)=>{
 const size=params.pageSize??50;
 const items=rows.filter(row=>row.kind===params.kind&&(!params.search||row.clientName.toLowerCase().includes(params.search.toLowerCase()))&&(params.flow===undefined||params.flow===row.flowId)&&(!params.owner||params.owner===row.ownerId)&&(!params.stage||params.stage==='all'||params.stage===(row.kind==='won'?row.stageKey:row.recoveryStatus)));
 const value=(row:ContinuityItem):string|number|null=>{
  switch(params.sort??'nextAction'){
   case 'client':return row.clientName.trim()||row.title.trim()||null;
   case 'sale':return row.reference.trim()||null;
   case 'owner':return row.ownerName.trim()||null;
   case 'lossReason':return row.lossReason.trim()||null;
   case 'stage':return row.kind==='lost'?['unscheduled','scheduled','paused','recovered'].indexOf(row.recoveryStatus):flows.find(flow=>flow.id===row.flowId)?.stages.findIndex(stage=>stage.key===row.stageKey)??null;
   default:return row.nextActionDate;
  }
 };
 items.sort((a,b)=>{const left=value(a),right=value(b);if(left===null||right===null)return left===right?b.sourceId-a.sourceId:left===null?1:-1;
  const comparison=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'es',{sensitivity:'base'});
  return comparison*(params.direction==='desc'?-1:1)||b.sourceId-a.sourceId;
 });
 return {items:items.slice((params.page-1)*size,params.page*size),counts:{total:items.length,overdue:items.filter(row=>row.nextActionDate&&row.nextActionDate<'2026-10-18').length,today:0,unscheduled:items.filter(row=>!row.nextActionDate).length,completed:items.filter(row=>row.stageKey==='completed'||row.recoveryStatus==='recovered').length},page:params.page,pageSize:size,flows,owners:[{id:1,name:'Vendedor de prueba'}],today:'2026-10-18',timezone:'America/Toronto',canReactivate:true};
};
api.detail=async(kind,id)=>structuredClone({item:rows.find(row=>row.sourceId===id&&row.kind===kind)!,history:events.get(id)??[]});
api.save=async(kind,id,cmd)=>{if(receipts.has(cmd.requestKey))return receipts.get(cmd.requestKey)!;const item=rows.find(row=>row.sourceId===id)!;if(item.version!==cmd.version)throw {status:409};Object.assign(item,cmd,{workId:id,version:item.version+1,recoveryStatus:cmd.paused?'paused':cmd.nextActionDate?'scheduled':'unscheduled'});events.set(id,[{id:Date.now(),type:'updated',actor:item.ownerName,createdAt:new Date().toISOString(),detail:JSON.stringify(cmd)},...events.get(id)??[]]);const result=await api.detail(kind,id);receipts.set(cmd.requestKey,result);if(failNext){failNext=false;throw new Error('Synthetic response lost');}return result;};
api.reactivate=async(id,cmd)=>{if(receipts.has(cmd.requestKey))return receipts.get(cmd.requestKey)!;const item=rows.find(row=>row.sourceId===id)!;Object.assign(item,{recoveredOpportunityId:1000+id,recoveryStatus:'recovered',version:item.version+1});events.set(id,[{id:Date.now(),type:'reactivated',actor:item.ownerName,createdAt:new Date().toISOString(),detail:JSON.stringify({opportunityName:cmd.opportunityName})},...events.get(id)??[]]);const result=await api.detail('lost',id);receipts.set(cmd.requestKey,result);return result;};
api.saveFlow=async(id,cmd)=>{const flow={...cmd,id:id??flows.length,version:(flows.find(row=>row.id===id)?.version??0)+1};flows=[...flows.filter(row=>row.id!==flow.id),flow];return flow;};
function Fixture(){const [dark,setDark]=useState(false);const [armed,setArmed]=useState(false);return <div className={dark?'dark':''}><div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><header className="flex flex-wrap justify-between gap-3 border-b p-3 text-sm"><span>Prueba aislada · 30 ventas y 3 pérdidas sintéticas</span><div className="flex gap-4"><button onClick={()=>setDark(!dark)}>Cambiar tema</button><button onClick={()=>{failNext=true;setArmed(true);}}>{armed?'Fallo de red preparado':'Simular respuesta perdida'}</button></div></header><Postventa/></div></div>;}
createRoot(document.getElementById('root')!).render(<BrowserRouter><LanguageProvider><Fixture/></LanguageProvider></BrowserRouter>);
