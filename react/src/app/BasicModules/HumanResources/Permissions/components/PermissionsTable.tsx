import { Check, Eye, Trash2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import type { PermissionItem } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';

interface PermissionsTableProps {
  copy: PermissionsTranslations;
  permissions: PermissionItem[];
  visibleColumns: PermissionColumnId[];
  onView: (permission: PermissionItem) => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isManager?: boolean;
  busyPermissionId?: string | null;
}

export type PermissionColumnId =
  | 'folio'
  | 'employee'
  | 'type'
  | 'startDate'
  | 'endDate'
  | 'days'
  | 'status'
  | 'actions';

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
  const visibleColumnSet = new Set(visibleColumns);

  if (permissions.length === 0) {
    return (
      <Card className="border border-gray-200 p-16 text-center shadow-sm dark:border-gray-700">
        <div className="mb-4 text-6xl">📅</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{copy.empty.title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{copy.empty.description}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/50">
            <tr>
              {visibleColumnSet.has('folio') ? <TableHeader label={copy.columns.folio} /> : null}
              {visibleColumnSet.has('employee') ? <TableHeader label={copy.columns.employee} /> : null}
              {visibleColumnSet.has('type') ? <TableHeader label={copy.columns.type} /> : null}
              {visibleColumnSet.has('startDate') ? <TableHeader label={copy.columns.startDate} /> : null}
              {visibleColumnSet.has('endDate') ? <TableHeader label={copy.columns.endDate} /> : null}
              {visibleColumnSet.has('days') ? <TableHeader label={copy.columns.days} /> : null}
              {visibleColumnSet.has('status') ? <TableHeader label={copy.columns.status} /> : null}
              {visibleColumnSet.has('actions') ? (
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  {copy.columns.actions}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {permissions.map((permission) => {
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
                      <Badge className={`rounded-full ${typeColors[permission.type]}`}>{copy.types[permission.type]}</Badge>
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
                      <Badge className={`rounded-full ${statusColors[permission.status]}`}>
                        {copy.status[permission.status]}
                      </Badge>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('actions') ? (
                    <td
                      className="whitespace-nowrap px-6 py-4 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {isManager && permission.status === 'pending' && onApprove && onReject ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 rounded-lg border border-emerald-100 bg-emerald-50 p-0 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                              onClick={() => { void onApprove(permission.id); }}
                              disabled={isBusy}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 rounded-lg border border-rose-100 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                              onClick={() => { void onReject(permission.id); }}
                              disabled={isBusy}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        {!isManager && permission.status === 'pending' && onDelete ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 rounded-lg border border-amber-100 bg-amber-50 p-0 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                            onClick={() => { void onDelete(permission.id); }}
                            disabled={isBusy}
                            title={copy.actions.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 rounded-lg border border-blue-100 bg-blue-50 p-0 text-blue-600 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                          onClick={() => onView(permission)}
                          disabled={isBusy}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TableHeader({ label }: { label: string }) {
  return (
    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
      {label}
    </th>
  );
}
