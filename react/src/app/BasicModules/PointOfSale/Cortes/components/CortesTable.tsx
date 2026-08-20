import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, Loader2, Printer } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
import type { CortesCopy } from '../cortesTranslations';
import type { PosCashClosingSummaryRow } from '../types/cashClosingHistory.types';
import { type CortesColumnId } from '../utils/cortesColumns';
import {
  type CortesSortDirection,
  type CortesSortKey,
  formatClosingAmount,
  formatDateTime,
  getClosingPaymentTotal,
  toNumber,
} from '../utils/cortesUtils';

interface CortesTableProps {
  copy: CortesCopy;
  loading: boolean;
  rows: PosCashClosingSummaryRow[];
  selectedRowIds: number[];
  sortDirection: CortesSortDirection;
  sortKey: CortesSortKey;
  visibleColumns: CortesColumnId[];
  allVisibleSelected: boolean;
  cashRegisterNames: Record<number, string>;
  cashierNames: Record<number, string>;
  pagination: ReactNode;
  warehouseNames: Record<number, string>;
  onDownload: (row: PosCashClosingSummaryRow) => void;
  onPrint: (row: PosCashClosingSummaryRow) => void;
  onSelect: (row: PosCashClosingSummaryRow) => void;
  onSort: (key: CortesSortKey) => void;
  onToggleRowSelection: (rowId: number) => void;
  onToggleVisibleSelection: () => void;
}

type CortesResizableColumn = CortesColumnId | 'actions';
type CortesColumnWidths = Record<CortesResizableColumn, number>;
type ColumnAlignment = 'center' | 'left' | 'right';

const CORTES_COLUMN_WIDTHS_STORAGE_PREFIX = 'indice:pos:cortes:column-widths:v3';
const CORTES_SELECTION_COLUMN_WIDTH = 56;
const CORTES_MAX_COLUMN_WIDTH = 720;
const CORTES_DEFAULT_COLUMN_WIDTHS: CortesColumnWidths = {
  folio: 120,
  closedAt: 160,
  context: 180,
  cashRegister: 180,
  cashier: 150,
  tickets: 100,
  totalSales: 120,
  cash: 120,
  card: 120,
  transfer: 150,
  credit: 120,
  actions: 158,
};
const CORTES_CONTENT_MINIMUM_WIDTHS: CortesColumnWidths = {
  folio: 100,
  closedAt: 120,
  context: 130,
  cashRegister: 130,
  cashier: 110,
  tickets: 90,
  totalSales: 110,
  cash: 110,
  card: 110,
  transfer: 130,
  credit: 110,
  actions: 158,
};

const sortableColumns: Partial<Record<CortesColumnId, CortesSortKey>> = {
  cashier: 'closedByUserId',
  cashRegister: 'cashRegisterId',
  closedAt: 'closedAt',
  context: 'warehouseId',
  card: 'card',
  cash: 'cash',
  credit: 'credit',
  folio: 'id',
  tickets: 'ticketsCount',
  totalSales: 'totalSalesAmount',
  transfer: 'transfer',
};

const columnAlignment: Record<CortesColumnId, ColumnAlignment> = {
  cashier: 'left',
  card: 'right',
  cash: 'right',
  cashRegister: 'left',
  closedAt: 'left',
  context: 'left',
  credit: 'right',
  folio: 'left',
  tickets: 'right',
  totalSales: 'right',
  transfer: 'right',
};

function getResizableColumns(visibleColumns: CortesColumnId[]): CortesResizableColumn[] {
  return [...visibleColumns, 'actions'];
}

function getColumnWidthsStorageKey(visibleColumns: CortesColumnId[]) {
  return `${CORTES_COLUMN_WIDTHS_STORAGE_PREFIX}:${visibleColumns.join('-')}`;
}

function estimateHeaderWidth(label: string, sortable: boolean) {
  const textWidth = Array.from(label).reduce((width, character) => width + (character === ' ' ? 4 : 7.4), 0);
  const headerChromeWidth = sortable ? 76 : 54;
  return Math.ceil(textWidth + headerChromeWidth);
}

