import type {BoardContent,FiveSSection} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {addFiveSTemplate,fiveSSections,fiveSTemplates,newFiveSAction} from './fiveSModel';

export interface FiveSActionPlan {enabled:boolean;action:string;owner:string;dueDate:string}
export type FiveSActionPlans=Record<FiveSSection,FiveSActionPlan>;
export function emptyFiveSPlans():FiveSActionPlans {
 return Object.fromEntries(fiveSSections.map(section=>[section,{enabled:true,action:'',owner:'',dueDate:''}])) as FiveSActionPlans;
}
function validDate(value:string) {
 if(!value)return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'9999-12-31')return false;
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validFiveSArea(value:string) {return !!value.trim()&&value.trim().length<=80&&!/[\x00-\x1f\x7f]/.test(value);}
export function validFiveSPlan(plan:FiveSActionPlan) {
 return !plan.enabled||(!!plan.action.trim()&&plan.action.trim().length<=1000&&plan.owner.trim().length<=120&&validDate(plan.dueDate));
}
/** A short card title; the complete answer remains in the action field. */
export function fiveSActionTitle(answer:string) {
 const first=answer.trim().split(/\r?\n/).find(line=>line.trim())?.trim()??'';
 return first.length<=180?first:first.slice(0,179).replace(/[\uD800-\uDBFF]$/,'')+'…';
}
/** Build the entire area and its selected actions, or leave the source document untouched. */
export function buildFiveSSetup(content:BoardContent,area:string,plans:FiveSActionPlans,locale:string):BoardContent|null {
 if(!validFiveSArea(area)||fiveSSections.some(s=>!validFiveSPlan(plans[s])))return null;
 if(content.nodes.length+5+fiveSSections.filter(s=>plans[s].enabled).length>100)return null;
 let next=addFiveSTemplate(content,area,locale);if(!next)return null;
 const templates=fiveSTemplates(next),template=templates[templates.length-1].fiveS!;
 for(const section of fiveSSections){
  const plan=plans[section];if(!plan.enabled)continue;
  const node=newFiveSAction(next,template,section);if(!node)return null;
  next={...next,nodes:[...next.nodes,{...node,text:fiveSActionTitle(plan.action),fiveS:{...node.fiveS!,action:plan.action.trim(),owner:plan.owner.trim(),dueDate:plan.dueDate||null}}]};
 }
 return next;
}
