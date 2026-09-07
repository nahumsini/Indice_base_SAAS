import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const root = resolve(import.meta.dirname, '../src/app/BasicModules/PointOfSale');
function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', 'require', source)(module, module.exports, name => load(resolve(dirname(file), `${name}.ts`)));
  return module.exports;
}
const { receiptTicket, closingTicket } = load(resolve(root, 'shared/posOperationTickets.ts'));
const { buildShiftFromBackend } = load(resolve(root, 'Sale/utils/posShiftMappers.ts'));
const receipt = { id: 7, receiptNumber: 'REC-7', cashRegisterId: 20, shiftId: 40, warehouseId: 30, warehouseName: 'Correct warehouse', providerName: 'Supplier <script>alert(1)</script>',
  currencyCode: 'MXN', subtotalAmount: '20.00', taxAmount: '3.20', totalAmount: '23.20', paymentMethod: 'CASH', status: 'POSTED',
  metadata: { companyName: 'Company', createdAt: '2026-09-07T14:00:00Z', cashRegisterCode: 'REGISTER-B', notes: 'Original note' },
  items: [{ id: 1, productId: 50, productName: 'Product A', inventoryUnit: 'Piece', quantity: '2', enteredUnitCost: '10', taxAmount: '3.20', lineTotal: '23.20', taxIncluded: false }],
};
test('receipt ticket uses saved lines, totals, native currency and escaped names', () => {
  const before = structuredClone(receipt);
  const ticket = receiptTicket(receipt);
  assert.match(ticket.bodyHtml, /REC-7/); assert.match(ticket.bodyHtml, /REGISTER-B/);
  assert.match(ticket.bodyHtml, /Correct warehouse/); assert.match(ticket.bodyHtml, /MXN.*23\.20/);
  assert.match(ticket.bodyHtml, /Supplier &lt;script&gt;/); assert.doesNotMatch(ticket.bodyHtml, /<script>/);
  assert.deepEqual(receipt, before); assert.equal(ticket.bodyHtml, receiptTicket(receipt).bodyHtml);
});
test('reversed receipts visibly retain their reversal, and foreign tickets do not convert', () => {
  const ticket = receiptTicket({ ...receipt, currencyCode: 'CAD', status: 'REVERSED', reversalReason: 'Returned' });
  assert.match(ticket.bodyHtml, /REVERTIDA/); assert.match(ticket.bodyHtml, /Returned/);
  assert.match(ticket.bodyHtml, /CAD.*23\.20/); assert.doesNotMatch(ticket.bodyHtml, /MXN/);
});
test('closing ticket uses the persisted difference including zero, and every payout category', () => {
  const ticket = closingTicket({ id: 9, shiftId: 40, cashRegisterId: 20, warehouseId: 30, companyId: 1, closedByUserId: 1,
    closedAt: '2026-09-07T15:00:00Z', currencyCode: 'USD', openingCashAmount: '500', cashSalesAmount: '100', cashInAmount: '0', cashOutAmount: '20',
    safeDropAmount: '30', correctionAmount: '0', expectedCashAmount: '550', countedCashAmount: '550', overShortAmount: '0',
    totalSalesAmount: '100', totalRefundsAmount: '0', ticketsCount: 1, paymentsSummary: [{ paymentMethod: 'CASH', amount: '100', count: 1 }] });
  assert.match(ticket.bodyHtml, /COR-9/); assert.match(ticket.bodyHtml, /CERRADO/);
  assert.match(ticket.bodyHtml, /DIFERENCIA<\/span><span>USD.*0\.00/);
  assert.match(ticket.bodyHtml, /Salidas de efectivo/); assert.match(ticket.bodyHtml, /Retiros a caja fuerte/);
  assert.match(ticket.bodyHtml, /USD.*550\.00/);
});
test('a backend shift never borrows another register warehouse or code', () => {
  const shift = { id: 40, cashRegisterId: 20, warehouseId: 30, companyId: 1, currencyCode: 'MXN', openedAt: '2026-09-07T15:00:00Z', status: 'OPEN' };
  assert.throws(() => buildShiftFromBackend(shift, { cashRegisterId: '99', warehouseId: '98' }), /no corresponde/);
  assert.throws(() => buildShiftFromBackend(shift, { cashRegisterId: '20', warehouseId: '98' }), /no corresponde/);
  const mapped = buildShiftFromBackend({ ...shift, countedCashAmount: null, overShortAmount: null }, { cashRegisterId: '20', warehouseId: '30', cashRegisterCode: 'B', warehouseName: 'B warehouse' });
  assert.equal(mapped.cashRegisterCode, 'B'); assert.equal(mapped.warehouseName, 'B warehouse');
  assert.equal(mapped.actualCash, undefined); assert.equal(mapped.difference, undefined);
});

test('shared print engine waits for the reserved document and prints exactly once after navigation', () => {
  const { printDocumentHtml } = load(resolve(root, '../shared/print/documentHtmlPrintEngine.ts'));
  const originalWindow = globalThis.window;
  let poll, loadHandler, printed = 0;
  const child = { closed: false, document: { readyState: 'loading' }, location: { href: 'about:blank', replace(value) { this.href = value; loadHandler = undefined; } },
    addEventListener(_event, callback) { loadHandler = callback; }, focus() {}, print() { printed++; } };
  globalThis.window = { setInterval(callback) { poll = callback; return 1; }, clearInterval() {}, setTimeout() {} };
  try {
    assert.equal(printDocumentHtml({ bodyHtml: '<p>Saved receipt</p>', documentTitle: 'test', locale: 'es-MX', pageSize: '80mm', targetWindow: child }), true);
    poll(); assert.equal(printed, 0);
    child.document.readyState = 'complete'; poll(); poll();
    assert.equal(printed, 1); assert.equal(loadHandler, undefined);
    URL.revokeObjectURL(child.location.href);
  } finally { globalThis.window = originalWindow; }
});
