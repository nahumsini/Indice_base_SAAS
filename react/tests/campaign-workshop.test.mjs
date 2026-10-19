import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript,hookRuntime} from './helpers/hook-runtime.mjs';
const root=new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const load=(file,resolve=()=>({}))=>loadTypescript(new URL(file,root).pathname,resolve);
const campaign=load('campaignModel.ts'),model=load('funnelModel.ts',()=>campaign);
const {campaignCopy,campaignTranslations}=load('campaignCopy.ts'),{funnelTranslations}=load('funnelCopy.ts');
const {journeyCopy,journeyTranslations}=load('journeyCopy.ts'),journey=load('journeyModel.ts');
const {buildCampaignPrompt,campaignPromptDocument}=load('campaignPrompt.ts',id=>id.endsWith('journeyCopy')?{journeyCopy}:campaign);
const {suggestedCampaignStages}=load('CampaignPlanContent.tsx');
const c=campaignCopy('es-MX'),copy=funnelTranslations.es,j=journeyCopy('es-MX');
const idea=()=>({...campaign.newCampaignIdea(),name:'Consulta de prueba',workshop:{...campaign.emptyCampaignBrief(),idea:'Dar a conocer el servicio'}});
function complete(){const p=idea();p.objective='Agendar citas';p.audience='Empresas locales';Object.assign(p.workshop,{offer:'Consulta',goal:'APPOINTMENTS',channels:['META_ADS'],destination:'WHATSAPP'});return p;}
test('ideas require only title and note; defined briefs need answers rather than invented targets',()=>{
 const p=idea();assert.equal(model.validateFunnel(p),null);assert.equal(model.previewConversion(p.stages),null);
 p.workshop.idea=' ';assert.equal(model.validateFunnel(p),'ideaRequired');p.workshop=null;assert.equal(model.validateFunnel(p),'required');
 const ready=complete();ready.status='PLANNED';assert.equal(model.validateFunnel(ready),null);ready.workshop.channels=[];assert.equal(model.validateFunnel(ready),'briefIncomplete');
});
test('recommendations reflect answers and deferral, and accepting a path never overwrites existing stages',()=>{
 const p=idea();assert.deepEqual(campaign.campaignRecommendations(p).slice(0,3).map(x=>x.id),['offer','audience','goal']);
 p.workshop.deferredRecommendations=['offer'];assert.ok(!campaign.campaignRecommendations(p).some(x=>x.id==='offer'));assert.ok(campaign.campaignRecommendations(p,true).some(x=>x.id==='offer'));
 p.workshop.offer='Package';assert.ok(!campaign.campaignRecommendations(p,true).some(x=>x.id==='offer'));
 const next=campaign.applyCampaignPath(p,suggestedCampaignStages(c));assert.equal(next.stages.length,3);assert.equal(p.stages.length,0);assert.ok(next.stages.every(x=>x.target===null));assert.equal(campaign.applyCampaignPath(next,[]),next);
});
test('channel suggestions distinguish paid planning, landing context and response ownership',()=>{
 const p=complete();let ids=campaign.campaignRecommendations(p,true).map(x=>x.id);assert.ok(ids.includes('budget'));assert.ok(ids.includes('messageOwner'));assert.ok(!ids.includes('searchPage'));
 p.workshop.channels=['GOOGLE_SEARCH'];assert.ok(campaign.campaignRecommendations(p,true).some(x=>x.id==='searchPage'));
 p.workshop.channels=['ORGANIC'];assert.ok(!campaign.campaignRecommendations(p,true).some(x=>x.id==='budget'));
});
test('duplication deeply copies brief selections, keeps response and resets version',()=>{
 const p={...complete(),id:'source',version:5,status:'PLANNED'};p.workshop.aiResponse='Keep this response';
 const d=model.duplicateFunnel(p,'Copy');d.workshop.channels.push('GOOGLE_SEARCH');d.workshop.deferredRecommendations.push('offer');
 assert.deepEqual(p.workshop.channels,['META_ADS']);assert.deepEqual(p.workshop.deferredRecommendations,[]);assert.equal(d.version,0);assert.equal(d.id,undefined);assert.equal(d.status,'DRAFT');assert.equal(d.workshop.aiResponse,p.workshop.aiResponse);
});
test('prompt and printed content share the same selected channels and omit internal identity and pasted AI response',()=>{
 const p=complete();p.id='internal-id';p.workshop.aiResponse='SECRET-RESPONSE-DO-NOT-EXPORT';
 const prompt=buildCampaignPrompt(p,c,copy,'es-MX');assert.match(prompt,/Para Meta Ads/);assert.doesNotMatch(prompt,/Para Google Ads|SECRET-RESPONSE|internal-id/);assert.match(prompt,/Decisiones por completar/);assert.match(prompt,/no autoriza publicaciones/);
 p.workshop.channels=['ORGANIC','GOOGLE_SEARCH'];const next=buildCampaignPrompt(p,c,copy,'es-MX');assert.match(next,/Para Google Ads/);assert.match(next,/Para contenido en redes/);assert.doesNotMatch(next,/Para Meta Ads/);
 const doc=campaignPromptDocument(p,next,c,'es-MX');assert.equal(doc.sections[0].paragraphs.join('\n'),next);assert.equal(doc.contract.pageSize,'a4');
});
test('all supported locales supply workshop and prompt copy',()=>{
 const keys=Object.keys(campaignTranslations.en).sort();for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){
  const labels=campaignCopy(locale);assert.deepEqual(Object.keys(labels).sort(),keys);assert.ok(Object.values(labels).every(x=>typeof x==='string'&&x.length));
  const prompt=buildCampaignPrompt(complete(),labels,funnelTranslations[locale.split('-')[0]],locale);assert.ok(prompt.includes(labels.idea));assert.ok(prompt.includes(labels.channel_META_ADS));
 }
});
function nodes(n){if(n==null||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return[n,...nodes(n.props?.children)];}
const find=(r,p)=>{const n=nodes(r.result).find(p);assert.ok(n,'node not found');return n;};
const contains=(n,t)=>n===t||Array.isArray(n)&&n.some(x=>contains(x,t))||n&&typeof n==='object'&&contains(n.props?.children,t);
function setup(initialPlan=idea(),extra={}){
 const runtime=hookRuntime(),saves=[];let closed=0,saved=0,reject,resolve;
 class ApiClientError extends Error{constructor(status){super('Synthetic');this.status=status;}}
 const {CampaignWorkshopModal}=load('CampaignWorkshopModal.tsx',id=>{
  if(id==='react')return runtime.hooks;if(id==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
  if(id.endsWith('journeyModel'))return journey;if(id.endsWith('journeyCopy'))return{journeyCopy};
  if(id.endsWith('apiClient'))return{ApiClientError};if(id.endsWith('funnelModel'))return model;if(id.endsWith('campaignModel'))return campaign;if(id.endsWith('campaignCopy'))return{campaignCopy};
  if(id.endsWith('CampaignPlanContent'))return{CampaignPlanContent:'CampaignPlanContent',suggestedCampaignStages};if(id.endsWith('salesModalStyles'))return{getSalesModalActionClassNames:()=>({})};
  if(id.endsWith('funnelApi'))return{funnelApi:{save:(_id,data)=>{saves.push(structuredClone(data));return new Promise((a,b)=>{resolve=a;reject=b;});}}};
  return new Proxy({},{get:(_,key)=>key});
 });
 const originalWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}};
 const initial=initialPlan;runtime.render(()=>CampaignWorkshopModal({id:'test',initial,copy,locale:'es-MX',...extra,onClose:()=>closed++,onSaved:()=>saved++}));
 return{runtime,saves,button:t=>find(runtime,n=>n.type==='Button'&&contains(n.props.children,t)),ApiClientError,get saved(){return saved;},get closed(){return closed;},reject:v=>reject(v),resolve:()=>resolve({}),cleanup(){runtime.unmount();globalThis.window=originalWindow;}};
}
test('one draft survives panel changes, failed saves and duplicate submits',async()=>{
 const s=setup();s.button(j.configure).props.onClick();await s.runtime.flush();find(s.runtime,n=>n.type==='CampaignContextEditor').props.patch({offer:'Personalizada'});await s.runtime.flush();
 const nav=()=>find(s.runtime,n=>n.type==='IndiceWorkspaceNavigation');nav().props.onValueChange('stage');await s.runtime.flush();nav().props.onValueChange('campaign');await s.runtime.flush();assert.equal(find(s.runtime,n=>n.type==='CampaignContextEditor').props.draft.workshop.offer,'Personalizada');
 const submit=()=>find(s.runtime,n=>n.type==='form').props.onSubmit({preventDefault(){}});submit();submit();await s.runtime.flush();assert.equal(s.saves.length,1);s.runtime.result.props.onOpenChange();assert.equal(s.closed,0);
 s.reject(new Error('offline'));await s.runtime.flush();assert.ok(find(s.runtime,n=>n.props?.role==='alert'));assert.equal(find(s.runtime,n=>n.type==='CampaignContextEditor').props.draft.workshop.offer,'Personalizada');assert.equal(s.saved,0);
 submit();await s.runtime.flush();assert.equal(s.saves.length,2);s.resolve();await s.runtime.flush();assert.equal(s.saved,1);s.cleanup();
});
test('version conflicts retain the idea and block overwriting newer edits',async()=>{
 const s=setup();const submit=()=>find(s.runtime,n=>n.type==='form').props.onSubmit({preventDefault(){}});submit();await s.runtime.flush();s.reject(new s.ApiClientError(409));await s.runtime.flush();
 assert.ok(contains(find(s.runtime,n=>n.props?.role==='alert').props.children,copy.conflict));submit();await s.runtime.flush();assert.equal(s.saves.length,1);s.cleanup();
});
test('dirty-close confirmation returns to the edited idea without loss',async()=>{
 const s=setup();find(s.runtime,n=>n.type==='Textarea').props.onChange({target:{value:'Updated idea'}});await s.runtime.flush();s.runtime.result.props.onOpenChange();await s.runtime.flush();
 assert.equal(s.runtime.result.props.modalType,'confirmation');s.runtime.result.props.onOpenChange();await s.runtime.flush();assert.equal(find(s.runtime,n=>n.type==='Textarea').props.value,'Updated idea');assert.equal(s.closed,0);s.cleanup();
});

