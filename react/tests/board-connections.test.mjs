import test from 'node:test';import assert from 'node:assert/strict';import {loadTypescript} from './helpers/hook-runtime.mjs';import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
const base=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url),m=loadTypescript(new URL('ideasBoardModel.ts',base).pathname,()=>{throw Error('Unexpected import');}),copy=loadTypescript(new URL('boardConnectionCopy.ts',base).pathname,()=>{});
const graph=()=>({...m.emptyBoard(),nodes:[0,1,2,3].map(i=>({...m.textNode(i*320,150),text:'Elemento '+i}))});
test('continuous flow connects A → B → C and keeps the last node as the origin',()=>{
 const initial=graph(),[a,b,c]=initial.nodes;let step=m.continueConnection(initial,null,a.id);
 assert.equal(step.source,a.id);assert.equal(step.content,initial);
 step=m.continueConnection(step.content,step.source,b.id);assert.equal(step.source,b.id);assert.equal(step.content.connections.length,1);
 step=m.continueConnection(step.content,step.source,c.id);assert.equal(step.source,c.id);assert.deepEqual(step.content.connections.map(c=>[c.from,c.to]),[[a.id,b.id],[b.id,c.id]]);assert.ok(step.content.connections.every(c=>!Object.hasOwn(c,'direction')));
 const same=m.continueConnection(step.content,step.source,c.id);assert.equal(same.content,step.content);assert.equal(same.source,c.id);
 const stale=m.continueConnection(step.content,'removed',a.id);assert.equal(stale.content,step.content);assert.equal(stale.source,a.id);
});
test('double arrows persist through chaining and opposite clicks never add duplicate double links',()=>{
 const initial=graph(),[a,b,c]=initial.nodes;let step=m.continueConnection(initial,a.id,b.id,'BOTH');step=m.continueConnection(step.content,step.source,c.id,'BOTH');
 assert.equal(step.content.connections.length,2);assert.ok(step.content.connections.every(c=>c.direction==='BOTH'));
 const reverse=m.continueConnection(step.content,c.id,b.id,'BOTH');assert.equal(reverse.content,step.content);assert.equal(reverse.source,b.id);
 assert.equal(m.connect(step.content,b.id,a.id),step.content);
});
test('choosing double on an existing path upgrades it without losing its label or identity',()=>{
 const initial=graph(),[a,b]=initial.nodes,one=m.connect(initial,a.id,b.id);one.connections[0].label='Entrega';
 const both=m.connect(one,b.id,a.id,'BOTH');assert.equal(both.connections.length,1);assert.equal(both.connections[0].id,one.connections[0].id);assert.equal(both.connections[0].label,'Entrega');assert.equal(both.connections[0].direction,'BOTH');assert.equal(one.connections[0].direction,undefined);
 const forward=m.withConnectionDirection(both.connections[0],'FORWARD');assert.ok(!Object.hasOwn(forward,'direction'));assert.equal(forward.label,'Entrega');assert.equal(m.sameBoardIdeas(one,both),false);assert.equal(m.sameBoardIdeas(one,{...one,connections:[{...one.connections[0],direction:'FORWARD'}]}),true);
});
test('at the 200-link limit existing paths continue while a new path keeps the origin and explains the limit',()=>{
 const initial={...graph(),nodes:Array.from({length:24},(_,i)=>({...m.textNode(i*20,50),text:'Nodo '+i}))},[a,b,c]=initial.nodes,connections=[];
 for(const from of initial.nodes)for(const to of initial.nodes){if(from.id!==to.id&&!(from.id===b.id&&to.id===c.id)&&connections.length<200)connections.push({id:crypto.randomUUID(),from:from.id,to:to.id,label:''});}
 const full={...initial,connections};
 const blocked=m.continueConnection(full,b.id,c.id);assert.equal(blocked.content,full);assert.equal(blocked.source,b.id);assert.equal(blocked.limited,true);
 const existing=m.continueConnection(full,a.id,b.id);assert.equal(existing.content,full);assert.equal(existing.source,b.id);assert.equal(existing.limited,false);
 const upgrade=m.connect(full,b.id,a.id,'BOTH');assert.equal(upgrade.connections.length,200);assert.equal(upgrade.connections.find(link=>link.from===b.id&&link.to===a.id).direction,'BOTH');
});
test('undo, redo and camera-only conflict recovery preserve direction changes',()=>{
 const initial=graph(),[a,b]=initial.nodes,forward=m.connect(initial,a.id,b.id),both=m.connect(forward,a.id,b.id,'BOTH');let h=m.record({past:[],current:forward,future:[]},both);h=m.stepHistory(h,'undo');assert.equal(h.current.connections[0].direction,undefined);h=m.stepHistory(h,'redo');assert.equal(h.current.connections[0].direction,'BOTH');assert.equal(m.sameBoardIdeas(both,{...both,viewport:{x:20,y:30,zoom:.5}}),true);
});
test('double arrows print at both ends and all supported locales explain continuous mode',()=>{
 const load=createTypeScriptLoader({}, {crypto}),print=load(new URL('boardPrintDocument.ts',base).pathname),initial=graph(),[a,b]=initial.nodes;
 const forward=print.boardPrintDocument(m.connect(initial,a.id,b.id),'Pizarra',()=>''),both=print.boardPrintDocument(m.connect(initial,a.id,b.id,'BOTH'),'Pizarra',()=>'');assert.doesNotMatch(forward,/marker-start=/);assert.match(both,/marker-start="url\(#board-print-arrow\)"/);assert.match(both,/orient="auto-start-reverse"/);
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA'])for(const value of Object.values(copy.boardConnectionCopy(locale)))assert.ok(value.length);
});
