import {OriginalModuleEmoji} from '../../components/icons/OriginalModuleEmoji';
import {boardInteractionCopy} from '../../BasicModules/Sales/Funneling/boardInteractionCopy';
import {areaOrder,areas} from './systemBoardModel';
import {workspaceCopy} from './workspaceCopy';
export function systemPrintSections(locale:string){const c=boardInteractionCopy(locale);return[{x:1100,y:800,width:1100,height:400,label:c.channels},{x:1100,y:1200,width:1100,height:400,label:c.products}];}
export function SystemBoardBackdrop({locale}:{locale:string}){
 const c=workspaceCopy(locale),ui=boardInteractionCopy(locale);
 return <div className="system-areas" aria-hidden="true">{areaOrder.map((category,i)=><div key={category} className="system-area" data-area={category} style={{left:areas[category].x,top:areas[category].y}}><div className="system-area-heading"><OriginalModuleEmoji id={areas[category].module} className="system-area-emoji"/><span>{i+1} · {category==='PRODUCT'?ui.channels:c[areas[category].label]}</span><span className="system-area-arrow">{i===0?'→':i===1?'↓':i===2?'←':'↑'}</span></div>{category==='PRODUCT'&&<div className="system-product-divider"><OriginalModuleEmoji id="inventory" className="system-area-emoji"/><span>{ui.products}</span></div>}</div>)}<div className="system-hub" title="Índice">↻</div></div>;
}
