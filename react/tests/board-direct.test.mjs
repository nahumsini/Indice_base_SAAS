import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),base=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url),loader=createTypeScriptLoader({}, {crypto,structuredClone});
const load=name=>loader(new URL(name,base).pathname),model=load('ideasBoardModel.ts'),geometry=load('boardGeometry.tsx'),media=load('boardMedia.tsx'),copy=load('boardInteractionCopy.ts');
const nodes=root=>[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(nodes)];
test('seven geometries use both drag directions, world zoom coordinates, clamps and minimum dimensions',()=>{
 assert.equal(geometry.geometricShapes.length,7);
 for(const shape of geometry.geometricShapes){const a=geometry.shapeFromDrag(shape,{x:500,y:400},{x:200,y:150});assert.equal(a.x,200);assert.equal(a.y,150);assert.equal(a.width,300);assert.equal(a.height,250);assert.equal(a.shape,shape);assert.equal(a.text,'');}
 const world=model.boardPoint(400,200,{x:100,y:50,zoom:.5});assert.deepEqual({...world},{x:600,y:300});const a=geometry.shapeFromDrag('TRIANGLE',{x:2180,y:1580},{x:4000,y:2000},{left:16,top:100,right:2184,bottom:1584});assert.equal(a.width,40);assert.equal(a.height,40);assert.ok(a.x+a.width<=2184&&a.y+a.height<=1584);
});
test('media is classified by type and extension with per-kind limits and Sales remaining image-only',()=>{
 for(const[name,type,kind,limit]of[['image.png','image/png','IMAGE',5],['video.mp4','video/mp4','VIDEO',25],['film.webm','video/webm','VIDEO',25],['audio.mp3','audio/mpeg','AUDIO',10],['audio.m4a','audio/mp4','AUDIO',10],['audio.wav','audio/x-wav','AUDIO',10],['audio.ogg','audio/ogg','AUDIO',10]]){assert.equal(media.boardFileFormat({name,type,size:100}).kind,kind);assert.equal(media.boardFileFormat({name,type,size:limit*1024*1024+1}),null);if(kind!=='IMAGE')assert.equal(media.boardFileFormat({name,type,size:100},false),null);}
 for(const name of ['bad.svg','video.html','../audio.mp3','video.mov'])assert.equal(media.boardFileFormat({name,type:'video/mp4',size:100}),null);
 assert.equal(media.boardFileFormat({name:'audio.wav',type:'video/mp4',size:100}),null);
});
function inline(node={...model.textNode(10,20,'PLAIN'),text:''}){const runtime=hookRuntime(),calls=[];const {BoardInlineText}=loadTypescript(new URL('BoardInlineText.tsx',base).pathname,id=>id==='react'?runtime.hooks:id==='react/jsx-runtime'?require(id):id==='lucide-react'?{Check:()=>null,X:()=>null}:id==='./nodeAppearance'?load('nodeAppearance.ts'):id==='./boardInteractionCopy'?copy:require(id));runtime.render(()=>BoardInlineText({node,locale:'es-MX',onFinish:n=>calls.push(n)}));return{runtime,calls,all:()=>nodes(runtime.result)};}
test('inline text commits once on blur; Escape cancels without writing; no modal is rendered',async()=>{
 const edit=inline();edit.all().find(n=>n.type==='textarea').props.onChange({target:{value:'Una idea\ncon dos líneas'}});await edit.runtime.flush();edit.all().find(n=>n.type==='textarea').props.onBlur();edit.all().find(n=>n.type==='textarea').props.onBlur();assert.equal(edit.calls.length,1);assert.equal(edit.calls[0].text,'Una idea\ncon dos líneas');assert.equal(edit.calls[0].shape,'PLAIN');assert.equal(edit.all().some(n=>n.props?.role==='dialog'),false);
 const cancel=inline();cancel.all().find(n=>n.type==='textarea').props.onKeyDown({key:'Escape',preventDefault(){}});cancel.all().find(n=>n.type==='textarea').props.onBlur();assert.deepEqual(cancel.calls,[null]);
});

