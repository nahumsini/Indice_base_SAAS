import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';

const root = resolve(import.meta.dirname, '..');
const kpiPath = resolve(root, 'src/app/BasicModules/HumanResources/KPIs/KPIs.tsx');
const source = readFileSync(kpiPath, 'utf8');
const ast = ts.createSourceFile(kpiPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'KPIs');
const stateNames = component.body.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
  .filter(d => ts.isArrayBindingPattern(d.name) && d.initializer?.expression?.getText(ast) === 'useState')
  .map(d => d.name.elements[0].name.getText(ast));

function setup(initial = {}, locale = 'es-MX') {
  const state = { ...initial };
  let cursor = 0;
  let workspace;
  const printed = [];
  const cache = new Map();
  const marker = name => Object.assign(() => null, { displayName: name });
  const markers = new Proxy({}, { get: (target, name) => target[name] ??= marker(String(name)) });
  const hooks = {
    ...React, useMemo: fn => fn(), useEffect: () => {},
    useState: initialValue => {
      const name = stateNames[cursor++];
      if (!(name in state)) state[name] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [state[name], value => { state[name] = typeof value === 'function' ? value(state[name]) : value; }];
    },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    cache.set(file, module.exports);
    const js = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'lucide-react' || name === 'recharts') return markers;
      if (name.endsWith('/styles/moduleColors')) return load(resolve(dirname(file), name + '.ts'));
      if (name.endsWith('/translations') || name.includes('/translations/') || file.includes('/translations/')) {
        const base = resolve(dirname(file), name);
        return load(existsSync(base + '.ts') ? base + '.ts' : resolve(base, 'index.ts'));
      }
      if (name.endsWith('/useKPIsTranslations')) return { useKPIsTranslations: () => load(resolve(dirname(kpiPath), 'translations/index.ts')).getKPIsTranslations(locale) };
      if (name.endsWith('/context')) return { useLanguage: () => ({ currentLanguage: { code: locale } }) };
      if (name.endsWith('/useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: options => { workspace = options; } };
      if (name.endsWith('/BusinessCurrencyContext')) return { usePreferredBusinessCurrency: () => ({ preferredCurrency: 'MXN' }) };
      if (name.endsWith('/kpiMonetaryApi')) return { useKpiMonetaryAggregate: () => ({ data: null }) };
      if (name.endsWith('/businessCurrency')) return { formatBusinessCurrencyAmount: amount => String(amount) };
      if (name.endsWith('/useCompanyPrintIdentity')) return { useCompanyPrintIdentity: () => ({ identity: { name: 'Test company', logoUrl: '' }, isReady: true }) };
      if (name.endsWith('/kpisPrintReport')) return { printKpisReport: report => printed.push(report) };
      if (name.endsWith('/ui/utils')) return { cn: (...args) => args.filter(Boolean).join(' ') };
      if (name.endsWith('/frontend-os')) return { ...Object.fromEntries(['IndiceFilterAdvancedSection', 'IndiceFilterBar', 'IndiceFilterDisclosureActions', 'IndiceFilterField', 'IndiceFilterSearch', 'IndiceFilterSelect', 'IndiceWorkspaceNavigation'].map(n => [n, markers[n]])), useIndiceFilterDisclosureCopy: () => ({}), getIndiceFilterControlClassName: () => '' };
      return markers;
    };
    vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { Intl, Date, Map, Set, console })(require, module, module.exports);
    return module.exports;
  }
  const KPIs = load(kpiPath).default;
  return { state, printed, load, render: () => { cursor = 0; return KPIs(); }, get workspace() { return workspace; } };
}

function walk(node, includeHidden = false) {
  if (Array.isArray(node)) return node.flatMap(n => walk(n, includeHidden));
  if (!node || typeof node !== 'object' || !node.props || (!includeHidden && node.props.hidden)) return [];
  return [node, ...walk(node.props.children, includeHidden), ...walk(node.props.actions, includeHidden)];
}
const named = (tree, name) => walk(tree).filter(n => (n.type.displayName || n.type.name) === name);
const text = node => Array.isArray(node) ? node.map(text).join(' ') : typeof node === 'object' && node ? text(node.props?.children) : String(node ?? '');
const employees = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, name: `Person ${index + 1}`, first_name: 'Person', last_name: String(index + 1), status: 'active', unit_id: 1, unit_name: 'Operations', department: 'Kitchen' }));

