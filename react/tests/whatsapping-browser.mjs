import assert from "node:assert/strict";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
const runtime = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5214";
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: "/tmp/indice-whatsapping-vite",
  server: {
    host: "127.0.0.1",
    port: 5214,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  define: { "import.meta.env.VITE_API_BASE_URL": '""' },
});
const contacts = Array.from({ length: 27 }, (_, i) => ({
  id: i + 1,
  name: `Persona ${String(i + 1).padStart(2, "0")}`,
  companyName: `Consultorio ${i + 1}`,
  phone: `+14165550${String(i + 100).slice(-3)}`,
  ownerName: "Vendedor de prueba",
  source: "website",
  eligibility: "READY",
}));
let campaigns = [],
  templates = [],
  lists = [],
  actions = [],
  failSave = false,
  failAction = false;
const errors = [];
function detail(c) {
  return {
    campaign: {
      ...c,
      total: c.recipients.length,
      done: c.recipients.filter((r) =>
        ["DONE", "REPLIED", "SKIPPED", "BLOCKED"].includes(r.state),
      ).length,
      pending: c.recipients.filter(
        (r) => !["DONE", "REPLIED", "SKIPPED", "BLOCKED"].includes(r.state),
      ).length,
      due: 0,
      outcomes: { contacted: c.events.filter(e => e.action === "SENT").length, positive: 0, negative: 0, withOpportunity: null },
    },
    recipients: c.recipients,
    events: c.events,
    resultContacts: {contacted: c.events.filter(e => e.action === "SENT").map(e => e.contactId), positive: [], negative: [], withOpportunity: null},
    opportunities: null,
  };
}
await server.listen();
const browserType =
  process.env.INDICE_BROWSER === "webkit" ? runtime.webkit : runtime.chromium;
