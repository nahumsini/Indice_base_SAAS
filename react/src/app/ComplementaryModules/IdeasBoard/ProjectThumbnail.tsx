import {FiveSNodeContent} from './FiveSNodeContent';
import {useEffect,useId,useRef,useState} from 'react';
import {FileAudio,Film,Trash2,RotateCcw} from 'lucide-react';
import {BoardDrawingElement} from '../../BasicModules/Sales/Funneling/BoardDrawingElement';
import {BoardGeometryElement} from '../../BasicModules/Sales/Funneling/boardGeometry';
import {connectionEnds,type BoardContent} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {nodeBoxStyle,nodeImageStyle,nodeTextStyle} from '../../BasicModules/Sales/Funneling/nodeAppearance';
import {boardInteractionCopy} from '../../BasicModules/Sales/Funneling/boardInteractionCopy';
import {catalogNode} from './freeformBoardLayout';
import {fromSystemDocument,isLegacySystemNode} from './systemBoardModel';
import {SystemBoardBackdrop} from './SystemBoardBackdrop';
import {SystemNodeContent} from './SystemNodeContent';
import {projectManagementApi} from './projectManagementApi';
import type {ProjectSummary} from './ideaWorkspaceApi';
import {workspaceCopy} from './workspaceCopy';
import {projectCardCopy} from './projectCardCopy';
import {projectThumbnailViewport} from './projectThumbnailModel';
import {useProjectSnapshot} from './useProjectSnapshot';

export function ProjectThumbnail({item,locale}:{item:ProjectSummary;locale:string}){
 const host=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[size,setSize]=useState({width:320,height:120});
 const ui=projectCardCopy(locale),c=workspaceCopy(locale),snapshot=useProjectSnapshot(item,visible);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'160px'});
  observer.observe(el);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{const el=host.current;if(!el)return;const measure=()=>setSize({width:el.clientWidth,height:el.clientHeight});const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[]);
 const project=snapshot.project,content=project?.system?fromSystemDocument(project.system):project?.freeform;
 return <div ref={host} className="project-thumbnail" data-preview-state={item.deletedAt?'trash':snapshot.status}>
  {item.deletedAt?<div className="project-thumbnail-message"><span className="project-trash-art-icon"><Trash2 size={24}/></span><span>{ui.recoverable}</span></div>:snapshot.status==='ready'&&content?<div className="project-thumbnail-image" role="img" aria-label={ui.preview.replace('{name}',item.name)}>
   <ProjectThumbnailScene content={content} system={item.kind==='SYSTEM'} locale={locale} width={size.width} height={size.height} assetUrl={id=>projectManagementApi.assetUrl(item,id)}/>
   {!content.nodes.length&&<span className="project-thumbnail-empty">{ui.empty}</span>}
  </div>:snapshot.status==='error'?<div className="project-thumbnail-message" role="status"><span>{ui.unavailable}</span><button type="button" onClick={snapshot.retry} aria-label={`${c.retry}: ${item.name}`}><RotateCcw size={14}/>{c.retry}</button></div>:<div className="project-thumbnail-skeleton" role="status"><span>{ui.loading}</span></div>}
 </div>;
}

/** Static, inert view of the actual snapshot; it never mounts canvas gestures or media players. */
export function ProjectThumbnailScene({content,system,locale,width,height,assetUrl}:{content:BoardContent;system:boolean;locale:string;width:number;height:number;assetUrl:(id:string)=>string}){
 const view=projectThumbnailViewport(content,system,width,height),marker='project-'+useId().replace(/:/g,''),ui=boardInteractionCopy(locale);
 return <div className="project-thumbnail-scene" inert aria-hidden="true"><div className="idea-board-world" style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.zoom})`}}>
  {system&&<SystemBoardBackdrop locale={locale}/>}
  <svg className="idea-board-lines" width="1" height="1"><defs><marker id={marker} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" strokeWidth="2"/></marker></defs>{content.connections.map(link=>{const a=content.nodes.find(n=>n.id===link.from),b=content.nodes.find(n=>n.id===link.to);if(!a||!b)return null;const p=connectionEnds(a,b);return <line key={link.id} x1={p.start.x} y1={p.start.y} x2={p.end.x} y2={p.end.y} stroke="currentColor" strokeWidth="2.5" markerStart={link.direction==='BOTH'?`url(#${marker})`:undefined} markerEnd={`url(#${marker})`}/>;})}</svg>
  {content.connections.filter(link=>link.label).map(link=>{const a=content.nodes.find(n=>n.id===link.from),b=content.nodes.find(n=>n.id===link.to);if(!a||!b)return null;const p=connectionEnds(a,b);return <span key={link.id} className="workspace-link-label" style={{left:(p.start.x+p.end.x)/2,top:(p.start.y+p.end.y)/2}}>{link.label}</span>;})}
  {content.nodes.map(original=>{const node=!system&&original.catalog?catalogNode(original)!:original,typed=isLegacySystemNode(node);return <div key={node.id} data-thumbnail-node={node.id} data-category={typed?node.category:undefined} data-shape={node.shape} data-color={node.color} data-kind={node.kind} className={`idea-board-node ${typed?'system-node':''}`} style={{left:node.x,top:node.y,width:node.width,height:node.height,...nodeBoxStyle(node)}}>
   {node.fiveS?<FiveSNodeContent node={node} locale={locale}/>:node.kind==='DRAWING'?<BoardDrawingElement node={node}/>:node.kind==='VIDEO'||node.kind==='AUDIO'?<div className="project-thumbnail-media">{node.kind==='VIDEO'?<Film size={38}/>:<FileAudio size={38}/>}<span style={nodeTextStyle(node)}>{node.text||ui[node.kind==='VIDEO'?'video':'audio']}</span></div>:typed?<SystemNodeContent node={node} locale={locale} assetUrl={assetUrl}/>:<><BoardGeometryElement node={node}/>{node.kind==='IMAGE'&&node.assetId&&<img loading="lazy" draggable={false} src={assetUrl(node.assetId)} alt="" style={nodeImageStyle(node)}/>}<span className="idea-board-node-text" style={nodeTextStyle(node)}>{node.text}</span></>}
  </div>;})}
 </div></div>;
}
