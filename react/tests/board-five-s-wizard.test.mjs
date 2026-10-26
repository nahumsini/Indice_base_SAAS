import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),app=new URL('../src/app/',import.meta.url),load=createTypeScriptLoader({}, {crypto,Date});
const file=path=>new URL(path,app).pathname;
const setup=load(file('ComplementaryModules/IdeasBoard/fiveSSetupModel.ts'));
const model=load(file('ComplementaryModules/IdeasBoard/fiveSModel.ts'));
const canvas=load(file('BasicModules/Sales/Funneling/ideasBoardModel.ts'));
const copy=load(file('ComplementaryModules/IdeasBoard/fiveSWizardCopy.ts'));
const plain=value=>JSON.parse(JSON.stringify(value));
function plans(){const result=setup.emptyFiveSPlans();for(const s of model.fiveSSections)result[s]={enabled:true,action:'Acción de '+s,owner:'Equipo',dueDate:'2026-11-12'};return result;}
test('the completed questionnaire appends one area and five pending actions as one complete document',()=>{
 const original=canvas.emptyBoard();original.nodes=[canvas.textNode(10,20)];const before=JSON.stringify(original);
 const next=setup.buildFiveSSetup(original,' Oficina de administración ',plans(),'es-MX');
 assert.equal(JSON.stringify(original),before);assert.equal(next.nodes.length,11);assert.equal(next.nodes[0],original.nodes[0]);
 const headers=next.nodes.filter(n=>n.fiveS?.role==='SECTION'),actions=next.nodes.filter(n=>n.fiveS?.role==='ACTION');
 assert.equal(headers.length,5);assert.equal(actions.length,5);assert.equal(new Set(next.nodes.slice(1).map(n=>n.fiveS.templateId)).size,1);
 for(const n of actions){assert.equal(n.fiveS.area,'Oficina de administración');assert.equal(n.fiveS.status,'PENDING');assert.equal(n.fiveS.owner,'Equipo');assert.equal(n.fiveS.dueDate,'2026-11-12');assert.ok(model.validFiveSAction(n));assert.ok(headers.some(h=>h.fiveS.section===n.fiveS.section&&h.x===n.x));}
 assert.deepEqual(plain(next.viewport),plain(original.viewport));
});
test('deferred sections retain their headers but create no placeholder actions or invalid optional fields',()=>{
 const p=plans();p.ORDER={enabled:false,action:'Keep this draft answer',owner:'',dueDate:'not-a-date'};
 const next=setup.buildFiveSSetup(canvas.emptyBoard(),'Almacén',p,'es-MX');assert.equal(next.nodes.length,9);
 assert.equal(next.nodes.filter(n=>n.fiveS.role==='SECTION').length,5);assert.equal(next.nodes.filter(n=>n.fiveS.role==='ACTION'&&n.fiveS.section==='ORDER').length,0);
 for(const s of model.fiveSSections)p[s].enabled=false;
 assert.equal(setup.buildFiveSSetup(canvas.emptyBoard(),'Almacén',p,'es-MX').nodes.length,5);
});
test('invalid answers, dates, bounds and full documents reject the whole setup without partial changes',()=>{
 const base=canvas.emptyBoard(),p=plans(),before=JSON.stringify(base);
 for(const area of ['', 'x'.repeat(81),'Oficina\nPiso 2'])assert.equal(setup.buildFiveSSetup(base,area,p,'es-MX'),null);
 for(const change of [{action:' '},{action:'x'.repeat(1001)},{owner:'x'.repeat(121)},{dueDate:'2026-02-30'},{dueDate:'1899-12-31'}])assert.equal(setup.buildFiveSSetup(base,'Oficina',{...p,SORT:{...p.SORT,...change}},'es-MX'),null);
 base.nodes=Array.from({length:91},()=>canvas.textNode(0,0));const full=JSON.stringify(base);assert.equal(setup.buildFiveSSetup(base,'Oficina',p,'es-MX'),null);assert.equal(JSON.stringify(base),full);
 base.nodes=Array.from({length:90},()=>canvas.textNode(0,0));assert.equal(setup.buildFiveSSetup(base,'Oficina',p,'es-MX').nodes.length,100);
 assert.equal(before,JSON.stringify(canvas.emptyBoard()));
});
test('long and multiline answers remain complete while generated card titles fit the existing contract',()=>{
 const p=plans();p.SORT.action='  '+ 'Una mejora '.repeat(30)+'\nPasos completos de la acción.  ';
 const action=setup.buildFiveSSetup(canvas.emptyBoard(),'Oficina',p,'es-MX').nodes.find(n=>n.fiveS.role==='ACTION');
 assert.ok(action.text.length<=180);assert.ok(action.text.endsWith('…'));assert.equal(action.fiveS.action,p.SORT.action.trim());
 assert.equal(setup.fiveSActionTitle('\n Primera línea \nSegunda línea'),'Primera línea');
});
function elements(root){return [root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function harness({named=true}={}){
 const runtime=hookRuntime(),replacements=[],notifications=[];let content=canvas.emptyBoard(),ready=true,allow=true,closed=0,created=0;
 const context={active:true,get ready(){return ready;},capture:()=>({actor:'ideas_board:7:9',content:structuredClone(content)}),replace:(expected,next)=>{replacements.push({expected,next});if(!allow||JSON.stringify(expected.content)!==JSON.stringify(content))return false;content=structuredClone(next);return true;},notify:value=>notifications.push(value)};
 const {FiveSCreateWizard}=loadTypescript(file('ComplementaryModules/IdeasBoard/FiveSCreateWizard.tsx'),id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return {Pencil:'pencil'};
  if(id==='../../components/indice-modal')return {IndiceModalFrame:'frame',IndiceModalSummary:'summary',IndiceModalValidation:'validation',IndiceModalWizardStepper:'stepper'};
  if(id==='../../components/ui/button')return {Button:'button'};
  if(id==='./fiveSCopy')return load(file('ComplementaryModules/IdeasBoard/fiveSCopy.ts'));
  if(id==='./fiveSWizardCopy')return copy;if(id==='./fiveSModel')return model;if(id==='./fiveSSetupModel')return setup;if(id.endsWith('.css'))return {};
  throw Error(id);
 });
 const render=()=>runtime.render(()=>FiveSCreateWizard({context,locale:'es-MX',onClose:()=>closed++,onCreated:()=>created++}));render();
 const fields=()=>elements(runtime.result);
 if(named){fields().find(n=>n.type==='input').props.onChange({target:{value:'Área sintética'}});render();}
 const click=label=>{const n=[...fields(),...elements(runtime.result.props.footer)].find(n=>n.type==='button'&&[n.props.children].flat(Infinity).includes(label));assert.ok(n,label);n.props.onClick();render();};
 return {runtime,render,fields,click,context,replacements,notifications,get content(){return content;},get created(){return created;},get closed(){return closed;},get step(){return fields().find(n=>n.type==='stepper').props.activeStepId;},fill:(type,value)=>{const n=fields().find(n=>n.type===type);n.props.onChange({target:{value}});render();},next:()=>{fields().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});render();},race:()=>{content={...content,nodes:[canvas.textNode(50,50)]};},setReady:v=>{ready=v;render();},setAllow:v=>{allow=v;},cancel:()=>{runtime.result.props.onOpenChange(false);render();}};
}
test('step validation, Back and defer/resume preserve answers and do not write before the final confirmation',()=>{
 const h=harness();assert.equal(h.step,'0');h.next();assert.equal(h.step,'1');h.next();assert.equal(h.step,'1');assert.equal(h.replacements.length,0);
 h.fill('textarea','Separar los materiales que ya no usamos');h.click('Definir después');assert.equal(h.step,'2');h.click('Volver');assert.equal(h.step,'1');h.click('Incluir esta acción');assert.equal(h.fields().find(n=>n.type==='textarea').props.value,'Separar los materiales que ya no usamos');
 h.next();for(let i=0;i<4;i++){h.click('Definir después');}assert.equal(h.step,'6');assert.equal(h.replacements.length,0);
 h.click('Crear tablero 5S');h.click('Crear tablero 5S');assert.equal(h.created,1);assert.equal(h.replacements.length,1);assert.equal(h.content.nodes.length,6);assert.equal(h.content.nodes.at(-1).fiveS.action,'Separar los materiales que ya no usamos');h.runtime.unmount();
});
test('a changed document retains questionnaire answers and requires an explicit refreshed review',()=>{
 const h=harness();h.next();h.fill('textarea','Ordenar los materiales');h.next();for(let i=0;i<4;i++){h.click('Definir después');}
 h.race();h.click('Crear tablero 5S');assert.equal(h.created,0);assert.equal(h.content.nodes.length,1);assert.ok(h.fields().some(n=>n.type==='validation'&&n.props.messages.includes(copy.fiveSWizardCopy('es').notCreated)));
 h.click('Actualizar revisión');assert.equal(h.replacements.length,1);h.click('Crear tablero 5S');assert.equal(h.created,1);assert.equal(h.content.nodes.length,7);assert.equal(h.content.nodes.at(-1).fiveS.action,'Ordenar los materiales');h.runtime.unmount();
});
test('cancel and temporarily unavailable save never create partial records',()=>{
 const h=harness();h.next();h.fill('textarea','Una mejora');h.cancel();assert.equal(h.closed,1);assert.equal(h.replacements.length,0);h.runtime.unmount();
 const offline=harness();offline.next();for(let i=0;i<5;i++){offline.click('Definir después');}offline.setReady(false);offline.click('Crear tablero 5S');assert.equal(offline.replacements.length,0);offline.runtime.unmount();
});
test('all six languages offer complete simple questions, examples, review and recovery copy',()=>{
 for(const locale of ['es-MX','es-CO','en-CA','en-US','fr-CA','pt-BR','ko-CA','zh-CA']){const c=copy.fiveSWizardCopy(locale);assert.ok(Object.values(c).every(s=>typeof s==='string'&&s.trim()));for(const s of model.fiveSSections){assert.ok(c[s+'Question']);assert.ok(c[s+'Example']);}}
});
test('editing from the final review returns directly to review and preserves responsible names and target dates',()=>{
 const h=harness();h.next();for(let i=0;i<5;i++){h.click('Definir después');}
 h.fields().find(n=>n.type==='button'&&n.props['aria-label']==='Cambiar: Clasificar').props.onClick();h.render();assert.equal(h.step,'1');h.fill('textarea','Revisar los archivos');
 const owner=h.fields().find(n=>n.type==='input'&&n.props.maxLength===120);owner.props.onChange({target:{value:'Equipo de oficina'}});h.render();
 h.fields().find(n=>n.type==='input'&&n.props.type==='date').props.onChange({target:{value:'2026-11-02'}});h.render();h.next();assert.equal(h.step,'6');
 h.click('Crear tablero 5S');assert.equal(h.content.nodes.at(-1).fiveS.owner,'Equipo de oficina');assert.equal(h.content.nodes.at(-1).fiveS.dueDate,'2026-11-02');h.runtime.unmount();
});

