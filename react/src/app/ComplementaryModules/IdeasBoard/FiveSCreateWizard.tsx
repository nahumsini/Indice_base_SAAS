import {useEffect,useRef,useState} from 'react';
import {Pencil} from 'lucide-react';
import {IndiceModalFrame,IndiceModalSummary,IndiceModalValidation,IndiceModalWizardStepper} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import type {BoardFileContext} from '../../BasicModules/Sales/Funneling/boardFileTools';
import type {FiveSSection} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {fiveSEmoji,fiveSSections} from './fiveSModel';
import {buildFiveSSetup,emptyFiveSPlans,validFiveSArea,validFiveSPlan,type FiveSActionPlan} from './fiveSSetupModel';
import {fiveSWizardCopy} from './fiveSWizardCopy';
import './fiveSCreateWizard.css';

export function FiveSCreateWizard({context,locale,onClose,onCreated}:{context:BoardFileContext;locale:string;onClose:()=>void;onCreated:()=>void}) {
 const c=fiveSCopy(locale),w=fiveSWizardCopy(locale);
 const [step,setStep]=useState(0),[reviewed,setReviewed]=useState(false),[area,setArea]=useState('');
 const [plans,setPlans]=useState(emptyFiveSPlans),[expected,setExpected]=useState(()=>context.capture());
 const [error,setError]=useState(''),[info,setInfo]=useState(''),created=useRef(false),latest=useRef(context);latest.current=context;
 const body=useRef<HTMLDivElement>(null),focus=useRef<HTMLDivElement>(null);
 const labels=[w.areaStep,...fiveSSections.map(s=>w[`${s}Step`]),w.reviewStep];
 const areaExamples=[w.kitchenExample,w.workshopExample,w.vehicleExample,w.receptionExample,w.digitalExample];
 const section=step>0&&step<6?fiveSSections[step-1]:undefined,plan=section?plans[section]:undefined;
 const count=fiveSSections.filter(s=>plans[s].enabled&&validFiveSPlan(plans[s])).length;
 const progress=w.progress.replace('{step}',String(step+1)).replace('{name}',labels[step]);
 useEffect(()=>{if(body.current)body.current.scrollTop=0;focus.current?.focus({preventScroll:true});body.current?.querySelector('.five-s-create-steps [aria-current="step"]')?.scrollIntoView({block:'nearest',inline:'center'});},[step]);
 function update(section:FiveSSection,changes:Partial<FiveSActionPlan>){setPlans(value=>({...value,[section]:{...value[section],...changes}}));setError('');setInfo('');}
 function go(next:number,deferred=false){
  if(next>step&&(!validFiveSArea(area)||section&&!deferred&&!validFiveSPlan(plans[section]))){setError(step===0?w.areaRequired:w.invalidPlan);return;}
  setError('');setInfo('');if(next===6)setReviewed(true);setStep(next);
 }
 function defer(){
  if(!section)return;
  update(section,{enabled:false});go(reviewed?6:step+1,true);
 }
 function addIdea(idea:string){
  if(!section||!plan)return;
  const text=plan.action.trim(),next=text?(text.split('\n').includes(idea)?text:text+'\n'+idea):idea;
  if(next.length<=1000)update(section,{enabled:true,action:next});
 }
 useEffect(()=>{const input=body.current?.querySelector('textarea');if(input){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,240)+'px';}},[step,plan?.action]);
 function create(){
  if(created.current||!latest.current.ready)return;
  if(!validFiveSArea(area)){setError(w.areaRequired);setStep(0);return;}
  const invalid=fiveSSections.find(s=>!validFiveSPlan(plans[s]));if(invalid){setError(w.invalidPlan);setStep(fiveSSections.indexOf(invalid)+1);return;}
  const next=buildFiveSSetup(expected.content,area,plans,locale);
  if(!next){setError(c.limit);return;}
  if(!latest.current.replace(expected,next)){setError(w.notCreated);return;}
  created.current=true;latest.current.notify(w.saved);onCreated();
 }
 const dateLabel=(value:string)=>{const date=new Date(value+'T12:00:00');return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(date):value;};
 return <IndiceModalFrame open modalType="wizard" contentClassName="five-s-create-modal" title={c.create} description={step===0?w.intro:step===6?w.reviewHint:w[`${section!}Hint`]} eyebrow={progress} tone="coral" icon={<span aria-hidden="true">{section?fiveSEmoji[section]:'🧹'}</span>} closeLabel={c.cancel} onOpenChange={open=>{if(!open)onClose();}} bodyRef={body}
  footerLeading={<Button type="button" variant="outline" onClick={onClose}>{c.cancel}</Button>}
  footerSummary={count===0?w.noActionsYet:count===1?w.oneAction:w.actionCount.replace('{count}',String(count))}
  footer={<>{step>0&&<Button type="button" variant="outline" onClick={()=>go(step-1)}>{w.back}</Button>}{section&&<Button type="button" variant="outline" className="five-s-defer" onClick={defer}>{w.later}</Button>}{step<6?<Button type="submit" form="five-s-create-form">{reviewed?w.reviewStep:w.next}</Button>:<Button type="button" disabled={!context.ready} onClick={create}>{c.create}</Button>}</>}>
  <form id="five-s-create-form" className="five-s-create" onSubmit={event=>{event.preventDefault();if(step<6)go(reviewed?6:step+1);else create();}}>
   <IndiceModalWizardStepper className="five-s-create-steps" accent="coral" density="compact" activeStepId={String(step)} progressLabel={progress} steps={labels.map((label,index)=>({id:String(index),label}))} onStepSelect={step===6?id=>go(Number(id)):undefined}/>
   <IndiceModalValidation messages={error?[error]:[]} />
   {error===w.notCreated&&<Button type="button" variant="outline" disabled={!context.ready} onClick={()=>{setExpected(latest.current.capture());setError('');setInfo(w.refreshed);}}>{w.refresh}</Button>}
   <IndiceModalValidation tone="info" messages={info?[info]:[]}/>
   <div key={step} ref={focus} tabIndex={-1} className="five-s-step" data-five-s-step={step}>
    {step===0&&<>
     <div className="five-s-step-heading"><h3>{w.areaQuestion}</h3><p>{w.areaHint}</p></div>
     <label className="workspace-field"><span>{w.areaName} *</span><input required maxLength={80} value={area} aria-describedby="five-s-area-examples" placeholder={w.areaExample} aria-invalid={!!error&&!validFiveSArea(area)} onChange={event=>{setArea(event.target.value);setError('');}}/></label>
     <div className="five-s-area-examples" role="group" aria-labelledby="five-s-area-examples">
      <p id="five-s-area-examples">{w.areaExamples}</p>
      <div>{areaExamples.map(example=><button type="button" key={example} onClick={()=>{setArea(example);setError('');setInfo('');}}>{example}</button>)}</div>
     </div>
    </>}
    {section&&plan&&<>
     <div className="five-s-step-heading"><span className="five-s-area-name">{area}</span><h3 id="five-s-action-question">{w[`${section}ActionQuestion`]}{plan.enabled&&<span aria-hidden="true"> *</span>}</h3></div>
     <label className="workspace-field"><span className="sr-only">{w.answer}</span><textarea aria-labelledby="five-s-action-question" rows={2} required={plan.enabled} maxLength={1000} value={plan.action} placeholder={w[`${section}Example`]} aria-invalid={!!error&&!plan.action.trim()} onChange={event=>update(section,{enabled:true,action:event.target.value})}/></label>
     {!plan.enabled&&<p className="five-s-deferred" role="status">{w.deferredDraft}{plan.action.trim()&&<button type="button" className="five-s-use-example" onClick={()=>update(section,{enabled:true})}>{w.resume}</button>}</p>}
     <div className="five-s-area-examples five-s-action-ideas" role="group" aria-labelledby="five-s-ideas-label">
      <p id="five-s-ideas-label">{plan.action.trim()?w.appendIdeas:w.pickIdea}</p>
      <div>{[w[`${section}Idea1`],w[`${section}Idea2`]].map(idea=><button type="button" key={idea} disabled={(plan.action.trim()+'\n'+idea).trim().length>1000&&!plan.action.trim().split('\n').includes(idea)} onClick={()=>addIdea(idea)}>{idea}</button>)}</div>
     </div>
     <details className="five-s-follow-up" open={!!error&&!!plan.action.trim()&&!validFiveSPlan(plan)||undefined}>
      <summary>{w.followUp}{(plan.owner.trim()||plan.dueDate)&&<span className="five-s-follow-up-summary">{[plan.owner.trim(),plan.dueDate?dateLabel(plan.dueDate):''].filter(Boolean).join(' · ')}</span>}</summary><div>
       {section==='SUSTAIN'&&<p className="five-s-sustain-help">{w.sustainFollowUp}</p>}
       <label className="workspace-field"><span>{c.owner}</span><input maxLength={120} value={plan.owner} placeholder={c.ownerHint} onChange={event=>update(section,{owner:event.target.value})}/></label>
       <label className="workspace-field"><span>{c.due}</span><input type="date" min="1900-01-01" max="9999-12-31" value={plan.dueDate} onChange={event=>update(section,{dueDate:event.target.value})}/></label>
      </div></details>
    </>}
    {step===6&&<>
     <div className="five-s-step-heading"><h3>{w.reviewTitle}</h3></div>
     <div className="five-s-review-area"><IndiceModalSummary className="five-s-review-summary" columns={2} variant="muted" items={[{label:c.area,value:area}]}/><Button type="button" variant="outline" onClick={()=>go(0)}>{w.edit}</Button></div>
     <div className="five-s-review-list">{fiveSSections.map((s,index)=>{const item=plans[s];return <section key={s} className="five-s-review-item"><header><h4><span aria-hidden="true">{fiveSEmoji[s]}</span> {c[s]}</h4><button type="button" aria-label={`${w.edit}: ${c[s]}`} onClick={()=>go(index+1)}><Pencil size={15}/>{w.edit}</button></header>{item.enabled?<details className="five-s-review-detail"><summary>{item.action.trim().length>100?item.action.trim().slice(0,100)+'…':item.action.trim()}</summary><div><p>{item.action.trim()}</p><small>{item.owner.trim()||c.noOwner} · {item.dueDate?dateLabel(item.dueDate):c.noDate}</small></div></details>:<p className="five-s-deferred">{w.forLater}</p>}</section>;})}</div>
    </>}
   </div>
  </form>
 </IndiceModalFrame>;
}
