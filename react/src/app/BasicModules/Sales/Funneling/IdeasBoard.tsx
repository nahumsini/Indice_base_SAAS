import {useBoardTitleDock} from './useBoardTitleDock';
import {IndiceTitleBar} from '../../../components/frontend-os';
import {IndiceEmoji} from '../../../components/icons/ModuleTabEmoji';
import {BoardToolEmoji,type BoardToolArtwork} from './BoardToolEmoji';
import {BoardBatchControls} from './BoardBatchControls';
import {boardBatchCopy} from './boardBatchCopy';
import {mergeBoardDrafts} from './boardBatchModel';
import {boardConnectionCopy} from './boardConnectionCopy';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Circle, Copy, FolderPlus, Focus, Hand, ImagePlus, Lightbulb, Loader2, LockKeyhole, Maximize2, Minimize2, Minus, MousePointer2, Pencil, Highlighter, Plus, Redo2, Square, SlidersHorizontal, StickyNote, Trash2, TriangleAlert, Type, Undo2, X } from 'lucide-react';
import {ArrowLeftRight,ChevronDown,Triangle,Diamond,Hexagon,Pentagon,Shapes} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuRadioGroup,DropdownMenuRadioItem} from '../../../components/ui/dropdown-menu';
import {BoardInlineText} from './BoardInlineText';
import {BoardGeometryElement,geometricShapes,geometryLabel,isGeometry,shapeFromDrag,type GeometricShape} from './boardGeometry';
import {boardInteractionCopy} from './boardInteractionCopy';
import {boardFileFormat,boardMediaAccept,BoardMediaElement} from './boardMedia';
import { Button } from '../../../components/ui/button';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { ideasBoardCopy } from './ideasBoardCopy';
import { IdeasBoardMinimap } from './IdeasBoardMinimap';
import { ideasBoardApi, type IdeasBoardApi } from './ideasBoardApi';
import { useIdeasBoard } from './useIdeasBoard';
import { boardPoint, clamp, connect,continueConnection,withConnectionDirection,type ConnectionDirection, connectionEnds, fitBoard, textNode, withoutNode, zoomAt, type BoardContent, type BoardShape, type IdeaNode, sameBoardIdeas } from './ideasBoardModel';
import {NodeAppearanceControls,NodeResizeHandles} from './NodeAppearanceControls';
import {nodeBoxStyle,nodeTextStyle,nodeImageStyle,resizeNode,type ResizeEdge} from './nodeAppearance';
import {nodeAppearanceCopy} from './nodeAppearanceCopy';
import type {IdeasBoardLayout,BoardSymbol,BoardCreationGroup} from './ideasBoardLayout';
import {canReplaceBoard,type BoardFileTools,type BoardFileSnapshot} from './boardFileTools';
import './ideasBoard.css';
import {boardWorkbenchCopy} from './boardWorkbenchCopy';
import {BoardElementFields} from './BoardElementFields';
import {appendDrawingPoint,drawingNode,fitDrawingBudget,markerDefaults,type DrawingPoint} from './boardDrawing';
import {BoardDrawingElement} from './BoardDrawingElement';
import {boardCreativeCopy} from './boardCreativeCopy';
import {BoardPrintButton} from './BoardPrintButton';

type Tool = BoardShape | 'PAN' | 'CONNECT' | 'DRAW';
type Point = { x: number; y: number };
type Gesture = { base: BoardContent; start: Point; id: string | null; resize: boolean; edge?: ResizeEdge; moved: boolean; pinch?: { distance: number; middle: Point } };
const icons = { TRIANGLE:Triangle,DIAMOND:Diamond,PENTAGON:Pentagon,HEXAGON:Hexagon,PARALLELOGRAM:Square,NOTE: StickyNote, RECTANGLE: Square, ELLIPSE: Circle, PLAIN: Type, PAN: Hand, CONNECT: ArrowUpRight, DRAW: Highlighter };
const buttonClass = 'idea-board-button';

