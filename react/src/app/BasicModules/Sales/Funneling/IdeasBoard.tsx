import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Circle, Copy, Focus, Hand, ImagePlus, Lightbulb, Loader2, LockKeyhole, Maximize2, Minimize2, Minus, MousePointer2, Pencil, Plus, Redo2, Square, StickyNote, Trash2, TriangleAlert, Type, Undo2, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { ideasBoardCopy } from './ideasBoardCopy';
import { IdeasBoardMinimap } from './IdeasBoardMinimap';
import { ideasBoardApi } from './ideasBoardApi';
import { useIdeasBoard } from './useIdeasBoard';
import { boardPoint, clamp, connect, connectionEnds, fitBoard, textNode, withoutNode, zoomAt, type BoardColor, type BoardContent, type BoardShape, type IdeaNode } from './ideasBoardModel';
import './ideasBoard.css';

type Tool = BoardShape | 'PAN' | 'CONNECT';
type Point = { x: number; y: number };
type Gesture = { base: BoardContent; start: Point; id: string | null; resize: boolean; moved: boolean; pinch?: { distance: number; middle: Point } };
const colors: BoardColor[] = ['YELLOW', 'CORAL', 'BLUE', 'MINT', 'LAVENDER', 'WHITE'];
const shapes: BoardShape[] = ['NOTE', 'RECTANGLE', 'ELLIPSE', 'PLAIN'];
const icons = { NOTE: StickyNote, RECTANGLE: Square, ELLIPSE: Circle, PLAIN: Type, PAN: Hand, CONNECT: ArrowUpRight };
const buttonClass = 'idea-board-button';

