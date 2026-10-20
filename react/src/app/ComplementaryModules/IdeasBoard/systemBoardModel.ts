import { clamp, type BoardContent, type BoardViewport, type IdeaNode } from '../../BasicModules/Sales/Funneling/ideasBoardModel';
export type Area = 'PERSON' | 'PROCESS' | 'PRODUCT' | 'FINANCE';
export interface SystemNode extends IdeaNode { category: Area; icon: string }
export interface SystemContent extends BoardContent { nodes: SystemNode[] }
export interface SystemDocument { elements: { node: IdeaNode; category: Area; icon: string }[]; connections: BoardContent['connections']; viewport: BoardViewport }
export const areaOrder: Area[] = ['PERSON','PROCESS','PRODUCT','FINANCE'];
export const areas = {
 PERSON:{x:0,y:0,color:'BLUE',label:'person',module:'human-resources',icon:'PERSON'},
 PROCESS:{x:1100,y:0,color:'YELLOW',label:'process',module:'processes-tasks',icon:'CHECKLIST'},
 PRODUCT:{x:1100,y:800,color:'CORAL',label:'product',module:'inventory',icon:'BOX'},
 FINANCE:{x:0,y:800,color:'MINT',label:'finance',module:'expenses',icon:'BALANCE'},
} as const;
export const areaIcons: Record<Area,string[]> = {PERSON:['PERSON','TEAM','LEADER','WORKER'],PROCESS:['CHECKLIST','GEAR','FLOW','DELIVERY'],PRODUCT:['BOX','SERVICE','COFFEE','FOOD','TOOLS','PHONE'],FINANCE:['BALANCE','INCOME','CASH_FLOW','BUDGET','COSTS']};
export const symbols: Record<string,string> = {PERSON:'👤',TEAM:'👥',LEADER:'👩‍💼',WORKER:'👨‍🔧',CHECKLIST:'📋',GEAR:'⚙️',FLOW:'🔄',DELIVERY:'🚚',BOX:'📦',SERVICE:'🤝',COFFEE:'☕',FOOD:'🍽️',TOOLS:'🛠️',PHONE:'📱',BALANCE:'📒',INCOME:'📊',CASH_FLOW:'💸',BUDGET:'🧮',COSTS:'🪙'};
export function fromSystemDocument(doc:SystemDocument):SystemContent { return {nodes:doc.elements.map(e=>({...e.node,category:e.category,icon:e.icon})),connections:doc.connections,viewport:doc.viewport}; }
export function toSystemDocument(content:BoardContent):SystemDocument { return {elements:(content.nodes as SystemNode[]).map(({category,icon,...node})=>({node,category,icon})),connections:content.connections,viewport:content.viewport}; }
export const isSystemNode=(node:IdeaNode):node is SystemNode=>'category' in node;
export const sameSystemIdeas=(a:BoardContent,b:BoardContent)=>JSON.stringify({nodes:a.nodes,connections:a.connections})===JSON.stringify({nodes:b.nodes,connections:b.connections});
export function newElement(content:BoardContent,category:Area):SystemNode|null {
 const nodes=(content.nodes as SystemNode[]).filter(n=>n.category===category);if(nodes.length>=25)return null;
 const area=areas[category];let slot=0;
 for(;slot<25;slot++){const x=area.x+36+(slot%5)*206,y=area.y+130+Math.floor(slot/5)*128;if(!nodes.some(n=>Math.abs(n.x-x)<90&&Math.abs(n.y-y)<60))break;}
 slot=Math.min(slot,24);
 return {id:crypto.randomUUID(),kind:'TEXT',text:'',x:area.x+36+(slot%5)*206,y:area.y+130+Math.floor(slot/5)*128,width:180,height:120,shape:'RECTANGLE',color:area.color,assetId:null,category,icon:area.icon};
}
export const elementBounds=(node:IdeaNode)=>{const a=areas[(node as SystemNode).category];return{left:a.x+16,top:a.y+100,right:a.x+1084,bottom:a.y+784};};
export function moveElement(node:IdeaNode,dx:number,dy:number):IdeaNode {
 if(!isSystemNode(node))return node;const area=areas[node.category];return {...node,x:clamp(node.x+dx,area.x+16,area.x+1084-node.width),y:clamp(node.y+dy,area.y+100,area.y+784-node.height)};
}
export function fitWorkspace(nodes:IdeaNode[],width:number,height:number,area?:Area):BoardViewport {
 const bounds=area?areas[area]:{x:0,y:0};const relevant=area?nodes.filter(n=>isSystemNode(n)&&n.category===area):[];
 const left=relevant.length?Math.min(...relevant.map(n=>n.x))-60:bounds.x;
 const top=relevant.length?Math.min(...relevant.map(n=>n.y))-60:bounds.y;
 const right=relevant.length?Math.max(...relevant.map(n=>n.x+n.width))+60:bounds.x+(area?1100:2200);
 const bottom=relevant.length?Math.max(...relevant.map(n=>n.y+n.height))+60:bounds.y+(area?800:1600);
 const zoom=clamp(Math.min((width-24)/(right-left),(height-24)/(bottom-top)),.08,1.2);
 return {x:width/2-(left+right)/2*zoom,y:height/2-(top+bottom)/2*zoom,zoom};
}
export function zoomWorkspace(view:BoardViewport,zoom:number,x:number,y:number):BoardViewport {zoom=clamp(zoom,.08,2);const ratio=zoom/view.zoom;return{x:clamp(x-(x-view.x)*ratio,-30000,30000),y:clamp(y-(y-view.y)*ratio,-30000,30000),zoom};}
