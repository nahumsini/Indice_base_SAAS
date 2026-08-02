import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { TableHead } from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';

type SortDirection = 'asc' | 'desc';

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function ProjectActionButton({
  className,
  disabled,
  icon,
  label,
  onClick,
}: {
  className: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonBaseClass, className)}
    >
      {icon}
    </button>
  );
}

export function SortableTableHead<TColumnId extends string>({
  column,
  onSort,
  sortState,
}: {
  column: ColumnConfig;
  onSort: (columnId: TColumnId) => void;
  sortState: {
    columnId: TColumnId;
    direction: SortDirection;
  };
}) {
  const columnId = column.id as TColumnId;
  const isActiveSort = sortState.columnId === columnId;
  const SortIcon = isActiveSort ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className="px-4 py-4">
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-slate-500 transition-colors hover:text-[#9A6B05] dark:text-slate-400"
        onClick={() => onSort(columnId)}
      >
        <span className="truncate">{column.label}</span>
        <SortIcon
          className={cn('h-4 w-4 shrink-0', isActiveSort ? 'text-[#9A6B05]' : 'text-slate-400')}
        />
      </button>
    </TableHead>
  );
}
