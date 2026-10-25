import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTypeScriptLoader} from './helpers/loadTypeScript.mjs';
import {loadTypescript} from './helpers/hook-runtime.mjs';
const require=createRequire(import.meta.url),base=new URL('../src/app/ComplementaryModules/IdeasBoard/',import.meta.url),file=name=>new URL(name,base).pathname;
const load=createTypeScriptLoader({}, {crypto,Date}),m=load(file('fiveSFiltersModel.ts')),copy=load(file('fiveSFiltersCopy.ts'));
const make=(id,owner,status,dueDate,extra={})=>({id,text:id,fiveS:{role:'ACTION',templateId:'a',section:'SORT',action:id,owner,status,dueDate,...extra}});
const today='2026-10-25',rows=[
 make('Etiquetar archivo','Ángela','PENDING','2026-10-25'),make('Ordenar equipo','Ángela','IN_PROGRESS','2026-10-31'),
 make('Retirar duplicados','Luis','VERIFIED','2026-10-24'),make('Revisar contratos','Luis','PENDING','2026-10-24',{reviewDate:'2026-10-20'}),
 make('Otra semana','ALL','PENDING','2026-11-01',{reviewDate:'2026-11-01'}),make('Sin fecha',' ','PENDING',null),
];
const filters=patch=>({...m.defaultFiveSFilters,...patch}),ids=patch=>m.filterFiveSActions(rows,filters(patch),today).map(n=>n.id);
test('filters intersect search, documentary owner, exact status and inclusive target range without mutating records',()=>{
 const before=structuredClone(rows);
 assert.deepEqual(ids({search:'angela',owner:m.fiveSOwnerValue('Ángela'),status:'IN_PROGRESS',date:'CUSTOM',from:'2026-10-25',to:'2026-10-31'}),['Ordenar equipo']);
 assert.deepEqual(ids({search:'ARCHIVO',date:'TODAY'}),['Etiquetar archivo']);assert.deepEqual(rows,before);
});
test('owner options distinguish a literal ALL name, trim blanks and support unassigned actions',()=>{
 assert.equal(m.fiveSOwnerValue(' ALL '),'name:ALL');
 assert.deepEqual(ids({owner:'name:ALL'}),['Otra semana']);assert.deepEqual(ids({owner:'UNASSIGNED'}),['Sin fecha']);
 assert.equal(m.fiveSOwners(rows,'es').length,3);
});
test('local date presets include today and six following days, exclude undated and do not flag verified work as overdue',()=>{
 assert.deepEqual(ids({date:'NEXT_SEVEN'}),['Etiquetar archivo','Ordenar equipo']);
 assert.deepEqual(ids({date:'OVERDUE'}),['Revisar contratos']);assert.deepEqual(ids({date:'UNDATED'}),['Sin fecha']);
 assert.deepEqual(ids({date:'CUSTOM',from:'2026-10-24',to:'2026-10-24'}),['Retirar duplicados','Revisar contratos']);
 assert.equal(m.filterFiveSActions([make('Year boundary','','PENDING','2027-01-02')],filters({date:'NEXT_SEVEN'}),'2026-12-28').length,1);
});
test('custom ranges support a single bound and reject inverted dates without silently swapping them',()=>{
 assert.equal(ids({date:'CUSTOM',from:'2026-10-31'}).length,2);assert.equal(ids({date:'CUSTOM',to:'2026-10-24'}).length,2);
 assert.equal(m.invalidFiveSRange(filters({date:'CUSTOM',from:'2026-11-01',to:'2026-10-01'})),true);
 assert.equal(ids({date:'CUSTOM',from:'2026-11-01',to:'2026-10-01'}).length,0);
});
test('review preset preserves existing review-date semantics, including overdue reviews and day seven',()=>{
 assert.deepEqual(ids({date:'REVIEWS'}),['Revisar contratos','Otra semana']);
});
test('summary ignores only the selected status, so verified-only results do not manufacture a complete board',()=>{
 const progress=m.fiveSProgress(rows,filters({status:'VERIFIED'}),today);
 assert.equal(progress.total,6);assert.deepEqual({...progress.counts},{PENDING:4,IN_PROGRESS:1,VERIFIED:1});assert.equal(progress.percent,17);
 const scoped=m.fiveSProgress(rows,filters({owner:'name:Luis',status:'PENDING',date:'CUSTOM',from:'2026-10-24',to:'2026-10-24'}),today);
 assert.equal(scoped.total,2);assert.equal(scoped.percent,50);assert.equal(scoped.counts.VERIFIED,1);
 const empty=m.fiveSProgress(rows,filters({search:'unmatched'}),today);assert.equal(empty.total,0);assert.equal(empty.percent,0);
});
function elements(root){return[root,...[root?.props?.children,root?.props?.summary,root?.props?.resultSummary].flat(Infinity).filter(v=>v&&typeof v==='object').flatMap(elements)];}
function renderFilter(patch={}){
 const calls=[],f=filters(patch);
 const {FiveSFilters}=loadTypescript(file('FiveSFilters.tsx'),id=>{
  if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return{Circle:'circle',CircleCheck:'verified',CirclePlay:'play'};
  if(id.endsWith('/IndiceFilterBar'))return{IndiceFilterBar:'bar',IndiceFilterField:'field',IndiceFilterSearch:'search',IndiceFilterSelect:'select',getIndiceFilterControlClassName:()=>''};
  if(id.endsWith('/IndiceFilterDisclosure'))return{IndiceFilterDisclosureActions:'clear'};
  if(id==='./fiveSCopy')return load(file('fiveSCopy.ts'));if(id==='./fiveSFiltersCopy')return copy;if(id==='./fiveSFiltersModel')return m;if(id.endsWith('.css'))return{};throw Error(id);
 });
 const root=FiveSFilters({actions:rows,filters:f,locale:'es-MX',visibleCount:m.filterFiveSActions(rows,f,today).length,progress:m.fiveSProgress(rows,f,today),onChange:value=>calls.push(value)});
 return{root,calls,all:elements(root)};
}
test('native filter controls preserve other facets and clear restores every factory value',()=>{
 const h=renderFilter({search:'archivo',status:'PENDING',owner:'name:Ángela',date:'CUSTOM',from:today,to:today});
 assert.equal(h.all.filter(n=>n.type==='select').length,3);assert.equal(h.all.find(n=>n.type==='clear').props.showAdvancedToggle,false);
 h.all.find(n=>n.type==='select'&&n.props.label==='Responsable').props.onValueChange('name:Luis');assert.equal(h.calls.at(-1).search,'archivo');
 h.all.find(n=>n.type==='clear').props.onClear();assert.deepEqual({...h.calls.at(-1)},{...m.defaultFiveSFilters});
 assert.equal(h.all.filter(n=>n.type==='input'&&n.props.type==='date').length,2);
});
test('status facets are reversible, accessible and keep sibling counts discoverable',()=>{
 const h=renderFilter({status:'VERIFIED'}),buttons=h.all.filter(n=>n.type==='button');assert.equal(buttons.length,3);
 const verified=buttons.find(n=>n.props['data-status']==='VERIFIED');assert.equal(verified.props['aria-pressed'],true);verified.props.onClick();assert.equal(h.calls.at(-1).status,'ALL');
 buttons.find(n=>n.props['data-status']==='IN_PROGRESS').props.onClick();assert.equal(h.calls.at(-1).status,'IN_PROGRESS');
 const progress=h.all.find(n=>n.props?.role==='progressbar');assert.equal(progress.props['aria-valuenow'],17);assert.ok(progress.props['aria-valuetext'].includes('1 de 6'));
});
test('range errors and zero-result counts are exposed without hiding reset',()=>{
 const h=renderFilter({date:'CUSTOM',from:'2026-11-01',to:'2026-10-01'});
 assert.ok(h.all.find(n=>n.props?.role==='alert'));assert.equal(h.all.find(n=>n.type==='clear').props.hasActiveFilters,true);
 assert.equal(h.all.find(n=>n.props?.role==='status').props.children,'0 de 6 acciones');
});
test('filter labels cover all six languages with regional and unknown-language fallback',()=>{
 for(const locale of ['es-MX','en-US','fr-CA','pt-BR','ko-KR','zh-CN'])assert.ok(Object.values(copy.fiveSFiltersCopy(locale)).every(v=>typeof v==='string'&&v.trim()));
 assert.deepEqual(copy.fiveSFiltersCopy('xx'),copy.fiveSFiltersCopy('en'));assert.equal(copy.fiveSFilterText('{done} de {total}',{done:2,total:5}),'2 de 5');
});
