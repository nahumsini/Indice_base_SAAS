import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadTypescript } from './helpers/hook-runtime.mjs';
const root = resolve(import.meta.dirname, '../src/app/BasicModules/Expenses');
const utils = loadTypescript(resolve(root, 'utils/expenses.utils.ts'), () => ({ defaultBusinessCurrency: 'USD', formatBusinessCurrencyAmount: () => '' }));
const controls = loadTypescript(resolve(root, 'components/table/ExpenseInlineControls.tsx'), () => ({}));

test('every initial expense fixture uses a real calendar date accepted by Safari', () => {
  for (const file of readdirSync(resolve(root, 'data')).filter(name => /^expenses\.part\d+\.mock\.ts$/.test(name))) {
    const source = readFileSync(resolve(root, 'data', file), 'utf8');
    for (const match of source.matchAll(/new Date\('([0-9]{4}-[0-9]{2}-[0-9]{2})'\)/g)) {
      const [year, month, day] = match[1].split('-').map(Number);
      const normalized = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
      assert.equal(normalized, match[1], `${file}: ${match[1]} is not a valid calendar date`);
    }
  }
});

test('missing or invalid dates cannot crash expense display or inline edit', () => {
  for (const value of [undefined, null, new Date(NaN)]) {
    assert.equal(utils.formatDate(value), '—');
    assert.equal(utils.formatDateTime(value), '—');
    assert.equal(controls.formatDateInputValue(value), '');
  }
});

test('valid expense dates retain their existing display and edit format', () => {
  const date = new Date('2026-04-30T12:00:00Z');
  assert.equal(utils.formatDate(date), new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date));
  assert.equal(utils.formatDateTime(date), new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date));
  assert.equal(controls.formatDateInputValue(date), '2026-04-30');
});