/** The owner supplies a stable storage port; changing namespaces remounts isolated editor state. */
export function IdeasBoard({ locale, active, api = ideasBoardApi, onSaveProject, saveProjectLabel, customizable = false, layout, symbols, fileTools }: { locale: string; active: boolean; api?: IdeasBoardApi; onSaveProject?: (content: BoardContent,actor: string) => void; saveProjectLabel?: string; customizable?: boolean; layout?: IdeasBoardLayout; symbols?: BoardSymbol[]; fileTools?: BoardFileTools }) {
  return <IdeasBoardCanvas key={api.resource} locale={locale} active={active} api={api} onSaveProject={onSaveProject} saveProjectLabel={saveProjectLabel} customizable={customizable} layout={layout} symbols={symbols} fileTools={fileTools} />;
}
function IdeasBoardCanvas({ locale, active, api, onSaveProject, saveProjectLabel, customizable = false, layout, symbols, fileTools }: { locale: string; active: boolean; api: IdeasBoardApi; onSaveProject?: (content: BoardContent,actor: string) => void; saveProjectLabel?: string; customizable?: boolean; layout?: IdeasBoardLayout; symbols?: BoardSymbol[]; fileTools?: BoardFileTools }) {
  const interaction=boardInteractionCopy(locale),creative=boardCreativeCopy(locale),workbench=boardWorkbenchCopy(locale);
  const [inlineText,setInlineText]=useState<IdeaNode|null>(null),[shapePreview,setShapePreview]=useState<IdeaNode|null>(null);
  const shapeGesture=useRef<{pointer:number;start:Point;origin:Point;viewport:BoardContent['viewport'];shape:GeometricShape;node:IdeaNode}|null>(null),uploadBusy=useRef(false);
  const [draftBusy,setDraftBusy]=useState(false);
  const [batchDrafts,setBatchDrafts]=useState<IdeaNode[]>([]),batchGroup=useRef<BoardCreationGroup|null>(null),batchCopy=boardBatchCopy(locale);
  const creation=useRef<{id:string;region:string}|null>(null);
  const connectionCopy=boardConnectionCopy(locale);
  const [connectionDirection,setConnectionDirection]=useState<ConnectionDirection>('FORWARD');
  const [markerStyle,setMarkerStyle]=useState(markerDefaults);
  const ink=useRef<{id:string;pointer:number;base:BoardContent;points:DrawingPoint[]}|null>(null);
  const appearanceCopy=nodeAppearanceCopy(locale);
  const baseCopy = ideasBoardCopy(locale), c = layout?{...baseCopy,title:layout.title,subtitle:layout.subtitle}:baseCopy, board = useIdeasBoard(api,layout?.sameIdeas??sameBoardIdeas), marker = useId().replace(/:/g, '');
  const frame = useRef<HTMLElement>(null), surface = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<Tool>('NOTE'), [selection, setSelection] = useState<string | null>(null), [source, setSource] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardContent | null>(null), [expanded, setExpanded] = useState(false), [draft, setDraft] = useState<IdeaNode | null>(null);
  useEffect(()=>{if(!draft){setBatchDrafts([]);batchGroup.current=null;creation.current=null;}},[draft===null]);
  const titleDock=useBoardTitleDock(!!fileTools&&active,expanded);
  const [symbolPicker,setSymbolPicker] = useState(false), [discard, setDiscard] = useState(false), [message, setMessage] = useState(''), [uploading, setUploading] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<{ file: File; id: string; point: Point } | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  const [linkDraft, setLinkDraft] = useState<{ id: string; text: string;direction?:ConnectionDirection } | null>(null);
  const shown = preview ?? board.content, shownRef = useRef(shown); shownRef.current = shown;
  const gesture = useRef<Gesture | null>(null), pointers = useRef(new Map<number, Point>()), wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null), alive = useRef(true);
  const fileReady=active&&!board.loading&&!board.loadError&&board.state==='saved'&&!draft&&!linkDraft&&!uploading&&!failedPhoto&&!preview&&!inlineText&&!shapePreview;
  const fileState=useRef({ready:fileReady,content:shown,actor:board.actor.current});fileState.current={ready:fileReady,content:shown,actor:board.actor.current};
  const selected = shown.nodes.find(n => n.id === selection), selectedLink = shown.connections.find(n => n.id === selection);
  const shapeLabels = {TRIANGLE:interaction.triangle,DIAMOND:interaction.diamond,PENTAGON:interaction.pentagon,HEXAGON:interaction.hexagon,PARALLELOGRAM:interaction.parallelogram,NOTE:fileTools?interaction.postIt:c.note,RECTANGLE:c.rectangle,ELLIPSE:c.circle,PLAIN:c.text,PAN:c.move,CONNECT:c.connect,DRAW:creative.marker};
  function apply(next: BoardContent) { shownRef.current = next; setPreview(null); board.commit(next); }
  function prepare(node:IdeaNode,content=shownRef.current):IdeaNode|null {return layout?layout.prepare(node,content):node;}
  function updateNode(node:IdeaNode) {const next=prepare(node);if(next)apply({...shownRef.current,nodes:shownRef.current.nodes.map(n=>n.id===next.id?next:n)});else setMessage(c.limit);}
  function replaceFile(expected:BoardFileSnapshot,next:BoardContent) {
    const current=fileState.current;
    if(!canReplaceBoard(current,expected,layout?.sameIdeas??sameBoardIdeas))return false;
    const content=structuredClone(next),element=surface.current;
    if(element)content.viewport=layout?layout.fit(content.nodes,element.clientWidth,element.clientHeight):fitBoard(content.nodes,element.clientWidth,element.clientHeight);
    stopWheel();setSelection(null);setSource(null);setTool(content.nodes.length?'PAN':'NOTE');apply(content);return true;
  }
  async function toggleFullscreen() {
    const element=frame.current;if(!element)return;
    if(expanded){if(document.fullscreenElement===element)await document.exitFullscreen().catch(()=>{});setExpanded(false);return;}
    setExpanded(true);
    if(fileTools&&document.fullscreenEnabled&&element.requestFullscreen)try{await element.requestFullscreen();}catch{/* Viewport expansion remains available when native fullscreen is unavailable. */}
  }
  useEffect(()=>{
    if(!fileTools)return;const element=frame.current;let wasNative=false;
    const sync=()=>{const native=document.fullscreenElement===element;if(native){wasNative=true;setExpanded(true);}else if(wasNative){wasNative=false;setExpanded(false);}};
    document.addEventListener('fullscreenchange',sync);
    return()=>{document.removeEventListener('fullscreenchange',sync);if(document.fullscreenElement===element)void document.exitFullscreen().catch(()=>{});};
  },[!!fileTools]);
  useEffect(()=>{if(!active&&document.fullscreenElement===frame.current)void document.exitFullscreen().catch(()=>{});},[active]);
  function fit(region?:string) {const el=surface.current!;apply({...shownRef.current,viewport:layout?layout.fit(shownRef.current.nodes,el.clientWidth,el.clientHeight,region):fitBoard(shownRef.current.nodes,el.clientWidth,el.clientHeight)});}
  function show(next: BoardContent) { shownRef.current = next; setPreview(next); }
  function stopWheel() { if (wheelTimer.current) { clearTimeout(wheelTimer.current); wheelTimer.current = null; } }
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopWheel(); }; }, []);
  useEffect(() => { if (!active) { shapeGesture.current=null;setShapePreview(null);stopWheel(); if(ink.current){shownRef.current=ink.current.base;ink.current=null;setPreview(null);}else if (preview) apply(shownRef.current); gesture.current = null; pointers.current.clear(); setExpanded(false); } }, [active]);
  useEffect(() => {
    if (!expanded || !active) return;
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !draft && !discard && !linkDraft && !symbolPicker && !inlineText) setExpanded(false); };
    window.addEventListener('keydown', close); return () => { document.body.style.overflow = old; window.removeEventListener('keydown', close); };
  }, [expanded, active, draft, discard, linkDraft, symbolPicker,inlineText]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (draft || inlineText || shapePreview || uploading || failedPhoto || ink.current) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [draft,inlineText,shapePreview, uploading, failedPhoto]);
  // The non-passive listener keeps canvas zoom/pan local; the surrounding page scrolls normally.
  useEffect(() => {
    const el = surface.current; if (!el || !active || board.loading || board.loadError) return;
    const wheel = (event: WheelEvent) => {
      if (gesture.current||ink.current||inlineText||shapeGesture.current||(event.target as Element).closest('[data-board-media]')) return;
      if (event.target instanceof Element && event.target.closest('[data-idea-minimap]')) { event.preventDefault(); return; }
      event.preventDefault(); const r = el.getBoundingClientRect(), base = shownRef.current;
      const viewport = event.ctrlKey || event.metaKey ? zoomAt(base.viewport, base.viewport.zoom * Math.exp(-event.deltaY * .008), event.clientX - r.left, event.clientY - r.top, layout?.minZoom) : { ...base.viewport, x: clamp(base.viewport.x - event.deltaX, -30000, 30000), y: clamp(base.viewport.y - event.deltaY, -30000, 30000) };
      show({ ...base, viewport }); stopWheel(); wheelTimer.current = setTimeout(() => { wheelTimer.current = null; apply(shownRef.current); }, 250);
    };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  }, [active, board.loading, board.loadError,inlineText]);
  useEffect(() => {
    const element = surface.current; if (!element || !active) return;
    const measure = () => {setSurfaceSize({width:element.clientWidth,height:element.clientHeight});const value=shownRef.current;
      if(layout&&!board.loading&&!board.loadError&&!value.nodes.length&&value.viewport.x===0&&value.viewport.y===0&&value.viewport.zoom===1)apply({...value,viewport:layout.fit([],element.clientWidth,element.clientHeight)});};
    const observer = new ResizeObserver(measure); observer.observe(element); measure(); return () => observer.disconnect();
  }, [active, board.loading, board.loadError]);
  function local(clientX: number, clientY: number): Point { const r = surface.current!.getBoundingClientRect(); return { x: clientX - r.left, y: clientY - r.top }; }
  function center(): Point { const r = surface.current!.getBoundingClientRect(); return boardPoint(r.width / 2, r.height / 2, shownRef.current.viewport); }
  function finishInline(next:IdeaNode|null) {
    setInlineText(null);if(!next||!next.text.trim())return;const prepared=prepare(next);if(!prepared){setMessage(c.limit);return;}
    const current=shownRef.current,exists=current.nodes.some(n=>n.id===next.id);if(!exists&&current.nodes.length>=100){setMessage(c.limit);return;}
    apply({...current,nodes:exists?current.nodes.map(n=>n.id===next.id?prepared:n):[...current.nodes,prepared]});setSelection(null);setTool('PAN');
  }
  function beginInline(node:IdeaNode){setInlineText(node);setSelection(node.id);setSource(null);}
  function startText(shape: BoardShape, point = center()) { if (shownRef.current.nodes.length >= 100) { setMessage(c.limit); return; } const n = textNode(point.x, point.y, shape); if(fileTools&&shape==='NOTE'){n.width=220;n.height=220;} if (shape === 'ELLIPSE') { n.width = 210; n.height = 210; } const next=prepare(n);if(!next){setMessage(c.limit);return;}if(fileTools&&shape==='PLAIN')beginInline({...next,color:'WHITE',height:64});else setDraft(next); }
  function chooseTool(value: Tool) { if(ink.current)return;if(fileTools&&value!=='PAN'&&value!=='CONNECT')setSelection(null);stopWheel(); if (preview) apply(shownRef.current); setTool(value); setSource(value === 'CONNECT' && selected ? selected.id : null); setMessage(''); }
  function chooseNode(id: string) {
    setSelection(id);
    if (tool !== 'CONNECT') return;
    if(fileTools){const step=continueConnection(shownRef.current,source,id,connectionDirection);if(step.content!==shownRef.current)apply(step.content);setSource(step.source);setMessage(step.limited?c.limit:'');return;}
    if (!source || !shownRef.current.nodes.some(n => n.id === source)) { setSource(id); return; }
    if (source !== id) { const next = connect(shownRef.current, source, id); if (next === shownRef.current && next.connections.length >= 200) setMessage(c.limit); apply(next); setSource(null); setTool('PAN'); }
  }
  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || draft || linkDraft || inlineText || (event.target as Element).closest('video,audio')) return;
    event.preventDefault(); stopWheel(); const point = local(event.clientX, event.clientY); pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size > 2) return;
    if (pointers.current.size === 2) {
      if(ink.current){shownRef.current=ink.current.base;setPreview(null);ink.current=null;}
      shapeGesture.current=null;setShapePreview(null);
      const [a, b] = [...pointers.current.values()]; gesture.current = { base: shownRef.current, start: point, id: null, resize: false, moved: true, pinch: { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } } }; return;
    }
    if(tool==='DRAW'&&customizable){
      const base=shownRef.current;if(base.nodes.length>=100){pointers.current.delete(event.pointerId);setMessage(c.limit);return;}
      const points=appendDrawingPoint([],boardPoint(point.x,point.y,base.viewport),layout?layout.bounds(textNode(0,0)):undefined);
      ink.current={id:crypto.randomUUID(),pointer:event.pointerId,base,points};gesture.current=null;setSelection(null);surface.current?.focus({preventScroll:true});return;
    }
    const element = event.target as HTMLElement, node = element.closest<HTMLElement>('[data-idea-node]'), id = node?.dataset.ideaNode ?? null;
    if(!id&&fileTools&&isGeometry(tool as BoardShape)){const start=boardPoint(point.x,point.y,shownRef.current.viewport),shape=tool as GeometricShape,node=shapeFromDrag(shape,start,start,layout?.bounds(textNode(0,0)));shapeGesture.current={pointer:event.pointerId,start,origin:{x:event.clientX-point.x,y:event.clientY-point.y},viewport:shownRef.current.viewport,shape,node};setShapePreview(node);setSelection(null);gesture.current=null;return;}
    if (id) chooseNode(id); else setSelection(null);
    gesture.current = { base: shownRef.current, start: point, id: tool === 'CONNECT' ? null : id, resize: !!element.closest('[data-resize]'), edge: (element.closest<HTMLElement>('[data-resize]')?.dataset.resize || 'se') as ResizeEdge, moved: tool === 'CONNECT' };
    if (node) node.focus({ preventScroll: true }); else surface.current?.focus({ preventScroll: true });
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = local(event.clientX, event.clientY); pointers.current.set(event.pointerId, point);
    const stroke=ink.current;if(stroke&&stroke.pointer===event.pointerId){const bounds=layout?layout.bounds(textNode(0,0)):undefined;const samples=event.nativeEvent.getCoalescedEvents?.()??[];for(const sample of samples.length?samples:[event]){const p=local(sample.clientX,sample.clientY);stroke.points=appendDrawingPoint(stroke.points,boardPoint(p.x,p.y,stroke.base.viewport),bounds);}const node=prepare(drawingNode(stroke.id,stroke.points,markerStyle.color,markerStyle.width,bounds),stroke.base);if(node)show({...stroke.base,nodes:[...stroke.base.nodes,node]});return;}
    const geometry=shapeGesture.current;if(geometry?.pointer===event.pointerId){const end=boardPoint(event.clientX-geometry.origin.x,event.clientY-geometry.origin.y,geometry.viewport);geometry.node=shapeFromDrag(geometry.shape,geometry.start,end,layout?.bounds(textNode(0,0)));setShapePreview(geometry.node);return;}
    const g = gesture.current; if (!g) return;
    if (g.pinch) {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()], middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const viewport = zoomAt(g.base.viewport, g.base.viewport.zoom * Math.hypot(a.x - b.x, a.y - b.y) / g.pinch.distance, g.pinch.middle.x, g.pinch.middle.y, layout?.minZoom);
      viewport.x = clamp(viewport.x + middle.x - g.pinch.middle.x, -30000, 30000); viewport.y = clamp(viewport.y + middle.y - g.pinch.middle.y, -30000, 30000); show({ ...g.base, viewport }); return;
    }
    const dx = point.x - g.start.x, dy = point.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) < 6) return;
    g.moved = true;
    if (tool === 'CONNECT') return;
    const zoom = g.base.viewport.zoom;
    if (g.id) show({ ...g.base, nodes: g.base.nodes.map(n => n.id !== g.id ? n : g.resize ? customizable ? prepare(resizeNode(n,g.edge??'se',dx/zoom,dy/zoom,layout?.bounds(n)),g.base)??n : { ...n, width: clamp(n.width + dx / zoom, 120, 1000), height: clamp(n.height + dy / zoom, 80, 800) } : layout?layout.move(n,dx/zoom,dy/zoom):{ ...n, x: clamp(n.x + dx / zoom, -10000, 10000), y: clamp(n.y + dy / zoom, -10000, 10000) }) });
    else show({ ...g.base, viewport: { ...g.base.viewport, x: clamp(g.base.viewport.x + dx, -30000, 30000), y: clamp(g.base.viewport.y + dy, -30000, 30000) } });
  }
  function up(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const stroke=ink.current;if(stroke&&stroke.pointer===event.pointerId){ink.current=null;gesture.current=null;if(cancelled){shownRef.current=stroke.base;setPreview(null);return;}const bounds=layout?layout.bounds(textNode(0,0)):undefined;const p=local(event.clientX,event.clientY);stroke.points=appendDrawingPoint(stroke.points,boardPoint(p.x,p.y,stroke.base.viewport),bounds);const prepared=prepare(drawingNode(stroke.id,stroke.points,markerStyle.color,markerStyle.width,bounds),stroke.base),node=prepared?fitDrawingBudget(stroke.base,prepared):null;if(node){apply({...stroke.base,nodes:[...stroke.base.nodes,node]});}else{shownRef.current=stroke.base;setPreview(null);setMessage(creative.full);}return;}
    const geometry=shapeGesture.current;if(geometry?.pointer===event.pointerId){shapeGesture.current=null;setShapePreview(null);if(!cancelled){const end=boardPoint(event.clientX-geometry.origin.x,event.clientY-geometry.origin.y,geometry.viewport),node=prepare(shapeFromDrag(geometry.shape,geometry.start,end,layout?.bounds(textNode(0,0))));if(node&&shownRef.current.nodes.length<100)setDraft(node);else setMessage(c.limit);}return;}
    const g = gesture.current;
    if (!g || (g.pinch && pointers.current.size)) return;
    gesture.current = null;
    if (g.moved || cancelled) { apply(shownRef.current); return; }
    if (!g.id && tool !== 'PAN' && tool !== 'CONNECT' && tool !== 'DRAW') { const p = local(event.clientX, event.clientY); startText(tool, boardPoint(p.x, p.y, shownRef.current.viewport)); }
  }
  function erase() { if (!selection) return; apply(selected ? withoutNode(shownRef.current, selection) : { ...shownRef.current, connections: shownRef.current.connections.filter(c => c.id !== selection) }); setSelection(null); if (source === selection) setSource(null); }
  function duplicate() { if (!selected || shown.nodes.length >= 100) { setMessage(c.limit); return; } const node = prepare({ ...selected, id: crypto.randomUUID(), x: clamp(selected.x + 32, -10000, 10000), y: clamp(selected.y + 32, -10000, 10000) });if(!node){setMessage(c.limit);return;} apply({ ...shownRef.current, nodes: [...shownRef.current.nodes, node] }); setSelection(node.id); }
  async function upload(file: File, point = center(), id: string = crypto.randomUUID()) {
    if (uploadBusy.current || board.loading || !board.actor.current) return;
    const format=boardFileFormat(file,!!fileTools);if(!format||shownRef.current.nodes.length>=100){setMessage(fileTools?interaction.mediaError:c.photoError);return;}
    if(file.type!==format.mime)file=new File([file],file.name,{type:format.mime});uploadBusy.current=true;
    setUploading(true); setMessage(''); setFailedPhoto(null);
    try {
      const asset = await api.upload(file, id, board.actor.current); if (!alive.current) return;
      const node = prepare({ ...textNode(point.x, point.y), kind: format.kind, text: format.kind==='IMAGE'?'':file.name, assetId: asset.id, width: format.kind==='AUDIO'?360:320, height: format.kind==='AUDIO'?160:240, color: 'WHITE', shape: 'RECTANGLE' });if(!node){setMessage(c.limit);return;}
      if (shownRef.current.nodes.length < 100) { apply({ ...shownRef.current, nodes: [...shownRef.current.nodes, node] }); setSelection(node.id);if(fileTools)setTool('PAN'); }
    } catch { if (alive.current) { setFailedPhoto({ file, id, point }); setMessage(fileTools?interaction.mediaError:c.photoError); } }
    finally { uploadBusy.current=false;if (alive.current) setUploading(false); }
  }
  function adjustZoom(delta: number) { const el = surface.current!; apply({ ...shownRef.current, viewport: zoomAt(shownRef.current.viewport, shownRef.current.viewport.zoom + delta, el.clientWidth / 2, el.clientHeight / 2, layout?.minZoom) }); }
  function createElement(group:BoardCreationGroup) {
    if(board.loading||board.loadError)return;
    const node=group.create(shownRef.current,center()),next=node?prepare(node):null;
    if(!next){setMessage(c.limit);return;}
    creation.current={id:next.id,region:group.id};batchGroup.current=group;setBatchDrafts(group.batchLimit?[next]:[]);setDraftBusy(false);setDraft(next);
  }
  function editSelection() { if(selected?.kind==='DRAWING')return;if(selected&&fileTools&&selected.kind==='TEXT'&&selected.shape==='PLAIN'&&!layout?.editor?.matches(selected)){beginInline({...selected});return;}if (selected) setDraft({ ...selected }); else if (selectedLink) setLinkDraft({ id: selectedLink.id, text: selectedLink.label,direction:selectedLink.direction }); }
  const divided=!!layout&&layout.kind!=='FREEFORM';
  const disabled = board.loading || board.loadError;
  const draftEditor=draft&&layout?.editor?.matches(draft)?layout.editor:undefined;
  const draftIsNew=!!draft&&!shown.nodes.some(node=>node.id===draft.id);
  const batchValues=draft&&batchDrafts.some(n=>n.id===draft.id)?batchDrafts.map(n=>n.id===draft.id?draft:n):[];
  const batchValid=(node:IdeaNode)=>!!node.text.trim()&&layout?.editor?.isValid?.(node)!==false;
  function chooseBatch(id:string){const next=batchValues.find(n=>n.id===id);if(next){setBatchDrafts(batchValues);setDraft(next);}}
  function changeBatch(node:IdeaNode){const next=batchValues.map(n=>n.id===node.id?node:n);setBatchDrafts(next);if(node.id===draft?.id)setDraft(node);}
  function addBatch(){const group=batchGroup.current;if(!group||draftBusy||batchValues.length>=Math.min(3,group.batchLimit??1))return;const reserved={...shownRef.current,nodes:[...shownRef.current.nodes,...batchValues]},node=group.create(reserved,center()),next=node?prepare(node,reserved):null;if(!next){setMessage(c.limit);return;}setBatchDrafts([...batchValues,next]);setDraft(next);}
  function removeBatch(id:string){if(draftBusy||batchValues.length<2)return;const next=batchValues.filter(n=>n.id!==id);setBatchDrafts(next);if(draft?.id===id)setDraft(next[0]);}

  const renderTool=(value:Tool)=>{const Icon=icons[value];return <button type="button" key={value} data-tool={value} className={buttonClass} aria-label={shapeLabels[value]} title={shapeLabels[value]} aria-pressed={tool===value} disabled={disabled} onClick={()=>chooseTool(value)}>{fileTools?<BoardToolEmoji name={({PAN:'move',NOTE:'postit',PLAIN:'text',DRAW:'marker'} as Partial<Record<Tool,BoardToolArtwork>>)[value]}/>:<Icon size={20}/>}<span>{value==='PAN'?c.panShort:shapeLabels[value]}</span></button>;};
  const saveStatus=<div className="idea-board-status" title={fileTools?workbench.autoSave:undefined} data-state={board.loading ? 'saving' : board.loadError ? 'error' : board.state} role="status" aria-live="polite"><span className="idea-board-status-copy">{board.loading || board.state === 'saving' ? <Loader2 size={14} className="idea-board-spinner" aria-hidden="true" /> : board.state === 'saved' && !board.loadError ? <CheckCircle2 size={14} aria-hidden="true" /> : <TriangleAlert size={15} aria-hidden="true" />}{board.loading ? c.saving : board.loadError ? c.error : board.state === 'saving' ? c.saving : board.state === 'saved' ? c.saved : board.state === 'conflict' ? c.conflict : c.error}</span>{board.state === 'error' && <button className={buttonClass} onClick={board.retry}>{c.retry}</button>}{board.state === 'conflict' && <><button className={buttonClass} disabled={board.checking} onClick={() => { void board.retry(); }}>{board.checking ? c.checking : c.recheck}</button><button className={buttonClass} onClick={() => setDiscard(true)}>{c.reload}</button></>}</div>;
  const workbenchHeader=<>
    {fileTools?<IndiceTitleBar tone="coral" className="board-workspace-title-bar" title={fileTools.title??c.title} subtitle={c.subtitle} icon={<IndiceEmoji name={divided?'arrows':'whiteboard'} className="size-8"/>} actions={<div className="board-workspace-title-actions">{saveStatus}{fileTools.render({active,ready:fileReady,compact:titleDock.compact,capture:()=>({actor:fileState.current.actor,content:structuredClone(fileState.current.content)}),replace:replaceFile,notify:setMessage})}</div>}/>:<header className="idea-board-heading">
      <div className="idea-board-brand"><span className="idea-board-emblem" aria-hidden="true">{layout?.emblem??<Lightbulb size={24}/>}</span><div className="min-w-0"><h2>{c.title}</h2><p>{c.subtitle}</p></div></div>
      <div className="idea-board-heading-meta">{saveStatus}{onSaveProject&&<button className={`${buttonClass} idea-board-secondary`} disabled={board.loading||board.loadError||board.state!=='saved'||!!draft||uploading} onClick={()=>onSaveProject(structuredClone(shownRef.current),board.actor.current)}><FolderPlus size={18}/>{saveProjectLabel}</button>}<button className={`${buttonClass} idea-board-expand`} aria-label={expanded?c.collapse:c.expand} title={expanded?c.collapse:c.expand} onClick={()=>void toggleFullscreen()}>{expanded?<Minimize2 size={19}/>:<Maximize2 size={19}/>}</button></div>
    </header>}
    <div className="idea-board-toolbar" role="toolbar" aria-label={fileTools?workbench.tools:c.title}>
      {fileTools&&<div className="board-workspace-tools-heading"><h3><IndiceEmoji name="gear" className="size-6"/>{workbench.tools}</h3><div className="board-workspace-utilities"><BoardPrintButton content={shown} layout={layout} api={api} locale={locale} disabled={disabled||!!draft||!!preview||!!inlineText||!!shapePreview||uploading} notify={setMessage}/><button type="button" className={`${buttonClass} idea-board-expand`} aria-label={expanded?fileTools.exitFullscreen:fileTools.fullscreen} title={expanded?fileTools.exitFullscreen:fileTools.fullscreen} aria-pressed={expanded} onClick={()=>void toggleFullscreen()}><BoardToolEmoji name="fullscreen"/><span>{expanded?fileTools.exitFullscreen:fileTools.fullscreen}</span></button></div></div>}
      <div className="idea-board-toolrail">
        {fileTools?<><div className="board-tool-group" role="group" aria-label={workbench.navigate}>{renderTool('PAN')}</div><div className="board-tool-group" role="group" aria-label={workbench.create}>{(['NOTE','PLAIN'] as Tool[]).map(renderTool)}<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={buttonClass} data-tool="GEOMETRY" aria-label={interaction.forms} aria-pressed={isGeometry(tool as BoardShape)} disabled={disabled}><BoardToolEmoji name="shapes"/><span>{interaction.forms}</span><ChevronDown size={15}/></button></DropdownMenuTrigger><DropdownMenuContent className="board-shape-dropdown">{geometricShapes.map(shape=>{const Icon=icons[shape];return <DropdownMenuItem key={shape} onSelect={()=>chooseTool(shape)}><BoardToolEmoji shape={shape}/><span>{geometryLabel(shape,locale)}</span></DropdownMenuItem>;})}</DropdownMenuContent></DropdownMenu></div><div className="board-tool-group" role="group" aria-label={workbench.relate}><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={buttonClass} data-tool="CONNECT" aria-label={c.connect} aria-pressed={tool==='CONNECT'} disabled={disabled}><BoardToolEmoji name="connect"/><span>{c.connect}</span><ChevronDown size={15}/></button></DropdownMenuTrigger><DropdownMenuContent className="board-connection-dropdown"><DropdownMenuRadioGroup value={connectionDirection} onValueChange={value=>{if(value!=='FORWARD'&&value!=='BOTH')return;setConnectionDirection(value);if(tool!=='CONNECT')chooseTool('CONNECT');}}><DropdownMenuRadioItem value="FORWARD"><ArrowUpRight size={21}/><span>{connectionCopy.forward}</span></DropdownMenuRadioItem><DropdownMenuRadioItem value="BOTH"><ArrowLeftRight size={21}/><span>{connectionCopy.both}</span></DropdownMenuRadioItem></DropdownMenuRadioGroup><p className="board-connection-menu-hint">{connectionCopy.continuous}</p></DropdownMenuContent></DropdownMenu>{renderTool('DRAW')}</div></>: (['NOTE','PLAIN','RECTANGLE','ELLIPSE','CONNECT','PAN',...(customizable?['DRAW'] as Tool[]:[])] as Tool[]).map(renderTool)}
        <div className={fileTools?'board-tool-group board-tool-resources':undefined} role={fileTools?'group':undefined} aria-label={fileTools?interaction.media+' / '+appearanceCopy.symbols:undefined}><button type="button" className={`${buttonClass} idea-board-photo`} disabled={disabled||uploading} onClick={()=>fileInput.current?.click()}>{fileTools?<BoardToolEmoji name="media"/>:<ImagePlus size={20}/>}<span>{fileTools?interaction.media:c.photo}</span></button>{!!symbols?.length&&<button type="button" data-tool="SYMBOL" className={buttonClass} disabled={disabled} onClick={()=>setSymbolPicker(true)}>{fileTools?<BoardToolEmoji name="symbols"/>:<Plus size={20}/>}<span>{appearanceCopy.symbols}</span></button>}</div>
        <input ref={fileInput} hidden type="file" accept={fileTools?boardMediaAccept:'image/png,image/jpeg,image/webp'} aria-label={fileTools?interaction.media:c.photo} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/>
      </div>
      {!fileTools&&<span className="idea-board-tool-description">{c.toolsHint}</span>}
    </div>
    {tool==='DRAW'&&customizable&&<div className="idea-board-marker-controls" role="group" aria-label={creative.marker}><label>{creative.color}<input type="color" aria-label={creative.color} value={markerStyle.color} onInput={e=>setMarkerStyle({...markerStyle,color:e.currentTarget.value})} onChange={e=>setMarkerStyle({...markerStyle,color:e.target.value})}/></label><label>{creative.width}<select aria-label={creative.width} value={markerStyle.width} onChange={e=>setMarkerStyle({...markerStyle,width:Number(e.target.value)})}>{[2,4,8,12,20].map(n=><option key={n} value={n}>{n} px</option>)}</select></label></div>}
    {layout&&<div className={`system-area-nav${layout.creationGroups?' system-domain-section':''}`} aria-label={layout.overview}>
      {layout.creationGroups?<><div className="system-domain-heading"><h3><IndiceEmoji name="layout" className="size-6"/>{workbench.domains}</h3><button type="button" className={`${buttonClass} system-domain-overview`} onClick={()=>fit()} disabled={disabled}><BoardToolEmoji name="fit"/>{layout.overview}</button></div><div className="system-domain-grid">{layout.creationGroups.map(group=><div className="system-domain-card" data-category={group.id} key={group.id}><button type="button" className="system-domain-add" disabled={disabled} aria-label={group.addLabel} title={group.addLabel} onClick={()=>createElement(group)}>{group.icon}<span>{group.label}</span><Plus size={17}/></button><button type="button" className="system-domain-focus" aria-label={`${workbench.view}: ${group.label}`} title={`${workbench.view}: ${group.label}`} disabled={disabled} onClick={()=>fit(group.id)}><BoardToolEmoji name="fit"/></button></div>)}</div></>:<><button type="button" className={buttonClass} onClick={()=>fit()} disabled={disabled}>{layout.overview}</button>{layout.regions.map(region=><button key={region.id} type="button" className={buttonClass} onClick={()=>fit(region.id)} disabled={disabled}>{region.label}</button>)}</>}
    </div>}
  </>;
  return <section ref={frame} hidden={!active} aria-label={c.title} data-idea-board={divided?undefined:true} data-system-board={divided?true:undefined} data-canvas-editor data-file-tools={fileTools?true:undefined} data-customizable={customizable?true:undefined} className={`idea-board ${expanded ? 'idea-board-expanded' : ''} ${divided?'system-board':''}`}>
    <div className="idea-board-chrome">
    {fileTools?<><div ref={titleDock.anchor} className="board-title-anchor" aria-hidden="true"/><div ref={titleDock.dock} className="board-title-dock" data-compact={titleDock.compact}><div className="board-title-stack">{workbenchHeader}</div></div><div className="board-dock-space" aria-hidden="true" style={{height:titleDock.space}}/></>:workbenchHeader}
    {(message || uploading) && <div className="idea-board-notice" role="status">{uploading ? c.uploading : message}{failedPhoto && <button className={buttonClass} onClick={() => void upload(failedPhoto.file, failedPhoto.point, failedPhoto.id)}>{c.uploadRetry}</button>}<button className={buttonClass} aria-label={c.close} onClick={() => { setMessage(''); setFailedPhoto(null); }}><X size={17} /></button></div>}
    {!disabled&&<>
      <div className="idea-board-selection" role="toolbar" aria-label={c.selected} data-selected={!!(selected || selectedLink)} data-connecting={tool === 'CONNECT'}>
        {selected || selectedLink ? <><span className="idea-board-selection-label"><span className="idea-board-selection-dot" aria-hidden="true" />{selected?.kind === 'DRAWING' ? creative.stroke : selected?.kind === 'VIDEO' ? interaction.video : selected?.kind==='AUDIO'?interaction.audio:selected?.kind === 'IMAGE' ? c.photo : selectedLink ? c.connectionLabel : c.nodeLabel}</span><div className="idea-board-selection-actions">{selected?.kind!=='DRAWING'&&<button className={`${buttonClass} idea-board-edit`} onClick={editSelection}>{fileTools?<BoardToolEmoji name="edit"/>:<Pencil size={16}/>} {c.edit}</button>}{selected && customizable && <button className={buttonClass} onClick={()=>{const editor=surface.current?.parentElement?.querySelector<HTMLElement>('[data-inline-node-editor]');editor?.scrollIntoView({block:'nearest'});editor?.querySelector<HTMLElement>('select,input')?.focus();}}><SlidersHorizontal size={16}/>{appearanceCopy.customize}</button>}{selected && <button className={buttonClass} onClick={duplicate}>{fileTools?<BoardToolEmoji name="copy"/>:<Copy size={16}/>} {c.duplicate}</button>}<button className={`${buttonClass} idea-board-remove`} onClick={erase}>{fileTools?<BoardToolEmoji name="remove"/>:<Trash2 size={16}/>} {c.remove}</button><button className={`${buttonClass} idea-board-dismiss`} aria-label={c.close} onClick={() => setSelection(null)}><X size={16} /></button></div><span className="idea-board-context-hint">{tool === 'CONNECT' ? source ? fileTools?connectionCopy.next:c.connectNext : fileTools?connectionCopy.start:c.linkHint : selected?.kind==='DRAWING'?creative.editStroke:c.editHint}</span></> : <span className="idea-board-tool-hint"><MousePointer2 size={15} aria-hidden="true" />{tool === 'DRAW' ? creative.hint : tool === 'CONNECT' ? source ? fileTools?connectionCopy.next:c.connectNext : fileTools?connectionCopy.start:c.linkHint : tool === 'PAN' ? c.panHint : tool === 'PLAIN' ? fileTools?interaction.textHint:c.textHint : tool === 'NOTE' ? layout?.noteHint??c.noteHint : fileTools?interaction.shapeHint:c.shapeHint}</span>}
      </div>
      {customizable&&selected&&tool!=='CONNECT'&&tool!=='DRAW'&&!draft&&!inlineText&&<div className="node-inline-wrap"><NodeAppearanceControls key={selected.id} compact node={selected} locale={locale} system={layout?.nodeClass?.(selected)==='system-node'} bounds={layout?.bounds(selected)} onChange={updateNode}/></div>}
    </>}</div>
    {disabled ? <div className="idea-board-loading" role="status">{board.loading ? c.saving : <><p>{c.error}</p><button className={buttonClass} onClick={board.reload}>{c.retry}</button></>}</div> : <>
      <div ref={surface} data-idea-surface data-active-tool={tool} className={`idea-board-surface ${tool === 'PAN' ? 'idea-board-pan' : ''}`} tabIndex={0} role="group" aria-label={c.title} style={{ backgroundPosition: `${shown.viewport.x}px ${shown.viewport.y}px`, backgroundSize: `${Math.max(16, 24 * shown.viewport.zoom)}px ${Math.max(16, 24 * shown.viewport.zoom)}px` }} onPointerDown={down} onPointerMove={move} onPointerUp={e => up(e)} onPointerCancel={e => up(e, true)} onLostPointerCapture={e => up(e, true)}
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
        onDrop={e => { e.preventDefault(); if ((e.target as Element).closest('[data-idea-minimap]')) return; const file = e.dataTransfer.files[0]; if (file) { const p = local(e.clientX, e.clientY); void upload(file, boardPoint(p.x, p.y, shownRef.current.viewport)); } }}
        onPaste={e => { const file = [...e.clipboardData.items].find(item => item.type.startsWith('image/'))?.getAsFile(); if((e.target as Element).closest('textarea,input'))return;if (file) { e.preventDefault(); void upload(file); } }}
        onKeyDown={e => {
          if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable=true], [data-resize]')) return;
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if(ink.current){shownRef.current=ink.current.base;ink.current=null;gesture.current=null;pointers.current.clear();setPreview(null);return;}setPreview(null); board.travel(e.shiftKey ? 'redo' : 'undo'); return; }
          if (e.key === 'Escape') {shapeGesture.current=null;setShapePreview(null); if(ink.current){shownRef.current=ink.current.base;ink.current=null;setPreview(null);gesture.current=null;pointers.current.clear();}setSelection(null); setSource(null); setTool('PAN'); }
          if (e.key === 'Delete' || e.key === 'Backspace') { if (selection) { e.preventDefault(); erase(); } }
          if (e.key === 'Enter') { e.preventDefault(); const node = (e.target as HTMLElement).closest<HTMLElement>('[data-idea-node]'); if (tool === 'CONNECT' && node?.dataset.ideaNode) chooseNode(node.dataset.ideaNode);else if(fileTools&&tool==='CONNECT')return; else if (selection) editSelection(); else startText(fileTools&&tool!=='PAN'&&tool!=='CONNECT'&&tool!=='DRAW'?tool:'NOTE'); }
          if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); const d = e.shiftKey ? 20 : 5; apply({ ...shownRef.current, nodes: shownRef.current.nodes.map(n => n.id !== selected.id ? n : layout?layout.move(n,e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0,e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0):{ ...n, x: clamp(n.x + (e.key === 'ArrowRight' ? d : e.key === 'ArrowLeft' ? -d : 0), -10000, 10000), y: clamp(n.y + (e.key === 'ArrowDown' ? d : e.key === 'ArrowUp' ? -d : 0), -10000, 10000) }) }); }
        }}>
        {!shown.nodes.length && !layout && tool!=='DRAW' && !inlineText && !shapePreview && <div className="idea-board-empty"><div><div className="idea-board-empty-art" aria-hidden="true"><span><ImagePlus size={26} /></span><span><StickyNote size={32} /></span><span><ArrowUpRight size={22} /></span></div><strong>{c.empty}</strong><span>{c.emptyHint}</span><div className="idea-board-empty-actions" onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><button className={`${buttonClass} idea-board-primary`} onClick={() => startText('NOTE')}><Plus size={18} />{c.firstNote}</button><button className={`${buttonClass} idea-board-secondary`} disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={18} />{fileTools?interaction.media:c.addPhoto}</button></div><small>{fileTools?interaction.mediaHint:c.photosHint}</small></div></div>}
        <div className="idea-board-world" style={{ transform: `translate(${shown.viewport.x}px, ${shown.viewport.y}px) scale(${shown.viewport.zoom})` }}>
          {layout?.backdrop}{shapePreview&&<div className="idea-board-node board-shape-preview" data-shape={shapePreview.shape} data-color={shapePreview.color} style={{left:shapePreview.x,top:shapePreview.y,width:shapePreview.width,height:shapePreview.height,...nodeBoxStyle(shapePreview)}}><BoardGeometryElement node={shapePreview}/></div>}{inlineText&&<BoardInlineText key={inlineText.id} node={inlineText} locale={locale} onFinish={finishInline}/>}<svg className="idea-board-lines" width="1" height="1" aria-hidden="true"><defs><marker id={marker} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" strokeWidth="2" /></marker></defs>{shown.connections.map(link => { const a = shown.nodes.find(n => n.id === link.from), b = shown.nodes.find(n => n.id === link.to); if (!a || !b) return null; const { start, end } = connectionEnds(a, b); return <line key={link.id} data-idea-line={link.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={selection === link.id ? '#f06659' : 'currentColor'} strokeWidth="2.5" markerStart={link.direction==='BOTH'?`url(#${marker})`:undefined} markerEnd={`url(#${marker})`} />; })}</svg>
          {shown.connections.map(link => { const a = shown.nodes.find(n => n.id === link.from), b = shown.nodes.find(n => n.id === link.to); if (!a || !b) return null; const { start, end } = connectionEnds(a, b); return <button key={link.id} className="idea-board-link" data-selected={selection === link.id} style={{ left: (start.x + end.x) / 2, top: (start.y + end.y) / 2 }} aria-label={`${c.connectionLabel}: ${a.text.slice(0, 30)} ${link.direction==='BOTH'?'↔':'→'} ${b.text.slice(0, 30)}`} onPointerDown={e => e.stopPropagation()} onFocus={() => setSelection(link.id)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); setLinkDraft({ id: link.id, text: link.label,direction:link.direction }); } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); apply({ ...shownRef.current, connections: shownRef.current.connections.filter(c => c.id !== link.id) }); setSelection(null); } }} onClick={() => setSelection(link.id)} onDoubleClick={() => setLinkDraft({ id: link.id, text: link.label,direction:link.direction })}>{link.label || (link.direction==='BOTH'?<ArrowLeftRight size={15}/>:<ArrowUpRight size={15} />)}</button>; })}
          {shown.nodes.map(node => <div key={node.id} data-idea-node={node.id} data-workspace-node={layout?node.id:undefined} data-category={layout&&'category' in node?String(node.category):undefined} data-color={node.color} data-shape={node.shape} data-kind={node.kind} aria-label={`${c.nodeLabel}: ${node.text || (node.kind==='DRAWING'?creative.stroke:node.kind==='TEXT'?shapeLabels[node.shape]:node.kind==='VIDEO'?interaction.video:node.kind==='AUDIO'?interaction.audio:c.photo)}`} aria-pressed={selection === node.id} role="button" tabIndex={0} className={`idea-board-node ${inlineText?.id===node.id?'board-text-editing':''} ${layout?.nodeClass?.(node)??''} ${source === node.id ? 'idea-board-source' : ''}`} style={{ left: node.x, top: node.y, width: node.width, height: node.height, ...nodeBoxStyle(node) }} onFocus={e=>{if(e.target===e.currentTarget)setSelection(node.id);}} onClick={e => { if (e.detail === 0) chooseNode(node.id); }} onDoubleClick={() => {if(fileTools&&tool==='CONNECT')return;if(node.kind==='TEXT'&&node.shape==='PLAIN'&&fileTools&&!layout?.editor?.matches(node))beginInline({...node});else if(node.kind!=='DRAWING'&&tool!=='DRAW')setDraft({ ...node });}}>
            {node.kind==='DRAWING'?<BoardDrawingElement node={node}/>:node.kind==='VIDEO'||node.kind==='AUDIO'?<BoardMediaElement node={node} url={api.photoUrl(node.assetId!)} locale={locale}/>:layout?.renderNode?.(node,()=>setDraft({...node}))??<><BoardGeometryElement node={node}/>{node.kind === 'IMAGE' && <img draggable={false} style={nodeImageStyle(node)} src={api.photoUrl(node.assetId!)} alt={node.text || c.photo} onError={e => { e.currentTarget.style.opacity = '.3'; e.currentTarget.alt = c.photoError; }} />}
            {node.text && <div className="idea-board-node-text" style={nodeTextStyle(node)}>{node.text}</div>}</>}
            {selection === node.id && (customizable ? tool!=='CONNECT' && <NodeResizeHandles node={node} zoom={shown.viewport.zoom} label={c.resize} bounds={layout?.bounds(node)} onResize={updateNode}/> : <span data-resize className="idea-board-resize" style={{ transform: `scale(${1 / shown.viewport.zoom})` }} role="img" aria-label={c.resize}><ArrowUpRight size={17} /></span>)}
          </div>)}
        </div>
        {surfaceSize.width > 0 && surfaceSize.height > 0 && <IdeasBoardMinimap content={shown} canvas={surfaceSize} selectedId={selection} copy={baseCopy} worldBounds={layout?.worldBounds} regions={layout?.regions} onPreview={viewport => { stopWheel(); show({ ...shownRef.current, viewport }); }} onCommit={viewport => { stopWheel(); apply({ ...shownRef.current, viewport }); }} />}
      </div>
      <footer className="idea-board-footer"><span className="idea-board-privacy" title={c.private}><LockKeyhole size={13} aria-hidden="true" /><span>{c.private}</span></span><div className="idea-board-canvas-controls"><div className="idea-board-history"><button className={buttonClass} aria-label={c.undo} title={c.undo} disabled={!board.history.past.length} onClick={() => { setPreview(null); board.travel('undo'); }}><Undo2 size={18} /></button><button className={buttonClass} aria-label={c.redo} title={c.redo} disabled={!board.history.future.length} onClick={() => { setPreview(null); board.travel('redo'); }}><Redo2 size={18} /></button></div><div className="idea-board-zoom-controls"><button className={buttonClass} aria-label={c.zoomOut} title={c.zoomOut} disabled={shown.viewport.zoom <= (layout?.minZoom??.25)} onClick={() => adjustZoom(-.1)}><Minus size={18} /></button><span className="idea-board-zoom">{Math.round(shown.viewport.zoom * 100)}%</span><button className={buttonClass} aria-label={c.zoomIn} title={c.zoomIn} disabled={shown.viewport.zoom >= 2} onClick={() => adjustZoom(.1)}><Plus size={18} /></button><button className={`${buttonClass} idea-board-fit`} aria-label={c.fit} title={c.fit} onClick={() => fit()}><Focus size={18} /><span>{c.fit}</span></button></div></div></footer>
    </>}
    {draft&&<SalesModalFrame open closeLabel={fileTools?c.close:undefined} busy={draftBusy} tone={fileTools?'graphite':'coral'} contentClassName={`group/idea-board-editor data-[dialog-compact-viewport=true]:!overflow-hidden ${fileTools?'indice-board-editor-modal':''}`} bodyClassName="group-data-[dialog-compact-viewport=true]/idea-board-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/idea-board-editor:!overflow-y-auto" title={draftEditor?draftEditor.title(draft,draftIsNew):fileTools?draftIsNew?workbench.add:workbench.edit:c.edit} description={draftEditor?draftEditor.description(draft):c.subtitle} icon={draftEditor?draftEditor.icon(draft):<Lightbulb/>} onOpenChange={open=>{if(!open&&!draftBusy)setDraft(null);}} footer={<><Button variant="outline" className="min-h-11" disabled={draftBusy} onClick={()=>setDraft(null)}>{c.cancel}</Button><Button className={fileTools?'min-h-11 board-editor-save':'min-h-11 bg-[#FF6B5E] text-slate-950 hover:bg-[#ef6558]'} disabled={draftBusy||batchValues.some(n=>!batchValid(n))||draftEditor?.isValid?.(draft)===false||((!!draftEditor||draft.kind==='TEXT'&&(!fileTools||!isGeometry(draft.shape)))&&!draft.text.trim())} onClick={()=>{
      if(batchValues.length){const next=mergeBoardDrafts(shownRef.current,batchValues,(node,base)=>prepare(node,base),batchValid);if(!next){setMessage(c.limit);return;}if(layout&&surface.current&&creation.current)next.viewport=layout.fit(next.nodes,surface.current.clientWidth,surface.current.clientHeight,creation.current.region);apply(next);setSelection(draft.id);setDraft(null);setTool('PAN');setSource(null);return;}
      const value=prepare({...draft,text:draft.text.trim()});if(!value){setMessage(c.limit);return;}
      const exists=shownRef.current.nodes.some(n=>n.id===draft.id);if(!exists&&shownRef.current.nodes.length>=100){setMessage(c.limit);return;}
      const next={...shownRef.current,nodes:exists?shownRef.current.nodes.map(n=>n.id===draft.id?value:n):[...shownRef.current.nodes,value]};
      if(creation.current?.id===draft.id&&layout&&surface.current)next.viewport=layout.fit(next.nodes,surface.current.clientWidth,surface.current.clientHeight,creation.current.region);
      apply(next);setSelection(draft.id);setDraft(null);creation.current=null;if(fileTools){setTool('PAN');setSource(null);}
    }}>{draftBusy?c.uploading:batchValues.length>1?batchCopy.save.replace('{n}',String(batchValues.length)):draftEditor?.saveLabel?.(draft)??(fileTools&&isGeometry(draft.shape)?interaction.shapeSave:c.save)}</Button></>}>
      {!!batchValues.length&&<BoardBatchControls nodes={batchValues} activeId={draft.id} locale={locale} busy={draftBusy} valid={batchValid} canAdd={batchValues.length<Math.min(3,batchGroup.current?.batchLimit??1)&&shown.nodes.length+batchValues.length<100} onSelect={chooseBatch} onChange={changeBatch} onAdd={addBatch} onRemove={removeBatch}/>}
      {draftEditor?draftEditor.render({node:draft,onChange:setDraft,locale,api,actor:board.actor.current,onBusyChange:setDraftBusy,nameManaged:!!batchValues.length}):<BoardElementFields node={draft} onChange={setDraft} locale={locale} customizable={customizable} bounds={layout?.bounds(draft)}/>}
    </SalesModalFrame>}
    {symbolPicker&&<SalesModalFrame open closeLabel={fileTools?c.close:undefined} tone={fileTools?'graphite':'coral'} contentClassName={fileTools?'indice-board-editor-modal':''} title={appearanceCopy.symbols} description={fileTools?interaction.symbolHint:c.subtitle} icon={<Plus/>} onOpenChange={setSymbolPicker} footer={<Button variant="outline" onClick={()=>setSymbolPicker(false)}>{c.cancel}</Button>}><div className="board-symbol-groups board-symbol-gallery">{[...new Set(symbols?.map(symbol=>symbol.group??''))].map(group=><fieldset key={group}>{group&&<legend>{group}</legend>}<div className="workspace-icon-picker">{symbols?.filter(symbol=>(symbol.group??'')===group).map(symbol=><button type="button" key={symbol.id} onClick={()=>{const p=center(),node=prepare({...textNode(p.x,p.y,'PLAIN'),text:symbol.glyph+'\n'+symbol.label});if(!node){setMessage(c.limit);return;}setDraft(node);setSymbolPicker(false);}}><span aria-hidden="true">{symbol.glyph}</span><span>{symbol.label}</span></button>)}</div></fieldset>)}</div></SalesModalFrame>}
    {linkDraft && <SalesModalFrame open closeLabel={fileTools?c.close:undefined} tone={fileTools?'graphite':'coral'} contentClassName="group/idea-board-editor data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="group-data-[dialog-compact-viewport=true]/idea-board-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/idea-board-editor:!overflow-y-auto" title={c.connectionLabel} description={c.linkHint} icon={<ArrowUpRight />} onOpenChange={open => { if (!open) setLinkDraft(null); }} footer={<><Button className="min-h-11" variant="outline" onClick={() => setLinkDraft(null)}>{c.cancel}</Button><Button className="min-h-11 bg-[#FF6B5E] text-slate-950" onClick={() => { apply({ ...shownRef.current, connections: shownRef.current.connections.map(link => link.id === linkDraft.id ? fileTools?withConnectionDirection({ ...link, label: linkDraft.text.trim() },linkDraft.direction??'FORWARD'):{ ...link, label: linkDraft.text.trim() } : link) }); setLinkDraft(null); }}>{c.save}</Button></>}><label className="block space-y-2">{c.content}<input className="idea-board-select" autoFocus maxLength={160} value={linkDraft.text} onChange={e => setLinkDraft({ ...linkDraft, text: e.target.value })} /></label>{fileTools&&<fieldset className="board-connection-types"><legend>{connectionCopy.type}</legend>{(['FORWARD','BOTH'] as ConnectionDirection[]).map(direction=><button type="button" key={direction} aria-pressed={(linkDraft.direction??'FORWARD')===direction} onClick={()=>setLinkDraft({...linkDraft,direction})}>{direction==='BOTH'?<ArrowLeftRight size={20}/>:<ArrowUpRight size={20}/>}<span>{direction==='BOTH'?connectionCopy.both:connectionCopy.forward}</span></button>)}</fieldset>}</SalesModalFrame>}
    {discard && <SalesModalFrame open closeLabel={fileTools?c.close:undefined} tone={fileTools?'graphite':'coral'} contentClassName="group/idea-board-editor data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="group-data-[dialog-compact-viewport=true]/idea-board-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/idea-board-editor:!overflow-y-auto" modalType="confirmation" title={c.reload} description={c.discardHint} icon={<Undo2 />} onOpenChange={open => { if (!open) setDiscard(false); }} footer={<><Button variant="outline" className="min-h-11" onClick={() => setDiscard(false)}>{c.cancel}</Button><Button className="min-h-11 bg-[#FF6B5E] text-slate-950" onClick={() => { setPreview(null); setSelection(null); setDiscard(false); board.reload(); }}>{c.discard}</Button></>}><p>{c.discardHint}</p></SalesModalFrame>}
  </section>;
}
