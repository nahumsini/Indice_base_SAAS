import { BadgeDollarSign, Calendar, CheckCircle, Clock, Download, FileText, Printer, ShieldCheck, Trash2, User, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import { Textarea } from '../../../../components/ui/textarea';
import type { PermissionItem } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';
import { printPermissionAuthorization } from '../utils/permissionPrintDocument';

interface PermissionDetailModalProps {
  copy: PermissionsTranslations;
  isOpen: boolean;
  locale: string;
  onClose: () => void;
  permission: PermissionItem | null;
  onApprove?: (id: string, reviewNotes?: string) => Promise<void>;
  onReject?: (id: string, reviewNotes?: string) => Promise<void>;
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

const payrollTreatmentConfig: Record<PermissionItem['payrollTreatment'], { color: string; bgColor: string }> = {
  paid: { color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
  unpaid: { color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
};

const parseDisplayDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
};

const formatDate = (value: string | undefined, locale: string, fallback = '-') => {
  if (!value) {
    return fallback;
  }

  const date = parseDisplayDate(value);

  if (Number.isNaN(date.getTime())) {
    return value || fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

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
  const [reviewNotes, setReviewNotes] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setLocalActionError('');
    setReviewNotes('');
    setIsDeleteConfirmOpen(false);
  }, [isOpen, permission?.id]);

  if (!isOpen || !permission) {
    return null;
  }

  const typeInfo = typeConfig[permission.type] ?? typeConfig.other;
  const statusInfo = statusConfig[permission.status] ?? statusConfig.pending;
  const payrollTreatmentInfo = payrollTreatmentConfig[permission.payrollTreatment] ?? payrollTreatmentConfig.paid;
  const typeLabel = copy.types[permission.type] ?? copy.types.other;
  const statusLabel = copy.status[permission.status] ?? copy.status.pending;
  const payrollTreatmentLabel = copy.payrollTreatment[permission.payrollTreatment] ?? copy.payrollTreatment.paid;
  const attachments = permission.attachments ?? [];
  const trimmedReviewNotes = reviewNotes.trim();

  const handleApprove = async () => {
    if (!onApprove || isReviewing) {
      return;
    }

    setLocalActionError('');

    try {
      await onApprove(permission.id, trimmedReviewNotes || undefined);
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
      await onReject(permission.id, trimmedReviewNotes || undefined);
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
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      setLocalActionError(error instanceof Error ? error.message : '');
    }
  };

  return (
    <IndiceModalFrame
      busy={isReviewing}
      closeLabel={copy.actions.close}
      contentClassName="sm:max-w-4xl"
      description={isDeleteConfirmOpen ? copy.actions.delete : copy.detail.folio(permission.folio)}
      footer={isDeleteConfirmOpen ? (
        <>
          <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isReviewing}>{copy.actions.close}</Button>
          <Button onClick={() => { void handleDelete(); }} disabled={isReviewing}>
            <Trash2 className="h-4 w-4" />
            {copy.actions.delete}
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={onClose} disabled={isReviewing}>{copy.actions.close}</Button>
          <Button
            variant="outline"
            onClick={() => printPermissionAuthorization({ copy, locale, permission })}
            disabled={isReviewing}
          >
            <Printer className="h-4 w-4" />
            Imprimir autorización
          </Button>
          {isManager && permission.status === 'pending' && onApprove && onReject ? (
            <>
              <Button variant="outline" onClick={() => { void handleReject(); }} disabled={isReviewing}>
                <XCircle className="h-4 w-4" />
                {copy.actions.reject}
              </Button>
              <Button onClick={() => { void handleApprove(); }} disabled={isReviewing}>
                <CheckCircle className="h-4 w-4" />
                {isReviewing ? copy.actions.submitting : copy.actions.approve}
              </Button>
            </>
          ) : null}
          {!isManager && permission.status === 'pending' && onDelete ? (
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isReviewing}>
              <Trash2 className="h-4 w-4" />
              {copy.actions.delete}
            </Button>
          ) : null}
        </>
      )}
      footerSummary={localActionError || undefined}
      icon={isDeleteConfirmOpen ? <Trash2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
      modalType={isDeleteConfirmOpen ? 'confirmation' : 'standard-form'}
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={isDeleteConfirmOpen ? copy.actions.delete : copy.detail.title}
      tone="aqua"
    >
      {isDeleteConfirmOpen ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {copy.actions.delete}: {typeLabel} · {permission.employee.name}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>{typeLabel}</span>
            <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>{statusLabel}</span>
            <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium ${payrollTreatmentInfo.bgColor} ${payrollTreatmentInfo.color}`}>{payrollTreatmentLabel}</span>
          </div>
          <div className="rounded-2xl border border-[#59C3A5]/25 bg-[#59C3A5]/5 p-6 dark:bg-[#59C3A5]/10">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#59C3A5] p-3 shadow-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{copy.detail.employeeInformation}</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{permission.employee.name}</p>
                {permission.employee.position ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{permission.employee.position}</p>
                ) : null}
                {permission.employee.department ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{permission.employee.department}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.startDate}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(permission.startDate, locale)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.endDate}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(permission.endDate, locale)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.duration}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission.days} {permission.days === 1 ? copy.detail.day : copy.detail.days}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.type}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{typeLabel}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <BadgeDollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.payrollTreatment}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{payrollTreatmentLabel}</p>
            </div>
          </div>

          {permission.reason ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{copy.detail.reason}</h3>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                {permission.reason}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Download className="h-5 w-5" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{copy.detail.attachments}</h3>
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{statusLabel}</h3>
              </div>
              {permission.reviewNotes ? (
                <div className="mb-3">
                  <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">{copy.detail.reviewNotes}</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{permission.reviewNotes}</p>
                </div>
              ) : null}
              {permission.reviewedBy?.name ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{copy.detail.reviewedBy}:</span> {permission.reviewedBy.name}
                </p>
              ) : null}
              {permission.reviewedAt ? (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{copy.detail.reviewedAt}:</span> {formatDate(permission.reviewedAt, locale)}
                </p>
              ) : null}
            </div>
          ) : null}

          {isManager && permission.status === 'pending' && onApprove && onReject ? (
            <div className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-6 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
              <div className="mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <CheckCircle className="h-5 w-5 text-[#159A7D]" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">{copy.detail.reviewNotes}</h3>
              </div>
              <Textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                rows={3}
                maxLength={1000}
                className="rounded-xl border-[#59C3A5]/20 bg-white dark:bg-slate-900"
              />
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
      )}
    </IndiceModalFrame>
  );
}
