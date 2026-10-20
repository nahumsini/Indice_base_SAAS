import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadTypescript } from './helpers/hook-runtime.mjs';

const load = path => loadTypescript(resolve(`src/app/ComplementaryModules/Scheduling/${path}`), request => {
  if(request==='./schedulingWorkspaceCopy')return load('translations/schedulingWorkspaceCopy.ts');
  if(request==='./dateScope')return load('utils/dateScope.ts');
  if(request==='../../../access/tabScopeCatalog')return loadTypescript(resolve('src/app/access/tabScopeCatalog.ts'),()=>{throw new Error('Tab catalog must be pure');});
  throw new Error('Pure scheduling utilities cannot access business APIs');
});
test('one agenda tab preserves independent calendar, reservation and setup permissions', () => {
  const {schedulingTabIds,schedulingAccess}=load('utils/schedulingNavigation.ts');
  const session=(keys,role='user')=>({user:{role,tab_permissions_configured:true,tab_permission_keys:keys}});
  assert.deepEqual(schedulingTabIds,['calendar','events','clients','indicators']);
  const reader=schedulingAccess(session(['scheduling.calendar']));
  assert.deepEqual(reader.tabs,['calendar']);assert.equal(reader.canRead,true);assert.equal(reader.canCapture,false);assert.equal(reader.canConfigure,false);assert.equal(reader.readScope,'calendar');
  const operator=schedulingAccess(session(['scheduling.reservations']));
  assert.deepEqual(operator.tabs,['calendar']);assert.equal(operator.agendaScope,'reservations');assert.equal(operator.canCapture,true);assert.equal(operator.readScope,'reservations');
  const setup=schedulingAccess(session(['scheduling.configuration'],'admin'));
  assert.deepEqual(setup.tabs,['calendar']);assert.equal(setup.agendaScope,'configuration');assert.equal(setup.canConfigure,true);assert.equal(setup.canRead,false);
  assert.deepEqual(schedulingAccess(session(['scheduling.configuration'])).tabs,[]);
  assert.deepEqual(schedulingAccess(null).tabs,[]);
});
test('legacy reservation links retain period, status and explicit view in the unified agenda',()=>{
  const {schedulingLegacySearch}=load('utils/schedulingNavigation.ts');
  const params=new URLSearchParams(schedulingLegacySearch('reservations','?from=2026-10-01&to=2026-10-31&status=CONFIRMED'));
  assert.equal(params.get('view'),'table');assert.equal(params.get('from'),'2026-10-01');assert.equal(params.get('to'),'2026-10-31');assert.equal(params.get('status'),'CONFIRMED');
  assert.equal(new URLSearchParams(schedulingLegacySearch('reservations','?view=calendar')).get('view'),'calendar');
  assert.equal(schedulingLegacySearch('configuration',''),'');
});
test('shared clients reuse Sales and require its native module and client permission',()=>{
  const {canUseSalesClients}=load('utils/schedulingNavigation.ts');
  const root={user:{role:'superadmin'}};
  const operator={user:{role:'admin',tab_permissions_configured:true,tab_permission_keys:['scheduling.clients','crm.contacts']}};
  assert.equal(canUseSalesClients(root,[{slug:'crm',locked:false}]),true);
  assert.equal(canUseSalesClients(root,[]),false);
  assert.equal(canUseSalesClients(root,[{slug:'crm',locked:true}]),false);
  assert.equal(canUseSalesClients(operator,[{slug:'crm'}]),true);
  assert.equal(canUseSalesClients({...operator,user:{...operator.user,tab_permission_keys:['scheduling.clients']}},[{slug:'crm'}]),false);
  const clients=readFileSync(resolve('src/app/ComplementaryModules/Scheduling/tabs/ClientsTab.tsx'),'utf8');
  assert.match(clients,/BasicModules\/Sales\/Contactos/);assert.match(clients,/<SalesCrmProvider>/);assert.match(clients,/<SalesDataStateBoundary>/);
  assert.doesNotMatch(clients,/schedulingApi\.clients|TableRow|ContactFormModal/);
});
test('scheduling is a native complementary ERP module, not an isolated dashboard fallback', () => {
  const catalog=loadTypescript(resolve('src/app/config/moduleCatalog.ts'),()=>{throw new Error('Catalog must be pure');});
  const t={modules:{scheduling:'Agenda y eventos'},dashboard:{},sections:{}};
  const card=catalog.mapBackendModuleToCard({slug:'scheduling',name:'Agenda y eventos',category:'complementary',url:'/scheduling'},t);
  assert.equal(card.route,'scheduling');assert.equal(card.category,'complementary');assert.equal(card.title,'Agenda y eventos');assert.equal(card.color,'coral');assert.equal(card.emoji,'📅');
  assert.deepEqual(catalog.mergeDashboardModules([], [card],{includeMissingFallbacks:false}),[]);
  assert.deepEqual(catalog.mergeDashboardModules([card],[],{includeMissingFallbacks:false}),[card]);
  const app=readFileSync(resolve('src/app/App.tsx'),'utf8');
  assert.match(app,/currentPage === 'scheduling'/);
  assert.match(app,/ComplementaryModules\/Scheduling\/Scheduling/);
  const migration=readFileSync(resolve('../src/main/resources/db/migration/V300__scheduling_complementary_module_pilot.sql'),'utf8');
  assert.match(migration,/'complementary','pilot','tabs',1,'scheduling'/);
  assert.doesNotMatch(migration,/INSERT INTO company_module_entitlements|INSERT INTO user_company_module_roles/);
});
test('private scheduling uses canonical coral identity and shared title/filter/modal presentation',()=>{
  const {schedulingTone,schedulingEmoji}=load('utils/schedulingIdentity.ts');
  assert.equal(schedulingTone,'coral');
  assert.deepEqual(schedulingEmoji,{calendar:'📅',clients:'👥',events:'🎟️',indicators:'📊',services:'🛠️',team:'👥',publicAgenda:'🌐'});
  const source=path=>readFileSync(resolve(`src/app/ComplementaryModules/Scheduling/${path}`),'utf8');
  for(const path of ['Scheduling.tsx','tabs/ReservationsTab.tsx','tabs/EventsTab.tsx','tabs/IndicatorsTab.tsx','components/AgendaConfigurationModal.tsx','components/PublicAgendaModal.tsx','components/InternalBookingModal.tsx','components/ReservationReview.tsx','components/SchedulingPrimitives.tsx']){
    assert.match(source(path),/tone=\{schedulingTone\}/,path);assert.doesNotMatch(source(path),/tone="blue"/,path);
  }
  const agenda=source('tabs/ReservationsTab.tsx');
  assert.match(agenda,/<IndiceFilterSelect tone=\{schedulingTone\}/);assert.match(agenda,/<IndiceFilterDisclosureActions/);
  assert.match(agenda,/<IndiceFilterAdvancedSection/);assert.match(agenda,/titleActions\.slice\(0,3\)/);assert.match(agenda,/titleActions\.slice\(3\)/);
  assert.match(source('components/SchedulingPrimitives.tsx'),/getIndiceFilterControlClassName\(schedulingTone\)/);
  const calendar=readFileSync(resolve('src/app/components/frontend-os/IndiceCalendarSurface.tsx'),'utf8');
  assert.match(calendar,/tone = 'blue'/);assert.match(calendar,/MODULE_COLORS\[tone\]/);
  assert.match(source('components/InternalBookingModal.tsx'),/<BookingForm tone=\{schedulingTone\}/);
  assert.match(source('components/BookingForm.tsx'),/tone = 'blue'/);
});
test('all eight locales provide every scheduling label and fallback is explicit', () => {
  const { schedulingCopies, getSchedulingCopy } = load('translations/schedulingCopy.ts');
  const keys = Object.keys(schedulingCopies['en-CA']).sort();
  for (const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']) {
    assert.deepEqual(Object.keys(schedulingCopies[locale]).sort(), keys);
    for (const value of Object.values(schedulingCopies[locale])) assert.ok(typeof value === 'string' && value.trim());
  }
  assert.equal(getSchedulingCopy('unknown'), schedulingCopies['en-CA']);
});
test('calendar periods follow real months, Monday weeks and bounded day ranges', () => {
  const {calendarPeriod,calendarDates}=load('utils/calendarScope.ts');
  assert.deepEqual(calendarPeriod('2028-02-29','month'),{from:'2028-02-01',to:'2028-02-29'});
  assert.deepEqual(calendarPeriod('2026-01-01','week'),{from:'2025-12-29',to:'2026-01-04'});
  assert.deepEqual(calendarPeriod('2026-10-06','day'),{from:'2026-10-06',to:'2026-10-06'});
  assert.equal(calendarDates('2026-03-01','2026-03-31').length,31);
  assert.equal(calendarDates('2026-10-01','2026-11-11').length,42);
  assert.throws(()=>calendarDates('2026-10-01','2026-11-12'));
  assert.throws(()=>calendarPeriod('2026-02-30','month'));
});
test('public appearance accepts only hex colors and chooses readable foregrounds', () => {
  const {publicAppearanceStyle,contrastingText}=load('utils/publicAppearance.ts');
  assert.equal(contrastingText('#000000'),'#FFFFFF');
  assert.equal(contrastingText('#FFFFFF'),'#000000');
  const unsafe=publicAppearanceStyle({accentColor:'url(javascript:alert(1))',surfaceColor:'red;display:none'});
  assert.equal(unsafe['--scheduling-accent'],'#2563EB');
  assert.equal(unsafe['--scheduling-surface'],'#F8FAFC');
});
test('date scopes are exclusive, bounded and reject impossible dates', () => {
  const { dateScope, dateInput } = load('utils/dateScope.ts');
  const range = dateScope('2026-10-06','2026-10-06');
  assert.equal(dateInput(new Date(range.from)), '2026-10-06');
  assert.equal(dateInput(new Date(range.to)), '2026-10-07');
  for (const [from,to] of [['2026-02-30','2026-03-01'],['','2026-10-06'],['2026-10-08','2026-10-06'],['2025-01-01','2026-01-02']]) assert.throws(() => dateScope(from,to));
});

