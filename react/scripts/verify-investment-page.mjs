// Local production-build smoke test; no credentials, live backend, or database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, resolve, sep } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist');
const output = resolve(import.meta.dirname, '../../.run/investment-review');
await mkdir(output, { recursive: true });
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) {
      response.writeHead(503);
      response.end();
      return;
    }
    const path = resolve(dist, `.${pathname}`);
    if (path !== dist && !path.startsWith(dist + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const file = extname(path) ? path : resolve(dist, 'index.html');
    response.setHeader('Content-Type', `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`);
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise(ready => server.listen(0, '127.0.0.1', ready));

const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(resolve(tmpdir(), 'indice-investment-review-'));
const chrome = process.env.INVESTMENT_REVIEW_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
let shuttingDown = false;
try {
  const endpoint = await new Promise((ready, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 20000);
    let log = '';
    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.stderr.on('data', chunk => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        ready(match[1]);
      }
    });
  });
  const address = new URL(endpoint);
  const page = await (await fetch(`http://${address.host}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ready, reject) => {
    socket.addEventListener('open', ready, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const exceptions = [];
  const apiRequests = [];
  const failedRequests = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent' && /\/api\//.test(message.params.request.url)) {
      apiRequests.push(message.params.request.url);
    }
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
      failedRequests.push(message.params.errorText);
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
  });
  socket.addEventListener('close', () => {
    if (shuttingDown) {
      pending.clear();
      return;
    }
    for (const request of pending.values()) request.reject(new Error('Chrome disconnected'));
    pending.clear();
  });

  const send = (method, params = {}) => new Promise((ready, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, 20000);
    pending.set(id, {
      resolve: result => {
        clearTimeout(timer);
        ready(result);
      },
      reject: error => {
        clearTimeout(timer);
        reject(error);
      },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = expression => evaluate(`new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (${expression}) resolve(true);
      else if (Date.now() - start > 15000) reject(new Error('Page readiness timeout'));
      else setTimeout(check, 50);
    };
    check();
  })`);
  const screenshot = async name => {
    await evaluate('new Promise(resolve => setTimeout(resolve, 180))');
    const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(resolve(output, `${name}.png`), Buffer.from(capture.data, 'base64'));
  };
  const selectedIndex = () => evaluate('[...document.querySelectorAll("[role=tab]")].findIndex(tab => tab.getAttribute("aria-selected") === "true")');
  const clickTab = async index => {
    await evaluate(`(() => {
      const tab = document.querySelectorAll('[role=tab]')[${index}];
      if (!tab) throw new Error('Missing tab ${index}');
      tab.click();
      return true;
    })()`);
    await waitFor(`[...document.querySelectorAll('[role=tab]')].findIndex(tab => tab.getAttribute('aria-selected') === 'true') === ${index}`);
  };
  const openMenu = async (triggerExpression, menuSelector) => {
    await evaluate(`(() => {
      const trigger = ${triggerExpression};
      if (!trigger) throw new Error('Missing menu trigger: ${menuSelector}');
      trigger.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      trigger.focus();
      trigger.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
      }));
      return true;
    })()`);
    await waitFor(`document.querySelector(${JSON.stringify(menuSelector)})`);
  };
  const closeOpenMenu = () => send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  const assertNoDocumentOverflow = async label => {
    const dimensions = await evaluate('({ scrollWidth: document.documentElement.scrollWidth, innerWidth })');
    assert.ok(dimensions.scrollWidth <= dimensions.innerWidth + 1, `${label}: ${dimensions.scrollWidth}px document in ${dimensions.innerWidth}px viewport`);
  };
  const assertMenuWithinViewport = async (selector, label) => {
    const bounds = await evaluate(`(() => {
      const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth };
    })()`);
    assert.ok(bounds.left >= -1, `${label} extends past the left edge`);
    assert.ok(bounds.right <= bounds.viewport + 1, `${label} extends past the right edge`);
  };

  const locales = [
    ['es-MX', 'Español (México)'],
    ['es-CO', 'Español (Colombia)'],
    ['en-US', 'English (USA)'],
    ['en-CA', 'English (Canada)'],
    ['fr-CA', 'Français (Québec)'],
    ['pt-BR', 'Português (Brasil)'],
    ['ko-CA', '한국어 (캐나다)'],
    ['zh-CA', '中文 (加拿大)'],
  ];
  const tabIds = ['overview', 'modules', 'market', 'business', 'partners', 'ai', 'proforma'];

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/investment` });
  await waitFor('document.querySelectorAll("[role=tab]").length === 7');
  assert.equal(await selectedIndex(), 0);
  assert.equal(await evaluate('document.querySelector(".investment-page")?.lang'), 'es-MX');
  assert.equal(await evaluate('document.querySelectorAll(".investment-header").length'), 1);
  assert.equal(await evaluate('document.querySelectorAll(".investment-workbar").length'), 1);
  assert.equal(await evaluate('document.querySelectorAll(".investment-module-titlebar").length'), 1);
  assert.equal(await evaluate('document.querySelectorAll(".investment-kpi-strip").length'), 0);
  assert.equal(await evaluate('document.querySelectorAll("[role=tab] .investment-tab-emoji").length'), 7);
  assert.equal(await evaluate('document.querySelectorAll(".investment-overview-copy").length'), 1);
  assert.equal(await evaluate('document.querySelectorAll(".investment-overview-paragraph").length'), 3);
  assert.equal(await evaluate('document.querySelectorAll(".investment-card").length'), 0);
  assert.equal(await evaluate('document.querySelectorAll(".investment-next").length'), 0);
  assert.equal(await evaluate('document.querySelector("meta[name=robots]")?.content'), 'noindex, nofollow, noarchive');
  assert.match(await evaluate('document.title'), /^Índice \| /);
  await assertNoDocumentOverflow('initial desktop layout');
  await screenshot('desktop-overview');

  // Menus are intentionally static: they explain the real header without calling tenant APIs.
  const originalUrl = await evaluate('location.href');
  await openMenu('document.querySelector(".investment-notification-count")?.closest("button")', '.investment-notifications-menu');
  assert.equal(await evaluate('document.querySelectorAll(".investment-notification-item").length'), 6);
  await evaluate('document.querySelector(".investment-notification-item").click()');
  assert.equal(await evaluate('location.href'), originalUrl);
  await closeOpenMenu();
  await waitFor('!document.querySelector(".investment-notifications-menu")');

  await openMenu('document.querySelector(".investment-avatar")?.closest("button")', '.investment-profile-menu');
  assert.equal(await evaluate('document.querySelectorAll(".investment-profile-item").length'), 7);
  assert.equal(await evaluate('document.querySelectorAll(".investment-profile-logout").length'), 1);
  await evaluate('document.querySelector(".investment-profile-item").click()');
  assert.equal(await evaluate('location.href'), originalUrl);
  await closeOpenMenu();
  await waitFor('!document.querySelector(".investment-profile-menu")');

  // Every locale must keep all seven presentation sections usable.
  for (const [locale, languageName] of locales) {
    if (await evaluate('document.querySelector(".investment-page")?.lang') !== locale) {
      await openMenu('document.querySelector(".investment-language-flag")?.closest("button")', '.investment-language-menu');
      await evaluate(`(() => {
        const option = [...document.querySelectorAll('.investment-language-menu [role=menuitem]')]
          .find(item => item.textContent.includes(${JSON.stringify(languageName)}));
        if (!option) throw new Error('Missing locale ${locale}');
        option.click();
        return true;
      })()`);
      await waitFor(`document.querySelector('.investment-page')?.lang === ${JSON.stringify(locale)}`);
    }
    assert.equal(await evaluate('document.querySelectorAll("[role=tab]").length'), 7);
    const labels = await evaluate('[...document.querySelectorAll("[role=tab]")].map(tab => tab.textContent.trim())');
    assert.equal(labels.length, 7);
    assert.equal(new Set(labels).size, 7, `${locale} tab labels must be distinct`);
    assert.ok(labels.every(Boolean), `${locale} tab labels must not be empty`);
    assert.match(await evaluate('document.title'), /^Índice \| /);

    for (let index = 0; index < tabIds.length; index++) {
      await clickTab(index);
      assert.ok(await evaluate('document.querySelector("[role=tabpanel]")?.textContent.trim().length > 100'), `${locale}/${tabIds[index]} needs useful content`);
      if (index === 0) assert.equal(await evaluate('document.querySelectorAll(".investment-overview-paragraph").length'), 3, `${locale} needs three overview paragraphs`);
      if (index === 1) {
        assert.equal(await evaluate('document.querySelectorAll(".investment-module-table").length'), 1, `${locale} needs the module table`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-module-table tbody tr").length'), 10, `${locale} needs ten product surfaces`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-module-table thead th").length'), 3, `${locale} needs module, function, and tool columns`);
        if (locale === 'es-MX') await screenshot('desktop-modules');
      }
      if (index === 2) {
        assert.equal(await evaluate('document.querySelectorAll(".investment-evidence--criteria").length'), 1, `${locale} needs emphasized fit signals`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-criterion-number").length'), 3, `${locale} needs three fit signals`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-next--market").length'), 1, `${locale} needs the market decision callout`);
        if (locale === 'es-MX') await screenshot('desktop-market');
      }
      if (index === 3) {
        assert.equal(await evaluate('document.querySelectorAll(".investment-customer-journey").length'), 1, `${locale} needs the customer journey`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-customer-phase").length'), 2, `${locale} needs both customer-journey phases`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-customer-phase li").length'), 6, `${locale} needs all six customer-journey steps`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-customer-phase .is-pivotal").length'), 1, `${locale} needs the pivotal free consultation`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-customer-phase .is-included").length'), 1, `${locale} needs the included monthly session`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-card").length'), 0, `${locale} must not show the former pricing cards in the journey`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-next--business").length'), 1, `${locale} needs the journey outcome`);
        if (locale === 'es-MX') await screenshot('desktop-business');
      }
      if (index === 4) {
        assert.equal(await evaluate('document.querySelectorAll(".investment-partner-academy").length'), 1, `${locale} needs the web academy summary`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-partner-certification-path article").length'), 3, `${locale} needs the three certification milestones`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-partner-resources > a").length'), 3, `${locale} needs the protected PDF links`);
        assert.equal(await evaluate(`document.querySelectorAll('.investment-partner-library-heading > a[href="/distributor-portal?tab=training"]').length`), 1, `${locale} needs the academy link`);
        assert.equal(await evaluate('[...document.querySelectorAll(".investment-partner-resources > a")].every(link => link.getAttribute("href").startsWith("/api/v1/distributor-portal/training/resources/") && link.getAttribute("href").endsWith("/pdf?download=true"))'), true, `${locale} needs protected PDF download routes`);
        if (locale === 'es-MX') await screenshot('desktop-partners');
      }
      if (index === 5) {
        assert.equal(await evaluate('document.querySelectorAll(".investment-items--ai .investment-card").length'), 9, `${locale} needs all current MCP capability groups`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-evidence--ai").length'), 1, `${locale} needs the AI connection roadmap`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-evidence--ai dl > div").length'), 3, `${locale} needs ChatGPT, Claude, and October 2026`);
        const aiCopy = await evaluate('document.querySelector("[role=tabpanel]")?.textContent ?? ""');
        assert.match(aiCopy, /ChatGPT/);
        assert.match(aiCopy, /Claude/);
        assert.match(aiCopy, /32/);
        assert.match(aiCopy, /64/);
        assert.match(aiCopy, /2026/);
        if (locale === 'es-MX') await screenshot('desktop-ai');
      }
      if (index === 6) {
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma").length'), 1, `${locale} needs the pro forma workspace`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma-evolution li").length'), 4, `${locale} needs four consultant milestones`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma-scenarios article").length'), 3, `${locale} needs the 10k, 20k, and 30k scenarios`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma-allocation-bar > span").length'), 5, `${locale} needs the complete allocation model`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma-network-grid > article").length'), 3, `${locale} needs the 30, 32, and 60 consultant scales`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma-network-grid > article.is-target").length'), 1, `${locale} needs the one-per-entity target`);
        assert.equal(await evaluate('document.querySelectorAll(".investment-proforma-note").length'), 1, `${locale} needs the projection qualification`);
        if (locale === 'es-MX') await screenshot('desktop-proforma');
      }
      await assertNoDocumentOverflow(`${locale}/${tabIds[index]} desktop layout`);
    }
  }

  // URL history, reload, and keyboard navigation remain deterministic.
  await evaluate('history.back()');
  await waitFor('[...document.querySelectorAll("[role=tab]")].findIndex(tab => tab.getAttribute("aria-selected") === "true") === 5');
  await evaluate('history.forward()');
  await waitFor('[...document.querySelectorAll("[role=tab]")].findIndex(tab => tab.getAttribute("aria-selected") === "true") === 6');
  await send('Page.reload');
  await waitFor('document.querySelectorAll("[role=tab]").length === 7');
  assert.equal(await selectedIndex(), 6);
  assert.equal(await evaluate('document.querySelector(".investment-page")?.lang'), 'es-MX', 'language is intentionally local state');
  await evaluate('document.querySelector("[role=tab][aria-selected=true]").focus()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
  await waitFor('[...document.querySelectorAll("[role=tab]")].findIndex(tab => tab.getAttribute("aria-selected") === "true") === 0');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await waitFor('[...document.querySelectorAll("[role=tab]")].findIndex(tab => tab.getAttribute("aria-selected") === "true") === 1');
  assert.equal(await evaluate('document.activeElement === document.querySelectorAll("[role=tab]")[1]'), true);

  // All tabs remain inside the viewport at the supported presentation widths.
  const widths = [320, 390, 768, 1440];
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    for (let index = 0; index < tabIds.length; index++) {
      await clickTab(index);
      await assertNoDocumentOverflow(`${tabIds[index]} at ${width}px`);
      if (width === 390 && index === 1) await screenshot('mobile-modules');
      if (width === 390 && index === 3) await screenshot('mobile-business');
      if (width === 390 && index === 4) await screenshot('mobile-partners');
      if (width === 390 && index === 5) await screenshot('mobile-ai');
    }
    if (width === 320) {
      await openMenu('document.querySelector(".investment-notification-count")?.closest("button")', '.investment-notifications-menu');
      await assertMenuWithinViewport('.investment-notifications-menu', 'notification menu at 320px');
      await closeOpenMenu();
      await waitFor('!document.querySelector(".investment-notifications-menu")');
      await openMenu('document.querySelector(".investment-language-flag")?.closest("button")', '.investment-language-menu');
      await assertMenuWithinViewport('.investment-language-menu', 'language menu at 320px');
      await closeOpenMenu();
      await waitFor('!document.querySelector(".investment-language-menu")');
      await openMenu('document.querySelector(".investment-avatar")?.closest("button")', '.investment-profile-menu');
      await assertMenuWithinViewport('.investment-profile-menu', 'profile menu at 320px');
      await closeOpenMenu();
      await waitFor('!document.querySelector(".investment-profile-menu")');
    }
    if (width === 390) await screenshot('mobile-proforma');
  }

  // Dark mode is explicit local UI state: it changes immediately and resets on reload.
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await clickTab(4);
  assert.equal(await evaluate('document.querySelectorAll(".investment-partner-academy").length'), 1);
  const storageBefore = await evaluate('JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })');
  await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('.investment-tools button[aria-pressed]')];
    const darkToggle = buttons[0];
    if (!darkToggle) throw new Error('Missing dark-mode toggle');
    darkToggle.click();
    return true;
  })()`);
  await waitFor('document.querySelector(".investment-page")?.classList.contains("investment-dark")');
  assert.equal(await evaluate('document.documentElement.style.colorScheme'), 'dark');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".investment-page")).backgroundColor'), 'rgb(17, 24, 39)');
  assert.equal(await evaluate('JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })'), storageBefore);
  await screenshot('desktop-dark-partners');
  await clickTab(5);
  assert.equal(await evaluate('document.querySelectorAll(".investment-evidence--ai").length'), 1);
  await screenshot('desktop-dark-ai');
  await clickTab(6);
  assert.equal(await evaluate('document.querySelectorAll(".investment-proforma").length'), 1);
  await screenshot('desktop-dark-proforma');
  await send('Page.reload');
  await waitFor('document.querySelectorAll("[role=tab]").length === 7');
  assert.equal(await evaluate('document.querySelector(".investment-page")?.classList.contains("investment-dark")'), false);
  assert.equal(await evaluate('document.documentElement.style.colorScheme'), 'light');

  await send('Page.navigate', { url: `${origin}/investment?tab=unknown` });
  await waitFor('document.querySelectorAll("[role=tab]").length === 7');
  assert.equal(await selectedIndex(), 0);
  await send('Page.navigate', { url: `${origin}/Mrcarlosmunoz` });
  await waitFor('document.querySelectorAll("[role=tab]").length === 8');
  assert.equal(await evaluate('document.querySelector(".investment-greeting")?.textContent.trim()'), '👋 Bienvenido, Carlos Muñoz');
  assert.equal(await evaluate('document.querySelector(".investment-footer p")?.textContent.trim()'), 'Muchos saludos también al señor Ricardo Moreno :P');
  assert.equal(await selectedIndex(), 0);
  await screenshot('desktop-carlos-munoz');
  await clickTab(7);
  assert.equal(await evaluate('document.querySelectorAll(".investment-acknowledgement").length'), 1);
  assert.equal(await evaluate('document.querySelector(".investment-acknowledgement")?.textContent.includes("un millón de empresarios en México se hagan chingones")'), true);
  assert.equal(await evaluate('document.querySelector(".investment-acknowledgement blockquote")?.textContent.trim()'), '“¿Dónde está la oportunidad?”');
  await screenshot('desktop-carlos-munoz-acknowledgement');
  await send('Page.navigate', { url: `${origin}/presentation` });
  await waitFor('document.querySelectorAll("[role=tab]").length === 6');
  assert.equal(await evaluate('document.querySelector(".investment-greeting")?.textContent.trim()'), '👋 Estimado cliente');
  assert.equal(await evaluate('document.querySelector(".investment-module-identity strong")?.textContent.trim()'), 'Presentación comercial');
  assert.equal(await evaluate('document.querySelector(".investment-company-pill span")?.textContent.trim()'), 'Presentación comercial');
  assert.equal(await evaluate('document.querySelector(".investment-select-control select")?.value'), 'MXN');
  assert.equal(await evaluate('document.querySelector(".investment-fullscreen-button")?.textContent.trim()'), 'Pantalla completa');
  const fullscreenButton = JSON.parse(await evaluate(`JSON.stringify((() => {
    const rect = document.querySelector('.investment-fullscreen-button').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })())`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fullscreenButton.x, y: fullscreenButton.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fullscreenButton.x, y: fullscreenButton.y, button: 'left', clickCount: 1 });
  await waitFor('document.fullscreenElement?.classList.contains("investment-page")');
  assert.equal(await evaluate('document.querySelector(".investment-fullscreen-button")?.getAttribute("aria-pressed")'), 'true');
  await evaluate('document.exitFullscreen()');
  await waitFor('!document.fullscreenElement');
  assert.equal(await evaluate('document.title'), 'Índice | Presentación comercial');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("[role=tab]")].map(tab => tab.lastElementChild?.textContent.trim())'), ['La propuesta', 'Operación conectada', 'Capacidades', 'Lupita y sus agentes', 'Precios', 'Implementación']);
  assert.equal(await selectedIndex(), 0);
  assert.equal(await evaluate('Boolean(document.querySelector(".investment-commercial--proposal"))'), true);
  await screenshot('desktop-presentation-proposal');
  assert.equal(await evaluate('document.querySelectorAll(".investment-technology-branches > div").length'), 4);
  await evaluate('document.querySelector(".investment-commercial-explore").click()');
  await waitFor('Boolean(document.querySelector(".investment-commercial--agents"))');
  assert.equal(await evaluate('new URL(location.href).searchParams.get("tab")'), 'agents');
  assert.equal(await evaluate('document.querySelectorAll(".investment-agent-specialists article").length'), 4);
  await clickTab(1);
  assert.equal(await evaluate('Boolean(document.querySelector(".investment-commercial--operation"))'), true);
  await waitFor('[...document.querySelectorAll(".investment-operation-network img")].every(image => image.complete && image.naturalWidth > 0)');
  assert.equal(await evaluate('document.querySelectorAll(".investment-operation-network img").length'), 5);
  assert.equal(await evaluate('[...document.querySelectorAll(".investment-operation-network img")].every(image => new URL(image.src).origin === location.origin)'), true, 'Operation images must be served locally');
  await screenshot('desktop-presentation-operation');
  await clickTab(2);
  assert.equal(await evaluate('Boolean(document.querySelector(".investment-commercial--capabilities"))'), true);
  assert.equal(await evaluate('document.querySelectorAll(".investment-capability-node").length'), 4);
  await screenshot('desktop-presentation-capabilities');
  await clickTab(3);
  assert.equal(await evaluate('Boolean(document.querySelector(".investment-commercial--agents"))'), true);
  await screenshot('desktop-presentation-agents');
  await clickTab(4);
  assert.equal(await evaluate('Boolean(document.querySelector(".investment-commercial--pricing"))'), true);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".investment-commercial-plan-price strong")].map(item => item.textContent.trim())'), ['$2,999', '$5,499', '$9,499']);
  assert.equal(await evaluate('document.querySelector(".investment-commercial-plan-common")?.textContent.includes("10 personas")'), true);
  assert.equal(await evaluate('document.querySelector(".investment-commercial-plan-common")?.textContent.includes("$899")'), true);
  assert.equal(await evaluate('document.querySelectorAll(".investment-commercial-pricing-grid article > small").length'), 3);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".investment-commercial-setup-prices strong")].map(item => item.textContent.trim())'), ['$4,999', '$7,499.50', '$12,499.50']);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".investment-commercial-setup-prices s")].map(item => item.textContent.trim())'), ['$9,999', '$14,999', '$24,999']);
  assert.equal(await evaluate('document.querySelector(".investment-commercial-community-offer")?.textContent.includes("octubre de 2026")'), true);
  assert.equal(await evaluate('document.querySelector(".investment-commercial-community-offer")?.textContent.includes("pago único")'), true);
  await screenshot('desktop-presentation-pricing');
  await clickTab(5);
  assert.equal(await evaluate('Boolean(document.querySelector(".investment-commercial--implementation"))'), true);
  assert.equal(await evaluate('document.querySelectorAll(".investment-implementation-map > ol > li").length'), 4);
  await screenshot('desktop-presentation-implementation');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
  for (let index = 0; index < 6; index++) {
    await clickTab(index);
    await assertNoDocumentOverflow(`commercial presentation tab ${index + 1} at 390px`);
    if (index === 0) await screenshot('mobile-presentation-proposal');
    if (index === 1) await screenshot('mobile-presentation-operation');
    if (index === 2) await screenshot('mobile-presentation-capabilities');
    if (index === 3) await screenshot('mobile-presentation-agents');
    if (index === 4) await screenshot('mobile-presentation-pricing');
  }
  await screenshot('mobile-presentation-implementation');
  for (const [locale, languageName] of locales) {
    if (await evaluate('document.querySelector(".investment-page")?.lang') !== locale) {
      await openMenu('document.querySelector(".investment-language-flag")?.closest("button")', '.investment-language-menu');
      await evaluate(`(() => {
        const option = [...document.querySelectorAll('.investment-language-menu [role=menuitem]')]
          .find(item => item.textContent.includes(${JSON.stringify(languageName)}));
        if (!option) throw new Error('Missing commercial locale ${locale}');
        option.click();
      })()`);
      await waitFor(`document.querySelector('.investment-page')?.lang === ${JSON.stringify(locale)}`);
    }
    for (let index = 0; index < 6; index++) {
      await clickTab(index);
      await assertNoDocumentOverflow(`commercial ${locale} tab ${index + 1} at 390px`);
    }
    await clickTab(4);
    assert.equal(await evaluate('document.querySelectorAll(".investment-commercial-plan-price.is-pending").length'), 0);
    assert.equal(await evaluate('document.querySelector(".investment-commercial-plan-common")?.textContent.includes("10")'), true);
    assert.equal(await evaluate('document.querySelectorAll(".investment-commercial-pricing-grid article > small").length'), 3);
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/presentation?tab=business` });
  await waitFor('document.querySelectorAll("[role=tab]").length === 6');
  assert.equal(await selectedIndex(), 0);
  assert.deepEqual(exceptions, [], 'No runtime exceptions');
  assert.deepEqual(apiRequests, [], 'No session or tenant API calls');
  assert.deepEqual(failedRequests, [], 'No failed asset requests');

  const result = {
    tabs: 7,
    modules: 10,
    locales: locales.map(([locale]) => locale),
    widths,
    header: true,
    workbar: true,
    staticNotifications: 6,
    staticProfileTools: 8,
    keyboard: true,
    history: true,
    reload: true,
    invalidTabFallback: true,
    personalizedClientRoute: true,
    personalizedAcknowledgement: true,
    commercialPresentationRoute: true,
    localDarkMode: true,
    apiRequests: 0,
    runtimeErrors: 0,
  };
  await writeFile(resolve(output, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  shuttingDown = true;
  socket?.close();
  child.kill();
  server.closeAllConnections();
  await new Promise(ready => server.close(ready));
}
