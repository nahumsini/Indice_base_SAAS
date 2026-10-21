import {catalogGlyphs,processCatalog,offeringCatalog,financeCatalog,channelCatalog} from './systemCatalog';
import { clamp, sameBoardIdeas, type BoardContent, type BoardViewport, type IdeaNode } from '../../BasicModules/Sales/Funneling/ideasBoardModel';
export type Area = 'PERSON' | 'PROCESS' | 'PRODUCT' | 'FINANCE';
export interface SystemNode extends IdeaNode { category: Area|'OUTSIDE'; icon: string; steps?:string[]; offeringType?:'PRODUCT'|'SERVICE' }
export interface SystemContent extends BoardContent { nodes: SystemNode[] }
export interface SystemDocument { elements: { node: IdeaNode; category: Area|'OUTSIDE'; icon: string; steps?:string[]; offeringType?:'PRODUCT'|'SERVICE' }[]; connections: BoardContent['connections']; viewport: BoardViewport }
export const areaOrder: Area[] = ['PERSON','PROCESS','PRODUCT','FINANCE'];
export const areas = {
 PERSON:{x:0,y:0,color:'BLUE',label:'person',module:'human-resources',icon:'PERSON'},
 PROCESS:{x:1100,y:0,color:'YELLOW',label:'process',module:'processes-tasks',icon:'CHECKLIST'},
 PRODUCT:{x:1100,y:800,color:'CORAL',label:'product',module:'inventory',icon:'BOX'},
 FINANCE:{x:0,y:800,color:'MINT',label:'finance',module:'expenses',icon:'BALANCE'},
} as const;
export const areaIcons: Record<Area,string[]> = {PERSON:['PERSON','TEAM','LEADER','WORKER'],PROCESS:processCatalog.map(i=>i.id),PRODUCT:offeringCatalog.map(i=>i.id),FINANCE:financeCatalog.map(i=>i.id)};
export const symbols: Record<string,string> = {PERSON:'🧑‍💼',TEAM:'🧑‍🤝‍🧑',LEADER:'👩‍💼',WORKER:'👨‍🔧',CHECKLIST:'📋',GEAR:'⚙️',FLOW:'🔄',DELIVERY:'🚚',BOX:'📦',SERVICE:'🤝',COFFEE:'☕',FOOD:'🍽️',TOOLS:'🛠️',PHONE:'📱',BALANCE:'📒',INCOME:'📊',CASH_FLOW:'💸',BUDGET:'🧮',COSTS:'🪙',...catalogGlyphs};
export function fromSystemDocument(doc:SystemDocument):SystemContent { return {nodes:doc.elements.map(e=>({...e.node,category:e.category,icon:e.icon,...(e.steps?.length?{steps:e.steps}:{}),...(e.offeringType?{offeringType:e.offeringType}:{})})),connections:doc.connections,viewport:doc.viewport}; }
export function toSystemDocument(content:BoardContent):SystemDocument { return {elements:(content.nodes as SystemNode[]).map(({category,icon,steps,offeringType,...node})=>({node,category,icon,...(steps?.length?{steps}:{}),...(offeringType?{offeringType}:{})})),connections:content.connections,viewport:content.viewport}; }
export const isSystemNode=(node:IdeaNode):node is SystemNode=>'category' in node;
export const sameSystemIdeas=(a:BoardContent,b:BoardContent)=>sameBoardIdeas(a,b)&&JSON.stringify(a.nodes.map(n=>isSystemNode(n)?[n.id,n.category,n.icon,n.steps??[],n.offeringType??null]:[n.id]))===JSON.stringify(b.nodes.map(n=>isSystemNode(n)?[n.id,n.category,n.icon,n.steps??[],n.offeringType??null]:[n.id]));
export function newElement(content:BoardContent,category:Area):SystemNode|null {
 const nodes=(content.nodes as SystemNode[]).filter(n=>n.category===category);if(nodes.length>=25)return null;
 const area=areas[category];let slot=0;
 for(;slot<25;slot++){const x=area.x+36+(slot%5)*206,y=area.y+130+Math.floor(slot/5)*128;if(!nodes.some(n=>Math.abs(n.x-x)<90&&Math.abs(n.y-y)<60))break;}
 slot=Math.min(slot,24);
 return {id:crypto.randomUUID(),kind:'TEXT',text:'',x:area.x+36+(slot%5)*206,y:area.y+130+Math.floor(slot/5)*128,width:180,height:120,shape:'RECTANGLE',color:area.color,assetId:null,category,icon:area.icon};
}
export const elementBounds=(node:IdeaNode)=>{if(isSystemNode(node)&&node.category==='OUTSIDE')return systemWorkspaceBounds;const a=areas[(node as DiagnosticNode).category];return{left:a.x+16,top:a.y+100,right:a.x+1084,bottom:a.y+784};};
export function moveElement(node:IdeaNode,dx:number,dy:number):IdeaNode {
 if(!isSystemNode(node))return node;if(node.category==='OUTSIDE')return moveSystemIdea(node,dx,dy);const area=areas[node.category];return {...node,x:clamp(node.x+dx,area.x+16,area.x+1084-node.width),y:clamp(node.y+dy,area.y+100,area.y+784-node.height)};
}
export function fitWorkspace(nodes:IdeaNode[],width:number,height:number,area?:Area|'CHANNEL'):BoardViewport {
 const actual=area==='CHANNEL'?'PRODUCT':area;const bounds=actual?{...areas[actual],y:areas[actual].y+(area==='CHANNEL'?0:actual==='PRODUCT'?400:0)}:{x:0,y:0};const relevant=actual?nodes.filter(n=>isSystemNode(n)&&n.category===actual&&(actual!=='PRODUCT'||(n.icon==='IDEA'?(n.y+n.height/2<1200):channelCatalog.some(item=>item.id===n.icon))===(area==='CHANNEL'))):[];
 const outside=area?[]:nodes.filter(n=>n.x<0||n.y<0||n.x+n.width>2200||n.y+n.height>1600);
 const left=outside.length?Math.min(0,...outside.map(n=>n.x-60)):relevant.length?Math.min(...relevant.map(n=>n.x))-60:bounds.x;
 const top=outside.length?Math.min(0,...outside.map(n=>n.y-60)):relevant.length?Math.min(...relevant.map(n=>n.y))-60:bounds.y;
 const right=outside.length?Math.max(2200,...outside.map(n=>n.x+n.width+60)):relevant.length?Math.max(...relevant.map(n=>n.x+n.width))+60:bounds.x+(area?1100:2200);
 const bottom=outside.length?Math.max(1600,...outside.map(n=>n.y+n.height+60)):relevant.length?Math.max(...relevant.map(n=>n.y+n.height))+60:bounds.y+(area==='CHANNEL'||area==='PRODUCT'?400:area?800:1600);
 const zoom=clamp(Math.min((width-24)/(right-left),(height-24)/(bottom-top)),.04,1.2);
 return {x:width/2-(left+right)/2*zoom,y:height/2-(top+bottom)/2*zoom,zoom};
}
export function zoomWorkspace(view:BoardViewport,zoom:number,x:number,y:number):BoardViewport {zoom=clamp(zoom,.04,2);const ratio=zoom/view.zoom;return{x:clamp(x-(x-view.x)*ratio,-30000,30000),y:clamp(y-(y-view.y)*ratio,-30000,30000),zoom};}