test('event workspace searches names without accents, filters and sorts the entire loaded set before paging',()=>{
  const {selectEvents,defaultEventScope,eventState}=load('utils/eventWorkspace.ts');
  const event=(id,title,startAt,confirmedCount=0,extra={})=>({id,title,startAt,confirmedCount,description:'',staffId:1,published:true,status:'ACTIVE',capacity:20,...extra});
  const events=[event(3,'Ágora','2026-10-20T10:00:00Z',12),event(1,'Beta','2026-10-10T10:00:00Z',3),event(2,'Beta','2026-10-20T10:00:00Z',12),event(4,'Cancelado','2026-10-20T10:00:00Z',0,{status:'CANCELLED'}),event(5,'Borrador','2026-10-20T10:00:00Z',0,{published:false})];
  const staff=[{id:1,publicName:'José'}], now=Date.parse('2026-10-19T12:00:00Z');
  const ids=scope=>selectEvents(events,staff,{...defaultEventScope,...scope},'es-MX',now).map(event=>event.id);
  assert.deepEqual(ids({search:'agora'}),[3]);assert.equal(ids({search:'jose'}).length,5);
  assert.deepEqual(ids({period:'past'}),[1]);assert.deepEqual(ids({period:'upcoming',status:'published'}),[2,3]);
  assert.deepEqual(ids({status:'draft'}),[5]);assert.equal(eventState(events[3]),'cancelled');
  assert.deepEqual(selectEvents(events,staff,{...defaultEventScope,sort:'status'},'es-MX',now,{cancelled:'Cancelada',published:'Publicado',draft:'Sin publicar'}).map(event=>event.id),[4,1,2,3,5]);
  assert.deepEqual(ids({sort:'capacity',direction:'desc'}),[2,3,1,4,5]);
  assert.deepEqual(ids({staff:999}),[]);assert.deepEqual(ids({sort:'title',direction:'desc'}),[4,5,1,2,3]);
  assert.deepEqual(events.map(event=>event.id),[3,1,2,4,5],'sorting never mutates owner records');
});
test('restored event filters validate scope values and keep view settings separate from records',()=>{
  const {restoreEventScope,defaultEventScope}=load('utils/eventWorkspace.ts');
  const restored=restoreEventScope({...defaultEventScope,view:'table',staff:'2',status:'cancelled',sort:'capacity',direction:'desc',size:50,widths:{title:350},page:3});
  assert.equal(restored.view,'table');assert.equal(restored.staff,2);assert.equal(restored.widths.title,350);assert.equal(restored.widths.start,240);
  const invalid=restoreEventScope({search:'x'.repeat(300),view:'unknown',staff:-1,status:'bogus',page:0,size:999,sort:'__proto__',widths:{title:-12}});
  assert.equal(invalid.search.length,180);assert.equal(invalid.page,1);assert.equal(invalid.sort,'start');assert.equal(invalid.widths.title,300);
});
test('event experience labels cover all supported locales',()=>{
  const {schedulingExperienceCopyLocales:copies,getSchedulingExperienceCopy:get}=load('translations/schedulingExperienceCopy.ts');
  assert.equal(Object.keys(copies).length,8);
  for(const copy of Object.values(copies)){assert.deepEqual(Object.keys(copy),Object.keys(copies['en-CA']));assert.ok(Object.values(copy).every(value=>typeof value==='string'&&value.trim()));}
  assert.equal(get('unknown'),copies['en-CA']);
});


