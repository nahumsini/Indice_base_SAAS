import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const questions=loadTypescript(new URL('brand/brandQuestions.ts',root).pathname,()=>({}));
const model=loadTypescript(new URL('brand/brandModel.ts',root).pathname,()=>questions);
const {brandCopy}=loadTypescript(new URL('brand/brandCopy.ts',root).pathname,()=>{throw Error('Unexpected import');});
test('company reference requires an explicit campaign selection and never embeds private file transport',()=>{
 const value={companyName:'Synthetic',details:{...model.emptyBrandDetails(),description:'Confirmed details'},assets:[{id:'private-id',name:'approved.jpg',contentType:'image/jpeg',category:'PHOTO',sizeBytes:100,status:'READY',objectKey:'DO-NOT-EXPORT'}],version:1,profileVersion:1,includeProfile:true};
 assert.equal(model.brandPromptContext(null,brandCopy('es-MX')),null);assert.equal(model.brandPromptContext({...value,includeProfile:false,assets:[]},brandCopy('es-MX')),null);
 const context=model.brandPromptContext(value,brandCopy('es-MX'));assert.equal(context['¿A qué se dedica tu empresa?'],'Confirmed details');const json=JSON.stringify(context);assert.ok(!json.includes('private-id'));assert.ok(!json.includes('DO-NOT-EXPORT'));assert.ok(json.includes('not embedded'));
});
test('brand copy supports every native locale with the same nonempty user-facing fields',()=>{const keys=Object.keys(brandCopy('en-US'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const copy=brandCopy(locale);assert.deepEqual(Object.keys(copy),keys);assert.ok(Object.values(copy).every(v=>typeof v==='string'&&v.length));}});
test('historical links and stored views map to the right workspace without losing their original view mode',()=>{const campaign=loadTypescript(new URL('campaignModel.ts',root).pathname,()=>({}));const {funnelWorkspaceView,normalizeFunnelView}=loadTypescript(new URL('funnelModel.ts',root).pathname,()=>campaign);for(const old of ['ideas','list','funnel']){assert.equal(normalizeFunnelView(old),old);assert.equal(funnelWorkspaceView(old),'ideas');}assert.equal(funnelWorkspaceView('content'),'content');assert.equal(funnelWorkspaceView('calendar'),'calendar');assert.equal(funnelWorkspaceView('outdated'),'ideas');});

test('guided choices are localized, bounded and omitted until explicitly answered',()=>{
 const a=model.emptyBrandAnswers();assert.ok(Object.values(a).every(v=>v===''||v===false||Array.isArray(v)&&v.length===0));
 assert.deepEqual(model.toggleBrandChoice(['ATTENTION','QUALITY','SPEED'],'EXPERTISE',3),['ATTENTION','QUALITY','SPEED']);
 assert.deepEqual(model.toggleBrandChoice(['ATTENTION'],'ATTENTION',3),[]);
 assert.deepEqual(model.addBrandTag(['Consultation'],' consultation ',20,80),['Consultation']);
 const old={description:'Legacy',offer:'Earlier service',difference:'',audience:'',region:'',contact:'',voice:'Warm',guidance:'',colors:[]};
 assert.equal(model.normalizeBrandDetails(old).offer,'Earlier service');assert.deepEqual(model.normalizeBrandDetails(old).answers,a);
 const value={companyName:'Synthetic',details:{...old,answers:{...a,industry:'PROFESSIONAL',offeringType:'SERVICES',tones:['FRIENDLY'],industryOther:'Hidden unused value',usePrimaryLogo:true}},assets:[{name:'logo.png',contentType:'image/png',category:'LOGO_VARIANT',description:'Approved reference',logoVariant:'LIGHT'}],includeProfile:true};
 const text=JSON.stringify(model.brandPromptContext(value,brandCopy('es-MX'),'es-MX'));
 assert.match(text,/Servicios profesionales/);assert.match(text,/Cercano/);assert.match(text,/Approved reference/);assert.match(text,/logo.png/);assert.doesNotMatch(text,/Hidden unused value/);
});
test('all guided questions and option labels exist across native locales',()=>{const reference=Object.keys(questions.questionCopy('en-US'));for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const c=questions.questionCopy(locale);assert.deepEqual(Object.keys(c),reference);assert.ok(Object.values(c).every(v=>typeof v==='string'&&v.trim()));for(const [group,options] of Object.entries(questions.questionOptions))for(const option of options)assert.ok(c[`${group}_${option}`]);}});
