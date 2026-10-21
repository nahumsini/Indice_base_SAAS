import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import test from 'node:test';import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const no=()=>{throw Error('unexpected dependency');};
const model=loadTypescript(new URL('ideasBoardModel.ts',root).pathname,no);
const drawing=loadTypescript(new URL('boardDrawing.ts',root).pathname,no);
const appearance=loadTypescript(new URL('nodeAppearance.ts',root).pathname,no);
const copy=loadTypescript(new URL('boardCreativeCopy.ts',root).pathname,no);
const interaction=loadTypescript(new URL('boardInteractionCopy.ts',root).pathname,no);
const geometry=loadTypescript(new URL('boardGeometry.tsx',root).pathname,id=>id==='react/jsx-runtime'?require(id):id==='./ideasBoardModel'?model:id==='./nodeAppearance'?appearance:id==='./boardInteractionCopy'?interaction:no());
const print=loadTypescript(new URL('boardPrintDocument.ts',root).pathname,id=>id==='./boardGeometry'?geometry:id==='./ideasBoardModel'?model:id==='./boardDrawing'?drawing:id==='./nodeAppearance'?appearance:id.includes('documentHtmlPrintEngine')?{escapeDocumentPrintHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}:no());
test('long freehand gestures keep endpoints, bounded normalized points and independent resize',()=>{
 let points=[];for(let i=0;i<6000;i++)points=drawing.appendDrawingPoint(points,{x:i/10,y:100+Math.sin(i/20)*100});
 assert.ok(points.length<=512);assert.equal(points[0].x,0);assert.ok(points.at(-1).x>488);
 const n=drawing.drawingNode('synthetic',points,'#ff6b5e',12);assert.ok(n.width<=20000&&n.height<=20000);assert.ok(n.width>=40&&n.height>=40);
 n.drawing.points.forEach(p=>assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));
 const resized=appearance.resizeNode(n,'e',200,0);assert.equal(resized.height,n.height);assert.deepEqual(resized.drawing,n.drawing);assert.notEqual(drawing.drawingPoints(resized),drawing.drawingPoints(n));
});
test('taps create visible dots, strokes fit divided world bounds, malformed samples are ignored',()=>{
 const bounds={left:16,top:100,right:2184,bottom:1584};const p=drawing.appendDrawingPoint([],{x:-400,y:2000},bounds);
 const n=drawing.drawingNode('dot',p,'#2563eb',24,bounds);assert.equal(n.drawing.points.length,2);assert.ok(n.x>=16&&n.y>=100&&n.x+n.width<=2184&&n.y+n.height<=1584);
 assert.equal(drawing.appendDrawingPoint(p,{x:NaN,y:5}),p);assert.equal(n.drawing.width,24);
});
test('drawing-only changes participate in conflicts, history, duplication and saved copies',()=>{
 const n=drawing.drawingNode('stroke',[{x:5,y:10},{x:80,y:100}]);const a={...model.emptyBoard(),nodes:[n]},b=structuredClone(a);b.nodes[0].drawing.color='#ff0000';
 assert.equal(model.sameBoardIdeas(a,b),false);b.nodes[0].drawing.color=n.drawing.color;b.nodes[0].drawing.points[0].x=.2;assert.equal(model.sameBoardIdeas(a,b),false);
 const h=model.record({past:[],current:a,future:[]},b);assert.deepEqual(model.stepHistory(h,'undo').current,a);assert.deepEqual(model.stepHistory(model.stepHistory(h,'undo'),'redo').current,b);
});
test('print includes all offscreen ideas, strokes, arrows and safe escaped text without editor chrome',()=>{
 const a={...model.textNode(-2000,100),text:'Idea <script>alert(1)</script>'},b=drawing.drawingNode('stroke',[{x:5000,y:-300},{x:5100,y:-200}]);const c=model.connect({...model.emptyBoard(),nodes:[a,b]},a.id,b.id);
 c.connections[0].label='Siguiente';const bounds=print.boardPrintBounds(c);assert.ok(bounds.x<a.x&&bounds.x+bounds.width>b.x+b.width);
 const html=print.boardPrintDocument(c,'Mis <ideas>',()=>'/api/private-photo');assert.match(html,/<polyline/);assert.match(html,/<line /);assert.match(html,/Siguiente/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|data-resize|data-idea-minimap|toolbar/);
 assert.equal(print.boardPrintDocument({...c,viewport:{x:10000,y:9000,zoom:.25}},'Mis <ideas>',()=>''),html);
});
test('print preserves four quadrant labels, private photo sources, font and stroke colors',()=>{
 const n={...model.textNode(20,140),kind:'IMAGE',text:'Foto',assetId:'photo'},layout={worldBounds:{x:0,y:0,width:2200,height:1600},regions:['Personas','Procesos','Productos','Finanzas'].map((label,i)=>({x:i%2*1100,y:Math.floor(i/2)*800,width:1100,height:800,label,fill:'#eeeeee'}))};
 const html=print.boardPrintDocument({...model.emptyBoard(),nodes:[n]},'Tablero Índice',()=>'/api/v1/ideas-board/assets/photo',layout);
 for(const name of ['Personas','Procesos','Productos','Finanzas'])assert.match(html,new RegExp(name));assert.match(html,/src="https:\/\/localhost\/api\/v1\/ideas-board\/assets\/photo"/);
 assert.doesNotMatch(print.boardPrintDocument({...model.emptyBoard(),nodes:[n]},'Test',()=> 'javascript:alert(1)'),/javascript:/);
 assert.deepEqual(print.boardPrintBounds(model.emptyBoard(),layout),layout.worldBounds);
});
test('all supported locales have marker and PDF labels',()=>{for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA'])for(const v of Object.values(copy.boardCreativeCopy(locale)))assert.ok(v.length);});

test('strokes can cross the whole system without clipping or compressing the gesture',()=>{const bounds={left:16,top:100,right:2184,bottom:1584};let p=[];p=drawing.appendDrawingPoint(p,{x:100,y:200},bounds);p=drawing.appendDrawingPoint(p,{x:2050,y:1450},bounds);const n=drawing.drawingNode('wide',p,'#2563eb',4,bounds);assert.ok(n.width>1900&&n.height>1200);const restored=n.drawing.points.map(p=>({x:n.x+p.x*n.width,y:n.y+p.y*n.height}));assert.ok(Math.abs(restored[1].x-2050)<.01);assert.ok(n.x+n.width<=2184&&n.y+n.height<=1584);assert.ok(appearance.resizeNode(n,'e',20,0,bounds).width>1900);});

test('document quota simplifies only a new stroke or refuses it without changing existing work',()=>{const text={...model.textNode(0,0),text:'a'.repeat(480*1024-3500)};let points=[];for(let i=0;i<1000;i++)points=drawing.appendDrawingPoint(points,{x:i,y:Math.sin(i)*30});const node=drawing.drawingNode('stroke',points);const content={...model.emptyBoard(),nodes:[text]};const fitted=drawing.fitDrawingBudget(content,node);assert.ok(fitted);assert.ok(fitted.drawing.points.length<node.drawing.points.length);assert.equal(content.nodes[0].text,text.text);assert.equal(content.nodes.length,1);assert.equal(drawing.fitDrawingBudget({...content,nodes:[{...text,text:'a'.repeat(480*1024)}]},node),null);});
