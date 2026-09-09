import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const cache = new Map();
let locale = 'en-CA';
function load(input) {
  const file = [input, `${input}.ts`, `${input}.tsx`, resolve(input, 'index.ts')].find((candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate));
  assert.ok(file, input);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const localRequire = (id) => {
    if (id.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: locale } }) };
    if (id.endsWith('/components/frontend-os')) return { IndiceWorkspaceNavigation: () => null };
    return id.startsWith('.') ? load(resolve(dirname(file), id)) : require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { salesProcessTranslations, getSalesProcessCopy } = load(resolve(import.meta.dirname, 'index.ts'));
const { salesResources, salesStages, SalesProcess } = load(resolve(import.meta.dirname, '../../SalesProcess.tsx'));

test('sales course has complete translated text in all eight locales and preserves six-stage authority', () => {
  const base = getSalesProcessCopy('en-CA');
  const englishStages = salesStages(base);
  const englishResources = salesResources(base);
  assert.equal(Object.keys(salesProcessTranslations).length, 8);
  for (const [code, copy] of Object.entries(salesProcessTranslations)) {
    assert.deepEqual(Object.keys(copy), Object.keys(base), code);
    for (const [key, value] of Object.entries(copy)) {
      assert.ok(value.trim(), `${code}.${key}`);
      assert.deepEqual(value.match(/\{p\d+\}/g) ?? [], base[key].match(/\{p\d+\}/g) ?? [], `${code}.${key}`);
    }
    const stages = salesStages(copy);
    assert.equal(stages.length, 6);
    assert.deepEqual(stages.map(({ id, number, resourceIds }) => ({ id, number, resourceIds })), englishStages.map(({ id, number, resourceIds }) => ({ id, number, resourceIds })));
    assert.deepEqual(salesResources(copy).map(({ id, required, editable }) => ({ id, required, editable })), englishResources.map(({ id, required, editable }) => ({ id, required, editable })));
    assert.equal(stages[0].actions.length, 4);
    assert.equal(stages[0].questions.length, 3);
    assert.equal(stages[0].avoid.length, 3);
  }
  assert.equal(getSalesProcessCopy('fr'), base);
  assert.equal(getSalesProcessCopy('__proto__'), base);
});

test('course renders each selected language while keeping published resource URLs unchanged', () => {
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const code of Object.keys(salesProcessTranslations)) {
    locale = code;
    const copy = getSalesProcessCopy(code);
    const markup = renderToStaticMarkup(createElement(SalesProcess, { basePath: '/api/v1/training' }));
    assert.ok(markup.includes(copy.indiceSalesMethod), code);
    assert.ok(markup.includes(salesStages(copy)[0].title), code);
    for (const resource of salesResources(copy)) assert.ok(markup.includes(`/api/v1/training/resources/${resource.id}/pdf?download=true`));
  }
});
