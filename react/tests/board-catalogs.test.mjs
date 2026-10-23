import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';import {createRequire} from 'node:module';
const app=new URL('../src/app/',import.meta.url),require=createRequire(import.meta.url),load=createTypeScriptLoader({}, {crypto});
const owner='ComplementaryModules/IdeasBoard/',catalog=load(new URL(owner+'systemCatalog.ts',app).pathname),copy=load(new URL(owner+'systemCatalogCopy.ts',app).pathname),m=load(new URL(owner+'systemBoardModel.ts',app).pathname),base=load(new URL('BasicModules/Sales/Funneling/ideasBoardModel.ts',app).pathname);
function elements(root){return[root,...[root?.props?.children].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
test('all diagnostic choices have translated names, unique identifiers and accepted backend icons',()=>{
 const ids=catalog.allCatalogItems.map(i=>i.id);assert.equal(new Set(ids).size,ids.length);
 const staged=new URL('../../backend/src/main/java/com/indice/erp/ideasboard/IdeaCatalogPolicy.java',import.meta.url);const backend=readFileSync(existsSync(staged)?staged:new URL('../../src/main/java/com/indice/erp/ideasboard/IdeaCatalogPolicy.java',import.meta.url),'utf8');
 for(const item of catalog.allCatalogItems){assert.ok(backend.includes('"'+item.id+'"'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const label=catalog.catalogLabel(item,locale);assert.ok(label&&label!==item.id);assert.ok(copy.systemCatalogCopy(locale)[item.group]);}}
 for(const id of ['INCOME','BALANCE','CASH_FLOW','EQUITY_CHANGES','TRIAL_BALANCE','EXPENSE_REPORT','BUDGET','RECEIVABLE_REPORT','PETTY_CASH_STATEMENT','POS_CLOSING','PAYROLL_REPORT'])assert.ok(catalog.financeCatalog.some(i=>i.id===id));
});
test('steps and product/service base roundtrip in projects, movement and conflict detection',()=>{
 const original={...m.createSystemElement(base.emptyBoard(),'PROCESS'),text:'Pedido',steps:['Revisar','Preparar','Entregar']},offering={...m.createSystemElement(base.emptyBoard(),'PRODUCT'),text:'Servicio',icon:'CLEANING',offeringType:'SERVICE'},a={...base.emptyBoard(),nodes:[original,offering]},doc=m.toSystemDocument(a);
 assert.equal(JSON.stringify(m.fromSystemDocument(doc)),JSON.stringify(a));assert.equal('steps' in doc.elements[0].node,false);assert.equal(doc.elements[1].offeringType,'SERVICE');
 assert.deepEqual(m.moveSystemIdea(original,-1300,0).steps,original.steps);assert.equal(m.sameSystemIdeas(a,{...a,nodes:[{...original,steps:['Entregar','Revisar']},offering]}),false);assert.equal(m.sameSystemIdeas(a,{...a,nodes:[original,{...offering,offeringType:'PRODUCT'}]}),false);
 const old={...base.emptyBoard(),nodes:[{...m.newElement(base.emptyBoard(),'PROCESS'),text:'Viejo'}]};assert.equal('steps' in m.toSystemDocument(old).elements[0],false);assert.equal(JSON.stringify(m.fromSystemDocument(m.toSystemDocument(old))),JSON.stringify(old));
 const channel=m.createSystemElement(base.emptyBoard(),'PRODUCT',true);assert.equal(channel.icon,'CRM');assert.ok(channel.y<1200);assert.ok(offering.y>=1200);assert.ok(m.fitWorkspace([channel,offering],360,500,'CHANNEL').zoom>0);
});
test('numbered step actions add, reorder, remove and keep the optional 50-step limit',()=>{
 const runtime=hookRuntime();let steps=['Uno','Dos'];const {ProcessStepsFields}=loadTypescript(new URL(owner+'ProcessStepsFields.tsx',app).pathname,id=>id==='react'?{useId:()=> 'steps'}:id==='react/jsx-runtime'?require(id):id==='lucide-react'?new Proxy({},{get:()=>()=>null}):copy);
 const render=()=>ProcessStepsFields({steps,onChange:value=>steps=value,locale:'es-MX'});runtime.render(render);
 elements(runtime.result).find(v=>v.type==='button'&&v.props['aria-label']==='Bajar paso 1').props.onClick();assert.deepEqual(steps,['Dos','Uno']);runtime.render(render);
 elements(runtime.result).find(v=>v.type==='button'&&v.props['aria-label']==='Quitar paso 2').props.onClick();assert.deepEqual(steps,['Dos']);runtime.render(render);
 elements(runtime.result).find(v=>v.type==='button'&&!v.props['aria-label']).props.onClick();assert.deepEqual(steps,['Dos','']);assert.equal(m.validSystemElement({...m.newElement(base.emptyBoard(),'PROCESS'),steps}),false);
 steps=Array(50).fill('Paso');runtime.render(render);assert.equal(elements(runtime.result).find(v=>v.type==='button'&&!v.props['aria-label']).props.disabled,true);
});
test('printing process details uses ordered escaped appendices without crowding the diagram',()=>{
 const print=load(new URL('BasicModules/Sales/Funneling/boardPrintDocument.ts',app).pathname),node={...base.textNode(50,150),text:'Proceso'},content={...base.emptyBoard(),nodes:[node]};
 const html=print.boardPrintDocument(content,'Tablero',()=>'',{worldBounds:{x:0,y:0,width:2200,height:1600},regions:[],printDetails:()=>[{title:'Pedido <seguro>',steps:['Revisar <script>','Entregar']} ]});
 assert.match(html,/board-print-details/);assert.match(html,/<ol><li>Revisar &lt;script&gt;<\/li><li>Entregar<\/li><\/ol>/);assert.doesNotMatch(html,/<script>/);
});
