import assert from "node:assert/strict";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
const runtime = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5206";
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: "/tmp/indice-mailing-audience-vite",
  server: {
    host: "127.0.0.1",
    port: 5206,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  define: { "import.meta.env.VITE_API_BASE_URL": '""' },
});
const rows = Array.from({ length: 27 }, (_, i) => ({
  id: i + 1,
  name: `Persona ${String(i + 1).padStart(2, "0")}`,
  contactPerson: `Persona ${String(i + 1).padStart(2, "0")}`,
  companyName: `Consultorio ${i + 1}`,
  email: `persona${i + 1}@example.com`,
  ownerName: i % 2 ? "Vendedor B" : "Vendedor A",
  source: i % 2 ? "referral" : "website",
  eligibility:
    i === 2
      ? "INVALID"
      : i === 3
        ? "SUPPRESSED"
        : "READY",
}));
let savedCampaign = null;
const lists = new Map();
const errors = [];
let failPreview = false,
  failList = false;
await server.listen();
const browser = await runtime.chromium.launch({
  headless: true,
  ...(process.env.INDICE_CHROME_PATH
    ? { executablePath: process.env.INDICE_CHROME_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
await context.addInitScript(() =>
  localStorage.setItem("frontend-indice-language", "es-MX"),
);
await context.route("**/*", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    path = url.pathname;
  if (url.origin !== origin) return route.abort();
  if (!path.startsWith("/api/")) return route.continue();
  const reply = (value) => route.fulfill({ json: value });
  const params = url.searchParams;
  assert.ok(
    !/\/(launch|test|send|control)$/.test(path),
    "audience operations must never send",
  );
  if (path === "/api/v1/auth/csrf")
    return reply({ csrfToken: "synthetic-csrf" });
  if (path === "/api/v1/mailing/senders") return reply([]);
  if (path === "/api/v1/mailing/templates")
    return reply({ items: [], total: 0, page: 1, pageSize: 100, canManage: true });
  if (path === "/api/v1/mailing/audience/options")
    return reply({
      sources: ["website", "referral"],
      owners: [
        { value: "1", label: "Vendedor A" },
        { value: "2", label: "Vendedor B" },
      ],
      tags: ["clinica"],
    });
  if (
    path === "/api/v1/mailing/audience" ||
    path === "/api/v1/mailing/audience/selection"
  ) {
    if (params.get("search") === "overflow")
      return route.fulfill({
        status: 409,
        json: { message: "mailing_selection_limit" },
      });
    let data = rows.filter(
      (r) =>
        (!params.get("search") ||
          [r.name, r.companyName, r.email]
            .join(" ")
            .toLowerCase()
            .includes(params.get("search").toLowerCase())) &&
        (!params.get("source") || r.source === params.get("source")) &&
        (!params.get("owner") ||
          r.ownerName ===
            (params.get("owner") === "1" ? "Vendedor A" : "Vendedor B")) &&
        (!params.get("eligibility") ||
          r.eligibility === params.get("eligibility")),
    );
    const sort = params.get("sort") || "name";
    data.sort(
      (a, b) =>
        String(a[sort]).localeCompare(String(b[sort])) *
        (params.get("direction") === "desc" ? -1 : 1),
    );
    if (path.endsWith("/selection")) return reply(data);
    const page = Number(params.get("page") || 1),
      size = Number(params.get("pageSize") || 10);
    return reply({
      items: data.slice((page - 1) * size, page * size),
      total: data.length,
      page,
      pageSize: size,
    });
  }
  if (path === "/api/v1/mailing/audience/preview") {
    assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
    if (failPreview) return route.fulfill({ status: 503, json: {} });
    const ids = req.postDataJSON().contactIds,
      items = rows.filter((r) => ids.includes(r.id));
    return reply({
      selected: items.length,
      ready: items.filter((r) => r.eligibility === "READY").length,
      consentRequired: 0,
      excluded: items.filter((r) =>
        ["INVALID", "SUPPRESSED"].includes(r.eligibility),
      ).length,
      items,
    });
  }
  if (path === "/api/v1/mailing/audience/lists")
    return reply([...lists.values()].map(({ items, ...l }) => l));
  const listId = path.match(/\/audience\/lists\/([^/]+)(\/archive)?$/);
  if (listId) {
    const id = listId[1];
    if (req.method() === "PUT") {
      assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
      if (failList) return route.fulfill({ status: 503, json: {} });
      const body = req.postDataJSON();
      const old = lists.get(id);
      if (body.version !== (old?.version ?? 0))
        return route.fulfill({ status: 409, json: {} });
      const result = {
        id,
        name: body.name,
        version: body.version + 1,
        contactCount: body.contactIds.length,
        updatedAt: new Date().toISOString(),
        items: rows.filter((r) => body.contactIds.includes(r.id)),
      };
      lists.set(id, result);
      return reply(result);
    }
    if (listId[2]) {
      lists.delete(id);
      return reply({});
    }
    const list = lists.get(id);
    return reply({ list, items: list.items, unavailable: 0 });
  }
  if (path.endsWith("/history"))
    return reply({
      items: [
        {
          campaignId: "history",
          name: "Seguimiento de prueba",
          subject: "Servicios de consultorio",
          campaignStatus: "COMPLETED",
          deliveryState: "ACCEPTED",
          email: "persona1@example.com",
          scheduledAt: null,
          completedAt: "2026-10-18T12:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  if (path.includes("/campaigns/") && req.method() === "PUT") {
    savedCampaign = req.postDataJSON();
    return reply({
      ...savedCampaign,
      id: "campaign",
      version: savedCampaign.version + 1,
      recipients: [],
    });
  }
  if (path.startsWith("/api/v1/workspace-state/"))
    return reply({ state: {}, schemaVersion: 1 });
  throw new Error(`Unexpected API ${req.method()} ${path}`);
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(origin + "/tests/browser/mailing-audience.html");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("checkbox").first().waitFor();
  assert.equal(await page.getByRole("checkbox").count(), 10);
  await page
    .getByRole("button", {
      name: "Seleccionar todos los resultados",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Ver seleccionados · 27" }).waitFor();
  await page.getByText("Listos para envío", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Ver seleccionados · 27" }).click();
  await page.getByRole("checkbox").first().waitFor();
  await page.getByRole("button", { name: "Correo", exact: true }).click();
  await page.getByRole("button", { name: "Correo", exact: true }).click();
  assert.equal(await page.locator('th[aria-sort="descending"]').count(), 1);
  await page.getByText("Listas guardadas", { exact: true }).first().click();
  await page
    .getByRole("button", { name: "Guardar selección como lista", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la lista", { exact: true })
    .fill("Consultorios piloto");
  failList = true;
  await page
    .getByRole("button", { name: "Guardar lista", exact: true })
    .click();
  await page.getByRole("alert").first().waitFor();
  assert.equal(
    await page.getByLabel("Nombre de la lista", { exact: true }).inputValue(),
    "Consultorios piloto",
  );
  failList = false;
  await page
    .getByRole("button", { name: "Guardar lista", exact: true })
    .click();
  await page.getByText("Lista guardada.", { exact: true }).waitFor();
  assert.equal(lists.size, 1);
  await page
    .getByRole("button", { name: "Limpiar selección", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Agregar lista a la selección", exact: true })
    .click();
  await page.getByRole("button", { name: /Buscar contactos · 27/ }).waitFor();
  await mkdir("/tmp/indice-mailing-audience-review", { recursive: true });
  await page.getByRole("checkbox").first().waitFor();
  await page.getByText("Listas guardadas", { exact: true }).first().click();
  await page.locator("table").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/indice-mailing-audience-review/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Buscar contactos · 27/ }).click();
  await page.getByRole("checkbox").first().waitFor();
  await page.getByRole("button", { name: /Más filtros/ }).click();
  await page
    .getByRole("combobox")
    .filter({ hasText: "Todos" })
    .last()
    .waitFor();
  await page
    .getByRole("searchbox", { name: "Buscar contactos", exact: true })
    .fill("Persona 01");
  await page.waitForTimeout(500);
  assert.equal(await page.getByRole("checkbox").count(), 1);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByText(/utiliza la persona de contacto/).waitFor();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("heading", { name: "Hola Persona 01", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(savedCampaign.contactIds.length, 27);
  await page.getByText("Historial de campañas", { exact: true }).click();
  await page.getByText("Seguimiento de prueba", { exact: true }).waitFor();
  await page.getByText("Aceptado por el servidor", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Abrir campaña de prueba", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("checkbox").first().waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    "no page-level horizontal overflow",
  );
  await page.locator("table").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/indice-mailing-audience-review/mobile.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(250);
  const darkText = await page.locator('tbody tr').first().evaluate(el => {
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.fillStyle=getComputedStyle(el).color;ctx.fillRect(0,0,1,1);
    return [...ctx.getImageData(0,0,1,1).data].slice(0,3);
  });
  assert.ok(darkText.every(value=>value>200), 'dark table text remains readable: '+darkText);
  await page.screenshot({
    path: "/tmp/indice-mailing-audience-review/mobile-dark.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Mailing audience browser flow passed: selection, sort, list retry/reuse, person preview, draft save, history and mobile. No send requests.",
  );
} finally {
  await browser.close();
  await server.close();
}
