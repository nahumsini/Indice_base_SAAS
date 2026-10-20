import assert from "node:assert/strict";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
const runtime = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5208";
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: "/tmp/indice-mailing-editor-vite",
  server: {
    host: "127.0.0.1",
    port: 5208,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  define: { "import.meta.env.VITE_API_BASE_URL": '""' },
});
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
let senderMode = "ready",
  saveMode = "success",
  saved = [],
  releaseSave;
const senders = [
  {
    id: "sender-a",
    label: "Cuenta de ventas",
    email: "ventas@example.com",
    displayName: "Equipo comercial",
    smtpStatus: "VERIFIED",
  },
  {
    id: "sender-b",
    label: "Atención a clientes",
    email: "clientes@example.com",
    displayName: "Atención",
    smtpStatus: "ERROR",
  },
];
const unexpected = [],
  errors = [];
await context.route("**/*", async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    path = url.pathname;
  if (url.origin !== origin) return route.abort();
  if (!path.startsWith("/api/")) return route.continue();
  const reply = (json) => route.fulfill({ json });
  assert.ok(
    !/\/(launch|test|send|control)$/.test(path),
    "editor must never send emails",
  );
  if (path === "/api/v1/auth/csrf")
    return reply({ csrfToken: "synthetic-csrf" });
  if (path === "/api/v1/mailing/senders") {
    if (senderMode === "failure")
      return route.fulfill({ status: 503, json: {} });
    return reply(senderMode === "empty" ? [] : senders);
  }
  if (path === "/api/v1/mailing/audience/options")
    return reply({ sources: [], owners: [], tags: [] });
  if (path === "/api/v1/mailing/audience/lists") return reply([]);
  if (path === "/api/v1/mailing/audience")
    return reply({ items: [], total: 0, page: 1, pageSize: 10 });
  if (path === "/api/v1/mailing/templates")
    return reply({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      canManage: true,
    });
  if (path.startsWith("/api/v1/workspace-state/"))
    return reply({ state: {}, schemaVersion: 1 });
  if (path.includes("/campaigns/") && request.method() === "PUT") {
    assert.equal(request.headers()["x-csrf-token"], "synthetic-csrf");
    const body = request.postDataJSON();
    saved.push(body);
    if (saveMode === "held")
      await new Promise((resolve) => {
        releaseSave = resolve;
      });
    if (saveMode === "failure") return route.fulfill({ status: 503, json: {} });
    if (saveMode === "conflict")
      return route.fulfill({ status: 409, json: {} });
    return reply({
      ...body,
      id: path.split("/").at(-1),
      version: body.version + 1,
      recipients: [],
      status: "DRAFT",
    });
  }
  unexpected.push(`${request.method()} ${path}`);
  return route.fulfill({ status: 500, json: {} });
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const field = (name) => page.locator(`input[name="${name}"]`);
const open = async (query = "") => {
  await page.goto(origin + "/tests/browser/mailing-editor.html" + query);
  await page.getByRole("dialog").waitFor();
};
const selectSender = async (label) => {
  await page.getByRole("combobox", { name: "Cuenta remitente" }).click();
  await page.getByRole("option", { name: label }).click();
};
const shot = async (name) => {
  await page.screenshot({
    path: `/tmp/indice-mailing-editor-review/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
};
try {
  await mkdir("/tmp/indice-mailing-editor-review", { recursive: true });
  await open();
  await page.getByText("SMTP · Conexión verificada", { exact: true }).waitFor();
  assert.equal(
    await page
      .locator('[data-slot="indice-modal-actions"] > button')
      .last()
      .innerText(),
    "Continuar",
  );
  await shot("desktop");
  await field("name").fill("");
  await button("Continuar").click();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("name") === "name",
  );
  assert.equal(await field("name").getAttribute("aria-invalid"), "true");
  assert.equal(saved.length, 0);
  await field("name").fill("Campaña de prueba");
  await field("replyTo").fill("correo-invalido");
  await button("Continuar").click();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("name") === "replyTo",
  );
  assert.equal(await field("replyTo").getAttribute("aria-invalid"), "true");
  await selectSender(/Atención a clientes/);
  assert.equal(await field("replyTo").inputValue(), "clientes@example.com");
  await page.getByText(/SMTP ·/).waitFor();
  await selectSender(/Cuenta de ventas/);
  await field("senderName").fill("Equipo de consultorios");
  await field("replyTo").fill("respuestas@example.com");
  await button("Continuar").click();
  await page
    .getByRole("searchbox", { name: "Buscar contactos", exact: true })
    .fill("Clínica");
  await button("Cancelar").first().click();
  await button("Seguir editando").click();
  assert.equal(
    await page
      .getByRole("searchbox", { name: "Buscar contactos", exact: true })
      .inputValue(),
    "Clínica",
  );
  await button("Atrás").click();
  assert.equal(
    await field("senderName").inputValue(),
    "Equipo de consultorios",
  );
  assert.equal(await field("replyTo").inputValue(), "respuestas@example.com");
  await button("Continuar").click();
  await button("Continuar").click();
  await field("subject").fill("Tu seguimiento de octubre");
  await button("Continuar").click();
  await page.getByRole("heading", { name: "Resumen de campaña" }).waitFor();
  await page
    .getByRole("heading", { name: "Tu seguimiento de octubre" })
    .waitFor();
  await shot("review");
  saveMode = "failure";
  await button("Guardar y revisar envío").click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Tu seguimiento de octubre" })
      .count(),
    1,
  );
  saveMode = "held";
  const beforeRetry = saved.length;
  await button("Guardar y revisar envío").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[role="dialog"]')?.getAttribute("aria-busy") ===
      "true",
  );
  assert.ok(await button("Guardar y revisar envío").isDisabled());
  assert.ok(await button("Cancelar").first().isDisabled());
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 1);
  const pendingDeadline = Date.now() + 10000;
  while (!releaseSave && Date.now() < pendingDeadline)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(releaseSave, "save request reaches the owner API");
  releaseSave();
  await page.locator("output").filter({ hasText: "review" }).waitFor();
  assert.equal(saved.length, beforeRetry + 1);
  assert.equal(saved.at(-1).senderName, "Equipo de consultorios");
  assert.equal(saved.at(-1).replyTo, "respuestas@example.com");
  assert.equal(saved.at(-1).subject, "Tu seguimiento de octubre");

  saveMode = "success";
  senderMode = "failure";
  await open();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByText("SMTP · Conexión verificada", { exact: true }).count(),
    0,
  );
  assert.ok(
    await page.getByRole("combobox", { name: "Cuenta remitente" }).isDisabled(),
  );
  senderMode = "ready";
  await button("Actualizar").click();
  await page.getByText("SMTP · Conexión verificada", { exact: true }).waitFor();
  await button("Guardar y configurar cuenta").click();
  await page.locator("output").filter({ hasText: "configure" }).waitFor();
  assert.equal(saved.at(-1).name, "Seguimiento de octubre");

  senderMode = "empty";
  await open("?new");
  await field("name").fill("Borrador incompleto");
  await button("Guardar borrador").click();
  await page.locator("output").filter({ hasText: "saved" }).waitFor();
  assert.equal(saved.at(-1).senderAccountId, null);
  assert.equal(saved.at(-1).subject, "");
  assert.deepEqual(saved.at(-1).contactIds, []);

  await open();
  await page
    .getByRole("combobox", { name: "Cuenta remitente" })
    .filter({ hasText: /no está disponible/i })
    .waitFor();
  assert.equal(await field("senderName").inputValue(), "Equipo comercial");
  assert.equal(await field("replyTo").inputValue(), "ventas@example.com");

  senderMode = "ready";
  saveMode = "conflict";
  await open();
  await button("Guardar borrador").click();
  await page.getByRole("alert").waitFor();
  assert.ok(await field("name").isDisabled());
  assert.ok(await button("Guardar borrador").isDisabled());
  assert.ok(await button("Continuar").isDisabled());
  assert.equal(await field("name").inputValue(), "Seguimiento de octubre");

  await open("?readonly");
  assert.ok(await field("name").isDisabled());
  assert.equal(await button("Guardar borrador").count(), 0);
  assert.ok((await button("Guardar y configurar cuenta").count()) === 0);
  await button("Continuar").click();
  await button("Continuar").click();
  await button("Continuar").click();
  await page.getByRole("heading", { name: "Resumen de campaña" }).waitFor();

  saveMode = "success";
  await page.setViewportSize({ width: 390, height: 844 });
  await open();
  await page.getByText("SMTP · Conexión verificada", { exact: true }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  );
  await shot("mobile");
  await field("replyTo").scrollIntoViewIfNeeded();
  await shot("mobile-fields");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await shot("mobile-dark");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page
    .locator('[data-slot="indice-modal-body"]')
    .evaluate((el) => (el.scrollTop = 0));
  await shot("desktop-dark");
  const cancelColor = await button("Cancelar")
    .first()
    .evaluate((el) => {
      const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
      context.fillStyle = getComputedStyle(el).color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
  assert.deepEqual(
    cancelColor,
    [255, 255, 255],
    "dark Cancel remains legible on the coral footer",
  );
  await page.setViewportSize({ width: 390, height: 400 });
  await button("Continuar").scrollIntoViewIfNeeded();
  await button("Continuar").click();
  await page
    .getByRole("searchbox", { name: "Buscar contactos", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  );
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
  console.log(
    "Campaign editor passed: validation/focus, sender states/retry, navigation retention, discard recovery, draft/save/review/configure, save failure/retry/pending/conflict, readonly, mobile/dark/short viewport. No sends.",
  );
} catch (error) {
  console.error(error);
  if (!page.isClosed()) await shot("failure");
  throw error;
} finally {
  await browser.close();
  await server.close();
}
