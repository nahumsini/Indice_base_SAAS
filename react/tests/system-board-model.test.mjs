import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const app=new URL('../src/app/',import.meta.url);
const load=(path,require=()=>{throw Error('unexpected import');})=>loadTypescript(new URL(path,app).pathname,require);
const base=load('BasicModules/Sales/Funneling/ideasBoardModel.ts');
const {workspaceCopy}=load('ComplementaryModules/IdeasBoard/workspaceCopy.ts');
const catalog=load('ComplementaryModules/IdeasBoard/systemCatalog.ts',()=>({workspaceCopy}));
const m=load('ComplementaryModules/IdeasBoard/systemBoardModel.ts',id=>id==='./systemCatalog'?catalog:base);
const {BoardSaveQueue}=load('BasicModules/Sales/Funneling/boardSaveQueue.ts',()=>base);
const tick=()=>new Promise(r=>setTimeout(r,0));
test('four areas follow clockwise geometry, and element placement and movement stay in their area',()=>{
 let content=base.emptyBoard();
 for(const area of m.areaOrder){const nodes=[];for(let i=0;i<25;i++){const node=m.newElement({...content,nodes},area);assert.ok(node);nodes.push(node);const bounds=m.areas[area];assert.ok(node.x>=bounds.x+16&&node.x+node.width<=bounds.x+1084);assert.ok(node.y>=bounds.y+100&&node.y+node.height<=bounds.y+784);const moved=m.moveElement(node,-100000,100000);assert.ok(moved.x>=bounds.x+16&&moved.y+moved.height<=bounds.y+784);}assert.equal(m.newElement({...content,nodes},area),null);}
 assert.equal(m.areas.PERSON.x,m.areas.FINANCE.x);assert.ok(m.areas.PROCESS.x>m.areas.PERSON.x);assert.ok(m.areas.PRODUCT.y>m.areas.PROCESS.y);assert.equal(m.areas.FINANCE.y,m.areas.PRODUCT.y);
});
test('graph projection preserves category, icon, names, photo and all-area arrows in snapshots',()=>{
 const a={...m.newElement(base.emptyBoard(),'PERSON'),kind:'IMAGE',text:'Ana',assetId:crypto.randomUUID()},b={...m.newElement(base.emptyBoard(),'FINANCE'),text:'Balance'};
 const content=base.connect({...base.emptyBoard(),nodes:[a,b]},a.id,b.id),doc=m.toSystemDocument(content);
 assert.deepEqual(m.fromSystemDocument(doc),content);assert.equal(doc.elements[0].category,'PERSON');assert.equal(doc.elements[0].node.assetId,a.assetId);
 assert.equal(base.withoutNode(content,a.id).connections.length,0);
});
test('overview and area focus fit mobile viewport, and zoom stays anchored',()=>{
 const all=m.fitWorkspace([],320,420);assert.ok(all.zoom>=.08&&all.zoom<=.2);assert.ok(2200*all.zoom<=320);
 const n=m.newElement(base.emptyBoard(),'PERSON'),focus=m.fitWorkspace([n],390,500,'PERSON');assert.ok(focus.zoom>all.zoom);
 const old={x:10,y:20,zoom:.3},z=m.zoomWorkspace(old,.6,200,300);assert.equal((200-old.x)/old.zoom,(200-z.x)/z.zoom);
});
test('all eight locales expose complete practical labels and the same icon choices',()=>{
 const keys=Object.keys(workspaceCopy('es-MX'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=workspaceCopy(locale);assert.deepEqual(Object.keys(c),keys);for(const text of Object.values(c))if(typeof text==='string')assert.ok(text.length>0);for(const choices of Object.values(m.areaIcons))for(const icon of choices)assert.ok(catalog.diagnosticLabels(locale)[icon]);}
});
test('metadata-only remote changes are real conflicts and cannot be overwritten by camera recovery',async()=>{
 const node={...m.newElement(base.emptyBoard(),'PERSON'),text:'Ana'},initial={...base.emptyBoard(),nodes:[node]},remote={...initial,nodes:[{...node,icon:'LEADER'}]};
 assert.equal(m.sameSystemIdeas(initial,remote),false);assert.equal(m.sameSystemIdeas(initial,{...initial,viewport:{x:10,y:20,zoom:1}}),true);
 let calls=0,state;const queue=new BoardSaveQueue(1,'actor',async()=>{calls++;throw {status:409};},s=>state=s,{content:initial,latest:async()=>({content:remote,version:2,actorKey:'actor'}),sameIdeas:m.sameSystemIdeas});
 queue.enqueue({...initial,viewport:{x:50,y:0,zoom:1}});await tick();assert.equal(state,'conflict');assert.equal(calls,1);assert.ok(queue.dirty());
});

test('shared placement supports every tool and crossing the four visual areas without losing content',()=>{
 const initial=base.emptyBoard();
 for(const shape of ['NOTE','RECTANGLE','ELLIPSE','PLAIN']){
  const node=m.placeSystemIdea({...base.textNode(100,150,shape),text:'Nombre\nUna idea práctica',color:'LAVENDER'},initial);
  assert.equal(node.shape,shape);assert.equal(node.icon,'IDEA');assert.equal(node.category,'PERSON');
  const process=m.moveSystemIdea(node,1300,0),product=m.moveSystemIdea(process,0,900),finance=m.moveSystemIdea(product,-1300,0);
  assert.equal(process.category,'PROCESS');assert.equal(product.category,'PRODUCT');assert.equal(finance.category,'FINANCE');
  assert.equal(finance.text,node.text);assert.equal(finance.shape,shape);assert.equal(finance.color,'LAVENDER');
 }
 const legacy={...m.newElement(initial,'PERSON'),text:'Ana',icon:'LEADER'};
 assert.equal(m.moveSystemIdea(legacy,1300,0).icon,'LEADER');assert.equal(m.isLegacySystemNode(legacy),true);
 const photo=m.placeSystemIdea({...base.textNode(1400,1000),kind:'IMAGE',assetId:crypto.randomUUID(),text:''},initial);
 assert.equal(photo.category,'PRODUCT');assert.equal(photo.kind,'IMAGE');assert.equal(m.isLegacySystemNode(photo),false);
 assert.deepEqual(m.fromSystemDocument(m.toSystemDocument({...initial,nodes:[photo]})).nodes,[photo]);
});
test('shared bounds and total limit allow 100 ideas without artificial per-area limits',()=>{
 let content=base.emptyBoard();for(let i=0;i<100;i++){const node=m.placeSystemIdea({...base.textNode(-999,-999),text:'Idea '+i},content);assert.ok(node);content={...content,nodes:[...content.nodes,node]};}
 assert.equal(m.placeSystemIdea(base.textNode(0,0),content),null);assert.ok(m.placeSystemIdea(content.nodes[0],content));
 const far=m.moveSystemIdea(content.nodes[0],99999,99999);assert.equal(far.x+far.width,m.systemWorkspaceBounds.right);assert.equal(far.y+far.height,m.systemWorkspaceBounds.bottom);
 const z=base.zoomAt({x:0,y:0,zoom:.12},.08,100,100,.08);assert.equal(z.zoom,.08);assert.equal(base.zoomAt({x:0,y:0,zoom:1},.08,100,100).zoom,.25);
});

test('server JSON field order cannot create a false system-board conflict',()=>{const node={...m.newElement(base.emptyBoard(),'PERSON'),text:'Ana'},same=Object.fromEntries(Object.entries(node).reverse()),a={...base.emptyBoard(),nodes:[node]};assert.equal(m.sameSystemIdeas(a,{...a,nodes:[same]}),true);assert.equal(m.sameSystemIdeas(a,{...a,nodes:[{...same,category:'PROCESS'}]}),false);});

test('large freehand strokes preserve their coordinates and dimensions across areas',()=>{const node={...base.textNode(30,130),kind:'DRAWING',width:2000,height:1400,drawing:{points:[{x:.1,y:.1},{x:.9,y:.9}],color:'#2563eb',width:4}};const placed=m.placeSystemIdea(node,base.emptyBoard());assert.equal(placed.width,2000);assert.equal(placed.height,1400);assert.deepEqual(placed.drawing,node.drawing);assert.equal(placed.category,'FINANCE');});
