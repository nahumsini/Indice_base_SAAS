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
  assert.deepEqual(schedulingTabIds,['calendar','clients','events','indicators']);
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
