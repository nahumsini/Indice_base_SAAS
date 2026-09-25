import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/BasicModules/Expenses');
const shells = new Proxy({}, { get: (_, name) => name });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes)
  : React.isValidElement(tree) ? [tree, ...nodes(tree.props.children)] : [];
const today = new Date(2026, 8, 23);
const defaults = { searchTerm: '', periodFilter: 'this_month', statusFilter: 'all',
  businessUnitFilter: '8', businessFilter: 'all', providerFilter: 'all' };
const expense = (id, overrides = {}) => ({ id, folio: `EXP-${id}`, concept: id, date: new Date(2026, 7, 15),
  dueDate: new Date(2026, 7, 15), amount: 100, taxes: 16, total: 116, amountPaid: 116,
  currency: 'MXN', status: 'paid', backendStatus: 'PAID', businessUnit: '8', business: '9',
  providerId: '10', paymentMethod: 'cash', type: 'real', version: 1, ...overrides });
const expenses = [expense('1'), expense('2', { originFund: { id: '5', name: 'Fund', type: 'INTERNAL_COMPANY' } }),
  expense('3', { date: today, dueDate: today }), expense('4', { amountPaid: 0, status: 'pending', backendStatus: 'APPROVED' }),
  expense('5', { businessUnit: '99' })];

function workspace(initialFilters = defaults, sortField = 'total', sortDirection = 'desc', options = {}) {
  const runtime = hookRuntime();
  const pending = [];
  const cache = new Map();
  let commits = 0;
  const load = file => {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const module = loadTypescript(path, id => {
      if (id === 'react') return runtime.hooks;
      if (id === 'react/jsx-runtime') return jsx;
      if (id.endsWith('useAuthorizationRevision')) return { useAuthorizationRevision: () => 0 };
      if (id.endsWith('kpiMonetaryApi')) return { getKpiMonetaryAggregates: (queries, signal) => new Promise((resolve, reject) => pending.push({ queries, signal, resolve, reject })) };
      if (id.endsWith('useWorkspaceNavigationMemory')) return { useWorkspaceNavigationMemory: ({ onRestore }) => {
        runtime.hooks.useEffect(() => {
          let active = true;
          Promise.resolve().then(() => { if (active) onRestore({ currentPage: options.currentPage ?? 1, pageSize: options.pageSize ?? 25, sortField, sortDirection }); });
          return () => { active = false; };
        }, []);
      } };
      if (id.endsWith('useExpensesTranslations')) return { useExpensesTranslations: () => load('translations/es-MX.ts').esMX, useExpensesResolvedLocale: () => 'es-MX' };
      if (id.endsWith('mergeFinanceTranslations')) return { mergeFinanceTranslations: (_, copy) => copy };
      if (id.endsWith('frontend-os')) return { ...shells, getIndiceFilterControlClassName: () => '',
        IndiceFilterBar: 'FilterBar', IndiceFilterAdvancedSection: 'AdvancedFilters', IndiceFilterDisclosureActions: 'FilterActions' };
      if (/\/(useExpenseFundTotals|useExpenseRowSelection|expenseFilters|expenseFundGroups|expenseTableUtils|expenseTableConfig|expenseFundGroup.copy)$/.test(id)) {
        return load(`${resolve(dirname(path), id)}.ts`);
      }
      if (id.endsWith('financeBulkActions.copy')) return { getFinanceBulkCopy: () => ({}) };
      if (id.endsWith('useTablePagination')) return load('../../hooks/useTablePagination.ts');
      return shells;
    });
    cache.set(path, module);
    return module;
  };
  const { ExpenseTable } = load('Expenses/components/ExpenseTable.tsx');
  const { ExpensesFilters } = load('components/filters/ExpensesFilters.tsx');
  const { filterExpenses } = load('utils/expenseFilters.ts');
  runtime.render(() => {
    commits++;
    const [filters, setFilters] = runtime.hooks.useState(initialFilters);
    const [snapshot, setSnapshot] = runtime.hooks.useState({ all: [], selected: [] });
    // Match Expenses: stable filtered rows and the parent state setter used for print snapshots.
    const onPrintSnapshotChange = runtime.hooks.useCallback(setSnapshot, []);
    const rows = runtime.hooks.useMemo(() => filterExpenses(options.expenses ?? expenses, filters, today), [filters]);
    const filterView = ExpensesFilters({ filters, onFiltersChange: setFilters, filteredCount: rows.length,
      providers: [], businessOptions: [], businessUnitOptions: [] });
    const tableView = ExpenseTable({ expenses: rows, columns: [], providers: [], onPrintSnapshotChange,
      getAttachments: () => [], onViewExpense() {}, onOpenAttachments() {}, onExpensesChange() {} });
    return { filters, snapshot, filterView, tableView };
  });
  return {
    runtime, pending,
    changeFilter(label, value) {
      nodes(runtime.result.filterView).find(node => node.props.label === label).props.onChange(value);
    },
    tableNode(type) { return nodes(runtime.result.tableView).find(node => node.type === type || node.type.name === type); },
    clearFilters() { runtime.result.filterView.props.summary.props.onClear(); },
    async settle() {
      await runtime.flush();
      const previous = commits;
      await runtime.flush();
      assert.equal(commits, previous, 'filter/table/print effects must settle while the monetary request is pending');
    },
    finish(request = pending.at(-1), amount = 232) {
      request.resolve(Object.fromEntries(request.queries.map(query => [query.key, {
        nativeTotals: [{ currency: 'MXN', amount }], partial: false, excludedRecords: 0,
      }])));
    },
  };
}

