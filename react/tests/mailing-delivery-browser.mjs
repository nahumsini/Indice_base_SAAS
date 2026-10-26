import assert from "node:assert/strict";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5209";
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: "/tmp/indice-mailing-delivery-vite",
  server: {
    host: "127.0.0.1",
    port: 5209,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  define: { "import.meta.env.VITE_API_BASE_URL": '""' },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.INDICE_CHROME_PATH
    ? { executablePath: process.env.INDICE_CHROME_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.addInitScript(() => {
  if (window === window.top) localStorage.setItem("frontend-indice-language", "es-MX");
});
const audience = Array.from({ length: 33 }, (_, i) => ({
  contactId: i + 1,
  name: `Persona ${String(i + 1).padStart(2, "0")}`,
  email: `person${i + 1}@example.com`,
  eligibility:
    i < 30 ? "READY" : ["INVALID", "SUPPRESSED", "DUPLICATE"][i - 30],
}));
let bodyHtml = null;
let subject = "Servicios para tu empresa", bodyText = "Hola {{name}}", testError = "", tests = [];
let senderVerified = true,
  senderPresent = true;
let publicLinkReady = true,
  canSend = true,
  mode = "success",
  release,
  launched = false,
  launches = [];
const unexpected = [],
  errors = [];
const draft = () => ({
  status: launched ? "RUNNING" : "DRAFT",
  version: launched ? 2 : 1,
  scheduledAt: null,
  lastError: null,
  canSend,
  items: launched
    ? launches.at(-1).contactIds.map((id) => ({
        ...audience[id - 1],
        id: String(id),
        state: "PENDING",
        completedAt: null,
      }))
    : [],
});
await context.route("**/api/**", async (route) => {
  const request = route.request(),
    path = new URL(request.url()).pathname;
  if (!path.startsWith("/api/")) return route.continue();
  const reply = (json) => route.fulfill({ status: 200, json });
  if (path === "/api/v1/auth/csrf")
    return reply({ csrfToken: "synthetic-csrf" });
  if (path.startsWith("/api/v1/workspace-state/"))
    return reply({ state: {}, schemaVersion: 1 });
  if (path.endsWith("/review"))
    return reply({
      id: "00000000-0000-4000-8000-000000000001",
      version: 1,
      status: "DRAFT",
      subject,
      bodyText,
      bodyHtml,
      replyTo: "sales@example.com",
      sender: senderPresent
        ? {
            id: "sender",
            email: "sales@example.com",
            name: "Equipo comercial",
            version: 1,
            verified: senderVerified,
          }
        : null,
      audience,
      digest: "synthetic-digest",
      canSend,
      publicLinkReady,
    });
  if (path.endsWith("/results")) return reply(draft());
  if (path.endsWith("/test") && request.method() === "POST") {
    assert.equal(request.headers()["x-csrf-token"], "synthetic-csrf");
    tests.push(request.postDataJSON());
    return testError ? route.fulfill({ status: 400, json: { code: testError } }) : reply({ state: "ACCEPTED" });
  }
  if (path.endsWith("/launch") && request.method() === "POST") {
    assert.equal(request.headers()["x-csrf-token"], "synthetic-csrf");
    launches.push(request.postDataJSON());
    if (mode === "held") await new Promise((resolve) => (release = resolve));
    if (mode === "failure") return route.fulfill({ status: 503, json: {} });
    launched = true;
    return reply(draft());
  }
  unexpected.push(`${request.method()} ${path}`);
  return route.fulfill({ status: 500, json: {} });
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on("pageerror", (e) => errors.push(e.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const all = () =>
  page.getByRole("checkbox", { name: "Seleccionar todos", exact: true });
const person = (n) =>
  page.getByRole("checkbox", {
    name: `Seleccionar destinatario: Persona ${String(n).padStart(2, "0")}`,
    exact: true,
  });
const open = async () => {
  await page.goto(origin + "/tests/browser/mailing-delivery.html");
  await all().waitFor();
};
const check = async (n, state) =>
  assert.equal(await person(n).getAttribute("aria-checked"), String(state));
const review = () => button("Revisar envío");
const footer = () =>
  page.getByLabel("Datos de contacto y dirección postal del remitente", {
    exact: false,
  });
try {
  bodyHtml = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 24;
    const context = canvas.getContext('2d'); context.fillStyle = '#ff6b5e'; context.fillRect(0, 0, 32, 24);
    return '<p>Hola {{name}}</p><img alt="Logo de prueba" src="' + canvas.toDataURL('image/png') + '">';
  });
  // Production regression: SMTP verified, campaign named, but email subject blank.
  subject = "   ";
  await open();
  await page.getByRole("alert").filter({hasText:"Completa el asunto del correo"}).waitFor();
  assert.ok(await button("Enviar prueba").isDisabled());
  await footer().fill("Equipo comercial · Calle de prueba 123");
  assert.ok(await review().isDisabled(), "Postal details cannot replace a missing subject");
  assert.equal(tests.length, 0);
  assert.equal(launches.length, 0);
  await mkdir("/tmp/indice-mailing-selection-review", {recursive:true});
  await page.screenshot({path:"/tmp/indice-mailing-selection-review/missing-subject.png",animations:"disabled"});
  await button("Editar borrador").click();
  await button("Volver").click();
  assert.equal(await footer().inputValue(), "Equipo comercial · Calle de prueba 123");
  await button("Editar borrador").click();
  await button("Descartar cambios").click();
  await page.getByText("editor", {exact:true}).waitFor();
  subject = "Servicios para tu empresa";
  bodyText = "   ";
  await open();
  await page.getByRole("alert").filter({hasText:"Escribe el mensaje del correo"}).waitFor();
  assert.ok(await button("Enviar prueba").isDisabled());
  bodyText = "Hola {{name}}";
  await button("Actualizar").click();
  await page.getByRole("alert").waitFor({state:"detached"});
  assert.ok(await button("Enviar prueba").isEnabled(), "Test does not require postal footer");
  assert.ok(await review().isDisabled(), "Campaign still requires postal footer");
  await button("Enviar prueba").click();
  await page.getByLabel("Destinatario de prueba").fill("test@example.invalid");
  await review().click();
  testError = "mailing_content_required";
  await button("Enviar prueba").click();
  await page.getByRole("alert").filter({hasText:"Completa la cuenta remitente, el asunto y el mensaje"}).waitFor();
  assert.equal(tests.length, 1);
  assert.equal(launches.length, 0);
  await button("Editar borrador").click();
  await button("Descartar cambios").click();
  await page.getByText("editor", {exact:true}).waitFor();
  testError = "";
  await open();
  await button("Enviar prueba").click();
  await page.getByLabel("Destinatario de prueba").fill("test@example.invalid");
  await review().click();
  await button("Enviar prueba").click();
  await page.getByRole("status").filter({hasText:"Aceptado por el servidor"}).waitFor();
  assert.equal(tests.length, 2);
  assert.equal(launches.length, 0);
  // A selected but unverified account must explain and offer recovery without sending.
  senderVerified = false;
  await open();
  await button("Verificar cuenta de correo").waitFor();
  assert.ok((await page.getByRole("dialog").boundingBox()).width <= 1024, "Delivery uses a compact workspace cap");
  await mkdir("/tmp/indice-mailing-selection-review", { recursive: true });
  await page.screenshot({path:"/tmp/indice-mailing-selection-review/unverified.png",animations:"disabled"});
  assert.equal(await review().isDisabled(), true);
  assert.equal(await button("Enviar prueba").isDisabled(), true);
  const setupBox = await footer().boundingBox(),
    tableBox = await page.locator("table").boundingBox();
  assert.ok(
    setupBox.y < tableBox.y + 448,
    "Required sender details stay above the long audience tail",
  );
  assert.ok(
    await page
      .locator('[data-slot="table-container"]')
      .evaluate(
        (el) => el.clientHeight <= 448 && el.scrollHeight > el.clientHeight,
      ),
  );
  await footer().fill("Equipo comercial · Calle de prueba 123");
  await button("Verificar cuenta de correo").click();
  await button("Descartar cambios").waitFor();
  await button("Volver").click();
  assert.equal(
    await footer().inputValue(),
    "Equipo comercial · Calle de prueba 123",
  );
  senderVerified = true;
  await button("Actualizar").click();
  await button("Verificar cuenta de correo").waitFor({ state: "detached" });
  assert.equal(await review().isEnabled(), true);
  assert.equal(launches.length, 0);
  senderVerified = false;
  await open();
  await button("Verificar cuenta de correo").click();
  await page.getByText("accounts", { exact: true }).waitFor();
  await open();
  await footer().fill("Borrador de dirección");
  await button("Verificar cuenta de correo").click();
  await button("Descartar cambios").click();
  await page.getByText("accounts", { exact: true }).waitFor();
  senderPresent = false;
  await open();
  await button("Editar borrador").click();
  await page.getByText("editor", { exact: true }).waitFor();
  senderPresent = true;
  await page.goto(origin + "/tests/browser/mailing-delivery.html?noAccounts=1");
  await all().waitFor();
  assert.equal(await button("Verificar cuenta de correo").count(), 0);
  senderVerified = true;
  await open();
  assert.equal(await all().getAttribute("aria-checked"), "true");
  await check(1, true);
  assert.equal(
    await page.getByText("Registrar consentimiento", { exact: false }).count(),
    0,
  );
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await check(30, true);
  for (const n of [31, 32, 33])
    assert.equal(await person(n).isDisabled(), true);
  await all().uncheck();
  await check(30, false);
  await page.getByRole("link", { name: "Anterior", exact: true }).click();
  await check(1, false);
  await footer().fill("Equipo comercial · Calle de prueba 123");
  assert.equal(await review().isDisabled(), true);
  // A mixed checkbox selects every eligible page, not just visible rows.
  await person(1).check();
  assert.equal(await all().getAttribute("aria-checked"), "mixed");
  await all().check();
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await check(30, true);
  await all().uncheck();
  await person(30).check();
  await page.getByRole("link", { name: "Anterior", exact: true }).click();
  await person(1).check();
  assert.equal(await all().getAttribute("aria-checked"), "mixed");
  await review().click();
  await page
    .getByRole("heading", { name: "Confirmar envío", exact: true })
    .waitFor();
  assert.match(
    await page.getByRole("dialog").innerText(),
    /Seleccionados: 2 · Sin seleccionar: 28 · Excluidos: 3/,
  );
  const previewImage = page.frameLocator('iframe[title="Vista previa"]').locator('img');
  await previewImage.waitFor();
  assert.ok(await previewImage.evaluate(img => img.complete && img.naturalWidth > 0));
  await page.screenshot({path:"/tmp/indice-mailing-selection-review/campaign-image.png",animations:"disabled"});
  mode = "failure";
  await button("Enviar campaña").click();
  await page.getByRole("alert").waitFor();
  assert.deepEqual(launches.at(-1).contactIds, [30, 1]);
  await button("Volver").click();
  await check(1, true);
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await check(30, true);
  assert.equal(
    await footer().inputValue(),
    "Equipo comercial · Calle de prueba 123",
  );
  mode = "held";
  await review().click();
  await button("Enviar campaña").click();
  await page.waitForFunction(
    () => document.querySelector("button:disabled") !== null,
  );
  assert.equal(await button("Enviar campaña").isDisabled(), true);
  assert.equal(launches.length, 2);
  release();
  await page.getByText("Enviando", { exact: true }).waitFor();
  assert.deepEqual(launches.at(-1).contactIds, [30, 1]);
  assert.equal(await all().count(), 0);
  await button("Cerrar").first().click();
  await page.getByText("closed", { exact: true }).waitFor();
  // A refreshed unsubscribe removes an explicitly selected recipient.
  launched = false;
  await open();
  await all().uncheck();
  await person(1).check();
  audience[0].eligibility = "SUPPRESSED";
  await button("Actualizar").click();
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[aria-label="Seleccionar destinatario: Persona 01"]',
      )?.disabled === true,
  );
  await footer().fill("Equipo comercial · Calle de prueba 123");
  assert.equal(await review().isDisabled(), true);
  audience[0].eligibility = "READY";
  // HTTPS unsubscribe configuration remains a separate prerequisite.
  publicLinkReady = false;
  await open();
  await footer().fill("Equipo comercial · Calle de prueba 123");
  assert.equal(await review().isDisabled(), true);
  assert.equal(await button("Enviar prueba").isEnabled(), true);
  await page
    .getByRole("status")
    .filter({
      hasText: /Para enviar campañas se requiere la dirección pública HTTPS/,
    })
    .waitFor();
  publicLinkReady = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await open();
  const mobileSetup = await footer().boundingBox(),
    mobileTable = await page.locator("table").boundingBox();
  assert.ok(
    mobileSetup.y < mobileTable.y,
    "Required setup precedes recipients on phones",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await all().focus();
  await page.keyboard.press("Space");
  assert.equal(await all().getAttribute("aria-checked"), "false");
  await mkdir("/tmp/indice-mailing-selection-review", { recursive: true });
  await page.screenshot({
    path: "/tmp/indice-mailing-selection-review/mobile.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open();
  await page.screenshot({
    path: "/tmp/indice-mailing-selection-review/desktop.png",
    animations: "disabled",
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    path: "/tmp/indice-mailing-selection-review/dark.png",
    animations: "disabled",
  });
  canSend = false;
  await page.goto(origin + "/tests/browser/mailing-delivery.html");
  await page
    .getByText("Equipo comercial <sales@example.com>", { exact: true })
    .waitFor();
  assert.equal(await page.getByRole("checkbox").count(), 0);
  assert.equal(await review().isDisabled(), true);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: blank subject/body blocked, incomplete-content error recovery, test independent of postal footer, simulated SMTP acceptance, unverified/missing sender recovery, permission-scoped account handoff, dirty guard, refreshed SMTP eligibility, reachable required fields, selection across pages, exclusions, exact recipient payload, retry, pending lock, refreshed unsubscribe, HTTPS gate, keyboard/mobile/dark and read-only access. No real email sent.",
  );
} catch (error) {
  console.error("Page errors:", errors, "Unexpected:", unexpected);
  console.error((await page.locator("body").innerText()).slice(0, 2000));
  throw error;
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
