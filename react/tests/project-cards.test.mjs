import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),app=new URL('../src/app/',import.meta.url),owner=new URL('ComplementaryModules/IdeasBoard/',app);
const load=createTypeScriptLoader({}, {crypto}),model=load(new URL('BasicModules/Sales/Funneling/ideasBoardModel.ts',app).pathname),thumbnail=load(new URL('projectThumbnailModel.ts',owner).pathname);
const plain=value=>JSON.parse(JSON.stringify(value));
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}

test('snapshot thumbnails fit all saved nodes including negative coordinates, independently of the saved camera',()=>{
 const nodes=[{...model.textNode(-600,-300),text:'Primero'},{...model.textNode(900,500),width:400,height:240,text:'Último'}],content={nodes,connections:[],viewport:{x:20000,y:-10000,zoom:2}},original=JSON.stringify(content);
 for(const [width,height] of [[280,120],[304,108]]){const view=thumbnail.projectThumbnailViewport(content,false,width,height);for(const n of nodes){assert.ok(n.x*view.zoom+view.x>=0);assert.ok(n.y*view.zoom+view.y>=0);assert.ok((n.x+n.width)*view.zoom+view.x<=width);assert.ok((n.y+n.height)*view.zoom+view.y<=height);}assert.ok(view.zoom>0);}
 assert.equal(JSON.stringify(content),original);
 assert.deepEqual(plain(thumbnail.projectThumbnailViewport({...content,viewport:{x:0,y:0,zoom:1}},false,280,120)),plain(thumbnail.projectThumbnailViewport(content,false,280,120)));
});
test('diagnostic thumbnails keep all four regions and outside notes; an empty snapshot has a finite fit',()=>{
 const content={...model.emptyBoard(),nodes:[{...model.textNode(-900,1800),text:'Nota exterior'}]},v=thumbnail.projectThumbnailViewport(content,true,300,120);
 for(const box of [...content.nodes,{x:0,y:0,width:2200,height:1600}]){assert.ok(box.x*v.zoom+v.x>=0);assert.ok(box.y*v.zoom+v.y>=0);assert.ok((box.x+box.width)*v.zoom+v.x<=300);assert.ok((box.y+box.height)*v.zoom+v.y<=120);}
 assert.ok(Object.values(thumbnail.projectThumbnailViewport(model.emptyBoard(),false,300,120)).every(Number.isFinite));
});
function snapshotHook(){
 const runtime=hookRuntime(),requests=[];let enabled=false,item={id:'same-project',ownerId:7,version:1};
 const module=loadTypescript(new URL('useProjectSnapshot.ts',owner).pathname,id=>{
  if(id==='react')return runtime.hooks;
  if(id==='./ideaWorkspaceApi')return{ideaWorkspaceApi:{get:(id,signal,ownerId)=>new Promise((resolve,reject)=>requests.push({id,signal,ownerId,resolve,reject}))}};
  throw Error(id);
 });
 const render=()=>runtime.render(()=>module.useProjectSnapshot(item,enabled));
 render();return{runtime,requests,render,enable:()=>{enabled=true;render();},setItem:next=>{item=next;render();}};
}
test('thumbnails read only when visible, use the exact source owner and cancel old reads on identity changes',async()=>{
 const e=snapshotHook();assert.equal(e.requests.length,0);e.enable();await e.runtime.flush();assert.equal(e.requests.length,1);assert.equal(e.requests[0].ownerId,7);assert.equal(e.runtime.result.status,'loading');
 e.setItem({id:'same-project',ownerId:8,version:1});await e.runtime.flush();assert.equal(e.requests[0].signal.aborted,true);assert.equal(e.requests[1].ownerId,8);assert.equal(e.runtime.result.project,undefined);
 e.requests[0].resolve({summary:{id:'same-project',ownerId:7}});await e.runtime.flush();assert.equal(e.runtime.result.project,undefined);
 e.requests[1].resolve({summary:{id:'same-project',ownerId:8}});await e.runtime.flush();assert.equal(e.runtime.result.project.summary.ownerId,8);assert.equal(e.runtime.result.status,'ready');
 e.runtime.unmount();assert.equal(e.requests[1].signal.aborted,true);
});
test('revoked or failed previews show an error instead of old content and retry the same authorized read',async()=>{
 const e=snapshotHook();e.enable();e.requests[0].resolve({summary:{id:'same-project',ownerId:7}});await e.runtime.flush();assert.equal(e.runtime.result.status,'ready');
 e.setItem({id:'same-project',ownerId:7,version:2});await e.runtime.flush();assert.equal(e.runtime.result.project,undefined);e.requests[1].reject({status:403});await e.runtime.flush();assert.equal(e.runtime.result.status,'error');assert.equal(e.runtime.result.project,undefined);
 e.runtime.result.retry();await e.runtime.flush();assert.equal(e.requests.length,3);assert.equal(e.requests[2].id,'same-project');assert.equal(e.requests[2].ownerId,7);
 e.runtime.unmount();e.requests[2].resolve({summary:{id:'late-response'}});await e.runtime.flush();assert.notEqual(e.runtime.result.project?.summary.id,'late-response');
});
test('trash cards do not request snapshot content',()=>{
 const e=snapshotHook();e.setItem({id:'trashed',ownerId:7,version:3,deletedAt:'2026-10-24'});e.enable();assert.equal(e.requests.length,0);
});
test('thumbnail scenes preserve saved text, media positions, private image URLs and double arrows without players or controls',()=>{
 const runtime=hookRuntime(),paths=[];
 const module=loadTypescript(new URL('ProjectThumbnail.tsx',owner).pathname,id=>{
  if(id==='react')return{...runtime.hooks,useId:()=> 'scene-id'};
  if(id==='react/jsx-runtime')return require(id);
  if(id==='lucide-react')return{FileAudio:'audio-icon',Film:'video-icon',Trash2:'trash-icon',RotateCcw:'retry-icon'};
  if(id.endsWith('/BoardDrawingElement'))return{BoardDrawingElement:'drawing'};
  if(id.endsWith('/boardGeometry'))return{BoardGeometryElement:'geometry'};
  if(id.endsWith('/ideasBoardModel'))return model;
  if(id.endsWith('/nodeAppearance'))return load(new URL('BasicModules/Sales/Funneling/nodeAppearance.ts',app).pathname);
  if(id.endsWith('/boardInteractionCopy'))return load(new URL('BasicModules/Sales/Funneling/boardInteractionCopy.ts',app).pathname);
  if(id==='./FiveSNodeContent')return{FiveSNodeContent:'five-s-node'};
  if(id==='./projectThumbnailModel')return thumbnail;
  if(id==='./freeformBoardLayout')return{catalogNode:n=>n};
  if(id==='./systemBoardModel')return{isLegacySystemNode:()=>false};
  if(id==='./SystemBoardBackdrop')return{SystemBoardBackdrop:'backdrop'};
  if(id==='./SystemNodeContent')return{SystemNodeContent:'typed-node'};
  if(id==='./projectManagementApi')return{};
  if(id==='./workspaceCopy'||id==='./projectCardCopy'||id==='./useProjectSnapshot')return{};
  throw Error(id);
 });
 const a={...model.textNode(10,30),text:'<Texto guardado>'},image={...model.textNode(400,100),kind:'IMAGE',assetId:'private-photo'},video={...model.textNode(800,50),kind:'VIDEO',assetId:'private-video',text:'Demo'},audio={...model.textNode(900,400),kind:'AUDIO',assetId:'private-audio',text:'Entrevista'},content={nodes:[a,image,video,audio],connections:[{id:'link',from:a.id,to:image.id,label:'Continuar',direction:'BOTH'}],viewport:{x:100,y:400,zoom:2}},before=JSON.stringify(content);
 runtime.render(()=>module.ProjectThumbnailScene({content,system:false,locale:'es-MX',width:300,height:120,assetUrl:id=>{paths.push(id);return'/authorized/project/owner42/'+id;}}));
 const all=elements(runtime.result);assert.equal(runtime.result.props.inert,true);assert.equal(runtime.result.props['aria-hidden'],'true');assert.equal(all.filter(v=>v.type==='video'||v.type==='audio'||v.type==='button').length,0);
 assert.equal(all.find(v=>v.type==='img').props.src,'/authorized/project/owner42/private-photo');assert.deepEqual(paths,['private-photo']);const line=all.find(v=>v.type==='line');assert.equal(line.props.markerStart,line.props.markerEnd);assert.ok(line.props.markerStart);assert.ok(all.some(v=>v.props?.children==='<Texto guardado>'));assert.equal(JSON.stringify(content),before);
});
test('card action labels and preview states are complete in every supported regional locale',()=>{
 const copy=load(new URL('projectCardCopy.ts',owner).pathname);
 for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=copy.projectCardCopy(locale);for(const text of Object.values(c))assert.ok(text.trim());assert.ok(c.preview.includes('{name}'));}
});
