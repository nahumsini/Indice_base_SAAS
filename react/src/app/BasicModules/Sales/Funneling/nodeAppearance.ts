import type {CSSProperties} from 'react';
import type {IdeaNode} from './ideasBoardModel';
export const fontFamilies={SYSTEM:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',SANS:'Arial,Helvetica,sans-serif',SERIF:'Georgia,"Times New Roman",serif',MONO:'Menlo,Consolas,"Courier New",monospace',ROUNDED:'ui-rounded,"SF Pro Rounded","Trebuchet MS",sans-serif',HANDWRITING:'"Comic Sans MS","Bradley Hand",cursive',DISPLAY:'Impact,Haettenschweiler,"Arial Narrow Bold",sans-serif'};
export type NodeFont=keyof typeof fontFamilies;
export interface NodeAppearance {fontFamily:NodeFont;fontSize:number;textColor:string;fillColor:string;borderColor:string;borderWidth:number;bold:boolean;italic:boolean;underline:boolean;transparentFill:boolean;imageFit:'CONTAIN'|'COVER'|'STRETCH'}
export type ResizeEdge='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
export interface ResizeBounds {left:number;top:number;right:number;bottom:number}
const fills={YELLOW:'#fff1b4',CORAL:'#ffddd5',BLUE:'#dceaff',MINT:'#d4f4e5',LAVENDER:'#e9dfff',WHITE:'#ffffff'};
const borders={YELLOW:'#e8d78c',CORAL:'#efb7ab',BLUE:'#b3cdf5',MINT:'#9bd8bf',LAVENDER:'#cbb5ed',WHITE:'#cbd5e1'};
export function defaultAppearance(node:IdeaNode,system=false,dark=false):NodeAppearance {return{fontFamily:'SYSTEM',fontSize:system?16:node.kind==='IMAGE'?13:18,textColor:system&&dark?'#e2e8f0':'#263449',fillColor:system?(dark?'#1b2a3e':'#ffffff'):fills[node.color],borderColor:borders[node.color],borderWidth:node.shape==='PLAIN'?0:node.shape==='RECTANGLE'?2:1.5,bold:false,italic:false,underline:false,transparentFill:node.shape==='PLAIN',imageFit:system?'COVER':'CONTAIN'};}
export function nodeBoxStyle(node:IdeaNode):CSSProperties {if(['TRIANGLE','DIAMOND','PENTAGON','HEXAGON','PARALLELOGRAM'].includes(node.shape))return{backgroundColor:'transparent',borderWidth:0};if(node.kind==='DRAWING')return{backgroundColor:'transparent',borderWidth:0};const a=node.appearance;if(!a)return{};return{backgroundColor:a.transparentFill?'transparent':a.fillColor,borderColor:a.borderColor,borderWidth:a.borderWidth,'--note':a.fillColor,'--note-border':a.borderColor} as CSSProperties;}
export function nodeTextStyle(node:IdeaNode):CSSProperties {const a=node.appearance;if(!a)return{};return{fontFamily:fontFamilies[a.fontFamily],fontSize:a.fontSize,color:a.textColor,fontWeight:a.bold?700:400,fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none'};}
export const nodeImageStyle=(node:IdeaNode):CSSProperties=>node.appearance?{objectFit:node.appearance.imageFit==='STRETCH'?'fill':node.appearance.imageFit.toLowerCase() as 'contain'|'cover'}:{};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function resizeNode(node:IdeaNode,edge:ResizeEdge,dx:number,dy:number,bounds?:ResizeBounds):IdeaNode {
 const drawing=node.kind==='DRAWING',maxWidth=drawing?20000:1000,maxHeight=drawing?20000:800;const b=bounds??{left:-10000,top:-10000,right:drawing?10000:11000,bottom:drawing?10000:10800};let{x,y,width,height}=node;
 if(edge.includes('e'))width=clamp(width+dx,40,Math.min(maxWidth,b.right-x));
 if(edge.includes('s'))height=clamp(height+dy,40,Math.min(maxHeight,b.bottom-y));
 if(edge.includes('w')){const right=node.x+node.width;width=clamp(node.width-dx,Math.max(40,right-10000),Math.min(maxWidth,right-b.left));x=right-width;}
 if(edge.includes('n')){const bottom=node.y+node.height;height=clamp(node.height-dy,Math.max(40,bottom-10000),Math.min(maxHeight,bottom-b.top));y=bottom-height;}
 return{...node,x,y,width,height};
}
