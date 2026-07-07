import { useEffect, useMemo, useState } from 'react';
import { Columns3, FileCheck2, FileWarning, FolderOpen, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
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
import { PaymentsKpiArea } from '../components/ReceivablesKpiAreas';
import { ReceivablesFilters } from '../components/ReceivablesFilters';
import {
  normalizeReceivablesColumns,
  persistReceivablesColumns,
  readReceivablesColumns,
  SortableReceivablesHead,
  sortReceivablesRows,
  type ReceivablesSortState,
} from '../components/ReceivablesSortableTable';
import { ReceivablesTableShell } from '../components/ReceivablesTableShell';
import { ReceivablesTitleBar } from '../components/ReceivablesTitleBar';
import { PaymentModal } from '../components/modals/PaymentModal';
import { ReceivableFilesModal } from '../components/modals/ReceivableFilesModal';
import {
  financeAccentButtonClass,
  financeTextClass,
  initialFilters,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';
import type { ReceivableAccount, ReceivablePayment } from '../types';
import {
  formatMoney,
  matchesPeriod,
  textMatch,
} from '../utils';

type PaymentsColumnId =
  | 'date'
  | 'sale'
  | 'customer'
  | 'method'
  | 'amount'
  | 'reference'
  | 'registeredBy'
  | 'files';

const paymentsColumnsStorageKey = 'indice.receivables.payments.columns.v1';

function hasPaymentReceipt(payment: ReceivablePayment) {
  return Boolean(payment.receiptFileName || payment.receiptDataUrl || payment.receiptImageDataUrl);
}

function getPaymentSortValue(payment: ReceivablePayment, columnId: PaymentsColumnId) {
  if (columnId === 'date') {
    return payment.paymentDate;
  }
  if (columnId === 'sale') {
    return payment.saleNumber;
  }
  if (columnId === 'customer') {
    return payment.customerName;
  }
  if (columnId === 'method') {
    return payment.method;
  }
  if (columnId === 'amount') {
    return payment.amount;
  }
  if (columnId === 'reference') {
    return payment.reference;
  }
  if (columnId === 'registeredBy') {
    return payment.registeredBy;
  }

  return hasPaymentReceipt(payment) ? 1 : 0;
}

interface PaymentsViewProps {
  accounts: ReceivableAccount[];
  allAccounts: ReceivableAccount[];
  copy: ReceivablesTranslations;
  payments: ReceivablePayment[];
  onRegisterPayment: (payment: Omit<ReceivablePayment, 'id'>) => void | Promise<void>;
}

export function PaymentsView({
  accounts,
  allAccounts,
  copy,
  payments,
  onRegisterPayment,
}: PaymentsViewProps) {
  const viewCopy = copy.views.payments;
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'date', label: viewCopy.table.date, visible: true, locked: true },
    { id: 'sale', label: viewCopy.table.sale, visible: true },
    { id: 'customer', label: viewCopy.table.customer, visible: true },
    { id: 'method', label: viewCopy.table.method, visible: true },
    { id: 'amount', label: viewCopy.table.amount, visible: true },
    { id: 'reference', label: viewCopy.table.reference, visible: true },
    { id: 'registeredBy', label: viewCopy.table.registeredBy, visible: true },
    { id: 'files', label: viewCopy.table.files, visible: true },
  ], [viewCopy.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: viewCopy.table.actions, visible: true, locked: true },
  ], [viewCopy.table.actions]);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => readReceivablesColumns(paymentsColumnsStorageKey, defaultColumns));
  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const [filters, setFilters] = useState({ ...initialFilters, status: 'all' });
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filesPayment, setFilesPayment] = useState<ReceivablePayment | null>(null);
  const [sortState, setSortState] = useState<ReceivablesSortState<PaymentsColumnId>>({
    columnId: 'date',
    direction: 'desc',
  });
  const accountCurrencyById = useMemo(
    () => new Map(allAccounts.map((account) => [account.id, account.currency])),
    [allAccounts],
  );

  useEffect(() => {
    setColumns((currentColumns) => normalizeReceivablesColumns(currentColumns, defaultColumns));
  }, [defaultColumns]);

  useEffect(() => {
    persistReceivablesColumns(paymentsColumnsStorageKey, columns);
  }, [columns]);

  const filteredPayments = useMemo(() => {
    const query = filters.search.trim();

    return payments.filter((payment) => (
      (!query || textMatch(`${payment.saleNumber} ${payment.customerName} ${payment.reference}`, query))
      && matchesPeriod(payment.paymentDate, filters.period)
    ));
  }, [filters, payments]);
  const sortedPayments = useMemo(
    () => sortReceivablesRows(filteredPayments, sortState, getPaymentSortValue),
    [filteredPayments, sortState],
  );
  const pagination = useTablePagination({
    resetKey: JSON.stringify(filters),
    rows: sortedPayments,
  });
  const handleSort = (columnId: PaymentsColumnId) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };
  const renderCell = (payment: ReceivablePayment, columnId: PaymentsColumnId) => {
    if (columnId === 'date') {
      return payment.paymentDate;
    }
    if (columnId === 'sale') {
      return payment.saleNumber;
    }
    if (columnId === 'customer') {
      return payment.customerName;
    }
    if (columnId === 'method') {
      return copy.paymentMethods[payment.method];
    }
    if (columnId === 'amount') {
      return formatMoney(payment.amount, payment.currency ?? accountCurrencyById.get(payment.receivableId));
    }
    if (columnId === 'reference') {
      return payment.reference;
    }
    if (columnId === 'registeredBy') {
      return payment.registeredBy;
    }

    return hasPaymentReceipt(payment) ? (
      <Badge variant="outline" className="rounded-full border-[#147514]/20 bg-[#147514]/10 px-3 py-1 text-xs font-bold text-[#147514]">
        <FileCheck2 className="mr-1 h-3.5 w-3.5" />
        {viewCopy.table.files}
      </Badge>
    ) : (
      <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        <FileWarning className="mr-1 h-3.5 w-3.5" />
        {copy.modals.files.missing}
      </Badge>
    );
  };

  return (
    <>
      <ReceivablesTitleBar
        icon={<span className="text-3xl leading-none">💸</span>}
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
              onClick={() => setShowPaymentModal(true)}
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
        statusOptions={[]}
        unitOptions={[]}
        businessOptions={[]}
        onChange={setFilters}
      />
      <PaymentsKpiArea
        accounts={allAccounts}
        copy={copy}
        payments={filteredPayments}
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
              <SortableReceivablesHead<PaymentsColumnId>
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
            {pagination.paginatedRows.map((payment) => (
              <TableRow key={payment.id} className="border-slate-100 dark:border-slate-800">
                {visibleColumns.map((column) => {
                  const columnId = column.id as PaymentsColumnId;

                  return (
                    <TableCell
                      key={`${payment.id}-${column.id}`}
                      className={cn(
                        'px-5 py-4 font-semibold text-slate-600 dark:text-slate-300',
                        columnId === 'sale' && 'font-black text-slate-950 dark:text-white',
                        columnId === 'customer' && 'text-slate-700 dark:text-slate-200',
                        columnId === 'amount' && cn('font-black', financeTextClass),
                      )}
                    >
                      {renderCell(payment, columnId)}
                    </TableCell>
                  );
                })}
                <TableCell className="px-5 py-4">
                  <div className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.files}
                      aria-label={viewCopy.rowActions.files}
                      onClick={() => setFilesPayment(payment)}
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

      {showPaymentModal ? (
        <PaymentModal
          accounts={accounts}
          copy={copy}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={(payment) => {
            void onRegisterPayment(payment);
            setShowPaymentModal(false);
          }}
        />
      ) : null}
      {filesPayment ? (
        <ReceivableFilesModal
          copy={copy}
          payments={[filesPayment]}
          onClose={() => setFilesPayment(null)}
        />
      ) : null}
    </>
  );
}
