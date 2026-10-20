import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import type { IdeasBoardCopy } from './ideasBoardCopy';
import { clamp, connectionEnds, type BoardContent, type BoardViewport } from './ideasBoardModel';
import { centerBoardAt, minimapGeometry, minimapPoint, projectMinimapBox, projectMinimapPoint, visibleBoardBox, type CanvasSize, type MinimapGeometry, type MinimapBox } from './ideasBoardMinimapModel';

const fills = { YELLOW: '#f2d979', CORAL: '#f1a59c', BLUE: '#9bbbf0', MINT: '#8cd8bc', LAVENDER: '#c5a9eb', WHITE: '#b9c6d6' };
export function IdeasBoardMinimap({ content, canvas, selectedId, copy, worldBounds, regions, onPreview, onCommit }: {
  worldBounds?: MinimapBox; regions?: Array<MinimapBox & {fill:string}>;
  content: BoardContent; canvas: CanvasSize; selectedId: string | null; copy: IdeasBoardCopy;
  onPreview: (view: BoardViewport) => void; onCommit: (view: BoardViewport) => void;
}) {
  const button = useRef<HTMLButtonElement>(null), hint = useId();
  const [size, setSize] = useState({ width: 180, height: 100 });
  const [frozen, setFrozen] = useState<MinimapGeometry | null>(null);
  const drag = useRef<{ pointer: number; geometry: MinimapGeometry; view: BoardViewport } | null>(null);
  const current = useRef(content); current.current = content;
  useEffect(() => {
    const element = button.current; if (!element) return;
    const measure = () => setSize({ width: element.clientWidth || 180, height: element.clientHeight || 100 });
    const observer = new ResizeObserver(measure); observer.observe(element); measure(); return () => observer.disconnect();
  }, []);
  const geometry = frozen ?? minimapGeometry(content.nodes, content.viewport, canvas, size, worldBounds);
  const viewport = projectMinimapBox(geometry, visibleBoardBox(content.viewport, canvas));
  function target(event: PointerEvent<HTMLButtonElement>, g: MinimapGeometry) {
    const rect = event.currentTarget.getBoundingClientRect();
    return centerBoardAt(current.current.viewport, canvas, minimapPoint(g, clamp(event.clientX - rect.left, 0, rect.width), clamp(event.clientY - rect.top, 0, rect.height)));
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation(); const gesture = drag.current; if (!gesture || gesture.pointer !== event.pointerId) return;
    drag.current = null; setFrozen(null); onCommit(gesture.view);
  }
  return <aside data-idea-minimap className="idea-board-minimap" aria-label={copy.minimap}>
    <div className="idea-board-minimap-heading"><span>{copy.minimap}</span><span className="idea-board-minimap-legend" aria-hidden="true" /></div>
    <span id={hint} className="sr-only">{copy.minimapHint}</span>
    <button ref={button} type="button" className="idea-board-minimap-control" aria-label={copy.minimapNavigate} aria-describedby={hint}
      onPointerDown={event => { event.stopPropagation(); if (event.button !== 0 || drag.current) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); const view = target(event, geometry); drag.current = { pointer: event.pointerId, geometry, view }; setFrozen(geometry); onPreview(view); }}
      onPointerMove={event => { event.stopPropagation(); const gesture = drag.current; if (!gesture || gesture.pointer !== event.pointerId) return; gesture.view = target(event, gesture.geometry); onPreview(gesture.view); }}
      onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
      onDoubleClick={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); if (event.detail !== 0) return; const nodes = current.current.nodes; const point = nodes.length ? { x: (Math.min(...nodes.map(n => n.x)) + Math.max(...nodes.map(n => n.x + n.width))) / 2, y: (Math.min(...nodes.map(n => n.y)) + Math.max(...nodes.map(n => n.y + n.height))) / 2 } : { x: 0, y: 0 }; onCommit(centerBoardAt(current.current.viewport, canvas, point)); }}
      onKeyDown={event => { event.stopPropagation(); const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; const direction = directions[event.key]; if (!direction) return; event.preventDefault(); const distance = event.shiftKey ? .5 : .12; const view = current.current.viewport; onCommit({ ...view, x: clamp(view.x - direction[0] * canvas.width * distance, -30000, 30000), y: clamp(view.y - direction[1] * canvas.height * distance, -30000, 30000) }); }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        {regions?.map((region,index) => { const box = projectMinimapBox(geometry,region); return <rect key={index} data-minimap-region x={box.x} y={box.y} width={box.width} height={box.height} fill={region.fill} opacity=".45"/>; })}
        {content.connections.map(link => { const a = content.nodes.find(n => n.id === link.from), b = content.nodes.find(n => n.id === link.to); if (!a || !b) return null; const ends = connectionEnds(a, b), start = projectMinimapPoint(geometry, ends.start.x, ends.start.y), end = projectMinimapPoint(geometry, ends.end.x, ends.end.y); return <line key={link.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="idea-board-minimap-line" />; })}
        {content.nodes.map(node => { const box = projectMinimapBox(geometry, node); return <rect data-minimap-node={node.id} key={node.id} x={box.x} y={box.y} width={Math.max(2, box.width)} height={Math.max(2, box.height)} rx={node.shape === 'ELLIPSE' ? Math.max(2, box.width) / 2 : 2} ry={node.shape === 'ELLIPSE' ? Math.max(2, box.height) / 2 : 2} fill={node.appearance?(node.appearance.transparentFill?'transparent':node.appearance.fillColor):fills[node.color]} stroke={selectedId === node.id ? '#f06659' : node.appearance?.borderColor ?? 'transparent'} strokeWidth="2" />; })}
        <rect data-minimap-viewport x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} rx="2" className="idea-board-minimap-viewport" />
      </svg>
    </button>
  </aside>;
}
