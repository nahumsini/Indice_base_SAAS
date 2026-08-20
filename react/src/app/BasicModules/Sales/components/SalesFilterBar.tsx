import {
  getIndiceFilterControlClassName,
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  type IndiceFilterOption,
} from '../../../components/frontend-os';
import type { ReactNode } from 'react';

export type SalesFilterOption = IndiceFilterOption;

export const salesFilterControlClassName = getIndiceFilterControlClassName('coral');

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
  return <IndiceFilterBar className={className} gridClassName={gridClassName} summary={summary} title={title}>{children}</IndiceFilterBar>;
}

export function SalesFilterSearch({
  className,
  clearLabel,
  inputClassName,
  label,
  onClear,
  onValueChange,
  placeholder,
  value,
}: {
  className?: string;
  clearLabel?: string;
  inputClassName?: string;
  label: string;
  onClear?: () => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <IndiceFilterSearch
      className={className}
      clearLabel={clearLabel}
      inputClassName={inputClassName}
      label={label}
      onClear={onClear}
      onValueChange={onValueChange}
      placeholder={placeholder}
      tone="coral"
      value={value}
    />
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
  return (
    <IndiceFilterSelect
      className={className}
      label={label}
      onValueChange={onValueChange}
      options={options}
      tone="coral"
      triggerClassName={triggerClassName}
      value={value}
    />
  );
}
