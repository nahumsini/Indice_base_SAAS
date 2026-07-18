import { useEffect, useMemo, useState } from 'react';
import { Banknote, Columns3, FolderOpen, Printer } from 'lucide-react';
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
import { AccountsReceivableKpiArea } from '../components/ReceivablesKpiAreas';
import { ReceivablesFilters } from '../components/ReceivablesFilters';
import {
  normalizeReceivablesColumns,
  persistReceivablesColumns,
  readReceivablesColumns,
  SortableReceivablesHead,
  sortReceivablesRows,
  type ReceivablesSortState,
} from '../components/ReceivablesSortableTable';
import { ReceivablesStatusBadge } from '../components/ReceivablesStatusBadge';
import { ReceivablesTableShell } from '../components/ReceivablesTableShell';
import { ReceivablesTitleBar } from '../components/ReceivablesTitleBar';
import { PaymentModal } from '../components/modals/PaymentModal';
import { ReceivableFilesModal } from '../components/modals/ReceivableFilesModal';
import {
  financeTextClass,
  initialFilters,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';
import type { ReceivableAccount, ReceivableInstallment, ReceivablePayment } from '../types';
import {
  formatMoney,
  getOptionsFromRows,
  matchesPeriod,
  textMatch,
} from '../utils';
import { useReceivablesResolvedLocale } from '../hooks/useReceivablesTranslations';
import { printReceivablesAgingReport } from '../utils/receivablesPrintDocuments';

type AccountsReceivableColumnId =
  | 'sale'
  | 'customer'
  | 'installment'
  | 'status'
  | 'unit'
  | 'business'
  | 'amount'
  | 'paid'
  | 'balance'
  | 'dueDate';

const accountsReceivableColumnsStorageKey = 'indice.receivables.accountsReceivable.columns.v1';

function getAccountsReceivableSortValue(
  installment: ReceivableInstallment,
  columnId: AccountsReceivableColumnId,
) {
  if (columnId === 'sale') {
    return installment.saleNumber;
  }
  if (columnId === 'customer') {
    return installment.customerName;
  }
  if (columnId === 'installment') {
    return installment.installmentNumber;
  }
  if (columnId === 'status') {
    return installment.status;
  }
  if (columnId === 'unit') {
    return installment.unit;
  }
  if (columnId === 'business') {
    return installment.business;
  }
  if (columnId === 'amount') {
    return installment.amount;
  }
  if (columnId === 'paid') {
    return installment.paidAmount;
  }
  if (columnId === 'balance') {
    return installment.balance;
  }

  return installment.dueDate;
}

interface AccountsReceivableViewProps {
  accounts: ReceivableAccount[];
  copy: ReceivablesTranslations;
  installments: ReceivableInstallment[];
  onRegisterPayment: (payment: Omit<ReceivablePayment, 'id'>) => boolean | void | Promise<boolean | void>;
  payments: ReceivablePayment[];
}

export function AccountsReceivableView({
  accounts,
  copy,
  installments,
  onRegisterPayment,
  payments,
}: AccountsReceivableViewProps) {
  const locale = useReceivablesResolvedLocale();
  const viewCopy = copy.views.accountsReceivable;
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'sale', label: viewCopy.table.sale, visible: true, locked: true },
    { id: 'customer', label: viewCopy.table.customer, visible: true },
    { id: 'installment', label: viewCopy.table.installment, visible: true },
    { id: 'status', label: viewCopy.table.status, visible: true },
    { id: 'unit', label: viewCopy.table.unit, visible: true },
    { id: 'business', label: viewCopy.table.business, visible: true },
    { id: 'amount', label: viewCopy.table.amount, visible: true },
    { id: 'paid', label: viewCopy.table.paid, visible: true },
    { id: 'balance', label: viewCopy.table.balance, visible: true },
    { id: 'dueDate', label: viewCopy.table.dueDate, visible: true },
  ], [viewCopy.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: viewCopy.table.actions, visible: true, locked: true },
  ], [viewCopy.table.actions]);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => readReceivablesColumns(accountsReceivableColumnsStorageKey, defaultColumns));
  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const [filters, setFilters] = useState(initialFilters);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [paymentInstallment, setPaymentInstallment] = useState<ReceivableInstallment | null>(null);
  const [filesInstallment, setFilesInstallment] = useState<ReceivableInstallment | null>(null);
  const [sortState, setSortState] = useState<ReceivablesSortState<AccountsReceivableColumnId>>({
    columnId: 'dueDate',
    direction: 'asc',
  });

  useEffect(() => {
    setColumns((currentColumns) => normalizeReceivablesColumns(currentColumns, defaultColumns));
  }, [defaultColumns]);

  useEffect(() => {
    persistReceivablesColumns(accountsReceivableColumnsStorageKey, columns);
  }, [columns]);

  const filteredInstallments = useMemo(() => {
    const query = filters.search.trim();

    return installments.filter((installment) => (
      (!query || textMatch(`${installment.saleNumber} ${installment.customerName} ${installment.installmentNumber}`, query))
      && matchesPeriod(installment.dueDate, filters.period)
      && (filters.status === 'all' || installment.status === filters.status)
      && (filters.unit === 'all' || installment.unit === filters.unit)
      && (filters.business === 'all' || installment.business === filters.business)
    ));
  }, [filters, installments]);
  const sortedInstallments = useMemo(
    () => sortReceivablesRows(filteredInstallments, sortState, getAccountsReceivableSortValue),
    [filteredInstallments, sortState],
  );
  const pagination = useTablePagination({
    resetKey: JSON.stringify(filters),
    rows: sortedInstallments,
  });
  const filesPayments = filesInstallment
    ? payments.filter((payment) => payment.receivableId === filesInstallment.receivableId)
    : [];
  const handleSort = (columnId: AccountsReceivableColumnId) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };
  const renderCell = (installment: ReceivableInstallment, columnId: AccountsReceivableColumnId) => {
    if (columnId === 'sale') {
      return installment.saleNumber;
    }
    if (columnId === 'customer') {
      return installment.customerName;
    }
    if (columnId === 'installment') {
      return `#${installment.installmentNumber}`;
    }
    if (columnId === 'status') {
      return <ReceivablesStatusBadge copy={copy} status={installment.status} />;
    }
    if (columnId === 'unit') {
      return installment.unit;
    }
    if (columnId === 'business') {
      return installment.business;
    }
    if (columnId === 'amount') {
      return formatMoney(installment.amount, installment.currency);
    }
    if (columnId === 'paid') {
      return formatMoney(installment.paidAmount, installment.currency);
    }
    if (columnId === 'balance') {
      return formatMoney(installment.balance, installment.currency);
    }

    return installment.dueDate;
  };

  return (
    <>
      <ReceivablesTitleBar
        icon={<span className="text-3xl leading-none">🧾</span>}
        title={viewCopy.title}
        subtitle={viewCopy.subtitle}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              disabled={sortedInstallments.length === 0}
              onClick={() => printReceivablesAgingReport({
                copy,
                filterSummary: [
                  `${copy.filters.period}: ${copy.filters.periodOptions[filters.period]}`,
                  filters.status !== 'all' ? `${copy.filters.status}: ${copy.status[filters.status as keyof typeof copy.status]}` : '',
                  filters.unit !== 'all' ? `${copy.filters.unit}: ${filters.unit}` : '',
                  filters.business !== 'all' ? `${copy.filters.business}: ${filters.business}` : '',
                  filters.search ? `${copy.filters.search}: ${filters.search}` : '',
                ].filter(Boolean).join(' · '),
                installments: sortedInstallments,
                locale,
              })}
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-5 text-sm font-bold text-[#147514] shadow-sm hover:bg-[#147514]/5 hover:text-[#147514] disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            >
              <Printer className="h-4 w-4" />
              Imprimir antigüedad
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowColumnsModal(true)}
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-5 text-sm font-bold text-[#147514] shadow-sm hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
            >
              <Columns3 className="h-4 w-4" />
              {viewCopy.columnsAction}
            </Button>
          </>
        )}
      />
      <ReceivablesFilters
        copy={copy}
        filters={filters}
        statusOptions={[
          { value: 'on_time', label: copy.status.on_time },
          { value: 'due_soon', label: copy.status.due_soon },
          { value: 'overdue', label: copy.status.overdue },
          { value: 'partial', label: copy.status.partial },
          { value: 'paid', label: copy.status.paid },
        ]}
        unitOptions={getOptionsFromRows(installments, (installment) => installment.unit)}
        businessOptions={getOptionsFromRows(installments, (installment) => installment.business)}
        onChange={setFilters}
      />
      <AccountsReceivableKpiArea
        copy={copy}
        installments={filteredInstallments}
        totalInstallments={installments.length}
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
              <SortableReceivablesHead<AccountsReceivableColumnId>
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
            {pagination.paginatedRows.map((installment) => (
              <TableRow key={installment.id} className="border-slate-100 dark:border-slate-800">
                {visibleColumns.map((column) => {
                  const columnId = column.id as AccountsReceivableColumnId;

                  return (
                    <TableCell
                      key={`${installment.id}-${column.id}`}
                      className={cn(
                        'px-5 py-4 font-semibold text-slate-600 dark:text-slate-300',
                        columnId === 'sale' && 'font-black text-slate-950 dark:text-white',
                        columnId === 'customer' && 'text-slate-700 dark:text-slate-200',
                        columnId === 'installment' && 'font-bold text-slate-700 dark:text-slate-200',
                        columnId === 'amount' && 'font-bold text-slate-700 dark:text-slate-200',
                        columnId === 'paid' && 'font-bold text-slate-700 dark:text-slate-200',
                        columnId === 'balance' && cn('font-black', financeTextClass),
                      )}
                    >
                      {renderCell(installment, columnId)}
                    </TableCell>
                  );
                })}
                <TableCell className="px-5 py-4">
                  <div className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.payment}
                      aria-label={viewCopy.rowActions.payment}
                      disabled={installment.balance <= 0}
                      onClick={() => setPaymentInstallment(installment)}
                      className="h-10 w-10 rounded-xl border border-emerald-100 bg-emerald-50 text-[#147514] hover:bg-emerald-100 hover:text-[#0F5F10] disabled:opacity-45 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    >
                      <Banknote className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.files}
                      aria-label={viewCopy.rowActions.files}
                      onClick={() => setFilesInstallment(installment)}
                      className="h-10 w-10 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                    >
                      <FolderOpen className="h-4 w-4" />
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
        onSave={(nextColumns) => setColumns(normalizeReceivablesColumns(nextColumns, defaultColumns))}
      />

      {paymentInstallment ? (
        <PaymentModal
          accounts={accounts}
          copy={copy}
          initialAmount={paymentInstallment.balance}
          initialReceivableId={paymentInstallment.receivableId}
          onClose={() => setPaymentInstallment(null)}
          onSubmit={onRegisterPayment}
        />
      ) : null}
      {filesInstallment ? (
        <ReceivableFilesModal
          copy={copy}
          payments={filesPayments}
          onClose={() => setFilesInstallment(null)}
        />
      ) : null}
    </>
  );
}
