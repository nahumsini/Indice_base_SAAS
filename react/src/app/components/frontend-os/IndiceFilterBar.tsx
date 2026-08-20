import { Search, X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { IndiceModuleTone } from '../../styles/moduleColors';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';

export type IndiceFilterOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

const focusClasses: Record<IndiceModuleTone, string> = {
  aqua: 'focus-visible:border-[#59C3A5] focus-visible:ring-[#59C3A5]/20',
  blue: 'focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20',
  coral: 'focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20',
  gold: 'focus-visible:border-[#F4C84A] focus-visible:ring-[#F4C84A]/20',
  gray: 'focus-visible:border-slate-500 focus-visible:ring-slate-500/20',
  green: 'focus-visible:border-[#147514] focus-visible:ring-[#147514]/20',
  orange: 'focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20',
  purple: 'focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20',
  red: 'focus-visible:border-[#EF4444] focus-visible:ring-[#EF4444]/20',
  yellow: 'focus-visible:border-[#F4C84A] focus-visible:ring-[#F4C84A]/20',
};

const segmentedActiveClasses: Record<IndiceModuleTone, string> = {
  aqua: 'border-[#59C3A5] bg-[#59C3A5]/15 text-[#176B5B]',
  blue: 'border-[#2563EB] bg-[#2563EB]/10 text-[#1D4ED8]',
  coral: 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831]',
  gold: 'border-[#F4C84A] bg-[#F4C84A]/20 text-[#8A6500]',
  gray: 'border-slate-500 bg-slate-200 text-slate-800',
  green: 'border-[#147514] bg-[#147514]/10 text-[#147514]',
  orange: 'border-[#FF6B5E] bg-[#FF6B5E]/15 text-[#B63B32]',
  purple: 'border-[#2563EB] bg-[#2563EB]/10 text-[#1D4ED8]',
  red: 'border-[#EF4444] bg-[#EF4444]/10 text-[#B91C1C]',
  yellow: 'border-[#F4C84A] bg-[#F4C84A]/20 text-[#8A6500]',
};

export const indiceFilterControlBaseClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-none outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500';

export function getIndiceFilterControlClassName(tone: IndiceModuleTone) {
  return cn(indiceFilterControlBaseClassName, focusClasses[tone]);
}

export function IndiceFilterBar({
  children,
  className,
  gridClassName,
  summary,
  subtitle,
  title,
}: {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
  summary?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section
      aria-label={typeof title === 'string' ? title : undefined}
      className={cn(
        'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800',
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-slate-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {summary ? <div className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-300">{summary}</div> : null}
      </div>
      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', gridClassName)}>{children}</div>
    </section>
  );
}

export function IndiceFilterField({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: ReactNode;
}) {
  return (
    <label className={cn('min-w-0 space-y-2', className)}>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

export function IndiceFilterSearch({
  className,
  clearLabel,
  inputClassName,
  label,
  onValueChange,
  onClear,
  placeholder,
  tone,
  value,
}: {
  className?: string;
  clearLabel?: string;
  inputClassName?: string;
  label: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  tone: IndiceModuleTone;
  value: string;
}) {
  const inputId = useId();

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className={cn(getIndiceFilterControlClassName(tone), 'pl-10', onClear && value ? 'pr-10' : undefined, inputClassName)}
        />
        {onClear && value ? (
          <button
            type="button"
            aria-label={clearLabel ?? label}
            onClick={onClear}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function IndiceFilterSelect({
  className,
  label,
  onValueChange,
  options,
  tone,
  triggerClassName,
  value,
}: {
  className?: string;
  label: string;
  onValueChange: (value: string) => void;
  options: IndiceFilterOption[];
  tone: IndiceModuleTone;
  triggerClassName?: string;
  value: string;
}) {
  const labelId = useId();

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-labelledby={labelId}
          className={cn(getIndiceFilterControlClassName(tone), 'px-4', triggerClassName)}
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

export function IndiceFilterSegmented({
  className,
  label,
  onValueChange,
  options,
  tone,
  value,
}: {
  className?: string;
  label: string;
  onValueChange: (value: string) => void;
  options: IndiceFilterOption[];
  tone: IndiceModuleTone;
  value: string;
}) {
  const labelId = useId();

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex min-h-11 flex-wrap overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              disabled={option.disabled}
              onClick={() => onValueChange(option.value)}
              className={cn(
                'min-h-11 min-w-[7rem] flex-1 border border-transparent px-4 text-sm font-medium transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
                focusClasses[tone],
                active
                  ? segmentedActiveClasses[tone]
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
