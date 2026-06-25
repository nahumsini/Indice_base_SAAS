import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit2, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import type { AccountingAccount, AccountingSortField, SortDirection } from '../types';
import { formatAccountingCurrency, getTypeBadgeColor } from '../accountingAccounts.utils';
import { accountingCountryOptions, statementSectionLabels } from '../accountingCatalogSeed';
import {
  defaultAccountingColumnWidths,
  type AccountingColumnConfig,
  type AccountingColumnKey,
} from '../accountingAccountsTableConfig';

type AccountingAccountsTableProps = {
  accounts: AccountingAccount[];
  businessOptions: FinanceReferenceOption[];
  columns: AccountingColumnConfig[];
  sortDirection: SortDirection;
  sortField: AccountingSortField | null;
  unitOptions: FinanceReferenceOption[];
  onDelete: (accountId: string) => void;
  onEdit: (account: AccountingAccount) => void;
  onSort: (field: AccountingSortField) => void;
  onToggleActive: (account: AccountingAccount) => void;
};

export function AccountingAccountsTable({
  accounts,
  businessOptions,
  columns,
  onDelete,
  onEdit,
  onSort,
  onToggleActive,
  sortDirection,
  sortField,
  unitOptions,
}: AccountingAccountsTableProps) {
  const t = useFinanceTranslations();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const tableColumns = useMemo(() => columns.filter(column => column.visible), [columns]);
  const visibleColumnKeys = useMemo(() => tableColumns.map(column => column.key), [tableColumns]);
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

  const getSortIcon = (field: AccountingSortField) => (
    <AccountingSortIcon active={sortField === field} direction={sortField === field ? sortDirection : null} />
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-[1160px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {tableColumns.map(header => (
                <SortableHeader key={header.key} field={header.sortField} label={header.label} width={defaultAccountingColumnWidths[header.key]} sortIcon={getSortIcon(header.sortField)} onSort={onSort} />
              ))}
              <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400" style={{ width: defaultAccountingColumnWidths.actions, minWidth: defaultAccountingColumnWidths.actions }}>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedAccounts.length === 0 ? <EmptyRow colSpan={tableColumns.length + 1} message={t.common.noOptions} /> : paginatedAccounts.map(account => (
              <AccountRow
                key={account.id}
                account={account}
                businessOptions={businessOptions}
                labels={{ active: t.common.active, activate: t.common.active, delete: t.common.delete, edit: t.common.edit, inactive: t.common.inactive }}
                tableColumns={visibleColumnKeys}
                typeLabels={t.accountingAccounts.types}
                unitOptions={unitOptions}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
              />
            ))}
          </tbody>
        </table>
      </div>
      <AccountingPagination
        currentPage={safeCurrentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setCurrentPage(1);
        }}
        pageEnd={paginationEnd}
        pageSize={pageSize}
        pageStart={paginationStart}
        totalCount={accounts.length}
        totalPages={totalPages}
        translations={t.common}
      />
    </div>
  );
}

