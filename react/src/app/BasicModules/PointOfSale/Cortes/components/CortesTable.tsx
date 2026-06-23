import { ArrowDownUp, Download, Eye, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PosCashClosingSummaryRow } from '../types/cashClosingHistory.types';
import { cortesColumnLabels, type CortesColumnId } from '../utils/cortesColumns';
import {
  type CortesSortDirection,
  type CortesSortKey,
  formatCurrency,
  formatDateTime,
  getClosingStatus,
  toNumber,
} from '../utils/cortesUtils';

interface CortesTableProps {
  currencyCode?: string;
  loading: boolean;
  rows: PosCashClosingSummaryRow[];
  sortDirection: CortesSortDirection;
  sortKey: CortesSortKey;
  visibleColumns: CortesColumnId[];
  onDownload: (row: PosCashClosingSummaryRow) => void;
  onPrint: (row: PosCashClosingSummaryRow) => void;
  onSelect: (row: PosCashClosingSummaryRow) => void;
  onSort: (key: CortesSortKey) => void;
}

const sortableColumns: Partial<Record<CortesColumnId, CortesSortKey>> = {
  cashier: 'closedByUserId',
  cashRegister: 'cashRegisterId',
  closedAt: 'closedAt',
  context: 'warehouseId',
  counted: 'countedCashAmount',
  difference: 'overShortAmount',
  expected: 'expectedCashAmount',
  folio: 'id',
  shift: 'shiftId',
  tickets: 'ticketsCount',
  totalSales: 'totalSalesAmount',
};

export function CortesTable({
  currencyCode = 'MXN',
  loading,
  rows,
  sortDirection,
  sortKey,
  visibleColumns,
  onDownload,
  onPrint,
  onSelect,
  onSort,
}: CortesTableProps) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Historial de cortes</h3>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {rows.length} registro(s) visibles
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {sortableColumns[column] ? (
                    <button
                      type="button"
                      onClick={() => onSort(sortableColumns[column]!)}
                      className="inline-flex items-center gap-2 transition hover:text-slate-900 dark:hover:text-white"
                    >
                      {cortesColumnLabels[column]}
                      <ArrowDownUp className={`h-3.5 w-3.5 ${sortKey === sortableColumns[column] ? 'text-[#FF6B5E]' : ''}`} />
                      {sortKey === sortableColumns[column] ? (
                        <span className="sr-only">{sortDirection === 'asc' ? 'ascendente' : 'descendente'}</span>
                      ) : null}
                    </button>
                  ) : cortesColumnLabels[column]}
                </th>
              ))}
              <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                {visibleColumns.map((column) => (
                  <td key={`${row.id}-${column}`} className="px-5 py-4 align-middle text-slate-700 dark:text-slate-200">
                    <CortesTableCell column={column} currencyCode={currencyCode} row={row} />
                  </td>
                ))}
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <IconButton label={`Ver corte COR-${row.id}`} onClick={() => onSelect(row)}>
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Imprimir COR-${row.id}`} onClick={() => onPrint(row)}>
                      <Printer className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Descargar COR-${row.id}`} onClick={() => onDownload(row)}>
                      <Download className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-black text-slate-900 dark:text-white">No hay cortes con estos filtros</p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Ajusta el periodo o revisa si ya existe un turno cerrado en Venta.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CortesTableCell({
  column,
  currencyCode,
  row,
}: {
  column: CortesColumnId;
  currencyCode: string;
  row: PosCashClosingSummaryRow;
}) {
  const status = getClosingStatus(row);

  if (column === 'folio') {
    return (
      <span>
        <strong className="block text-slate-950 dark:text-white">COR-{row.id}</strong>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ID {row.id}</span>
      </span>
    );
  }
  if (column === 'closedAt') {
    return <span className="font-semibold">{formatDateTime(row.closedAt)}</span>;
  }
  if (column === 'context') {
    return <strong className="text-slate-950 dark:text-white">Almacén {row.warehouseId}</strong>;
  }
  if (column === 'cashRegister') {
    return <strong className="text-slate-950 dark:text-white">Caja {row.cashRegisterId}</strong>;
  }
  if (column === 'cashier') {
    return <strong className="text-slate-950 dark:text-white">Usuario {row.closedByUserId}</strong>;
  }
  if (column === 'shift') {
    return <strong className="text-slate-950 dark:text-white">Turno {row.shiftId}</strong>;
  }
  if (column === 'tickets') {
    return <strong className="text-slate-950 dark:text-white">{row.ticketsCount}</strong>;
  }
  if (column === 'totalSales') {
    return <strong className="text-slate-950 dark:text-white">{formatCurrency(toNumber(row.totalSalesAmount), currencyCode)}</strong>;
  }
  if (column === 'expected') {
    return <span className="font-bold">{formatCurrency(toNumber(row.expectedCashAmount), currencyCode)}</span>;
  }
  if (column === 'counted') {
    return <span className="font-bold">{formatCurrency(toNumber(row.countedCashAmount), currencyCode)}</span>;
  }
  if (column === 'difference') {
    return (
      <strong className={status === 'short' ? 'text-rose-600' : status === 'over' ? 'text-amber-700' : 'text-emerald-600'}>
        {toNumber(row.overShortAmount) > 0 ? '+' : ''}{formatCurrency(toNumber(row.overShortAmount), currencyCode)}
      </strong>
    );
  }

  return <StatusBadge status={status} />;
}

function StatusBadge({ status }: { status: ReturnType<typeof getClosingStatus> }) {
  const className = status === 'balanced'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
    : status === 'over'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200';
  const label = status === 'balanced' ? 'Cuadrado' : status === 'over' ? 'Sobrante' : 'Faltante';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>;
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
