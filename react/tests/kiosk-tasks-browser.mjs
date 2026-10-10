import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(root, '../.run/task-ui');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5198, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': '""' } });
const date = '2026-10-10';
const card = { id: 11, name: 'Mis tareas', module: 'PROCESS_TASKS', module_slug: 'processes-tasks', tool_key: 'employee.my-tasks@1', workspace_kind: 'MY_TASKS', purpose: 'Organiza tu trabajo.', availability: 'AVAILABLE' };
const bootstrap = { name: 'Mi equipo', company_name: 'Empresa de prueba', locale: 'es-MX', access_methods: ['PIN'], csrf_token: 'synthetic-csrf', audience_type: 'EMPLOYEE' };
const session = { session_id: 'employee', session_token: 'synthetic-session', expires_at: '2099-01-01T00:00:00Z', identity: { type: 'EMPLOYEE', id: 7, name: 'Ana Prueba' }, employee: { name: 'Ana Prueba' }, multi_kiosk: { id: 1, name: bootstrap.name, company_name: bootstrap.company_name }, kiosks: [card] };
const capabilities = ['tasks.read', 'task.create', 'task.complete', 'task.agenda.update', 'task.attachment.presign', 'task.attachment.register', 'processes.occasional.read', 'process-run.occasional.preview', 'process-run.occasional.create'].map(value => `process-tasks.${value}@1`);
const baseTask = { id: 1, task_id: 1, task_type: 'task', folio: 'T-001', title: 'Revisar apertura', description: 'Verifica el área y adjunta una foto antes de completar la revisión.', status: 'pending', priority: 'high', start_date: date, due_date: date, agenda_date: date, agenda_start_time: '09:00', agenda_end_time: '10:00', completion_percent: 0, assigned_user_company_id: 7, assigned_name: 'Ana Prueba', unit_id: 1, unit_name: 'Centro', business_id: 1, business_name: 'Operaciones', attachments: 0, evidence_required: true, evidence_satisfied: false, can_add_evidence: true, can_complete: true, can_reschedule: true, is_assigned_to_current_user: true, is_created_by_current_user: false, is_overdue: false, process_id: null, project_id: null };
let tasks = [baseTask, { ...baseTask, id: 2, task_id: 2, folio: 'T-002', title: 'Preparar materiales del equipo', status: 'in_progress', priority: 'medium', completion_percent: 40, evidence_required: false, process_id: 3, task_type: 'process', process_title: 'Apertura de sucursal', process_reference: 'Turno de mañana', process_step: 1, process_total_steps: 3 }, { ...baseTask, id: 3, task_id: 3, folio: 'T-003', title: 'Confirmar entrega pendiente', due_date: '2026-10-09', agenda_date: '2026-10-09', priority: 'medium', is_overdue: true, evidence_required: false }];
let grants = [...capabilities];
let browser, page;
const errors = [], unexpected = [], mutations = [];
let failUpload = true, holdCompletion, releaseCompletion;
try {
  await mkdir(artifacts, { recursive: true });
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.INDICE_CHROME_PATH ? { executablePath: process.env.INDICE_CHROME_PATH } : {}) });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date(`${date}T12:00:00`));
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language', 'es-MX'));
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/synthetic-upload', route => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const base = '/api/v2/multi-kiosks/public/synthetic-link';
    const reply = data => route.fulfill({ json: { data, meta: {} } });
    if (!url.pathname.startsWith(base)) { unexpected.push(url.pathname); return route.fulfill({ status: 500, json: {} }); }
    const path = decodeURIComponent(url.pathname.slice(base.length));
    if (!path) return reply(bootstrap);
    if (method !== 'GET') assert.equal(req.headers()['x-csrf-token'], bootstrap.csrf_token);
    if (path === '/sessions') return reply(session);
    assert.equal(req.headers()['x-multi-kiosk-session-token'], session.session_token);
    if (path === '/session') return reply(session);
    if (path === '/today') return reply({ date, attendance: null, tasks: null });
    if (path === '/messaging/unread') return reply(0);
    if (path === '/kiosks/11/sessions') return reply({ kiosk_session_id: 'child', kiosk_session_token: 'synthetic-child', experience_status: 'READY' });
    if (path === '/kiosks/11/workspace') return reply({ kiosk: card, session: { id: 'child', capabilities: grants, expires_at: session.expires_at }, experience_status: 'READY', bootstrap: { user: { id: 7, full_name: 'Ana Prueba' }, tasks, occasional_processes: { items: [{ id: 3, folio: 'P-003', title: 'Apertura de sucursal', taskCount: 3 }] } } });
    assert.equal(req.headers()['x-kiosk-session-token'], 'synthetic-child');
    assert.ok(req.headers()['idempotency-key']);
    const body = req.postDataJSON();
    mutations.push({ path, body });
    const task = tasks.find(item => item.id === body.resource_id);
    if (path.endsWith('task.attachment.presign@1')) {
      if (failUpload) { failUpload = false; return route.fulfill({ status: 503, json: { error: { message: 'Error de carga sintético' } } }); }
      return reply({ object_key: 'synthetic-photo', upload_url: 'http://127.0.0.1:5198/synthetic-upload' });
    }
    if (path.endsWith('task.attachment.register@1')) { tasks = tasks.map(item => item.id === task.id ? { ...item, attachments: 1, evidence_satisfied: true } : item); return reply({ items: tasks }); }
    if (path.endsWith('task.complete@1')) { if (holdCompletion) await holdCompletion; tasks = tasks.map(item => item.id === task.id ? { ...item, status: 'completed', completion_percent: 100, completed_at: `${date}T12:00:00` } : item); return reply({ items: tasks, task: tasks.find(item => item.id === task.id) }); }
    if (path.endsWith('task.create@1')) { const item = { ...baseTask, id: 4, task_id: 4, folio: 'T-004', ...body, evidence_required: false }; tasks = [...tasks, item]; return reply({ items: tasks, task: item }); }
    if (path.endsWith('task.agenda.update@1')) { tasks = tasks.map(item => item.id === task.id ? { ...item, ...body } : item); return reply({ items: tasks }); }
    if (path.endsWith('occasional.preview@1')) return reply({ preview: { processId: 3, reference: body.reference, startDate: body.start_date, version: 1, duplicateReference: true, matchingRuns: 1, tasks: [{ templateId: 1, title: 'Inspeccionar estación', position: 1, stage: 1, assignees: ['Ana Prueba'], evidenceRequired: true, scheduledDate: date, dueDate: date }] } });
    if (path.endsWith('occasional.create@1')) return reply({ items: tasks, run: { folio: 'RUN-001' } });
    unexpected.push(path); return route.fulfill({ status: 500, json: {} });
  });
  await page.goto('http://127.0.0.1:5198/tests/browser/kiosk-employee.html');
  await page.locator('input[inputmode="numeric"]').fill('11111');
  await page.getByRole('button', { name: 'Entrar a mis kioscos', exact: true }).click();
  const openTool = async () => { await page.getByRole('button', { name: 'Herramientas', exact: true }).click(); await page.getByRole('button', { name: 'Abrir: Mis tareas', exact: true }).click(); };
  await openTool();
  const workspace = page.locator('[data-employee-task-workspace]');
  await workspace.getByRole('heading', { name: 'Agenda operativa' }).waitFor();
  const dialog = page.getByRole('dialog');
  const cards = workspace.locator('[data-personal-task-card]');
  assert.equal(await cards.count(), 3);
  const layout = async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'page must not overflow');
    const clipped = await workspace.locator('button, input, summary').evaluateAll(nodes => nodes.filter(node => node.checkVisibility() && !node.disabled).filter(node => { const box = node.getBoundingClientRect(); return box.height < 44 || box.width < 44; }).map(node => node.textContent));
    assert.deepEqual(clipped, [], 'touch targets');
  };
  for (const width of [320, 360, 390, 430, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await layout();
    for (const name of ['Horario', 'Tablero', 'Agenda']) { await workspace.getByRole('button', { name, exact: true }).click(); await layout(); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(artifacts, 'agenda-390.png'), fullPage: true });
  const search = workspace.getByRole('searchbox');
  await search.fill('materiales'); assert.equal(await cards.count(), 1);
  await search.fill('sin-coincidencias'); assert.equal(await cards.count(), 0);
  await workspace.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click();
  assert.equal(await search.evaluate(node => node === document.activeElement), true); assert.equal(await cards.count(), 3);
  await workspace.getByRole('button', { name: 'Filtros', exact: true }).click();
  await dialog.getByRole('combobox', { name: /^Trabajo abierto/ }).selectOption('completed');
  await dialog.getByRole('button', { name: 'Ver tareas', exact: true }).click();
  assert.equal(await workspace.getByRole('button', { name: 'Tablero', exact: true }).isDisabled(), true);
  await workspace.getByRole('button', { name: 'Filtros', exact: true }).click();
  await dialog.getByRole('combobox', { name: /^Trabajo abierto/ }).selectOption('pending_overdue');
  await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 0);
  await cards.filter({ hasText: 'Revisar apertura' }).getByRole('button').click();
  const complete = dialog.getByRole('button', { name: 'Cerrar tarea', exact: true });
  assert.equal(await complete.isDisabled(), true, 'mandatory evidence blocks completion');
  await page.screenshot({ path: resolve(artifacts, 'detail-390.png'), fullPage: false, animations: 'disabled' });
  const evidence = { name: 'evidencia.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=', 'base64') };
  await dialog.locator('input[type="file"]').setInputFiles(evidence);
  await dialog.getByRole('alert').waitFor(); assert.equal(await complete.isDisabled(), true);
  await dialog.locator('input[type="file"]').setInputFiles(evidence);
  await dialog.getByText('La evidencia requerida está lista.', { exact: true }).waitFor();
  await dialog.locator('textarea').fill('Revisión completada con evidencia sintética.');
  holdCompletion = new Promise(resolve => { releaseCompletion = resolve; });
  await complete.click();
  await page.waitForFunction(() => document.querySelector('[role="dialog"] [aria-busy="true"]'));
  await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 1);
  assert.equal(await complete.isDisabled(), true); releaseCompletion(); holdCompletion = null;
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(mutations.filter(item => item.path.endsWith('task.complete@1')).length, 1);
  assert.equal(mutations.find(item => item.path.endsWith('task.complete@1')).body.completion_notes, 'Revisión completada con evidencia sintética.');
  await workspace.getByRole('button', { name: 'Filtros', exact: true }).click();
  await dialog.getByRole('combobox', { name: /^Trabajo abierto/ }).selectOption('pending_overdue'); await page.keyboard.press('Escape');
  await workspace.getByRole('button', { name: 'Horario', exact: true }).click();
  await workspace.getByRole('button', { name: /.*horario: Preparar materiales/i }).click();
  await dialog.locator('input[type="time"]').fill('11:00');
  await dialog.getByRole('button', { name: '30 min', exact: true }).click();
  await dialog.getByRole('button', { name: 'Guardar horario', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  assert.equal(mutations.find(item => item.path.endsWith('task.agenda.update@1')).body.agenda_end_time, '11:30');
  await workspace.getByRole('button', { name: /Crear tarea/, exact: true }).click();
  await dialog.locator('input[maxlength="220"]').fill('Nueva tarea de prueba');
  await dialog.getByRole('button', { name: /Crear tarea/, exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  assert.ok(tasks.some(item => item.title === 'Nueva tarea de prueba'));
  await workspace.getByRole('button', { name: 'Iniciar proceso', exact: true }).click();
  await dialog.getByRole('combobox', { name: /^Proceso/ }).selectOption('3');
  await dialog.getByLabel('Referencia', { exact: true }).fill('Apertura de prueba');
  await dialog.getByRole('button', { name: 'Revisar tareas', exact: true }).click();
  await dialog.getByText(/Ya existen 1 ejecuciones/).waitFor();
  await page.screenshot({ path: resolve(artifacts, 'process-390.png'), fullPage: false, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Cambiar datos', exact: true }).click();
  assert.equal(await dialog.getByLabel('Referencia', { exact: true }).inputValue(), 'Apertura de prueba');
  await dialog.getByRole('button', { name: 'Revisar tareas', exact: true }).click();
  await dialog.getByRole('button', { name: 'Iniciar de todas formas', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  assert.equal(mutations.filter(item => item.path.endsWith('occasional.create@1')).length, 1);
  assert.equal(mutations.find(item => item.path.endsWith('occasional.create@1')).body.allow_duplicate_reference, true);
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await layout(); }
    await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: resolve(artifacts, `agenda-${dark ? 'dark' : 'light'}.png`), fullPage: true });
    const failures = await workspace.evaluate(root => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rgba = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v); };
      const blend = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3]));
      const luminance = color => color.slice(0, 3).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const background = element => { const chain = []; for (let el = element; el; el = el.parentElement) chain.unshift(rgba(getComputedStyle(el).backgroundColor)); return chain.reduce((bg, color) => blend(color, bg), [255, 255, 255]); };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), failures = []; let node;
      while ((node = walker.nextNode())) {
        const el = node.parentElement, text = node.textContent.trim();
        if (!text || el.closest('[aria-hidden="true"], .sr-only, [disabled]') || !el.checkVisibility()) continue;
        const style = getComputedStyle(el), bg = background(el), fg = blend(rgba(style.color), bg);
        const ratio = (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05);
        if (ratio < (parseFloat(style.fontSize) >= 24 ? 3 : 4.5)) failures.push({ text, ratio });
      }
      return failures;
    });
    assert.deepEqual(failures, [], `text contrast in ${dark ? 'dark' : 'light'} mode`);
  }
  await page.evaluate(() => localStorage.setItem('indice-kiosk-accessibility-mode', JSON.stringify({ largeText: true })));
  await page.reload(); await openTool();
  for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await layout(); }
  await page.screenshot({ path: resolve(artifacts, 'agenda-large.png'), fullPage: true });
  grants = capabilities.filter(value => value.endsWith('tasks.read@1') || value.includes('attachment.'));
  tasks = tasks.map(task => ({ ...task, can_complete: false, can_reschedule: false, can_add_evidence: false }));
  await page.reload(); await openTool();
  assert.equal(await workspace.getByRole('button', { name: 'Iniciar proceso', exact: true }).count(), 0);
  assert.equal(await workspace.getByRole('button', { name: 'Crear tarea', exact: true }).count(), 0);
  await cards.first().getByRole('button').click();
  assert.equal(await dialog.getByRole('button', { name: 'Cerrar tarea', exact: true }).count(), 0);
  assert.equal(await dialog.locator('input[type="file"]').count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('Tasks kiosk: responsive agenda/schedule/board, search, filters, evidence retry, completion, schedule, quick capture, process review and restricted capabilities passed (synthetic APIs).');
} catch (error) {
  if (page) { await page.screenshot({ path: resolve(artifacts, 'failure.png'), fullPage: true }).catch(() => {}); console.error((await page.locator('body').innerText()).slice(-5000), errors, unexpected); }
  throw error;
} finally { await browser?.close(); await server.close(); }
