import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTypescript } from "./helpers/hook-runtime.mjs";
const base = "src/app/ComplementaryModules/MinutesControl/";
const load = (path) =>
  loadTypescript(resolve(base + path), () => {
    throw new Error("Pure utilities must not access APIs");
  });
test("eight locales supply every native meeting label", () => {
  const { meetingLocales, getMeetingCopy } = load(
    "translations/meetingCopy.ts",
  );
  const expected = Object.keys(meetingLocales["en-CA"]);
  assert.equal(Object.keys(meetingLocales).length, 8);
  for (const c of Object.values(meetingLocales)) {
    assert.deepEqual(Object.keys(c), expected);
    assert.ok(Object.values(c).every((v) => typeof v === "string" && v.trim()));
  }
  assert.equal(getMeetingCopy("unknown"), meetingLocales["en-CA"]);
});
test("eight locales supply every planning, recurrence and consequence label", () => {
  const { meetingWorkflowLocales, getMeetingWorkflowCopy } = load(
    "translations/meetingWorkflowCopy.ts",
  );
  const expected = Object.keys(meetingWorkflowLocales["en-CA"]);
  assert.equal(Object.keys(meetingWorkflowLocales).length, 8);
  for (const c of Object.values(meetingWorkflowLocales)) {
    assert.deepEqual(Object.keys(c), expected);
    assert.ok(Object.values(c).every((v) => typeof v === "string" && v.trim()));
  }
  assert.equal(
    getMeetingWorkflowCopy("unknown"),
    meetingWorkflowLocales["en-CA"],
  );
});
test("planning preserves explicit delegation and builds a finite payload without UI state", () => {
  class ApiClientError extends Error {}
  const { initialPlanning, planningRequest } = loadTypescript(
    resolve(base + "utils/meetingPlanning.ts"),
    (name) => {
      if (name.endsWith("apiClient")) return { ApiClientError };
      if (name === "./dateScope") return load("utils/dateScope.ts");
      throw new Error("Unexpected dependency " + name);
    },
  );
  const form = {
    ...initialPlanning(42),
    title: "  Review outcomes  ",
    objective: "  Purpose  ",
    expectedResult: "  A decision  ",
    minutesOwnerId: 43,
    participantIds: [43],
    recurring: true,
    count: 3,
    saveFlow: true,
    flowName: "  Weekly review  ",
  };
  const body = planningRequest(
    form,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  assert.deepEqual(body.recurrence, {
    frequency: "WEEKLY",
    interval: 1,
    count: 3,
  });
  assert.equal(body.meeting.minutesOwnerId, 43);
  assert.equal(body.meeting.title, "Review outcomes");
  assert.equal(body.saveFlowName, "Weekly review");
  assert.equal(body.meeting.reminderMinutes, 0);
  assert.equal("recurring" in body.meeting, false);
  assert.equal("saveFlow" in body.meeting, false);
  assert.equal(
    Date.parse(body.meeting.endAt) - Date.parse(body.meeting.startAt),
    3600000,
  );
  assert.throws(
    () => planningRequest({ ...form, start: "2026-02-30T10:00" }, "UTC"),
    /meeting_time_gap/,
  );
});
test("workflow endpoints retain native CSRF client and do not introduce public meeting access", () => {
  const api = readFileSync(resolve(base + "services/meetingApi.ts"), "utf8");
  for (const path of [
    "/planning/preview",
    "/planning",
    "/flows",
    "/series",
    "future-planning",
  ])
    assert.ok(api.includes(path));
  assert.doesNotMatch(api, /fetch\(|localStorage|sessionStorage/);
  const modal = readFileSync(
    resolve(base + "components/MeetingPlanningModal.tsx"),
    "utf8",
  );
  assert.match(modal, /IndiceModalWizardStepper/);
  assert.match(modal, /standard-form/);
  assert.match(modal, /wizard/);
  assert.match(modal, /confirmation/);
  assert.doesNotMatch(modal, /localStorage|sessionStorage/);
});
test("generic meeting notification signals keep localized identity without business text", () => {
  const catalog = loadTypescript(
    resolve("src/app/components/notifications/notificationCatalog.ts"),
    (name) => {
      if (name === "./basicNotificationCatalog") return loadTypescript(resolve("src/app/components/notifications/basicNotificationCatalog.ts"));
      if (name.endsWith("opportunityReminderCopy"))
        return loadTypescript(resolve("src/app/BasicModules/Sales/Prospectos/translations/opportunityReminderCopy.ts"));
      if (name.endsWith("Messaging/copy"))
        return { messagingCopy: () => ({ title: "Messages" }) };
      if (name.endsWith("meetingCopy"))
        return load("translations/meetingCopy.ts");
      if (name.endsWith("meetingWorkflowCopy"))
        return load("translations/meetingWorkflowCopy.ts");
      if (name.endsWith("maintenanceCopy"))
        return loadTypescript(resolve("src/app/ComplementaryModules/Maintenance/translations/maintenanceCopy.ts"),
          () => loadTypescript(resolve("src/app/ComplementaryModules/Maintenance/translations/maintenanceLocales.ts")));
      if (name.endsWith("schedulingOperationsCopy") || name.endsWith("schedulingCopy"))
        return loadTypescript(resolve("src/app/ComplementaryModules/Scheduling/translations/" + name.split("/").at(-1) + ".ts"),
          dependency => loadTypescript(resolve("src/app/ComplementaryModules/Scheduling/translations/" + dependency.split("/").at(-1) + ".ts")));
      throw new Error("Unexpected dependency " + name);
    },
  );
  const { meetingWorkflowLocales } = load(
    "translations/meetingWorkflowCopy.ts",
  );
  for (const [locale, w] of Object.entries(meetingWorkflowLocales)) {
    const n = {
      module_slug: "control_minutas",
      source_subtype: "upcoming_meeting",
      title: "Generic only",
    };
    assert.equal(catalog.getNotificationModule(n, locale).color, "blue");
    assert.equal(catalog.getNotificationDisplayTitle(n, locale), w.upcoming);
    assert.equal(
      catalog.getNotificationDisplayTitle(
        { ...n, source_subtype: "missing_minutes" },
        locale,
      ),
      load("translations/meetingCopy.ts").getMeetingCopy(locale).missingMinutes,
    );
  }
});
test("existing complementary identity is activated without implicit grants or Root record migration", () => {
  const source = readFileSync(
    resolve(
      "../src/main/resources/db/migration/V302__meeting_control_complementary_pilot.sql",
    ),
    "utf8",
  );
  assert.match(source, /WHERE slug='control_minutas'/);
  assert.match(source, /lifecycle_status='pilot'/);
  assert.doesNotMatch(
    source,
    /INSERT INTO company_module_entitlements|INSERT INTO user_company_module_roles|internal_development/,
  );
  assert.match(
    readFileSync(resolve(base + "index.ts"), "utf8"),
    /MinutesControl/,
  );
  assert.doesNotMatch(
    readFileSync(resolve(base + "MinutesControl.tsx"), "utf8"),
    /mocks|PlatformAdmin|internalDevelopment/,
  );
});
test("calendar and instant scope reject impossible dates and survive DST months", () => {
  const { calendarDates, instantRange, dateInput } = load("utils/dateScope.ts");
  assert.equal(calendarDates("2026-03-01", "2026-03-31").length, 31);
  assert.equal(calendarDates("2026-11-01", "2026-11-30").length, 30);
  assert.equal(calendarDates("2028-02-01", "2028-02-29").length, 29);
  const range = instantRange("2026-10-07", "2026-10-07");
  assert.equal(dateInput(new Date(range.to)), "2026-10-08");
  for (const values of [
    ["2026-02-30", "2026-03-01"],
    ["", "2026-10-07"],
    ["2026-10-08", "2026-10-07"],
    ["2026-01-01", "2027-01-02"],
  ])
    assert.throws(() => instantRange(...values));
  assert.throws(() => calendarDates("2026-10-01", "2026-11-13"));
});
test("native tab permissions do not promote agreement-only access to minutes", () => {
  const { canAccessModuleTab } = loadTypescript(
    resolve("src/app/access/tabScopeCatalog.ts"),
    () => {
      throw new Error("Catalog must be pure");
    },
  );
  const session = {
    user: {
      role: "user",
      tab_permissions_configured: true,
      tab_permission_keys: ["control_minutas.agreements"],
    },
  };
  assert.equal(
    canAccessModuleTab("minutes-control", "agreements", session),
    true,
  );
  assert.equal(
    canAccessModuleTab("minutes-control", "meetings", session),
    false,
  );
  assert.equal(
    canAccessModuleTab("minutes-control", "indicators", session),
    false,
  );
});
test("operational tables use the native engine and retain scoped safe presentation memory", () => {
  const source = readFileSync(
    resolve(base + "components/MeetingList.tsx"),
    "utf8",
  );
  for (const symbol of [
    "IndiceOperationalTable",
    "IndiceTableHeaderRow",
    "IndiceTableShell",
    "DataTablePagination",
  ])
    assert.match(source, new RegExp(symbol));
  for (const file of [
    "tabs/MeetingsTab.tsx",
    "tabs/AgreementsTab.tsx",
    "tabs/IndicatorsTab.tsx",
  ])
    assert.match(
      readFileSync(resolve(base + file), "utf8"),
      /useWorkspaceNavigationMemory/,
    );
});

test('meeting calendar shortcuts respect Monday weeks, leap years and year boundaries',()=>{
  const {meetingCalendarPeriod}=load('utils/dateScope.ts');
  assert.deepEqual(meetingCalendarPeriod('2028-02-29','month'),{from:'2028-02-01',to:'2028-02-29'});
  assert.deepEqual(meetingCalendarPeriod('2026-01-01','week'),{from:'2025-12-29',to:'2026-01-04'});
  assert.deepEqual(meetingCalendarPeriod('2026-03-08','day'),{from:'2026-03-08',to:'2026-03-08'});
  assert.throws(()=>meetingCalendarPeriod('2026-02-30','month'));
});
test('meeting workspace copy is complete in every supported locale',()=>{
  const {meetingWorkspaceCopyLocales:copies,getMeetingWorkspaceCopy:get}=load('translations/meetingWorkspaceCopy.ts');
  assert.equal(Object.keys(copies).length,8);
  for(const copy of Object.values(copies)){assert.deepEqual(Object.keys(copy),Object.keys(copies['en-CA']));assert.ok(Object.values(copy).every(value=>typeof value==='string'&&value.trim()));}
  assert.equal(get('unknown'),copies['en-CA']);
});

test('live meeting copy covers native locales and uses English for an unknown locale', () => {
  const { getMeetingLiveCopy: get } = load('translations/meetingLiveCopy.ts');
  const keys = Object.keys(get('en-CA'));
  for (const locale of ['en-CA','en-US','es-MX','es-CO','fr-CA','pt-BR','ko-CA','zh-CA']) {
    assert.deepEqual(Object.keys(get(locale)), keys);
    assert.ok(Object.values(get(locale)).every(value => typeof value === 'string' && value.trim()));
  }
  assert.deepEqual(get('unknown'), get('en-CA'));
  assert.equal(get('es-MX').unmarked, 'Sin registrar');
  assert.notEqual(get('ko-CA').attendance, get('es-MX').attendance);
});

test('meeting client preserves explicit disabled follow-up and attendance version', async () => {
  const calls = [];
  const {meetingApi: api} = loadTypescript(resolve(base+'services/meetingApi.ts'), name => {
    assert.ok(name.endsWith('/apiClient'));
    return {apiClient: async (path, options) => { calls.push({path, options}); return {}; }};
  });
  await api.agreement({meetingId:17,title:'Send revised quote',assigneeId:42,dueDate:'2026-10-30',followupEnabled:false},'fixed-synthetic-request-key');
  assert.equal(JSON.parse(calls[0].options.body).followupEnabled,false);
  assert.equal(calls[0].options.headers['Idempotency-Key'],'fixed-synthetic-request-key');
  await api.saveAttendance(17,{expectedVersion:9,entries:[{userId:42,status:'ABSENT'}]});
  assert.equal(calls[1].path,'/api/v1/meetings/17/attendance');
  assert.equal(calls[1].options.method,'PUT');
  assert.deepEqual(JSON.parse(calls[1].options.body),{expectedVersion:9,entries:[{userId:42,status:'ABSENT'}]});
});

test('late availability responses are hidden after participants or tenant change', async () => {
  const {hookRuntime} = await import('./helpers/hook-runtime.mjs');
  const runtime = hookRuntime(), pending = [];
  let revision = 1;
  const jsx = (type, props) => ({type,props});
  const {MeetingAvailability} = loadTypescript(resolve(base+'components/MeetingAvailability.tsx'), name => {
    if(name==='react')return runtime.hooks;
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
    if(name.endsWith('apiClient'))return {ApiClientError:class extends Error {}};
    if(name.endsWith('useAuthorizationRevision'))return {useAuthorizationRevision:()=>revision};
    if(name.endsWith('meetingApi'))return {meetingApi:{availability:()=>new Promise(resolve=>pending.push(resolve))}};
    if(name.endsWith('meetingPlanning'))return {planningRequest: form => ({meeting:form}),dateTimeInput:()=>''};
    if(name.endsWith('meetingLiveCopy'))return load('translations/meetingLiveCopy.ts');
    if(name.endsWith('MeetingPrimitives'))return {Action:'Action',Feedback:'Feedback'};
    throw new Error(name);
  });
  let form={start:'2026-10-30T10:00',duration:60,ownerId:42,minutesOwnerId:42,participantIds:[43]};
  const render=()=>MeetingAvailability({form,zone:'UTC',locale:'es-MX',copy:{loading:'Loading',error:'Error'},update:()=>{}});
  function nodes(node) {if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
  runtime.render(render);
  const button=()=>nodes(runtime.result).find(n=>n.type==='Action');
  const event={currentTarget:{closest:()=>({reportValidity:()=>true})}};
  const first=button().props.onClick(event); await runtime.flush();
  form={...form,participantIds:[44]};runtime.render(render);
  pending.shift()({available:true,alternatives:[],timezone:'UTC'});await first;await runtime.flush();
  assert.equal(nodes(runtime.result).some(n=>n.type==='Feedback'),false);
  const second=button().props.onClick(event);await runtime.flush();
  revision=2;runtime.render(render);
  pending.shift()({available:true,alternatives:[],timezone:'UTC'});await second;await runtime.flush();
  assert.equal(nodes(runtime.result).some(n=>n.type==='Feedback'),false);
  runtime.unmount();
});
