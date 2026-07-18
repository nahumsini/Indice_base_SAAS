import { useId, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../components/ui/utils';

export type SalesFilterOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

export const salesFilterControlClassName =
  'h-11 w-full rounded-xl border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-none transition-colors placeholder:text-slate-400 focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500';

export function SalesFilterBar({
  children,
  className,
  gridClassName,
  summary,
  title,
}: {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
  summary?: ReactNode;
  title: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h3>
        {summary ? <div className="text-sm font-medium text-slate-500 dark:text-slate-300">{summary}</div> : null}
      </div>
      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', gridClassName)}>
        {children}
      </div>
    </section>
  );
}

export function SalesFilterSearch({
  className,
  inputClassName,
  label,
  onValueChange,
  placeholder,
  value,
}: {
  className?: string;
  inputClassName?: string;
  label: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const inputId = useId();

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className={cn(salesFilterControlClassName, 'pl-10', inputClassName)}
        />
      </div>
    </div>
  );
}

export function SalesFilterSelect({
  className,
  label,
  onValueChange,
  options,
  triggerClassName,
  value,
}: {
  className?: string;
  label: string;
  onValueChange: (value: string) => void;
  options: SalesFilterOption[];
  triggerClassName?: string;
  value: string;
}) {
  const labelId = useId();

  return (
    <div className={cn('space-y-2', className)}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-labelledby={labelId}
          className={cn(salesFilterControlClassName, 'px-4', triggerClassName)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
