import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the full expense form fixes new operational expenses as paid', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/components/modals/ExpenseFormModal.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /status:\s*expense\?\.status\s*\?\?\s*'paid'/);
  assert.match(source, /status:\s*isEditMode\s*\?\s*draft\.status\s*:\s*'paid'/);
  assert.match(source, /footerSummary=\{`\$\{draft\.concept[\s\S]*t\.expenses\.modal\.paidOn/);
  assert.match(source, /\{isEditMode \? \([\s\S]*<SelectInput label=\{t\.expenses\.columns\.status/);
});

test('creating an operational expense forces paid while edits preserve the selected status', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url),
    'utf8',
  );
  const submitHandler = source.slice(
    source.indexOf('const handleExpenseSubmit'),
    source.indexOf('const handlePayableAccountSubmit'),
  );

  assert.match(submitHandler, /const effectiveStatus = editingExpense \? values\.status : 'paid'/);
  assert.match(submitHandler, /expensesService\.updateExpenseStatus\(/);
  assert.match(submitHandler, /editingExpense[\s\S]*draftExpense\.type\s*!==\s*'payable'/);
  assert.match(submitHandler, /draftExpense\.type\s*!==\s*'payable'/);
  assert.match(submitHandler, /status:\s*effectiveStatus/);
});

test('the expense creation request settles paid operational expenses atomically', async () => {
  const source = await readFile(
    new URL('../src/app/BasicModules/Expenses/services/expenses.service.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /settleOnCreate:\s*expense\.type === 'real' && expense\.status === 'paid'/);
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

test('payment evidence keeps its context and the expense dossier is the mobile detail surface', async () => {
  const [paymentModal, pageSource, attachmentService, attachmentModal, mobileCards, detailModal, filters] = await Promise.all([
    readFile(new URL('../src/app/BasicModules/Expenses/components/modals/ExpensePaymentModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/Expenses.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/services/expense-attachments.service.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/AttachmentsModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/ExpenseMobileCards.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/BasicModules/Expenses/Expenses/components/ExpenseDetailModal.tsx', import.meta.url), 'utf8'),
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
  assert.match(detailModal, /payment\.files\.map/);
  assert.match(pageSource, /<ExpenseDetailModal/);
  assert.match(filters, /expense\.type === 'real'/);
});
