import type { CashAuditRecord } from '../types/cashAudit.types';

const csvHeaders = [
  'id',
  'shiftId',
  'company',
  'businessUnit',
  'business',
  'cashRegister',
  'user',
  'openedAt',
  'closedAt',
  'openingFund',
  'cashExpected',
  'cashCounted',
  'cardExpected',
  'cardCounted',
  'transferExpected',
  'transferCounted',
  'totalSales',
  'expectedTotal',
  'countedTotal',
  'difference',
  'status',
  'auditStatus',
  'requiresReview',
  'auditNote',
  'reviewedAt',
  'notes',
];

const escapeCsv = (value: string | number | boolean) => {
  const serialized = String(value).replace(/"/g, '""');
  return `"${serialized}"`;
};

export function exportCashAuditsCsv(records: CashAuditRecord[]) {
  const rows = records.map((record) => [
    record.id,
    record.shiftId,
    record.companyName,
    record.businessUnitName,
    record.businessName,
    record.cashRegisterCode,
    record.responsibleUserName,
    record.openedAt.toISOString(),
    record.closedAt.toISOString(),
    record.openingFund,
    record.cashExpected,
    record.cashCounted,
    record.cardExpected,
    record.cardCounted,
    record.transferExpected,
    record.transferCounted,
    record.totalSales,
    record.expectedTotal,
    record.countedTotal,
    record.difference,
    record.status,
    record.auditStatus,
    record.requiresReview,
    record.auditNote ?? '',
    record.reviewedAt?.toISOString() ?? '',
    record.notes ?? '',
  ]);

  const csv = [
    csvHeaders.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `arqueos-pos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
