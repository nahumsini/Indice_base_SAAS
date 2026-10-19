import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "vite";
const { chromium } = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5197";
const artifacts = resolve(
  process.env.INDICE_BROWSER_ARTIFACTS || tmpdir(),
  "indice-maintenance",
);
mkdirSync(artifacts, { recursive: true });
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: resolve(
    import.meta.dirname,
    "../node_modules/.vite-maintenance-browser",
  ),
  server: { host: "127.0.0.1", port: 5197, strictPort: true },
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
    creates = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error("Browser error:", error.message);
  });
  let role = "superadmin",
    keys = [],
    failOnce = true;
  const settings = {
    timezone: "America/Toronto",
    currency: "MXN",
    hourlyRate: 120,
    criticalHours: 2,
    highHours: 8,
    normalHours: 24,
    lowHours: 72,
    categories: ["Electricidad"],
    specialties: ["Eléctrica"],
    procedures: [
      {
        name: "Inspección básica",
        steps: [{ label: "Verificar conexión", required: true, done: false }],
        evidenceRequired: true,
      },
    ],
    evidenceRequired: true,
    version: 1,
  };
  const assets = [
    {
      id: 1,
      name: "Bomba sintética",
      assetType: "EQUIPMENT",
      hrAssetId: null,
      unitId: 1,
      businessId: 1,
      location: "Taller",
      criticality: "HIGH",
      notes: "Equipo de prueba",
      active: true,
      unavailable: false,
      version: 1,
    },
  ];
  const now = new Date();
  const order = {
    id: 1,
    assetId: 1,
    assetName: assets[0].name,
    requestId: null,
    planId: null,
    title: "Revisión sintética",
    description: "Revisar sello",
    orderType: "CORRECTIVE",
    priority: "HIGH",
    category: "",
    status: "ASSIGNED",
    assigneeId: 42,
    assigneeName: "Técnico sintético",
    dueAt: now.toISOString(),
    originalDueAt: now.toISOString(),
    scheduledStart: null,
    scheduledEnd: null,
    timezone: "America/Toronto",
    diagnosis: "",
    resolution: "",
    checklist: [{ label: "Verificar conexión", required: true, done: false }],
    evidenceRequired: false,
    blocking: false,
    currency: "MXN",
    estimatedAmount: 100,
    startedAt: null,
    closedAt: null,
    createdAt: now.toISOString(),
    version: 1,
  };
  const requests = [],
    plans = [],
    history = [];
  const detail = () => ({
    order: { ...order },
    history: [...history],
    attachments: [],
    taskId: null,
  });
  const paged = (items, url) => {
    const search = (url.searchParams.get("search") || "").toLowerCase(),
      status = url.searchParams.get("status");
    const filtered = items.filter(
      (r) =>
        (r.title || r.name || "").toLowerCase().includes(search) &&
        (!status || r.status === status),
    );
    return { items: filtered, total: filtered.length, page: 1, pageSize: 25 };
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method(),
      ok = (json) => route.fulfill({ json });
    if (!path.startsWith("/api/")) return route.continue();
    if (path === "/api/v1/auth/me")
      return ok({
        user: {
          id: 42,
          name: "Técnico sintético",
          role,
          module_slugs: ["maintenance"],
          tab_permissions_configured: true,
          tab_permission_keys: keys,
        },
        company: { id: 8, name: "Empresa sintética", active: true, role },
        csrfToken: "synthetic-csrf",
      });
    if (path === "/api/v1/modules")
      return ok([
        {
          slug: "maintenance",
          name: "Mantenimiento",
          category: "complementary",
          locked: false,
        },
      ]);
    if (path.startsWith("/api/v1/workspace-state/"))
      return ok({state:req.method()==='PUT'?req.postDataJSON().state:{},schemaVersion:1});
    if (path === "/api/v1/learning/progress")
      return ok({
        catalogVersion: "synthetic",
        stages: [],
        chapters: [],
        nextMission: null,
      });
    if (path.includes("exchange-rate")) return ok({});
    if (path.startsWith("/api/v1/maintenance")) {
      const tail = path.slice("/api/v1/maintenance".length);
      if (method !== "GET")
        assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
      if (tail === "/context")
        return ok({
          manager: role === "superadmin",
          administrator: role === "superadmin",
          userId: 42,
          assignment: { unitId: 1, businessId: 1 },
          inventory: true,
          expenses: true,
          hrAssets: true,
          tasks: true,
          settings,
        });
      if (tail === "/directories/assets") return ok(paged(assets, url));
      if (tail === "/directories/members")
        return ok(paged([{ id: 42, name: "Técnico sintético" }], url));
      if (tail === "/directories/hr-assets") return ok(paged([], url));
      if (tail === "/settings/team")
        return ok(
          paged(
            [
              {
                id: 42,
                name: "Técnico sintético",
                specialties: ["Eléctrica"],
                active: true,
                version: 1,
              },
            ],
            url,
          ),
        );
      if (tail === "/orders" && method === "GET")
        return ok(paged([order], url));
      if (tail === "/orders/1" && method === "GET") return ok(detail());
      if (tail === "/orders/1/status") {
        const body = req.postDataJSON();
        assert.equal(body.expectedVersion, order.version);
        assert.ok(body.reason);
        order.status = body.status;
        order.version++;
        history.unshift({
          id: history.length + 1,
          action: `STATUS_${body.status}`,
          reason: body.reason,
          actorId: 42,
          createdAt: new Date().toISOString(),
        });
        return ok(detail());
      }
      if (tail === "/orders/1/progress") {
        const body = req.postDataJSON();
        assert.equal(body.expectedVersion, order.version);
        order.diagnosis = body.diagnosis;
        order.resolution = body.resolution;
        order.checklist = order.checklist.map((s, i) => ({
          ...s,
          done: body.completed[i],
        }));
        order.version++;
        return ok(detail());
      }
      if (tail === "/orders/1/costs")
        return ok({
          currency: "MXN",
          estimated: 100,
          labor: 60,
          parts: 50,
          services: 0,
          actual: 110,
          paidServices: 0,
          complete: true,
          laborEntries: [],
          partEntries: [],
          expenses: [],
        });
      if (tail === "/requests" && method === "GET")
        return ok(paged(requests, url));
      if (tail === "/requests" && method === "POST") {
        const body = req.postDataJSON();
        creates.push({ body, key: req.headers()["idempotency-key"] });
        if (failOnce) {
          failOnce = false;
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic retry" },
          });
        }
        const request = {
          ...body,
          id: requests.length + 1,
          status: "NEW",
          version: 1,
          assetName: assets[0].name,
          createdAt: new Date().toISOString(),
          requesterId: 42,
          responseAt: null,
          orderId: null,
        };
        requests.push(request);
        return ok({ request, history: [], attachments: [] });
      }
      if (tail === "/assets" && method === "GET") return ok(paged(assets, url));
      if (tail === "/assets/1") return ok(assets[0]);
      if (tail === "/evidence/ASSET/1") return ok([]);
      if (tail === "/plans" && method === "GET") return ok(paged(plans, url));
      if (tail === "/plans" && method === "POST") {
        const body = req.postDataJSON();
        assert.ok(body.checklist.length);
        plans.push({
          ...body,
          id: plans.length + 1,
          assetName: assets[0].name,
          active: true,
          version: 1,
          nextDate: body.anchorDate,
        });
        return ok(plans.at(-1));
      }
      if (tail === "/metrics/costs")
        return ok({
          orders: 1,
          limit: 500,
          limited: false,
          currencies: [
            {
              currency: "MXN",
              orders: 1,
              estimated: 100,
              actual: 110,
              paidServices: 0,
              complete: true,
            },
          ],
        });
      if (tail === "/metrics")
        return ok({
          open: 1,
          overdue: 0,
          critical: 0,
          preventiveDue: 0,
          preventiveOnTime: 0,
          responseHours: null,
          repairHours: null,
          downtimeHours: null,
        });
      if (tail === "/settings" && method === "PUT") {
        Object.assign(settings, req.postDataJSON(), {
          version: settings.version + 1,
        });
        return ok(settings);
      }
    }
    unexpected.push(`${method} ${path}`);
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected synthetic API" },
    });
  });
  const dialog = () => page.getByRole("dialog");
  const close = async () =>
    dialog()
      .locator('[data-slot="dialog-footer"]')
      .getByRole("button", { name: "Cerrar", exact: true })
      .click();
  const tab = async (name) =>
    page.getByRole("button", { name, exact: true }).first().click();
  const reason = async (title, text) => {
    await dialog().getByRole("button", { name: title, exact: true }).click();
    await dialog().getByLabel("Motivo", { exact: true }).fill(text);
    await dialog()
      .getByRole("button", { name: "Confirmar", exact: true })
      .click();
  };
  const fits = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "page must fit viewport",
    );
  await page.goto(origin + "/tests/browser/maintenance.html", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.getByText("#1 · Revisión sintética", { exact: true }).waitFor();
  await fits();
  const nameHeader = page.getByRole('columnheader').filter({hasText:'Nombre'});
  await nameHeader.getByRole('button',{name:'Nombre',exact:true}).click();
  await page.waitForFunction(()=>new URLSearchParams(location.search).get('sort')==='title');
  assert.equal(await nameHeader.getAttribute('aria-sort'),'ascending');
  await nameHeader.getByRole('button',{name:'Nombre',exact:true}).click();
  assert.equal(await nameHeader.getAttribute('aria-sort'),'descending');
  await page
    .getByRole("button", { name: "Abrir", exact: true })
    .first()
    .click();
  await reason("Iniciar trabajo", "Inicio de inspección");
  await dialog()
    .getByRole("button", { name: "Registrar avance", exact: true })
    .click();
  await dialog()
    .getByLabel("Diagnóstico", { exact: true })
    .fill("Sello desgastado");
  await dialog()
    .getByLabel("Trabajo realizado y resultado", { exact: true })
    .fill("Sello reemplazado y probado");
  await dialog().getByRole("checkbox").check();
  await dialog().getByRole("button", { name: "Guardar", exact: true }).click();
  await reason("Enviar a validación", "Solicitar revisión");
  await reason("Validar y cerrar", "Prueba de presión aprobada");
  assert.equal(order.status, "CLOSED");
  await close();
  await tab("Reportes");
  await page
    .getByRole("button", { name: "Reportar una falla", exact: true })
    .click();
  await dialog().getByLabel("Nombre", { exact: true }).fill("Fuga sintética");
  await dialog().getByLabel("Ubicación", { exact: true }).fill("Entrada");
  await dialog()
    .getByLabel("Descripción", { exact: true })
    .fill("Agua junto a la puerta");
  await dialog().getByRole("button", { name: "Guardar", exact: true }).click();
  await dialog().getByRole("alert").waitFor();
  await dialog().getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByText("#1 · Fuga sintética", { exact: true }).waitFor();
  assert.equal(creates.length, 2);
  assert.equal(creates[0].key, creates[1].key);
  await page
    .getByRole("button", { name: "Reportar una falla", exact: true })
    .click();
  await dialog().getByLabel("Nombre", { exact: true }).fill("Borrador");
  await dialog().getByRole("button", { name: "Cancelar", exact: true }).click();
  await dialog()
    .getByRole("button", { name: "Seguir editando", exact: true })
    .click();
  assert.equal(
    await dialog().getByLabel("Nombre", { exact: true }).inputValue(),
    "Borrador",
  );
  await dialog().getByRole("button", { name: "Cancelar", exact: true }).click();
  await close();
  await tab("Preventivos");
  await page
    .getByRole("button", { name: "Crear plan preventivo", exact: true })
    .click();
  await dialog()
    .getByLabel("Nombre", { exact: true })
    .fill("Inspección mensual");
  await dialog()
    .getByLabel("Equipo o ubicación", { exact: true })
    .selectOption("1");
  await dialog()
    .getByRole("button", { name: "Siguiente", exact: true })
    .click();
  await dialog().getByLabel("Procedimiento", { exact: true }).selectOption("0");
  await dialog()
    .getByRole("button", { name: "Siguiente", exact: true })
    .click();
  assert.equal(plans.length, 0);
  await dialog().getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByText("Inspección mensual", { exact: true }).waitFor();
  assert.equal(plans.length, 1);
  await tab("Equipos y ubicaciones");
  await page
    .getByRole("button", { name: "Abrir", exact: true })
    .first()
    .click();
  await dialog()
    .getByRole("button", { name: "QR del equipo", exact: true })
    .click();
  await dialog().getByRole("img", { name: "QR del equipo" }).waitFor();
  await close();
  await tab("Indicadores");
  await page.getByText("Respuesta promedio (horas)", { exact: true }).waitFor();
  await page.getByText('Costo de las órdenes cerradas',{exact:true}).waitFor();
  await page.getByText('Preventivos con fecha límite en el período',{exact:true}).locator('..').getByRole('button',{name:'Abrir',exact:true}).click();
  await page.waitForURL(/maintenance\/orders.*attention=preventive/);
  assert.ok(new URL(page.url()).searchParams.get('from'));
  assert.ok(new URL(page.url()).searchParams.get('to'));
  assert.equal(new URL(page.url()).searchParams.get('assetId'),'0');
  await tab('Indicadores');
  await page.getByText('Órdenes abiertas',{exact:true}).locator('..').getByRole('button',{name:'Abrir',exact:true}).click();
  await page.waitForURL(/maintenance\/orders.*attention=open/);
  assert.equal(new URL(page.url()).searchParams.get('from'),'');
  assert.equal(new URL(page.url()).searchParams.get('to'),'');
  await tab('Indicadores');
  await page.getByText('Respuesta promedio (horas)',{exact:true}).waitFor();
  assert.ok(
    (await page.getByText("Sin muestra", { exact: true }).count()) >= 3,
  );
  await tab("Configuración");
  await page.getByText("Técnico sintético", { exact: true }).waitFor();
  await tab("Órdenes de trabajo");
  await page.getByRole("tab", { name: "Kanban", exact: true }).click();
  await page.getByText("#1 · Revisión sintética", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Calendario", exact: true }).click();
  await page.getByText("#1 · Revisión sintética", { exact: true }).waitFor();
  await page.screenshot({
    path: resolve(artifacts, "desktop.png"),
    animations: 'disabled',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await fits();
  await page
    .getByRole("button", { name: "#1 · Revisión sintética", exact: false })
    .click();
  await fits();
  await page.screenshot({
    path: resolve(artifacts, "mobile.png"),
    animations: 'disabled',
    fullPage: true,
  });
  await close();
  for (const code of [
    "en-US",
    "en-CA",
    "es-MX",
    "es-CO",
    "fr-CA",
    "pt-BR",
    "ko-CA",
    "zh-CA",
  ]) {
    await page.evaluate(
      (code) => window.maintenanceFixture.language(code),
      code,
    );
    await page.locator("[data-maintenance-workspace]").waitFor();
    await fits();
  }
  await page.evaluate(() => window.maintenanceFixture.language("es-MX"));
  role = "user";
  keys = ["maintenance.orders"];
  await page.evaluate(() =>
    window.maintenanceFixture.role("user", ["maintenance.orders"]),
  );
  await page.getByText("#1 · Revisión sintética", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Nueva orden de trabajo", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Configuración", exact: true })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log(
    JSON.stringify({
      passed: true,
      flows: [
        "closure",
        "request retry",
        "draft guard",
        "preventive wizard",
        "asset QR",
        "indicators",
        "configuration",
        "kanban",
        "calendar",
        "mobile",
        "8 locales",
        "permission revocation",
      ],
      artifacts,
    }),
  );
} catch (error) {
  if (browser) {
    const current = browser.contexts()[0]?.pages()[0];
    if (current) {
      console.log((await current.locator("body").innerText()).slice(0, 6000));
      await current.screenshot({
        path: resolve(artifacts, "failure.png"),
        fullPage: true,
      });
    }
  }
  throw error;
} finally {
  if (browser) await browser.close();
  await server.close();
}
