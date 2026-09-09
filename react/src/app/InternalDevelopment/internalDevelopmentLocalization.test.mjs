import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const cache = new Map();
let printed;
function load(input) {
  const file = [input, `${input}.ts`, `${input}.tsx`, resolve(input, 'index.ts')].find((candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate));
  assert.ok(file, input);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const localRequire = (id) => {
    if (id.endsWith('/documentHtmlPrintEngine')) return {
      escapeDocumentPrintHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
      printDocumentHtml: (options) => { printed = options; return options; },
    };
    return id.startsWith('.') ? load(resolve(dirname(file), id)) : require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { internalDevelopmentTranslations, getInternalDevelopmentMessages, internalDevelopmentLocale } = load(resolve(import.meta.dirname, 'translations/index.ts'));
const { getInternalDevelopmentCopy } = load(resolve(import.meta.dirname, 'internalDevelopment.copy.ts'));
const { printInternalDevelopmentDetail } = load(resolve(import.meta.dirname, 'internalDevelopmentPrint.ts'));

test('internal development has complete messages, enum labels and placeholders in all eight locales', () => {
  assert.equal(Object.keys(internalDevelopmentTranslations).length, 8);
  const base = getInternalDevelopmentMessages('en-CA');
  for (const [locale, messages] of Object.entries(internalDevelopmentTranslations)) {
    assert.deepEqual(Object.keys(messages), Object.keys(base), locale);
    for (const [key, value] of Object.entries(messages)) {
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.deepEqual(value.match(/\{\d+\}/g) ?? [], base[key].match(/\{\d+\}/g) ?? [], `${locale}.${key}`);
    }
    assert.deepEqual(Object.keys(getInternalDevelopmentCopy(locale).statuses), ['DRAFT', 'PLANNED', 'RECORDED', 'CLOSED', 'CANCELLED']);
  }
  for (const invalid of ['en', 'es', 'fr', 'unknown', '__proto__']) assert.equal(internalDevelopmentLocale(invalid), 'en-CA');
  assert.equal(getInternalDevelopmentCopy(false).types.WEEKLY_REPORT, 'Reporte semanal');
  assert.equal(getInternalDevelopmentCopy('ko-CA').types.WEEKLY_REPORT, '주간 보고서');
});

test('print localizes document headings and history without translating authored records or exposing raw HTML', () => {
  const detail = {
    entry: { folio: 'INT-15', version: 3, title: '<script>authored</script>', summary: 'Authored summary', details: null, decisions: null, nextSteps: null,
      entryType: 'WEEKLY_REPORT', area: 'DEVELOPMENT', status: 'RECORDED', eventAt: '2026-09-08T12:00:00Z', ownerName: 'Owner fixture', participants: [], periodStart: null, periodEnd: null, location: null, relatedEntryTitle: null, referenceUrl: null },
    history: [{ entryVersion: 3, actionCode: 'CREATED', changedByName: 'Owner fixture', changedAt: '2026-09-08T12:00:00Z' }],
  };
  const before = structuredClone(detail);
  for (const locale of Object.keys(internalDevelopmentTranslations)) {
    printInternalDevelopmentDetail({ detail, locale, english: true });
    const messages = getInternalDevelopmentMessages(locale);
    assert.ok(printed.bodyHtml.includes(messages.revisionHistory), locale);
    assert.ok(printed.bodyHtml.includes(messages.recordCreated), locale);
    assert.ok(printed.bodyHtml.includes(messages.noAdditionalParticipants), locale);
    assert.ok(printed.bodyHtml.includes('&lt;script&gt;authored&lt;/script&gt;'));
    assert.ok(!printed.bodyHtml.includes('<script>'));
    assert.equal(printed.locale, locale);
  }
  assert.deepEqual(detail, before);
});
