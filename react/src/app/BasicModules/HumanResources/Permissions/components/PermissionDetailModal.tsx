import { Calendar, CheckCircle, Clock, Download, FileText, User, X, XCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PermissionItem } from '../types/permissions.types';

interface PermissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: PermissionItem | null;
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

const typeConfig: Record<PermissionItem['type'], { label: string; color: string; bgColor: string }> = {
  vacation: { label: 'Vacation', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
  sick_leave: { label: 'Sick Leave', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
  personal: { label: 'Personal', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' },
  maternity: { label: 'Maternity/Paternity', color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800' },
  bereavement: { label: 'Bereavement', color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800' },
  unpaid: { label: 'Unpaid Leave', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800' },
  other: { label: 'Other', color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800' },
};

const statusConfig: Record<PermissionItem['status'], { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' },
  approved: { label: 'Approved', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' },
  rejected: { label: 'Rejected', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
};

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date(value));

export function PermissionDetailModal({
  isOpen,
  onClose,
  permission,
  onApprove,
  onReject,
  isManager = false,
}: PermissionDetailModalProps) {
  if (!isOpen || !permission) {
    return null;
  }

  const typeInfo = typeConfig[permission.type];
  const statusInfo = statusConfig[permission.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${typeInfo.bgColor} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Permission Request</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Folio: {permission.folio}</p>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-500 p-3 shadow-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Employee Information</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{permission.employee.name}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Start Date</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(permission.startDate)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">End Date</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(permission.endDate)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Duration</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.days} {permission.days === 1 ? 'day' : 'days'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Type</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{typeLabels[permission.type]}</p>
            </div>
          </div>

          {permission.reason ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reason</h3>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                {permission.reason}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Download className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attachments</h3>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {permission.attachmentName || 'medical_certificate.pdf'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">245 KB</p>
                </div>
                <button className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30">
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-5 text-sm md:grid-cols-2 dark:border-gray-700">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">Created:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.createdAt ? formatDate(permission.createdAt) : '2026-04-01'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">Last Updated:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.updatedAt ? formatDate(permission.updatedAt) : '2026-04-01'}
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div />
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline">Close</Button>
            {isManager && permission.status === 'pending' && onApprove && onReject ? (
              <>
                <Button
                  onClick={() => {
                    onReject(permission.id);
                    onClose();
                  }}
                  variant="outline"
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    onApprove(permission.id);
                    onClose();
                  }}
                  className="gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
