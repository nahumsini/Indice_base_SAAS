import type {IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import {FiveSFields} from './FiveSFields';
import {fiveSCopy} from './fiveSCopy';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
export function FiveSReadOnlyDialog({node,locale,assetUrl,onClose}:{node:IdeaNode;locale:string;assetUrl:(id:string)=>string;onClose:()=>void}){
 const c=fiveSCopy(locale);return <IndiceModalFrame open modalType="standard-form" title={node.text} description={`${c[node.fiveS!.section]} · ${node.fiveS!.area}`} tone="coral" icon={<span>🧹</span>} closeLabel={c.close} onOpenChange={v=>{if(!v)onClose();}} footer={<Button onClick={onClose}>{c.close}</Button>}><FiveSFields readonly node={node} onChange={()=>{}} onBusyChange={()=>{}} actor="" api={personalIdeasBoardApi} locale={locale} assetUrl={assetUrl}/></IndiceModalFrame>;
}
