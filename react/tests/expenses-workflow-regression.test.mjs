import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the full expense form starts new operational expenses paid and does not expose a free status selector', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/components/modals/ExpenseFormModal.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /status:\s*expense\?\.status\s*\?\?\s*'paid'/);
  assert.match(source, /status:\s*isEditMode\s*\?\s*draft\.status\s*:\s*'paid'/);
  assert.doesNotMatch(source, /<SelectInput label=\{t\.expenses\.columns\.status/);
});

test('creating an operational expense records payment while preserving payable and edit states', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url),
    'utf8',
  );
  const submitHandler = source.slice(
    source.indexOf('const handleExpenseSubmit'),
    source.indexOf('const handlePayableAccountSubmit'),
  );

  assert.match(submitHandler, /const effectiveStatus = editingExpense\?\.status \?\? \(sourceExpense\?\.type === 'payable' \? 'pending' : 'paid'\)/);
  assert.doesNotMatch(submitHandler, /expensesService\.updateExpenseStatus\(/);
  assert.match(submitHandler, /status:\s*effectiveStatus/);
});

test('source-linked creation still requires an assigned account to settle', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/services/expenses.service.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /settleOnCreate:\s*expense\.type === 'real' && expense\.status === 'paid' && Boolean\(expense\.paymentAccountId\)/);
});

test('the full expense form supports quick providers and persisted evidence', async () => {
  const [formSource, pageSource] = await Promise.all([
    readFile(
      new URL('../src/app/BasicModules/Expenses/components/modals/ExpenseFormModal.tsx', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(formSource, /<QuickProviderField/);
  assert.match(formSource, /capture="environment"/);
  assert.match(formSource, /attachmentFiles/);
  assert.match(pageSource, /values\.attachmentFiles\.map\(file => attachmentOwner\.service\.upload/);
  assert.match(pageSource, /onCreateProvider=\{onProvidersChange \? handleQuickProviderCreate : undefined\}/);
});

test('payment evidence keeps its context and the expense dossier reads the auditable payment ledger', async () => {
  const [paymentModal, pageSource, attachmentService, expensesService, attachmentModal, mobileCards, detailModal, paymentHistory, filters] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/Expenses/components/modals/ExpensePaymentModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/services/expense-attachments.service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/services/expenses.service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/AttachmentsModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/ExpenseMobileCards.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/ExpenseDetailModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/ExpensePaymentHistory.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/utils/expenseFilters.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(paymentModal, /attachmentFiles/);
  assert.match(paymentModal, /detailCopy\.paymentEvidence/);
  assert.match(pageSource, /expenseAttachmentsService\.upload\(payableExpense\.id, file, paymentContext\)/);
  assert.match(attachmentService, /paymentAmount:\s*context\?\.paymentAmount/);
  assert.match(attachmentModal, /file\.paymentAmount/);
  assert.match(attachmentModal, /detailCopy\.paymentEvidence/);
  assert.match(mobileCards, /copy\.title/);
  assert.doesNotMatch(mobileCards, /isExpanded/);
  assert.match(detailModal, /copy\.paymentHistory/);
  assert.match(detailModal, /expensesService\.getExpensePayments\(expense\.id\)/);
  assert.match(expensesService, /\/payments/);
  assert.match(paymentHistory, /payment\.registeredByName/);
  assert.match(paymentHistory, /payment\.paymentAccountName/);
  assert.match(paymentHistory, /payment\.files\.map/);
  assert.match(paymentHistory, /LEGACY_AGGREGATE/);
  assert.match(pageSource, /<ExpenseDetailModal/);
  assert.match(filters, /expense\.auditStatus\?\.toUpperCase\(\) !== 'AUDITED'/);
  assert.doesNotMatch(filters, /expense\.type === 'real'/);
});
