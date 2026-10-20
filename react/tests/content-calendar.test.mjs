import assert from 'node:assert/strict';
import test from 'node:test';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';
const root = new URL('../src/app/BasicModules/Sales/Funneling/',import.meta.url);
const campaign = loadTypescript(new URL('campaignModel.ts',root).pathname,()=>{throw Error('import');});
const campaignCopy = loadTypescript(new URL('campaignCopy.ts',root).pathname,()=>{throw Error('import');});
const copy = loadTypescript(new URL('calendar/contentCalendarCopy.ts',root).pathname,()=>{throw Error('import');});
const model = loadTypescript(new URL('calendar/contentCalendarModel.ts',root).pathname,id => id.endsWith('campaignCopy') ? campaignCopy : copy);
const plan = {...campaign.newCampaignIdea(),name:'Consulting',audience:'Local businesses',id:'one'};
test('calendar dates handle leap years, month boundaries and Monday-first weeks without UTC shifting',()=>{
  assert.equal(model.validDate('2026-02-30'),false);
  assert.equal(model.validDate('2028-02-29'),true);
  assert.equal(model.validDate('2101-01-01'),false);
  assert.equal(model.dateInZone('America/Toronto',new Date('2026-10-20T01:00:00Z')),'2026-10-19');
  assert.equal(model.shiftPeriod('2026-01-31','month',1),'2026-02-01');
  assert.deepEqual(model.calendarDays('2026-10-18','week'),['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18']);
});
test('suggestions follow selected capacity and channel-compatible formats and do not mutate the campaign',()=>{
  const before=structuredClone(plan),settings={...model.defaultSettings(plan,'2026-10-19'),topic:'Consulting',channels:['INSTAGRAM','FACEBOOK','GOOGLE_SEARCH'],formats:['REEL','STORY','META_AD','SEARCH_AD']};
  const entries=model.suggestContent(plan,settings,'es-MX');
  assert.equal(entries.length,6);
  assert.deepEqual(entries.map(row=>row.date),['2026-10-19','2026-10-21','2026-10-23','2026-10-26','2026-10-28','2026-10-30']);
  assert.equal(new Set(entries.map(row=>row.id)).size,6);
  for(const row of entries){assert.ok(model.compatibleFormat(row.channel,row.format));assert.ok(model.validEntry(row));assert.equal(row.time,'10:00');assert.ok(row.brief.includes('Local businesses'));}
  assert.deepEqual(plan,before);
  assert.equal(model.suggestContent(plan,{...settings,channels:['GOOGLE_SEARCH'],formats:['REEL']},'es-MX').length,0);
  assert.equal(model.validSettings({...settings,startDate:'2100-12-31'}),false);
});
test('ideas can be undated but planned/ready pieces need a real date and compatible channel',()=>{
  const entry=model.newContentEntry(null);entry.title='Idea';
  assert.ok(model.validEntry(entry));
  assert.equal(model.validEntry({...entry,status:'READY'}),false);
  assert.equal(model.validEntry({...entry,date:'2026-10-19',time:'24:00'}),false);
  assert.equal(model.validEntry({...entry,reference:'javascript:alert(1)'}),false);
  assert.ok(model.validEntry({...entry,date:'2026-10-19',status:'READY'}));
});
test('all eight locales have complete calendar labels and localized suggestions',()=>{
  for(const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']){
    const c=copy.contentCalendarCopy(locale);
    assert.deepEqual(Object.keys(c),Object.keys(copy.contentCalendarCopy('es-MX')));
    for(const group of [c.formats,c.statuses,c.purposes,c.guidance,c.production])for(const value of Object.values(group))assert.ok(value.length);
    const result=model.suggestContent(plan,{...model.defaultSettings(plan,'2026-10-19'),topic:'Example'},locale);
    assert.ok(result[0].title.startsWith(c.themes[0]));
  }
});
class ApiError extends Error{constructor(status){super('Synthetic');this.status=status;}}
async function setup(save){
  globalThis.window=new EventTarget();
  const runtime=hookRuntime(),guard={current:null};
  const initial={content:{timeZone:'UTC',settings:null,entries:[]},version:1,actorKey:'1:2',updatedAt:null};
  const {useContentCalendar}=loadTypescript(new URL('calendar/useContentCalendar.ts',root).pathname,id=>{
    if(id==='react')return runtime.hooks;if(id.endsWith('/apiClient'))return{ApiClientError:ApiError};
    if(id==='./contentCalendarApi')return{contentCalendarApi:{get:async()=>initial,save}};
    throw Error(id);
  });
  runtime.render(()=>useContentCalendar('one',guard));await runtime.flush();
  return{runtime,guard,get editor(){return runtime.result;}};
}
test('uncertain save retries reuse the same mutation; navigation and edits wait while saving',async()=>{
  const requests=[];let release;
  const s=await setup(async(id,input,key)=>{requests.push({id,input:structuredClone(input),key});if(requests.length===1)throw Error('lost');await new Promise(r=>release=r);return{content:input.content,version:2,actorKey:key};});
  const entry={...model.newContentEntry(null),title:'Draft'};
  s.editor.update({...s.editor.draft,entries:[entry]});await s.runtime.flush();
  await s.editor.save();await s.runtime.flush();assert.equal(s.editor.error,'save');
  const pending=s.editor.save();await s.runtime.flush();await s.editor.save();
  let changed=false;s.guard.current(()=>changed=true);assert.equal(changed,false);assert.equal(requests.length,2);
  assert.deepEqual(requests[0],requests[1]);release();await pending;await s.runtime.flush();assert.equal(s.editor.dirty,false);s.runtime.unmount();
});
test('dirty calendar navigation requires explicit discard and conflict retains the draft',async()=>{
  const s=await setup(async()=>{throw new ApiError(409);});
  s.editor.update({...s.editor.draft,entries:[{...model.newContentEntry(null),title:'Keep me'}]});await s.runtime.flush();
  let navigated=false;s.guard.current(()=>navigated=true);await s.runtime.flush();assert.equal(s.editor.pending,true);s.editor.keepEditing();await s.runtime.flush();assert.equal(navigated,false);
  await s.editor.save();await s.runtime.flush();assert.equal(s.editor.error,'conflict');assert.equal(s.editor.draft.entries[0].title,'Keep me');
  s.guard.current(()=>navigated=true);await s.runtime.flush();s.editor.discard();await s.runtime.flush();assert.equal(navigated,true);s.runtime.unmount();
});
