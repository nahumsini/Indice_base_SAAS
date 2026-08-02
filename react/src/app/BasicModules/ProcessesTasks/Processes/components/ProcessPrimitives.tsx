import { useEffect, useId, useState, type ReactNode } from 'react';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import type { Option } from '../types';

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors';

export function FilterSelect<T extends string>({
  label,
  className,
  onChange,
  options,
  value,
}: {
  label: string;
  className?: string;
  onChange: (value: T) => void;
  options: Option<T>[];
  value: T;
}) {
  const fieldId = useId();

  return (
    <div className={cn('space-y-2', className)}>
      <label id={`${fieldId}-label`} className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger aria-labelledby={`${fieldId}-label`} className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
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

export function InlineSelectField<T extends string>({
  value,
  options,
  onChange,
  className,
  renderValue,
  disabled,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
  renderValue?: (value: T) => ReactNode;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-10 min-w-[148px] rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
          className,
        )}
      >
        {renderValue ? renderValue(value) : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InlineTextCell({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const nextValue = draft.trim();
    if (nextValue === value) {
      return;
    }

    const didCommit = await onCommit(nextValue);
    if (!didCommit) {
      setDraft(value);
    }
  };

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void handleBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'h-10 min-w-[220px] rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400',
        className,
      )}
    />
  );
}

export function InlineTextareaCell({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const nextValue = draft.trim();
    if (nextValue === value) {
      return;
    }

    const didCommit = await onCommit(nextValue);
    if (!didCommit) {
      setDraft(value);
    }
  };

  return (
    <Textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void handleBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

export function ProcessActionButton({
  className,
  icon,
  label,
  onClick,
  disabled,
}: {
  className: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonBaseClass, className, disabled && 'cursor-not-allowed opacity-60')}
    >
      {icon}
    </button>
  );
}
