import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { printModules } from './helpers/quotation-print-fixtures.mjs';
const load = printModules({ jspdf: { __esModule: true, default: jsPDF, jsPDF }, 'jspdf-autotable': { __esModule: true, default: autoTable } });
const { buildQuoteWebDocument, buildQuotePdf } = load('Sales/Cotizacion/quotePdf.ts');
const { buildStandardDocumentHtml } = load('shared/print/standardDocumentHtml.ts');
const copy = load('Sales/Cotizacion/translations/es-MX.ts').esMX;
const { context } = load(resolve(import.meta.dirname, 'fixtures/quotePreviewFixture.ts'));
const { quote } = context;

test('customer document retains amounts, fiscal data, currency, conversion, dates and acceptance without internal economics', () => {
  const before = JSON.stringify(context);
  const definition = buildQuoteWebDocument(context);
  const html = buildStandardDocumentHtml(definition);
  for (const value of ['COT-QA-001','TEST-ID','Razón social completa','Dirección completa del emisor','Domicilio fiscal completo','2026-10-18','2026-11-18','208.8','MXN','USD','IVA','Nota comercial completa','Condición comercial completa','Proyecto relacionado','Nombre y firma del cliente','Fecha','Responsable comercial']) assert.ok(html.includes(value), value);
  for (const label of [copy.pricing.estimatedMargin, copy.pricing.estimatedProfit, copy.marginGuidance.messages.success]) assert.ok(!html.includes(label));
  assert.equal(definition.generatedAt, context.generatedAt);
  assert.equal(JSON.stringify(context), before);
});

test('both output entry points render the same complete definition as preview', async () => {
  const jobs = [];
  const api = printModules({ '../../shared/print/standardDocumentHtml': { printStandardDocumentHtml: definition => { jobs.push(definition); return true; } } })('Sales/Cotizacion/quotePdf.ts');
  assert.equal(await api.printQuotePdf(context), true);
  assert.equal(await api.downloadQuotePdf(context), true);
  const expected = buildStandardDocumentHtml(buildQuoteWebDocument(context));
  for (const job of jobs) assert.equal(buildStandardDocumentHtml(job), expected);
});

test('long and hostile customer text stays complete and escaped, including empty quotations', () => {
  const long = 'Texto completo con acentos. '.repeat(800);
  const definition = buildQuoteWebDocument({ ...context, quote: { ...quote, notes: long + '<script>attack()</script>', terms: long, items: [] } });
  const html = buildStandardDocumentHtml(definition);
  assert.ok(html.includes(long));
  assert.ok(html.includes(copy.builder.emptyItems));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.doesNotMatch(html, /<script>/);
  assert.equal(definition.tables[0].rows.length, 0);
});

test('binary sharing consumes all customer fields and paginates long notes and terms', async () => {
  const doc = await buildQuotePdf({ ...context, quote: { ...quote, notes: 'Long note paragraph '.repeat(1000) + ' END-NOTES', terms: 'Long terms paragraph '.repeat(1000) + ' END-TERMS' } });
  assert.ok(doc.getNumberOfPages() > 2);
  const pdf = doc.output();
  for (const value of ['COT-QA-001','TEST-ID','END-NOTES','END-TERMS','2026-11-18','client@example.invalid','issuer@example.invalid','Responsable comercial']) assert.ok(pdf.includes(value), value);
  assert.ok(!pdf.includes(copy.pricing.estimatedProfit));
});

test('preview shares the definition with print and keeps internal review outside its sandbox', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../src/app/BasicModules/Sales/Cotizacion/components/QuotePreviewModal.tsx'), 'utf8');
  assert.match(source, /StandardDocumentPreview definition=\{definition\}/);
  assert.match(source, /printStandardDocumentHtml\(definition\)/);
  assert.match(source, /companyReady/);
  assert.match(source, /sharingRef\.current/);
  assert.match(source, /AbortError/);
  assert.doesNotMatch(source, /<article|applyDocumentGrayscale|PreviewMetricCard/);
  const preview = readFileSync(resolve(import.meta.dirname, '../src/app/BasicModules/shared/print/StandardDocumentPreview.tsx'), 'utf8');
  assert.match(preview, /prepareDocumentPrintLayout/);
  assert.match(preview, /sandbox=\{paperPreview \? 'allow-same-origin' : ''\}/);
  assert.doesNotMatch(preview, /allow-scripts/);
});

test('preview chrome supports every active language family', () => {
  const { getQuotePreviewCopy } = load('Sales/Cotizacion/translations/quotePreviewCopy.ts');
  for (const locale of ['es-MX','es-CO','en-US','en-CA','fr-CA','pt-BR','ko-CA','zh-CA']) {
    const c = getQuotePreviewCopy(locale);
    assert.ok(c.internal && c.document && c.shareError && c.fit && c.contactHint);
  }
});
