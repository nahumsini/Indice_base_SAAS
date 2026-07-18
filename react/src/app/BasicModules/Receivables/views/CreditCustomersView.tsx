import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Columns3, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { IndiceModalValidation } from '../../../components/indice-modal';
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
import { CreditCustomersKpiArea } from '../components/ReceivablesKpiAreas';
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
import { CreditPolicyModal } from '../components/modals/CreditPolicyModal';
import { ReceivablesModalFrame } from '../components/modals/ReceivablesModalFrame';
import {
  financeAccentButtonClass,
  financeTextClass,
  initialFilters,
  moduleModalOutlineButtonClassName,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';
import type { CandidateCreditCustomer, CreditPolicy, ReceivableAccount, ReceivableInstallment, ReceivablePayment } from '../types';
import {
  formatMoney,
  formatPercent,
  getOptionsFromRows,
  textMatch,
} from '../utils';
import { useReceivablesResolvedLocale } from '../hooks/useReceivablesTranslations';
import { printCreditCustomerStatement } from '../utils/receivablesPrintDocuments';

type CreditCustomersColumnId =
  | 'customer'
  | 'status'
  | 'unit'
  | 'business'
  | 'line'
  | 'available'
  | 'monthlyLimit'
  | 'term'
  | 'annualInterest';

const creditCustomersColumnsStorageKey = 'indice.receivables.creditCustomers.columns.v1';

function getCreditCustomerSortValue(policy: CreditPolicy, columnId: CreditCustomersColumnId) {
  if (columnId === 'customer') {
    return policy.customerName;
  }
  if (columnId === 'status') {
    return policy.status;
  }
  if (columnId === 'unit') {
    return policy.unit;
  }
  if (columnId === 'business') {
    return policy.business;
  }
  if (columnId === 'line') {
    return policy.creditLine;
  }
  if (columnId === 'available') {
    return policy.availableCredit;
  }
  if (columnId === 'monthlyLimit') {
    return policy.monthlyPurchaseLimit;
  }
  if (columnId === 'term') {
    return policy.defaultTermMonths;
  }

  return policy.annualInterestRate;
}

interface CreditCustomersViewProps {
  accounts: ReceivableAccount[];
  candidateCustomers: CandidateCreditCustomer[];
  copy: ReceivablesTranslations;
  creditPolicies: CreditPolicy[];
  installments: ReceivableInstallment[];
  onCreatePolicy: (policy: Omit<CreditPolicy, 'id' | 'availableCredit'>) => boolean | void | Promise<boolean | void>;
  onDeletePolicy: (policyId: string) => boolean | void | Promise<boolean | void>;
  onUpdatePolicy: (policyId: string, policy: Omit<CreditPolicy, 'id' | 'availableCredit'>) => boolean | void | Promise<boolean | void>;
  payments: ReceivablePayment[];
}

export function CreditCustomersView({
  accounts,
  candidateCustomers,
  copy,
  creditPolicies,
  installments,
  onCreatePolicy,
  onDeletePolicy,
  onUpdatePolicy,
  payments,
}: CreditCustomersViewProps) {
  const locale = useReceivablesResolvedLocale();
  const viewCopy = copy.views.creditCustomers;
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'customer', label: viewCopy.table.customer, visible: true, locked: true },
    { id: 'status', label: viewCopy.table.status, visible: true },
    { id: 'unit', label: viewCopy.table.unit, visible: true },
    { id: 'business', label: viewCopy.table.business, visible: true },
    { id: 'line', label: viewCopy.table.line, visible: true },
    { id: 'available', label: viewCopy.table.available, visible: true },
    { id: 'monthlyLimit', label: viewCopy.table.monthlyLimit, visible: true },
    { id: 'term', label: viewCopy.table.term, visible: true },
    { id: 'annualInterest', label: viewCopy.table.annualInterest, visible: true },
  ], [viewCopy.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: viewCopy.table.actions, visible: true, locked: true },
  ], [viewCopy.table.actions]);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => readReceivablesColumns(creditCustomersColumnsStorageKey, defaultColumns));
  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const [filters, setFilters] = useState(initialFilters);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CreditPolicy | null>(null);
  const [deletePolicyCandidate, setDeletePolicyCandidate] = useState<CreditPolicy | null>(null);
  const [isDeletingPolicy, setIsDeletingPolicy] = useState(false);
  const [deletePolicyError, setDeletePolicyError] = useState('');
  const [sortState, setSortState] = useState<ReceivablesSortState<CreditCustomersColumnId>>({
    columnId: 'customer',
    direction: 'asc',
  });

  useEffect(() => {
    setColumns((currentColumns) => normalizeReceivablesColumns(currentColumns, defaultColumns));
  }, [defaultColumns]);

  useEffect(() => {
    persistReceivablesColumns(creditCustomersColumnsStorageKey, columns);
  }, [columns]);

  const filteredPolicies = useMemo(() => {
    const query = filters.search.trim();

    return creditPolicies.filter((policy) => (
      (!query || textMatch(`${policy.customerName} ${policy.notes}`, query))
      && (filters.status === 'all' || policy.status === filters.status)
      && (filters.unit === 'all' || policy.unit === filters.unit)
      && (filters.business === 'all' || policy.business === filters.business)
    ));
  }, [creditPolicies, filters]);
  const sortedPolicies = useMemo(
    () => sortReceivablesRows(filteredPolicies, sortState, getCreditCustomerSortValue),
    [filteredPolicies, sortState],
  );
  const pagination = useTablePagination({
    resetKey: JSON.stringify(filters),
    rows: sortedPolicies,
  });
  const handleSort = (columnId: CreditCustomersColumnId) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };
  const renderCell = (policy: CreditPolicy, columnId: CreditCustomersColumnId) => {
    if (columnId === 'customer') {
      return policy.customerName;
    }
    if (columnId === 'status') {
      return (
        <Badge
          variant="outline"
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-bold',
            policy.status === 'active' ? 'border-[#147514]/20 bg-[#147514]/10 text-[#147514]' : '',
            policy.status === 'review' ? 'border-amber-200 bg-amber-50 text-amber-700' : '',
            policy.status === 'blocked' ? 'border-red-200 bg-red-50 text-red-700' : '',
          )}
        >
          {copy.creditCustomerStatus[policy.status]}
        </Badge>
      );
    }
    if (columnId === 'unit') {
      return policy.unit;
    }
    if (columnId === 'business') {
      return policy.business;
    }
    if (columnId === 'line') {
      return formatMoney(policy.creditLine);
    }
    if (columnId === 'available') {
      return formatMoney(policy.availableCredit);
    }
    if (columnId === 'monthlyLimit') {
      return formatMoney(policy.monthlyPurchaseLimit);
    }
    if (columnId === 'term') {
      return `${policy.defaultTermMonths} meses`;
    }

    return formatPercent(policy.annualInterestRate);
  };
  const deletePolicy = (policy: CreditPolicy) => {
    setDeletePolicyError('');
    setDeletePolicyCandidate(policy);
  };

  return (
    <>
      <ReceivablesTitleBar
        icon={<span className="text-3xl leading-none">👥</span>}
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
              onClick={() => setShowPolicyModal(true)}
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
          { value: 'active', label: copy.creditCustomerStatus.active },
          { value: 'review', label: copy.creditCustomerStatus.review },
          { value: 'blocked', label: copy.creditCustomerStatus.blocked },
        ]}
        unitOptions={getOptionsFromRows(creditPolicies, (policy) => policy.unit)}
        businessOptions={getOptionsFromRows(creditPolicies, (policy) => policy.business)}
        onChange={setFilters}
      />
      <CreditCustomersKpiArea
        copy={copy}
        creditPolicies={filteredPolicies}
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
              <SortableReceivablesHead<CreditCustomersColumnId>
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
            {pagination.paginatedRows.map((policy) => (
              <TableRow key={policy.id} className="border-slate-100 dark:border-slate-800">
                {visibleColumns.map((column) => {
                  const columnId = column.id as CreditCustomersColumnId;

                  return (
                    <TableCell
                      key={`${policy.id}-${column.id}`}
                      className={cn(
                        'px-5 py-4 font-semibold text-slate-600 dark:text-slate-300',
                        columnId === 'customer' && 'font-black text-slate-950 dark:text-white',
                        columnId === 'line' && 'font-bold text-slate-700 dark:text-slate-200',
                        columnId === 'available' && cn('font-black', financeTextClass),
                        columnId === 'monthlyLimit' && 'font-bold text-slate-700 dark:text-slate-200',
                      )}
                    >
                      {renderCell(policy, columnId)}
                    </TableCell>
                  );
                })}
                <TableCell className="px-5 py-4">
                  <div className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Imprimir estado de cuenta / Print statement"
                      aria-label="Imprimir estado de cuenta / Print statement"
                      onClick={() => printCreditCustomerStatement({ accounts, copy, installments, locale, payments, policy })}
                      className="h-10 w-10 rounded-xl border border-emerald-100 bg-emerald-50 text-[#147514] hover:bg-emerald-100 hover:text-[#0F5F10] dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.edit}
                      aria-label={viewCopy.rowActions.edit}
                      onClick={() => setEditingPolicy(policy)}
                      className="h-10 w-10 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={viewCopy.rowActions.delete}
                      aria-label={viewCopy.rowActions.delete}
                      onClick={() => deletePolicy(policy)}
                      className="h-10 w-10 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                    >
                      <Trash2 className="h-4 w-4" />
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

      {showPolicyModal ? (
        <CreditPolicyModal
          candidateCustomers={candidateCustomers}
          copy={copy}
          onClose={() => setShowPolicyModal(false)}
          onSubmit={onCreatePolicy}
        />
      ) : null}
      {editingPolicy ? (
        <CreditPolicyModal
          candidateCustomers={candidateCustomers}
          copy={copy}
          initialPolicy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSubmit={(policy) => onUpdatePolicy(editingPolicy.id, policy)}
        />
      ) : null}
      {deletePolicyCandidate ? (
        <ReceivablesModalFrame
          busy={isDeletingPolicy}
          closeLabel={copy.common.close}
          description={copy.modals.creditPolicy.deleteDescription(deletePolicyCandidate.customerName)}
          icon={<AlertTriangle className="h-5 w-5" />}
          modalType="confirmation"
          onClose={() => {
            setDeletePolicyCandidate(null);
            setDeletePolicyError('');
          }}
          title={copy.modals.creditPolicy.deleteTitle}
          footer={(
            <>
              <Button
                type="button"
                variant="outline"
                className={moduleModalOutlineButtonClassName}
                onClick={() => setDeletePolicyCandidate(null)}
                disabled={isDeletingPolicy}
              >
                {copy.common.cancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-modal-destructive="true"
                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-sm hover:bg-red-700"
                disabled={isDeletingPolicy}
                onClick={() => {
                  if (isDeletingPolicy) return;
                  setIsDeletingPolicy(true);
                  setDeletePolicyError('');
                  void Promise.resolve(onDeletePolicy(deletePolicyCandidate.id))
                    .then((result) => {
                      if (result === false) {
                        setDeletePolicyError(copy.errors.createCreditPolicy);
                        return;
                      }
                      setDeletePolicyCandidate(null);
                    })
                    .catch((error: unknown) => {
                      setDeletePolicyError(error instanceof Error && error.message ? error.message : copy.errors.createCreditPolicy);
                    })
                    .finally(() => setIsDeletingPolicy(false));
                }}
              >
                {copy.modals.creditPolicy.deleteAction}
              </Button>
            </>
          )}
        >
          <div className="space-y-4">
            <IndiceModalValidation messages={deletePolicyError ? [deletePolicyError] : []} />
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {copy.modals.creditPolicy.deleteConfirm(deletePolicyCandidate.customerName)}
            </div>
          </div>
        </ReceivablesModalFrame>
      ) : null}
    </>
  );
}
