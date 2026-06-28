import {
  Calendar,
  Eye,
  FileText,
  Image as ImageIcon,
  Mail,
  Phone,
  Upload,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { EmployeeDocumentType } from './CreateEmployeeModal';
import type { EmployeesTranslations } from '../translations';
import type { EmployeeViewModel } from '../types/employees.types';
import {
  formatDate,
  getEmployeeInitials,
  getStatusClasses,
} from '../utils/employees.utils';
import { formatEmployeeCurrencyAmount } from '../utils/employees.payroll';
import { cn } from '../../../../components/ui/utils';

export function EmployeeIdentityCell({ employee }: { employee: EmployeeViewModel }) {
  return (
    <div className="flex min-w-[250px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-sm font-bold text-[#59C3A5] dark:bg-[#59C3A5]/30 dark:text-blue-200">
        {getEmployeeInitials(employee)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-slate-900 dark:text-white">{employee.fullName}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{employee.code}</p>
      </div>
    </div>
  );
}

export function EmployeeTextCell({
  className = '',
  fallback,
  value,
}: {
  className?: string;
  fallback: string;
  value: string | number | null | undefined;
}) {
  return (
    <span className={cn('inline-flex min-w-[140px] whitespace-normal text-base text-slate-700 dark:text-slate-200', className)}>
      {value !== null && value !== undefined && String(value).trim() ? value : fallback}
    </span>
  );
}

export function EmployeeDateCell({
  fallback,
  locale,
  value,
}: {
  fallback: string;
  locale: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-[160px] items-center gap-2 text-base text-slate-700 dark:text-slate-200">
      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
      {formatDate(value, locale, fallback)}
    </span>
  );
}

export function EmployeeBooleanCell({
  fallback,
  labels,
  value,
}: {
  fallback: string;
  labels: EmployeesTranslations['binaryLabels'];
  value: boolean | null;
}) {
  if (value === null) {
    return <EmployeeTextCell fallback={fallback} value="" />;
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-sm font-semibold',
        value
          ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
      )}
    >
      {value ? labels.yes : labels.no}
    </span>
  );
}

export function EmployeeDocumentCell({
  documentType,
  employee,
  labels,
  onDocumentUpload,
  uploadingDocumentKey,
}: {
  documentType: EmployeeDocumentType;
  employee: EmployeeViewModel;
  labels: EmployeesTranslations['documentStatusLabels'];
  onDocumentUpload?: (
    employee: EmployeeViewModel,
    documentType: EmployeeDocumentType,
    file: File,
  ) => void | Promise<void>;
  uploadingDocumentKey?: string | null;
}) {
  const document = employee.documents[documentType];
  const isUploaded = Boolean(document);
  const documentKey = `${employee.id}:${documentType}`;
  const isUploading = uploadingDocumentKey === documentKey;
  const isImage = Boolean(
    document?.downloadUrl &&
    (document.mimeType.startsWith('image/') || /\.(?:jpe?g|png|webp|gif)$/i.test(document.fileName)),
  );
  const uploadLabel = isUploaded ? labels.replace : labels.upload;
  const viewLabel = isImage ? labels.viewImage : labels.view;
  const statusClassName = isUploaded
    ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300';
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file || !onDocumentUpload) {
      return;
    }

    void onDocumentUpload(employee, documentType, file);
  };

  return (
    <div className="min-w-[220px] space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        {isImage && document?.downloadUrl ? (
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noreferrer"
            title={viewLabel}
            aria-label={viewLabel}
            className="shrink-0"
          >
            <img
              src={document.downloadUrl}
              alt={document.fileName}
              className="h-10 w-10 rounded-xl border border-slate-200 object-cover shadow-sm dark:border-slate-700"
              loading="lazy"
            />
          </a>
        ) : (
          <span className={cn('inline-flex rounded-full border px-3 py-1 text-sm font-semibold', statusClassName)}>
            {isUploaded ? (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {labels.uploaded}
              </span>
            ) : labels.missing}
          </span>
        )}

        {document ? (
          document.downloadUrl ? (
            <a
              href={document.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 truncate text-sm font-semibold text-slate-700 hover:text-[#25816A] dark:text-slate-200 dark:hover:text-blue-200"
            >
              {document.fileName}
            </a>
          ) : (
            <p className="min-w-0 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
              {document.fileName}
            </p>
          )
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {document?.downloadUrl ? (
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noreferrer"
            title={viewLabel}
            aria-label={viewLabel}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#59C3A5]/30 bg-white px-3 text-xs font-bold text-[#177d66] transition hover:bg-[#59C3A5]/10 dark:border-[#59C3A5]/40 dark:bg-slate-900 dark:text-emerald-200"
          >
            {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {viewLabel}
          </a>
        ) : null}
        {onDocumentUpload ? (
          <label
            aria-disabled={isUploading}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition',
              isUploading
                ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                : 'border-slate-200 bg-white text-slate-700 hover:border-[#59C3A5]/40 hover:bg-[#59C3A5]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            {isUploading ? labels.uploading : uploadLabel}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={isUploading}
              onChange={handleFileChange}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function EmployeeEmailCell({ value }: { value: string }) {
  return (
    <div className="inline-flex min-w-[240px] items-center gap-2 break-all text-base text-slate-600 dark:text-slate-300">
      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
      {value || '-'}
    </div>
  );
}

export function EmployeePhoneCell({
  fallback = '-',
  value,
}: {
  fallback?: string;
  value: string;
}) {
  return (
    <div className="inline-flex min-w-[160px] items-center gap-2 text-base text-slate-600 dark:text-slate-300">
      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
      {value || fallback}
    </div>
  );
}

export function EmployeeStatusCell({
  copy,
  employee,
}: {
  copy: EmployeesTranslations;
  employee: EmployeeViewModel;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold', getStatusClasses(employee.status))}>
      {copy.statusLabels[employee.status]}
    </span>
  );
}

export function EmployeeSalaryCell({ employee }: { employee: EmployeeViewModel }) {
  const salaryValue = employee.salaryType === 'hourly'
    ? `${formatEmployeeCurrencyAmount(employee.hourlyRate, employee)} / hr`
    : formatEmployeeCurrencyAmount(employee.salary, employee);

  return <span className="text-base font-semibold text-slate-900 dark:text-white">{salaryValue}</span>;
}

export function EmployeeCurrencyCell({
  employee,
  value,
}: {
  employee: Pick<EmployeeViewModel, 'registrationCountry'>;
  value: number;
}) {
  return <span className="text-base font-semibold text-slate-900 dark:text-white">{formatEmployeeCurrencyAmount(value, employee)}</span>;
}

export function EmployeePayPeriodCell({ label }: { label: string }) {
  return (
    <span className="inline-flex min-w-[112px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
      {label}
    </span>
  );
}