const editor=s=>find(s.runtime,n=>n.type==='CampaignStageEditor');
const context=s=>find(s.runtime,n=>n.type==='CampaignContextEditor');
const diagram=s=>find(s.runtime,n=>n.type==='CampaignFunnelDiagram');
async function panel(s,value){find(s.runtime,n=>n.type==='IndiceWorkspaceNavigation').props.onValueChange(value);await s.runtime.flush();}
test('suggested journeys follow goal, channel and destination without inventing targets or mutating the plan',()=>{
 const p=complete(),before=structuredClone(p);let stages=journey.suggestJourney(p,j);assert.equal(stages.length,4);assert.ok(stages.every(x=>x.target===null));assert.equal(stages[1].content,j.cWelcome);assert.deepEqual(p,before);
 p.workshop.goal='QUOTES';p.workshop.channels=['GOOGLE_SEARCH'];stages=journey.suggestJourney(p,j);assert.equal(stages.length,3);assert.equal(stages[0].content,j.cSearch);assert.equal(stages.at(-1).action,j.aQuote);
 p.workshop.goal='RENEWALS';assert.equal(journey.suggestJourney(p,j).at(-1).action,j.aRenew);
});
test('changing the goal preserves custom objectives, stages and AI response',()=>{
 const p=complete();p.objective='Mi objetivo';p.stages=[{name:'Propia',action:'Llamar',measure:'Llamadas',content:'Guion propio',target:100}];p.workshop.aiResponse='Respuesta guardada';
 const n=journey.changeCampaignGoal(p,'QUOTES',c);assert.equal(n.objective,p.objective);assert.deepEqual(n.stages,p.stages);assert.equal(n.workshop.aiResponse,p.workshop.aiResponse);assert.equal(p.workshop.goal,'APPOINTMENTS');
 p.objective=c.goal_APPOINTMENTS;assert.equal(journey.changeCampaignGoal(p,'QUOTES',c).objective,c.goal_QUOTES);
});
test('selecting a suggested stage does not adopt it; editing adopts it and the prompt reads that same draft',async()=>{
 const p={...complete(),version:1},s=setup(p,{initialStage:2});assert.equal(editor(s).props.index,2);assert.equal(diagram(s).props.suggested,true);
 diagram(s).props.onSelect(1);await s.runtime.flush();assert.equal(diagram(s).props.suggested,true);editor(s).props.onChange({content:'Video personalizado'});await s.runtime.flush();assert.equal(diagram(s).props.suggested,false);assert.equal(s.saves.length,0);
 await panel(s,'prompt');const draft=find(s.runtime,n=>n.type==='CampaignPromptTools').props.plan;assert.match(buildCampaignPrompt(draft,c,copy,'es-MX'),/Video personalizado/);assert.equal(p.stages.length,0);s.cleanup();
});
test('replacement proposals can be declined and only explicit apply replaces personalized stages',async()=>{
 const p={...complete(),version:1};p.stages=[{name:'Uno',action:'Propia',measure:'A',content:'Original',target:100},{name:'Dos',action:'Cerrar',measure:'B',content:'Contrato',target:10}];const s=setup(p,{initialPanel:'campaign'});
 context(s).props.onGoal('QUOTES');await s.runtime.flush();assert.ok(find(s.runtime,n=>n.props?.['aria-label']===j.proposal));assert.equal(diagram(s).props.stages[0].content,'Original');
 s.button(j.keep).props.onClick();await s.runtime.flush();assert.equal(diagram(s).props.stages[0].target,100);s.button(j.suggest).props.onClick();await s.runtime.flush();s.button(j.apply).props.onClick();await s.runtime.flush();
 assert.equal(diagram(s).props.stages.at(-1).action,j.aQuote);assert.ok(diagram(s).props.stages.every(x=>x.target===null));assert.equal(p.stages[0].target,100);s.cleanup();
});
test('legacy plans use the same workspace without losing texts, channel or numeric targets',async()=>{
 const p={...campaign.newCampaignIdea(),version:7,name:'Anterior',objective:'Objetivo original',audience:'Público propio',channel:'OTHER',workshop:null,stages:[{name:'Uno',action:'Propia',measure:'A',target:100},{name:'Dos',action:'Cerrar',measure:'B',target:10}]};const s=setup(p);
 assert.equal(s.runtime.result.props.modalType,'operational-workspace');editor(s).props.onChange({content:'Texto nuevo'});await s.runtime.flush();await panel(s,'prompt');const draft=find(s.runtime,n=>n.type==='CampaignPromptTools').props.plan;
 assert.equal(draft.workshop,null);assert.equal(draft.channel,'OTHER');assert.equal(draft.objective,p.objective);assert.deepEqual(draft.stages.map(x=>x.target),[100,10]);assert.ok(draft.stages.every(x=>typeof x.content==='string'));assert.match(buildCampaignPrompt(draft,c,copy,'es-MX'),/Texto nuevo|Objetivo original/);s.cleanup();
});
test('stage reordering carries content and targets; deletion requires confirmation',async()=>{
 const p={...complete(),version:1,stages:journey.suggestJourney(complete(),j)};p.stages[0].content='Original';p.stages[0].target=100;const s=setup(p);
 editor(s).props.onMove(1);await s.runtime.flush();assert.equal(editor(s).props.stage.content,'Original');assert.equal(editor(s).props.stage.target,100);
 editor(s).props.onRemove();await s.runtime.flush();assert.equal(s.runtime.result.props.modalType,'confirmation');s.runtime.result.props.onOpenChange();await s.runtime.flush();assert.equal(diagram(s).props.stages.length,4);
 editor(s).props.onRemove();await s.runtime.flush();nodes(s.runtime.result.props.footer).find(n=>n.type==='Button'&&contains(n.props.children,copy.removeStage)).props.onClick();await s.runtime.flush();assert.equal(diagram(s).props.stages.length,3);assert.equal(p.stages.length,4);assert.equal(s.saves.length,0);s.cleanup();
});
test('legacy planned funnels accept optional targets but still require stage actions and measures',()=>{
 const p={...campaign.newCampaignIdea(),name:'Anterior',status:'PLANNED',objective:'Ventas',audience:'Clientes',workshop:null,stages:[{name:'A',action:'Visitar',measure:'Visitas',target:null},{name:'B',action:'Comprar',measure:'Compras',target:null}]};assert.equal(model.validateFunnel(p),null);assert.equal(model.previewConversion(p.stages),null);p.stages[0].measure='';assert.equal(model.validateFunnel(p),'incomplete');
});
test('all eight locales provide journey selectors, replacement controls and new campaign goals',()=>{
 const keys=Object.keys(journeyTranslations.en).sort();for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){const labels=journeyCopy(locale);assert.deepEqual(Object.keys(labels).sort(),keys);assert.ok(Object.values(labels).every(x=>typeof x==='string'&&x.length));assert.ok(campaignCopy(locale).goal_QUOTES);assert.ok(campaignCopy(locale).goal_RENEWALS);}
});
