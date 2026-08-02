import { ArrowDownUp, Download, Eye, Loader2, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BusinessExchangeRatesPerUsd } from '../../../shared/businessCurrency';
import type { PosCashClosingSummaryRow } from '../types/cashClosingHistory.types';
import { cortesColumnLabels, type CortesColumnId } from '../utils/cortesColumns';
import {
  type CortesSortDirection,
  type CortesSortKey,
  formatClosingAmount,
  formatDateTime,
  getClosingStatus,
  toNumber,
} from '../utils/cortesUtils';

interface CortesTableProps {
  loading: boolean;
  preferredCurrency: string;
  rows: PosCashClosingSummaryRow[];
  selectedRowIds: number[];
  sortDirection: CortesSortDirection;
  sortKey: CortesSortKey;
  visibleColumns: CortesColumnId[];
  allVisibleSelected: boolean;
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd;
  onDownload: (row: PosCashClosingSummaryRow) => void;
  onPrint: (row: PosCashClosingSummaryRow) => void;
  onSelect: (row: PosCashClosingSummaryRow) => void;
  onSort: (key: CortesSortKey) => void;
  onToggleRowSelection: (rowId: number) => void;
  onToggleVisibleSelection: () => void;
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
  loading,
  preferredCurrency,
  rows,
  selectedRowIds,
  sortDirection,
  sortKey,
  visibleColumns,
  allVisibleSelected,
  exchangeRatesPerUsd,
  onDownload,
  onPrint,
  onSelect,
  onSort,
  onToggleRowSelection,
  onToggleVisibleSelection,
}: CortesTableProps) {
  const selectedIdSet = new Set(selectedRowIds);
  const columnSpan = visibleColumns.length + 2;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">Historial de cortes</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {rows.length} registro(s) visibles
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="w-12 px-5 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={rows.length === 0}
                  aria-label="Seleccionar cortes visibles"
                  onChange={onToggleVisibleSelection}
                  className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </th>
              {visibleColumns.map((column) => (
                <th key={column} className="px-5 py-3 text-left text-xs font-medium tracking-normal text-slate-500 dark:text-slate-400">
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
              <th className="px-5 py-3 text-right text-xs font-medium tracking-normal text-slate-500 dark:text-slate-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columnSpan} className="px-6 py-12">
                  <div className="flex items-center justify-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-5 text-sm font-medium text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando cortes reales del punto de venta...
                  </div>
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                <td className="px-5 py-4 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(row.id)}
                    aria-label={`Seleccionar COR-${row.id}`}
                    onChange={() => onToggleRowSelection(row.id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                  />
                </td>
                {visibleColumns.map((column) => (
                  <td key={`${row.id}-${column}`} className="px-5 py-4 align-middle text-slate-700 dark:text-slate-200">
                    <CortesTableCell
                      column={column}
                      exchangeRatesPerUsd={exchangeRatesPerUsd}
                      preferredCurrency={preferredCurrency}
                      row={row}
                    />
                  </td>
                ))}
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
            <p className="text-lg font-medium text-slate-900 dark:text-white">No hay cortes con estos filtros</p>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
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
  exchangeRatesPerUsd,
  preferredCurrency,
  row,
}: {
  column: CortesColumnId;
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd;
  preferredCurrency: string;
  row: PosCashClosingSummaryRow;
}) {
  const status = getClosingStatus(row);

  if (column === 'folio') {
    return (
      <span>
        <strong className="block text-slate-950 dark:text-white">COR-{row.id}</strong>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ID {row.id}</span>
      </span>
    );
  }
  if (column === 'closedAt') {
    return <span className="font-medium">{formatDateTime(row.closedAt)}</span>;
  }
  if (column === 'context') {
    return <strong className="text-slate-950 dark:text-white">Almacen {row.warehouseId}</strong>;
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
    return (
      <MoneyCell
        amount={toNumber(row.totalSalesAmount)}
        exchangeRatesPerUsd={exchangeRatesPerUsd}
        preferredCurrency={preferredCurrency}
        row={row}
        strong
      />
    );
  }
  if (column === 'expected') {
    return (
      <MoneyCell
        amount={toNumber(row.expectedCashAmount)}
        exchangeRatesPerUsd={exchangeRatesPerUsd}
        preferredCurrency={preferredCurrency}
        row={row}
      />
    );
  }
  if (column === 'counted') {
    return (
      <MoneyCell
        amount={toNumber(row.countedCashAmount)}
        exchangeRatesPerUsd={exchangeRatesPerUsd}
        preferredCurrency={preferredCurrency}
        row={row}
      />
    );
  }
  if (column === 'difference') {
    return (
      <MoneyCell
        amount={toNumber(row.overShortAmount)}
        exchangeRatesPerUsd={exchangeRatesPerUsd}
        preferredCurrency={preferredCurrency}
        row={row}
        strong
        tone={status === 'short' ? 'danger' : status === 'over' ? 'warning' : 'success'}
      />
    );
  }

  return <StatusBadge status={status} />;
}

function MoneyCell({
  amount,
  exchangeRatesPerUsd,
  preferredCurrency,
  row,
  strong = false,
  tone = 'neutral',
}: {
  amount: number;
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd;
  preferredCurrency: string;
  row: PosCashClosingSummaryRow;
  strong?: boolean;
  tone?: 'danger' | 'neutral' | 'success' | 'warning';
}) {
  const { convertedLabel, nativeCurrency, nativeLabel } = formatClosingAmount(
    amount,
    row,
    preferredCurrency,
    exchangeRatesPerUsd,
  );
  const isConverted = nativeCurrency !== preferredCurrency;
  const className = tone === 'danger'
    ? 'text-rose-600'
    : tone === 'warning'
    ? 'text-amber-700'
    : tone === 'success'
    ? 'text-emerald-600'
    : 'text-slate-950 dark:text-white';
  const MainTag = strong ? 'strong' : 'span';

  return (
    <span className="block leading-tight">
      <MainTag className={`block font-medium ${className}`}>
        {amount > 0 && tone === 'warning' ? '+' : ''}{nativeLabel}
      </MainTag>
      {isConverted ? (
        <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          equiv. {convertedLabel}
        </span>
      ) : null}
    </span>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof getClosingStatus> }) {
  const className = status === 'balanced'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
    : status === 'over'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200';
  const label = status === 'balanced' ? 'Cuadrado' : status === 'over' ? 'Sobrante' : 'Faltante';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
