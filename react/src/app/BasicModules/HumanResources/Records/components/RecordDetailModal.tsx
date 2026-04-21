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
  X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { EmployeeRecord, RecordSeverity, RecordStatus, RecordType } from '../types/records.types';

interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EmployeeRecord | null;
  onEdit: (record: EmployeeRecord) => void;
  onDelete: (recordId: string) => Promise<void> | void;
}

const typeConfig: Record<RecordType, { label: string; color: string; bgColor: string; icon: ReactNode }> = {
  incident: {
    label: 'Incident',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  warning: {
    label: 'Warning',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  recognition: {
    label: 'Recognition',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: <Award className="h-4 w-4" />,
  },
  observation: {
    label: 'Observation',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: <EyeIcon className="h-4 w-4" />,
  },
  training: {
    label: 'Training',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    icon: <GraduationCap className="h-4 w-4" />,
  },
};

const severityConfig: Record<RecordSeverity, { label: string; color: string; bgColor: string }> = {
  low: {
    label: 'Low',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  },
  high: {
    label: 'High',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  },
};

const statusConfig: Record<RecordStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: 'Pending',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  },
  reviewed: {
    label: 'Reviewed',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
};

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

export function RecordDetailModal({ isOpen, onClose, record, onEdit, onDelete }: RecordDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !record) {
    return null;
  }

  const typeInfo = typeConfig[record.type];
  const statusInfo = statusConfig[record.status];
  const severityInfo = record.severity ? severityConfig[record.severity] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${typeInfo.bgColor} ${typeInfo.color}`}>
                {typeInfo.icon}
                {typeInfo.label}
              </span>
              <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {severityInfo ? (
                <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${severityInfo.bgColor} ${severityInfo.color}`}>
                  {severityInfo.label}
                </span>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">{record.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {record.recordNumber || `Record #${record.id}`}
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-500 p-3 shadow-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Employee Information</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{record.employee.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{record.employee.position}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{record.employee.department}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Event Date</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(record.eventDate)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-600 dark:bg-gray-700/50">
              <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Reported By</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{record.reportedBy.name}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Description</h3>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
              {record.description}
            </p>
          </div>

          {record.actionsTaken ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Pencil className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Actions Taken</h3>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                {record.actionsTaken}
              </p>
            </div>
          ) : null}

          {record.witnesses?.length ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Witnesses</h3>
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
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Download className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attachments</h3>
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
                      className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
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
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">Created:</span>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(record.createdAt)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/30">
              <span className="mb-1 block font-medium text-gray-600 dark:text-gray-400">Last Updated:</span>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(record.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <Button
            variant="outline"
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
            onClick={async () => {
              if (window.confirm('Delete this record?')) {
                setIsDeleting(true);
                try {
                  await onDelete(record.id);
                  onClose();
                } finally {
                  setIsDeleting(false);
                }
              }
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => onEdit(record)}
            >
              <Pencil className="h-4 w-4" />
              Edit record
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
