import {IndiceEmoji} from '../../components/icons/ModuleTabEmoji';
import {SystemBoardBackdrop,systemPrintSections} from './SystemBoardBackdrop';
import {boardInteractionCopy} from '../../BasicModules/Sales/Funneling/boardInteractionCopy';
import {channelIcons} from './systemChannelSymbols';
import {systemIconLabels} from './systemChannelSymbols';
import {ArrowUpRight} from 'lucide-react';
import type {IdeasBoardLayout,BoardSymbol} from '../../BasicModules/Sales/Funneling/ideasBoardLayout';
import {SystemNodeContent} from './SystemNodeContent';
import {allCatalogItems,catalogLabel} from './systemCatalog';
import {systemCatalogCopy} from './systemCatalogCopy';
import {OriginalModuleEmoji} from '../../components/icons/OriginalModuleEmoji';

import {areaOrder,areas,areaIcons,fitWorkspace,isLegacySystemNode,moveSystemIdea,placeSystemIdea,sameSystemIdeas,symbols,systemBounds,systemNodeBounds,type Area} from './systemBoardModel';
import {workspaceCopy} from './workspaceCopy';
import {systemElementCopy} from './systemElementCopy';
import {SystemElementFields} from './SystemElementFields';
import {createSystemElement,isSystemNode,validSystemElement,type SystemNode,type DiagnosticNode} from './systemBoardModel';
export function personalBoardSymbols(locale:string):BoardSymbol[] {const c=workspaceCopy(locale),labels=systemIconLabels(locale),ui=systemCatalogCopy(locale);return [...areaIcons.PERSON.map(id=>({id,label:labels[id],glyph:symbols[id],group:c.person})),...allCatalogItems.map(item=>({id:item.id,label:catalogLabel(item,locale),glyph:item.glyph,group:ui[item.group]}))];}
export function systemBoardLayout(locale:string):IdeasBoardLayout {
 const c=workspaceCopy(locale),ui=systemElementCopy(locale),interaction=boardInteractionCopy(locale),catalog=systemCatalogCopy(locale),labels=systemIconLabels(locale);
 return{
  creationGroups:['PERSON','PROCESS','CHANNEL','PRODUCT','FINANCE'].map(group=>{const id=(group==='CHANNEL'?'PRODUCT':group) as Area,channel=group==='CHANNEL';return{batchLimit:3,id:group,label:channel?catalog.channels:id==='PRODUCT'?catalog.offerings:c[areas[id].label],addLabel:channel?catalog.addChannel:id==='FINANCE'?catalog.addReport:id==='PRODUCT'?catalog.addOffering:ui.add[id],icon:channel?<IndiceEmoji name="target" className="system-domain-emoji"/>:<OriginalModuleEmoji id={areas[id].module} className="system-domain-emoji"/>,matches:node=>isSystemNode(node)&&node.category===id&&(id!=='PRODUCT'||channelIcons.includes(node.icon)===channel),create:content=>{const node=createSystemElement(content,id,channel);return node&&id==='FINANCE'?{...node,text:labels[node.icon]}:node;}};}),
  editor:{isValid:validSystemElement,saveLabel:node=>channelIcons.includes((node as SystemNode).icon)?interaction.saveChannel:(node as DiagnosticNode).category==='FINANCE'?catalog.saveReport:ui.save[(node as DiagnosticNode).category],matches:node=>isLegacySystemNode(node),title:(node,isNew)=>channelIcons.includes((node as SystemNode).icon)?catalog.channels:isNew?(node as DiagnosticNode).category==='FINANCE'?catalog.addReport:(node as DiagnosticNode).category==='PRODUCT'?catalog.addOffering:ui.add[(node as DiagnosticNode).category]:`${c.edit} · ${c[areas[(node as DiagnosticNode).category].label]}`,description:node=>channelIcons.includes((node as SystemNode).icon)?catalog.channelHelp:(node as DiagnosticNode).category==='FINANCE'?catalog.reportHelp:ui.help[(node as DiagnosticNode).category],icon:node=><OriginalModuleEmoji id={areas[(node as DiagnosticNode).category].module} className="size-10"/>,render:context=><SystemElementFields key={context.node.id} {...context}/>},noteHint:catalog.outsideHint,title:c.system,subtitle:c.systemHint,overview:c.allAreas,emblem:<ArrowUpRight size={24}/>,minZoom:.04,
  worldBounds:{x:0,y:0,width:2200,height:1600},regions:areaOrder.map(id=>({id,label:c[areas[id].label],x:areas[id].x,y:areas[id].y,width:1100,height:800,fill:{PERSON:'#dceaff',PROCESS:'#fff1b4',PRODUCT:'#ffddd5',FINANCE:'#d4f4e5'}[id]})),
  backdrop:<SystemBoardBackdrop locale={locale}/>,printSections:systemPrintSections(locale),
  prepare:placeSystemIdea,move:moveSystemIdea,bounds:systemNodeBounds,sameIdeas:sameSystemIdeas,
  fit:(nodes,width,height,region)=>fitWorkspace(nodes,width,height,region as Area|'CHANNEL'|undefined),
  printDetails:nodes=>nodes.filter((n):n is SystemNode=>isSystemNode(n)&&!!n.steps?.length).map(n=>({title:n.text,steps:n.steps!})),
  printNode:node=>isLegacySystemNode(node)&&node.kind==='TEXT'?{...node,text:(symbols[node.icon]??'✨')+'\n'+node.text}:node,
  nodeClass:node=>isLegacySystemNode(node)?'system-node':'',
  renderNode:(node,onEdit)=>isLegacySystemNode(node)?<SystemNodeContent node={node} locale={locale} onSteps={onEdit}/>:undefined,
 };
}
