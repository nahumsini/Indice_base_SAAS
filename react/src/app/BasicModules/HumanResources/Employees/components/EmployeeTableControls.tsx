import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type {
  Option,
  OrganizationSelectOption,
} from '../types/employees.types';

export function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Option<T>[];
  value: T;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function InlineTableSelect({
  disabled = false,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: OrganizationSelectOption[];
  placeholder: string;
  value: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-10 min-w-[190px] max-w-[320px] rounded-full border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-800 shadow-none transition hover:border-[#59C3A5]/40 hover:bg-[#59C3A5]/5 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-blue-300/50 dark:hover:bg-blue-950/30">
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="min-w-0 truncate">
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.badge ? (
            <span className="shrink-0 rounded-full bg-[#59C3A5]/10 px-2 py-0.5 text-[10px] font-medium text-[#59C3A5] dark:bg-blue-300/10 dark:text-blue-200">
              {selectedOption.badge}
            </span>
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[260px]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            <div className="flex min-w-0 flex-col gap-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{option.label}</span>
                {option.badge ? (
                  <span className="shrink-0 rounded-full bg-[#59C3A5]/10 px-2 py-0.5 text-[10px] font-medium text-[#59C3A5] dark:bg-blue-300/10 dark:text-blue-200">
                    {option.badge}
                  </span>
                ) : null}
              </div>
              {option.description ? (
                <span className="max-w-[240px] whitespace-normal text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmployeeTableActionButton({
  icon,
  label,
  onClick,
  toneClassName,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  toneClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/80',
        toneClassName,
      )}
    >
      {icon}
    </button>
  );
}
