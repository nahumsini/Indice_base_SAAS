import {SalesModalFrame} from '../../BasicModules/Sales/components/SalesModalFrame';
import {Button} from '../../components/ui/button';
import {SystemNodeContent} from './SystemNodeContent';
import {catalogNode} from './freeformBoardLayout';
import {hasProcessSteps,type SystemNode} from './systemBoardModel';
import {systemCatalogCopy} from './systemCatalogCopy';
import {BoardGeometryElement} from '../../BasicModules/Sales/Funneling/boardGeometry';
import {BoardMediaElement} from '../../BasicModules/Sales/Funneling/boardMedia';
import {SystemBoardBackdrop} from './SystemBoardBackdrop';
import {BoardDrawingElement} from '../../BasicModules/Sales/Funneling/BoardDrawingElement';
import {useEffect,useId,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {Focus,Maximize2,Minimize2,Minus,Plus} from 'lucide-react';
import {IdeasBoardMinimap} from '../../BasicModules/Sales/Funneling/IdeasBoardMinimap';
import {ideasBoardCopy} from '../../BasicModules/Sales/Funneling/ideasBoardCopy';
import {clamp,connectionEnds,type BoardContent,type IdeaNode} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {OriginalModuleEmoji} from '../../components/icons/OriginalModuleEmoji';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {areaOrder,areas,elementBounds,fitWorkspace,isSystemNode,isLegacySystemNode,moveElement,symbols,zoomWorkspace,type Area} from './systemBoardModel';
import {NodeAppearanceControls,NodeResizeHandles} from '../../BasicModules/Sales/Funneling/NodeAppearanceControls';
import {nodeBoxStyle,nodeTextStyle,nodeImageStyle,resizeNode,type ResizeEdge} from '../../BasicModules/Sales/Funneling/nodeAppearance';
import {workspaceCopy} from './workspaceCopy';

type Point={x:number;y:number};
type Gesture={base:BoardContent;start:Point;node:string|null;resize?:ResizeEdge;moved:boolean;pinch?:{distance:number;middle:Point}};
export function WorkspaceCanvas({content,onChange,locale,system=true,active=true,readonly=false,tool='PAN',selected,source,onSelect,onConnect,onEdit,onLabel,onRemove,focusRequest,initialFit=false,expandedTools,onExpandedChange,assetUrl=personalIdeasBoardApi.photoUrl,privacyLabel}: {
 content:BoardContent;onChange:(content:BoardContent)=>void;locale:string;system?:boolean;active?:boolean;readonly?:boolean;
 tool?:'PAN'|'CONNECT';selected?:string|null;source?:string|null;onSelect?:(id:string|null)=>void;
 onConnect?:(id:string)=>void;onEdit?:(node:IdeaNode)=>void;onLabel?:(id:string,label:string)=>void;onRemove?:()=>void;
 focusRequest?:{key:number;area?:Area};initialFit?:boolean;expandedTools?:ReactNode;onExpandedChange?:(expanded:boolean)=>void;assetUrl?:(id:string)=>string;privacyLabel?:string;
}) {
 const [stepsNode,setStepsNode]=useState<SystemNode|null>(null),catalog=systemCatalogCopy(locale);
 const c=workspaceCopy(locale),b=ideasBoardCopy(locale),surface=useRef<HTMLDivElement>(null),marker=useId().replace(/:/g,'');
 const [preview,setPreview]=useState<BoardContent|null>(null),[size,setSize]=useState({width:0,height:0}),[expanded,setExpanded]=useState(false);
 const shown=preview??content,current=useRef(shown),change=useRef(onChange);current.current=shown;change.current=onChange;
 const pointers=useRef(new Map<number,Point>()),gesture=useRef<Gesture|null>(null),wheelTimer=useRef<ReturnType<typeof setTimeout>|null>(null),firstFit=useRef(false);
 const latestContent=useRef(content);latestContent.current=content;
 const apply=(next:BoardContent)=>{current.current=next;setPreview(null);change.current(next);};
 const show=(next:BoardContent)=>{current.current=next;setPreview(next);};
 function fit(area?:Area) { const el=surface.current;if(!el)return;let nodes=current.current.nodes;
  if(!system){if(!nodes.length){apply({...current.current,viewport:{x:0,y:0,zoom:1}});return;}
   const x=Math.min(...nodes.map(n=>n.x))-50,y=Math.min(...nodes.map(n=>n.y))-50,right=Math.max(...nodes.map(n=>n.x+n.width))+50,bottom=Math.max(...nodes.map(n=>n.y+n.height))+50;
   const zoom=clamp(Math.min(el.clientWidth/(right-x),el.clientHeight/(bottom-y)),.08,1.2);apply({...current.current,viewport:{x:el.clientWidth/2-(x+right)/2*zoom,y:el.clientHeight/2-(y+bottom)/2*zoom,zoom}});return;}
  apply({...current.current,viewport:fitWorkspace(nodes,el.clientWidth,el.clientHeight,area)});
 }
 useEffect(()=>setPreview(null),[content]);
 useEffect(()=>{const el=surface.current;if(!el)return;const measure=()=>setSize({width:el.clientWidth,height:el.clientHeight});const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[active]);
 useEffect(()=>{if(!active||!size.width||!size.height)return;if(focusRequest||(!firstFit.current&&initialFit)){firstFit.current=true;fit(focusRequest?.area);}},[focusRequest?.key,active,size.width,size.height]);
 useEffect(()=>{if(!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);};},[expanded]);
 useEffect(()=>{if(!active)setExpanded(false);},[active]);
 useEffect(()=>{onExpandedChange?.(expanded);},[expanded,onExpandedChange]);
 useEffect(()=>{
  const el=surface.current;if(!el||!active)return;
  const wheel=(event:WheelEvent)=>{event.preventDefault();if(gesture.current||(event.target as Element).closest('[data-idea-minimap]'))return;const rect=el.getBoundingClientRect(),base=current.current;
   const viewport=event.ctrlKey||event.metaKey?zoomWorkspace(base.viewport,base.viewport.zoom*Math.exp(-event.deltaY*.008),event.clientX-rect.left,event.clientY-rect.top):{...base.viewport,x:clamp(base.viewport.x-event.deltaX,-30000,30000),y:clamp(base.viewport.y-event.deltaY,-30000,30000)};
   show({...base,viewport});if(wheelTimer.current)clearTimeout(wheelTimer.current);wheelTimer.current=setTimeout(()=>{wheelTimer.current=null;apply(current.current);},200);
  };el.addEventListener('wheel',wheel,{passive:false});return()=>{el.removeEventListener('wheel',wheel);if(wheelTimer.current){clearTimeout(wheelTimer.current);wheelTimer.current=null;change.current(current.current);}};
 },[active]);
 function point(e:PointerEvent<HTMLDivElement>):Point {const rect=surface.current!.getBoundingClientRect();return{x:e.clientX-rect.left,y:e.clientY-rect.top};}
 function down(e:PointerEvent<HTMLDivElement>) {
  if(e.button!==0||(e.target as Element).closest('video,audio,button'))return;e.preventDefault();if(wheelTimer.current){clearTimeout(wheelTimer.current);wheelTimer.current=null;apply(current.current);}
  const p=point(e);pointers.current.set(e.pointerId,p);e.currentTarget.setPointerCapture(e.pointerId);
  if(pointers.current.size===2){const[a,b]=[...pointers.current.values()];gesture.current={base:current.current,start:p,node:null,moved:true,pinch:{distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),middle:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}};return;}
  if(pointers.current.size>2)return;
  const element=(e.target as HTMLElement).closest<HTMLElement>('[data-workspace-node]'),id=element?.dataset.workspaceNode??null;
  if(!readonly){onSelect?.(id);if(id&&tool==='CONNECT')onConnect?.(id);}element?.focus({preventScroll:true});
  gesture.current={base:current.current,start:p,node:readonly||tool==='CONNECT'?null:id,resize:(e.target as HTMLElement).closest<HTMLElement>('[data-resize]')?.dataset.resize as ResizeEdge|undefined,moved:tool==='CONNECT'};
 }
 function move(e:PointerEvent<HTMLDivElement>) {
  if(!pointers.current.has(e.pointerId))return;const p=point(e);pointers.current.set(e.pointerId,p);const g=gesture.current;if(!g)return;
  if(g.pinch){if(pointers.current.size<2)return;const[a,b]=[...pointers.current.values()],middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const viewport=zoomWorkspace(g.base.viewport,g.base.viewport.zoom*Math.hypot(a.x-b.x,a.y-b.y)/g.pinch.distance,g.pinch.middle.x,g.pinch.middle.y);viewport.x=clamp(viewport.x+middle.x-g.pinch.middle.x,-30000,30000);viewport.y=clamp(viewport.y+middle.y-g.pinch.middle.y,-30000,30000);show({...g.base,viewport});return;}
  const dx=p.x-g.start.x,dy=p.y-g.start.y;if(!g.moved&&Math.hypot(dx,dy)<6)return;g.moved=true;if(tool==='CONNECT'&&!readonly)return;
  if(g.node)show({...g.base,nodes:g.base.nodes.map(n=>n.id===g.node?g.resize?resizeNode(n,g.resize,dx/g.base.viewport.zoom,dy/g.base.viewport.zoom,elementBounds(n)):moveElement(n,dx/g.base.viewport.zoom,dy/g.base.viewport.zoom):n)});
  else show({...g.base,viewport:{...g.base.viewport,x:clamp(g.base.viewport.x+dx,-30000,30000),y:clamp(g.base.viewport.y+dy,-30000,30000)}});
 }
 function up(e:PointerEvent<HTMLDivElement>){if(!pointers.current.has(e.pointerId))return;pointers.current.delete(e.pointerId);const g=gesture.current;if(!g||(g.pinch&&pointers.current.size))return;gesture.current=null;if(g.moved)apply(current.current);}
 function zoom(delta:number){const el=surface.current!;apply({...current.current,viewport:zoomWorkspace(current.current.viewport,current.current.viewport.zoom+delta,el.clientWidth/2,el.clientHeight/2)});}
 const worldBounds=system?{x:0,y:0,width:2200,height:1600}:undefined;
 const regions=system?areaOrder.map(category=>({...areas[category],width:1100,height:800,fill:{PERSON:'#dceaff',PROCESS:'#fff1b4',PRODUCT:'#ffddd5',FINANCE:'#d4f4e5'}[category]})):undefined;
 return <div className={`workspace-canvas-wrap ${expanded?'workspace-canvas-expanded':''}`} data-workspace-canvas data-readonly={readonly}>
  <div className="workspace-canvas-controls"><span>{readonly?c.readonly:tool==='CONNECT'?c.connectHint:c.addHint}</span><button className="idea-board-button" title={expanded?b.collapse:b.expand} aria-label={expanded?b.collapse:b.expand} onClick={()=>setExpanded(!expanded)}>{expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div>
  {expanded&&expandedTools}
  {!readonly&&tool!=='CONNECT'&&shown.nodes.filter(n=>n.id===selected).map(node=><NodeAppearanceControls key={node.id} compact node={node} locale={locale} system={system} bounds={elementBounds(node)} onChange={next=>apply({...current.current,nodes:current.current.nodes.map(n=>n.id===next.id?next:n)})}/>)}
  <div ref={surface} className="idea-board-surface workspace-canvas" data-workspace-surface role="group" aria-label={system?c.system:c.myBoard} tabIndex={0}
   style={{backgroundSize:`${Math.max(12,24*shown.viewport.zoom)}px ${Math.max(12,24*shown.viewport.zoom)}px`,backgroundPosition:`${shown.viewport.x}px ${shown.viewport.y}px`}}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
   onKeyDown={e=>{if((e.target as HTMLElement).closest('input,textarea,select,[data-resize]'))return;if(e.key==='Escape'){onSelect?.(null);return;}
    if(readonly){const id=(e.target as HTMLElement).closest<HTMLElement>('[data-workspace-node]')?.dataset.workspaceNode;const node=current.current.nodes.find(n=>n.id===id);if(e.key==='Enter'&&node&&hasProcessSteps(node)){e.preventDefault();setStepsNode(node);return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const d=e.shiftKey?160:40;apply({...current.current,viewport:{...current.current.viewport,x:clamp(current.current.viewport.x+(e.key==='ArrowLeft'?d:e.key==='ArrowRight'?-d:0),-30000,30000),y:clamp(current.current.viewport.y+(e.key==='ArrowUp'?d:e.key==='ArrowDown'?-d:0),-30000,30000)}});}return;}
    const id=(e.target as HTMLElement).closest<HTMLElement>('[data-workspace-node]')?.dataset.workspaceNode;
    if(e.key==='Enter'&&id){e.preventDefault();onSelect?.(id);if(tool==='CONNECT')onConnect?.(id);else{const n=current.current.nodes.find(n=>n.id===id);if(n)onEdit?.(n);}}
    if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();onRemove?.();}
    if(id&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const d=e.shiftKey?20:5;apply({...current.current,nodes:current.current.nodes.map(n=>n.id===id?moveElement(n,e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0,e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0):n)});}
   }}>
   <div className="idea-board-world" style={{transform:`translate(${shown.viewport.x}px,${shown.viewport.y}px) scale(${shown.viewport.zoom})`}}>
    {system&&<SystemBoardBackdrop locale={locale}/>}
    <svg className="idea-board-lines" width="1" height="1" aria-hidden="true"><defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" strokeWidth="1.7"/></marker></defs>
     {shown.connections.map(link=>{const a=shown.nodes.find(n=>n.id===link.from),d=shown.nodes.find(n=>n.id===link.to);if(!a||!d)return null;const p=connectionEnds(a,d);return <line data-workspace-line={link.id} key={link.id} x1={p.start.x} y1={p.start.y} x2={p.end.x} y2={p.end.y} stroke="currentColor" strokeWidth="2.5" markerStart={link.direction==='BOTH'?`url(#${marker})`:undefined} markerEnd={`url(#${marker})`}/>;})}
    </svg>
    {shown.connections.map(link=>{const a=shown.nodes.find(n=>n.id===link.from),d=shown.nodes.find(n=>n.id===link.to);if(!a||!d)return null;const p=connectionEnds(a,d),style={left:(p.start.x+p.end.x)/2,top:(p.start.y+p.end.y)/2};return readonly?link.label?<span key={link.id} className="workspace-link-label" style={style}>{link.label}</span>:null:<button key={link.id} className="idea-board-link workspace-link-label" style={style} aria-label={link.label||c.connectionLabel} onPointerDown={e=>e.stopPropagation()} onClick={()=>onLabel?.(link.id,link.label)}>{link.label||'↗'}</button>;})}
    {shown.nodes.map(original=>{const node=!system&&original.catalog?catalogNode(original)!:original;return <div key={node.id} data-workspace-node={node.id} data-category={isSystemNode(node)?node.category:undefined} data-shape={node.shape} data-color={node.color} data-kind={node.kind}
     className={`idea-board-node ${isLegacySystemNode(node)?'system-node':''} ${source===node.id?'idea-board-source':''}`}
     style={{left:node.x,top:node.y,width:node.width,height:node.height,...nodeBoxStyle(node)}} role="button" aria-label={node.text} aria-pressed={selected===node.id} tabIndex={0}
     onFocus={()=>{if(!readonly)onSelect?.(node.id);}} onDoubleClick={e=>{e.stopPropagation();if(readonly&&hasProcessSteps(node))setStepsNode(node);else if(!readonly)onEdit?.(node);}}>
      {node.kind==='DRAWING'?<BoardDrawingElement node={node}/>:node.kind==='VIDEO'||node.kind==='AUDIO'?<BoardMediaElement node={node} url={assetUrl(node.assetId!)} locale={locale}/>:isLegacySystemNode(node)?<SystemNodeContent node={node} locale={locale} assetUrl={assetUrl} onSteps={()=>readonly?setStepsNode(node):onEdit?.(node)}/>:<><BoardGeometryElement node={node}/>{node.kind==='IMAGE'&&node.assetId&&<img draggable={false} src={assetUrl(node.assetId)} alt="" style={nodeImageStyle(node)}/>}<span className="idea-board-node-text" style={nodeTextStyle(node)}>{node.text}</span></>}
    {!readonly&&selected===node.id&&tool!=='CONNECT'&&<NodeResizeHandles node={node} zoom={shown.viewport.zoom} label={b.resize} bounds={elementBounds(node)} onResize={next=>apply({...current.current,nodes:current.current.nodes.map(n=>n.id===next.id?next:n)})}/>}
    </div>;})}
   </div>
   <IdeasBoardMinimap content={shown} canvas={size} selectedId={selected??null} copy={b} worldBounds={worldBounds} regions={regions} onPreview={viewport=>show({...current.current,viewport})} onCommit={viewport=>apply({...current.current,viewport})}/>
  </div>
  <footer className="idea-board-footer"><span>{privacyLabel??c.privateProject}</span><div className="idea-board-zoom-controls"><button className="idea-board-button" aria-label={b.zoomOut} onClick={()=>zoom(-.1)} disabled={shown.viewport.zoom<=(system?.04:.08)}><Minus size={17}/></button><span className="idea-board-zoom">{Math.round(shown.viewport.zoom*100)}%</span><button className="idea-board-button" aria-label={b.zoomIn} onClick={()=>zoom(.1)} disabled={shown.viewport.zoom>=2}><Plus size={17}/></button><button className="idea-board-button idea-board-fit" aria-label={b.fit} onClick={()=>fit()}><Focus size={17}/><span>{b.fit}</span></button></div></footer>
  {stepsNode&&<SalesModalFrame open tone="graphite" title={stepsNode.text} description={catalog.steps} icon={<span aria-hidden="true">📋</span>} closeLabel={catalog.close} onOpenChange={open=>{if(!open)setStepsNode(null);}} footer={<Button className="min-h-11" onClick={()=>setStepsNode(null)}>{catalog.close}</Button>}><ol className="system-steps-readonly">{stepsNode.steps?.map((step,index)=><li key={index}><span>{index+1}</span><p>{step}</p></li>)}</ol></SalesModalFrame>}
 </div>;
}
