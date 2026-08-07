import type { CreditSale, ReceivableInstallment } from '../types';

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function exportCreditSaleScheduleCsv({
  installments,
  sale,
}: {
  installments: ReceivableInstallment[];
  sale: CreditSale;
}) {
  const rows: Array<Array<string | number>> = [
    ['Sale', sale.saleNumber],
    ['Customer', sale.customerName],
    ['Currency', sale.currency],
    [],
    ['Installment', 'Due date', 'Amount', 'Paid', 'Balance', 'Status'],
    ...installments.map((installment) => [
      installment.installmentNumber,
      installment.dueDate,
      installment.amount,
      installment.paidAmount,
      installment.balance,
      installment.status,
    ]),
  ];
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `credit-sale-schedule-${sale.saleNumber}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
