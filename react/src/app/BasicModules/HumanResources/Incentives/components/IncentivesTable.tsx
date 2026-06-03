import { useEffect, useMemo, useState } from 'react';
import type { RHIncentivo } from '../../mockData';
import {
  StandardPaginationFooter,
  StandardSortIcon,
  type StandardSortDirection,
} from '../../shared/StandardTableControls';
import type { IncentivesTranslations } from '../translations';

export type IncentiveColumnId =
  | 'incentive'
  | 'type'
  | 'scope'
  | 'amount'
  | 'application'
  | 'status';

interface IncentivesTableProps {
  copy: IncentivesTranslations;
  incentives: RHIncentivo[];
  selectedIds: string[];
  visibleColumns: IncentiveColumnId[];
  onToggleRow: (incentiveId: string) => void;
  onToggleRows: (incentiveIds: string[], checked: boolean) => void;
}

type IncentiveSortField = IncentiveColumnId;

const defaultIncentivesPageSize = 10;

const statusClasses: Record<RHIncentivo['estado'], string> = {
  Activo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Programado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Pausado: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

const typeClasses: Record<RHIncentivo['tipo'], string> = {
  Automatizado: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
  Manual: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
};

export function IncentivesTable({
  copy,
  incentives,
  selectedIds,
  visibleColumns,
  onToggleRows,
  onToggleRow,
}: IncentivesTableProps) {
  const [sortField, setSortField] = useState<IncentiveSortField>('incentive');
  const [sortDirection, setSortDirection] = useState<StandardSortDirection>('asc');
  const [pageSize, setPageSize] = useState(defaultIncentivesPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const handleSort = (field: IncentiveSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const sortedIncentives = useMemo(() => {
    const getValue = (incentive: RHIncentivo): string => {
      switch (sortField) {
        case 'incentive':
          return `${incentive.nombre} ${incentive.id}`.toLowerCase();
        case 'type':
          return copy.types[incentive.tipo].toLowerCase();
        case 'scope':
          return incentive.alcance.toLowerCase();
        case 'amount':
          return incentive.monto.toLowerCase();
        case 'application':
          return incentive.aplicacion.toLowerCase();
        case 'status':
          return copy.statuses[incentive.estado].toLowerCase();
      }
    };

    return [...incentives].sort((left, right) => {
      const comparison = getValue(left).localeCompare(getValue(right), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [copy.statuses, copy.types, incentives, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedIncentives.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedIncentives = sortedIncentives.slice(pageStartIndex, pageEndIndex);
  const paginationStart = sortedIncentives.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedIncentives.length === 0 ? 0 : Math.min(pageEndIndex, sortedIncentives.length);
  const allVisibleSelected = paginatedIncentives.length > 0 && paginatedIncentives.every((incentive) => selectedIds.includes(incentive.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [incentives, pageSize, sortDirection, sortField, visibleColumns]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              <th className="w-12 px-5 py-4 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => onToggleRows(paginatedIncentives.map((incentive) => incentive.id), event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                />
              </th>
              {visibleColumnSet.has('incentive') ? <TableHeader field="incentive" label={copy.columns.incentive} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('type') ? <TableHeader field="type" label={copy.columns.type} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('scope') ? <TableHeader field="scope" label={copy.columns.scope} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('amount') ? <TableHeader field="amount" label={copy.columns.amount} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('application') ? <TableHeader field="application" label={copy.columns.application} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('status') ? <TableHeader field="status" label={copy.columns.status} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedIncentives.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-5 py-10 text-center text-sm text-slate-500">
                  {copy.table.empty}
                </td>
              </tr>
            ) : (
              paginatedIncentives.map((incentive) => (
                <tr key={incentive.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(incentive.id)}
                      onChange={() => onToggleRow(incentive.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                    />
                  </td>
                  {visibleColumnSet.has('incentive') ? (
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{incentive.nombre}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{incentive.id}</p>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('type') ? (
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeClasses[incentive.tipo]}`}>
                        {copy.types[incentive.tipo]}
                      </span>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('scope') ? (
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{incentive.alcance}</td>
                  ) : null}
                  {visibleColumnSet.has('amount') ? (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">{incentive.monto}</td>
                  ) : null}
                  {visibleColumnSet.has('application') ? (
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{incentive.aplicacion}</td>
                  ) : null}
                  {visibleColumnSet.has('status') ? (
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[incentive.estado]}`}>
                        {copy.statuses[incentive.estado]}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <StandardPaginationFooter
        currentPage={safeCurrentPage}
        labels={copy.pagination}
        onPageChange={setCurrentPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setCurrentPage(1);
        }}
        pageEnd={paginationEnd}
        pageSize={pageSize}
        pageStart={paginationStart}
        totalCount={sortedIncentives.length}
        totalPages={totalPages}
      />
    </div>
  );
}

function TableHeader({
  field,
  label,
  onSort,
  sortDirection,
  sortField,
}: {
  field: IncentiveSortField;
  label: string;
  onSort: (field: IncentiveSortField) => void;
  sortDirection: StandardSortDirection;
  sortField: IncentiveSortField;
}) {
  return (
    <th className="px-5 py-4 text-left">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <span>{label}</span>
        <StandardSortIcon active={sortField === field} direction={sortDirection} />
      </button>
    </th>
  );
}
