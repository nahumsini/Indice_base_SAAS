import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PackagePlus,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../types';

export type QuoteSortColumn = 'number' | 'client' | 'opportunity' | 'status' | 'amount' | 'created' | 'expiration' | 'seller' | 'updated' | 'files';
export type QuoteSortDirection = 'asc' | 'desc';

export type QuoteSortState = {
  columnId: QuoteSortColumn;
  direction: QuoteSortDirection;
};

const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20';

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn('h-11 rounded-lg px-4 text-base font-semibold text-slate-950', coralFieldClassName)}>
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

export function QuotePipelineMetric({
  icon,
  value,
  label,
  valueClassName = 'text-slate-950',
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
        {icon}
      </span>
      <span className="text-base font-semibold">
        <span className={cn('mr-2 font-bold', valueClassName)}>{value}</span>
        <span className="text-slate-600">{label}</span>
      </span>
    </span>
  );
}

export function QuoteSortableHeader({
  columnId,
  label,
  sortState,
  onSort,
}: {
  columnId: QuoteSortColumn;
  label: string;
  sortState: QuoteSortState;
  onSort: (columnId: QuoteSortColumn) => void;
}) {
  const isActive = sortState.columnId === columnId;
  const SortIcon = isActive ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-950"
      onClick={() => onSort(columnId)}
    >
      <span>{label}</span>
      <SortIcon className={cn('h-3.5 w-3.5', isActive ? 'text-[#FF6B5E]' : 'text-slate-400')} />
    </button>
  );
}

export function QuoteSellerSelect({
  value,
  options,
  selectedLabel,
  fallbackLabel,
  onValueChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  selectedLabel: string;
  fallbackLabel: string;
  onValueChange: (value: string) => void;
}) {
  const rowOptions = options.some((option) => option.value === value)
    ? options
    : [{ value, label: selectedLabel || fallbackLabel }, ...options];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-10 min-w-[190px] rounded-full border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20">
        <SelectValue placeholder={fallbackLabel} />
      </SelectTrigger>
      <SelectContent>
        {rowOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function QuoteAction({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/20',
        className,
      )}
    >
      {icon}
    </button>
  );
}

export function QuoteProductCard({
  product,
  label,
  typeLabel,
  priceLabel,
  onAdd,
}: {
  product: SalesCatalogItem;
  label: string;
  typeLabel: string;
  priceLabel: string;
  onAdd: () => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{product.name}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{product.sku}</p>
        </div>
        <Button size="sm" className="h-8 rounded-lg bg-[#FF6B5E] px-3 text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]" onClick={onAdd}>
          <PackagePlus className="h-3.5 w-3.5" />
          {label}
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-500">{typeLabel}</span>
        <span className="font-black text-slate-950">{priceLabel}</span>
      </div>
    </article>
  );
}
