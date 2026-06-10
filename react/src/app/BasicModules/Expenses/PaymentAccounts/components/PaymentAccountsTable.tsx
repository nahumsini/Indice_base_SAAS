import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit2, ExternalLink, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { PaymentAccount, PaymentSortField, SortDirection } from '../types';
import { formatPaymentCurrency, formatPaymentDate, getTypeBadgeColor, getTypeIcon, getTypeLabel } from '../paymentAccounts.utils';
import { defaultPaymentColumnWidths, paymentHeaders, type PaymentColumnKey } from '../paymentAccountsTableConfig';

type PaymentAccountsTableProps = {
  accounts: PaymentAccount[];
  businessOptions: FinanceReferenceOption[];
  sortDirection: SortDirection;
  sortField: PaymentSortField | null;
  unitOptions: FinanceReferenceOption[];
  visibleColumns: PaymentColumnKey[];
  onDelete: (accountId: string) => void;
  onEdit: (account: PaymentAccount) => void;
  onNavigate?: (page?: string) => void;
  onSort: (field: PaymentSortField) => void;
  onToggleActive: (account: PaymentAccount) => void;
};

export function PaymentAccountsTable({
  accounts,
  businessOptions,
  onDelete,
  onEdit,
  onNavigate,
  onSort,
  onToggleActive,
  sortDirection,
  sortField,
  unitOptions,
  visibleColumns,
}: PaymentAccountsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const tableColumns = useMemo(() => paymentHeaders.filter(header => visibleColumns.includes(header.key)), [visibleColumns]);
  const totalPages = Math.max(1, Math.ceil(accounts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedAccounts = accounts.slice(pageStartIndex, pageEndIndex);
  const paginationStart = accounts.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = accounts.length === 0 ? 0 : Math.min(pageEndIndex, accounts.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [accounts, pageSize, visibleColumns]);

  const getSortIcon = (field: PaymentSortField) => (
    <PaymentSortIcon active={sortField === field} direction={sortField === field ? sortDirection : null} />
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {tableColumns.map(header => (
                <SortableHeader key={header.key} field={header.sortField} label={header.label} width={defaultPaymentColumnWidths[header.key]} sortIcon={getSortIcon(header.sortField)} onSort={onSort} />
              ))}
              <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400" style={{ width: defaultPaymentColumnWidths.actions, minWidth: defaultPaymentColumnWidths.actions }}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedAccounts.length === 0 ? <EmptyRow colSpan={tableColumns.length + 1} /> : paginatedAccounts.map(account => (
              <PaymentAccountRow
                key={account.id}
                account={account}
                businessOptions={businessOptions}
                tableColumns={tableColumns.map(column => column.key)}
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
      <PaymentPagination
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
      />
    </div>
  );
}

function PaymentAccountRow({
  account,
  businessOptions,
  onDelete,
  onEdit,
  onNavigate,
  onToggleActive,
  tableColumns,
  unitOptions,
}: {
  account: PaymentAccount;
  businessOptions: FinanceReferenceOption[];
  tableColumns: PaymentColumnKey[];
  unitOptions: FinanceReferenceOption[];
  onDelete: (accountId: string) => void;
  onEdit: (account: PaymentAccount) => void;
  onNavigate?: (page?: string) => void;
  onToggleActive: (account: PaymentAccount) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
      {tableColumns.map(columnKey => (
        <td key={columnKey} className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300" style={{ width: defaultPaymentColumnWidths[columnKey], minWidth: defaultPaymentColumnWidths[columnKey] }}>
          {renderPaymentCell(columnKey, account, unitOptions, businessOptions)}
        </td>
      ))}
      <td className="px-5 py-4 text-center" style={{ width: defaultPaymentColumnWidths.actions, minWidth: defaultPaymentColumnWidths.actions }}>
        {account.source === 'petty_cash' ? (
          <div className="mx-auto inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => onNavigate?.('petty-cash')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 text-sm font-bold text-[#147514] transition hover:-translate-y-0.5 hover:bg-[#147514]/12 hover:shadow-sm" title="Abrir caja chica">
              <ExternalLink className="h-4 w-4" />
              Abrir
            </button>
          </div>
        ) : (
          <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <ActionButton title="Editar" onClick={() => onEdit(account)}><Edit2 className="h-4 w-4" /></ActionButton>
            <button type="button" onClick={() => onToggleActive(account)} className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-sm ${account.isActive ? 'border-[#147514]/25 bg-[#147514]/12 text-[#147514] hover:bg-[#147514]/18 dark:border-[#147514]/35 dark:bg-[#147514]/15' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-[#147514]/20 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900'}`} title={account.isActive ? 'Desactivar' : 'Activar'}>
              {account.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => onDelete(account.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/60 text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30" title="Eliminar">
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
) {
  if (columnKey === 'name') return <NameCell account={account} />;
  if (columnKey === 'type') return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getTypeBadgeColor(account.type)}`}>{getTypeLabel(account.type)}</span>;
  if (columnKey === 'unitId') return <ReferencePill value={getReferenceLabel(unitOptions, account.unitId)} />;
  if (columnKey === 'businessId') return <ReferencePill value={getReferenceLabel(businessOptions, account.businessId)} />;
  if (columnKey === 'bank') return account.source === 'petty_cash' ? <ReferencePill value={account.custodian ?? '-'} /> : <span>{account.bank || '-'}</span>;
  if (columnKey === 'accountNumber') return <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{account.accountNumber || '-'}</span>;
  if (columnKey === 'balance') return <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatPaymentCurrency(account.balance, account.currency)}</span>;
  if (columnKey === 'currency') return <ReferencePill value={account.currency} />;
  if (columnKey === 'lastTransaction') return <span>{account.lastTransaction ? formatPaymentDate(account.lastTransaction) : '-'}</span>;
  return <StatusBadge isActive={account.isActive} />;
}

function NameCell({ account }: { account: PaymentAccount }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[#147514]">{getTypeIcon(account.type)}</span>
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-900 dark:text-slate-100">{account.name}</p>
        {account.source === 'petty_cash' ? <p className="mt-1 text-xs font-semibold text-[#147514]">Caja chica · {account.custodian ?? 'Sin custodio'}</p> : null}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, title }: { children: ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#147514]/20 bg-[#147514]/5 text-[#147514] transition hover:-translate-y-0.5 hover:bg-[#147514]/12 hover:shadow-sm dark:border-[#147514]/30 dark:bg-[#147514]/10" title={title}>
      {children}
    </button>
  );
}

function ReferencePill({ value }: { value: string }) {
  return <span className="inline-flex max-w-[150px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><span className="truncate">{value}</span></span>;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>{isActive ? 'Activa' : 'Inactiva'}</span>;
}

function getReferenceLabel(options: FinanceReferenceOption[], value?: string) {
  if (!value) return '-';
  return options.find(option => option.value === value)?.label ?? value;
}

function SortableHeader({ field, label, onSort, sortIcon, width }: { field: PaymentSortField; label: string; onSort: (field: PaymentSortField) => void; sortIcon: ReactNode; width: number }) {
  return (
    <th className="px-5 py-4 text-left align-middle" style={{ width, minWidth: width }}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><span>{label}</span>{sortIcon}</button>
    </th>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <Search className="mb-4 h-12 w-12 opacity-50" />
          <p className="text-lg font-semibold">No se encontraron cuentas de pago</p>
          <p className="text-sm">Ajusta los filtros o agrega una nueva cuenta.</p>
        </div>
      </td>
    </tr>
  );
}

function PaymentSortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp className={`-mb-1 h-3 w-3 ${active && direction === 'asc' ? 'text-[#147514]' : 'text-slate-400'}`} />
      <ChevronDown className={`-mt-1 h-3 w-3 ${active && direction === 'desc' ? 'text-[#147514]' : 'text-slate-400'}`} />
    </span>
  );
}

function PaymentPagination({ currentPage, onPageChange, onPageSizeChange, pageEnd, pageSize, pageStart, totalCount, totalPages }: { currentPage: number; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; pageEnd: number; pageSize: number; pageStart: number; totalCount: number; totalPages: number }) {
  if (totalCount === 0) return null;
  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">Mostrando {pageStart}-{pageEnd} de {totalCount}</p>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="Filas por página" className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{[10, 25, 50].map(option => <option key={option} value={option}>{option}</option>)}</select>
        <p className="text-sm text-slate-500 dark:text-slate-400">{currentPage} / {totalPages}</p>
        <div className="flex items-center gap-2">
          <PageButton disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft className="h-4 w-4" />Anterior</PageButton>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">{currentPage}</span>
          <PageButton disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>Siguiente<ChevronRight className="h-4 w-4" /></PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">{children}</button>;
}