const browser = await browserType.launch({
  headless: true,
  ...(process.env.INDICE_BROWSER === "webkit" && process.env.INDICE_WEBKIT_PATH
    ? { executablePath: process.env.INDICE_WEBKIT_PATH }
    : {}),
  ...(process.env.INDICE_BROWSER !== "webkit" && process.env.INDICE_CHROME_PATH
    ? { executablePath: process.env.INDICE_CHROME_PATH }
    : {}),
});
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("frontend-indice-language", "es-MX");
    window.__waUrls = [];
    window.__blocked = false;
    window.open = () =>
      window.__blocked
        ? null
        : {
            opener: null,
            close() {},
            location: {
              set href(value) {
                window.__waUrls.push(value);
              },
            },
          };
  });
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    if (url.origin !== origin) return route.abort();
    if (!path.startsWith("/api/")) return route.continue();
    const reply = (json) => route.fulfill({ json });
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    if (req.method() !== "GET")
      assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
    if (path === "/api/v1/auth/csrf")
      return reply({ csrfToken: "synthetic-csrf" });
    if (path.includes("workspace")) return reply({ state: null });
    const root = "/api/v1/sales/whatsapping";
    if (path === root + "/contacts" || path === root + "/contacts/selection") {
      const rows = contacts.filter((c) =>
        c.name
          .toLowerCase()
          .includes((url.searchParams.get("search") || "").toLowerCase()),
      );
      if (path.endsWith("/selection")) return reply(rows);
      const page = Number(url.searchParams.get("page") || 1),
        size = Number(url.searchParams.get("pageSize") || 25);
      return reply({
        items: rows.slice((page - 1) * size, page * size),
        total: rows.length,
        page,
        pageSize: size,
      });
    }
    for (const kind of ["templates", "lists"]) {
      if (path === root + "/" + kind)
        return reply(kind === "templates" ? templates : lists);
      if (path.startsWith(root + "/" + kind + "/")) {
        const rows = kind === "templates" ? templates : lists;
        const record = { ...body, version: body.version + 1 };
        const i = rows.findIndex((r) => r.id === record.id);
        if (i < 0) rows.push(record);
        else rows[i] = record;
        return reply(rows);
      }
    }
    if (path === root + "/campaigns") {
      let rows = campaigns.filter((c) =>
        c.name
          .toLowerCase()
          .includes((url.searchParams.get("search") || "").toLowerCase()),
      );
      const state = url.searchParams.get("status");
      if (state && state !== "ALL")
        rows = rows.filter((c) => c.status === state);
      const sort = url.searchParams.get("sort");
      rows.sort(
        (a, b) =>
          String(a[sort]).localeCompare(String(b[sort])) *
          (url.searchParams.get("direction") === "asc" ? 1 : -1),
      );
      return reply({
        items: rows.map((c) => detail(c).campaign),
        total: rows.length,
        page: 1,
        pageSize: 25,
        owners: [{ id: 9001, name: "Vendedor de prueba" }],
        results: {all: rows.length, contacted: 0, positive: 0, negative: 0},
      });
    }
    const match = path.match(
      /\/campaigns\/([^/]+)(?:\/(state|recipients)(?:\/(\d+)\/actions)?)?$/,
    );
    if (match) {
      let c = campaigns.find((c) => c.id === match[1]);
      if (req.method() === "PUT") {
        if (failSave) {
          failSave = false;
          return route.fulfill({ status: 503, json: {} });
        }
        c = {
          ...body,
          id: match[1],
          status: "DRAFT",
          ownerUserId: 9001,
          ownerName: "Vendedor de prueba",
          version: body.version + 1,
          canEdit: true,
          updatedAt: new Date().toISOString(),
          events: [],
          recipients: body.contactIds.map((id) => ({
            contact: contacts.find((c) => c.id === id),
            stepIndex: 0,
            state: "PENDING",
            nextActionAt: null,
            notes: "",
            version: 1,
            eligibility: "READY",
            message: body.steps[0].body.replaceAll(
              "{{name}}",
              contacts.find((c) => c.id === id).name,
            ),
          })),
        };
        campaigns = campaigns.filter((x) => x.id !== c.id);
        campaigns.push(c);
        return reply(detail(c));
      }
      if (match[2] === "state") {
        c.status = body.status;
        c.version++;
        return reply(detail(c));
      }
      if (match[2] === "recipients") {
        if (failAction) {
          failAction = false;
          return route.fulfill({ status: 409, json: {} });
        }
        const r = c.recipients.find((r) => r.contact.id === Number(match[3]));
        assert.equal(r.version, body.version);
        actions.push(body.action);
        r.notes = body.notes;
        r.version++;
        let whatsappUrl = null;
        if (body.action === "PREPARE") {
          r.state = "PREPARED";
          whatsappUrl = `https://wa.me/${r.contact.phone.slice(1)}?text=${encodeURIComponent(r.message)}`;
        }
        if (body.action === "SENT") r.state = "DONE";
        if (body.action === "SKIP") r.state = "SKIPPED";
        if (body.action === "BLOCK") r.state = "BLOCKED";
        if (body.action === "REPLIED") r.state = "REPLIED";
        if (body.action === "NOTE") r.nextActionAt = body.nextActionAt;
        c.events.unshift({
          id: c.events.length + 1,
          contactId: r.contact.id,
          actorName: "Vendedor de prueba",
          action: body.action,
          stepIndex: r.stepIndex,
          occurredAt: new Date().toISOString(),
        });
        return reply({ detail: detail(c), whatsappUrl });
      }
      return reply(detail(c));
    }
    return route.fulfill({ status: 404, json: { message: path } });
  });
  await mkdir("/tmp/indice-whatsapping-qa", { recursive: true });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/tests/browser/whatsapping.html");
  await page
    .getByRole("heading", { name: "Crea tu primera campaña de WhatsApp" })
    .waitFor();
  await page.getByRole("button", { name: "Plantillas", exact: true }).click();
  await page
    .getByRole("button", { name: "Nueva plantilla", exact: true })
    .click();
  await page
    .getByLabel("Nombre *", { exact: true })
    .fill("Bienvenida personal");
  await page
    .getByLabel("Mensaje *", { exact: true })
    .fill("Hola {{name}}, ¿revisamos tu propuesta?");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("heading", { name: "Bienvenida personal", exact: true }).waitFor();
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/library.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Cerrar", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Nueva campaña", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Nombre de campaña *")
    .fill("Seguimiento de consultorios");
  assert.equal(await page.getByLabel("Producto o servicio").count(), 0);
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/wizard.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/wizard-mobile.png",
    fullPage: false,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    ),
    "wizard fits mobile width",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Seleccionar todos los resultados" })
    .click();
  await page.getByText("27 · Seleccionados", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Usar una plantilla", { exact: true })
    .selectOption({ label: "Bienvenida personal" });
  await page.getByRole("button", { name: "Agregar seguimiento" }).click();
  await page
    .getByLabel("Mensaje", { exact: true })
    .nth(1)
    .fill("Seguimiento para {{name}}");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/review.png",
    fullPage: true,
  });
  failSave = true;
  await page
    .getByRole("button", { name: "Crear campaña", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.equal(campaigns.length, 0);
  await page
    .getByRole("button", { name: "Crear campaña", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir WhatsApp", exact: true })
    .waitFor();
  assert.equal(campaigns[0].status, "DRAFT");
  assert.equal(campaigns[0].recipients.length, 27);
  await page.evaluate(() => (window.__blocked = true));
  await page
    .getByRole("button", { name: "Abrir WhatsApp", exact: true })
    .click();
  await page.getByText(/Permite las ventanas emergentes/).waitFor();
  assert.equal(actions.length, 0);
  await page.evaluate(() => (window.__blocked = false));
  await page
    .getByRole("button", { name: "Abrir WhatsApp", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Contactado", exact: true })
    .waitFor();
  await page.waitForFunction(() => window.__waUrls.length === 1);
  assert.deepEqual(actions, ["PREPARE"]);
  assert.match(
    (await page.evaluate(() => window.__waUrls))[0],
    /text=Hola%20Persona%2001/,
  );
  await page
    .getByRole("button", { name: "Contactado", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Envío confirmado manualmente" })
    .waitFor();
  await page
    .getByRole("button", { name: "Siguiente", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Persona 02", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Seguimiento", exact: true }).click();
  await page.getByLabel("Notas", { exact: true }).fill("Llamar por la tarde");
  failAction = true;
  await page
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await page.getByText(/Este registro cambió/).waitFor();
  assert.equal(
    await page.getByLabel("Notas", { exact: true }).inputValue(),
    "Llamar por la tarde",
  );
  await page
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Seguimiento actualizado" })
    .waitFor();
  await page.locator("details").filter({has: page.getByRole("button", { name: "No contactar", exact: true })}).locator("summary").click();
  await page.getByRole("button", { name: "No contactar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Excluido de campañas" })
    .waitFor();
  await mkdir("/tmp/indice-whatsapping-qa", { recursive: true });
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  await page
    .getByRole("button", { name: /^Trabajar campaña: Seguimiento de consultorios$/ })
    .waitFor();
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/campaigns.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /^Trabajar campaña: Seguimiento de consultorios$/ })
    .click();
  assert.equal(campaigns[0].recipients[0].state, "DONE");
  assert.equal(campaigns[0].recipients[1].state, "BLOCKED");
  await page.setViewportSize({ width: 390, height: 844 });
  const queue = page.getByRole("button", {
    name: "Lista de trabajo",
    exact: true,
  });
  assert.equal(await queue.getAttribute("aria-expanded"), "false");
  await queue.click();
  assert.equal(await queue.getAttribute("aria-expanded"), "true");
  await page.getByRole("button", { name: /Persona 04 Consultorio 4/ }).click();
  await page
    .getByRole("heading", { name: "Persona 04", exact: true })
    .waitFor();
  assert.equal(await queue.getAttribute("aria-expanded"), "false");
  await page.waitForFunction(
    () =>
      document.activeElement?.tagName === "H2" &&
      document.activeElement?.textContent === "Persona 04",
  );
  await page.getByRole("button", { name: "Seguimiento", exact: true }).click();
  await page
    .getByLabel("Notas", { exact: true })
    .fill("Conservar al cambiar contacto");
  await queue.click();
  await page.getByRole("button", { name: /Persona 05 Consultorio 5/ }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(
    await page.getByLabel("Notas", { exact: true }).inputValue(),
    "Conservar al cambiar contacto",
  );
  await page
    .getByRole("heading", { name: "Persona 04", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Seguimiento actualizado" })
    .waitFor();
  await queue.click();
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/mobile.png",
    fullPage: true,
  });
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    ),
    "mobile viewport has no horizontal overflow",
  );
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    animations: "disabled",
    path: "/tmp/indice-whatsapping-qa/dark.png",
    fullPage: true,
  });
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Whatsapping browser: template, 27-contact selection, draft recovery, explicit preparation, blocked popup, manual confirmation, conflict retention, exclusion, resume, mobile and dark mode passed. No external messages or requests.",
  );
  await context.close();
} catch (error) {
  console.error(errors);
  if (page) {
    console.error((await page.locator("body").innerText()).slice(-7000));
    await page.screenshot({
      animations: "disabled",
      path: "/tmp/indice-whatsapping-failure.png",
      fullPage: true,
    });
  }
  throw error;
} finally {
  await browser.close();
  await server.close();
}
