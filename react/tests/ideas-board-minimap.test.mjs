import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const model=loadTypescript(new URL('ideasBoardModel.ts',root).pathname,()=>{throw Error('unexpected');});
const map=loadTypescript(new URL('ideasBoardMinimapModel.ts',root).pathname,id=>{if(id==='./ideasBoardModel')return model;throw Error(id);});
const {BoardSaveQueue}=loadTypescript(new URL('boardSaveQueue.ts',root).pathname,id=>{if(id==='./ideasBoardModel')return model;throw Error(id);});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const content=()=>({...model.emptyBoard(),nodes:[model.textNode(100,100)]});
const saved=(content,version=4,actorKey='2:7')=>({content:structuredClone(content),version,actorKey,updatedAt:null});
test('minimap projects negative/distant ideas and the current viewport inside its bounds',()=>{
 const nodes=[model.textNode(-10000,-8000),model.textNode(9500,9000)];
 for(const canvas of [{width:1400,height:700},{width:320,height:400},{width:844,height:100}]){
  const size={width:180,height:90},g=map.minimapGeometry(nodes,{x:100,y:-200,zoom:.25},canvas,size);
  for(const box of [...nodes,g.visible]){const p=map.projectMinimapBox(g,box);assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=size.width+.001&&p.y+p.height<=size.height+.001,JSON.stringify(p));}
 }
});
test('minimap coordinates round-trip and click centering preserves zoom within pan bounds',()=>{
 const view={x:50,y:70,zoom:.75},canvas={width:1200,height:600},g=map.minimapGeometry([],view,canvas,{width:180,height:100});
 const p=map.projectMinimapPoint(g,-300,700),world=map.minimapPoint(g,p.x,p.y);assert.ok(Math.abs(world.x+300)<.000001&&Math.abs(world.y-700)<.000001);
 const centered=map.centerBoardAt(view,canvas,world);assert.equal(centered.zoom,.75);assert.equal(world.x*centered.zoom+centered.x,canvas.width/2);assert.equal(world.y*centered.zoom+centered.y,canvas.height/2);
 assert.equal(map.centerBoardAt(view,canvas,{x:1000000,y:-1000000}).x,-30000);assert.equal(map.centerBoardAt(view,canvas,{x:1000000,y:-1000000}).y,30000);
});
test('zoom changes the visible rectangle and empty/minimum-height minimaps stay finite',()=>{
 const canvas={width:800,height:400};assert.equal(map.visibleBoardBox({x:0,y:0,zoom:.5},canvas).width,1600);assert.equal(map.visibleBoardBox({x:0,y:0,zoom:2},canvas).width,400);
 for(const size of [{width:130,height:44},{width:180,height:100}]){const g=map.minimapGeometry([],{x:30000,y:-30000,zoom:.25},canvas,size);assert.ok(g.scale>0&&Number.isFinite(g.scale));assert.ok(Number.isFinite(g.offsetX));}
});
test('idea comparison ignores only camera and property order; text, coordinates, photos and connections remain authoritative',()=>{
 const a=content(),b={viewport:{x:999,y:222,zoom:.5},connections:[],nodes:a.nodes.map(n=>Object.fromEntries(Object.entries(n).reverse()))};assert.ok(model.sameBoardIdeas(a,b));
 for(const patch of [{text:'Someone else edited'}, {x:200}, {assetId:crypto.randomUUID()}, {color:'BLUE'}])assert.equal(model.sameBoardIdeas(a,{...b,nodes:[{...b.nodes[0],...patch}]}),false);
 assert.equal(model.sameBoardIdeas(a,{...b,connections:[{id:'edge',from:'a',to:'b',label:''}]}),false);
});
test('viewport-only concurrent changes safely rebase once with a fresh mutation and exact current version',async()=>{
 const base=content(),next={...base,nodes:[{...base.nodes[0],text:'My edit'}]},remote={...base,viewport:{x:100,y:30,zoom:.5}},calls=[],states=[];
 const q=new BoardSaveQueue(3,'2:7',async(input,actor)=>{calls.push({input:structuredClone(input),actor});if(calls.length===1)throw{status:409};return saved(input.content,input.version+1);},s=>states.push(s),{content:base,latest:async()=>saved(remote,4)});
 q.enqueue(next);await tick();assert.equal(calls.length,2);assert.equal(calls[1].input.version,4);assert.notEqual(calls[1].input.mutationId,calls[0].input.mutationId);assert.deepEqual(calls[1].input.content,next);assert.equal(calls[1].actor,'2:7');assert.equal(states.at(-1),'saved');
});
test('real content/actor conflicts, unchanged versions and failed recovery reads never rebase',async()=>{
 const base=content(),next={...base,nodes:[{...base.nodes[0],text:'Mine'}]};
 for(const latest of [async()=>saved({...base,nodes:[{...base.nodes[0],text:'Theirs'}]},4),async()=>saved(base,4,'3:7'),async()=>saved(base,3),async()=>{throw Error('offline');}]){
  let calls=0,state;const q=new BoardSaveQueue(3,'2:7',async()=>{calls++;throw{status:409};},s=>state=s,{content:base,latest});q.enqueue(next);await tick();q.retry();await tick();assert.equal(calls,1);assert.equal(state,'conflict');assert.ok(q.dirty());
 }
});
test('a second concurrent conflict is bounded; it never loops or forces an overwrite',async()=>{
 const base=content();let writes=0,reads=0,state;const q=new BoardSaveQueue(3,'2:7',async()=>{writes++;throw{status:409};},s=>state=s,{content:base,latest:async()=>{reads++;return saved(base,4);}});q.enqueue(base);await tick();assert.equal(writes,2);assert.equal(reads,1);assert.equal(state,'conflict');
});
test('network failure after a safe rebase retains that mutation identity for uncertain retry',async()=>{
 const base=content(),calls=[];const q=new BoardSaveQueue(3,'2:7',async input=>{calls.push(structuredClone(input));if(calls.length===1)throw{status:409};if(calls.length===2)throw Error('lost response');return saved(input.content,input.version+1);},()=>{},{content:base,latest:async()=>saved(base,4)});q.enqueue(base);await tick();q.retry();await tick();assert.equal(calls.length,3);assert.deepEqual(calls[2],calls[1]);
});
function setupHook(api){
 globalThis.window=new EventTarget();const runtime=hookRuntime();let replay=0;
 const {useIdeasBoard}=loadTypescript(new URL('useIdeasBoard.ts',root).pathname,id=>{if(id==='react')return{...runtime.hooks,useEffect:(callback,deps)=>runtime.hooks.useEffect(callback,deps?[...deps,replay]:undefined)};if(id==='./ideasBoardApi')return{ideasBoardApi:api};if(id==='./boardSaveQueue')return{BoardSaveQueue};if(id==='./ideasBoardModel')return model;throw Error(id);});runtime.render(()=>useIdeasBoard());
 return{runtime,get board(){return runtime.result;},replay:()=>{replay++;runtime.render();}};
}
test('effect replay preserves unsaved ideas, history and the original pending save queue',async()=>{
 const base=content();let reads=0,release;const h=setupHook({get:async()=>{reads++;return saved(base,3);},save:async input=>{await new Promise(resolve=>release=resolve);return saved(input.content,4);}});await h.runtime.flush();const next={...base,nodes:[{...base.nodes[0],text:'Unsaved idea'}]};h.board.commit(next);await h.runtime.flush();h.replay();await h.runtime.flush();assert.equal(reads,1);assert.equal(h.board.content.nodes[0].text,'Unsaved idea');assert.equal(h.board.history.past.length,1);release();await h.runtime.flush();assert.equal(h.board.state,'saved');h.runtime.unmount();
});
test('a superseded queue cannot show a ghost conflict after an explicit successful reload',async()=>{
 const base=content();let reject;const h=setupHook({get:async()=>saved(base,3),save:()=>new Promise((_resolve,fail)=>reject=fail)});await h.runtime.flush();h.board.commit({...base,nodes:[]});await h.runtime.flush();h.board.reload();await h.runtime.flush();reject({status:409});await h.runtime.flush();assert.equal(h.board.state,'saved');assert.deepEqual(h.board.content,base);h.runtime.unmount();
});
test('checking an already-saved draft clears a false conflict without discarding ideas or writing',async()=>{
 const base=content(),next={...base,nodes:[{...base.nodes[0],text:'Already stored'}]};let reads=0,writes=0;const h=setupHook({get:async()=>{reads++;if(reads===2)throw Error('temporary recovery failure');return saved(reads===1?base:next,reads===1?3:4);},save:async()=>{writes++;throw{status:409};}});await h.runtime.flush();h.board.commit(next);await h.runtime.flush();assert.equal(h.board.state,'conflict');await h.board.retry();await h.runtime.flush();assert.equal(h.board.state,'saved');assert.deepEqual(h.board.content,next);assert.equal(h.board.history.past.length,1);assert.equal(writes,1);h.runtime.unmount();
});
test('checking a real remote edit or different actor keeps the full local draft and does not write',async()=>{
 for(const actor of ['2:7','3:7']){const base=content(),next={...base,nodes:[{...base.nodes[0],text:'Mine'}]};let reads=0,writes=0;const h=setupHook({get:async()=>{reads++;if(reads===2)throw Error('offline');return saved(reads===1?base:actor==='2:7'?{...base,nodes:[{...base.nodes[0],text:'Theirs'}]}:next,reads===1?3:4,reads===1?'2:7':actor);},save:async()=>{writes++;throw{status:409};}});await h.runtime.flush();h.board.commit(next);await h.runtime.flush();await h.board.retry();await h.runtime.flush();assert.equal(h.board.state,'conflict');assert.deepEqual(h.board.content,next);assert.equal(writes,1);h.runtime.unmount();}
});
