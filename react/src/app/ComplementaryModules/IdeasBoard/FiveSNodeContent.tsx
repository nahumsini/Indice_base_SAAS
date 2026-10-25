import type {IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
import {fiveSEmoji} from './fiveSModel';
export function FiveSNodeContent({node,locale,onEdit}:{node:IdeaNode;locale:string;onEdit?:()=>void}){
 const f=node.fiveS!;if(!f)return null;const c=fiveSCopy(locale);
 return <div className="five-s-node" data-five-s-role={f.role}>
  {f.role==='SECTION'?<><span aria-hidden="true">{fiveSEmoji[f.section]}</span><strong>{c[f.section]}</strong><small>{c[`${f.section}Help`]}</small><small>{f.area}</small></>:<><span className="five-s-status" data-status={f.status}>{c[f.status??'PENDING']}</span><strong>{node.text}</strong><p>{f.action}</p><small>{f.owner||c.noOwner} · {f.dueDate||c.noDate}</small>{onEdit&&<button type="button" className="idea-board-button" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onEdit();}}>{c.details}</button>}</>}
 </div>;
}