test('views isolate content and share filters and the aqua navigation', () => {
  const app = setup();
  for (const view of ['overview', 'charts', 'units', 'employees']) {
    let tree = app.render();
    const navigation = named(tree, 'IndiceWorkspaceNavigation')[0];
    assert.equal(navigation.props.variant, 'views');
    assert.equal(navigation.props.tone, 'aqua');
    navigation.props.onValueChange(view);
    tree = app.render();
    assert.deepEqual(walk(tree).filter(n => n.props.role === 'tabpanel').map(n => n.props['data-hr-kpi-view']), [view]);
    assert.equal(named(tree, 'IndiceFilterBar').length, 1);
    assert.equal(named(tree, 'KpiCard').length, view === 'overview' ? 8 : 0);
    assert.equal(named(tree, 'HrEmployeeOperationsTable').length, view === 'employees' ? 1 : 0);
    assert.equal(walk(tree, true).filter(n => n.type.displayName === 'HrEmployeeOperationsTable').length, 1, 'retain the table instance and its pagination');
  }
});

test('view changes retain filters and URL/memory restoration validates the view', () => {
  const app = setup();
  const tree = app.render();
  named(tree, 'IndiceFilterSearch')[0].props.onValueChange('Person');
  named(tree, 'IndiceFilterSelect')[0].props.onValueChange('lastMonth');
  named(tree, 'IndiceWorkspaceNavigation')[0].props.onValueChange('units');
  app.render();
  assert.equal(app.workspace.state.searchQuery, 'Person');
  assert.equal(app.workspace.state.periodFilter, 'lastMonth');
  assert.equal(app.workspace.state.activeView, 'units');
  assert.equal(app.workspace.urlFields.activeView, 'view');
  for (const [input, expected] of [['unknown', 'overview'], ['employees', 'employees'], [null, 'overview']]) {
    app.workspace.onRestore({ ...app.workspace.state, activeView: input });
    app.render();
    assert.equal(app.state.activeView, expected);
  }
});

test('printing retains the complete report across every view', () => {
  const app = setup({ employees });
  for (const activeView of ['overview', 'charts', 'units', 'employees']) {
    app.state.activeView = activeView;
    const print = walk(app.render()).find(n => n.type === 'button' && text(n).includes('Imprimir reporte'));
    assert.ok(print);
    print.props.onClick();
  }
  assert.equal(app.printed[0].cards.length, 8);
  assert.equal(app.printed[0].attentionRows.length, 8);
  for (const report of app.printed) assert.deepEqual(report, app.printed[0]);
});

test('one attention queue expands and preserves employee focus', () => {
  const app = setup({ employees, activeView: 'employees' });
  let tree = app.render();
  const focusedButtons = value => walk(value).filter(n => n.type === 'button' && n.props['aria-label']?.startsWith('Enfocar:'));
  assert.equal(walk(tree).filter(n => n.type === 'details').length, 1);
  assert.equal(focusedButtons(tree).length, 5);
  walk(tree).find(n => n.type === 'button' && text(n) === 'Ver más casos').props.onClick();
  tree = app.render();
  assert.equal(focusedButtons(tree).length, 8);
  focusedButtons(tree)[0].props.onClick();
  app.render();
  assert.equal(app.state.searchQuery, 'Person 1');
});

test('partial data warnings remain visible in every view', () => {
  const app = setup({ sourceWarnings: ['Existing source warning'] });
  for (const activeView of ['overview', 'charts', 'units', 'employees']) {
    app.state.activeView = activeView;
    assert.match(text(app.render()), /Existing source warning/);
  }
});

test('grouped selector retains selection semantics and legacy default', () => {
  const app = setup();
  const { IndiceWorkspaceNavigation } = app.load(resolve(root, 'src/app/components/frontend-os/IndiceWorkspaceNavigation.tsx'));
  let selected = 'overview';
  const props = { ariaLabel: 'Views', tone: 'aqua', value: selected, onValueChange: value => { selected = value; }, items: ['overview', 'charts', 'units', 'employees'].map(id => ({ id, label: id })) };
  const tree = IndiceWorkspaceNavigation({ ...props, variant: 'views' });
  const buttons = walk(tree).filter(n => n.props.role === 'tab');
  assert.equal(tree.props.role, 'tablist');
  assert.match(tree.props.className, /flex-wrap/);
  assert.equal(buttons[0].props.style.backgroundColor, '#59C3A5');
  assert.equal(buttons[0].props['aria-selected'], true);
  assert.equal(buttons[1].props.tabIndex, -1);
  buttons[2].props.onClick();
  assert.equal(selected, 'units');
  assert.equal(IndiceWorkspaceNavigation(props).props['data-indice-workspace-navigation'], 'sections');
});
