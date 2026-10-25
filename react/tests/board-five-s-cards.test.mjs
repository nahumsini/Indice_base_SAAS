import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),base=new URL('../src/app/',import.meta.url),file=p=>new URL(p,base).pathname;
const load=createTypeScriptLoader({}, {crypto,Date}),model=load(file('ComplementaryModules/IdeasBoard/fiveSModel.ts')),canvas=load(file('BasicModules/Sales/Funneling/ideasBoardModel.ts')),copy=load(file('ComplementaryModules/IdeasBoard/fiveSCopy.ts'));
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function node(){const b=model.addFiveSTemplate(canvas.emptyBoard(),'Oficina','es-MX'),n=model.newFiveSAction(b,b.nodes[0].fiveS,'SORT');return{...n,text:'Etiquetar carpetas',fiveS:{...n.fiveS,action:'Etiquetar carpetas',owner:'Andrea',dueDate:'1900-01-01'}};}
const {FiveSActionCard}=loadTypescript(file('ComplementaryModules/IdeasBoard/FiveSActionCard.tsx'),id=>{
 if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return Object.fromEntries(['CalendarDays','Check','CheckCircle2','Clock3','Pencil','Play','RotateCcw','UserRound'].map(k=>[k,k]));
 if(id==='./fiveSCopy')return copy;if(id==='./fiveSModel')return model;throw Error(id);
});
test('cards label owner, target date and status, omit duplicate descriptions and mark only active overdue work',()=>{
 const n=node(),render=()=>FiveSActionCard({node:n,locale:'es-MX',disabled:false,onEdit:()=>{},onProgress:()=>{}});
 let tree=elements(render());assert.ok(tree.some(e=>e.type==='dt'&&[e.props.children].flat().includes('Responsable')));assert.ok(tree.some(e=>e.type==='dt'&&[e.props.children].flat().includes('Fecha objetivo')));
 assert.equal(tree.filter(e=>e.props?.className==='five-s-card-description').length,0);assert.ok(tree.some(e=>e.props?.className==='five-s-date-alert'));assert.ok(tree.some(e=>e.type==='time'&&e.props.dateTime==='1900-01-01'));
 n.fiveS.status='VERIFIED';n.fiveS.result='Comprobado';tree=elements(render());assert.equal(tree.filter(e=>e.props?.className==='five-s-date-alert').length,0);
 n.fiveS.owner='';n.fiveS.dueDate=null;tree=elements(render());assert.ok(tree.some(e=>e.type==='dd'&&e.props.children==='Sin responsable'));assert.ok(tree.some(e=>e.type==='dd'&&[e.props.children].flat().includes('Sin fecha')));
 n.fiveS.status='PENDING';n.fiveS.dueDate=model.localDateKey();assert.ok(elements(render()).some(e=>e.props?.className==='five-s-date-today'));
});
test('the next-action buttons are localized, labeled for each card and retain editing access',()=>{
 const n=node();let edits=0,progress=0;
 for(const [status,label] of [['PENDING','Comenzar'],['IN_PROGRESS','Verificar'],['VERIFIED','Reabrir']]){
  n.fiveS.status=status;const tree=elements(FiveSActionCard({node:n,locale:'es-MX',disabled:false,onEdit:()=>edits++,onProgress:()=>progress++}));
  tree.find(e=>e.type==='button'&&e.props['aria-label']===`${label}: Etiquetar carpetas`).props.onClick();tree.find(e=>e.type==='button'&&e.props['aria-label']==='Editar acción: Etiquetar carpetas').props.onClick();
 }
 assert.equal(edits,3);assert.equal(progress,3);const disabled=elements(FiveSActionCard({node:n,locale:'es-MX',disabled:true,error:'Cambió la pizarra',onEdit:()=>{},onProgress:()=>{}}));assert.ok(disabled.filter(e=>e.type==='button').every(e=>e.props.disabled));assert.ok(disabled.some(e=>e.props?.role==='alert'));
});
function dialog(){
 const runtime=hookRuntime(),calls=[];let ready=true,accept=false,closed=0;
 const {FiveSProgressDialog}=loadTypescript(file('ComplementaryModules/IdeasBoard/FiveSProgressDialog.tsx'),id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);if(id==='./fiveSCopy')return copy;
  if(id==='../../components/indice-modal')return{IndiceModalFrame:'frame',IndiceModalValidation:'validation'};if(id==='../../components/ui/button')return{Button:'button'};throw Error(id);
 });
 const render=()=>runtime.render(()=>FiveSProgressDialog({node:node(),locale:'es-MX',ready,onClose:()=>closed++,onConfirm:(result,date)=>{calls.push({result,date});return accept;}}));render();
 return{runtime,calls,render,get closed(){return closed;},fill:value=>{elements(runtime.result).find(e=>e.type==='textarea').props.onChange({target:{value}});render();},date:value=>{elements(runtime.result).find(e=>e.type==='input').props.onChange({target:{value}});render();},submit:()=>{elements(runtime.result).find(e=>e.type==='form').props.onSubmit({preventDefault(){}});render();},setReady:value=>{ready=value;render();},accept:()=>{accept=true;},close:()=>{runtime.result.props.onOpenChange(false);render();}};
}
test('verification requires a result, retains answers after rejection and prevents duplicate confirmation',()=>{
 const h=dialog();assert.equal(h.runtime.result.props.modalType,'standard-form');h.submit();assert.equal(h.calls.length,0);
 h.fill('  Carpetas etiquetadas  ');h.date('2026-11-09');h.setReady(false);h.submit();assert.equal(h.calls.length,0);h.setReady(true);h.submit();assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0],{result:'Carpetas etiquetadas',date:'2026-11-09'});
 assert.equal(elements(h.runtime.result).find(e=>e.type==='textarea').props.value,'  Carpetas etiquetadas  ');assert.equal(elements(h.runtime.result).find(e=>e.type==='input').props.value,'2026-11-09');assert.ok(elements(h.runtime.result).some(e=>e.type==='validation'&&e.props.messages.length));
 h.accept();h.submit();h.submit();assert.equal(h.calls.length,2);h.runtime.unmount();
});
test('closing verification leaves its parent unchanged and makes no confirmation call',()=>{const h=dialog();h.fill('Un resultado en captura');h.close();assert.equal(h.closed,1);assert.equal(h.calls.length,0);h.runtime.unmount();});
