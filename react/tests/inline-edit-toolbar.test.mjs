import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),base=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const model=loadTypescript(new URL('ideasBoardModel.ts',base).pathname,()=>{throw Error('Unexpected dependency');});
const appearance=loadTypescript(new URL('nodeAppearance.ts',base).pathname,()=>{throw Error('Unexpected dependency');});
const copy=loadTypescript(new URL('nodeAppearanceCopy.ts',base).pathname,()=>{throw Error('Unexpected dependency');});
const {NodeAppearanceControls}=loadTypescript(new URL('NodeAppearanceControls.tsx',base).pathname,name=>{
 if(name==='react/jsx-runtime')return require(name);
 if(name==='react')return {};
 if(name==='lucide-react')return {Bold:()=>null,Italic:()=>null,Underline:()=>null,RotateCcw:()=>null};
 if(name==='./nodeAppearance')return appearance;
 if(name==='./nodeAppearanceCopy')return copy;
 if(name==='./boardCreativeCopy')return loadTypescript(new URL('boardCreativeCopy.ts',base).pathname,()=>{throw Error('unexpected dependency');});
 if(name==='./boardDrawing')return loadTypescript(new URL('boardDrawing.ts',base).pathname,()=>{throw Error('unexpected dependency');});
 if(name.endsWith('.css'))return {};
 throw Error(name);
});
function elements(root){return [root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
const labels=copy.nodeAppearanceCopy('es-MX');
function editor(node,options={}){let next;const root=NodeAppearanceControls({node,locale:'es-MX',compact:true,onChange:value=>{next=value;},...options});return {root,all:elements(root),next:()=>next};}
test('direct appearance actions retain the selected node identity, dimensions and system metadata',()=>{
 const node={...model.textNode(120,140),category:'PERSON',icon:'LEADER',appearance:{...appearance.defaultAppearance(model.textNode(120,140)),italic:true}};
 for(const [field,value] of [['textColor','#123456'],['fillColor','#abcdef'],['borderColor','#2563eb']]){
  const e=editor(node);e.all.find(v=>v.type==='input'&&v.props['aria-label']===labels[field]).props.onChange({target:{value}});const result=e.next();
  assert.equal(result.appearance[field],value);assert.equal(result.appearance.italic,true);assert.equal(result.id,node.id);assert.equal(result.category,'PERSON');assert.equal(result.icon,'LEADER');assert.equal(result.width,node.width);assert.equal(result.x,node.x);
 }
});
test('font and text toggles update only their style property and expose exactly seven font choices',()=>{
 const node=model.textNode(0,0),e=editor(node),font=e.all.find(v=>v.type==='select'&&v.props['aria-label']===labels.fontFamily);
 assert.equal(elements(font).filter(v=>v.type==='option').length,7);font.props.onChange({target:{value:'SERIF'}});assert.equal(e.next().appearance.fontFamily,'SERIF');
 for(const key of ['bold','italic','underline']){const action=editor({...node,appearance:{...appearance.defaultAppearance(node),fontSize:30}});action.all.find(v=>v.type==='button'&&v.props['aria-label']===labels[key]).props.onClick();assert.equal(action.next().appearance[key],true);assert.equal(action.next().appearance.fontSize,30);}
});
test('direct numeric controls keep system nodes inside their area, including images',()=>{
 const node={...model.textNode(900,650),kind:'IMAGE',assetId:'photo',width:180,height:120},e=editor(node,{system:true,bounds:{left:16,top:100,right:1084,bottom:784}});
 e.all.find(v=>v.props?.label===labels.width).props.onChange(1000);assert.equal(e.next().width,184);assert.equal(e.next().height,120);assert.equal(e.next().assetId,'photo');
 const fit=e.all.find(v=>v.type==='select'&&v.props['aria-label']===labels.imageFit);fit.props.onChange({target:{value:'STRETCH'}});assert.equal(e.next().appearance.imageFit,'STRETCH');assert.equal(e.next().assetId,'photo');
});
test('compact and modal variants share semantics; reset preserves content and geometry',()=>{
 const node={...model.textNode(50,60),text:'Idea',appearance:{...appearance.defaultAppearance(model.textNode(50,60)),bold:true}},e=editor(node);
 assert.equal(e.root.props['data-inline-node-editor'],true);assert.equal(e.root.props['aria-label'],labels.quickEdit);assert.equal(e.all.some(v=>v.props?.className==='node-format-preview'),false);
 e.all.find(v=>v.type==='button'&&v.props['aria-label']===labels.reset).props.onClick();assert.equal(e.next().appearance,undefined);assert.equal(e.next().text,'Idea');assert.equal(e.next().x,50);assert.equal(e.next().width,node.width);
 const modal=editor(node,{compact:false});assert.equal(modal.root.props['data-inline-node-editor'],undefined);assert.equal(modal.all.some(v=>v.props?.className==='node-format-preview'),true);
});

test('selected strokes offer color, thickness and independent dimensions without text controls',()=>{const drawing=loadTypescript(new URL('boardDrawing.ts',base).pathname,()=>{throw Error('unexpected dependency');});const node=drawing.drawingNode('stroke',[{x:10,y:10},{x:90,y:100}]);const e=editor(node);assert.equal(e.all.some(v=>v.props?.['aria-label']===labels.fontFamily),false);e.all.find(v=>v.type==='input'&&v.props['aria-label']==='Color del plumón').props.onChange({target:{value:'#ff0000'}});assert.equal(e.next().drawing.color,'#ff0000');assert.deepEqual(e.next().drawing.points,node.drawing.points);assert.equal(e.next().appearance,undefined);});
