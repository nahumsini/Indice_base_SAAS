import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Trash2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import {
  StandardActionButton,
  StandardPaginationFooter,
  StandardSortIcon,
  type StandardSortDirection,
} from '../../shared/StandardTableControls';
import type { PermissionItem } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';

interface PermissionsTableProps {
  copy: PermissionsTranslations;
  permissions: PermissionItem[];
  visibleColumns: PermissionColumnId[];
  onView: (permission: PermissionItem) => void;
  onApprove?: (id: string, reviewNotes?: string) => Promise<void>;
  onReject?: (id: string, reviewNotes?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isManager?: boolean;
  busyPermissionId?: string | null;
}

export type PermissionColumnId =
  | 'folio'
  | 'employee'
  | 'type'
  | 'payrollTreatment'
  | 'startDate'
  | 'endDate'
  | 'days'
  | 'status'
  | 'actions';

type PermissionSortField = Exclude<PermissionColumnId, 'actions'>;

const defaultPermissionsPageSize = 10;

const typeColors: Record<PermissionItem['type'], string> = {
  vacation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sick_leave: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  maternity: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  bereavement: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  unpaid: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusColors: Record<PermissionItem['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const payrollTreatmentColors: Record<PermissionItem['payrollTreatment'], string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  unpaid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const getTypeLabel = (copy: PermissionsTranslations, permission: PermissionItem) => (
  copy.types[permission.type] ?? copy.types.other
);

const getStatusLabel = (copy: PermissionsTranslations, permission: PermissionItem) => (
  copy.status[permission.status] ?? copy.status.pending
);

const getPayrollTreatmentLabel = (copy: PermissionsTranslations, permission: PermissionItem) => (
  copy.payrollTreatment[permission.payrollTreatment] ?? copy.payrollTreatment.paid
);

const getTypeColor = (permission: PermissionItem) => typeColors[permission.type] ?? typeColors.other;
const getStatusColor = (permission: PermissionItem) => statusColors[permission.status] ?? statusColors.pending;
const getPayrollTreatmentColor = (permission: PermissionItem) => payrollTreatmentColors[permission.payrollTreatment] ?? payrollTreatmentColors.paid;
const normalizeSortText = (value: unknown) => String(value ?? '').toLowerCase();

export function PermissionsTable({
  copy,
  permissions,
  visibleColumns,
  onView,
  onApprove,
  onReject,
  onDelete,
  isManager = false,
  busyPermissionId = null,
}: PermissionsTableProps) {
  const [sortField, setSortField] = useState<PermissionSortField>('startDate');
  const [sortDirection, setSortDirection] = useState<StandardSortDirection>('desc');
  const [pageSize, setPageSize] = useState(defaultPermissionsPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const handleSort = (field: PermissionSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const sortedPermissions = useMemo(() => {
    const getValue = (permission: PermissionItem): number | string => {
      switch (sortField) {
        case 'folio':
          return normalizeSortText(permission.folio);
        case 'employee':
          return normalizeSortText(permission.employee.name);
        case 'type':
          return normalizeSortText(getTypeLabel(copy, permission));
        case 'payrollTreatment':
          return normalizeSortText(getPayrollTreatmentLabel(copy, permission));
        case 'startDate':
          return Date.parse(permission.startDate) || permission.startDate;
        case 'endDate':
          return Date.parse(permission.endDate) || permission.endDate;
        case 'days':
          return permission.days;
        case 'status':
          return normalizeSortText(getStatusLabel(copy, permission));
      }
    };

    return [...permissions].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        const comparison = leftValue - rightValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [copy.payrollTreatment, copy.status, copy.types, permissions, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedPermissions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedPermissions = sortedPermissions.slice(pageStartIndex, pageEndIndex);
  const paginationStart = sortedPermissions.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedPermissions.length === 0 ? 0 : Math.min(pageEndIndex, sortedPermissions.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, permissions, sortDirection, sortField, visibleColumns]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (permissions.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 p-16 text-center shadow-sm dark:border-slate-700">
        <div className="mb-4 text-6xl">📅</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{copy.empty.title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{copy.empty.description}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {visibleColumnSet.has('folio') ? <TableHeader field="folio" label={copy.columns.folio} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('employee') ? <TableHeader field="employee" label={copy.columns.employee} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('type') ? <TableHeader field="type" label={copy.columns.type} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('payrollTreatment') ? <TableHeader field="payrollTreatment" label={copy.columns.payrollTreatment} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('startDate') ? <TableHeader field="startDate" label={copy.columns.startDate} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('endDate') ? <TableHeader field="endDate" label={copy.columns.endDate} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('days') ? <TableHeader field="days" label={copy.columns.days} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('status') ? <TableHeader field="status" label={copy.columns.status} onSort={handleSort} sortDirection={sortDirection} sortField={sortField} /> : null}
              {visibleColumnSet.has('actions') ? (
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {copy.columns.actions}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
            {paginatedPermissions.map((permission) => {
              const isBusy = busyPermissionId === permission.id;

              return (
                <tr
                  key={permission.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => onView(permission)}
                >
                  {visibleColumnSet.has('folio') ? (
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {permission.folio}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('employee') ? (
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={permission.employee.avatar} />
                          <AvatarFallback className="text-xs">{permission.employee.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {permission.employee.name}
                        </span>
                      </div>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('type') ? (
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge className={`rounded-full ${getTypeColor(permission)}`}>
                        {getTypeLabel(copy, permission)}
                      </Badge>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('payrollTreatment') ? (
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge className={`rounded-full ${getPayrollTreatmentColor(permission)}`}>
                        {getPayrollTreatmentLabel(copy, permission)}
                      </Badge>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('startDate') ? (
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {permission.startDate}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('endDate') ? (
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {permission.endDate}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('days') ? (
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {permission.days}
                    </td>
                  ) : null}
                  {visibleColumnSet.has('status') ? (
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge className={`rounded-full ${getStatusColor(permission)}`}>
                        {getStatusLabel(copy, permission)}
                      </Badge>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('actions') ? (
                    <td
                      className="whitespace-nowrap px-6 py-4 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-2 rounded-[18px] border border-slate-200 bg-slate-50/80 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        {isManager && permission.status === 'pending' && onApprove && onReject ? (
                          <>
                            <StandardActionButton
                              label={copy.actions.approve}
                              onClick={() => { void onApprove(permission.id); }}
                              disabled={isBusy}
                              tone="success"
                            >
                              <Check className="h-4 w-4" />
                            </StandardActionButton>
                            <StandardActionButton
                              label={copy.actions.reject}
                              onClick={() => { void onReject(permission.id); }}
                              disabled={isBusy}
                              tone="danger"
                            >
                              <X className="h-4 w-4" />
                            </StandardActionButton>
                          </>
                        ) : null}
                        {!isManager && permission.status === 'pending' && onDelete ? (
                          <StandardActionButton
                            label={copy.actions.delete}
                            onClick={() => { void onDelete(permission.id); }}
                            disabled={isBusy}
                            tone="warning"
                          >
                            <Trash2 className="h-4 w-4" />
                          </StandardActionButton>
                        ) : null}
                        <StandardActionButton
                          label={copy.actions.view}
                          onClick={() => onView(permission)}
                          disabled={isBusy}
                        >
                          <Eye className="h-4 w-4" />
                        </StandardActionButton>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
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
        totalCount={sortedPermissions.length}
        totalPages={totalPages}
      />
    </Card>
  );
}

function TableHeader({
  field,
  label,
  onSort,
  sortDirection,
  sortField,
}: {
  field: PermissionSortField;
  label: string;
  onSort: (field: PermissionSortField) => void;
  sortDirection: StandardSortDirection;
  sortField: PermissionSortField;
}) {
  return (
    <th className="px-6 py-4 text-left">
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
