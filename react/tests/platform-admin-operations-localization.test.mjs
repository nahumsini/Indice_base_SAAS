import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../src/app/PlatformAdmin');
const supported = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
let language = 'en-CA';
const cache = new Map();
function load(path) {
  path = resolve(root, path);
  if (!existsSync(path)) path += '.ts';
  if (statSync(path).isDirectory()) path = resolve(path, 'index.ts');
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: language } }) };
    if (['./IndiceInduction', './SalesProcess', './TrainingExamPanel'].includes(specifier)) return new Proxy({}, { get: () => () => null });
    if (specifier === 'react-router') return { useNavigate: () => () => {} };
    if (specifier.endsWith('/lib/apiClient')) return { apiClient: () => Promise.resolve({}) };
    if (specifier.endsWith('/components/frontend-os')) return new Proxy({}, { get: () => ({ title, children }) => React.createElement('section', null, title, children) });
    if (specifier === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (specifier.includes('/components/indice-modal')) return {
      IndiceModalFrame: ({ title, description, children, footer }) => React.createElement('section', null,
        React.createElement('h1', null, title), React.createElement('p', null, description), children, footer),
    };
    if (specifier.startsWith('.')) return load(resolve(dirname(path), specifier));
    return require(specifier);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const consulting = load('ConsultingTranslations/index.ts');
const operations = load('OperationsTranslations/index.ts');
const placeholders = (text) => [...text.matchAll(/\{([a-zA-Z0-9]+)\}/g)].map((match) => match[1]).sort();

for (const [name, getCopy] of [['consulting', consulting.getConsultingCopy], ['operations', operations.getOperationsCopy]]) {
  test(`${name}: every locale has the full copy contract and identical interpolation parameters`, () => {
    const baseline = getCopy('en-CA');
    for (const locale of supported) {
      const copy = getCopy(locale);
      assert.deepEqual(Object.keys(copy).sort(), Object.keys(baseline).sort(), locale);
      for (const key of Object.keys(baseline)) {
        assert.ok(copy[key]?.trim(), `${locale}: ${key}`);
        assert.deepEqual(placeholders(copy[key]), placeholders(baseline[key]), `${locale}: ${key}`);
      }
    }
    assert.equal(getCopy('invalid'), baseline);
    assert.equal(getCopy('es'), baseline, 'generic languages must use the canonical fallback');
  });
}

test('language changes select complete French, Portuguese, Korean and Chinese catalogs', () => {
  const expected = { 'fr-CA': 'Ajouter un consultant', 'pt-BR': 'Adicionar consultor', 'ko-CA': '컨설턴트 추가', 'zh-CA': '添加顾问' };
  for (const [locale, title] of Object.entries(expected)) {
    language = locale;
    assert.equal(consulting.useConsultingCopy().copy.addConsultant, title);
    assert.equal(operations.useOperationsCopy().locale, locale);
  }
  language = 'unsupported';
  assert.equal(consulting.useConsultingCopy().locale, 'en-CA');
});

test('actual consultant form renders all selected-language labels without changing submitted field contracts', () => {
  const { ConsultantCreateModal } = load('Consultants/ConsultantCreateModal.tsx');
  for (const locale of supported) {
    language = locale;
    const copy = consulting.getConsultingCopy(locale);
    const html = renderToStaticMarkup(React.createElement(ConsultantCreateModal, { onClose() {}, onCreate() {} }));
    assert.ok(html.includes(copy.addConsultant), locale);
    assert.ok(html.includes(copy.lastName), locale);
    assert.ok(html.includes(copy.saveConsultant), locale);
    assert.ok(html.includes('type="email"'), 'email input contract is unchanged');
  }
});

test('weekdays, values and operational statuses follow locale while unknown provider codes remain intact', () => {
  for (const locale of supported) {
    assert.equal(consulting.consultingWeekdays(locale)[0].label,
      new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date('2026-01-05T00:00:00Z')));
    assert.equal(operations.operationsText('{value0}', { value0: 12345 }, locale), new Intl.NumberFormat(locale).format(12345));
    assert.equal(operations.operationsStatus('past_due', locale), operations.getOperationsCopy(locale).pastDue);
    assert.equal(operations.operationsStatus('PROVIDER_FUTURE_CODE', locale), 'PROVIDER_FUTURE_CODE');
  }
});

test('assigned screens no longer branch on English for visible copy or use browser-default formatting', () => {
  for (const file of ['UsageAnalyticsWorkspace.tsx', 'UsersDirectoryTab.tsx', 'CompanyUserActivityPanels.tsx', 'AllCompanyActivityPanel.tsx']) {
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.doesNotMatch(source, /\benglish\s*\?(?!:)/);
    assert.doesNotMatch(source, /toLocaleString\(\)|toLocaleString\(undefined/);
    assert.match(source, /useOperationsCopy\(\)/);
  }
});

const program = load('../Training/translations/program/index.ts');
test('all training narratives and practice choices are translated with stable completion codes and routes', () => {
  const { getTrainingSessions } = load('../Training/TrainingWorkspace.tsx');
  const baseline = program.getTrainingProgramCopy('en-CA');
  const structure = (sessions) => sessions.map((session) => ({
    id: session.id, number: session.number, assessment: session.assessment.code,
    choices: session.assessment.options.map((option) => option.code),
    items: session.groups.flatMap((group) => group.items.map((item) => ({ id: item.id, route: item.route }))),
  }));
  const stable = structure(getTrainingSessions(baseline));
  assert.equal(stable.length, 7);
  for (const locale of supported) {
    const copy = program.getTrainingProgramCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(baseline).sort());
    for (const key of Object.keys(baseline)) {
      assert.ok(copy[key]?.trim(), `${locale}: ${key}`);
      assert.deepEqual(placeholders(copy[key]), placeholders(baseline[key]), `${locale}: ${key}`);
    }
    const sessions = getTrainingSessions(copy);
    assert.deepEqual(structure(sessions), stable, locale);
    assert.ok(sessions.every((session) => session.assessment.scenario && session.assessment.practice && session.assessment.evidence));
    if (['fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'].includes(locale)) {
      assert.notEqual(sessions[0].assessment.scenario, getTrainingSessions(baseline)[0].assessment.scenario, locale);
    }
  }
  assert.equal(program.getTrainingProgramCopy('es'), baseline);
});

test('training home uses the current language even when a legacy locale prop is passed', () => {
  const { TrainingWorkspace } = load('../Training/TrainingWorkspace.tsx');
  for (const locale of supported) {
    language = locale;
    const copy = program.getTrainingProgramCopy(locale);
    const html = renderToStaticMarkup(React.createElement(TrainingWorkspace, { portal: 'root', locale: 'es' }));
    assert.ok(html.includes(copy.trainingAndContent), locale);
    assert.ok(html.includes(copy.practicalMastery), locale);
    assert.ok(html.includes(copy.startTheProgram), locale);
  }
});
