import test from 'node:test';import assert from 'node:assert/strict';import {loadTypescript} from './helpers/hook-runtime.mjs';
const base=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const m=loadTypescript(new URL('ideasBoardModel.ts',base).pathname,()=>{throw Error('unexpected import');});
const a=loadTypescript(new URL('nodeAppearance.ts',base).pathname,()=>{throw Error('unexpected import');});
const {nodeAppearanceCopy}=loadTypescript(new URL('nodeAppearanceCopy.ts',base).pathname,()=>{throw Error('unexpected import');});
test('eight handles resize independent axes, preserve opposite edges and stay inside limits',()=>{
 const node={...m.textNode(100,100),width:240,height:160};
 const east=a.resizeNode(node,'e',100,100);assert.equal(east.width,340);assert.equal(east.height,160);assert.equal(east.x,100);
 const west=a.resizeNode(node,'w',50,0);assert.equal(west.x,150);assert.equal(west.x+west.width,node.x+node.width);
 const north=a.resizeNode(node,'n',0,60);assert.equal(north.y,160);assert.equal(north.y+north.height,node.y+node.height);
 assert.equal(a.resizeNode(node,'se',-10000,-10000).width,40);assert.equal(a.resizeNode(node,'se',-10000,-10000).height,40);
 for(const edge of ['n','ne','e','se','s','sw','w','nw']){const n=a.resizeNode(node,edge,10000,10000,{left:16,top:100,right:1084,bottom:784});assert.ok(n.x>=16&&n.y>=100&&n.x+n.width<=1084&&n.y+n.height<=784);}
});
test('seven allowlisted font stacks and explicit colors produce safe presentation-only styles',()=>{
 assert.equal(Object.keys(a.fontFamilies).length,7);const node={...m.textNode(0,0),appearance:{...a.defaultAppearance(m.textNode(0,0)),fontFamily:'SERIF',fontSize:36,bold:true,underline:true,fillColor:'#abcdef',borderColor:'#123456',imageFit:'STRETCH'}};
 assert.match(a.nodeTextStyle(node).fontFamily,/Georgia/);assert.equal(a.nodeTextStyle(node).fontWeight,700);assert.equal(a.nodeTextStyle(node).textDecoration,'underline');assert.equal(a.nodeBoxStyle(node).backgroundColor,'#abcdef');assert.equal(a.nodeImageStyle(node).objectFit,'fill');
 assert.equal(a.defaultAppearance({...node,shape:'PLAIN'}).transparentFill,true);
});
test('format-only changes are content changes for conflict protection and survive history',()=>{
 const node=m.textNode(0,0),one={...m.emptyBoard(),nodes:[node]},two={...one,nodes:[{...node,appearance:a.defaultAppearance(node)}]};assert.equal(m.sameBoardIdeas(one,two),false);
 const h=m.record({past:[],current:one,future:[]},two);assert.deepEqual(m.stepHistory(h,'undo').current,one);assert.deepEqual(m.stepHistory(m.stepHistory(h,'undo'),'redo').current,two);
});
test('all eight locales offer seven font names and complete formatting controls',()=>{for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=nodeAppearanceCopy(locale);assert.equal(c.fonts.length,7);for(const value of Object.values(c))if(typeof value==='string')assert.ok(value.length);}});