test('free text fits measured letters and line height, shrinking old boxes while preserving identity and style',async()=>{
 const original={...model.textNode(30,40,'PLAIN'),text:'Antes',width:800,height:500,appearance:{...load('nodeAppearance.ts').defaultAppearance(model.textNode(0,0,'PLAIN')),fontSize:32,bold:true},category:'OUTSIDE',icon:'IDEA'},edit=inline(original);
 edit.all().find(n=>n.props.className==='board-inline-text-measure').props.ref.current={offsetWidth:315,scrollHeight:96};
 edit.all().find(n=>n.type==='textarea').props.onChange({target:{value:'Texto grande\nSegunda línea'}});await edit.runtime.flush();
 assert.equal(edit.all().find(n=>n.type==='textarea').props.style.height,96);assert.equal(edit.runtime.result.props.style.width,319);
 edit.all().find(n=>n.type==='textarea').props.onBlur();const result=edit.calls[0];assert.equal(result.width,319);assert.equal(result.height,96);assert.equal(result.x,30);assert.equal(result.y,40);assert.equal(result.id,original.id);assert.deepEqual(result.appearance,original.appearance);assert.equal(result.category,'OUTSIDE');
 const short=inline();short.all().find(n=>n.props.className==='board-inline-text-measure').props.ref.current={offsetWidth:10,scrollHeight:27};short.all().find(n=>n.type==='textarea').props.onChange({target:{value:'A'}});await short.runtime.flush();short.all().find(n=>n.type==='textarea').props.onBlur();assert.equal(short.calls[0].width,40);assert.equal(short.calls[0].height,40);
 const huge=inline();huge.all().find(n=>n.props.className==='board-inline-text-measure').props.ref.current={offsetWidth:4000,scrollHeight:2000};huge.all().find(n=>n.type==='textarea').props.onBlur();assert.equal(huge.calls[0].width,1000);assert.equal(huge.calls[0].height,800);
});
test('inline action focus and composition do not save early; explicit finish commits only once',()=>{
 const edit=inline();const textarea=edit.all().find(n=>n.type==='textarea');
 textarea.props.onKeyDown({key:'Enter',metaKey:true,nativeEvent:{isComposing:true},preventDefault(){}});assert.equal(edit.calls.length,0);
 const button={};textarea.props.onBlur({relatedTarget:button,currentTarget:{closest:()=>({contains:target=>target===button})}});assert.equal(edit.calls.length,0);
 edit.all().find(n=>n.type==='button').props.onClick();textarea.props.onBlur();assert.equal(edit.calls.length,1);
});
test('snapshots retain geometry and media while PDF uses safe static media cards and product division',()=>{
 const shape=geometry.shapeFromDrag('HEXAGON',{x:20,y:200},{x:300,y:400});const video={...model.textNode(1200,940),kind:'VIDEO',text:'<video.mp4>',assetId:'private',shape:'RECTANGLE'};
 const content={...model.emptyBoard(),nodes:[shape,video]};const print=load('boardPrintDocument.ts');const html=print.boardPrintDocument(content,'Creative',()=>'/private-media',{worldBounds:{x:0,y:0,width:2200,height:1600},regions:[{id:'p',label:'Productos',fill:'#fff',x:1100,y:800,width:1100,height:800}],printSections:[{x:1100,y:800,width:1100,height:400,label:'Canales de venta'},{x:1100,y:1200,width:1100,height:400,label:'Productos o servicios'}]});assert.match(html,/<polygon/);assert.match(html,/Canales de venta/);assert.match(html,/Productos o servicios/);assert.match(html,/&lt;video.mp4&gt;/);assert.doesNotMatch(html,/<video|<audio|<script/);
 const b=structuredClone(content);b.nodes[1].kind='AUDIO';assert.equal(model.sameBoardIdeas(content,b),false);assert.equal(model.stepHistory(model.record({current:content,past:[],future:[]},b),'undo').current,content);
});
test('creative interaction copy covers the eight supported regional locales',()=>{for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA'])for(const value of Object.values(copy.boardInteractionCopy(locale)))assert.ok(value);assert.notEqual(copy.boardInteractionCopy('ko-CA').textHint,copy.boardInteractionCopy('es-MX').textHint);});
