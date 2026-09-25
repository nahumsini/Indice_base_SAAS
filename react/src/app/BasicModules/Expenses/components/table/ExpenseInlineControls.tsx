import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { ExpenseStatus } from '../../types/expenses.types';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  businessId?: string;
  unitId?: string;
};

export const readonlyCellClass = 'text-sm text-gray-900 dark:text-gray-100';

const inlineInputBaseClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-slate-600 dark:focus:ring-slate-700';

const emptySelectValue = '__expense_empty_value__';

const tableSelectTriggerClass =
  'h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-none transition-colors hover:border-slate-300 hover:bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 data-[state=open]:border-slate-300 data-[state=open]:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:border-slate-600 dark:focus:ring-slate-700 dark:data-[state=open]:border-slate-600 dark:data-[state=open]:bg-slate-800';

const tableSelectContentClass =
  'max-h-72 rounded-xl border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900';

export const formatDateInputValue = (date?: Date | null): string => {
  if (!date || !Number.isFinite(date.getTime())) return '';
  return new Date(date).toISOString().slice(0, 10);
};

export const toDateValue = (value: string): Date | undefined => {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
};

export const getStatusBadgeColor = (status: ExpenseStatus) => {
  switch (status) {
    case 'paid':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300';
    case 'partial':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300';
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300';
    case 'audited':
      return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  }
};

export function EditableSelect<T extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  value: T;
}) {
  const selectValue = value === '' ? emptySelectValue : value;
  const normalizedOptions = options.map(option => ({
    ...option,
    normalizedValue: option.value === '' ? emptySelectValue : option.value,
  }));

  return (
    <Select value={selectValue} onValueChange={(nextValue) => onChange((nextValue === emptySelectValue ? '' : nextValue) as T)}>
      <SelectTrigger aria-label={ariaLabel} className={cn(tableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={tableSelectContentClass}>
        {normalizedOptions.map((option) => (
          <SelectItem key={`${option.normalizedValue}-${option.label}`} value={option.normalizedValue} className="text-sm font-medium">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EditableTextInput({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return <input aria-label={ariaLabel} className={inlineInputBaseClass} placeholder={placeholder} type="text" value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function EditableTextarea({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return <textarea aria-label={ariaLabel} className={`${inlineInputBaseClass} min-h-20 resize-none leading-relaxed`} placeholder={placeholder} rows={3} value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function EditableDatePicker({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return <input aria-label={ariaLabel} className={inlineInputBaseClass} type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function ReadonlyPill({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-sm font-medium leading-5 text-slate-800 whitespace-normal break-words transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
    >
      {children}
    </button>
  );
}

export function ReadonlySelectPill({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-medium leading-5 text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:ring-slate-700"
    >
      <span className="min-w-0 flex-1 whitespace-normal break-words">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}
