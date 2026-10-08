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
      if (name.endsWith("Messaging/copy"))
        return { messagingCopy: () => ({ title: "Messages" }) };
      if (name.endsWith("meetingCopy"))
        return load("translations/meetingCopy.ts");
      if (name.endsWith("meetingWorkflowCopy"))
        return load("translations/meetingWorkflowCopy.ts");
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
