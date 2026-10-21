import type {IdeaNode} from './ideasBoardModel';
import {drawingPoints} from './boardDrawing';
export function BoardDrawingElement({node}:{node:IdeaNode}) {
 if(!node.drawing)return null;
 return <svg data-board-drawing viewBox={`0 0 ${node.width} ${node.height}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true"><polyline points={drawingPoints(node)} fill="none" stroke={node.drawing.color} strokeWidth={node.drawing.width} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
