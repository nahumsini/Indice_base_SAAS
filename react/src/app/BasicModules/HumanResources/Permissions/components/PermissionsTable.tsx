import { Check, Eye, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import type { PermissionItem } from '../types/permissions.types';

interface PermissionsTableProps {
  permissions: PermissionItem[];
  onView: (permission: PermissionItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isManager?: boolean;
}

const typeLabels: Record<PermissionItem['type'], string> = {
  vacation: 'Vacation',
  sick_leave: 'Sick Leave',
  personal: 'Personal',
  maternity: 'Maternity/Paternity',
  bereavement: 'Bereavement',
  unpaid: 'Unpaid Leave',
  other: 'Other',
};

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
  permissions,
  onView,
  onApprove,
  onReject,
  isManager = false,
}: PermissionsTableProps) {
  if (permissions.length === 0) {
    return (
      <Card className="p-16 text-center">
        <div className="mb-4 text-6xl">📅</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">No requests yet</h3>
        <p className="text-gray-500 dark:text-gray-400">There are no permission requests to display.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
            <tr>
              {['Folio', 'Employee', 'Type', 'Start Date', 'End Date', 'Days', 'Status'].map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {header}
                </th>
              ))}
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {permissions.map((permission) => (
              <tr
                key={permission.id}
                className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => onView(permission)}
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {permission.folio}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={permission.employee.avatar} />
                      <AvatarFallback className="text-xs">{permission.employee.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {permission.employee.name}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge className={typeColors[permission.type]}>{typeLabels[permission.type]}</Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {permission.startDate}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {permission.endDate}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                  {permission.days}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge className={statusColors[permission.status]}>
                    {permission.status.charAt(0).toUpperCase() + permission.status.slice(1)}
                  </Badge>
                </td>
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
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
                          onClick={() => onApprove(permission.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                          onClick={() => onReject(permission.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => onView(permission)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
