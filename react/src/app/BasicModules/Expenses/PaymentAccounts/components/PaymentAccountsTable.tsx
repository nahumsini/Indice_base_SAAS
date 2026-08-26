import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Edit2, ExternalLink, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { usePaymentAccountsResolvedLocale, usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';
import type { FinanceTranslations } from '../../translations';
import type { PaymentAccount, PaymentSortField, SortDirection } from '../types';
import { formatPaymentCurrency, formatPaymentDate, getTypeBadgeColor, getTypeIcon, getTypeLabel } from '../paymentAccounts.utils';
import { defaultPaymentColumnWidths, type PaymentColumnConfig, type PaymentColumnKey } from '../paymentAccountsTableConfig';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import {
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../../hooks/useTablePagination';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';

const minimumPaymentColumnWidths: Record<PaymentColumnKey, number> = {
  name: 190,
  type: 130,
  unitId: 150,
  businessId: 150,
  bank: 150,
  accountNumber: 150,
  balance: 140,
  currency: 110,
  lastTransaction: 160,
  isActive: 120,
};

const defaultPaymentOperationalColumnWidths: Record<PaymentColumnKey, number> = {
  name: defaultPaymentColumnWidths.name,
  type: defaultPaymentColumnWidths.type,
  unitId: defaultPaymentColumnWidths.unitId,
  businessId: defaultPaymentColumnWidths.businessId,
  bank: defaultPaymentColumnWidths.bank,
  accountNumber: defaultPaymentColumnWidths.accountNumber,
  balance: defaultPaymentColumnWidths.balance,
  currency: defaultPaymentColumnWidths.currency,
  lastTransaction: defaultPaymentColumnWidths.lastTransaction,
  isActive: defaultPaymentColumnWidths.isActive,
};

const paymentActionsColumnWidth = 198;

type PaymentAccountsTableProps = {
  accounts: PaymentAccount[];
  businessOptions: FinanceReferenceOption[];
  columns: PaymentColumnConfig[];
  sortDirection: SortDirection;
  sortField: PaymentSortField | null;
  unitOptions: FinanceReferenceOption[];
  tone?: 'green' | 'coral';
  onDelete: (accountId: string) => void;
  onEdit: (account: PaymentAccount) => void;
  onNavigate?: (page?: string) => void;
  onSort: (field: PaymentSortField) => void;
  onToggleActive: (account: PaymentAccount) => void;
};

type PaymentAccountsTableWorkspaceState = {
  currentPage: number;
  pageSize: number;
};

const paymentAccountsTableWorkspaceDefaults: PaymentAccountsTableWorkspaceState = {
  currentPage: 1,
  pageSize: 10,
};

const paymentAccountsTableWorkspaceUrlFields: Partial<Record<keyof PaymentAccountsTableWorkspaceState, string>> = {
  currentPage: 'pa_page',
  pageSize: 'pa_rows',
};

export function PaymentAccountsTable({
  accounts,
  businessOptions,
  columns,
  onDelete,
  onEdit,
  onNavigate,
  onSort,
  onToggleActive,
  sortDirection,
  sortField,
  tone = 'green',
  unitOptions,
}: PaymentAccountsTableProps) {
  const t = usePaymentAccountsTranslations();
  const locale = usePaymentAccountsResolvedLocale();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const workspaceState = useMemo<PaymentAccountsTableWorkspaceState>(() => ({
    currentPage,
    pageSize,
  }), [currentPage, pageSize]);
  const restoreWorkspaceState = useCallback((restoredState: PaymentAccountsTableWorkspaceState) => {
    setCurrentPage(restoredState.currentPage);
    setPageSize(restoredState.pageSize);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'payment_accounts_table',
    state: workspaceState,
    defaults: paymentAccountsTableWorkspaceDefaults,
    urlFields: paymentAccountsTableWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
    rememberScroll: false,
  });
  const tableColumns = useMemo(() => columns.filter(column => column.visible), [columns]);
  const paymentHeaderLabels = useMemo<Partial<Record<PaymentColumnKey, string>>>(() => (
    Object.fromEntries(columns.map((column) => [column.key, column.label]))
  ), [columns]);
  const sortablePaymentColumnIds = useMemo(() => columns.map((column) => column.key), [columns]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<PaymentColumnKey>({
    defaults: defaultPaymentOperationalColumnWidths,
    headerLabels: paymentHeaderLabels,
    minWidths: minimumPaymentColumnWidths,
    sortableColumnIds: sortablePaymentColumnIds,
    storageKey: 'sales-payment-accounts-column-widths-v2',
  });
  const totalPages = Math.max(1, Math.ceil(accounts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedAccounts = accounts.slice(pageStartIndex, pageEndIndex);
  const paginationStart = accounts.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = accounts.length === 0 ? 0 : Math.min(pageEndIndex, accounts.length);

  useEffect(() => {
    if (accounts.length === 0) return;
    setCurrentPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [accounts.length, totalPages]);

  const tableMinimumWidth = tableColumns.reduce(
    (total, column) => total + columnWidths[column.key],
    paymentActionsColumnWidth,
  );
  const headerColumns: Array<IndiceTableColumnDefinition<PaymentColumnKey>> = tableColumns.map((column) => ({
    id: column.key,
    label: column.label,
    width: columnWidths[column.key],
    defaultWidth: defaultPaymentColumnWidths[column.key],
    contentMinimumWidth: minimumPaymentColumnWidths[column.key],
    alignment: column.key === 'balance' ? 'right' : column.key === 'isActive' ? 'center' : 'left',
    sortable: true,
    resizeLabel: `${column.label}: ajustar ancho`,
  }));
  const sortFieldByColumn = Object.fromEntries(
    tableColumns.map((column) => [column.key, column.sortField]),
  ) as Record<PaymentColumnKey, PaymentSortField>;

  return (
    <IndiceTableShell
      pagination={(
        <DataTablePagination
          currentPage={safeCurrentPage}
          labels={{
            next: t.common.next,
            page: (current, total) => `${current} / ${total}`,
            previous: t.common.previous,
            rowsPerPage: t.common.rowsPerPage,
            showing: (start, end, total) => t.common.showing(start, end, total),
          }}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          pageEnd={paginationEnd}
          pageSize={pageSize}
          pageSizeOptions={DEFAULT_TABLE_PAGE_SIZE_OPTIONS}
          pageStart={paginationStart}
          totalCount={accounts.length}
          totalPages={totalPages}
        />
      )}
    >
      <IndiceOperationalTable minimumWidth={tableMinimumWidth}>
          <IndiceTableColGroup columns={headerColumns} actionsWidth={paymentActionsColumnWidth} />
          <IndiceTableHeaderRow
            actions={{ label: t.common.actions, width: paymentActionsColumnWidth }}
            columns={headerColumns}
            onResize={resizeColumn}
            onSort={(columnId) => onSort(sortFieldByColumn[columnId])}
            sortState={sortField && sortDirection
              ? {
                columnId: tableColumns.find((column) => column.sortField === sortField)?.key ?? tableColumns[0]?.key ?? 'name',
                direction: sortDirection,
              }
              : null}
          />
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedAccounts.length === 0 ? <EmptyRow colSpan={tableColumns.length + 1} t={t} /> : paginatedAccounts.map(account => (
              <PaymentAccountRow
                key={account.id}
                account={account}
                businessOptions={businessOptions}
                locale={locale}
                columnWidths={columnWidths}
                tableColumns={tableColumns.map(column => column.key)}
                tone={tone}
                t={t}
                unitOptions={unitOptions}
                onDelete={onDelete}
                onEdit={onEdit}
                onNavigate={onNavigate}
                onToggleActive={onToggleActive}
              />
            ))}
          </tbody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}

function PaymentAccountRow({
  account,
  businessOptions,
  columnWidths,
  locale,
  onDelete,
  onEdit,
  onNavigate,
  onToggleActive,
  tableColumns,
  tone,
  t,
  unitOptions,
}: {
  account: PaymentAccount;
  businessOptions: FinanceReferenceOption[];
  columnWidths: Record<PaymentColumnKey, number>;
  locale: ReturnType<typeof usePaymentAccountsResolvedLocale>;
  tableColumns: PaymentColumnKey[];
  tone: 'green' | 'coral';
  t: FinanceTranslations;
  unitOptions: FinanceReferenceOption[];
  onDelete: (accountId: string) => void;
  onEdit: (account: PaymentAccount) => void;
  onNavigate?: (page?: string) => void;
  onToggleActive: (account: PaymentAccount) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
      {tableColumns.map(columnKey => (
        <td key={columnKey} className={`px-5 py-4 align-middle text-sm font-normal text-slate-700 dark:text-slate-300 ${columnKey === 'balance' ? 'text-right tabular-nums' : columnKey === 'isActive' ? 'text-center' : 'text-left'}`} style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey] }}>
          {renderPaymentCell(columnKey, account, unitOptions, businessOptions, t, locale, tone)}
        </td>
      ))}
      <td className="px-4 py-4 text-right align-middle" style={{ width: paymentActionsColumnWidth, minWidth: paymentActionsColumnWidth }}>
        {account.source === 'petty_cash' ? (
          <IndiceTableActionGroup>
            <button type="button" onClick={() => onNavigate?.('petty-cash')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#147514]/20 bg-[#147514]/5 px-3 text-sm font-medium text-[#147514] transition hover:bg-[#147514]/12" title={t.paymentAccounts.table.openPettyCash}>
              <ExternalLink className="h-4 w-4" />
              {t.paymentAccounts.table.open}
            </button>
          </IndiceTableActionGroup>
        ) : (
          <IndiceTableActionGroup>
            <ActionButton title={t.common.edit} onClick={() => onEdit(account)}><Edit2 className="h-4 w-4" /></ActionButton>
            <button type="button" onClick={() => onToggleActive(account)} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${account.isActive ? 'border-[#147514]/25 bg-[#147514]/12 text-[#147514] hover:bg-[#147514]/18 dark:border-[#147514]/35 dark:bg-[#147514]/15' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-[#147514]/20 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900'}`} title={account.isActive ? t.paymentAccounts.table.deactivate : t.paymentAccounts.table.activate}>
              {account.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => onDelete(account.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30" title={t.common.delete}>
              <Trash2 className="h-4 w-4" />
            </button>
          </IndiceTableActionGroup>
        )}
      </td>
    </tr>
  );
}

function renderPaymentCell(
  columnKey: PaymentColumnKey,
  account: PaymentAccount,
  unitOptions: FinanceReferenceOption[],
  businessOptions: FinanceReferenceOption[],
  t: FinanceTranslations,
  locale: ReturnType<typeof usePaymentAccountsResolvedLocale>,
  tone: 'green' | 'coral',
) {
  if (columnKey === 'name') return <NameCell account={account} t={t} tone={tone} />;
  if (columnKey === 'type') return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getTypeBadgeColor(account.type)}`}>{t.paymentAccounts.types[account.type] ?? getTypeLabel(account.type)}</span>;
  if (columnKey === 'unitId') return <ReferencePill value={getReferenceLabel(unitOptions, account.unitId)} />;
  if (columnKey === 'businessId') return <ReferencePill value={getReferenceLabel(businessOptions, account.businessId)} />;
  if (columnKey === 'bank') return account.source === 'petty_cash' ? <ReferencePill value={account.custodian ?? '-'} /> : <span>{account.bank || '-'}</span>;
  if (columnKey === 'accountNumber') return <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{account.accountNumber || '-'}</span>;
  if (columnKey === 'balance') return <span className="font-medium text-slate-900 dark:text-slate-100">{formatPaymentCurrency(account.balance, account.currency, locale)}</span>;
  if (columnKey === 'currency') return <ReferencePill value={account.currency} />;
  if (columnKey === 'lastTransaction') return <span>{account.lastTransaction ? formatPaymentDate(account.lastTransaction, locale) : '-'}</span>;
  return <StatusBadge isActive={account.isActive} t={t} />;
}

function NameCell({ account, t, tone }: { account: PaymentAccount; t: FinanceTranslations; tone: 'green' | 'coral' }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 ${tone === 'coral' ? 'text-[#E8564B]' : 'text-[#147514]'}`}>{getTypeIcon(account.type)}</span>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{account.name}</p>
        {account.source === 'petty_cash' ? <p className="mt-1 text-xs font-medium text-[#147514]">{t.paymentAccounts.table.pettyCashDetail(account.custodian ?? t.paymentAccounts.table.noCustodian)}</p> : null}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, title }: { children: ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400" title={title}>
      {children}
    </button>
  );
}

function ReferencePill({ value }: { value: string }) {
  return <span className="inline-flex max-w-[150px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><span className="truncate">{value}</span></span>;
}

function StatusBadge({ isActive, t }: { isActive: boolean; t: FinanceTranslations }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>{isActive ? t.common.active : t.common.inactive}</span>;
}

function getReferenceLabel(options: FinanceReferenceOption[], value?: string) {
  if (!value) return '-';
  return options.find(option => option.value === value)?.label ?? value;
}

function EmptyRow({ colSpan, t }: { colSpan: number; t: FinanceTranslations }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <Search className="mb-4 h-12 w-12 opacity-50" />
          <p className="text-lg font-medium">{t.paymentAccounts.table.emptyTitle}</p>
          <p className="text-sm">{t.paymentAccounts.table.emptyDescription}</p>
        </div>
      </td>
    </tr>
  );
}
