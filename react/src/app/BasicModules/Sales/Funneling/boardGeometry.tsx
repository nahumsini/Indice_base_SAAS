import type {BoardShape,IdeaNode} from './ideasBoardModel';
import {clamp,textNode} from './ideasBoardModel';
import {defaultAppearance,type ResizeBounds} from './nodeAppearance';
import {boardInteractionCopy} from './boardInteractionCopy';
export const geometricShapes=['RECTANGLE','ELLIPSE','TRIANGLE','DIAMOND','PENTAGON','HEXAGON','PARALLELOGRAM'] as const;
export type GeometricShape=typeof geometricShapes[number];
export const isGeometry=(shape:BoardShape):shape is GeometricShape=>(geometricShapes as readonly string[]).includes(shape);
export const polygonPoints={TRIANGLE:'500,10 990,990 10,990',DIAMOND:'500,10 990,500 500,990 10,500',PENTAGON:'500,10 990,385 805,990 195,990 10,385',HEXAGON:'250,10 750,10 990,500 750,990 250,990 10,500',PARALLELOGRAM:'210,10 990,10 790,990 10,990'};
export function geometryLabel(shape:BoardShape,locale:string){const c=boardInteractionCopy(locale);return ({RECTANGLE:c.rectangle,ELLIPSE:c.ellipse,TRIANGLE:c.triangle,DIAMOND:c.diamond,PENTAGON:c.pentagon,HEXAGON:c.hexagon,PARALLELOGRAM:c.parallelogram,NOTE:c.postIt,PLAIN:'Texto'})[shape];}
/** Sizes are calculated in world coordinates for either drag direction and current zoom. */
export function shapeFromDrag(shape:GeometricShape,start:{x:number;y:number},end:{x:number;y:number},bounds?:ResizeBounds):IdeaNode {
 const b=bounds??{left:-10000,top:-10000,right:11000,bottom:10800};
 const x=clamp(Math.min(start.x,end.x),b.left,b.right-40),y=clamp(Math.min(start.y,end.y),b.top,b.bottom-40);
 return {...textNode(x,y,shape),width:clamp(Math.abs(end.x-start.x),40,Math.min(1000,b.right-x)),height:clamp(Math.abs(end.y-start.y),40,Math.min(800,b.bottom-y)),color:'BLUE'};
}
export function BoardGeometryElement({node}:{node:IdeaNode}) {
 if(!isGeometry(node.shape)||node.shape==='RECTANGLE'||node.shape==='ELLIPSE')return null;
 const a=node.appearance??defaultAppearance(node);
 return <svg className="board-geometry" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><polygon points={polygonPoints[node.shape]} fill={a.transparentFill?'none':a.fillColor} stroke={a.borderColor} strokeWidth={a.borderWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round"/></svg>;
}
