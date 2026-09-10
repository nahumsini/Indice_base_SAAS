import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {hookRuntime,loadTypescript} from './helpers/hook-runtime.mjs';
const root=resolve('src/app/BasicModules/Expenses');
const stub=new Proxy({}, {get:(_,name)=>name});
const load=(path,resolver=()=>stub)=>loadTypescript(resolve(root,path),resolver);
const es=load('translations/es-MX.ts',()=>({mergeFinanceTranslations:(_,copy)=>copy})).esMX;
const en=load('translations/en-CA.ts').enCA;
const logic=load('Providers/useProveedoresLogic.ts');
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):React.isValidElement(tree)?[tree,...nodes(tree.props.children),...nodes(tree.props.footer),...nodes(tree.props.footerLeading)]:[];
const initial={name:'  Arrendadora del Norte  ',company:'  Arrendadora SA  ',type:'Arrendamiento',status:'inactive',contactName:'Contacto de prueba',email:'contact@example.test',phone:'+52 555 000 0000',taxId:'TEST010101XXX',address:'Dirección de prueba',businessUnit:'1',business:'11',accountingAccount:'6100',authorizer:'7',performer:'8'};
function modal(overrides={},t=es){
 const runtime=hookRuntime(),calls=[];
 const {ProviderCreateModal}=load('Providers/components/ProviderCreateModal.tsx',id=>id==='react'?runtime.hooks:id==='react/jsx-runtime'?jsx:id.endsWith('useProvidersTranslations')?{useProvidersTranslations:()=>t}:id.endsWith('useProveedoresLogic')?logic:stub);
 const props={accountingAccountOptions:[{value:'6100',label:'Rentas'}],unitOptions:[{value:'1',label:'Cancún'},{value:'2',label:'Monterrey'}],businessOptions:[{value:'11',label:'Local Cancún',unitId:'1'},{value:'21',label:'Local Monterrey',unitId:'2'}],userOptions:[{value:'7',label:'Autorizador'},{value:'8',label:'Responsable'}],onClose(){},onSubmit:async v=>calls.push(v),...overrides};
 const all=()=>nodes(runtime.render(()=>ProviderCreateModal(props)));
 const field=label=>all().find(n=>n.props.label===label&&['TextField','ReferenceField','SelectField'].includes(n.type?.name));
 return {all,props,calls,field,runtime,change:(label,value)=>field(label).props.onChange(value),submit:()=>all().find(n=>n.type==='form').props.onSubmit({preventDefault(){}}),get save(){return all().find(n=>n.props.type==='submit');}};
}
test('name-only creation keeps optional values empty and existing type/status defaults',async()=>{
 const ui=modal();assert.equal(ui.save.props.disabled,true);await ui.submit();assert.equal(ui.calls.length,0);
 ui.change(es.providers.columns.name.label,'  Nuevo proveedor  ');assert.equal(ui.save.props.disabled,false);await ui.submit();
 assert.deepEqual(ui.calls[0],{accountingAccount:'',address:'',authorizer:'',business:'',businessUnit:'',company:'',contactName:'',email:'',name:'Nuevo proveedor',performer:'',phone:'',status:'active',taxId:'',type:'Servicios'});
 assert.equal(ui.all().find(n=>n.type==='IndiceModalFrame').props.modalType,'standard-form');
});
test('editing preserves every optional field and inactive status even when disclosures are collapsed',async()=>{
 const ui=modal({initialValues:initial,title:es.providers.edit});
 const sections=ui.all().filter(n=>n.type?.name==='ProviderDisclosure');assert.equal(sections.length,4);
 assert.ok(sections.some(n=>n.props.summary==='Contacto de prueba · contact@example.test · +52 555 000 0000'));
 assert.ok(sections.some(n=>n.props.summary==='Cancún · Local Cancún · Rentas'));
 for(const section of sections){assert.equal(nodes(section.type(section.props)).find(n=>n.type==='details').props.open,undefined);}
 await ui.submit();assert.deepEqual(ui.calls[0],{...initial,name:initial.name.trim(),company:initial.company.trim()});
});
test('unit changes preserve scope filtering; incompatible business is cleared without selecting a new one',async()=>{
 const ui=modal({initialValues:initial});ui.change(es.filters.unit,'2');await ui.runtime.flush();
 const business=ui.field(es.filters.business);assert.equal(business.props.value,'');assert.deepEqual(business.props.options.map(o=>o.value),['21']);
 ui.change(es.filters.business,'21');await ui.submit();assert.equal(ui.calls[0].business,'21');assert.equal(ui.calls[0].businessUnit,'2');assert.equal(ui.calls[0].accountingAccount,'6100');
});
test('failed saves retain captured values and a concurrent retry cannot submit twice',async()=>{
 let count=0,reject;const ui=modal({initialValues:initial,onSubmit:()=>{count++;return new Promise((_,r)=>reject=r);}});
 const first=ui.submit();await ui.submit();assert.equal(count,1);assert.equal(ui.save.props.disabled,true);assert.equal(ui.all().find(n=>n.type==='fieldset').props.disabled,true);
 reject(new Error('Offline'));await first;await ui.runtime.flush();assert.equal(ui.save.props.disabled,false);
 assert.equal(ui.field(es.providers.columns.email.label).props.value,initial.email);
 assert.equal(ui.all().find(n=>n.type==='IndiceModalValidation').props.messages[0],es.providers.modal.saveFailed);
});
test('empty optional catalogs do not block creation or invent an assigned account',async()=>{
 const ui=modal({accountingAccountOptions:[],userOptions:[],unitOptions:[],businessOptions:[]});ui.change(es.providers.columns.name.label,'Proveedor');await ui.submit();
 assert.equal(ui.calls[0].accountingAccount,'');assert.equal(ui.calls[0].businessUnit,'');assert.equal(ui.calls[0].authorizer,'');
});
test('Spanish labels and English save feedback are localized; Sales retains its coral variant',async()=>{
 assert.equal(es.providers.columns.name.label,'Proveedor');assert.equal(es.providers.columns.company.label,'Razón social');assert.equal(es.providers.columns.accountingAccount.label,'Cuenta contable');assert.equal(es.providers.columns.email.label,'Correo electrónico');
 const ui=modal({variant:'sales',initialValues:initial,onSubmit:async()=>{throw new Error('Offline');}},en);
 assert.equal(ui.all().find(n=>n.type==='IndiceModalFrame').props.tone,'coral');await ui.submit();
 assert.equal(ui.all().find(n=>n.type==='IndiceModalValidation').props.messages[0],en.providers.modal.saveFailed);
});
