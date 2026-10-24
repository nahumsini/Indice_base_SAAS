import {Copy,Eye,MoreHorizontal,PencilLine,Trash2,Workflow,CheckCircle2,FileText} from 'lucide-react';
import {Button} from '../../../../components/ui/button';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '../../../../components/ui/dropdown-menu';
import type {OpportunityFlow} from '../../salesCrmContext';
import type {ProspectosCopy} from '../translations';
import {stageColor} from '../utils/flowPersonalColors';
import type {FlowManagerCopy} from './flowManagerCopy';
export function OpportunityFlowListCard({flow,selected,canManage,activating,copy,text,onActivate,onOpen,onDuplicate,onDelete,onScripts,scriptsLabel,canDuplicate}: {
 flow:OpportunityFlow;selected:boolean;canManage:boolean;activating:boolean;copy:ProspectosCopy['flow'];text:FlowManagerCopy;
 onActivate:()=>void;onOpen:()=>void;onDuplicate:()=>void;onDelete:()=>void;onScripts?:()=>void;scriptsLabel?:string;canDuplicate?:boolean;
}) {
 const name=flow.factory?text.factoryName:flow.name,count=flow.stages.reduce((total,stage)=>total+stage.opportunityCount,0);
 return <article className={`flow-list-card ${selected?'is-selected':''}`}>
  <div className="flow-list-identity"><span className="flow-list-icon"><Workflow size={21}/></span><div><div className="flow-list-name"><h3>{name}</h3>{selected&&<span className="flow-viewing-badge">✓ {text.viewing}</span>}{flow.factory&&<span className="flow-factory-badge">🔒 {copy.factory}</span>}</div><p>{copy.flowCardSummary(flow.stages.length,count)}{flow.defaultFlow&&<span> · {copy.defaultBadge}</span>}</p><div className="flow-stage-chips">{flow.stages.slice(0,4).map(stage=><span key={stage.key}><i style={{backgroundColor:stageColor(stage)}}/>{stage.label}</span>)}{flow.stages.length>4&&<small>+{flow.stages.length-4}</small>}</div></div></div>
  <div className="flow-list-actions"><Button variant="outline" disabled={activating} onClick={onOpen}>{canManage&&!flow.factory?<PencilLine size={16}/>:<Eye size={16}/>}{canManage&&!flow.factory?copy.editFlow:copy.viewStages}</Button>{!selected&&<Button className="flow-primary" disabled={activating} onClick={onActivate}><CheckCircle2 size={16}/>{activating?copy.activating:copy.useFlow}</Button>}
   <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={`${copy.stageActions}: ${name}`} disabled={activating}><MoreHorizontal size={20}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
    {canManage&&<DropdownMenuItem disabled={canDuplicate===false} onClick={onDuplicate}><Copy size={16}/>{text.duplicate}</DropdownMenuItem>}{onScripts&&<DropdownMenuItem onClick={onScripts}><FileText size={16}/>{scriptsLabel}</DropdownMenuItem>}{canManage&&!flow.factory&&<DropdownMenuItem className="flow-danger" onClick={onDelete}><Trash2 size={16}/>{text.deleteFlow}</DropdownMenuItem>}
   </DropdownMenuContent></DropdownMenu>
  </div>
 </article>;
}
