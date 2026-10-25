import {useRef,useState} from 'react';
import type {IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {IndiceModalFrame,IndiceModalValidation} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {fiveSCopy} from './fiveSCopy';

export function FiveSProgressDialog({node,locale,ready,onClose,onConfirm}:{node:IdeaNode;locale:string;ready:boolean;onClose:()=>void;onConfirm:(result:string,reviewDate:string|null)=>boolean}){
 const c=fiveSCopy(locale),[result,setResult]=useState(node.fiveS!.result??''),[reviewDate,setReviewDate]=useState(node.fiveS!.reviewDate??''),[error,setError]=useState(''),locked=useRef(false);
 function save(){
  if(locked.current||!ready||!result.trim()||result.length>1000)return;
  locked.current=true;
  if(!onConfirm(result.trim(),reviewDate||null)){setError(c.progressChanged);locked.current=false;}
 }
 return <IndiceModalFrame open modalType="standard-form" contentClassName="five-s-action-modal" title={c.verifyTitle} description={`${c[node.fiveS!.section]} · ${node.fiveS!.area}`} tone="coral" icon={<span>✅</span>} closeLabel={c.cancel} onOpenChange={open=>{if(!open)onClose();}}
  footerLeading={<Button type="button" variant="outline" onClick={onClose}>{c.cancel}</Button>} footerSummary={!result.trim()?c.resultRequired:undefined}
  footer={<Button type="submit" form="five-s-progress-form" disabled={!ready||!result.trim()}>{c.saveProgress}</Button>}>
  <form id="five-s-progress-form" className="five-s-fields" onSubmit={event=>{event.preventDefault();save();}}>
   <p className="five-s-verification-action">{node.text}</p>
   <label className="workspace-field"><span>{c.verifyQuestion} *</span><textarea autoFocus required rows={3} maxLength={1000} value={result} onChange={event=>{setResult(event.target.value);setError('');}}/><small>{c.verifiedHelp}</small></label>
   <label className="workspace-field"><span>{c.review} <small>({c.optional})</small></span><input type="date" min="1900-01-01" max="9999-12-31" value={reviewDate} onChange={event=>{setReviewDate(event.target.value);setError('');}}/></label>
   <IndiceModalValidation messages={error?[error]:[]}/>
  </form>
 </IndiceModalFrame>;
}
