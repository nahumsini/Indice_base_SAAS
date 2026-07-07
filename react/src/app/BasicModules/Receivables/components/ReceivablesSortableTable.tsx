import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { TableHead } from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';

export type ReceivablesSortDirection = 'asc' | 'desc';

export type ReceivablesSortState<ColumnId extends string> = {
  columnId: ColumnId;
  direction: ReceivablesSortDirection;
};

const receivablesTableCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export function normalizeReceivablesColumns(columns: ColumnConfig[], defaultColumns: ColumnConfig[]) {
  const currentById = new Map(columns.map((column) => [column.id, column]));
  const defaultById = new Map(defaultColumns.map((column) => [column.id, column]));
  const orderedCurrentColumns = columns
    .filter((column) => defaultById.has(column.id))
    .map((column) => {
      const defaultColumn = defaultById.get(column.id)!;
      return {
        ...defaultColumn,
        visible: defaultColumn.locked ? true : column.visible,
      };
    });
  const missingColumns = defaultColumns.filter((column) => !currentById.has(column.id));

  return [...orderedCurrentColumns, ...missingColumns];
}

export function readReceivablesColumns(storageKey: string, defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const storedColumns = window.localStorage.getItem(storageKey);
    if (!storedColumns) {
      return defaultColumns;
    }

    const parsedColumns = JSON.parse(storedColumns) as ColumnConfig[];
    return Array.isArray(parsedColumns)
      ? normalizeReceivablesColumns(parsedColumns, defaultColumns)
      : defaultColumns;
  } catch {
    return defaultColumns;
  }
}

export function persistReceivablesColumns(storageKey: string, columns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(columns));
}

export function sortReceivablesRows<Row, ColumnId extends string>(
  rows: Row[],
  sortState: ReceivablesSortState<ColumnId>,
  getSortValue: (row: Row, columnId: ColumnId) => number | string | null | undefined,
) {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = getSortValue(left, sortState.columnId);
    const rightValue = getSortValue(right, sortState.columnId);
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : receivablesTableCollator.compare(String(leftValue ?? ''), String(rightValue ?? ''));

    return comparison * directionMultiplier;
  });
}

function ReceivablesSortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: ReceivablesSortDirection;
}) {
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp className={cn('-mb-1 h-3 w-3', active && direction === 'asc' ? 'text-[#147514]' : 'text-slate-400')} />
      <ChevronDown className={cn('-mt-1 h-3 w-3', active && direction === 'desc' ? 'text-[#147514]' : 'text-slate-400')} />
    </span>
  );
}

export function SortableReceivablesHead<ColumnId extends string>({
  align = 'left',
  column,
  onSort,
  sortState,
}: {
  align?: 'left' | 'right';
  column: ColumnConfig;
  onSort: (columnId: ColumnId) => void;
  sortState: ReceivablesSortState<ColumnId>;
}) {
  const columnId = column.id as ColumnId;
  const active = sortState.columnId === columnId;

  return (
    <TableHead className={cn('px-5 py-4 text-xs font-bold text-slate-500', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(columnId)}
        className={cn(
          'inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 transition hover:text-[#147514] dark:text-slate-400 dark:hover:text-emerald-300',
          align === 'right' && 'justify-end',
        )}
      >
        <span>{column.label}</span>
        <ReceivablesSortIcon active={active} direction={sortState.direction} />
      </button>
    </TableHead>
  );
}
