import {ListOrdered} from 'lucide-react';
import {nodeImageStyle,nodeTextStyle} from '../../BasicModules/Sales/Funneling/nodeAppearance';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {symbols,type SystemNode} from './systemBoardModel';
import {systemCatalogCopy} from './systemCatalogCopy';
export function SystemNodeContent({node,locale,onSteps,assetUrl=personalIdeasBoardApi.photoUrl}:{node:SystemNode;locale:string;onSteps?:()=>void;assetUrl?:(id:string)=>string}) {
 const c=systemCatalogCopy(locale),hasSteps=!!node.steps?.length,visualHeight=Math.min(node.height-16,(hasSteps?40:58)*node.height/120);
 return <><div className="system-node-visual" style={{width:Math.min(node.width-16,(node.kind==='IMAGE'?58:64)*node.width/180),height:visualHeight,fontSize:(hasSteps?32:45)*Math.min(node.width/180,node.height/120)}}>{node.kind==='IMAGE'&&node.assetId?<img draggable={false} src={assetUrl(node.assetId)} alt="" style={nodeImageStyle(node)}/>:<span aria-hidden="true">{symbols[node.icon]??'✨'}</span>}</div><div className="system-node-name" style={{...nodeTextStyle(node),maxHeight:Math.max(0,node.height-20-visualHeight-(hasSteps?28:0))}} title={node.text}>{node.text}</div>{hasSteps&&<button type="button" className="system-node-steps" aria-label={`${c.viewSteps}: ${node.text}`} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSteps?.();}}><ListOrdered size={14}/>{node.steps!.length} {c.steps.toLocaleLowerCase()}</button>}{node.offeringType&&<span className="system-node-offering">{node.offeringType==='SERVICE'?c.service:c.product}</span>}</>;
}
