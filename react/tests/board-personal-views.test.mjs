import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const app=new URL('../src/app/',import.meta.url),load=(path,imports=()=>{throw Error('unexpected import');})=>loadTypescript(new URL(path,app).pathname,imports);
const {personalCanvasView:canvas,personalFiveSView:fiveS}=load('ComplementaryModules/IdeasBoard/personalBoardViews.ts');
const model=load('BasicModules/Sales/Funneling/ideasBoardModel.ts');
const {BoardSaveQueue}=load('BasicModules/Sales/Funneling/boardSaveQueue.ts',()=>model);
const plain=value=>JSON.parse(JSON.stringify(value));
function mixed(){
 const a={...model.textNode(10,20),text:'Una idea libre'},b={...model.textNode(300,20),text:'Clasificar',fiveS:{role:'SECTION',templateId:crypto.randomUUID(),section:'SORT',area:'Oficina'}};
 return {nodes:[a,b],connections:[],viewport:{x:84,y:25,zoom:1.2}};
}
test('existing mixed documents appear in separate views without rewriting their source',()=>{
 const source=mixed(),before=JSON.stringify(source);
 assert.deepEqual(canvas.select(source).nodes.map(n=>n.text),['Una idea libre']);
 assert.deepEqual(fiveS.select(source).nodes.map(n=>n.text),['Clasificar']);
 assert.equal(JSON.stringify(source),before);
 assert.deepEqual(canvas.select(source).viewport,source.viewport);
 assert.deepEqual(plain(fiveS.select(source).viewport),{x:0,y:0,zoom:1});
});
test('new, open and edits replace only the selected view while retaining the other tab and camera',()=>{
 const source=mixed(),next=fiveS.merge(source,model.emptyBoard());
 assert.deepEqual(next.nodes,[source.nodes[0]]);assert.deepEqual(next.viewport,source.viewport);
 const newCanvas=canvas.merge(source,model.emptyBoard());assert.deepEqual(newCanvas.nodes,[source.nodes[1]]);
 const edited=fiveS.select(source);edited.nodes=[{...edited.nodes[0],text:'Clasificar materiales'}];
 const saved=fiveS.merge(source,edited);assert.equal(saved.nodes[0],source.nodes[0]);assert.equal(saved.nodes[1].text,'Clasificar materiales');
 assert.equal(source.nodes[1].text,'Clasificar');
});
test('legacy cross-view connections remain retained but are never dangling or exposed in a partial snapshot',()=>{
 const source=mixed();source.connections=[{id:'cross',from:source.nodes[0].id,to:source.nodes[1].id,label:'Antes'}];
 assert.equal(canvas.select(source).connections.length,0);assert.equal(fiveS.select(source).connections.length,0);
 assert.deepEqual(fiveS.merge(source,fiveS.select(source)).connections,source.connections);
 assert.equal(fiveS.merge(source,model.emptyBoard()).connections.length,0);
});
test('combined quotas and cross-view identifier collisions reject a replacement without partial mutation',()=>{
 const source=mixed(),before=JSON.stringify(source),next=fiveS.select(source);
 next.nodes=[{...next.nodes[0],id:source.nodes[0].id}];assert.equal(fiveS.merge(source,next),null);
 assert.equal(fiveS.merge(source,canvas.select(source)),null);
 next.nodes=Array.from({length:100},()=>({...source.nodes[1],id:crypto.randomUUID()}));assert.equal(fiveS.merge(source,next),null);
 assert.equal(JSON.stringify(source),before);
});
function harness(options={}){
 globalThis.window=new EventTarget();const runtime=hookRuntime(),calls=[];let source=mixed(),reads=0,view=canvas;
 const saved=(content,version)=>({content:structuredClone(content),version,actorKey:'ideas_board:7:9'});
 const api={get:async()=>{reads++;return saved(source,3);},save:async(input,actor)=>{calls.push({input:structuredClone(input),actor});if(options.fail)throw {status:409};source=structuredClone(input.content);return saved(source,input.version+1);}};
 const {useIdeasBoard}=load('BasicModules/Sales/Funneling/useIdeasBoard.ts',id=>{
  if(id==='react')return runtime.hooks;if(id==='./ideasBoardApi')return {ideasBoardApi:api};if(id==='./boardSaveQueue')return {BoardSaveQueue};if(id==='./ideasBoardModel')return model;throw Error(id);
 });
 const render=()=>runtime.render(()=>useIdeasBoard(api,model.sameBoardIdeas,view));render();
 return {runtime,calls,render,get board(){return runtime.result;},get source(){return source;},get reads(){return reads;},go:next=>{view=next;render();}};
}
test('one queue persists complete documents across tabs, with independent scoped undo and redo',async()=>{
 const h=harness();await h.runtime.flush();const canvasId=h.board.content.nodes[0].id;
 h.board.commit({...h.board.content,nodes:[{...h.board.content.nodes[0],text:'Idea actualizada'}]});await h.runtime.flush();
 h.go(fiveS);assert.equal(h.board.content.nodes.length,1);assert.equal(h.board.history.past.length,0);
 h.board.commit({...h.board.content,nodes:[{...h.board.content.nodes[0],text:'Materiales ordenados'}]});await h.runtime.flush();
 h.go(canvas);assert.equal(h.board.content.nodes[0].text,'Idea actualizada');h.board.travel('undo');await h.runtime.flush();
 assert.equal(h.board.content.nodes[0].text,'Una idea libre');assert.equal(h.source.nodes.find(n=>n.fiveS).text,'Materiales ordenados');
 h.go(fiveS);h.board.travel('undo');await h.runtime.flush();assert.equal(h.board.content.nodes[0].text,'Clasificar');
 assert.equal(h.source.nodes.find(n=>n.id===canvasId).text,'Una idea libre');h.board.travel('redo');await h.runtime.flush();assert.equal(h.board.content.nodes[0].text,'Materiales ordenados');
 assert.equal(h.reads,1);assert.ok(h.calls.every(c=>c.actor==='ideas_board:7:9'&&c.input.content.nodes.length===2));
 assert.deepEqual(h.calls.map(c=>c.input.version),[3,4,5,6,7]);h.runtime.unmount();
});
test('a real conflict in hidden content still blocks writes instead of merging remote data blindly',async()=>{
 const h=harness({fail:true});await h.runtime.flush();h.board.commit({...h.board.content,nodes:[{...h.board.content.nodes[0],text:'Borrador local'}]});await h.runtime.flush();
 assert.equal(h.board.state,'conflict');h.go(fiveS);assert.equal(h.board.state,'conflict');
 assert.equal(h.board.content.nodes[0].text,'Clasificar');assert.ok(h.calls.every(c=>c.input.content.nodes.length===2));
 h.go(canvas);assert.equal(h.board.content.nodes[0].text,'Borrador local');h.runtime.unmount();
});
test('a delayed media callback reads and merges its originating view after navigation',async()=>{
 const h=harness();await h.runtime.flush();const pendingCanvas=h.board;
 h.go(fiveS);h.board.commit({...h.board.content,nodes:[{...h.board.content.nodes[0],text:'Mejora vigente'}]});await h.runtime.flush();
 const current=pendingCanvas.captureContent();assert.equal(current.nodes[0].text,'Una idea libre');
 pendingCanvas.commit({...current,nodes:[...current.nodes,{...model.textNode(10,10),text:'Adjunto tardío'}]});await h.runtime.flush();
 assert.equal(h.board.content.nodes[0].text,'Mejora vigente');assert.equal(h.source.nodes.length,3);
 h.go(canvas);assert.deepEqual(h.board.content.nodes.map(n=>n.text),['Una idea libre','Adjunto tardío']);h.runtime.unmount();
});
