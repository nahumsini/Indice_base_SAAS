import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const m=loadTypescript(new URL('ideasBoardModel.ts',root).pathname,()=>{throw Error('unexpected import');});
const {BoardSaveQueue}=loadTypescript(new URL('boardSaveQueue.ts',root).pathname,id=>{if(id==='./ideasBoardModel')return m;throw Error('unexpected import');});
const {ideasBoardCopy}=loadTypescript(new URL('ideasBoardCopy.ts',root).pathname,()=>{throw Error('unexpected import');});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('connections follow moved rectangles and circle boundaries without mutating nodes',()=>{
 const a=m.textNode(0,0),b=m.textNode(500,0);const ends=m.connectionEnds(a,b);assert.equal(ends.start.x,248);assert.equal(ends.end.x,492);
 const moved=m.connectionEnds({...a,x:200,y:100,shape:'ELLIPSE'},b);assert.notDeepEqual(moved,ends);for(const p of Object.values(moved))for(const value of Object.values(p))assert.ok(Number.isFinite(value));assert.equal(a.x,0);
 const overlap=m.connectionEnds(a,{...b,x:0});for(const p of Object.values(overlap))for(const value of Object.values(p))assert.ok(Number.isFinite(value));
});
test('connecting validates references and removing an idea removes its arrows only',()=>{
 const a=m.textNode(0,0),b=m.textNode(500,0);let d={...m.emptyBoard(),nodes:[a,b]};assert.equal(m.connect(d,a.id,a.id),d);assert.equal(m.connect(d,a.id,'missing'),d);
 d=m.connect(d,a.id,b.id);assert.equal(d.connections.length,1);assert.equal(m.connect(d,a.id,b.id),d);const removed=m.withoutNode(d,a.id);assert.equal(removed.nodes.length,1);assert.equal(removed.connections.length,0);assert.equal(d.connections.length,1);
});
test('zoom remains anchored to pointer and bounded; fit includes distant nodes',()=>{
 const view={x:50,y:100,zoom:1},point=m.boardPoint(200,300,view),zoom=m.zoomAt(view,2,200,300);assert.deepEqual(m.boardPoint(200,300,zoom),point);
 assert.equal(m.zoomAt(view,100,0,0).zoom,2);assert.equal(m.zoomAt(view,-1,0,0).zoom,.25);assert.deepEqual(m.fitBoard([],400,400),{x:0,y:0,zoom:1});
 const fit=m.fitBoard([m.textNode(-300,-200),m.textNode(500,400)],1000,800);assert.ok(fit.zoom>=.25&&fit.zoom<=1.2);assert.ok(Number.isFinite(fit.x));
});
test('history preserves independent changes, caps memory, and clears redo after a new edit',()=>{
 let h={past:[],current:m.emptyBoard(),future:[]};const first={...h.current,nodes:[m.textNode(0,0)]};h=m.record(h,first);h=m.stepHistory(h,'undo');assert.equal(h.current.nodes.length,0);h=m.stepHistory(h,'redo');assert.equal(h.current.nodes.length,1);
 for(let i=0;i<70;i++)h=m.record(h,{...h.current,viewport:{x:i,y:0,zoom:1}});assert.equal(h.past.length,50);h=m.stepHistory(h,'undo');h=m.record(h,{...h.current,nodes:[]});assert.equal(h.future.length,0);
});
test('all eight locales contain complete board controls and recovery explanations',()=>{const keys=Object.keys(ideasBoardCopy('es-MX'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=ideasBoardCopy(locale);assert.deepEqual(Object.keys(c),keys);for(const text of Object.values(c))assert.ok(text.length>0);}});
test('autosave coalesces queued edits and always uses current version and captured actor',async()=>{
 const calls=[],states=[];let release;const q=new BoardSaveQueue(3,'2:7',async(input,actor)=>{calls.push({input,actor});if(calls.length===1)await new Promise(resolve=>release=resolve);return {version:input.version+1};},s=>states.push(s));
 const a=m.emptyBoard();q.enqueue(a);q.enqueue({...a,viewport:{x:1,y:0,zoom:1}});q.enqueue({...a,viewport:{x:2,y:0,zoom:1}});assert.equal(calls.length,1);assert.ok(q.dirty());release();await tick();assert.equal(calls.length,2);assert.equal(calls[1].input.version,4);assert.equal(calls[1].input.content.viewport.x,2);assert.equal(calls[1].actor,'2:7');assert.equal(q.dirty(),false);assert.equal(states.at(-1),'saved');
});
test('uncertain save retry keeps mutation identity then drains newer edits',async()=>{
 const calls=[];let first=true;const q=new BoardSaveQueue(0,'2:7',async input=>{calls.push(structuredClone(input));if(first){first=false;throw Error('lost response');}return{version:input.version+1};},()=>{});
 q.enqueue(m.emptyBoard());await tick();q.enqueue({...m.emptyBoard(),viewport:{x:20,y:0,zoom:1}});await tick();assert.equal(calls.length,1);q.retry();await tick();assert.equal(calls.length,3);assert.deepEqual(calls[1],calls[0]);assert.equal(calls[2].version,1);assert.equal(calls[2].content.viewport.x,20);assert.notEqual(calls[2].mutationId,calls[0].mutationId);
});
test('conflicts remain blocked and retain draft instead of overwriting newer work',async()=>{
 let calls=0,state;const q=new BoardSaveQueue(0,'2:7',async()=>{calls++;throw {status:409};},s=>state=s);q.enqueue(m.emptyBoard());await tick();assert.equal(state,'conflict');q.enqueue({...m.emptyBoard(),nodes:[m.textNode(0,0)]});q.retry();await tick();assert.equal(calls,1);assert.ok(q.dirty());
});