function getMinimumColumnWidths(copy: CortesCopy): CortesColumnWidths {
  const minimums = { ...CORTES_CONTENT_MINIMUM_WIDTHS };
  (Object.keys(copy.table.columns) as CortesColumnId[]).forEach((column) => {
    minimums[column] = Math.max(
      CORTES_CONTENT_MINIMUM_WIDTHS[column],
      estimateHeaderWidth(copy.table.columns[column], Boolean(sortableColumns[column])),
    );
  });
  minimums.actions = Math.max(
    CORTES_CONTENT_MINIMUM_WIDTHS.actions,
    estimateHeaderWidth(copy.table.actions, false),
  );
  return minimums;
}

function getDefaultColumnWidths(minimumWidths: CortesColumnWidths): CortesColumnWidths {
  return Object.fromEntries(
    (Object.keys(CORTES_DEFAULT_COLUMN_WIDTHS) as CortesResizableColumn[]).map((column) => [
      column,
      Math.max(CORTES_DEFAULT_COLUMN_WIDTHS[column], minimumWidths[column]),
    ]),
  ) as CortesColumnWidths;
}

function loadColumnWidths(visibleColumns: CortesColumnId[], minimumWidths: CortesColumnWidths): CortesColumnWidths {
  const defaults = getDefaultColumnWidths(minimumWidths);
  if (typeof window === 'undefined') return defaults;

  try {
    const stored = JSON.parse(window.localStorage.getItem(getColumnWidthsStorageKey(visibleColumns)) ?? 'null') as Partial<CortesColumnWidths> | null;
    const columns = getResizableColumns(visibleColumns);
    if (!stored || !columns.every((column) => (
      Number.isFinite(stored[column])
      && Number(stored[column]) >= minimumWidths[column]
      && Number(stored[column]) <= CORTES_MAX_COLUMN_WIDTH
    ))) {
      return defaults;
    }
    return { ...defaults, ...stored } as CortesColumnWidths;
  } catch {
    return defaults;
  }
}

function resizeColumn(
  widths: CortesColumnWidths,
  column: CortesResizableColumn,
  delta: number,
  minimumWidth: number,
) {
  return {
    ...widths,
    [column]: Math.round(Math.min(Math.max(widths[column] + delta, minimumWidth), CORTES_MAX_COLUMN_WIDTH)),
  };
}