test('Pagado + Mes pasado settles with saved sorting while fund totals load, then updates print order', async t => {
  const ui = workspace();
  t.after(() => ui.runtime.unmount());
  await ui.settle();
  ui.changeFilter('Estado', 'paid');
  await ui.settle();
  ui.changeFilter('Periodo', 'last_month');
  await ui.settle();
  assert.equal(ui.pending.length, 1);
  assert.deepEqual(ui.runtime.result.snapshot.all.map(row => row.id), ['1', '2']);
  assert.ok(nodes(ui.runtime.result.tableView).some(node => node.props.role === 'status'));
  ui.finish();
  await ui.settle();
  assert.deepEqual(ui.runtime.result.snapshot.all.map(row => row.id), ['2', '1']);
  assert.equal(nodes(ui.runtime.result.tableView).some(node => node.props.role === 'status'), false);
});

test('a restored paid historical view, failed totals and retry keep rendering without a loop', async t => {
  const ui = workspace({ ...defaults, periodFilter: 'last_month', statusFilter: 'paid' }, 'date', 'asc');
  t.after(() => ui.runtime.unmount());
  await ui.settle();
  ui.pending[0].reject(new Error('Network unavailable'));
  await ui.settle();
  assert.ok(nodes(ui.runtime.result.tableView).some(node => node.props.role === 'alert'));
  nodes(ui.runtime.result.tableView).find(node => node.type === 'button' && node.props.className === 'underline').props.onClick();
  await ui.settle();
  assert.equal(ui.pending.length, 2);
  ui.finish();
  await ui.settle();
  assert.equal(nodes(ui.runtime.result.tableView).some(node => node.props.role === 'alert'), false);
});

test('changing period during loading ignores the old response and preserves current filtered rows', async t => {
  const ui = workspace({ ...defaults, periodFilter: 'last_month', statusFilter: 'paid' });
  t.after(() => ui.runtime.unmount());
  await ui.settle();
  const oldRequest = ui.pending[0];
  ui.changeFilter('Periodo', 'this_month');
  await ui.settle();
  assert.deepEqual(ui.runtime.result.snapshot.all.map(row => row.id), ['3']);
  ui.finish(oldRequest);
  await ui.settle();
  assert.deepEqual(ui.runtime.result.snapshot.all.map(row => row.id), ['3']);
  ui.changeFilter('Periodo', 'last_month');
  await ui.settle();
  assert.equal(ui.pending.length, 2);
  ui.finish();
  await ui.settle();
  assert.deepEqual(ui.runtime.result.snapshot.all.map(row => row.id), ['2', '1']);
});

test('a saved page outside the current result is clamped after workspace restoration', async t => {
  const ui = workspace(defaults, 'date', 'asc', { currentPage: 999, pageSize: 200 });
  t.after(() => ui.runtime.unmount());
  await ui.settle();
  const pagination = ui.tableNode('ExpenseTablePagination').props;
  assert.equal(pagination.pageSize, 200);
  assert.equal(pagination.currentPage, pagination.totalPages);
});

test('repeated filtering, sorting, selection and 200-row pagination stay stable over 1,200 expenses', async t => {
  const rows = Array.from({ length: 1200 }, (_, index) => expense(String(index + 100), {
    date: new Date(2026, index % 2 ? 7 : 8, 15),
    originFund: index % 6 === 0 ? { id: String(index % 30), name: 'Fund', type: 'INTERNAL_COMPANY' } : undefined,
  }));
  const ui = workspace(defaults, 'total', 'asc', { expenses: rows, pageSize: 200 });
  t.after(() => ui.runtime.unmount());
  for (let iteration = 0; iteration < 100; iteration++) {
    await ui.settle();
    ui.tableNode('ExpenseTableHeaderRow').props.onSort(['date', 'total', 'folio'][iteration % 3]);
    await ui.settle();
    ui.tableNode('ExpenseTableHeaderRow').props.onToggleAllVisible(true);
    await ui.settle();
    assert.ok(ui.runtime.result.snapshot.selected.length > 0);
    ui.tableNode('ExpenseTablePagination').props.onPageChange(2);
    await ui.settle();
    ui.changeFilter('Periodo', iteration % 2 ? 'this_month' : 'last_month');
    await ui.settle();
    assert.equal(ui.runtime.result.snapshot.selected.length, 0, 'hidden rows are pruned from selection');
    assert.equal(ui.runtime.result.snapshot.all.length, 600);
    const before = ui.pending.length;
    for (const request of ui.pending.splice(0)) ui.finish(request);
    await ui.settle();
    assert.equal(ui.pending.length, 0, 'stale batches do not launch more work');
    assert.ok(before <= 2, 'rendering never refetches the same fund selection');
  }
  ui.changeFilter('Estado', 'pending');
  await ui.settle();
  assert.equal(ui.runtime.result.snapshot.all.length, 0);
  assert.equal(ui.tableNode('ExpenseTablePagination').props.currentPage, 1);
  ui.clearFilters();
  await ui.settle();
  assert.equal(ui.runtime.result.snapshot.all.length, 600);
});

test('superseded fund batches are aborted on filter changes and unmount', async t => {
  const ui = workspace({ ...defaults, periodFilter: 'last_month', statusFilter: 'paid' });
  t.after(() => ui.runtime.unmount());
  await ui.settle();
  const request = ui.pending[0];
  assert.equal(request.signal?.aborted, false);
  ui.changeFilter('Periodo', 'this_month');
  await ui.settle();
  assert.equal(request.signal.aborted, true);
  ui.changeFilter('Periodo', 'last_month');
  await ui.settle();
  const lastRequest = ui.pending.at(-1);
  ui.runtime.unmount();
  assert.equal(lastRequest.signal.aborted, true);
});
