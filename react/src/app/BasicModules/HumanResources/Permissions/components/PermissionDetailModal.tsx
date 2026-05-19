import { Calendar, CheckCircle, Clock, Download, FileText, Trash2, User, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import type { PermissionItem } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';

interface PermissionDetailModalProps {
  copy: PermissionsTranslations;
  isOpen: boolean;
  locale: string;
  onClose: () => void;
  permission: PermissionItem | null;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isManager?: boolean;
  isReviewing?: boolean;
}

const typeConfig: Record<PermissionItem['type'], { color: string; bgColor: string }> = {
  vacation: { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
  sick_leave: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
  personal: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' },
  maternity: { color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800' },
  bereavement: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800' },
  unpaid: { color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800' },
  other: { color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800' },
};

const statusConfig: Record<PermissionItem['status'], { color: string; bgColor: string }> = {
  pending: { color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' },
  approved: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' },
  rejected: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
};

const formatDate = (value: string, locale: string) => new Intl.DateTimeFormat(locale, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date(value));

const formatFileSize = (value?: number) => {
  if (!value) {
    return '';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export function PermissionDetailModal({
  copy,
  isOpen,
  locale,
  onClose,
  permission,
  onApprove,
  onReject,
  onDelete,
  isManager = false,
  isReviewing = false,
}: PermissionDetailModalProps) {
  const [localActionError, setLocalActionError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setLocalActionError('');
    }
  }, [isOpen, permission?.id]);

  if (!isOpen || !permission) {
    return null;
  }

  const typeInfo = typeConfig[permission.type];
  const statusInfo = statusConfig[permission.status];
  const attachments = permission.attachments ?? [];

  const handleApprove = async () => {
    if (!onApprove || isReviewing) {
      return;
    }

    setLocalActionError('');

    try {
      await onApprove(permission.id);
      onClose();
    } catch (error) {
      setLocalActionError(error instanceof Error ? error.message : '');
    }
  };

  const handleReject = async () => {
    if (!onReject || isReviewing) {
      return;
    }

    setLocalActionError('');

    try {
      await onReject(permission.id);
      onClose();
    } catch (error) {
      setLocalActionError(error instanceof Error ? error.message : '');
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isReviewing) {
      return;
    }

    setLocalActionError('');

    try {
      await onDelete(permission.id);
      onClose();
    } catch (error) {
      setLocalActionError(error instanceof Error ? error.message : '');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${typeInfo.bgColor} ${typeInfo.color}`}>
                {copy.types[permission.type]}
              </span>
              <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                {copy.status[permission.status]}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">{copy.detail.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{copy.detail.folio(permission.folio)}</p>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-500 p-3 shadow-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.employeeInformation}</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{permission.employee.name}</p>
                {permission.employee.position ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{permission.employee.position}</p>
                ) : null}
                {permission.employee.department ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{permission.employee.department}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">{copy.detail.startDate}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(permission.startDate, locale)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">{copy.detail.endDate}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(permission.endDate, locale)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">{copy.detail.duration}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.days} {permission.days === 1 ? copy.detail.day : copy.detail.days}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">{copy.detail.type}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{copy.types[permission.type]}</p>
            </div>
          </div>

          {permission.reason ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.reason}</h3>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                {permission.reason}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Download className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.attachments}</h3>
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {attachment.fileName || permission.attachmentName || copy.detail.fallbackAttachment}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(attachment.sizeBytes) || attachment.mimeType || copy.detail.fallbackAttachment}
                        </p>
                      </div>
                      {attachment.downloadUrl ? (
                        <a
                          href={attachment.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700/30 dark:text-gray-400">
                {copy.detail.noAttachments}
              </div>
            )}
          </div>

          {permission.reviewNotes || permission.reviewedBy?.name || permission.reviewedAt ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <CheckCircle className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.status[permission.status]}</h3>
              </div>
              {permission.reviewNotes ? (
                <div className="mb-3">
                  <p className="mb-1 text-sm font-semibold text-gray-600 dark:text-gray-300">{copy.detail.reviewNotes}</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{permission.reviewNotes}</p>
                </div>
              ) : null}
              {permission.reviewedBy?.name ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{copy.detail.reviewedBy}:</span> {permission.reviewedBy.name}
                </p>
              ) : null}
              {permission.reviewedAt ? (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{copy.detail.reviewedAt}:</span> {formatDate(permission.reviewedAt, locale)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-5 text-sm md:grid-cols-2 dark:border-gray-700">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">{copy.detail.created}</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.createdAt ? formatDate(permission.createdAt, locale) : copy.detail.fallbackDate}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">{copy.detail.updated}</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.updatedAt ? formatDate(permission.updatedAt, locale) : copy.detail.fallbackDate}
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="min-h-[20px] text-sm text-red-600 dark:text-red-300">
            {localActionError}
          </div>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" disabled={isReviewing}>{copy.actions.close}</Button>
            {isManager && permission.status === 'pending' && onApprove && onReject ? (
              <>
                <Button
                  onClick={() => { void handleReject(); }}
                  variant="outline"
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                  disabled={isReviewing}
                >
                  <XCircle className="h-4 w-4" />
                  {copy.actions.reject}
                </Button>
                <Button
                  onClick={() => { void handleApprove(); }}
                  className="gap-2 bg-green-600 text-white hover:bg-green-700"
                  disabled={isReviewing}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isReviewing ? copy.actions.submitting : copy.actions.approve}
                </Button>
              </>
            ) : null}
            {!isManager && permission.status === 'pending' && onDelete ? (
              <Button
                onClick={() => { void handleDelete(); }}
                variant="outline"
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                disabled={isReviewing}
              >
                <Trash2 className="h-4 w-4" />
                {copy.actions.delete}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
