import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {loadTypescript} from './helpers/hook-runtime.mjs';
const app=new URL('../src/app/',import.meta.url),load=(f,dep=()=>{throw Error('Unexpected import');})=>loadTypescript(new URL(f,app).pathname,dep);
const base=load('BasicModules/Sales/Funneling/ideasBoardModel.ts');const system=createTypeScriptLoader({}, {crypto})(new URL('ComplementaryModules/IdeasBoard/systemBoardModel.ts',app).pathname);
const model=load('ComplementaryModules/IdeasBoard/boardFileModel.ts',()=>system);const tools=load('BasicModules/Sales/Funneling/boardFileTools.ts',()=>base);const {boardFileCopy}=load('ComplementaryModules/IdeasBoard/boardFileCopy.ts');
test('file replacement requires an acknowledged unchanged board and the same actor',()=>{
 const content={...base.emptyBoard(),nodes:[{...base.textNode(0,0),text:'Keep me'}]},expected={content,actor:'private:1:1'};
 assert.equal(tools.canReplaceBoard({...expected,ready:true},expected),true);
 assert.equal(tools.canReplaceBoard({...expected,ready:false},expected),false);
 assert.equal(tools.canReplaceBoard({...expected,ready:true,actor:'private:2:1'},expected),false);
 assert.equal(tools.canReplaceBoard({...expected,ready:true,content:{...content,nodes:[{...content.nodes[0],text:'Edited'}]}},expected),false);
 const a={...content,nodes:[{...content.nodes[0],category:'PERSON',icon:'PERSON'}]},b={...a,nodes:[{...a.nodes[0],icon:'LEADER'}]};
 assert.equal(tools.canReplaceBoard({ready:true,actor:'a',content:a},{actor:'a',content:b},system.sameSystemIdeas),false);
});
test('open makes an independent editable copy, preserving styles, photos and system metadata',()=>{
 const node={...base.textNode(150,150),kind:'IMAGE',text:'Ana',assetId:'private-photo',appearance:{fontFamily:'SERIF'},category:'PERSON',icon:'PERSON'},content={...base.emptyBoard(),nodes:[node]},project={summary:{kind:'SYSTEM'},system:system.toSystemDocument(content),freeform:null};
 const copy=model.editableProject(project,'SYSTEM');assert.deepEqual(copy,content);copy.nodes[0].text='Changed';assert.equal(project.system.elements[0].node.text,'Ana');
 assert.throws(()=>model.editableProject(project,'FREEFORM'));
 const free={summary:{kind:'FREEFORM'},freeform:content,system:null},freeCopy=model.editableProject(free,'FREEFORM');freeCopy.nodes.pop();assert.equal(free.freeform.nodes.length,1);
 assert.equal(model.hasBoardWork(base.emptyBoard()),false);assert.equal(model.hasBoardWork(content),true);
});
test('picker reads all bounded pages and filters by matching board type without missing later files',async()=>{
 const data=Array.from({length:200},(_,i)=>({id:String(i),kind:i%2?'SYSTEM':'FREEFORM'})),calls=[];
 const list=async(page,signal)=>{assert.equal(signal.aborted,false);calls.push(page);return {items:data.slice((page-1)*50,page*50),total:data.length,pageSize:50,page};};
 const result=await model.listBoardFiles(list,'SYSTEM',new AbortController().signal);assert.equal(result.length,100);assert.equal(result.at(-1).id,'199');assert.deepEqual(calls.sort(),[1,2,3,4]);
 const abort=new AbortController();abort.abort();await assert.rejects(()=>model.listBoardFiles(list,'FREEFORM',abort.signal));
 await assert.rejects(()=>model.listBoardFiles(async()=>({total:201,pageSize:50,items:[]}), 'FREEFORM',new AbortController().signal));
});
test('all eight locales expose the same explicit file and fullscreen actions',()=>{const keys=Object.keys(boardFileCopy('es-MX'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=boardFileCopy(locale);assert.deepEqual(Object.keys(c),keys);for(const text of Object.values(c))assert.ok(text.length>0);}});
