import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createServer } from "vite";
const { chromium } = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5196";
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: resolve(
    import.meta.dirname,
    "../node_modules/.vite-meeting-browser",
  ),
  server: { host: "127.0.0.1", port: 5196, strictPort: true },
  define: { "import.meta.env.VITE_API_BASE_URL": '""' },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.INDICE_CHROME_PATH
      ? { executablePath: process.env.INDICE_CHROME_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Toronto",
  });
  page.setDefaultTimeout(20000);
  await page.addInitScript(() =>
    localStorage.setItem("frontend-indice-language", "es-MX"),
  );
  const errors = [],
    unexpected = [],
    creates = [],
    calls = [];
  let failOnce = true,
    role = "superadmin",
    actorId = 42,
    permissionKeys = [];
  let flowRows = [],
    seriesRows = [];
  const reviewed = (plan) => ({
    count: plan.recurrence?.count ?? 1,
    timezone: plan.meeting.timezone,
    monthlyClamp: false,
    overlapUsesEarlierOffset: false,
    occurrences: Array.from(
      { length: plan.recurrence?.count ?? 1 },
      (_, i) => ({
        number: i + 1,
        startAt: new Date(
          Date.parse(plan.meeting.startAt) + i * 7 * 86400000,
        ).toISOString(),
        endAt: new Date(
          Date.parse(plan.meeting.endAt) + i * 7 * 86400000,
        ).toISOString(),
        conflicts: 0,
      }),
    ),
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const now = new Date(),
    start = new Date(now);
  start.setHours(14, 0, 0, 0);
  const people = [
    { id: 42, name: "Responsable sintético" },
    { id: 43, name: "Participante sintético" },
  ];
  let meetings = [
    {
      id: 1,
      title: "Junta de estrategia",
      meetingType: "WORKING",
      status: "PLANNED",
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 3600000).toISOString(),
      timezone: "America/Toronto",
      ownerId: 42,
      ownerName: people[0].name,
      participantCount: 1,
      hasMinutes: false,
      version: 1,
    },
  ];
  const texts = new Map([
    [
      1,
      {
        agenda: "Prioridades del trimestre",
        location: "Sala de prueba",
        minutes: "",
        decisions: "",
        participants: [people[1]],
        history: [],
      },
    ],
  ]);
  let agreements = [
    {
      id: 1,
      meetingId: 1,
      meetingTitle: meetings[0].title,
      title: "Preparar seguimiento",
      assigneeId: 43,
      assigneeName: people[1].name,
      dueDate: start.toISOString().slice(0, 10),
      status: "OPEN",
      resolution: "",
      version: 1,
      meetingOwnerId: 42,
    },
  ];
  const detail = (id) => ({
    meeting: meetings.find((m) => m.id === id),
    ...texts.get(id),
  });
  await page.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    if (url.origin !== origin) return route.abort();
    if (!path.startsWith("/api/")) return route.continue();
    calls.push(req.method() + " " + path);
    const ok = (json) => route.fulfill({ json });
    if (path === "/api/v1/auth/me")
      return ok({
        user: {
          id: actorId,
          name: people[0].name,
          role,
          tab_permissions_configured: true,
          tab_permission_keys: permissionKeys,
        },
        company: { id: 8, name: "Empresa sintética", active: true, role },
        csrfToken: "synthetic-csrf",
      });
    if (path.startsWith("/api/v1/workspace-state/"))
      return ok({ state: {}, schemaVersion: 1 });
    if (path === "/api/v1/modules")
      return ok([
        {
          slug: "control_minutas",
          name: "Control de juntas",
          category: "complementary",
          locked: false,
        },
      ]);
    if (path.startsWith("/api/v1/meetings")) {
      const tail = path.slice("/api/v1/meetings".length);
      if (req.method() !== "GET")
        assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
      if (tail === "/members")
        return ok({ items: people, total: people.length });
      if (tail === "/flows" && req.method() === "GET") return ok(flowRows);
      if (tail === "/series" && req.method() === "GET")
        return ok({
          items: seriesRows,
          total: seriesRows.length,
          page: 1,
          pageSize: 25,
        });
      if (/^\/flows\/\d+\/archive$/.test(tail)) {
        const id = Number(tail.split("/")[2]);
        flowRows = flowRows.filter((f) => f.id !== id);
        return ok({});
      }
      if (/^\/series\/\d+\/control$/.test(tail)) {
        const row = seriesRows.find((s) => s.id === Number(tail.split("/")[2])),
          body = req.postDataJSON();
        assert.equal(row.version, body.expectedVersion);
        row.version++;
        if (body.action === "CANCEL_FUTURE") {
          assert.ok(body.reason.length >= 3);
          row.status = "CANCELLED";
          for (const m of meetings)
            if (
              texts.get(m.id)?.planning?.seriesId === row.id &&
              m.status === "PLANNED"
            )
              m.status = "CANCELLED";
        } else row.remindersPaused = body.action === "PAUSE_REMINDERS";
        return ok({});
      }
      if (tail === "/planning/preview") return ok(reviewed(req.postDataJSON()));
      if (/^\/\d+\/future-planning(?:\/preview)?$/.test(tail)) {
        const id = Number(tail.split("/")[1]),
          pivot = meetings.find((m) => m.id === id),
          body = req.postDataJSON(),
          meta = texts.get(id).planning;
        const rows = meetings.filter(
          (m) =>
            texts.get(m.id)?.planning?.seriesId === meta.seriesId &&
            Date.parse(m.startAt) >= Date.parse(pivot.startAt) &&
            m.status === "PLANNED",
        );
        const delta =
            Date.parse(body.meeting.startAt) - Date.parse(pivot.startAt),
          duration =
            Date.parse(body.meeting.endAt) - Date.parse(body.meeting.startAt);
        const preview = {
          count: rows.length,
          timezone: body.meeting.timezone,
          monthlyClamp: false,
          overlapUsesEarlierOffset: false,
          occurrences: rows.map((m, i) => ({
            number: i + 1,
            startAt: new Date(Date.parse(m.startAt) + delta).toISOString(),
            endAt: new Date(
              Date.parse(m.startAt) + delta + duration,
            ).toISOString(),
            conflicts: 0,
          })),
        };
        if (tail.endsWith("/preview")) return ok(preview);
        const series = seriesRows.find((s) => s.id === meta.seriesId);
        assert.equal(body.expectedSeriesVersion, series.version);
        series.version++;
        rows.forEach((row, i) => {
          Object.assign(row, body.meeting, preview.occurrences[i], {
            id: row.id,
            version: row.version + 1,
          });
          texts.get(row.id).planning.seriesVersion = series.version;
        });
        return ok(detail(id));
      }
      if (tail === "/agreement-assignees")
        return ok({ items: people, total: people.length });
      if (tail === "/agreement-meetings")
        return ok(
          meetings
            .filter((m) => m.status !== "CANCELLED")
            .map((m) => ({ id: m.id, title: m.title, participants: people })),
        );
      if (tail === "/metrics")
        return ok({
          planned: meetings.filter((m) => m.status === "PLANNED").length,
          inProgress: 0,
          completed: meetings.filter((m) => m.status === "COMPLETED").length,
          cancelled: 0,
          awaitingClosure: 0,
          missingMinutes: 0,
          openAgreements: agreements.filter((a) => a.status === "OPEN").length,
          overdueAgreements: 0,
          calculatedAt: new Date().toISOString(),
          timezone: "America/Toronto",
        });
      if (tail === "/planning" && req.method() === "POST") {
        creates.push({
          body: req.postDataJSON(),
          key: req.headers()["idempotency-key"],
        });
        if (failOnce) {
          failOnce = false;
          return route.fulfill({
            status: 503,
            json: { code: "synthetic_retry" },
          });
        }
        const plan = req.postDataJSON(),
          body = plan.meeting,
          id = meetings.length + 1;
        const dates = reviewed(plan),
          seriesId = plan.recurrence ? seriesRows.length + 1 : null,
          flowId = plan.saveFlowName ? flowRows.length + 1 : null;
        if (seriesId)
          seriesRows.push({
            id: seriesId,
            title: body.title,
            ...plan.recurrence,
            timezone: body.timezone,
            remindersPaused: false,
            status: "ACTIVE",
            version: 1,
            nextAt: body.startAt,
            futurePlanned: dates.count,
          });
        if (flowId)
          flowRows.push({
            id: flowId,
            name: plan.saveFlowName,
            version: 1,
            settings: { ...body, durationMinutes: 60 },
          });
        for (const occurrence of dates.occurrences) {
          const current = id + occurrence.number - 1;
          meetings.push({
            ...body,
            ...occurrence,
            id: current,
            status: "PLANNED",
            ownerName: people[0].name,
            participantCount: body.participantIds.length,
            hasMinutes: false,
            version: 1,
          });
          texts.set(current, {
            agenda: body.agenda,
            location: body.location,
            minutes: "",
            decisions: "",
            participants: people.filter((p) =>
              body.participantIds.includes(p.id),
            ),
            history: [],
            planning: {
              objective: body.objective,
              expectedResult: body.expectedResult,
              minutesOwner: people.find((p) => p.id === body.minutesOwnerId),
              reminderMinutes: body.reminderMinutes,
              seriesId,
              occurrenceNumber: occurrence.number,
              remindersPaused: false,
              seriesVersion: 1,
            },
          });
        }
        return ok({ firstMeetingId: id, seriesId, count: dates.count, flowId });
      }
      if (/^\/\d+$/.test(tail)) {
        const id = Number(tail.slice(1));
        if (req.method() === "GET") return ok(detail(id));
        const body = req.postDataJSON(),
          row = meetings.find((m) => m.id === id);
        assert.equal(body.expectedVersion, row.version);
        Object.assign(row, body, { version: row.version + 1 });
        Object.assign(texts.get(id), {
          agenda: body.agenda,
          location: body.location,
        });
        return ok(detail(id));
      }
      if (/^\/\d+\/(minutes|status)$/.test(tail)) {
        const id = Number(tail.split("/")[1]),
          row = meetings.find((m) => m.id === id),
          body = req.postDataJSON();
        assert.equal(body.expectedVersion, row.version);
        if (tail.endsWith("/minutes")) {
          Object.assign(texts.get(id), {
            minutes: body.minutes,
            decisions: body.decisions,
          });
          row.hasMinutes = Boolean(body.minutes.trim());
        } else row.status = body.status;
        row.version++;
        return ok(detail(id));
      }
      if (tail === "/agreements" && req.method() === "POST") {
        const body = req.postDataJSON(),
          meeting = meetings.find((m) => m.id === body.meetingId),
          person = people.find((p) => p.id === body.assigneeId),
          row = {
            ...body,
            id: agreements.length + 1,
            meetingTitle: meeting.title,
            assigneeName: person.name,
            status: "OPEN",
            resolution: "",
            version: 1,
            meetingOwnerId: meeting.ownerId,
          };
        agreements.push(row);
        return ok(row);
      }
      if (/^\/agreements\/\d+\/status$/.test(tail)) {
        const row = agreements.find((a) => a.id === Number(tail.split("/")[2])),
          body = req.postDataJSON();
        assert.equal(body.expectedVersion, row.version);
        assert.ok(body.reason.length >= 3);
        Object.assign(row, {
          status: body.status,
          resolution: body.reason,
          version: row.version + 1,
        });
        return ok(row);
      }
      if (
        ["", "/calendar", "/agreements"].includes(tail) &&
        req.method() === "GET"
      ) {
        const agreement = tail === "/agreements",
          source = agreement ? agreements : meetings,
          search = url.searchParams.get("search") ?? "",
          status = url.searchParams.get("status") ?? "",
          person = Number(
            url.searchParams.get(agreement ? "assigneeId" : "ownerId"),
          );
        const items = source.filter(
          (row) =>
            (!search ||
              row.title.toLowerCase().includes(search.toLowerCase())) &&
            (!status || row.status === status) &&
            (!person || (agreement ? row.assigneeId : row.ownerId) === person),
        );
        return ok({ items, total: items.length, page: 1, pageSize: 25 });
      }
    }
    unexpected.push(req.method() + " " + path);
    return route.fulfill({
      status: 500,
      json: { code: "unexpected_synthetic_api" },
    });
  });
  const fits = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Page must fit viewport",
    );
  const close = async () =>
    page
      .getByRole("dialog")
      .locator('[data-slot="dialog-footer"]')
      .getByRole("button", { name: "Cerrar", exact: true })
      .click();
  const settle = async () =>
    page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      ),
    );
  await page.goto(origin + "/tests/browser/meeting-control.html");
  await page.getByText("Junta de estrategia", { exact: true }).waitFor();
  await fits();
  assert.equal(
    await page
      .locator('[data-module="minutes-control"]')
      .getAttribute("data-workbar-position"),
    "top",
  );
  await page.evaluate(() => window.meetingFixture.layout("left"));
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-module="minutes-control"]')
        ?.getAttribute("data-workbar-position") === "left",
  );
  await page.getByRole("button", { name: "Nueva junta", exact: true }).click();
  await page
    .getByLabel("Título *", { exact: true })
    .fill("Nueva junta sintética");
  await page
    .getByLabel("¿Para qué nos reunimos? *", { exact: true })
    .fill("Resolver bloqueos");
  await page
    .getByLabel("¿Qué resultado esperamos? *", { exact: true })
    .fill("Definir responsables");
  await page.getByLabel("Participante sintético", { exact: true }).check();
  await page
    .getByRole("button", { name: "Programar junta", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  await page
    .getByRole("button", { name: "Programar junta", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Nueva junta sintética", exact: true })
    .waitFor();
  await close();
  assert.equal(creates.length, 2);
  assert.ok(creates[0].key);
  assert.equal(creates[0].key, creates[1].key);
  assert.deepEqual(creates[0].body, creates[1].body);
  await page.getByRole("tab", { name: "Tabla", exact: true }).click();
  await page.getByRole("table").waitFor();
  await page.getByRole("button", { name: "Título", exact: true }).click();
  await page.getByRole("button", { name: "Más filtros", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Responsable", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Responsable sintético", exact: true })
    .click();
  await page.getByLabel("Buscar", { exact: true }).fill("estrategia");
  await page
    .getByRole("row")
    .filter({ hasText: "Junta de estrategia" })
    .getByRole("button", { name: "Ver", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar minuta", exact: true })
    .click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page
    .getByLabel("Minuta", { exact: true })
    .fill("Resultados acordados y evidencia sintética");
  await page
    .getByLabel("Decisiones y siguientes pasos", { exact: true })
    .fill("Preparar entrega");
  await page
    .getByRole("button", { name: "Guardar minuta", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const review = async () =>
    page
      .getByRole("row")
      .filter({ hasText: "Junta de estrategia" })
      .getByRole("button", { name: "Ver", exact: true })
      .click();
  await review();
  await page
    .getByRole("button", { name: "Iniciar junta", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Iniciar junta", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await review();
  await page
    .getByRole("button", { name: "Concluir junta", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Concluir junta", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(meetings[0].status, "COMPLETED");
  await page.getByRole("button", { name: "Acuerdos", exact: true }).click();
  await page.getByText("Preparar seguimiento", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Nuevo acuerdo", exact: true })
    .click();
  await page.getByLabel("Junta", { exact: true }).selectOption("1");
  await page
    .getByLabel("Título", { exact: true })
    .fill("Acuerdo sintético nuevo");
  await page.getByLabel("Responsable", { exact: true }).selectOption("43");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", {
      name: "Cumplir acuerdo: Acuerdo sintético nuevo",
      exact: true,
    })
    .click();
  await page
    .getByLabel("¿Qué se entregó?", { exact: true })
    .fill("Entregado con evidencia sintética");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cumplir acuerdo", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(agreements[1].status, "DONE");
  await page.getByRole("button", { name: "Indicadores", exact: true }).click();
  await page.getByText("Acuerdos vencidos", { exact: true }).waitFor();
  await page
    .getByRole("link", { name: "Consultar registros", exact: true })
    .last()
    .click();
  assert.ok(page.url().includes("attention=overdueAgreements"));
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await page.getByRole("button", { name: "Juntas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva junta", exact: true }).click();
  await page
    .getByLabel("Título *", { exact: true })
    .fill("Borrador no guardado");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "¿Descartar cambios sin guardar?",
      exact: true,
    })
    .waitFor();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await close();
  // Guided workflow: responsibilities, retained Back navigation and exact reviewed dates.
  await page.getByRole("button", { name: "Nueva junta", exact: true }).click();
  await page.getByRole("button", { name: /^Flujo o serie/ }).click();
  await page
    .getByLabel("Título *", { exact: true })
    .fill("Serie sintética semanal");
  await page
    .getByLabel("¿Para qué nos reunimos? *", { exact: true })
    .fill("Resolver bloqueos del equipo");
  await page
    .getByLabel("¿Qué resultado esperamos? *", { exact: true })
    .fill("Definir responsables y siguiente decisión");
  await page
    .getByLabel("Responsable de minuta *", { exact: true })
    .selectOption("43");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Repetir esta junta", { exact: true }).check();
  await page.getByLabel("Número de juntas", { exact: true }).fill("3");
  await page
    .getByLabel("Recordatorios internos", { exact: true })
    .selectOption("15");
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  assert.equal(
    await page.getByLabel("Título *", { exact: true }).inputValue(),
    "Serie sintética semanal",
  );
  assert.equal(
    await page
      .getByLabel("Responsable de minuta *", { exact: true })
      .inputValue(),
    "43",
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  assert.equal(
    await page.getByLabel("Número de juntas", { exact: true }).inputValue(),
    "3",
  );
  await page
    .getByRole("button", { name: "Revisar fechas", exact: true })
    .click();
  await page.getByText("Fechas que se crearán", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("dialog").locator("ol").last().locator("li").count(),
    3,
  );
  await page
    .getByLabel("Guardar esta configuración como flujo reutilizable", {
      exact: true,
    })
    .check();
  await page
    .getByLabel("Nombre del flujo *", { exact: true })
    .fill("Revisión semanal de equipo");
  await settle();
  await page.screenshot({ path: "/tmp/indice-meeting-series-review.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await fits();
  await settle();
  await page.screenshot({ path: "/tmp/indice-meeting-series-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Programar serie", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Serie sintética semanal", exact: true })
    .waitFor();
  assert.equal(seriesRows.length, 1);
  assert.equal(flowRows.length, 1);
  assert.equal(
    meetings.filter((m) => m.title === "Serie sintética semanal").length,
    3,
  );
  // Planning scope is reviewed inside the same wizard, not a stacked confirmation.
  await page
    .getByRole("button", { name: "Editar planeación", exact: true })
    .click();
  await page
    .getByLabel("Aplicar cambios de planeación a", { exact: true })
    .selectOption("future");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Revisar fechas", exact: true })
    .click();
  assert.equal(
    await page.getByRole("dialog").locator("ol").last().locator("li").count(),
    3,
  );
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(seriesRows[0].version, 2);
  // Reusing a flow copies planning only; no evidence or access grants.
  await page.getByRole("button", { name: "Nueva junta", exact: true }).click();
  await page.getByRole("button", { name: /^Flujo o serie/ }).click();
  await page
    .getByRole("option", { name: "Revisión semanal de equipo", exact: true })
    .waitFor({ state: "attached" });
  await page.getByLabel("Flujo guardado", { exact: true }).selectOption("1");
  assert.equal(
    await page
      .getByLabel("¿Para qué nos reunimos? *", { exact: true })
      .inputValue(),
    "Resolver bloqueos del equipo",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await close();
  await page
    .getByRole("button", { name: "Flujos y series", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pausar avisos", exact: true })
    .click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Pausar avisos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reanudar avisos", exact: true })
    .waitFor();
  assert.equal(
    meetings.filter(
      (m) => m.title === "Serie sintética semanal" && m.status === "PLANNED",
    ).length,
    3,
  );
  await page
    .getByRole("button", { name: "Reanudar avisos", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reanudar avisos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Archivar flujo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archivar flujo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancelar juntas futuras", exact: true })
    .waitFor();
  assert.equal(flowRows.length, 0);
  await page
    .getByRole("button", { name: "Cancelar juntas futuras", exact: true })
    .click();
  await page
    .getByLabel("Motivo / evidencia del resultado", { exact: true })
    .fill("Cambio de agenda sintético");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar juntas futuras", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Flujos y series", exact: true })
    .waitFor();
  assert.equal(
    meetings.filter(
      (m) => m.title === "Serie sintética semanal" && m.status === "CANCELLED",
    ).length,
    3,
  );
  await close();
  const allLocales = {
    "es-MX": "Nueva junta",
    "es-CO": "Nueva junta",
    "en-US": "New meeting",
    "en-CA": "New meeting",
    "fr-CA": "Nouvelle réunion",
    "pt-BR": "Nova reunião",
    "ko-CA": "새 회의",
    "zh-CA": "新建会议",
  };
  for (const [locale, newLabel] of Object.entries(allLocales)) {
    await page.evaluate((code) => window.meetingFixture.language(code), locale);
    await page.getByRole("button", { name: newLabel, exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await fits();
    await page.getByRole("button", { name: newLabel, exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await fits();
    await page
      .getByRole("dialog")
      .locator('[data-slot="dialog-footer"] button')
      .first()
      .click();
  }
  await page.evaluate(() => {
    window.meetingFixture.language("es-MX");
    document.documentElement.classList.add("dark");
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Nueva junta", exact: true })
    .waitFor();
  await fits();
  await page.getByRole("tab", { name: "Calendario", exact: true }).click();
  await page.getByText("Junta de estrategia", { exact: true }).waitFor();
  await settle();
  await page.screenshot({ path: "/tmp/indice-meeting-control-dark.png" });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await settle();
  await page.screenshot({ path: "/tmp/indice-meeting-control-desktop.png" });
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await fits();
  }
  // Native notification links open the scoped detail, then discard the temporary URL selector.
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set("meeting", "1");
    history.pushState(null, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page
    .getByRole("heading", { name: "Junta de estrategia", exact: true })
    .waitFor();
  await close();
  assert.equal(new URL(page.url()).searchParams.has("meeting"), false);
  // Delegating minutes must not display coordinator-only planning/lifecycle actions.
  texts.get(2).planning.minutesOwner = people[1];
  role = "user";
  actorId = 43;
  permissionKeys = ["control_minutas.meetings"];
  await page.evaluate(
    (keys) => window.meetingFixture.role("user", keys, 43),
    permissionKeys,
  );
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set("meeting", "2");
    history.pushState(null, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page
    .getByRole("button", { name: "Registrar minuta", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Editar planeación", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Iniciar junta", exact: true })
      .count(),
    0,
  );
  await close();
  role = "user";
  permissionKeys = ["control_minutas.agreements"];
  await page.evaluate(
    (keys) => window.meetingFixture.role("user", keys),
    permissionKeys,
  );
  await page.getByRole("heading", { name: "Acuerdos", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Juntas", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Indicadores", exact: true })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  assert.ok(
    calls.every(
      (call) =>
        !call.includes("platform-admin") &&
        !call.includes("internal-development"),
    ),
  );
  console.log(
    "Meeting UI passed: create retry/CSRF, guided series review/Back, delegated roles, saved flow reuse/archive, future edit preview, pause/resume/cancel, scoped deep links, calendar/table, minutes/lifecycle, agreements, eight locales, scoped tabs, mobile/dark.",
  );
} catch (error) {
  await browser
    ?.contexts()[0]
    ?.pages()[0]
    ?.screenshot({ path: "/tmp/indice-meeting-control-failure.png" });
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
