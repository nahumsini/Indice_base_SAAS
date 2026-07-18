import { type ReactNode, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  Download,
  Eye as EyeIcon,
  FileText,
  GraduationCap,
  Pencil,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import type { EmployeeRecord, RecordSeverity, RecordStatus, RecordType } from '../types/records.types';
import type { RecordDetailCopy } from '../translations';

interface RecordDetailModalProps {
  canManage: boolean;
  copy: RecordDetailCopy;
  isOpen: boolean;
  locale: string;
  onClose: () => void;
  record: EmployeeRecord | null;
  onDownload: (record: EmployeeRecord) => Promise<void> | void;
  onEdit: (record: EmployeeRecord) => void;
  onDelete: (recordId: string) => Promise<void> | void;
}

const typeConfig: Record<RecordType, { color: string; bgColor: string; icon: ReactNode }> = {
  incident: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  warning: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  recognition: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: <Award className="h-4 w-4" />,
  },
  observation: {
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: <EyeIcon className="h-4 w-4" />,
  },
  training: {
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    icon: <GraduationCap className="h-4 w-4" />,
  },
};

const severityConfig: Record<RecordSeverity, { color: string; bgColor: string }> = {
  low: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  medium: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  },
  high: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  },
};

const statusConfig: Record<RecordStatus, { color: string; bgColor: string }> = {
  pending: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  },
  reviewed: {
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  resolved: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
};

const formatDate = (value: string, locale: string) => new Intl.DateTimeFormat(locale, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

export function RecordDetailModal({
  canManage,
  copy,
  isOpen,
  locale,
  onClose,
  record,
  onDownload,
  onEdit,
  onDelete,
}: RecordDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!isOpen || !record) {
    return null;
  }

  const typeInfo = typeConfig[record.type];
  const statusInfo = statusConfig[record.status];
  const severityInfo = record.severity ? severityConfig[record.severity] : null;
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(record.id);
      setIsDeleteConfirmOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <IndiceModalFrame
      busy={isDeleting}
      closeLabel={copy.actions.close}
      contentClassName="sm:max-w-4xl"
      description={isDeleteConfirmOpen ? copy.detail.deleteConfirm : record.recordNumber || copy.detail.recordNumber(record.id)}
      footer={isDeleteConfirmOpen ? (
        <>
          <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>{copy.actions.close}</Button>
          <Button onClick={() => { void handleDelete(); }} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
            {isDeleting ? copy.actions.deleting : copy.actions.delete}
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={() => { void onDownload(record); }}>
            <Download className="h-4 w-4" />
            {copy.actions.downloadPdf}
          </Button>
          {canManage ? (
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" />
              {copy.actions.delete}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>{copy.actions.close}</Button>
          {canManage ? (
            <Button onClick={() => onEdit(record)}>
              <Pencil className="h-4 w-4" />
              {copy.actions.editRecord}
            </Button>
          ) : null}
        </>
      )}
      icon={isDeleteConfirmOpen ? <Trash2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      modalType={isDeleteConfirmOpen ? 'confirmation' : 'standard-form'}
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={isDeleteConfirmOpen ? copy.actions.delete : record.title}
      tone="aqua"
    >
      {isDeleteConfirmOpen ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {copy.detail.deleteConfirm}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
              {typeInfo.icon}
              {copy.types[record.type]}
            </span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
              {copy.status[record.status]}
            </span>
            {severityInfo ? (
              <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${severityInfo.bgColor} ${severityInfo.color}`}>
                {copy.severity[record.severity!]}
              </span>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[#DCEFEA] bg-white p-6 dark:border-white/10 dark:bg-[#10231F]">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[#59C3A5] p-3 shadow-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.employeeInformation}</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{record.user.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{record.user.position}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{record.user.department}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#DCEFEA] bg-white p-5 dark:border-white/10 dark:bg-[#10231F]">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.eventDate}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(record.eventDate, locale)}</p>
            </div>
            <div className="rounded-2xl border border-[#DCEFEA] bg-white p-5 dark:border-white/10 dark:bg-[#10231F]">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">{copy.detail.reportedBy}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{record.reportedBy.name}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCEFEA] bg-white p-6 dark:border-white/10 dark:bg-[#10231F]">
            <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.description}</h3>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
              {record.description}
            </p>
          </div>

          {record.actionsTaken ? (
            <div className="rounded-2xl border border-[#DCEFEA] bg-white p-6 dark:border-white/10 dark:bg-[#10231F]">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Pencil className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.actionsTaken}</h3>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                {record.actionsTaken}
              </p>
            </div>
          ) : null}

          {record.witnesses?.length ? (
            <div className="rounded-2xl border border-[#DCEFEA] bg-white p-6 dark:border-white/10 dark:bg-[#10231F]">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.witnesses}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {record.witnesses.map((witness) => (
                  <span
                    key={witness}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-300"
                  >
                    {witness}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {record.attachments?.length ? (
            <div className="rounded-2xl border border-[#DCEFEA] bg-white p-6 dark:border-white/10 dark:bg-[#10231F]">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Download className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{copy.detail.attachments}</h3>
              </div>
              <div className="space-y-2">
                {record.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{attachment.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(attachment.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (attachment.url) {
                          window.open(attachment.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="rounded-lg p-2 text-[#1F8A70] transition-colors hover:bg-[#EAF8F4] dark:text-[#9BE4D0] dark:hover:bg-[#13362F]"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-5 text-sm md:grid-cols-2 dark:border-gray-700">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">{copy.detail.created}</span>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(record.createdAt, locale)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">{copy.detail.lastUpdated}</span>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(record.updatedAt, locale)}</p>
            </div>
          </div>
        </div>
      )}
    </IndiceModalFrame>
  );
}
