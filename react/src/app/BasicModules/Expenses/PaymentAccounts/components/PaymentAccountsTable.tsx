import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Edit2, ExternalLink, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { usePaymentAccountsResolvedLocale, usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';
import type { FinanceTranslations } from '../../translations';
import type { PaymentAccount, PaymentSortField, SortDirection } from '../types';
import { formatPaymentCurrency, formatPaymentDate, getTypeBadgeColor, getTypeIcon, getTypeLabel } from '../paymentAccounts.utils';
import { defaultPaymentColumnWidths, type PaymentColumnConfig, type PaymentColumnKey } from '../paymentAccountsTableConfig';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../../hooks/useTablePagination';

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
  const tableColumns = useMemo(() => columns.filter(column => column.visible), [columns]);
  const totalPages = Math.max(1, Math.ceil(accounts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedAccounts = accounts.slice(pageStartIndex, pageEndIndex);
  const paginationStart = accounts.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = accounts.length === 0 ? 0 : Math.min(pageEndIndex, accounts.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [accounts, pageSize, tableColumns]);

  const getSortIcon = (field: PaymentSortField) => (
    <PaymentSortIcon active={sortField === field} direction={sortField === field ? sortDirection : null} tone={tone} />
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-[1160px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {tableColumns.map(header => (
                <SortableHeader key={header.key} field={header.sortField} label={header.label} width={defaultPaymentColumnWidths[header.key]} sortIcon={getSortIcon(header.sortField)} onSort={onSort} />
              ))}
              <th className="px-5 py-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400" style={{ width: defaultPaymentColumnWidths.actions, minWidth: defaultPaymentColumnWidths.actions }}>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedAccounts.length === 0 ? <EmptyRow colSpan={tableColumns.length + 1} t={t} /> : paginatedAccounts.map(account => (
              <PaymentAccountRow
                key={account.id}
                account={account}
                businessOptions={businessOptions}
                locale={locale}
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
        </table>
      </div>
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
    </div>
  );
}

function PaymentAccountRow({
  account,
  businessOptions,
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
        <td key={columnKey} className="px-6 py-4 align-middle text-sm text-slate-700 dark:text-slate-300" style={{ width: defaultPaymentColumnWidths[columnKey], minWidth: defaultPaymentColumnWidths[columnKey] }}>
          {renderPaymentCell(columnKey, account, unitOptions, businessOptions, t, locale, tone)}
        </td>
      ))}
      <td className="px-6 py-4 text-center align-middle" style={{ width: defaultPaymentColumnWidths.actions, minWidth: defaultPaymentColumnWidths.actions }}>
        {account.source === 'petty_cash' ? (
          <div className="mx-auto inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => onNavigate?.('petty-cash')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 text-sm font-medium text-[#147514] transition hover:-translate-y-0.5 hover:bg-[#147514]/12 hover:shadow-sm" title={t.paymentAccounts.table.openPettyCash}>
              <ExternalLink className="h-4 w-4" />
              {t.paymentAccounts.table.open}
            </button>
          </div>
        ) : (
          <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <ActionButton title={t.common.edit} onClick={() => onEdit(account)}><Edit2 className="h-4 w-4" /></ActionButton>
            <button type="button" onClick={() => onToggleActive(account)} className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-sm ${account.isActive ? 'border-[#147514]/25 bg-[#147514]/12 text-[#147514] hover:bg-[#147514]/18 dark:border-[#147514]/35 dark:bg-[#147514]/15' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-[#147514]/20 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900'}`} title={account.isActive ? t.paymentAccounts.table.deactivate : t.paymentAccounts.table.activate}>
              {account.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => onDelete(account.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30" title={t.common.delete}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
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
    <button type="button" onClick={onClick} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400" title={title}>
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

function SortableHeader({ field, label, onSort, sortIcon, width }: { field: PaymentSortField; label: string; onSort: (field: PaymentSortField) => void; sortIcon: ReactNode; width: number }) {
  return (
    <th className="px-5 py-4 text-left align-middle" style={{ width, minWidth: width }}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><span>{label}</span>{sortIcon}</button>
    </th>
  );
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

function PaymentSortIcon({ active, direction, tone }: { active: boolean; direction: SortDirection; tone: 'green' | 'coral' }) {
  const activeColor = tone === 'coral' ? 'text-[#E8564B]' : 'text-[#147514]';
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp className={`-mb-1 h-3 w-3 ${active && direction === 'asc' ? activeColor : 'text-slate-400'}`} />
      <ChevronDown className={`-mt-1 h-3 w-3 ${active && direction === 'desc' ? activeColor : 'text-slate-400'}`} />
    </span>
  );
}
