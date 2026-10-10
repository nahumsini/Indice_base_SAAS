import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host:'127.0.0.1', port:5198, strictPort:true }, define:{ 'import.meta.env.VITE_API_BASE_URL':'""' } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless:true, ...(process.env.INDICE_CHROME_PATH ? { executablePath:process.env.INDICE_CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport:{ width:390, height:844 } });
  page.setDefaultTimeout(30000);
  const errors = [], unexpected = [], sentKeys = [];
  let user = 2, readCalls = 0, failSend = true, unread = 1;
  let holdSend, sendStarted;
  const now = new Date().toISOString();
  let companyLogo = '/company-logo-fixture.png';
  const conversations = [{ id:31, companyId:1, companyName:'Test company', kind:'DIRECT', subject:'Turno con Luis', requesterName:'Ana', status:'OPEN', priority:'MEDIUM', version:1, updatedAt:now, unreadCount:1 }];
  const messages = [{ id:1, conversationId:31, senderUserId:3, senderName:'Luis', senderScope:'MEMBER', visibility:'PUBLIC', body:'Todo listo para tu turno', createdAt:now, attachments:[{ id:'sample', fileName:'sample.png', contentType:'image/png', sizeBytes:68 }] }];
  const cards = [{ id:11, name:'Mis tareas', module:'PROCESS_TASKS', module_slug:'processes-tasks', tool_key:'employee.my-tasks@1', workspace_kind:'MY_TASKS', purpose:'Organiza tu trabajo.', availability:'AVAILABLE' }];
  cards.push(
    { id:12, name:'Recursos Humanos', module:'HUMAN_RESOURCES', tool_key:'employee.attendance@1', purpose:'Consulta tu asistencia y permisos.', availability:'AVAILABLE' },
    { id:13, name:'Venta en ruta', module:'SALES', tool_key:'employee.route-sales@1', purpose:'Atiende clientes desde tu celular.', availability:'AVAILABLE' },
    { id:14, name:'Revisión de turno', module:'POINT_OF_SALE', workspace_kind:'WAITER_STATION', purpose:'Opera las mesas de tu turno.', availability:'VERIFICATION_REQUIRED' },
    { id:15, name:'Cuentas por pagar', module:'EXPENSES', purpose:'Registra cuentas y comprobantes.', availability:'AVAILABLE' },
    { id:16, name:'Caja chica', module:'PETTY_CASH', purpose:'Consulta tus movimientos.', availability:'AVAILABLE' },
  );
  const session = () => ({ session_token:`synthetic-pin-${user}`, session_id:`parent-${user}`, employee:{ name:user === 2 ? 'Ana Prueba' : 'Luis Prueba' }, identity:{ type:'USER', id:user, name:user === 2 ? 'Ana Prueba' : 'Luis Prueba' }, kiosks:cards, expires_at:new Date(Date.now()+3600000).toISOString() });
  await page.route('**/company-logo-fixture.png', route => route.fulfill({ contentType:'image/png', body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=','base64') }));
  await page.route('**/broken-company-logo.png', route => route.fulfill({ status:404, body:'' }));
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
  await page.addInitScript(() => localStorage.setItem('frontend-indice-language','es-MX'));
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const base = '/api/v2/multi-kiosks/public/synthetic-link';
    const reply = data => route.fulfill({ json:{ data, meta:{} } });
    if (!url.pathname.startsWith(base)) { unexpected.push(`${method} ${url.pathname}`); return route.fulfill({ status:500, json:{} }); }
    const path = url.pathname.slice(base.length);
    if (!path) return reply({ id:1, name:'Mi espacio', company_name:'Empresa de prueba', company_logo_url:companyLogo, audience_type:'EMPLOYEE', theme_key:'indice-blue', locale:'es-MX', csrf_token:'synthetic-csrf', status:'ACTIVE' });
    if (method !== 'GET') assert.equal(request.headers()['x-csrf-token'], 'synthetic-csrf');
    if (path === '/sessions') { user = request.postDataJSON().pin === '22222' ? 3 : 2; return reply(session()); }
    assert.equal(request.headers()['x-multi-kiosk-session-token'], `synthetic-pin-${user}`);
    if (path === '/session') return reply(method === 'DELETE' ? { signed_out:true } : session());
    if (path === '/today') return reply({ date:'2026-10-09', attendance:null, tasks:{ kioskId:11, day:{ pending:2, overdue:1, items:[{ id:10, title:'Preparar apertura', dueDate:'2026-10-09', status:'pending' }] } } });
    if (path === '/kiosks/11/sessions') return reply({ kiosk_session_id:'child', kiosk_session_token:'synthetic-child', experience_status:'READY' });
    if (path === '/kiosks/11/workspace') return reply({ kiosk:cards[0], session:{ id:'child', capabilities:['process-tasks.tasks.read@1'], expires_at:now }, experience_status:'READY', bootstrap:{ user:{ id:user, full_name:user === 2 ? 'Ana Prueba' : 'Luis Prueba' }, tasks:[] } });
    if (path === '/messaging/context') return reply({ userId:user, companyId:1, membershipId:user, distributor:null, supportOnly:false });
    if (path === '/messaging/task-context') return reply({ canCreate:false });
    if (path === '/messaging/unread') return reply(unread);
    if (path === '/messaging/directory') return reply([{ id:3, name:'Luis' }]);
    if (path === '/messaging/conversations/31/attachments/sample') return reply({ url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=' });
    if (path === '/messaging/conversations') return reply({ items:user === 2 ? conversations : [], hasMore:false });
    if (path === '/messaging/conversations/31' && method === 'GET') return reply({ conversation:conversations[0], messages:{ items:messages.filter(m => m.id > Number(url.searchParams.get('after') || 0)), hasMore:false } });
    if (path.endsWith('/read')) { readCalls++; unread = 0; return reply({}); }
    if (path.endsWith('/messages')) {
      const body = request.postDataJSON(); sentKeys.push(body.requestKey);
      if (holdSend) { sendStarted?.(); await holdSend; }
      let message = messages.find(m => m.requestKey === body.requestKey);
      if (!message) { message = { id:messages.length + 1, conversationId:31, senderUserId:user, senderName:'Ana Prueba', senderScope:'MEMBER', createdAt:now, attachments:[], ...body }; messages.push(message); }
      if (failSend) { failSend = false; return route.fulfill({ status:503, json:{ error:{ code:'TEMPORARY', message:'Try again' } } }); }
      return reply(message);
    }
    unexpected.push(`${method} ${path}`); return route.fulfill({ status:500, json:{} });
  });
  await page.goto('http://127.0.0.1:5198/tests/browser/kiosk-employee.html');
  await page.locator('[data-kiosk-company-logo] img').waitFor();
  await page.locator('input[inputmode="numeric"]').fill('11111').catch(async error => { console.error('Fixture state', await page.locator('body').innerText(), unexpected, errors); throw error; });
  await page.getByRole('button',{ name:'Entrar a mis kioscos', exact:true }).click();
  await page.getByRole('button',{ name:'Ver mis tareas', exact:true }).waitFor();
  await page.locator('[data-kiosk-company-logo] img').waitFor();
  assert.equal(await page.locator('[data-kiosk-company-logo] img').getAttribute('src'),companyLogo);
  await page.getByRole('button',{ name:'Herramientas', exact:true }).click();
  const tools = page.locator('[data-employee-kiosk-home]');
  const toolIds = () => tools.locator('[data-multi-kiosk-id]').evaluateAll(items => items.map(item => Number(item.dataset.multiKioskId)));
  assert.deepEqual(await toolIds(),cards.map(card=>card.id),'authorized order is preserved');
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height:900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    assert.ok(await page.locator('[data-multi-kiosk-app-bar]').evaluate(el => el.getBoundingClientRect().height) < 82);
    assert.equal(await tools.locator('[data-kiosk-tool-grid]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width<768?1:width<1280?2:3);
  }
  await page.setViewportSize({ width:390, height:844 });
  const search = page.getByRole('searchbox',{name:'Buscar una herramienta',exact:true});
  await search.fill('revision');
  assert.deepEqual(await toolIds(),[14],'search ignores accents');
  await tools.getByText('Solicitará verificación al abrir',{exact:true}).waitFor();
  await page.getByRole('button',{ name:'Hoy', exact:true }).click();
  await page.getByRole('button',{ name:'Herramientas', exact:true }).click();
  assert.equal(await search.inputValue(),'revision','search survives tab changes');
  await search.fill('sin coincidencias');
  await tools.getByText('No hay accesos que coincidan con tu búsqueda.',{exact:true}).waitFor();
  await tools.getByRole('button',{name:'Limpiar búsqueda',exact:true}).last().click();
  assert.equal(await search.inputValue(),'');
  assert.equal(await search.evaluate(el=>el===document.activeElement),true,'clearing restores search focus');
  assert.deepEqual(await toolIds(),cards.map(card=>card.id));
  await search.fill('caja');
  assert.deepEqual(await toolIds(),[16]);
  await tools.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();
  await tools.getByRole('button',{name:'Abrir: Mis tareas',exact:true}).click();
  await page.locator('[data-task-kiosk-toolbar]').waitFor();
  assert.equal(await page.locator('[data-task-advanced-controls]').getAttribute('open'), null);
  await page.getByRole('button',{ name:/^Mensajes/ }).first().click();
  await page.getByRole('button',{ name:/Turno con Luis/ }).click();
  await page.getByText('Todo listo para tu turno',{ exact:true }).waitFor();
  await page.getByRole('img', { name:'sample.png', exact:true }).waitFor();
  const input = page.getByRole('textbox',{ name:'Mensaje', exact:true });
  await input.fill('Borrador protegido');
  await page.getByRole('button',{ name:'Hoy', exact:true }).click();
  await page.getByRole('button',{ name:'Seguir aquí', exact:true }).click();
  assert.equal(await input.inputValue(),'Borrador protegido');
  await page.getByRole('button',{ name:/Cerrar sesión/ }).click();
  await page.getByRole('button',{ name:'Seguir aquí', exact:true }).click();
  await page.getByRole('button',{ name:'Enviar', exact:true }).click();
  await page.getByRole('alert').filter({ hasText:'No se pudo completar' }).waitFor();
  assert.equal(await input.inputValue(),'Borrador protegido');
  await page.getByRole('button',{ name:'Enviar', exact:true }).click();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="Mensaje"]')?.value === '');
  assert.equal(sentKeys[0],sentKeys[1], 'retry uses the same message key');
  assert.equal(messages.filter(m => m.body === 'Borrador protegido').length,1);
  await page.getByRole('button',{ name:'Hoy', exact:true }).click();
  const readBefore = readCalls;
  messages.push({ id:messages.length+1, conversationId:31, senderUserId:3, senderName:'Luis', senderScope:'MEMBER', visibility:'PUBLIC', body:'Mensaje mientras ves Hoy', createdAt:now, attachments:[] });
  await page.waitForTimeout(3400);
  assert.equal(readCalls,readBefore,'hidden conversation must not mark new messages read');
  await page.getByRole('button',{ name:/^Mensajes/ }).first().click();
  await page.getByText('Mensaje mientras ves Hoy',{ exact:true }).waitFor();
  await input.fill('Envío protegido');
  let release;
  holdSend = new Promise(resolve => { release=resolve; });
  const started = new Promise(resolve => { sendStarted=resolve; });
  await page.getByRole('button',{ name:'Enviar', exact:true }).click(); await started;
  await page.getByRole('button',{ name:/Cerrar sesión/ }).click();
  assert.equal(await page.locator('input[inputmode="numeric"]').count(),0,'cannot leave while sending');
  release(); holdSend=null;
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="Mensaje"]')?.value === '');
  await page.getByRole('button',{ name:/Cerrar sesión/ }).click();
  await page.locator('input[inputmode="numeric"]').fill('22222');
  await page.getByRole('button',{ name:'Entrar a mis kioscos', exact:true }).click();
  await page.getByRole('heading',{ name:'Luis Prueba', exact:true }).waitFor();
  await page.locator('[data-kiosk-company-logo] img').waitFor();
  assert.equal(await page.locator('[data-kiosk-company-logo] img').getAttribute('src'),companyLogo,'company branding survives employee change');
  await page.getByRole('button',{ name:/^Mensajes/ }).first().click();
  await page.getByText('Todavía no hay conversaciones aquí.',{ exact:true }).waitFor();
  assert.equal(await page.getByText('Borrador protegido',{ exact:true }).count(),0);
  assert.equal(await page.getByText('Todo listo para tu turno',{ exact:true }).count(),0);
  companyLogo = '/broken-company-logo.png';
  const failedLogo = page.waitForResponse('**/broken-company-logo.png');
  await page.reload();
  assert.equal((await failedLogo).status(),404);
  await page.locator('[data-kiosk-company-logo] [data-slot="avatar-fallback"]').waitFor();
  assert.equal(await page.locator('[data-kiosk-company-logo]').innerText(),'🏢');
  companyLogo = '';
  await page.reload();
  await page.locator('[data-kiosk-company-logo] [data-slot="avatar-fallback"]').waitFor();
  assert.equal(await page.locator('[data-kiosk-company-logo] img').count(),0);
  assert.equal(await page.locator('[data-kiosk-company-logo]').innerText(),'🏢');
  assert.deepEqual(unexpected,[]); assert.deepEqual(errors,[]);
  console.log('Employee kiosk: responsive tools, authorized order, accent-insensitive search, clear/focus, empty recovery, tool launch, company logo, messaging isolation, drafts, retry and logout passed.');
} finally { await browser?.close(); await server.close(); }
