import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, Columns3, Eye, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import {
  ColumnasConfigModal,
  type ColumnConfig,
} from '../../../components/rh/ColumnasConfigModal';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { CreditSalesKpiArea } from '../components/CreditSalesKpiArea';
import { ReceivablesFilters } from '../components/ReceivablesFilters';
import { ReceivablesStatusBadge } from '../components/ReceivablesStatusBadge';
import { ReceivablesTableShell } from '../components/ReceivablesTableShell';
import { ReceivablesTitleBar } from '../components/ReceivablesTitleBar';
import { CreditSaleModal } from '../components/modals/CreditSaleModal';
import { CreditSaleReadOnlyModal } from '../components/modals/CreditSaleReadOnlyModal';
import {
  financeAccentButtonClass,
  financeTextClass,
  initialFilters,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';
import type { CandidateSale, CreditPolicy, CreditSale, CreditSimulation } from '../types';
import {
  addMonths,
  formatMoney,
  formatPercent,
  getOptionsFromRows,
  matchesPeriod,
  textMatch,
} from '../utils';

type CreditSalesColumnId =
  | 'sale'
  | 'customer'
  | 'status'
  | 'unit'
  | 'business'
  | 'amount'
  | 'run'
  | 'monthlyPayment'
  | 'due';

type CreditSalesSortState = {
  columnId: CreditSalesColumnId;
  direction: 'asc' | 'desc';
};

const creditSalesColumnsStorageKey = 'indice.receivables.creditSales.columns.v1';
const creditSalesSortCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function normalizeCreditSalesColumns(columns: ColumnConfig[], defaultColumns: ColumnConfig[]) {
  const currentById = new Map(columns.map((column) => [column.id, column]));
  const defaultById = new Map(defaultColumns.map((column) => [column.id, column]));
  const orderedCurrentColumns = columns
    .filter((column) => defaultById.has(column.id))
    .map((column) => {
      const defaultColumn = defaultById.get(column.id)!;
      return {
        ...defaultColumn,
        visible: defaultColumn.locked ? true : column.visible,
      };
    });
  const missingColumns = defaultColumns.filter((column) => !currentById.has(column.id));

  return [...orderedCurrentColumns, ...missingColumns];
}

function readCreditSalesColumns(defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const storedColumns = window.localStorage.getItem(creditSalesColumnsStorageKey);
    if (!storedColumns) {
      return defaultColumns;
    }

    const parsedColumns = JSON.parse(storedColumns) as ColumnConfig[];
    return Array.isArray(parsedColumns)
      ? normalizeCreditSalesColumns(parsedColumns, defaultColumns)
      : defaultColumns;
  } catch {
    return defaultColumns;
  }
}

function getCreditSaleSortValue(sale: CreditSale, columnId: CreditSalesColumnId) {
  if (columnId === 'sale') {
    return sale.saleNumber;
  }
  if (columnId === 'customer') {
    return sale.customerName;
  }
  if (columnId === 'status') {
    return sale.status;
  }
  if (columnId === 'unit') {
    return sale.unit;
  }
  if (columnId === 'business') {
    return sale.business;
  }
  if (columnId === 'amount') {
    return sale.financedAmount;
  }
  if (columnId === 'run') {
    return sale.selectedSimulation.name;
  }
  if (columnId === 'monthlyPayment') {
    return sale.selectedSimulation.monthlyPayment;
  }

  return addMonths(sale.firstDueDate, sale.selectedSimulation.termMonths);
}

function sortCreditSales(sales: CreditSale[], sortState: CreditSalesSortState) {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...sales].sort((left, right) => {
    const leftValue = getCreditSaleSortValue(left, sortState.columnId);
    const rightValue = getCreditSaleSortValue(right, sortState.columnId);
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : creditSalesSortCollator.compare(String(leftValue ?? ''), String(rightValue ?? ''));

    return comparison * directionMultiplier;
  });
}

function CreditSalesSortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: CreditSalesSortState['direction'];
}) {
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp className={cn('-mb-1 h-3 w-3', active && direction === 'asc' ? 'text-[#147514]' : 'text-slate-400')} />
      <ChevronDown className={cn('-mt-1 h-3 w-3', active && direction === 'desc' ? 'text-[#147514]' : 'text-slate-400')} />
    </span>
  );
}

