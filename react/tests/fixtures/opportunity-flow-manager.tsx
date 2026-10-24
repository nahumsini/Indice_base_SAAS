import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider,useLanguage,languages} from '../../src/app/shared/context';
import {OpportunityFlowManagerModal} from '../../src/app/BasicModules/Sales/Prospectos/modals/OpportunityFlowManagerModal';
import {prospectosTranslations} from '../../src/app/BasicModules/Sales/Prospectos/translations/prospectosTranslations';
import {defaultOpportunityFlowStages,type OpportunityFlow} from '../../src/app/BasicModules/Sales/types/opportunities';
import {setCachedAuthSession} from '../../src/app/api/authSessionStore';
import type {AuthSessionResponse} from '../../src/app/api/auth.types';
import type {FlowColors} from '../../src/app/BasicModules/Sales/Prospectos/utils/flowPersonalColors';
import {salesApi} from '../../src/app/BasicModules/Sales/salesApi';
import '../../src/styles/index.css';
setCachedAuthSession({user:{id:101,name:'Revisión local',role:'ROOT'},company:{id:101,name:'Empresa de ejemplo'}} as AuthSessionResponse);
const initial:OpportunityFlow[]=[{id:1,key:'factory',name:'Factory flow',factory:true,defaultFlow:true,stages:defaultOpportunityFlowStages.map((s,i)=>({...s,opportunityCount:i===0?5:0}))},{id:2,key:'consultoria',name:'Ventas de consultoría',factory:false,defaultFlow:false,stages:defaultOpportunityFlowStages.map((s,i)=>({...s,label:['Primer contacto','Diagnóstico','Reunión de propuesta','Cotización','Negociación','Ganada','Perdida'][i],usesDefaultLabel:false,opportunityCount:i<3?23:1}))}];
function Fixture(){
 const {currentLanguage,setCurrentLanguage}=useLanguage();const copy=prospectosTranslations[currentLanguage.code]??prospectosTranslations['es-MX'];
 const [flows,setFlows]=useState(initial),[selected,setSelected]=useState(2),[open,setOpen]=useState(true),[colors,setColors]=useState<Record<number,FlowColors>>({}),[fail,setFail]=useState(false),[message,setMessage]=useState('');
 salesApi.previewFlowRetirement=async(id,target)=>({flowId:id,targetFlowId:target,signature:'a'.repeat(64),opportunityCount:flows.find(f=>f.id===id)!.stages.reduce((n,s)=>n+s.opportunityCount,0),stages:flows.find(f=>f.id===id)!.stages.map(s=>({...s,key:s.key.toLowerCase()}))});
 salesApi.retireOpportunityFlow=async(id,command)=>{if(fail)throw Error('Synthetic interruption');return{flowId:id,targetFlowId:command.targetFlowId,movedCount:71};};
 return <main style={{padding:20,minHeight:'100dvh',background:'#f7f9fb'}}><h1>Flujos de venta · Datos de ejemplo</h1><div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:20}}><button onClick={()=>setOpen(true)}>Administrar flujos</button><button onClick={()=>setCurrentLanguage(languages.find(l=>l.code==='es-MX')!)}>Español</button><button onClick={()=>setCurrentLanguage(languages.find(l=>l.code==='en-CA')!)}>English</button><label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/>Simular error</label></div><p role="status">{message}</p><OpportunityFlowManagerModal open={open} scriptsLabel="Guiones" onScripts={id=>setMessage(`Guiones del flujo ${id}`)} flows={flows} selectedFlowId={selected} canManage loadError="" copy={copy.flow} localizedDefaultLabels={copy.options.stages} onOpenChange={setOpen} onRetry={()=>{}} onSelectFlow={async id=>setSelected(id)} onCreate={async(name,stages)=>{const flow={id:Date.now(),key:'synthetic',name,factory:false,defaultFlow:false,stages};setFlows(old=>[...old,flow]);return flow;}} onUpdate={async(id,name,stages)=>{const flow={...flows.find(f=>f.id===id)!,name,stages};setFlows(old=>old.map(f=>f.id===id?flow:f));return flow;}} personalColors={colors} colorsReady onSaveColors={async(id,value)=>{if(fail)throw Error('Synthetic interruption');setColors(old=>({...old,[id]:value}));}} onRetired={async(source,target)=>{setFlows(old=>old.filter(f=>f.id!==source));setSelected(target);}}/></main>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Fixture/></LanguageProvider>);
