import type {BoardContent,IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import type {BoardDocumentView} from '../../BasicModules/Sales/Funneling/boardFileTools';

/** Logical personal workspaces share one private CAS document, never independent save queues. */
function documentView(key:string,matches:(node:IdeaNode)=>boolean,keepCamera:boolean):BoardDocumentView {
 const select=(content:BoardContent):BoardContent=>{
  const nodes=content.nodes.filter(matches),ids=new Set(nodes.map(n=>n.id));
  return {nodes,connections:content.connections.filter(c=>ids.has(c.from)&&ids.has(c.to)),viewport:keepCamera?content.viewport:{x:0,y:0,zoom:1}};
 };
 return {key,select,merge:(current,next)=>{
  if(next.nodes.some(n=>!matches(n)))return null;
  const retained=current.nodes.filter(n=>!matches(n)),retainedIds=new Set(retained.map(n=>n.id));
  if(next.nodes.some(n=>retainedIds.has(n.id))||retained.length+next.nodes.length>100)return null;
  let index=0;
  const nodes=current.nodes.flatMap(node=>matches(node)?index<next.nodes.length?[next.nodes[index++]]:[]:[node]);
  nodes.push(...next.nodes.slice(index));
  const ids=new Set(nodes.map(n=>n.id)),oldIds=new Set(current.nodes.filter(matches).map(n=>n.id));
  const connections=[...current.connections.filter(c=>(!oldIds.has(c.from)||!oldIds.has(c.to))&&ids.has(c.from)&&ids.has(c.to)),...next.connections];
  if(connections.length>200||new Set(nodes.map(n=>n.id)).size!==nodes.length||new Set(connections.map(c=>c.id)).size!==connections.length||connections.some(c=>!ids.has(c.from)||!ids.has(c.to)))return null;
  return {nodes,connections,viewport:keepCamera?next.viewport:current.viewport};
 }};
}
export const personalCanvasView=documentView('canvas',node=>!node.fiveS,true);
export const personalFiveSView=documentView('five-s',node=>!!node.fiveS,false);
