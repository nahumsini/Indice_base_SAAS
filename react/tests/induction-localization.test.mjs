import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { getInductionCopy, inductionLocales } from '../src/app/Training/translations/induction.ts';
const require = createRequire(import.meta.url);
const renderToStaticMarkup = require('react-dom/server').renderToStaticMarkup;
function lesson() {
  let locale = 'en-CA', cursor = 0;
  const states = [];
  const react = { ...require('react'), useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; } };
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/app/Training/IndiceInduction.tsx', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, require(name) {
    if (name === 'react') return react;
    if (name === '../shared/context') return { useLanguage: () => ({ currentLanguage: { code: locale } }) };
    if (name === './translations/induction') return { getInductionCopy };
    return require(name);
  } });
  return { render(language) { locale = language; cursor = 0; return module.exports.IndiceInduction(); }, states };
}
function findAll(element, predicate) {
  if (element == null || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => findAll(child, predicate));
  return [...(predicate(element) ? [element] : []), ...findAll(element.props?.children, predicate)];
}
test('induction narrative, section labels and controls follow all eight selected locales', () => {
  const view = lesson();
  const headings = ['Understand Indice before selling Indice', 'Understand Indice before selling Indice', 'Entender Índice antes de vender Índice', 'Entender Índice antes de vender Índice', 'Comprendre Indice avant de vendre Indice', 'Entender a Indice antes de vender a Indice', 'Indice를 판매하기 전에 이해하기', '先理解 Indice，再销售 Indice'];
  for (const [index, locale] of inductionLocales.entries()) {
    const copy = getInductionCopy(locale);
    const html = renderToStaticMarkup(view.render(locale));
    assert.ok(html.includes(headings[index]), locale);
    assert.ok(html.includes(copy.t('lesson171')), `${locale}: previous-stage label`);
    assert.ok(html.includes(copy.t('lesson187')), `${locale}: market qualification`);
    assert.ok(html.includes(copy.t('pillarCount', { current: 1, total: 4 })), `${locale}: whole count phrase`);
  }
  assert.equal(getInductionCopy('unknown').locale, 'en-CA');
});
test('language changes preserve lesson selection and the existing practice answer semantics', () => {
  const view = lesson();
  let tree = view.render('en-CA');
  const options = findAll(tree, e => e.type === 'button' && e.props.role === 'option');
  options[3].props.onClick();
  const answers = findAll(tree, e => e.type === 'button' && e.props.role == null && !e.props['aria-label']);
  assert.equal(answers.length, 3);
  answers[1].props.onClick();
  tree = view.render('ko-CA');
  assert.equal(view.states[3], 3);
  assert.equal(view.states[5], 1);
  assert.equal(findAll(tree, e => e.type === 'button' && e.props.role === 'option')[3].props['aria-selected'], true);
  assert.ok(renderToStaticMarkup(tree).includes(getInductionCopy('ko-CA').t('lesson145')));
  assert.ok(!renderToStaticMarkup(tree).includes(getInductionCopy('ko-CA').t('lesson143')));
});