test('area creation starts blank without categories, accepts a free name and retains it after Back',()=>{
 const h=harness({named:false});assert.equal(h.fields().filter(n=>n.type==='select').length,0);assert.equal(h.fields().find(n=>n.type==='input').props.value,'');
 h.next();assert.equal(h.step,'0');assert.equal(h.replacements.length,0);
 h.fill('input','Preparación de pedidos · Turno de tarde');h.next();assert.equal(h.step,'1');h.click('Volver');assert.equal(h.fields().find(n=>n.type==='input').props.value,'Preparación de pedidos · Turno de tarde');
 h.next();for(let i=0;i<5;i++){h.click('Definir después');}h.click('Crear tablero 5S');assert.ok(h.content.nodes.every(n=>n.fiveS.area==='Preparación de pedidos · Turno de tarde'));h.runtime.unmount();
});
test('optional area examples only populate a draft on explicit click and remain freely editable',()=>{
 const h=harness({named:false});h.click('Vehículo de reparto');assert.equal(h.fields().find(n=>n.type==='input').props.value,'Vehículo de reparto');assert.equal(h.replacements.length,0);
 h.fill('input','Camioneta de entregas 2');h.next();h.click('Volver');assert.equal(h.fields().find(n=>n.type==='input').props.value,'Camioneta de entregas 2');h.cancel();assert.equal(h.replacements.length,0);h.runtime.unmount();
});