export function CortesTable({
  allVisibleSelected,
  cashRegisterNames,
  cashierNames,
  copy,
  loading,
  onDownload,
  onPrint,
  onSelect,
  onSort,
  onToggleRowSelection,
  onToggleVisibleSelection,
  pagination,
  rows,
  selectedRowIds,
  sortDirection,
  sortKey,
  visibleColumns,
  warehouseNames,
}: CortesTableProps) {
  const minimumColumnWidths = useMemo(() => getMinimumColumnWidths(copy), [copy]);
  const [columnWidths, setColumnWidths] = useState<CortesColumnWidths>(() => loadColumnWidths(visibleColumns, minimumColumnWidths));
  const selectedIdSet = new Set(selectedRowIds);
  const columnSpan = visibleColumns.length + 2;
  const resizableColumns = useMemo(() => getResizableColumns(visibleColumns), [visibleColumns]);
  const defaultColumnWidths = useMemo(() => getDefaultColumnWidths(minimumColumnWidths), [minimumColumnWidths]);
  const tableWidth = useMemo(() => (
    CORTES_SELECTION_COLUMN_WIDTH
    + resizableColumns.reduce((total, column) => total + columnWidths[column], 0)
  ), [columnWidths, resizableColumns]);

  useEffect(() => {
    setColumnWidths((current) => {
      const next = { ...current };
      let changed = false;
      resizableColumns.forEach((column) => {
        const safeWidth = Math.min(
          Math.max(current[column], minimumColumnWidths[column]),
          CORTES_MAX_COLUMN_WIDTH,
        );
        if (safeWidth !== current[column]) {
          next[column] = safeWidth;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [minimumColumnWidths, resizableColumns]);

  useEffect(() => {
    try {
      window.localStorage.setItem(getColumnWidthsStorageKey(visibleColumns), JSON.stringify(columnWidths));
    } catch {
      // Column resizing remains available when browser storage is unavailable.
    }
  }, [columnWidths, visibleColumns]);

  const resizeColumnBy = (column: CortesResizableColumn, delta: number) => {
    setColumnWidths((current) => resizeColumn(current, column, delta, minimumColumnWidths[column]));
  };
  const startColumnResize = (
    event: React.PointerEvent<HTMLSpanElement>,
    column: CortesResizableColumn,
  ) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = { ...columnWidths };
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const deltaPixels = pointerEvent.clientX - startX;
      setColumnWidths(resizeColumn(startWidths, column, deltaPixels, minimumColumnWidths[column]));
    };
    const stopColumnResize = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopColumnResize);
      window.removeEventListener('pointercancel', stopColumnResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopColumnResize);
    window.addEventListener('pointercancel', stopColumnResize);
  };
  const resetColumnWidths = () => setColumnWidths(defaultColumnWidths);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto overscroll-x-contain">
        <table
          style={{ width: `${tableWidth}px`, minWidth: '100%' }}
          className="table-fixed divide-y divide-slate-200 text-sm leading-5 dark:divide-slate-700"
        >
          <colgroup>
            <col style={{ width: `${CORTES_SELECTION_COLUMN_WIDTH}px` }} />
            {visibleColumns.map((column) => <col key={column} style={{ width: `${columnWidths[column]}px` }} />)}
            <col style={{ width: `${columnWidths.actions}px` }} />
          </colgroup>
          <thead className="bg-slate-50 text-[13px] font-normal leading-4 text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
            <tr className="h-[52px]">
              <th scope="col" className="px-3 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={rows.length === 0}
                  aria-label={copy.table.selectVisible}
                  onChange={onToggleVisibleSelection}
                  className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </th>
              {visibleColumns.map((column) => (
                  <CortesTableHead
                    key={column}
                    align={columnAlignment[column]}
                    column={column}
                    copy={copy}
                    label={copy.table.columns[column]}
                    onSort={onSort}
                    sortDirection={sortDirection}
                    sortKey={sortKey}
                    resizeHandle={<ColumnResizeHandle
                      currentWidth={columnWidths[column]}
                      minimumWidth={minimumColumnWidths[column]}
                      maximumWidth={CORTES_MAX_COLUMN_WIDTH}
                      label={copy.table.columns[column]}
                      onPointerDown={(event) => startColumnResize(event, column)}
                      onResizeBy={(delta) => resizeColumnBy(column, delta)}
                      onReset={resetColumnWidths}
                    />}
                  />
              ))}
              <th scope="col" className="relative px-3 text-right text-[13px] font-normal leading-4">
                <span className="whitespace-nowrap">{copy.table.actions}</span>
                <ColumnResizeHandle
                  currentWidth={columnWidths.actions}
                  minimumWidth={minimumColumnWidths.actions}
                  maximumWidth={CORTES_MAX_COLUMN_WIDTH}
                  label={copy.table.actions}
                  onPointerDown={(event) => startColumnResize(event, 'actions')}
                  onResizeBy={(delta) => resizeColumnBy('actions', delta)}
                  onReset={resetColumnWidths}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columnSpan} className="px-5 py-16 text-center text-sm text-slate-500">
                  <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#B63B32]" />
                  <span className="font-medium">{copy.table.loading}</span>
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="h-16 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-3 py-3 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(row.id)}
                    aria-label={copy.table.selectRow(row.id)}
                    onChange={() => onToggleRowSelection(row.id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                  />
                </td>
                {visibleColumns.map((column) => (
                  <td
                    key={`${row.id}-${column}`}
                    className={`overflow-hidden px-4 py-3 align-middle text-sm font-normal text-slate-700 dark:text-slate-200 ${alignmentClassName(columnAlignment[column])}`}
                  >
                    <CortesTableCell
                      cashRegisterNames={cashRegisterNames}
                      cashierNames={cashierNames}
                      column={column}
                      copy={copy}
                      row={row}
                      warehouseNames={warehouseNames}
                    />
                  </td>
                ))}
                <td className="px-3 py-3 text-right align-middle">
                  <div className="inline-flex items-center justify-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                    <TableActionButton label={copy.table.viewRow(row.id)} onClick={() => onSelect(row)} tone="module">
                      <Eye className="h-4 w-4" />
                    </TableActionButton>
                    <TableActionButton label={copy.table.printRow(row.id)} onClick={() => onPrint(row)}>
                      <Printer className="h-4 w-4" />
                    </TableActionButton>
                    <TableActionButton label={copy.table.downloadRow(row.id)} onClick={() => onDownload(row)} tone="blue">
                      <Download className="h-4 w-4" />
                    </TableActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columnSpan} className="px-5 py-16 text-center text-slate-500">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{copy.table.emptyTitle}</span>
                  <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">{copy.table.emptyDescription}</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pagination}
    </section>
  );
}

function CortesTableHead({ align, column, copy, label, onSort, resizeHandle, sortDirection, sortKey }: {
  align: ColumnAlignment;
  column: CortesColumnId;
  copy: CortesCopy;
  label: string;
  onSort: (key: CortesSortKey) => void;
  resizeHandle?: ReactNode;
  sortDirection: CortesSortDirection;
  sortKey: CortesSortKey;
}) {
  const sortableKey = sortableColumns[column];
  const isActive = sortableKey === sortKey;
  const nextDirection = isActive && sortDirection === 'asc' ? 'desc' : 'asc';
  const sortLabel = `${label}: ${nextDirection === 'asc' ? copy.table.ascending : copy.table.descending}`;
  const SortIcon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={sortableKey ? (isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
      className={`relative px-4 ${alignmentClassName(align)}`}
    >
      {sortableKey ? (
        <button
          type="button"
          onClick={() => onSort(sortableKey)}
          className={`group inline-flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md text-[13px] font-normal leading-4 outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 ${justifyClassName(align)} ${resizeHandle ? 'pr-2' : ''} ${isActive ? 'text-[#B63B32] dark:text-[#FFB0AA]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'}`}
          aria-label={sortLabel}
          title={sortLabel}
        >
          <span className="whitespace-nowrap">{label}</span>
          <SortIcon className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`} aria-hidden="true" />
        </button>
      ) : (
        <span className={`flex min-h-9 w-full items-center whitespace-nowrap text-[13px] font-normal leading-4 ${justifyClassName(align)} ${resizeHandle ? 'pr-2' : ''}`}>{label}</span>
      )}
      {resizeHandle}
    </th>
  );
}

function ColumnResizeHandle({ currentWidth, label, maximumWidth, minimumWidth, onPointerDown, onReset, onResizeBy }: {
  currentWidth: number;
  label: string;
  maximumWidth: number;
  minimumWidth: number;
  onPointerDown: (event: React.PointerEvent<HTMLSpanElement>) => void;
  onReset: () => void;
  onResizeBy: (delta: number) => void;
}) {
  return (
    <span
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={Math.round(maximumWidth)}
      aria-valuemin={Math.round(minimumWidth)}
      aria-valuenow={Math.round(currentWidth)}
      aria-valuetext={`${Math.round(currentWidth)}%`}
      tabIndex={0}
      title={label}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReset();
      }}
      onKeyDown={(event) => {
        const delta = event.shiftKey ? 24 : 8;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onResizeBy(-delta);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          onResizeBy(delta);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onReset();
        }
      }}
      className="group/resize absolute right-0 top-0 z-10 flex h-full w-4 translate-x-1/2 touch-none cursor-col-resize items-center justify-center outline-none"
    >
      <span className="h-7 w-px bg-slate-300 opacity-60 transition group-hover/resize:w-0.5 group-hover/resize:bg-[#FF6B5E] group-hover/resize:opacity-100 group-focus-visible/resize:w-0.5 group-focus-visible/resize:bg-[#FF6B5E] group-focus-visible/resize:opacity-100 dark:bg-slate-600" aria-hidden="true" />
    </span>
  );
}

function CortesTableCell({ cashRegisterNames, cashierNames, column, copy, row, warehouseNames }: {
  cashRegisterNames: Record<number, string>;
  cashierNames: Record<number, string>;
  column: CortesColumnId;
  copy: CortesCopy;
  row: PosCashClosingSummaryRow;
  warehouseNames: Record<number, string>;
}) {
  if (column === 'folio') {
    return <span className="block min-w-0 text-left"><span className="block truncate text-sm font-medium text-slate-950 dark:text-white">COR-{row.id}</span><span className="mt-0.5 block truncate text-xs font-normal leading-4 text-slate-500 dark:text-slate-400">ID {row.id}</span></span>;
  }
  if (column === 'closedAt') {
    return <span className="block truncate" title={formatDateTime(row.closedAt)}>{formatDateTime(row.closedAt)}</span>;
  }
  if (column === 'context') {
    const name = row.warehouseName || warehouseNames[row.warehouseId] || copy.common.warehouse(row.warehouseId);
    return <span className="block truncate" title={name}>{name}</span>;
  }
  if (column === 'cashRegister') {
    const name = row.cashRegisterName || cashRegisterNames[row.cashRegisterId] || copy.common.cashRegister(row.cashRegisterId);
    return <span className="block min-w-0 text-left"><span className="block truncate" title={name}>{name}</span>{row.cashRegisterCode ? <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{row.cashRegisterCode}</span> : null}</span>;
  }
  if (column === 'cashier') {
    const name = row.closedByUserName || cashierNames[row.closedByUserId] || copy.common.user(row.closedByUserId);
    return <span className="block truncate" title={name}>{name}</span>;
  }
  if (column === 'tickets') return <span className="tabular-nums">{row.ticketsCount}</span>;
  if (column === 'totalSales') return <MoneyCell amount={toNumber(row.totalSalesAmount)} row={row} />;
  if (column === 'cash') return <MoneyCell amount={getClosingPaymentTotal(row, 'CASH')} row={row} />;
  if (column === 'card') return <MoneyCell amount={getClosingPaymentTotal(row, 'CARD')} row={row} />;
  if (column === 'transfer') return <MoneyCell amount={getClosingPaymentTotal(row, 'TRANSFER')} row={row} />;
  return <MoneyCell amount={getClosingPaymentTotal(row, 'CREDIT')} row={row} />;
}

function MoneyCell({ amount, emphasis = false, row, tone = 'neutral' }: {
  amount: number;
  emphasis?: boolean;
  row: PosCashClosingSummaryRow;
  tone?: 'danger' | 'neutral' | 'success' | 'warning';
}) {
  const { nativeLabel } = formatClosingAmount(amount, row);
  const className = tone === 'danger' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-700' : tone === 'success' ? 'text-emerald-600' : 'text-slate-950 dark:text-white';
  return <span className={`block truncate tabular-nums ${emphasis ? 'font-medium' : 'font-normal'} ${className}`} title={nativeLabel}>{amount > 0 && tone === 'warning' ? '+' : ''}{nativeLabel}</span>;
}

function TableActionButton({ children, label, onClick, tone = 'neutral' }: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'blue' | 'module' | 'neutral';
}) {
  const toneClassName = tone === 'module'
    ? 'border-[#FF6B5E]/35 bg-[#FF6B5E]/10 text-[#B63B32] hover:border-[#FF6B5E]/60 hover:bg-[#FF6B5E]/20 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]'
    : tone === 'blue'
    ? 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
    : 'border-slate-200 bg-white text-slate-500 hover:border-[#FF6B5E]/50 hover:bg-[#FF6B5E]/5 hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#FF6B5E]/40 dark:hover:text-[#FFB0AA]';
  return <Tooltip><TooltipTrigger asChild><button type="button" aria-label={label} onClick={onClick} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 ${toneClassName}`}>{children}</button></TooltipTrigger><TooltipContent side="top" sideOffset={8} className="max-w-[220px] rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium leading-4 text-white shadow-xl">{label}</TooltipContent></Tooltip>;
}

function alignmentClassName(align: ColumnAlignment) {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
}

function justifyClassName(align: ColumnAlignment) {
  return align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
}
