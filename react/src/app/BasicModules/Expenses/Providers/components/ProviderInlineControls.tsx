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

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export const inlineInputBaseClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-slate-600 dark:focus:ring-slate-700';

const emptySelectValue = '__provider_empty_value__';

const providerTableSelectTriggerClass =
  'h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-none transition-colors hover:border-slate-300 hover:bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 data-[state=open]:border-slate-300 data-[state=open]:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:border-slate-600 dark:focus:ring-slate-700 dark:data-[state=open]:border-slate-600 dark:data-[state=open]:bg-slate-800';

const providerTableSelectContentClass =
  'max-h-72 rounded-xl border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900';

export function EditableSelect<T extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  value: T;
}) {
  const selectValue = value === '' ? emptySelectValue : value;
  const normalizedOptions = options.map(option => ({
    ...option,
    normalizedValue: option.value === '' ? emptySelectValue : option.value,
  }));

  return (
    <Select
      value={selectValue}
      onValueChange={(nextValue) => onChange((nextValue === emptySelectValue ? '' : nextValue) as T)}
    >
      <SelectTrigger aria-label={ariaLabel} className={cn(providerTableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={providerTableSelectContentClass}>
        {normalizedOptions.map(option => (
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

export function ReadonlyPill({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:ring-slate-700"
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}
