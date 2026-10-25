import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),base=new URL('../src/app/ComplementaryModules/IdeasBoard/',import.meta.url),file=name=>new URL(name,base).pathname;
const load=createTypeScriptLoader(),copy=load(file('fiveSCopy.ts')),evidenceCopy=load(file('fiveSEvidenceCopy.ts'));
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function setup(runtime){return loadTypescript(file('FiveSEvidence.tsx'),id=>{
 if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);
 if(id==='lucide-react')return Object.fromEntries(['ArrowLeft','Camera','Check','Columns2','ImagePlus','LoaderCircle','Maximize2','RotateCcw','Trash2'].map(key=>[key,key]));
 if(id==='./fiveSCopy')return copy;if(id==='./fiveSEvidenceCopy')return evidenceCopy;if(id.endsWith('.css'))return{};throw Error(id);
});}
function harness(patch={}){
 const runtime=hookRuntime(),calls=[],{FiveSEvidence}=setup(runtime);
 const props={actionId:'a',evidence:{templateId:'board',section:'SORT',role:'ACTION',area:'Oficina'},locale:'es-MX',readonly:false,busy:false,uploadingKey:null,assetUrl:id=>'/private/'+id,
  onUpload:(file,key)=>calls.push({type:'upload',file,key}),onRemove:key=>calls.push({type:'remove',key}),onInvalid:(key,message)=>calls.push({type:'invalid',key,message}),onRetry:()=>calls.push({type:'retry'}),...patch};
 const render=()=>runtime.render(()=>FiveSEvidence(props));render();
 const all=()=>elements(runtime.result),click=text=>{all().find(n=>n.type==='button'&&[n.props.children].flat(Infinity).includes(text)).props.onClick();render();};
 return{runtime,props,calls,render,all,click,photos:()=>all().filter(n=>n.type?.name==='FiveSEvidencePhoto')};
}
test('two clearly labeled upload slots clear native file inputs for selecting the same file again',()=>{
 const h=harness(),inputs=h.all().filter(n=>n.type==='input');assert.equal(inputs.length,2);
 assert.equal(inputs[0].props['aria-label'],'Agregar foto: Antes');assert.equal(inputs[1].props['aria-label'],'Agregar foto: Después');
 const file={type:'image/png',size:10,name:'proof.png'},target={files:[file],value:'proof.png'};
 inputs[1].props.onChange({target});assert.equal(target.value,'');assert.equal(h.calls[0].key,'afterAssetId');assert.equal(h.calls[0].file,file);
 assert.equal(h.all().filter(n=>n.type==='button'&&[n.props.children].flat().includes('Comparar fotos')).length,0);h.runtime.unmount();
});
test('drop accepts exactly one photo into the chosen slot and readonly/busy drops cannot upload',()=>{
 const h=harness(),sections=()=>h.all().filter(n=>n.type==='section');let prevented=0;
 const event=files=>({preventDefault(){prevented++;},dataTransfer:{files,dropEffect:''}}),photo={name:'after.webp'};
 sections()[1].props.onDrop(event([photo]));assert.equal(h.calls[0].type,'upload');assert.equal(h.calls[0].key,'afterAssetId');
 sections()[0].props.onDrop(event([photo,photo]));assert.equal(h.calls[1].type,'invalid');assert.equal(h.calls[1].key,'beforeAssetId');
 h.props.busy=true;h.render();sections()[0].props.onDrop(event([photo]));assert.equal(h.calls.length,2);
 h.props.busy=false;h.props.readonly=true;h.render();sections()[0].props.onDrop(event([photo]));assert.equal(h.calls.length,2);assert.equal(prevented,4);
 assert.equal(h.all().filter(n=>n.type==='input').length,0);h.runtime.unmount();
});
test('existing photos can be replaced or removed individually, with a slot-specific error and retry',()=>{
 const h=harness({evidence:{templateId:'b',section:'SORT',beforeAssetId:'before',afterAssetId:'after'},error:{key:'afterAssetId',message:'No se pudo subir'},retryKey:'afterAssetId'});
 assert.deepEqual(h.photos().map(n=>n.props.id),['before','after']);assert.equal(h.all().filter(n=>n.props?.role==='alert').length,1);
 assert.deepEqual(h.all().filter(n=>n.type==='input').map(n=>n.props['aria-label']),['Cambiar foto: Antes','Cambiar foto: Después']);
 h.all().find(n=>n.type==='button'&&n.props['aria-label']==='Quitar foto: Antes').props.onClick();assert.equal(h.calls[0].key,'beforeAssetId');
 h.click('Reintentar');assert.equal(h.calls[1].type,'retry');h.runtime.unmount();
});
test('comparison stays in the current form and switches between paired and enlarged views without mutations',()=>{
 const h=harness({evidence:{templateId:'b',section:'SORT',beforeAssetId:'before',afterAssetId:'after'}});
 h.click('Comparar fotos');assert.equal(h.photos().length,2);assert.equal(h.all().filter(n=>n.type==='input').length,0);
 assert.equal(h.all().find(n=>n.type==='button'&&n.props['aria-pressed']).props.children,'Juntas');
 h.click('Después');assert.equal(h.photos().length,1);assert.equal(h.photos()[0].props.id,'after');assert.equal(h.calls.length,0);
 h.click('Antes');assert.equal(h.photos()[0].props.id,'before');h.click('Juntas');assert.equal(h.photos().length,2);
 h.click('Volver a las fotos');assert.equal(h.all().filter(n=>n.type==='input').length,2);assert.equal(h.calls.length,0);h.runtime.unmount();
});
test('one-photo enlargement and readonly comparison never expose upload or removal controls',()=>{
 const h=harness({readonly:true,evidence:{templateId:'b',section:'SORT',beforeAssetId:'before'}});
 assert.equal(h.all().filter(n=>n.type==='input').length,0);
 h.all().find(n=>n.props?.['aria-label']==='Ampliar foto: Antes').props.onClick();h.render();assert.equal(h.photos().length,1);
 assert.equal(h.all().filter(n=>n.type==='button'&&n.props['aria-pressed']!==undefined).length,1);assert.equal(h.calls.length,0);h.runtime.unmount();
});
test('uploading disables both slots, but announces activity only for the active slot',()=>{
 const h=harness({busy:true,uploadingKey:'beforeAssetId'});assert.ok(h.all().filter(n=>n.type==='input').every(n=>n.props.disabled));
 assert.equal(h.all().filter(n=>n.props?.role==='status').length,1);assert.equal(h.all().find(n=>n.props?.role==='status').props.children,'Subiendo foto…');h.runtime.unmount();
});
test('failed private image display offers a bounded manual reload without changing its authorized URL',()=>{
 const runtime=hookRuntime(),{FiveSEvidencePhoto}=setup(runtime),props={id:'private-id',assetUrl:id=>'/protected/'+id,label:'Antes',locale:'es-MX'};
 const render=()=>runtime.render(()=>FiveSEvidencePhoto(props));render();let img=elements(runtime.result).find(n=>n.type==='img');assert.equal(img.props.src,'/protected/private-id');
 img.props.onError();render();assert.equal(elements(runtime.result).filter(n=>n.type==='img').length,0);assert.ok(elements(runtime.result).find(n=>n.props?.role==='status'));
 elements(runtime.result).find(n=>n.type==='button').props.onClick();render();img=elements(runtime.result).find(n=>n.type==='img');assert.equal(img.props.src,'/protected/private-id');assert.ok(img.key.endsWith(':1'));runtime.unmount();
});
test('evidence presentation copy supports all six languages and regional fallback',()=>{
 for(const locale of ['es-MX','en-US','fr-CA','pt-BR','ko-KR','zh-CN'])assert.ok(Object.values(evidenceCopy.fiveSEvidenceCopy(locale)).every(s=>typeof s==='string'&&s.trim()));
 assert.deepEqual(evidenceCopy.fiveSEvidenceCopy('xx'),evidenceCopy.fiveSEvidenceCopy('en'));
});
