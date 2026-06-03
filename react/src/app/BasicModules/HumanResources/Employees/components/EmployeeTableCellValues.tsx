import {
  Calendar,
  FileText,
  Mail,
  Phone,
} from 'lucide-react';
import type { EmployeeDocumentType } from './CreateEmployeeModal';
import { currencyFormatter } from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import type { EmployeeViewModel } from '../types/employees.types';
import {
  formatDate,
  getEmployeeInitials,
  getStatusClasses,
} from '../utils/employees.utils';
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
}: {
  documentType: EmployeeDocumentType;
  employee: EmployeeViewModel;
  labels: EmployeesTranslations['documentStatusLabels'];
}) {
  const document = employee.documents[documentType];
  const isUploaded = Boolean(document);
  const isImage = Boolean(
    document?.downloadUrl &&
    (document.mimeType.startsWith('image/') || /\.(?:jpe?g|png|webp|gif)$/i.test(document.fileName)),
  );

  if (documentType === 'profile_photo' && isImage && document) {
    return (
      <a
        href={document.downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-w-[180px] items-center gap-3"
      >
        <img
          src={document.downloadUrl}
          alt={document.fileName}
          className="h-12 w-12 rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-slate-700"
          loading="lazy"
        />
        <span className="max-w-[160px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
          {document.fileName}
        </span>
      </a>
    );
  }

  return (
    <div className="min-w-[180px]">
      <span
        className={cn(
          'inline-flex rounded-full border px-3 py-1 text-sm font-semibold',
          isUploaded
            ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
        )}
      >
        {isUploaded ? (
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {labels.uploaded}
          </span>
        ) : labels.missing}
      </span>
      {document ? (
        document.downloadUrl ? (
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block max-w-[220px] truncate text-sm text-[#3AAE90] hover:text-[#25816A] dark:text-blue-300 dark:hover:text-blue-200"
          >
            {document.fileName}
          </a>
        ) : (
          <p className="mt-1 max-w-[220px] truncate text-sm text-slate-500 dark:text-slate-400">
            {document.fileName}
          </p>
        )
      ) : null}
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
    ? `${currencyFormatter.format(employee.hourlyRate)} / hr`
    : currencyFormatter.format(employee.salary);

  return <span className="text-base font-semibold text-slate-900 dark:text-white">{salaryValue}</span>;
}

export function EmployeeCurrencyCell({ value }: { value: number }) {
  return <span className="text-base font-semibold text-slate-900 dark:text-white">{currencyFormatter.format(value)}</span>;
}

export function EmployeePayPeriodCell({ label }: { label: string }) {
  return (
    <span className="inline-flex min-w-[112px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
      {label}
    </span>
  );
}
