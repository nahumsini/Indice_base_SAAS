import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the full expense form defaults new operational expenses to paid', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/components/modals/ExpenseFormModal.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /status:\s*expense\?\.status\s*\?\?\s*'paid'/);
});

test('saving an operational expense persists its selected financial status', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url),
    'utf8',
  );
  const submitHandler = source.slice(
    source.indexOf('const handleExpenseSubmit'),
    source.indexOf('const handlePayableAccountSubmit'),
  );

  assert.match(submitHandler, /expensesService\.updateExpenseStatus\(/);
  assert.match(submitHandler, /draftExpense\.type\s*!==\s*'payable'/);
  assert.match(submitHandler, /values\.status/);
});
