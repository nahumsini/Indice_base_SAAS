import { clamp, type BoardViewport, type IdeaNode } from './ideasBoardModel';
export interface CanvasSize { width: number; height: number }
export interface MinimapBox { x: number; y: number; width: number; height: number }
export interface MinimapGeometry { left: number; top: number; scale: number; offsetX: number; offsetY: number; visible: MinimapBox }
export function visibleBoardBox(view: BoardViewport, canvas: CanvasSize): MinimapBox {
  return { x: -view.x / view.zoom, y: -view.y / view.zoom, width: canvas.width / view.zoom, height: canvas.height / view.zoom };
}
export function minimapGeometry(nodes: IdeaNode[], view: BoardViewport, canvas: CanvasSize, map: CanvasSize, bounds?: MinimapBox): MinimapGeometry {
  const visible = visibleBoardBox(view, canvas);
  const left = Math.min(bounds?.x ?? 0, visible.x, ...nodes.map(n => n.x)) - 80;
  const top = Math.min(bounds?.y ?? 0, visible.y, ...nodes.map(n => n.y)) - 80;
  const right = Math.max(bounds ? bounds.x+bounds.width : 1000, visible.x + visible.width, ...nodes.map(n => n.x + n.width)) + 80;
  const bottom = Math.max(bounds ? bounds.y+bounds.height : 700, visible.y + visible.height, ...nodes.map(n => n.y + n.height)) + 80;
  const scale = Math.min(Math.max(1, map.width - 8) / (right - left), Math.max(1, map.height - 8) / (bottom - top));
  return { left, top, scale, offsetX: (map.width - (right - left) * scale) / 2, offsetY: (map.height - (bottom - top) * scale) / 2, visible };
}
export function projectMinimapPoint(g: MinimapGeometry, x: number, y: number) { return { x: g.offsetX + (x - g.left) * g.scale, y: g.offsetY + (y - g.top) * g.scale }; }
export function projectMinimapBox(g: MinimapGeometry, box: MinimapBox): MinimapBox { return { ...projectMinimapPoint(g, box.x, box.y), width: box.width * g.scale, height: box.height * g.scale }; }
export function minimapPoint(g: MinimapGeometry, x: number, y: number) { return { x: g.left + (x - g.offsetX) / g.scale, y: g.top + (y - g.offsetY) / g.scale }; }
export function centerBoardAt(view: BoardViewport, canvas: CanvasSize, point: { x: number; y: number }): BoardViewport {
  return { ...view, x: clamp(canvas.width / 2 - point.x * view.zoom, -30000, 30000), y: clamp(canvas.height / 2 - point.y * view.zoom, -30000, 30000) };
}
