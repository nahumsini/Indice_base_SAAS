import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Check,Copy,Palette,Plus,RotateCcw,Workflow} from 'lucide-react';
import {Button} from '../../../../components/ui/button';
import {Input} from '../../../../components/ui/input';
import {IndiceConfirmationDialog} from '../../../../components/indice-modal';
import {IndiceWorkspaceNavigation} from '../../../../components/frontend-os';
import {useLanguage} from '../../../../shared/context';
import {SalesModalFrame} from '../../components/SalesModalFrame';
import {defaultOpportunityFlowStages,type OpportunityFlow,type OpportunityFlowStage} from '../../salesCrmContext';
import type {ProspectosCopy} from '../translations';
import {getOpportunityStageLabel} from '../utils/prospectosFlow';
import {applyFlowColors,type FlowColors} from '../utils/flowPersonalColors';
import {OpportunityFlowListCard} from './OpportunityFlowListCard';
import {OpportunityFlowStageEditor} from './OpportunityFlowStageEditor';
import {OpportunityFlowRetirementModal} from './OpportunityFlowRetirementModal';
import {flowManagerCopy,flowText} from './flowManagerCopy';
import './opportunityFlowManager.css';
const localize=(stages:OpportunityFlowStage[],labels:Record<string,string>,clear=false)=>stages.map((stage,position)=>({...stage,label:getOpportunityStageLabel(stage,labels),position,opportunityCount:clear?0:stage.opportunityCount,usesDefaultLabel:false}));
const stageSnapshot=(name:string,stages:OpportunityFlowStage[])=>JSON.stringify([name,stages.map(s=>[s.key,s.label,s.type,s.colorToken,s.defaultProbabilityPercent])]);
export function OpportunityFlowManagerModal({open,scriptsLabel,onScripts,flows,selectedFlowId,canManage,loadError,copy,localizedDefaultLabels,onOpenChange,onRetry,onSelectFlow,onCreate,onUpdate,personalColors={},colorsReady=false,colorsError=false,onRetryColors,onSaveColors,onRetired}: {
 open:boolean;scriptsLabel?:string;onScripts?:(flowId:number)=>void;flows:OpportunityFlow[];selectedFlowId:number|null;canManage:boolean;loadError:string;copy:ProspectosCopy['flow'];localizedDefaultLabels:Record<string,string>;onOpenChange:(open:boolean)=>void;onRetry:()=>void;onSelectFlow:(flowId:number)=>Promise<void>;onCreate:(name:string,stages:OpportunityFlowStage[])=>Promise<OpportunityFlow>;onUpdate:(flowId:number,name:string,stages:OpportunityFlowStage[])=>Promise<OpportunityFlow>;
 personalColors?:Record<number,FlowColors>;colorsReady?:boolean;colorsError?:boolean;onRetryColors?:()=>void;onSaveColors?:(id:number,colors:FlowColors)=>Promise<void>;onRetired?:(source:number,target:number)=>Promise<void>;
}) {
 const {currentLanguage}=useLanguage(),text=flowManagerCopy(currentLanguage.code);
 const [view,setView]=useState<'catalog'|'editor'>('catalog'),[mode,setMode]=useState<'team'|'colors'>('team');
 const [id,setId]=useState<number|null>(null),[creating,setCreating]=useState(false),[name,setName]=useState(''),[stages,setStages]=useState<OpportunityFlowStage[]>([]),[colors,setColors]=useState<FlowColors>({});
 const [busy,setBusy]=useState(false),[activating,setActivating]=useState<number|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retire,setRetire]=useState<OpportunityFlow|null>(null),[discard,setDiscard]=useState<(()=>void)|null>(null);
 const initial=useRef(''),initialColors=useRef('{}'),latch=useRef(false);
 const original=flows.find(flow=>flow.id===id),factory=!!original?.factory&&!creating,canEdit=canManage&&!factory;
 const dirty=view==='editor'&&(stageSnapshot(name,stages)!==initial.current||JSON.stringify(colors)!==initialColors.current);
 const sorted=useMemo(()=>[...flows].sort((a,b)=>Number(b.id===selectedFlowId)-Number(a.id===selectedFlowId)||Number(b.factory)-Number(a.factory)),[flows,selectedFlowId]);
 useEffect(()=>{if(open){setView('catalog');setRetire(null);setError('');setNotice('');setDiscard(null);}},[open]);
 useEffect(()=>{if(!open)return;const warn=(event:BeforeUnloadEvent)=>{if(dirty||busy){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,busy,open]);
 useEffect(()=>{if(open&&view==='editor'&&!creating&&id!==null&&colorsReady&&JSON.stringify(colors)===initialColors.current){const next=personalColors[id]??{};if(JSON.stringify(next)!==initialColors.current){setColors({...next});initialColors.current=JSON.stringify(next);}}},[open,view,creating,id,colorsReady,personalColors]);
 const leave=(action:()=>void)=>{if(busy||latch.current||activating!==null)return;if(dirty)setDiscard(()=>action);else action();};
 function editor(flow:OpportunityFlow|null,duplicate=false){
  const isNew=!flow||duplicate,source=flow??flows.find(f=>f.factory),draft=localize(source?.stages??defaultOpportunityFlowStages,localizedDefaultLabels,isNew);
  const nextName=duplicate?flowText(text.copyName,{name:flow!.factory?text.factoryName:flow!.name}).slice(0,100):flow?.name??copy.newFlowName;
  const nextColors=!isNew&&flow?personalColors[flow.id]??{}:{};
  setCreating(isNew);setId(isNew?null:flow!.id);setName(nextName);setStages(draft);setColors({...nextColors});setMode('team');setError('');setNotice('');setView('editor');
  initial.current=stageSnapshot(nextName,draft);initialColors.current=JSON.stringify(nextColors);
 }
 const validStages=stages.length>=3&&stages.length<=12&&stages.every(s=>s.label.trim().length>=2&&s.label.trim().length<=80)&&new Set(stages.map(s=>s.label.trim().toLocaleLowerCase())).size===stages.length;
 const canSave=mode==='colors'?colorsReady&&id!==null&&id>0&&!loadError&&!!onSaveColors:canEdit&&name.trim().length>=2&&name.trim().length<=100&&validStages;
 async function save(){
  if(latch.current||busy||!canSave)return;latch.current=true;setBusy(true);setError('');setNotice('');
  try {
   if(mode==='colors'&&id!==null){await onSaveColors!(id,colors);initialColors.current=JSON.stringify(colors);setNotice(text.colorsSaved);}
   else {
    const saved=creating?await onCreate(name.trim(),stages):await onUpdate(id!,name.trim(),stages);
    setId(saved.id);setCreating(false);setName(saved.name);const draft=localize(saved.stages,localizedDefaultLabels);setStages(draft);initial.current=stageSnapshot(saved.name,draft);
    await onSelectFlow(saved.id);setView('catalog');
   }
  }catch{setError(text.saveError);}finally{latch.current=false;setBusy(false);}
 }
 async function activate(flowId:number){if(activating!==null||latch.current)return;latch.current=true;setActivating(flowId);setError('');try{await onSelectFlow(flowId);}catch{setError(copy.loadError);}finally{latch.current=false;setActivating(null);}}
 function switchMode(next:'team'|'colors') {leave(()=>{const draft=localize(original?.stages??stages,localizedDefaultLabels);if(original){setStages(draft);setName(original.name);initial.current=stageSnapshot(original.name,draft);}setColors({...personalColors[id??0]??{}});initialColors.current=JSON.stringify(personalColors[id??0]??{});setMode(next);setError('');setNotice('');});}
 if(discard)return <IndiceConfirmationDialog open title={text.unsavedTitle} description={text.unsavedHint} tone="coral" cancelLabel={text.keep} confirmLabel={text.discard} onCancel={()=>setDiscard(null)} onConfirm={()=>{const action=discard;setDiscard(null);action();}}/>;
 if(retire&&onRetired)return <OpportunityFlowRetirementModal flow={retire} flows={flows.map(flow=>({...flow,stages:localize(flow.stages,localizedDefaultLabels)}))} copy={copy} text={text} onClose={()=>setRetire(null)} onSaved={async(source,target)=>{await onRetired(source,target);setRetire(null);}}/>;
 return <SalesModalFrame open={open} onOpenChange={next=>next?onOpenChange(true):leave(()=>onOpenChange(false))} title={view==='catalog'?text.title:factory?text.factoryName:creating?copy.createTitle:copy.editTitle(name)} description={view==='catalog'?text.description:mode==='colors'?text.personalHint:text.teamHint} icon={mode==='colors'&&view==='editor'?<Palette/>:<Workflow/>} modalType="operational-workspace" busy={busy||activating!==null} closeLabel={copy.close} contentClassName={`flow-manager-modal ${view==='editor'?'flow-manager-editor':'flow-manager-catalog'}`} bodyClassName="!p-0" footerSummary={view==='catalog'?`${flows.length}/10 · ${copy.catalogTitle}`:copy.editorSummary(stages.length,stages.filter(s=>s.type==='OPEN').length)}
  footer={view==='catalog'?<Button variant="outline" onClick={()=>onOpenChange(false)}>{copy.close}</Button>:<><Button variant="outline" disabled={busy} onClick={()=>leave(()=>setView('catalog'))}>{copy.cancel}</Button>{(canEdit||mode==='colors')&&<Button className="flow-primary" disabled={busy||!canSave||(!dirty&&!creating)} onClick={()=>void save()}><Check size={16}/>{busy?copy.saving:mode==='colors'?text.saveColors:creating?copy.create:copy.save}</Button>}</>}>
  <div className="flow-manager-content">
   {view==='catalog'?<>
    <div className="flow-catalog-toolbar"><span>{copy.catalogTitle}</span><Button className="flow-primary" disabled={!canManage||!!loadError||flows.length>=10} onClick={()=>editor(null)}><Plus size={17}/>{copy.newFlow}</Button></div>
    {(loadError||error)&&<div className="flow-message flow-error" role="alert">{loadError||error}<Button variant="outline" onClick={onRetry}>{copy.retry}</Button></div>}
    <div className="flow-catalog-list">{sorted.map(flow=><OpportunityFlowListCard key={flow.id} flow={{...flow,stages:applyFlowColors(localize(flow.stages,localizedDefaultLabels),personalColors[flow.id]??{})}} selected={flow.id===selectedFlowId} canManage={canManage} activating={activating!==null} copy={copy} text={text} scriptsLabel={scriptsLabel} canDuplicate={flows.length<10} onActivate={()=>void activate(flow.id)} onOpen={()=>editor(flow)} onDuplicate={()=>editor(flow,true)} onDelete={onRetired?()=>setRetire(flow):()=>{}} onScripts={onScripts?()=>onScripts(flow.id):undefined}/>)}</div>
   </>:<>
    <div className="flow-editor-toolbar"><Button variant="ghost" disabled={busy} onClick={()=>leave(()=>setView('catalog'))}><ArrowLeft size={16}/>{copy.backToFlows}</Button>{factory&&canManage&&<Button variant="outline" onClick={()=>leave(()=>editor(original!,true))}><Copy size={16}/>{text.createCopy}</Button>}</div>
    {!creating&&<IndiceWorkspaceNavigation variant="views" tone="coral" value={mode} ariaLabel={text.title} onValueChange={value=>switchMode(value as 'team'|'colors')} items={[{id:'team',label:text.team},{id:'colors',label:text.myColors,icon:<Palette size={16}/>}]}/>}
    {factory&&mode==='team'&&<p className="flow-message">🔒 {text.factoryHint}</p>}
    {mode==='team'&&canEdit&&<label className="flow-name-field" htmlFor="opportunity-flow-name">{copy.flowName}<Input id="opportunity-flow-name" value={name} maxLength={100} disabled={busy} onChange={event=>setName(event.target.value)}/></label>}
    {mode==='colors'&&<div className="flow-colors-toolbar"><Button variant="outline" disabled={!colorsReady||busy} onClick={()=>setColors({})}><RotateCcw size={16}/>{text.resetColors}</Button></div>}
    {mode==='colors'&&colorsError&&<div className="flow-message flow-error" role="alert">{text.loadColorsError}<Button variant="outline" onClick={onRetryColors}>{copy.retry}</Button></div>}
    {error&&<div className="flow-message flow-error" role="alert">{error}</div>}{notice&&<p className="flow-message flow-success" role="status">✓ {notice}</p>}
    <OpportunityFlowStageEditor stages={stages} canEdit={canEdit&&mode==='team'} busy={busy} copy={copy} onChange={setStages} mode={mode} colors={colors} onColorsChange={setColors} text={text} colorsReady={colorsReady&&!colorsError&&!!id&&id>0&&!loadError}/>
   </>}
  </div>
 </SalesModalFrame>;
}
