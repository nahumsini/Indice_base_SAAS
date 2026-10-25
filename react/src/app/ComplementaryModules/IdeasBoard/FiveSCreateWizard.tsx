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
 const [step,setStep]=useState(0),[reviewed,setReviewed]=useState(false),[preset,setPreset]=useState('office'),[area,setArea]=useState(c.office);
 const [plans,setPlans]=useState(emptyFiveSPlans),[expected,setExpected]=useState(()=>context.capture());
 const [error,setError]=useState(''),[info,setInfo]=useState(''),created=useRef(false),latest=useRef(context);latest.current=context;
 const body=useRef<HTMLDivElement>(null),focus=useRef<HTMLDivElement>(null);
 const labels=[w.areaStep,...fiveSSections.map(s=>c[s]),w.reviewStep];
 const section=step>0&&step<6?fiveSSections[step-1]:undefined,plan=section?plans[section]:undefined;
 const count=fiveSSections.filter(s=>plans[s].enabled&&validFiveSPlan(plans[s])).length;
 const progress=w.progress.replace('{step}',String(step+1)).replace('{name}',labels[step]);
 useEffect(()=>{if(body.current)body.current.scrollTop=0;focus.current?.focus({preventScroll:true});},[step]);
 function update(section:FiveSSection,changes:Partial<FiveSActionPlan>){setPlans(value=>({...value,[section]:{...value[section],...changes}}));setError('');setInfo('');}
 function go(next:number){
  if(next>step&&(!validFiveSArea(area)||section&&!validFiveSPlan(plans[section]))){setError(step===0?w.areaRequired:w.invalidPlan);return;}
  setError('');setInfo('');if(next===6)setReviewed(true);setStep(next);
 }
 function create(){
  if(created.current||!latest.current.ready)return;
  if(!validFiveSArea(area)){setError(w.areaRequired);setStep(0);return;}
  const invalid=fiveSSections.find(s=>!validFiveSPlan(plans[s]));if(invalid){setError(w.invalidPlan);setStep(fiveSSections.indexOf(invalid)+1);return;}
  const next=buildFiveSSetup(expected.content,area,plans,locale);
  if(!next){setError(c.limit);return;}
  if(!latest.current.replace(expected,next)){setError(w.notCreated);return;}
  created.current=true;latest.current.notify(w.saved);onCreated();
 }
 const dateLabel=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(value+'T12:00:00'));
 return <IndiceModalFrame open modalType="wizard" contentClassName="five-s-create-modal" title={c.create} description={step===0?w.intro:step===6?w.reviewHint:c[`${section!}Help`]} eyebrow={progress} tone="coral" icon={<span aria-hidden="true">{section?fiveSEmoji[section]:'🧹'}</span>} closeLabel={c.cancel} onOpenChange={open=>{if(!open)onClose();}} bodyRef={body}
  footerLeading={<Button type="button" variant="outline" onClick={onClose}>{c.cancel}</Button>}
  footerSummary={`${count} / 5 · ${w.planned}`}
  footer={<>{step>0&&<Button type="button" variant="outline" onClick={()=>go(step-1)}>{w.back}</Button>}{step<6?<Button type="submit" form="five-s-create-form">{reviewed?w.reviewStep:w.next}</Button>:<Button type="button" disabled={!context.ready} onClick={create}>{c.create}</Button>}</>}>
  <form id="five-s-create-form" className="five-s-create" onSubmit={event=>{event.preventDefault();if(step<6)go(reviewed?6:step+1);else create();}}>
   <IndiceModalWizardStepper accent="coral" density="compact" activeStepId={String(step)} progressLabel={progress} steps={labels.map((label,index)=>({id:String(index),label}))} onStepSelect={step===6?id=>go(Number(id)):undefined}/>
   <IndiceModalValidation messages={error?[error]:[]} />
   {error===w.notCreated&&<Button type="button" variant="outline" disabled={!context.ready} onClick={()=>{setExpected(latest.current.capture());setError('');setInfo(w.refreshed);}}>{w.refresh}</Button>}
   <IndiceModalValidation tone="info" messages={info?[info]:[]}/>
   <div key={step} ref={focus} tabIndex={-1} className="five-s-step" data-five-s-step={step}>
    {step===0&&<>
     <div className="five-s-step-heading"><h3>{w.areaQuestion}</h3><p>{w.areaHint}</p></div>
     <label className="workspace-field"><span>{w.areaType}</span><select value={preset} onChange={event=>{const value=event.target.value;setPreset(value);setArea(value==='other'?'':c[value as 'office'|'warehouse'|'digital']);setError('');}}>{(['office','warehouse','digital','other'] as const).map(key=><option key={key} value={key}>{c[key]}</option>)}</select></label>
     <label className="workspace-field"><span>{w.areaName} *</span><input required maxLength={80} value={area} placeholder={w.areaExample} aria-invalid={!!error&&!validFiveSArea(area)} onChange={event=>{setArea(event.target.value);setError('');}}/></label>
    </>}
    {section&&plan&&<>
     <div className="five-s-step-heading"><span className="five-s-area-name">{area}</span><h3>{w[`${section}Question`]}</h3></div>
     <fieldset className="five-s-plan-options"><legend className="sr-only">{w.answerHint}</legend>{[true,false].map(enabled=><button type="button" key={String(enabled)} aria-pressed={plan.enabled===enabled} onClick={()=>update(section,{enabled})}>{enabled?w.prepareNow:w.later}</button>)}</fieldset>
     {plan.enabled?<>
      <label className="workspace-field"><span>{w.answer} *</span><textarea rows={4} required maxLength={1000} value={plan.action} placeholder={w[`${section}Example`]} aria-invalid={!!error&&!plan.action.trim()} onChange={event=>update(section,{action:event.target.value})}/><small>{w.answerHint}</small></label>
      <button type="button" className="five-s-use-example" onClick={()=>update(section,{action:w[`${section}Example`]})}>{w.useExample}</button>
      <details className="five-s-follow-up" open={!!error&&!!plan.action.trim()&&!validFiveSPlan(plan)||undefined}><summary>{w.followUp}</summary><div>
       <label className="workspace-field"><span>{c.owner}</span><input maxLength={120} value={plan.owner} placeholder={c.ownerHint} onChange={event=>update(section,{owner:event.target.value})}/></label>
       <label className="workspace-field"><span>{c.due}</span><input type="date" min="1900-01-01" max="9999-12-31" value={plan.dueDate} onChange={event=>update(section,{dueDate:event.target.value})}/></label>
      </div></details>
     </>:<p className="five-s-deferred">{w.deferredHint}</p>}
    </>}
    {step===6&&<>
     <div className="five-s-step-heading"><h3>{w.reviewTitle}</h3><p>{w.pendingHint}</p></div>
     <IndiceModalSummary columns={2} variant="muted" items={[{label:c.area,value:area},{label:w.planned,value:`${count} / 5`}]}/>
     <Button type="button" variant="outline" onClick={()=>go(0)}>{w.edit}: {c.area}</Button>
     <div className="five-s-review-list">{fiveSSections.map((s,index)=>{const item=plans[s];return <section key={s} className="five-s-review-item"><header><h4><span aria-hidden="true">{fiveSEmoji[s]}</span> {c[s]}</h4><button type="button" aria-label={`${w.edit}: ${c[s]}`} onClick={()=>go(index+1)}><Pencil size={15}/>{w.edit}</button></header>{item.enabled?<><p>{item.action.trim()}</p><small>{item.owner.trim()||c.noOwner} · {item.dueDate?dateLabel(item.dueDate):c.noDate}</small></>:<p className="five-s-deferred">{w.deferred}</p>}</section>;})}</div>
    </>}
   </div>
  </form>
 </IndiceModalFrame>;
}