export const systemBounds={left:16,top:100,right:2184,bottom:1584};
/** Extra space surrounds the original four regions; saved coordinates are never rescaled. */
export const systemWorkspaceBounds={left:-1200,top:-900,right:3400,bottom:2500};
export const systemNodeBounds=(node:IdeaNode)=>isLegacySystemNode(node)?systemBounds:systemWorkspaceBounds;
export function placeSystemIdea(node:IdeaNode,content:BoardContent):SystemNode|null {
 if(!content.nodes.some(n=>n.id===node.id)&&content.nodes.length>=100)return null;
 const bounds=systemNodeBounds(node);
 const width=Math.min(node.kind==='DRAWING'?bounds.right-bounds.left:1000,node.width),height=Math.min(node.kind==='DRAWING'?bounds.bottom-bounds.top:800,node.height),x=clamp(node.x,bounds.left,bounds.right-width),y=clamp(node.y,bounds.top,bounds.bottom-height);
 const outside=x<0||y<0||x+width>2200||y+height>1600;
 const right=x+width/2>=1100,bottom=y+height/2>=800;
 const category:Area|'OUTSIDE'=outside?'OUTSIDE':bottom?right?'PRODUCT':'FINANCE':right?'PROCESS':'PERSON';
 return{...node,x,y,width,height,category,icon:isSystemNode(node)?node.icon:'IDEA'};
}
export const moveSystemIdea=(node:IdeaNode,dx:number,dy:number):IdeaNode=>placeSystemIdea({...node,x:node.x+dx,y:node.y+dy},{nodes:[node],connections:[],viewport:{x:0,y:0,zoom:1}})!;
export type DiagnosticNode=SystemNode&{category:Area};
export const isLegacySystemNode=(node:IdeaNode):node is DiagnosticNode=>isSystemNode(node)&&node.category!=='OUTSIDE'&&node.icon!=='IDEA';

/** Diagnostic shortcuts share the 100-element board limit; they do not restore the old per-area cap. */
export function createSystemElement(content:BoardContent,category:Area,channel=false):SystemNode|null {
 if(content.nodes.length>=100)return null;
 const area=areas[category],capacity=category==='PRODUCT'?10:25,baseY=category==='PRODUCT'&&!channel?440:130;let slot=0;
 for(;slot<capacity;slot++) {const x=area.x+36+(slot%5)*206,y=area.y+baseY+Math.floor(slot/5)*128;if(!content.nodes.some(n=>n.x<x+180&&n.x+n.width>x&&n.y<y+120&&n.y+n.height>y))break;}
 const offset=slot===capacity?Math.min(36,Math.floor(content.nodes.length/capacity)*9):0;slot%=capacity;
 return{id:crypto.randomUUID(),kind:'TEXT',text:'',x:area.x+36+(slot%5)*206+offset,y:area.y+baseY+Math.floor(slot/5)*128+offset,width:180,height:120,shape:'RECTANGLE',color:area.color,assetId:null,category,icon:channel?'CRM':area.icon,...(category==='PRODUCT'&&!channel?{offeringType:'PRODUCT' as const}:{})};
}

export const hasProcessSteps=(node:IdeaNode):node is SystemNode=>isSystemNode(node)&&!!node.steps?.length;
export const validSystemElement=(node:IdeaNode)=>!isSystemNode(node)||!node.steps||node.steps.length<=50&&node.steps.every(step=>!!step.trim()&&step.length<=500);
