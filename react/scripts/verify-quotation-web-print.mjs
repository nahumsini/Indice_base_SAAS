// Optional local visual check; no application server, credentials or business data.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { printModules, quotationFixture } from '../tests/helpers/quotation-print-fixtures.mjs';

const output = resolve(import.meta.dirname, '../../.run/print-review-monochrome-2026-09-17');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(resolve(tmpdir(), 'indice-print-review-'));
const chrome = process.env.PRINT_REVIEW_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-lcd-text', '--force-color-profile=srgb', '--no-first-run', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome debugging endpoint timed out')), 20000);
    let log = '';
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stderr.on('data', chunk => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolveEndpoint(match[1]); }
    });
  });
  const address = new URL(endpoint);
  const page = await (await fetch(`http://${address.host}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ready, reject) => { socket.addEventListener('open', ready, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('close', event => {
    for (const request of pending.values()) request.reject(new Error(`Chrome disconnected: ${event.code} ${event.reason}`));
    pending.clear();
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolveResult, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 20000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolveResult(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1120, height: 1050, deviceScaleFactor: 1, mobile: false });
  const load = printModules();
  const { buildStandardDocumentHtml } = load('shared/print/standardDocumentHtml.ts');
  const { quotationPrintTheme, thermalQuotationTheme } = load('shared/print/quotationPrintTheme.ts');
  const bundled = await build({ entryPoints: [resolve(import.meta.dirname, '../src/app/BasicModules/shared/print/documentPrintLayout.ts')], bundle: true, write: false, format: 'iife', globalName: 'PrintLayout', platform: 'browser' });
  const logo = await send('Runtime.evaluate', { expression: '(() => { const c=document.createElement("canvas"); c.width=80;c.height=24;const x=c.getContext("2d");x.fillStyle="#e02020";x.fillRect(0,0,40,24);x.fillStyle="#1680e0";x.fillRect(40,0,40,24);return c.toDataURL(); })()', returnByValue: true });
  const wide = quotationFixture(8);
  wide.tables = [{ columns: ['Responsable', 'Departamento', 'Presupuesto', 'Comprometido', 'Disponible', 'Vencimiento', 'Autorización', 'Referencia'], rows: Array.from({length:8}, () => ['Responsable administrativo', 'Departamento central', '123,456,789.00 MXN', '123,456,789.00 MXN', '123,456,789.00 MXN', '2026-09-17', 'Autorización registrada', 'Documento-123456789']) }];
  const examples = [
    { name: 'quotation', definition: { ...quotationFixture(), logoUrl: logo.result.value }, onePage: true },
    { name: 'long-report', definition: quotationFixture(125), expectedRows: 125 },
    { name: 'landscape', definition: wide, orientation: 'landscape' },
    { name: 'letter-signatures', definition: { ...quotationFixture(), title: 'Acta de entrega', contract: { ...quotationFixture().contract, pageSize: 'letter' }, sections: [{ title: 'Responsabilidades', paragraphs: ['Conservación, uso y entrega del activo. '.repeat(100)] }] } },
    { name: 'cjk', definition: { ...quotationFixture(), title: '문서 / 文档', recipient: '고객 / 客户', metadata: [{ label: '수량 / 数量', value: '125' }] } },
    { name: 'empty', definition: quotationFixture(0) },
    { name: 'borrowed-styles', definition: { ...quotationFixture(), logoUrl: logo.result.value }, onePage: true,
      styles: '@media print { body > *:not(.bdpdf-print-host) { display:none!important; } }',
      extra: '<p style="color:oklch(0.6 0.2 25);background:linear-gradient(rgb(240,220,180),rgb(180,220,240))">Estado con texto explícito</p><svg width="90" height="20" aria-label="Gráfico"><rect width="90" height="20" fill="red" /></svg>' },
  ];
  const results = [];
  for (const example of examples) {
    const landscape = example.definition.contract.orientation === 'landscape';
    const pageRule = example.definition.contract.pageSize === 'letter' ? 'letter' : `A4 ${landscape ? 'landscape' : 'portrait'}`;
    const html = `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:24px;max-width:${landscape ? '1120' : '794'}px;background:white}${example.styles || ''}${quotationPrintTheme}@page{size:${pageRule};margin:12mm 14mm}@media print{body{padding:0;max-width:none}}</style></head><body><div data-document-content>${buildStandardDocumentHtml(example.definition)}${example.extra || ''}</div></body></html>`;
    const fixturePath = resolve(output, example.name + '.html');
    await writeFile(fixturePath, html);
    await send('Page.navigate', { url: pathToFileURL(fixturePath).href });
    await send('Runtime.evaluate', { expression: 'new Promise(resolve => { if(document.readyState === "complete") resolve(); else window.addEventListener("load",resolve,{once:true}); }).then(() => document.fonts.ready)', awaitPromise: true });
    await send('Runtime.evaluate', { expression: bundled.outputFiles[0].text });
    await send('Runtime.evaluate', { expression: `PrintLayout.prepareDocumentPrintLayout(document, ${JSON.stringify(example.definition.contract.pageSize)})` });
    const dom = await send('Runtime.evaluate', { expression: '({rows:document.querySelectorAll("tbody tr").length,overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText,orientation:document.body.dataset.printOrientation, logoFilter:document.querySelector("[data-company-logo]") ? getComputedStyle(document.querySelector("[data-company-logo]")).filter : null, paragraphBreak:getComputedStyle(document.querySelector(".document-section p") || document.body).breakInside})', returnByValue: true });
    assert.equal(dom.result.value.overflow, false, example.name + ' must not overflow horizontally');
    assert.equal(dom.result.value.orientation, example.orientation || 'portrait');
    assert.doesNotMatch(dom.result.value.text, /Powered by|indiceapp\.com/);
    if (example.name === 'quotation') { assert.equal(dom.result.value.logoFilter, 'none'); assert.equal(dom.result.value.paragraphBreak, 'avoid-page'); }
    if (example.expectedRows) { assert.equal(dom.result.value.rows, example.expectedRows); assert.match(dom.result.value.text, /galvanizado 125/); }
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(output, example.name + '.png'), Buffer.from(screenshot.data, 'base64'));
    // Check actual raster colors, exempting only the company logo's bounding rectangle.
    const pixels = await send('Runtime.evaluate', { expression: `(async () => { const i = new Image(); i.src='data:image/png;base64,${screenshot.data}'; await i.decode(); const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);const data=x.getImageData(0,0,c.width,c.height).data;const logo=document.querySelector('[data-company-logo]')?.getBoundingClientRect();let colored=0,logoColored=0;for(let y=0;y<c.height;y++)for(let z=0;z<c.width;z++){const p=(y*c.width+z)*4;const difference=Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2]);if(difference>3){if(logo&&z>=logo.left-1&&z<=logo.right+1&&y>=logo.top-1&&y<=logo.bottom+1)logoColored++;else colored++;}}return {colored,logoColored};})()`, awaitPromise: true, returnByValue: true });
    assert.equal(pixels.result.value.colored, 0, example.name + ' must have no colored pixels outside the company logo');
    if (example.definition.logoUrl) assert.ok(pixels.result.value.logoColored > 0, 'Company logo must retain color');
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    const visible = await send('Runtime.evaluate', { expression: 'getComputedStyle(document.querySelector("[data-document-content]")).display', returnByValue: true });
    assert.notEqual(visible.result.value, 'none', 'Borrowed application styles must not hide printed content');
    const pdf = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    const binary = Buffer.from(pdf.data, 'base64');
    await send('Emulation.setEmulatedMedia', { media: 'screen' });
    await writeFile(resolve(output, example.name + '.pdf'), binary);
    const pages = [...binary.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
    assert.ok(pages >= 1);
    if (example.onePage) assert.equal(pages, 1, 'Compact document should fit on one sheet');
    if (example.expectedRows) assert.ok(pages > 1);
    results.push({ name: example.name, orientation: dom.result.value.orientation, pages, rows: dom.result.value.rows, bytes: binary.length });
  }
  // Thermal remains a separate paper contract, not a squeezed A4 document.
  const { receiptTicket, posTicketStyles } = load('PointOfSale/shared/posOperationTickets.ts');
  const ticket = receiptTicket({ id: 7, receiptNumber: 'TEST-REC-7', currencyCode: 'MXN', subtotalAmount: '20.00', taxAmount: '3.20', totalAmount: '23.20', paymentMethod: 'CASH', status: 'POSTED', metadata: { companyName: 'Tornillería de prueba', createdAt: '2026-09-17T12:00:00Z' }, items: [{ id: 1, productName: 'Tornillo M8', inventoryUnit: 'Pieza', quantity: '2', enteredUnitCost: '10', taxAmount: '3.20', lineTotal: '23.20', taxIncluded: false }] });
  const thermalPath = resolve(output, 'thermal.html');
  await writeFile(thermalPath, `<!doctype html><html><head><meta charset="utf-8"><style>${posTicketStyles}${thermalQuotationTheme}@page{size:80mm auto;margin:0}</style></head><body>${ticket.bodyHtml}</body></html>`);
  await send('Page.navigate', { url: pathToFileURL(thermalPath).href });
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  const thermalPdf = await send('Page.printToPDF', { paperWidth: 80 / 25.4, paperHeight: 220 / 25.4, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, printBackground: true, displayHeaderFooter: false });
  await writeFile(resolve(output, 'thermal.pdf'), Buffer.from(thermalPdf.data, 'base64'));
  const thermalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(resolve(output, 'thermal.png'), Buffer.from(thermalScreenshot.data, 'base64'));
  results.push({ name: 'thermal', paperWidthMm: 80 });
  await writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ output, results }, null, 2));
} finally {
  socket?.close();
  child.kill(); // Only the isolated headless process created above; never the user's browser.
}
