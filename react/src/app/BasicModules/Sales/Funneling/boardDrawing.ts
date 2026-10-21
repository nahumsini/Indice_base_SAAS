import type {BoardContent,IdeaNode} from './ideasBoardModel';
import type {ResizeBounds} from './nodeAppearance';
export interface DrawingPoint {x:number;y:number}
export interface BoardDrawing {points:DrawingPoint[];color:string;width:number}
export const markerDefaults={color:'#2563eb',width:4};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const round=(n:number)=>Math.round(n*1e6)/1e6;
const freeBounds={left:-10000,top:-10000,right:10000,bottom:10000};
/** Bounded world coordinates during a gesture; normalized points survive independent resizing. */
export function appendDrawingPoint(points:DrawingPoint[],point:DrawingPoint,bounds:ResizeBounds=freeBounds):DrawingPoint[] {
 if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return points;
 const next={x:clamp(point.x,bounds.left+20,bounds.right-20),y:clamp(point.y,bounds.top+20,bounds.bottom-20)};
 const last=points[points.length-1];if(last&&Math.hypot(next.x-last.x,next.y-last.y)<.75)return points;
 // Downsample long gestures without dropping their first or last point.
 const base=points.length>=512?points.filter((_,i)=>i===0||i%2===1):points;
 return [...base,next];
}
export function drawingNode(id:string,points:DrawingPoint[],color=markerDefaults.color,width=markerDefaults.width,bounds:ResizeBounds=freeBounds):IdeaNode {
 const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
 const w=Math.max(40,right-left+24),h=Math.max(40,bottom-top+24);
 const x=clamp((left+right-w)/2,bounds.left,bounds.right-w),y=clamp((top+bottom-h)/2,bounds.top,bounds.bottom-h);
 const normalized=points.map(p=>({x:round((p.x-x)/w),y:round((p.y-y)/h)}));
 if(normalized.length===1)normalized.push({...normalized[0]});
 return{id,kind:'DRAWING',text:'',x,y,width:w,height:h,shape:'PLAIN',color:'BLUE',assetId:null,drawing:{points:normalized,color,width}};
}
export const drawingPoints=(node:IdeaNode)=>node.drawing?.points.map(p=>`${round(p.x*node.width)},${round(p.y*node.height)}`).join(' ')??'';

/** Keep a new stroke within the existing document quota; never rewrite earlier drawings. */
export function fitDrawingBudget(content:BoardContent,node:IdeaNode):IdeaNode|null {
 let next=node;
 while(new TextEncoder().encode(JSON.stringify({...content,nodes:[...content.nodes,next]})).length>480*1024){
  const points=next.drawing?.points;if(!points||points.length<=2)return null;
  next={...next,drawing:{...next.drawing!,points:points.filter((_,i)=>i===0||i===points.length-1||i%2===0)}};
 }
 return next;
}
