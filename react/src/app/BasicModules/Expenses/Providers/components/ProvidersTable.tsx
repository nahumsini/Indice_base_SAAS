import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { ProviderRecord } from '../useProveedoresLogic';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../../hooks/useTablePagination';
import {
  defaultProviderColumnWidths,
  type ProviderColumnConfig,
  type ProviderColumnKey,
  type ProviderSortField,
  type SortDirection,
} from '../providerTableConfig';
import { compareProviderSortValues } from '../providerTableUtils';
import { EditableProviderRow } from './EditableProviderRow';
import { ProvidersMobileCards } from './ProvidersMobileCards';

type ProvidersTableProps = {
  accountingAccountOptions: FinanceReferenceOption[];
  columns: ProviderColumnConfig[];
  editingProviderId: string | null;
  businessOptions: FinanceReferenceOption[];
  providers: ProviderRecord[];
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onEditProvider: (providerId: string) => void;
  onOpenEditProvider: (provider: ProviderRecord) => void;
  onOpenAttachments: (provider: ProviderRecord) => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
  onManageAccess: (provider: ProviderRecord) => void;
};

export function ProvidersTable({
  accountingAccountOptions,
  columns,
  editingProviderId,
  businessOptions,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onEditProvider,
  onOpenEditProvider,
  onOpenAttachments,
  onUpdateProvider,
  onManageAccess,
  providers,
  unitOptions,
  userOptions,
}: ProvidersTableProps) {
  const t = useProvidersTranslations();
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultProviderColumnWidths);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<ProviderSortField | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const selectableUserOptions = useMemo(() => [{ value: '', label: t.common.select }, ...userOptions], [t.common.select, userOptions]);
  const selectableAccountingAccountOptions = useMemo(() => (
    accountingAccountOptions.length > 0 ? accountingAccountOptions : [{ value: '', label: t.common.noOptions }]
  ), [accountingAccountOptions, t.common.noOptions]);
  const tableColumns = useMemo(() => columns.filter(column => column.visible), [columns]);
  const visibleColumnKeys = useMemo(() => tableColumns.map(column => column.key), [tableColumns]);
  const sortedProviders = useMemo(() => {
    if (!sortField || !sortDirection) return providers;
    return [...providers].sort((left, right) => compareProviderSortValues(left[sortField], right[sortField], sortDirection));
  }, [providers, sortDirection, sortField]);
  const totalPages = Math.max(1, Math.ceil(sortedProviders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedProviders = sortedProviders.slice(pageStartIndex, pageEndIndex);
  const paginationStart = sortedProviders.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedProviders.length === 0 ? 0 : Math.min(pageEndIndex, sortedProviders.length);

  useEffect(() => {
    if (!resizingColumn) return undefined;
    const handleMouseMove = (event: MouseEvent) => {
      const diff = event.clientX - resizeStartX;
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: Math.max(80, resizeStartWidth + diff) }));
    };
    const handleMouseUp = () => setResizingColumn(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, providers, tableColumns]);

  const handleResizeStart = (event: ReactMouseEvent, columnKey: string) => {
    event.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(event.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  const handleSort = (field: ProviderSortField) => {
    if (sortField === field && sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }
    if (sortField === field && sortDirection === 'desc') {
      setSortField(null);
      setSortDirection(null);
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const getSortIcon = (field: ProviderSortField) => {
    return <ProviderSortIcon active={sortField === field} direction={sortField === field ? sortDirection : null} />;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <ProvidersMobileCards
        businessOptions={businessOptions}
        providers={paginatedProviders}
        unitOptions={unitOptions}
        onActivateProvider={onActivateProvider}
        onDeleteProvider={onDeleteProvider}
        onDuplicateProvider={onDuplicateProvider}
        onOpenAttachments={onOpenAttachments}
        onOpenEditProvider={onOpenEditProvider}
        onManageAccess={onManageAccess}
      />
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1180px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {tableColumns.map(header => (
                <SortableHeader key={header.key} columnKey={header.sortField} label={header.label} width={columnWidths[header.key]} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon(header.sortField)} />
              ))}
              <th className="px-5 py-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400" style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedProviders.length === 0 ? <EmptyProvidersRow colSpan={tableColumns.length + 1} message={t.common.noOptions} /> : paginatedProviders.map(provider => (
              <EditableProviderRow
                key={provider.id}
                accountingAccountOptions={selectableAccountingAccountOptions}
                columnWidths={columnWidths}
                businessOptions={businessOptions}
                isEditing={editingProviderId === provider.id}
                provider={provider}
                unitOptions={unitOptions}
                userOptions={selectableUserOptions}
                visibleColumns={visibleColumnKeys}
                onActivateProvider={onActivateProvider}
                onDeleteProvider={onDeleteProvider}
                onDuplicateProvider={onDuplicateProvider}
                onEditProvider={onEditProvider}
                onOpenEditProvider={onOpenEditProvider}
                onOpenAttachments={onOpenAttachments}
                onUpdateProvider={onUpdateProvider}
                onManageAccess={onManageAccess}
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
        totalCount={sortedProviders.length}
        totalPages={totalPages}
      />
    </div>
  );
}

function SortableHeader({ columnKey, label, onResizeStart, onSort, resizingColumn, sortIcon, width }: {
  columnKey: ProviderSortField;
  label: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  onSort: (field: ProviderSortField) => void;
  resizingColumn: string | null;
  sortIcon: ReactNode;
  width: number;
}) {
  return (
    <th className="group relative px-5 py-4 text-left align-middle" style={{ width, minWidth: width }}>
      <div className="flex items-center">
        <button type="button" onClick={() => onSort(columnKey)} className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><span>{label}</span>{sortIcon}</button>
        <div onMouseDown={(event) => onResizeStart(event, columnKey)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: resizingColumn === columnKey ? '#147514' : '' }} />
      </div>
    </th>
  );
}

function EmptyProvidersRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">{message}</p>
        </div>
      </td>
    </tr>
  );
}

function ProviderSortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp className={`-mb-1 h-3 w-3 ${active && direction === 'asc' ? 'text-[#147514]' : 'text-slate-400'}`} />
      <ChevronDown className={`-mt-1 h-3 w-3 ${active && direction === 'desc' ? 'text-[#147514]' : 'text-slate-400'}`} />
    </span>
  );
}