function AccountRow({
  account,
  businessOptions,
  labels,
  onDelete,
  onEdit,
  onToggleActive,
  tableColumns,
  typeLabels,
  unitOptions,
}: {
  account: AccountingAccount;
  businessOptions: FinanceReferenceOption[];
  labels: { active: string; activate: string; delete: string; edit: string; inactive: string };
  tableColumns: AccountingColumnKey[];
  typeLabels: Record<string, string>;
  unitOptions: FinanceReferenceOption[];
  onDelete: (accountId: string) => void;
  onEdit: (account: AccountingAccount) => void;
  onToggleActive: (account: AccountingAccount) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
      {tableColumns.map(columnKey => (
        <td key={columnKey} className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300" style={{ width: defaultAccountingColumnWidths[columnKey], minWidth: defaultAccountingColumnWidths[columnKey] }}>
          {renderAccountCell(columnKey, account, unitOptions, businessOptions, labels, typeLabels)}
        </td>
      ))}
      <td className="px-5 py-4 text-center" style={{ width: defaultAccountingColumnWidths.actions, minWidth: defaultAccountingColumnWidths.actions }}>
        <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => onEdit(account)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#147514]/20 bg-[#147514]/5 text-[#147514] transition hover:-translate-y-0.5 hover:bg-[#147514]/12 hover:shadow-sm dark:border-[#147514]/30 dark:bg-[#147514]/10" title={labels.edit}>
            <Edit2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onToggleActive(account)} className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-sm ${account.isActive ? 'border-[#147514]/25 bg-[#147514]/12 text-[#147514] hover:bg-[#147514]/18 dark:border-[#147514]/35 dark:bg-[#147514]/15' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-[#147514]/20 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900'}`} title={account.isActive ? labels.inactive : labels.activate}>
            {account.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => onDelete(account.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30" title={labels.delete}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function renderAccountCell(
  columnKey: AccountingColumnKey,
  account: AccountingAccount,
  unitOptions: FinanceReferenceOption[],
  businessOptions: FinanceReferenceOption[],
  labels: { active: string; inactive: string },
  typeLabels: Record<string, string>,
) {
  if (columnKey === 'code') return <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">{account.code}</span>;
  if (columnKey === 'name') return <span className="font-bold text-slate-900 dark:text-slate-100">{account.name}</span>;
  if (columnKey === 'type') return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getTypeBadgeColor(account.type)}`}>{typeLabels[account.type] ?? account.type}</span>;
  if (columnKey === 'countryCode') return <ReferencePill value={getCountryLabel(account.countryCode)} />;
  if (columnKey === 'localStandard') return <ReferencePill value={account.localStandard ?? '-'} />;
  if (columnKey === 'statementSection') return <ReferencePill value={account.statementSection ? statementSectionLabels[account.statementSection] : '-'} />;
  if (columnKey === 'unitId') return <ReferencePill value={getReferenceLabel(unitOptions, account.unitId)} />;
  if (columnKey === 'businessId') return <ReferencePill value={getReferenceLabel(businessOptions, account.businessId)} />;
  if (columnKey === 'description') return <span className="block max-w-[240px] truncate text-slate-600 dark:text-slate-400">{account.description || '-'}</span>;
  if (columnKey === 'balance') return <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatAccountingCurrency(account.balance)}</span>;
  return <StatusBadge activeLabel={labels.active} inactiveLabel={labels.inactive} isActive={account.isActive} />;
}

function ReferencePill({ value }: { value: string }) {
  return (
    <span className="inline-flex max-w-[150px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <span className="truncate">{value}</span>
    </span>
  );
}

function StatusBadge({ activeLabel, inactiveLabel, isActive }: { activeLabel: string; inactiveLabel: string; isActive: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}

function getReferenceLabel(options: FinanceReferenceOption[], value?: string) {
  if (!value) return '-';
  return options.find(option => option.value === value)?.label ?? value;
}

function getCountryLabel(countryCode?: AccountingAccount['countryCode']) {
  if (!countryCode) return '-';
  return accountingCountryOptions.find(country => country.code === countryCode)?.label ?? countryCode;
}

function SortableHeader({
  field,
  label,
  onSort,
  sortIcon,
  width,
}: {
  field: AccountingSortField;
  label: string;
  onSort: (field: AccountingSortField) => void;
  sortIcon: ReactNode;
  width: number;
}) {
  return (
    <th className="px-5 py-4 text-left align-middle" style={{ width, minWidth: width }}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <span>{label}</span>
        {sortIcon}
      </button>
    </th>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <Search className="mb-4 h-12 w-12 opacity-50" />
          <p className="text-lg font-semibold">{message}</p>
        </div>
      </td>
    </tr>
  );
}

function AccountingSortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp className={`-mb-1 h-3 w-3 ${active && direction === 'asc' ? 'text-[#147514]' : 'text-slate-400'}`} />
      <ChevronDown className={`-mt-1 h-3 w-3 ${active && direction === 'desc' ? 'text-[#147514]' : 'text-slate-400'}`} />
    </span>
  );
}

function AccountingPagination({
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageStart,
  totalCount,
  totalPages,
  translations,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageStart: number;
  totalCount: number;
  totalPages: number;
  translations: ReturnType<typeof useFinanceTranslations>['common'];
}) {
  if (totalCount === 0) return null;
  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">{translations.showing(pageStart, pageEnd, totalCount)}</p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label={translations.rowsPerPage} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {[10, 25, 50].map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <p className="text-sm text-slate-500 dark:text-slate-400">{currentPage} / {totalPages}</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <PageButton disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft className="h-4 w-4" />{translations.previous}</PageButton>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">{currentPage}</span>
          <PageButton disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>{translations.next}<ChevronRight className="h-4 w-4" /></PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
      {children}
    </button>
  );
}
