import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  TableHead,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { ProductsTranslations } from '../translations';
import type { ProductSortColumn, ProductSortState } from '../types/productosTypes';

export type ProductColumn = {
  id: string;
  label: string;
  className: string;
  sortColumn?: ProductSortColumn;
};

type ProductTableHeaderProps = {
  columns: ProductColumn[];
  sortState: ProductSortState;
  t: ProductsTranslations;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onSort: (columnId: ProductSortColumn) => void;
  onToggleAllVisible: (checked: boolean) => void;
};

function ProductSortableHeader({
  column,
  sortState,
  onSort,
}: {
  column: ProductColumn;
  sortState: ProductSortState;
  onSort: (columnId: ProductSortColumn) => void;
}) {
  const isActive = sortState.columnId === column.id;
  const SortIcon = isActive ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  if (!column.sortColumn) {
    return (
      <span className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-300">
        {column.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-left text-xs font-bold uppercase tracking-normal text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      onClick={() => column.sortColumn && onSort(column.sortColumn)}
    >
      <span>{column.label}</span>
      <SortIcon className={cn('h-3.5 w-3.5', isActive ? 'text-[#FF6B5E]' : 'text-slate-400')} />
    </button>
  );
}

export function ProductTableHeader({
  columns,
  sortState,
  t,
  allVisibleSelected,
  someVisibleSelected,
  onSort,
  onToggleAllVisible,
}: ProductTableHeaderProps) {
  return (
    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
      <TableHead className="w-[56px] px-5 py-4">
        <Checkbox
          aria-label={t.table.selection.selectVisible}
          checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
          className="border-slate-300 data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
          onCheckedChange={(checked) => onToggleAllVisible(checked === true)}
        />
      </TableHead>
      <TableHead className="w-[88px] px-5 py-4 text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-300">
        {t.table.columns.cover}
      </TableHead>
      {columns.map((column) => (
        <TableHead key={column.id} className={cn('px-5 py-4', column.className)}>
          <ProductSortableHeader column={column} sortState={sortState} onSort={onSort} />
        </TableHead>
      ))}
      <TableHead className="w-[250px] px-5 py-4 text-right text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-300">
        {t.table.columns.actions}
      </TableHead>
    </TableRow>
  );
}
