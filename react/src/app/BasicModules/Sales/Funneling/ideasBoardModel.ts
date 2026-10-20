import type { NodeAppearance } from './nodeAppearance';
export type BoardShape = 'NOTE' | 'RECTANGLE' | 'ELLIPSE' | 'PLAIN';
export type BoardColor = 'YELLOW' | 'CORAL' | 'BLUE' | 'MINT' | 'LAVENDER' | 'WHITE';
export interface IdeaNode { id: string; kind: 'TEXT' | 'IMAGE'; text: string; x: number; y: number; width: number; height: number; shape: BoardShape; color: BoardColor; assetId: string | null; appearance?: NodeAppearance | null }
export interface IdeaConnection { id: string; from: string; to: string; label: string }
export interface BoardViewport { x: number; y: number; zoom: number }
export interface BoardContent { nodes: IdeaNode[]; connections: IdeaConnection[]; viewport: BoardViewport }
export interface SavedBoard { content: BoardContent; version: number; updatedAt: string | null; actorKey: string }
export interface BoardInput { content: BoardContent; version: number; mutationId: string }
export interface BoardAsset { id: string; name: string; contentType: string; size: number }
export const emptyBoard = (): BoardContent => ({ nodes: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } });
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const boardPoint = (x: number, y: number, viewport: BoardViewport) => ({ x: clamp((x - viewport.x) / viewport.zoom, -10000, 10000), y: clamp((y - viewport.y) / viewport.zoom, -10000, 10000) });
export function textNode(x: number, y: number, shape: BoardShape = 'NOTE'): IdeaNode { return { id: crypto.randomUUID(), kind: 'TEXT', text: '', x, y, width: 240, height: 160, shape, color: 'YELLOW', assetId: null }; }
export function withoutNode(content: BoardContent, id: string): BoardContent { return { ...content, nodes: content.nodes.filter(n => n.id !== id), connections: content.connections.filter(c => c.from !== id && c.to !== id) }; }
export function connect(content: BoardContent, from: string, to: string): BoardContent {
  if (from === to || content.connections.length >= 200 || !content.nodes.some(n => n.id === from) || !content.nodes.some(n => n.id === to) || content.connections.some(c => c.from === from && c.to === to)) return content;
  return { ...content, connections: [...content.connections, { id: crypto.randomUUID(), from, to, label: '' }] };
}
export function zoomAt(view: BoardViewport, zoom: number, x: number, y: number): BoardViewport {
  zoom = clamp(zoom, .25, 2); const ratio = zoom / view.zoom;
  return { x: clamp(x - (x - view.x) * ratio, -30000, 30000), y: clamp(y - (y - view.y) * ratio, -30000, 30000), zoom };
}
export function fitBoard(nodes: IdeaNode[], width: number, height: number): BoardViewport {
  if (!nodes.length) return { x: 0, y: 0, zoom: 1 };
  const left = Math.min(...nodes.map(n => n.x)), top = Math.min(...nodes.map(n => n.y));
  const right = Math.max(...nodes.map(n => n.x + n.width)), bottom = Math.max(...nodes.map(n => n.y + n.height));
  const zoom = clamp(Math.min((width - 80) / (right - left), (height - 80) / (bottom - top)), .25, 1.2);
  return { x: width / 2 - (left + right) / 2 * zoom, y: height / 2 - (top + bottom) / 2 * zoom, zoom };
}
export function connectionEnds(from: IdeaNode, to: IdeaNode) {
  const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 }, b = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const dx = b.x - a.x, dy = b.y - a.y;
  function edge(n: IdeaNode, center: { x: number; y: number }, vx: number, vy: number) {
    const rx = n.width / 2 + 8, ry = n.height / 2 + 8;
    const scale = n.shape === 'ELLIPSE' ? 1 / Math.sqrt((vx / rx) ** 2 + (vy / ry) ** 2 || 1) : Math.min(vx ? rx / Math.abs(vx) : Infinity, vy ? ry / Math.abs(vy) : Infinity);
    return { x: center.x + vx * (Number.isFinite(scale) ? scale : 0), y: center.y + vy * (Number.isFinite(scale) ? scale : 0) };
  }
  return { start: edge(from, a, dx, dy), end: edge(to, b, -dx, -dy) };
}
export interface BoardHistory { past: BoardContent[]; current: BoardContent; future: BoardContent[] }
export function record(history: BoardHistory, next: BoardContent): BoardHistory {
  if (JSON.stringify(history.current) === JSON.stringify(next)) return history;
  return { past: [...history.past.slice(-49), history.current], current: next, future: [] };
}
export function stepHistory(history: BoardHistory, direction: 'undo' | 'redo'): BoardHistory {
  if (direction === 'undo') { const next = history.past[history.past.length - 1]; return next ? { past: history.past.slice(0, -1), current: next, future: [history.current, ...history.future] } : history; }
  const next = history.future[0]; return next ? { past: [...history.past, history.current], current: next, future: history.future.slice(1) } : history;
}

// Ignore each window's camera while comparing the actual ideas and their stacking order.
export function sameBoardIdeas(a: BoardContent, b: BoardContent): boolean {
  const key = (value: BoardContent) => JSON.stringify({ nodes: value.nodes.map(n => [n.id,n.kind,n.text,n.x,n.y,n.width,n.height,n.shape,n.color,n.assetId ?? null,n.appearance ?? null]), connections: value.connections.map(c => [c.id,c.from,c.to,c.label]) });
  return key(a) === key(b);
}