function SortableCreditSalesHead({
  column,
  onSort,
  sortState,
}: {
  column: ColumnConfig;
  onSort: (columnId: CreditSalesColumnId) => void;
  sortState: CreditSalesSortState;
}) {
  const columnId = column.id as CreditSalesColumnId;
  const active = sortState.columnId === columnId;

  return (
    <TableHead className="px-5 py-4 text-xs font-bold text-slate-500">
      <button
        type="button"
        onClick={() => onSort(columnId)}
        className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 transition hover:text-[#147514] dark:text-slate-400 dark:hover:text-emerald-300"
      >
        <span>{column.label}</span>
        <CreditSalesSortIcon active={active} direction={sortState.direction} />
      </button>
    </TableHead>
  );
}

interface CreditSalesViewProps {
  candidateSales: CandidateSale[];
  copy: ReceivablesTranslations;
  creditPolicies: CreditPolicy[];
  creditSales: CreditSale[];
  requestedCandidateSaleId: string | null;
  onCreditSaleRequestConsumed: () => void;
  onCreateCreditSale: (draft: {
    candidate: CandidateSale;
    financedAmount: number;
    firstDueDate: string;
    creditPolicy: CreditPolicy;
    selectedSimulation: CreditSimulation;
  }) => boolean | void | Promise<boolean | void>;
}

export function CreditSalesView({
  candidateSales,
  copy,
  creditPolicies,
  creditSales,
  requestedCandidateSaleId,
  onCreditSaleRequestConsumed,
  onCreateCreditSale,
}: CreditSalesViewProps) {
  const viewCopy = copy.views.creditSales;
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'sale', label: viewCopy.table.sale, visible: true, locked: true },
    { id: 'customer', label: viewCopy.table.customer, visible: true },
    { id: 'status', label: viewCopy.table.status, visible: true },
    { id: 'unit', label: viewCopy.table.unit, visible: true },
    { id: 'business', label: viewCopy.table.business, visible: true },
    { id: 'amount', label: viewCopy.table.amount, visible: true },
    { id: 'run', label: viewCopy.table.run, visible: true },
    { id: 'monthlyPayment', label: viewCopy.table.monthlyPayment, visible: true },
    { id: 'due', label: viewCopy.table.due, visible: true },
  ], [viewCopy.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: viewCopy.table.actions, visible: true, locked: true },
  ], [viewCopy.table.actions]);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => readCreditSalesColumns(defaultColumns));
  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const [filters, setFilters] = useState(initialFilters);
  const [sortState, setSortState] = useState<CreditSalesSortState>({
    columnId: 'sale',
    direction: 'desc',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [initialModalSaleId, setInitialModalSaleId] = useState<string | null>(null);
  const [detailSale, setDetailSale] = useState<CreditSale | null>(null);
  const [scheduleSale, setScheduleSale] = useState<CreditSale | null>(null);
  const filteredSales = useMemo(() => {
    const query = filters.search.trim();

    return creditSales.filter((sale) => (
      (!query || textMatch(`${sale.saleNumber} ${sale.customerName}`, query))
      && matchesPeriod(sale.saleDate, filters.period)
      && (filters.status === 'all' || sale.status === filters.status)
      && (filters.unit === 'all' || sale.unit === filters.unit)
      && (filters.business === 'all' || sale.business === filters.business)
    ));
  }, [creditSales, filters]);
  const sortedSales = useMemo(() => sortCreditSales(filteredSales, sortState), [filteredSales, sortState]);
  const pagination = useTablePagination({
    resetKey: JSON.stringify({ filters, sortState }),
    rows: sortedSales,
  });

  useEffect(() => {
    setColumns((currentColumns) => normalizeCreditSalesColumns(currentColumns, defaultColumns));
  }, [defaultColumns]);

  useEffect(() => {
    window.localStorage.setItem(creditSalesColumnsStorageKey, JSON.stringify(columns));
  }, [columns]);

  const handleSort = (columnId: CreditSalesColumnId) => {
    setSortState((currentState) => ({
      columnId,
      direction: currentState.columnId === columnId && currentState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderCreditSaleCell = (sale: CreditSale, columnId: CreditSalesColumnId) => {
    if (columnId === 'sale') {
      return (
        <>
          <div className="font-black text-slate-950 dark:text-white">{sale.saleNumber}</div>
          <div className="text-xs font-semibold text-slate-500">{sale.saleDate}</div>
        </>
      );
    }

    if (columnId === 'customer') {
      return sale.customerName;
    }

    if (columnId === 'status') {
      return <ReceivablesStatusBadge copy={copy} status={sale.status} />;
    }

    if (columnId === 'unit') {
      return sale.unit;
    }

    if (columnId === 'business') {
      return sale.business;
    }

    if (columnId === 'amount') {
      return formatMoney(sale.financedAmount, sale.currency);
    }

    if (columnId === 'run') {
      return (
        <>
          <div className="font-bold text-slate-800 dark:text-slate-100">{sale.selectedSimulation.name}</div>
          <div className="text-xs font-semibold text-slate-500">
            {sale.selectedSimulation.termMonths} {copy.modals.creditSale.months.toLowerCase()} - {formatPercent(sale.selectedSimulation.annualInterestRate)}
          </div>
        </>
      );
    }

    if (columnId === 'monthlyPayment') {
      return formatMoney(sale.selectedSimulation.monthlyPayment, sale.currency);
    }

    return addMonths(sale.firstDueDate, sale.selectedSimulation.termMonths);
  };

  useEffect(() => {
    if (!requestedCandidateSaleId) {
      return;
    }

    const requestedSale = candidateSales.find((sale) => sale.id === requestedCandidateSaleId);
    if (!requestedSale) {
      return;
    }

    setInitialModalSaleId(requestedSale.id);
    setShowCreateModal(true);
    onCreditSaleRequestConsumed();
  }, [candidateSales, onCreditSaleRequestConsumed, requestedCandidateSaleId]);

  return (
    <>
      <ReceivablesTitleBar
        icon={<span className="text-3xl leading-none">💳</span>}
        title={viewCopy.title}
        subtitle={viewCopy.subtitle}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowColumnsModal(true)}
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-5 text-sm font-bold text-[#147514] shadow-sm hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            >
              <Columns3 className="h-4 w-4" />
              {viewCopy.columnsAction}
            </Button>
            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={cn('h-11 gap-2 rounded-xl px-5 text-sm font-bold', financeAccentButtonClass)}
            >
              <Plus className="h-4 w-4" />
              {viewCopy.action}
            </Button>
          </>
        )}
      />

      <ReceivablesFilters
        copy={copy}
        filters={filters}
        statusOptions={[
          { value: 'active', label: copy.status.active },
          { value: 'simulated', label: copy.status.simulated },
          { value: 'completed', label: copy.status.completed },
          { value: 'rejected', label: copy.status.rejected },
        ]}
        unitOptions={getOptionsFromRows(creditSales, (sale) => sale.unit)}
        businessOptions={getOptionsFromRows(creditSales, (sale) => sale.business)}
        onChange={setFilters}
      />

      <CreditSalesKpiArea
        copy={copy}
        creditSales={filteredSales}
        totalCreditSales={creditSales.length}
      />

      <ReceivablesTableShell
        currentPage={pagination.currentPage}
        emptyColSpan={visibleColumns.length + 1}
        emptyLabel={viewCopy.empty}
        itemLabel={viewCopy.itemLabel}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
        pageEnd={pagination.pageEnd}
        pageSize={pagination.pageSize}
        pageSizeOptions={pagination.pageSizeOptions}
        pageStart={pagination.pageStart}
        totalCount={pagination.totalCount}
        totalPages={pagination.totalPages}
      >
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {visibleColumns.map((column) => (
              <SortableCreditSalesHead
                key={column.id}
                column={column}
                sortState={sortState}
                onSort={handleSort}
              />
            ))}
            <TableHead className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              {viewCopy.table.actions}
            </TableHead>
          </TableRow>
        </TableHeader>
        {pagination.totalCount > 0 ? (
          <TableBody>
            {pagination.paginatedRows.map((sale) => (
              <TableRow key={sale.id} className="border-slate-100 dark:border-slate-800">
                {visibleColumns.map((column) => {
                  const columnId = column.id as CreditSalesColumnId;

                  return (
                    <TableCell
                      key={`${sale.id}-${column.id}`}
                      className={cn(
                        'px-5 py-4 font-semibold text-slate-600 dark:text-slate-300',
                        columnId === 'sale' && 'text-slate-950 dark:text-white',
                        columnId === 'amount' && 'font-black text-slate-950 dark:text-white',
                        columnId === 'monthlyPayment' && cn('font-bold', financeTextClass),
                      )}
                    >
                      {renderCreditSaleCell(sale, columnId)}
                    </TableCell>
                  );
                })}
                <TableCell className="px-5 py-4">
                  <div className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.detail}
                      aria-label={viewCopy.rowActions.detail}
                      onClick={() => setDetailSale(sale)}
                      className="h-10 w-10 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.schedule}
                      aria-label={viewCopy.rowActions.schedule}
                      onClick={() => setScheduleSale(sale)}
                      className="h-10 w-10 rounded-xl border border-emerald-100 bg-emerald-50 text-[#147514] hover:bg-emerald-100 hover:text-[#0F5F10] dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    >
                      <CalendarClock className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ) : null}
      </ReceivablesTableShell>

      <ColumnasConfigModal
        isOpen={showColumnsModal}
        columns={columns}
        defaultColumns={defaultColumns}
        fixedColumns={fixedColumns}
        theme="receivables"
        onClose={() => setShowColumnsModal(false)}
        onSave={(nextColumns) => setColumns(normalizeCreditSalesColumns(nextColumns, defaultColumns))}
      />

      {showCreateModal ? (
        <CreditSaleModal
          candidateSales={candidateSales}
          copy={copy}
          creditPolicies={creditPolicies}
          initialSelectedSaleId={initialModalSaleId}
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreateCreditSale}
        />
      ) : null}
      {detailSale ? (
        <CreditSaleReadOnlyModal
          copy={copy}
          mode="detail"
          sale={detailSale}
          onClose={() => setDetailSale(null)}
        />
      ) : null}
      {scheduleSale ? (
        <CreditSaleReadOnlyModal
          copy={copy}
          mode="schedule"
          sale={scheduleSale}
          onClose={() => setScheduleSale(null)}
        />
      ) : null}
    </>
  );
}
