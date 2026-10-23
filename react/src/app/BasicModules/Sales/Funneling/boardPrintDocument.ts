import {polygonPoints} from './boardGeometry';
import type {BoardContent,IdeaNode} from './ideasBoardModel';
import {connectionEnds} from './ideasBoardModel';
import {defaultAppearance,fontFamilies} from './nodeAppearance';
import {drawingPoints} from './boardDrawing';
import type {IdeasBoardLayout} from './ideasBoardLayout';
import {escapeDocumentPrintHtml as esc} from '../../shared/print/documentHtmlPrintEngine';
export const printCanvas={width:1046,height:600};
export function boardPrintBounds(content:BoardContent,layout?:IdeasBoardLayout) {
 if(layout?.worldBounds){const base=layout.worldBounds;const outside=content.nodes.filter(n=>n.x<base.x||n.y<base.y||n.x+n.width>base.x+base.width||n.y+n.height>base.y+base.height);if(!outside.length)return base;const x=Math.min(base.x,...outside.map(n=>n.x-24)),y=Math.min(base.y,...outside.map(n=>n.y-24));return{x,y,width:Math.max(base.x+base.width,...outside.map(n=>n.x+n.width+24))-x,height:Math.max(base.y+base.height,...outside.map(n=>n.y+n.height+24))-y};}
 if(!content.nodes.length)return{x:0,y:0,width:800,height:500};
 const x=Math.min(...content.nodes.map(n=>n.x))-24,y=Math.min(...content.nodes.map(n=>n.y))-24;
 return{x,y,width:Math.max(...content.nodes.map(n=>n.x+n.width))-x+24,height:Math.max(...content.nodes.map(n=>n.y+n.height))-y+24};
}
const imageUrl=(value:string)=>{try{const url=new URL(value,typeof window==='undefined'?'https://localhost':window.location.origin);return /^(https?:|blob:|data:image\/(png|jpeg|webp);base64,)/i.test(url.href)?url.href:'';}catch{return '';}};
/** Isolated presentation snapshot. Never prints the live shell, camera or editing controls. */
export function boardPrintDocument(content:BoardContent,title:string,photoUrl:(id:string)=>string,layout?:IdeasBoardLayout) {
 const bounds=boardPrintBounds(content,layout),scale=Math.min(printCanvas.width/bounds.width,printCanvas.height/bounds.height);
 const left=(printCanvas.width-bounds.width*scale)/2-bounds.x*scale,top=(printCanvas.height-bounds.height*scale)/2-bounds.y*scale;
 const regions=layout?.regions.map((r,i)=>`<div class="board-print-region" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;background:${esc(r.fill)}"><strong>${i+1} · ${esc(layout?.printSections?.find(s=>s.x===r.x&&s.y===r.y)?.label??r.label)} ${['→','↓','←','↑'][i]}</strong></div>`).join('')??'';
 const sections=layout?.printSections?.filter(section=>layout.regions.some(r=>section.x===r.x&&section.y>r.y&&section.y<r.y+r.height)).map(s=>`<div class="board-print-section" style="left:${s.x}px;top:${s.y}px;width:${s.width}px">${esc(s.label)}</div>`).join('')??'';
 const links=content.connections.map(link=>{const a=content.nodes.find(n=>n.id===link.from),b=content.nodes.find(n=>n.id===link.to);if(!a||!b)return '';const{start,end}=connectionEnds(a,b);return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#334155" stroke-width="2.5" ${link.direction==='BOTH'?'marker-start="url(#board-print-arrow)" ':''}marker-end="url(#board-print-arrow)"/>`;}).join('');
 const labels=content.connections.map(link=>{const a=content.nodes.find(n=>n.id===link.from),b=content.nodes.find(n=>n.id===link.to);if(!a||!b||!link.label)return '';const{start,end}=connectionEnds(a,b);return `<span class="board-print-link" style="left:${(start.x+end.x)/2}px;top:${(start.y+end.y)/2}px">${esc(link.label)}</span>`;}).join('');
 const nodes=content.nodes.map(node=>renderNode(layout?.printNode?.(node)??node,photoUrl)).join('');
 const details=layout?.printDetails?.(content.nodes).map(detail=>`<article class="board-print-details"><h2>${esc(detail.title)}</h2><ol>${detail.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol></article>`).join('')??'';
 return `<article class="board-print-sheet"><header><span>Índice</span><h1>${esc(title)}</h1></header><div class="board-print-canvas"><div class="board-print-world" style="transform:translate(${left}px,${top}px) scale(${scale})">${regions}${sections}<svg class="board-print-lines" width="1" height="1" aria-hidden="true"><defs><marker id="board-print-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="#334155" stroke-width="1.5"/></marker></defs>${links}</svg>${nodes}${labels}</div></div></article>${details}`;
}
function renderNode(n:IdeaNode,photoUrl:(id:string)=>string) {
 const a=n.appearance??defaultAppearance(n),drawing=n.kind==='DRAWING',image=n.kind==='IMAGE';
 const box=`left:${n.x}px;top:${n.y}px;width:${n.width}px;height:${n.height}px;`;
 if(drawing&&n.drawing)return `<div class="board-print-node board-print-drawing" style="${box}"><svg viewBox="0 0 ${n.width} ${n.height}" width="100%" height="100%" preserveAspectRatio="none"><polyline points="${drawingPoints(n)}" fill="none" stroke="${esc(n.drawing.color)}" stroke-width="${n.drawing.width}" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
 if(n.kind==='VIDEO'||n.kind==='AUDIO')return `<div class="board-print-node board-print-media" style="${box}"><span>${n.kind==='VIDEO'?'🎬':'🎵'}</span><div class="board-print-text">${esc(n.text)}</div></div>`;
 const polygon=n.shape in polygonPoints?polygonPoints[n.shape as keyof typeof polygonPoints]:null;
 const radius=n.shape==='ELLIPSE'?'50%':'14px',plain=n.shape==='PLAIN';
 const style=`${box}${plain&&!image?'justify-content:flex-start;':''}padding:${image?9:plain?0:22}px;background:${polygon?'transparent':a.transparentFill?'transparent':esc(a.fillColor)};border:${polygon?0:a.borderWidth}px solid ${esc(a.borderColor)};border-radius:${radius};font-family:${esc(fontFamilies[a.fontFamily])};font-size:${a.fontSize}px;color:${esc(a.textColor)};font-weight:${a.bold?700:400};font-style:${a.italic?'italic':'normal'};text-decoration:${a.underline?'underline':'none'};`;
 const src=image&&n.assetId?imageUrl(photoUrl(n.assetId)):'';
 return `<div class="board-print-node" style="${style}">${polygon?`<svg class="board-print-geometry" viewBox="0 0 1000 1000" preserveAspectRatio="none"><polygon points="${polygon}" fill="${a.transparentFill?'none':esc(a.fillColor)}" stroke="${esc(a.borderColor)}" stroke-width="${a.borderWidth}" vector-effect="non-scaling-stroke"/></svg>`:''}${src?`<img src="${esc(src)}" alt="${esc(n.text)}" style="object-fit:${a.imageFit==='STRETCH'?'fill':a.imageFit.toLowerCase()};border-radius:${radius}"/>`:''}${n.text?`<div class="board-print-text"${image?' style="font-size:13px;flex-shrink:0;max-height:38%"':''}>${esc(n.text)}</div>`:''}</div>`;
}
export const boardPrintStyles=`
.board-print-sheet{width:297mm;height:209mm;padding:10mm;overflow:hidden;break-inside:avoid}
.board-print-sheet header{height:17mm;display:flex;align-items:center;gap:6mm;color:#1e293b;border-bottom:1px solid #dbe4ef;margin-bottom:4mm}
.board-print-sheet header span{color:#2563eb;font-size:14px}.board-print-sheet h1{font-size:18px;font-weight:500;margin:0}
.board-print-canvas{position:relative;width:1046px;height:600px;overflow:hidden;background:#fff}
.board-print-world{position:absolute;transform-origin:0 0;width:0;height:0}
.board-print-node{position:absolute;display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;line-height:1.5;box-sizing:border-box}
.board-print-text{white-space:pre-wrap;overflow-wrap:anywhere;overflow:hidden;max-height:100%}
.board-print-node img{display:block;width:100%;height:100%;min-height:0;object-fit:contain}
.board-print-drawing{overflow:visible}.board-print-region{position:absolute;border:1px solid #cbd5e1;opacity:.7;padding:25px;color:#334155;font-size:24px}
.board-print-section{position:absolute;border-top:2px dashed #dc917d;padding:24px;color:#ae573e;font-size:24px}.board-print-geometry{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.board-print-media{padding:15px;border:2px solid #cbd5e1;border-radius:14px;background:#f8fafc;text-align:center}.board-print-media span{font-size:40px}.board-print-lines{position:absolute;overflow:visible}.board-print-link{position:absolute;transform:translate(-50%,-50%);max-width:180px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:7px;font-size:12px;overflow-wrap:anywhere}
.board-print-details{padding:10mm 14mm;color:#1e293b;break-before:page;font-size:14px}.board-print-details h2{font-size:20px;font-weight:500;margin:0 0 20px}.board-print-details li{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;margin:0 0 12px;break-inside:avoid}
@media screen{.board-print-sheet{margin:auto;box-shadow:0 1px 12px #0001}}
`;