export function IdeasBoard({ locale, active }: { locale: string; active: boolean }) {
  const c = ideasBoardCopy(locale), board = useIdeasBoard(), marker = useId().replace(/:/g, '');
  const surface = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<Tool>('NOTE'), [selection, setSelection] = useState<string | null>(null), [source, setSource] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardContent | null>(null), [expanded, setExpanded] = useState(false), [draft, setDraft] = useState<IdeaNode | null>(null);
  const [discard, setDiscard] = useState(false), [message, setMessage] = useState(''), [uploading, setUploading] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<{ file: File; id: string; point: Point } | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  const [linkDraft, setLinkDraft] = useState<{ id: string; text: string } | null>(null);
  const shown = preview ?? board.content, shownRef = useRef(shown); shownRef.current = shown;
  const gesture = useRef<Gesture | null>(null), pointers = useRef(new Map<number, Point>()), wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null), alive = useRef(true);
  const selected = shown.nodes.find(n => n.id === selection), selectedLink = shown.connections.find(n => n.id === selection);
  const shapeLabels = { NOTE: c.note, RECTANGLE: c.rectangle, ELLIPSE: c.circle, PLAIN: c.text, PAN: c.move, CONNECT: c.connect };
  function apply(next: BoardContent) { shownRef.current = next; setPreview(null); board.commit(next); }
  function show(next: BoardContent) { shownRef.current = next; setPreview(next); }
  function stopWheel() { if (wheelTimer.current) { clearTimeout(wheelTimer.current); wheelTimer.current = null; } }
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopWheel(); }; }, []);
  useEffect(() => { if (!active) { stopWheel(); if (preview) apply(shownRef.current); gesture.current = null; pointers.current.clear(); setExpanded(false); } }, [active]);
  useEffect(() => {
    if (!expanded || !active) return;
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !draft && !discard && !linkDraft) setExpanded(false); };
    window.addEventListener('keydown', close); return () => { document.body.style.overflow = old; window.removeEventListener('keydown', close); };
  }, [expanded, active, draft, discard, linkDraft]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (draft || uploading || failedPhoto) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [draft, uploading, failedPhoto]);
  // The non-passive listener keeps canvas zoom/pan local; the surrounding page scrolls normally.
  useEffect(() => {
    const el = surface.current; if (!el || !active || board.loading || board.loadError) return;
    const wheel = (event: WheelEvent) => {
      if (gesture.current) return;
      if (event.target instanceof Element && event.target.closest('[data-idea-minimap]')) { event.preventDefault(); return; }
      event.preventDefault(); const r = el.getBoundingClientRect(), base = shownRef.current;
      const viewport = event.ctrlKey || event.metaKey ? zoomAt(base.viewport, base.viewport.zoom * Math.exp(-event.deltaY * .008), event.clientX - r.left, event.clientY - r.top) : { ...base.viewport, x: clamp(base.viewport.x - event.deltaX, -30000, 30000), y: clamp(base.viewport.y - event.deltaY, -30000, 30000) };
      show({ ...base, viewport }); stopWheel(); wheelTimer.current = setTimeout(() => { wheelTimer.current = null; apply(shownRef.current); }, 250);
    };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  }, [active, board.loading, board.loadError]);
  useEffect(() => {
    const element = surface.current; if (!element || !active) return;
    const measure = () => setSurfaceSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(measure); observer.observe(element); measure(); return () => observer.disconnect();
  }, [active, board.loading, board.loadError]);
  function local(clientX: number, clientY: number): Point { const r = surface.current!.getBoundingClientRect(); return { x: clientX - r.left, y: clientY - r.top }; }
  function center(): Point { const r = surface.current!.getBoundingClientRect(); return boardPoint(r.width / 2, r.height / 2, shownRef.current.viewport); }
  function startText(shape: BoardShape, point = center()) { if (shownRef.current.nodes.length >= 100) { setMessage(c.limit); return; } const n = textNode(point.x, point.y, shape); if (shape === 'ELLIPSE') { n.width = 210; n.height = 210; } setDraft(n); }
  function chooseTool(value: Tool) { stopWheel(); if (preview) apply(shownRef.current); setTool(value); setSource(value === 'CONNECT' && selected ? selected.id : null); setMessage(''); }
  function chooseNode(id: string) {
    setSelection(id);
    if (tool !== 'CONNECT') return;
    if (!source || !shownRef.current.nodes.some(n => n.id === source)) { setSource(id); return; }
    if (source !== id) { const next = connect(shownRef.current, source, id); if (next === shownRef.current && next.connections.length >= 200) setMessage(c.limit); apply(next); setSource(null); setTool('PAN'); }
  }
  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || draft || linkDraft) return;
    event.preventDefault(); stopWheel(); const point = local(event.clientX, event.clientY); pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size > 2) return;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]; gesture.current = { base: shownRef.current, start: point, id: null, resize: false, moved: true, pinch: { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } } }; return;
    }
    const element = event.target as HTMLElement, node = element.closest<HTMLElement>('[data-idea-node]'), id = node?.dataset.ideaNode ?? null;
    if (id) chooseNode(id); else setSelection(null);
    gesture.current = { base: shownRef.current, start: point, id: tool === 'CONNECT' ? null : id, resize: !!element.closest('[data-resize]'), moved: tool === 'CONNECT' };
    if (node) node.focus({ preventScroll: true }); else surface.current?.focus({ preventScroll: true });
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = local(event.clientX, event.clientY); pointers.current.set(event.pointerId, point); const g = gesture.current; if (!g) return;
    if (g.pinch) {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()], middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const viewport = zoomAt(g.base.viewport, g.base.viewport.zoom * Math.hypot(a.x - b.x, a.y - b.y) / g.pinch.distance, g.pinch.middle.x, g.pinch.middle.y);
      viewport.x = clamp(viewport.x + middle.x - g.pinch.middle.x, -30000, 30000); viewport.y = clamp(viewport.y + middle.y - g.pinch.middle.y, -30000, 30000); show({ ...g.base, viewport }); return;
    }
    const dx = point.x - g.start.x, dy = point.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) < 6) return;
    g.moved = true;
    if (tool === 'CONNECT') return;
    const zoom = g.base.viewport.zoom;
    if (g.id) show({ ...g.base, nodes: g.base.nodes.map(n => n.id !== g.id ? n : g.resize ? { ...n, width: clamp(n.width + dx / zoom, 120, 1000), height: clamp(n.height + dy / zoom, 80, 800) } : { ...n, x: clamp(n.x + dx / zoom, -10000, 10000), y: clamp(n.y + dy / zoom, -10000, 10000) }) });
    else show({ ...g.base, viewport: { ...g.base.viewport, x: clamp(g.base.viewport.x + dx, -30000, 30000), y: clamp(g.base.viewport.y + dy, -30000, 30000) } });
  }
  function up(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId); const g = gesture.current;
    if (!g || (g.pinch && pointers.current.size)) return;
    gesture.current = null;
    if (g.moved || cancelled) { apply(shownRef.current); return; }
    if (!g.id && tool !== 'PAN' && tool !== 'CONNECT') { const p = local(event.clientX, event.clientY); startText(tool, boardPoint(p.x, p.y, shownRef.current.viewport)); }
  }
  function erase() { if (!selection) return; apply(selected ? withoutNode(shownRef.current, selection) : { ...shownRef.current, connections: shownRef.current.connections.filter(c => c.id !== selection) }); setSelection(null); if (source === selection) setSource(null); }
  function duplicate() { if (!selected || shown.nodes.length >= 100) { setMessage(c.limit); return; } const node = { ...selected, id: crypto.randomUUID(), x: clamp(selected.x + 32, -10000, 10000), y: clamp(selected.y + 32, -10000, 10000) }; apply({ ...shownRef.current, nodes: [...shownRef.current.nodes, node] }); setSelection(node.id); }
  async function upload(file: File, point = center(), id: string = crypto.randomUUID()) {
    if (uploading || board.loading || !board.actor.current) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0 || file.name.length > 180 || shownRef.current.nodes.length >= 100) { setMessage(c.photoError); return; }
    setUploading(true); setMessage(''); setFailedPhoto(null);
    try {
      const asset = await ideasBoardApi.upload(file, id, board.actor.current); if (!alive.current) return;
      const node: IdeaNode = { ...textNode(point.x, point.y), kind: 'IMAGE', text: '', assetId: asset.id, width: 280, height: 210, color: 'WHITE', shape: 'RECTANGLE' };
      if (shownRef.current.nodes.length < 100) { apply({ ...shownRef.current, nodes: [...shownRef.current.nodes, node] }); setSelection(node.id); }
    } catch { if (alive.current) { setFailedPhoto({ file, id, point }); setMessage(c.photoError); } }
    finally { if (alive.current) setUploading(false); }
  }
  function adjustZoom(delta: number) { const el = surface.current!; apply({ ...shownRef.current, viewport: zoomAt(shownRef.current.viewport, shownRef.current.viewport.zoom + delta, el.clientWidth / 2, el.clientHeight / 2) }); }
  function editSelection() { if (selected) setDraft({ ...selected }); else if (selectedLink) setLinkDraft({ id: selectedLink.id, text: selectedLink.label }); }
  const disabled = board.loading || board.loadError;
  return <section hidden={!active} aria-label={c.title} data-idea-board className={`idea-board ${expanded ? 'idea-board-expanded' : ''}`}>
    <header className="idea-board-heading">
      <div className="idea-board-brand"><span className="idea-board-emblem" aria-hidden="true"><Lightbulb size={24} /></span><div className="min-w-0"><h2>{c.title}</h2><p>{c.subtitle}</p></div></div>
      <div className="idea-board-heading-meta">
        <div className="idea-board-status" data-state={board.loading ? 'saving' : board.loadError ? 'error' : board.state} role="status" aria-live="polite"><span className="idea-board-status-copy">{board.loading || board.state === 'saving' ? <Loader2 size={14} className="idea-board-spinner" aria-hidden="true" /> : board.state === 'saved' && !board.loadError ? <CheckCircle2 size={14} aria-hidden="true" /> : <TriangleAlert size={15} aria-hidden="true" />}{board.loading ? c.saving : board.loadError ? c.error : board.state === 'saving' ? c.saving : board.state === 'saved' ? c.saved : board.state === 'conflict' ? c.conflict : c.error}</span>{board.state === 'error' && <button className={buttonClass} onClick={board.retry}>{c.retry}</button>}{board.state === 'conflict' && <><button className={buttonClass} disabled={board.checking} onClick={() => { void board.retry(); }}>{board.checking ? c.checking : c.recheck}</button><button className={buttonClass} onClick={() => setDiscard(true)}>{c.reload}</button></>}</div>
        <button className={`${buttonClass} idea-board-expand`} aria-label={expanded ? c.collapse : c.expand} title={expanded ? c.collapse : c.expand} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button>
      </div>
    </header>
    <div className="idea-board-toolbar" role="toolbar" aria-label={c.title}>
      <div className="idea-board-toolrail">{(['NOTE', 'PLAIN', 'RECTANGLE', 'ELLIPSE', 'CONNECT', 'PAN'] as Tool[]).map(value => { const Icon = icons[value]; return <button type="button" key={value} data-tool={value} className={buttonClass} aria-label={shapeLabels[value]} title={shapeLabels[value]} aria-pressed={tool === value} disabled={disabled} onClick={() => chooseTool(value)}><Icon size={20} /><span>{value === 'PAN' ? c.panShort : shapeLabels[value]}</span></button>; })}<button type="button" className={`${buttonClass} idea-board-photo`} disabled={disabled || uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={20} /><span>{c.photo}</span></button><input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label={c.photo} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }} /></div>
      <span className="idea-board-tool-description">{c.toolsHint}</span>
    </div>
    {(message || uploading) && <div className="idea-board-notice" role="status">{uploading ? c.uploading : message}{failedPhoto && <button className={buttonClass} onClick={() => void upload(failedPhoto.file, failedPhoto.point, failedPhoto.id)}>{c.uploadRetry}</button>}<button className={buttonClass} aria-label={c.close} onClick={() => { setMessage(''); setFailedPhoto(null); }}><X size={17} /></button></div>}
    {disabled ? <div className="idea-board-loading" role="status">{board.loading ? c.saving : <><p>{c.error}</p><button className={buttonClass} onClick={board.reload}>{c.retry}</button></>}</div> : <>
      <div className="idea-board-selection" role="toolbar" aria-label={c.selected} data-selected={!!(selected || selectedLink)} data-connecting={tool === 'CONNECT'}>
        {selected || selectedLink ? <><span className="idea-board-selection-label"><span className="idea-board-selection-dot" aria-hidden="true" />{selected?.kind === 'IMAGE' ? c.photo : selectedLink ? c.connectionLabel : c.nodeLabel}</span><div className="idea-board-selection-actions"><button className={`${buttonClass} idea-board-edit`} onClick={editSelection}><Pencil size={16} />{c.edit}</button>{selected && <button className={buttonClass} onClick={duplicate}><Copy size={16} />{c.duplicate}</button>}<button className={`${buttonClass} idea-board-remove`} onClick={erase}><Trash2 size={16} />{c.remove}</button><button className={`${buttonClass} idea-board-dismiss`} aria-label={c.close} onClick={() => setSelection(null)}><X size={16} /></button></div><span className="idea-board-context-hint">{tool === 'CONNECT' ? source ? c.connectNext : c.linkHint : c.editHint}</span></> : <span className="idea-board-tool-hint"><MousePointer2 size={15} aria-hidden="true" />{tool === 'CONNECT' ? source ? c.connectNext : c.linkHint : tool === 'PAN' ? c.panHint : tool === 'PLAIN' ? c.textHint : tool === 'NOTE' ? c.noteHint : c.shapeHint}</span>}
      </div>
      <div ref={surface} data-idea-surface className={`idea-board-surface ${tool === 'PAN' ? 'idea-board-pan' : ''}`} tabIndex={0} role="group" aria-label={c.title} style={{ backgroundPosition: `${shown.viewport.x}px ${shown.viewport.y}px`, backgroundSize: `${Math.max(16, 24 * shown.viewport.zoom)}px ${Math.max(16, 24 * shown.viewport.zoom)}px` }} onPointerDown={down} onPointerMove={move} onPointerUp={e => up(e)} onPointerCancel={e => up(e, true)} onLostPointerCapture={e => up(e, true)}
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
        onDrop={e => { e.preventDefault(); if ((e.target as Element).closest('[data-idea-minimap]')) return; const file = e.dataTransfer.files[0]; if (file) { const p = local(e.clientX, e.clientY); void upload(file, boardPoint(p.x, p.y, shownRef.current.viewport)); } }}
        onPaste={e => { const file = [...e.clipboardData.items].find(item => item.type.startsWith('image/'))?.getAsFile(); if (file) { e.preventDefault(); void upload(file); } }}
        onKeyDown={e => {
          if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable=true]')) return;
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); setPreview(null); board.travel(e.shiftKey ? 'redo' : 'undo'); return; }
          if (e.key === 'Escape') { setSelection(null); setSource(null); setTool('PAN'); }
          if (e.key === 'Delete' || e.key === 'Backspace') { if (selection) { e.preventDefault(); erase(); } }
          if (e.key === 'Enter') { e.preventDefault(); const node = (e.target as HTMLElement).closest<HTMLElement>('[data-idea-node]'); if (tool === 'CONNECT' && node?.dataset.ideaNode) chooseNode(node.dataset.ideaNode); else if (selection) editSelection(); else startText('NOTE'); }
          if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); const d = e.shiftKey ? 20 : 5; apply({ ...shownRef.current, nodes: shownRef.current.nodes.map(n => n.id !== selected.id ? n : { ...n, x: clamp(n.x + (e.key === 'ArrowRight' ? d : e.key === 'ArrowLeft' ? -d : 0), -10000, 10000), y: clamp(n.y + (e.key === 'ArrowDown' ? d : e.key === 'ArrowUp' ? -d : 0), -10000, 10000) }) }); }
        }}>
        {!shown.nodes.length && <div className="idea-board-empty"><div><div className="idea-board-empty-art" aria-hidden="true"><span><ImagePlus size={26} /></span><span><StickyNote size={32} /></span><span><ArrowUpRight size={22} /></span></div><strong>{c.empty}</strong><span>{c.emptyHint}</span><div className="idea-board-empty-actions" onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><button className={`${buttonClass} idea-board-primary`} onClick={() => startText('NOTE')}><Plus size={18} />{c.firstNote}</button><button className={`${buttonClass} idea-board-secondary`} disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={18} />{c.addPhoto}</button></div><small>{c.photosHint}</small></div></div>}
        <div className="idea-board-world" style={{ transform: `translate(${shown.viewport.x}px, ${shown.viewport.y}px) scale(${shown.viewport.zoom})` }}>
          <svg className="idea-board-lines" width="1" height="1" aria-hidden="true"><defs><marker id={marker} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" strokeWidth="2" /></marker></defs>{shown.connections.map(link => { const a = shown.nodes.find(n => n.id === link.from), b = shown.nodes.find(n => n.id === link.to); if (!a || !b) return null; const { start, end } = connectionEnds(a, b); return <line key={link.id} data-idea-line={link.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={selection === link.id ? '#f06659' : 'currentColor'} strokeWidth="2.5" markerEnd={`url(#${marker})`} />; })}</svg>
          {shown.connections.map(link => { const a = shown.nodes.find(n => n.id === link.from), b = shown.nodes.find(n => n.id === link.to); if (!a || !b) return null; const { start, end } = connectionEnds(a, b); return <button key={link.id} className="idea-board-link" data-selected={selection === link.id} style={{ left: (start.x + end.x) / 2, top: (start.y + end.y) / 2 }} aria-label={`${c.connectionLabel}: ${a.text.slice(0, 30)} → ${b.text.slice(0, 30)}`} onPointerDown={e => e.stopPropagation()} onFocus={() => setSelection(link.id)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); setLinkDraft({ id: link.id, text: link.label }); } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); apply({ ...shownRef.current, connections: shownRef.current.connections.filter(c => c.id !== link.id) }); setSelection(null); } }} onClick={() => setSelection(link.id)} onDoubleClick={() => setLinkDraft({ id: link.id, text: link.label })}>{link.label || <ArrowUpRight size={15} />}</button>; })}
          {shown.nodes.map(node => <div key={node.id} data-idea-node={node.id} data-color={node.color} data-shape={node.shape} data-kind={node.kind} aria-label={`${c.nodeLabel}: ${node.text || c.photo}`} aria-pressed={selection === node.id} role="button" tabIndex={0} className={`idea-board-node ${source === node.id ? 'idea-board-source' : ''}`} style={{ left: node.x, top: node.y, width: node.width, height: node.height }} onFocus={() => setSelection(node.id)} onClick={e => { if (e.detail === 0) chooseNode(node.id); }} onDoubleClick={() => setDraft({ ...node })}>
            {node.kind === 'IMAGE' && <img draggable={false} src={ideasBoardApi.photoUrl(node.assetId!)} alt={node.text || c.photo} onError={e => { e.currentTarget.style.opacity = '.3'; e.currentTarget.alt = c.photoError; }} />}
            {node.text && <div className="idea-board-node-text">{node.text}</div>}
            {selection === node.id && <span data-resize className="idea-board-resize" style={{ transform: `scale(${1 / shown.viewport.zoom})` }} role="img" aria-label={c.resize}><ArrowUpRight size={17} /></span>}
          </div>)}
        </div>
        {surfaceSize.width > 0 && surfaceSize.height > 0 && <IdeasBoardMinimap content={shown} canvas={surfaceSize} selectedId={selection} copy={c} onPreview={viewport => { stopWheel(); show({ ...shownRef.current, viewport }); }} onCommit={viewport => { stopWheel(); apply({ ...shownRef.current, viewport }); }} />}
      </div>
      <footer className="idea-board-footer"><span className="idea-board-privacy" title={c.private}><LockKeyhole size={13} aria-hidden="true" /><span>{c.private}</span></span><div className="idea-board-canvas-controls"><div className="idea-board-history"><button className={buttonClass} aria-label={c.undo} title={c.undo} disabled={!board.history.past.length} onClick={() => { setPreview(null); board.travel('undo'); }}><Undo2 size={18} /></button><button className={buttonClass} aria-label={c.redo} title={c.redo} disabled={!board.history.future.length} onClick={() => { setPreview(null); board.travel('redo'); }}><Redo2 size={18} /></button></div><div className="idea-board-zoom-controls"><button className={buttonClass} aria-label={c.zoomOut} title={c.zoomOut} disabled={shown.viewport.zoom <= .25} onClick={() => adjustZoom(-.1)}><Minus size={18} /></button><span className="idea-board-zoom">{Math.round(shown.viewport.zoom * 100)}%</span><button className={buttonClass} aria-label={c.zoomIn} title={c.zoomIn} disabled={shown.viewport.zoom >= 2} onClick={() => adjustZoom(.1)}><Plus size={18} /></button><button className={`${buttonClass} idea-board-fit`} aria-label={c.fit} title={c.fit} onClick={() => apply({ ...shownRef.current, viewport: fitBoard(shownRef.current.nodes, surface.current!.clientWidth, surface.current!.clientHeight) })}><Focus size={18} /><span>{c.fit}</span></button></div></div></footer>
    </>}
    {draft && <SalesModalFrame open contentClassName="group/idea-board-editor data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="group-data-[dialog-compact-viewport=true]/idea-board-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/idea-board-editor:!overflow-y-auto" title={c.edit} description={c.subtitle} icon={<Lightbulb />} onOpenChange={open => { if (!open) setDraft(null); }} footer={<><Button variant="outline" className="min-h-11" onClick={() => setDraft(null)}>{c.cancel}</Button><Button className="min-h-11 bg-[#FF6B5E] text-slate-950 hover:bg-[#ef6558]" disabled={draft.kind === 'TEXT' && !draft.text.trim()} onClick={() => { const exists = shownRef.current.nodes.some(n => n.id === draft.id); if (!exists && shownRef.current.nodes.length >= 100) { setMessage(c.limit); return; } apply({ ...shownRef.current, nodes: exists ? shownRef.current.nodes.map(n => n.id === draft.id ? { ...draft, text: draft.text.trim() } : n) : [...shownRef.current.nodes, { ...draft, text: draft.text.trim() }] }); setSelection(draft.id); setDraft(null); }}>{c.save}</Button></>}>
      <div className="space-y-4"><label className="block space-y-2 text-sm font-medium">{c.content}<textarea autoFocus rows={5} maxLength={4000} placeholder={c.placeholder} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">{c.shape}<select value={draft.shape} onChange={e => setDraft({ ...draft, shape: e.target.value as BoardShape })} className="idea-board-select">{shapes.map(shape => <option key={shape} value={shape}>{shapeLabels[shape]}</option>)}</select></label><fieldset className="space-y-2"><legend className="text-sm font-medium">{c.color}</legend><div className="flex flex-wrap gap-1">{colors.map((color, index) => <button type="button" data-color={color} className="idea-board-swatch" key={color} aria-label={`${c.color} ${index + 1}`} aria-pressed={draft.color === color} onClick={() => setDraft({ ...draft, color })}>{draft.color === color && <Check size={18} aria-hidden="true" />}</button>)}</div></fieldset></div></div>
    </SalesModalFrame>}
    {linkDraft && <SalesModalFrame open contentClassName="group/idea-board-editor data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="group-data-[dialog-compact-viewport=true]/idea-board-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/idea-board-editor:!overflow-y-auto" title={c.connectionLabel} description={c.linkHint} icon={<ArrowUpRight />} onOpenChange={open => { if (!open) setLinkDraft(null); }} footer={<><Button className="min-h-11" variant="outline" onClick={() => setLinkDraft(null)}>{c.cancel}</Button><Button className="min-h-11 bg-[#FF6B5E] text-slate-950" onClick={() => { apply({ ...shownRef.current, connections: shownRef.current.connections.map(link => link.id === linkDraft.id ? { ...link, label: linkDraft.text.trim() } : link) }); setLinkDraft(null); }}>{c.save}</Button></>}><label className="block space-y-2">{c.content}<input className="idea-board-select" autoFocus maxLength={160} value={linkDraft.text} onChange={e => setLinkDraft({ ...linkDraft, text: e.target.value })} /></label></SalesModalFrame>}
    {discard && <SalesModalFrame open contentClassName="group/idea-board-editor data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="group-data-[dialog-compact-viewport=true]/idea-board-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/idea-board-editor:!overflow-y-auto" modalType="confirmation" title={c.reload} description={c.discardHint} icon={<Undo2 />} onOpenChange={open => { if (!open) setDiscard(false); }} footer={<><Button variant="outline" className="min-h-11" onClick={() => setDiscard(false)}>{c.cancel}</Button><Button className="min-h-11 bg-[#FF6B5E] text-slate-950" onClick={() => { setPreview(null); setSelection(null); setDiscard(false); board.reload(); }}>{c.discard}</Button></>}><p>{c.discardHint}</p></SalesModalFrame>}
  </section>;
}