test('calendar range labels work without formatRange and show a single date only once', () => {
  const { calendarRangeLabel } = load('utils/calendarScope.ts');
  const original = Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, 'formatRange');
  Object.defineProperty(Intl.DateTimeFormat.prototype, 'formatRange', { value: undefined, configurable: true });
  try {
    for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) {
      const format = date => new Intl.DateTimeFormat(locale, {dateStyle:'medium'}).format(new Date(`${date}T12:00:00`));
      assert.equal(calendarRangeLabel('2026-10-19','2026-10-19',locale),format('2026-10-19'));
      assert.equal(calendarRangeLabel('2026-10-31','2026-11-02',locale),`${format('2026-10-31')} — ${format('2026-11-02')}`);
    }
    assert.throws(()=>calendarRangeLabel('2026-02-30','2026-03-01','es-MX'));
    assert.throws(()=>calendarRangeLabel('2026-10-21','2026-10-19','es-MX'));
  } finally {
    if(original)Object.defineProperty(Intl.DateTimeFormat.prototype,'formatRange',original);
    else delete Intl.DateTimeFormat.prototype.formatRange;
  }
});

test('restored event sorting does not require Object.hasOwn and rejects inherited keys', () => {
  const { restoreEventScope, defaultEventScope } = load('utils/eventWorkspace.ts');
  const original = Object.hasOwn;
  Object.hasOwn = undefined;
  try {
    for(const sort of ['__proto__','constructor','toString'])assert.equal(restoreEventScope({...defaultEventScope,sort}).sort,'start');
    for(const sort of Object.keys(defaultEventScope.widths))assert.equal(restoreEventScope({...defaultEventScope,sort}).sort,sort);
  } finally { Object.hasOwn=original; }
});