test('suggestions append without replacing answers, avoid duplicate lines and never write until creation',()=>{
 const h=harness();h.next();h.fill('textarea','Conservar los contratos vigentes');h.click('Separar duplicados');
 assert.equal(h.fields().find(n=>n.type==='textarea').props.value,'Conservar los contratos vigentes\nSeparar duplicados');h.click('Separar duplicados');assert.equal(h.fields().find(n=>n.type==='textarea').props.value,'Conservar los contratos vigentes\nSeparar duplicados');assert.equal(h.replacements.length,0);
 h.fill('textarea','x'.repeat(1000));assert.ok(h.fields().filter(n=>n.type==='button'&&['Separar duplicados','Retirar lo que no se usa'].includes(n.props.children)).every(n=>n.props.disabled));h.runtime.unmount();
});
test('defer retains answer and follow-up for explicit resume while excluding it from creation',()=>{
 const h=harness();h.next();h.fill('textarea','Separar materiales');h.fields().find(n=>n.type==='input'&&n.props.maxLength===120).props.onChange({target:{value:'Equipo sintético'}});h.render();h.click('Definir después');assert.equal(h.step,'2');h.click('Volver');
 assert.equal(h.fields().find(n=>n.type==='textarea').props.value,'Separar materiales');assert.equal(h.fields().find(n=>n.type==='input'&&n.props.maxLength===120).props.value,'Equipo sintético');assert.equal(h.runtime.result.props.footerSummary,'Sin acciones por ahora');h.click('Incluir esta acción');assert.equal(h.runtime.result.props.footerSummary,'1 acción para empezar');h.click('Definir después');for(let i=0;i<4;i++)h.click('Definir después');h.click('Crear tablero 5S');assert.equal(h.content.nodes.length,5);h.runtime.unmount();
});
test('review offers compact disclosures with full text and an honest action count',()=>{
 const h=harness();h.next();h.fill('textarea','Texto completo '.repeat(40));h.next();for(let i=0;i<4;i++)h.click('Definir después');assert.equal(h.step,'6');assert.equal(h.runtime.result.props.footerSummary,'1 acción para empezar');
 const details=h.fields().filter(n=>n.type==='details');assert.equal(details.length,1);assert.equal(details[0].props.open,undefined);assert.ok(h.fields().some(n=>n.type==='p'&&n.props.children==='Texto completo '.repeat(40).trim()));assert.equal(h.replacements.length,0);h.runtime.unmount();
});

test('invalid optional dates remain editable and block Continue without crashing the follow-up summary',()=>{
 const h=harness();h.next();h.fill('textarea','Revisar materiales');h.fields().find(n=>n.type==='input'&&n.props.type==='date').props.onChange({target:{value:'not-a-date'}});assert.doesNotThrow(()=>h.render());h.next();assert.equal(h.step,'1');assert.equal(h.replacements.length,0);h.click('Definir después');assert.equal(h.step,'2');h.runtime.unmount();
});
