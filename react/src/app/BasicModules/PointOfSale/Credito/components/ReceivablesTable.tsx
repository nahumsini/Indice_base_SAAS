import { useMemo } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { ReceivableAccount, ReceivableStatus } from '../../../CommerceCore/receivables';
import { PointOfSaleTablePagination } from '../../shared/components/PointOfSaleTablePagination';

interface ReceivablesTableProps {
  receivables: ReceivableAccount[];
  onRegisterPayment: (receivable: ReceivableAccount) => void;
}

const statusLabels: Record<ReceivableStatus, string> = {
  current: 'Vigente',
  due_today: 'Vence hoy',
  overdue: 'Vencida',
  partial: 'Parcial',
  paid: 'Liquidada',
  blocked: 'Bloqueada',
  written_off: 'Incobrable',
};

const statusClasses: Record<ReceivableStatus, string> = {
  current: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  due_today: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  blocked: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  written_off: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

export function ReceivablesTable({ receivables, onRegisterPayment }: ReceivablesTableProps) {
  const receivablesPaginationResetKey = useMemo(() => receivables.map((receivable) => receivable.id).join('|'), [receivables]);
  const receivablesPagination = useTablePagination({
    resetKey: receivablesPaginationResetKey,
    rows: receivables,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              {['Cliente', 'Venta', 'Monto original', 'Saldo', 'Vencimiento', 'Politica', 'Estado', ''].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {receivablesPagination.paginatedRows.map((receivable) => (
              <tr key={receivable.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-950 dark:text-white">{receivable.customerName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{receivable.customerId}</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">{receivable.saleNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{receivable.source.toUpperCase()} · {receivable.issuedAt}</p>
                </td>
                <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{formatCurrency(receivable.originalAmount, receivable.currency)}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-950 dark:text-white">{formatCurrency(receivable.balance, receivable.currency)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(receivable.paidAmount, receivable.currency)} pagado</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">{receivable.dueDate}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{receivable.termDays} dias</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">{receivable.creditRuleName ?? 'N/D'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{receivable.creditDecision ?? 'Sin decision'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClasses[receivable.status]}`}>{statusLabels[receivable.status]}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onRegisterPayment(receivable)}
                    disabled={receivable.balance <= 0}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                  >
                    <CircleDollarSign className="h-4 w-4" />
                    Abono
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {receivables.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-200">Sin cuentas por cobrar</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Las ventas POS a credito apareceran aqui cuando se cierre el ticket.</p>
          </div>
        )}
      </div>
      <PointOfSaleTablePagination {...receivablesPagination} itemLabel="cuentas" />
    </div>
  );
}

const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);
