import type { MouseEvent as ReactMouseEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import { TableHead, TableRow } from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesColumnId } from '../types/salesTypes';
import {
  defaultSalesColumnWidths,
  sortableSalesColumns,
  type SalesSortState,
  type SortableSalesColumnId,
} from '../utils/salesTableColumns';

function SalesColumnResizeHandle({
  column,
  label,
  width,
  t,
  onResizeColumn,
}: {
  column: SalesColumnId;
  label: string;
  width: number;
  t: SalesRecordsTranslations;
  onResizeColumn: (column: SalesColumnId, width: number) => void;
}) {
  const handleMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(420, Math.max(120, startWidth + moveEvent.clientX - startX));
      onResizeColumn(column, nextWidth);
    };

    const stopResize = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResize);
  };

  return (
    <button
      type="button"
      aria-label={t.table.resizeColumn(label)}
      className="absolute right-0 top-1/2 h-8 w-2 -translate-y-1/2 cursor-col-resize rounded-full transition-colors hover:bg-[#FF6B5E]/35 focus-visible:bg-[#FF6B5E]/35 focus-visible:outline-none"
      onMouseDown={handleMouseDown}
    />
  );
}

export function SalesTableHeader({
  visibleColumns,
  columnWidths,
  sortState,
  allVisibleSelected,
  someVisibleSelected,
  t,
  onSort,
  onResizeColumn,
  onToggleAllVisible,
}: {
  visibleColumns: SalesColumnId[];
  columnWidths: Record<SalesColumnId, number>;
  sortState: SalesSortState;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  t: SalesRecordsTranslations;
  onSort: (column: SalesColumnId) => void;
  onResizeColumn: (column: SalesColumnId, width: number) => void;
  onToggleAllVisible: (checked: boolean) => void;
}) {
  return (
    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
      <TableHead className="w-[56px] px-5 py-5">
        <Checkbox
          aria-label={t.table.selection.selectVisible}
          checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
          className="border-slate-300 data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
          onCheckedChange={(checked) => onToggleAllVisible(checked === true)}
        />
      </TableHead>
      {visibleColumns.map((column) => {
        const label = t.table.columns[column];
        const columnWidth = columnWidths[column] ?? defaultSalesColumnWidths[column];
        const isSortable = sortableSalesColumns.has(column);
        const isActive = sortState?.columnId === column;
        const SortIcon = isActive ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

        return (
          <TableHead
            key={column}
            className={cn(
              'relative whitespace-normal px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400',
              column === 'actions' && 'text-center',
            )}
            style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px` }}
          >
            {isSortable ? (
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                onClick={() => onSort(column)}
              >
                <span className="min-w-0 whitespace-normal break-words">{label}</span>
                <SortIcon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#FF6B5E]' : 'text-slate-400')} />
              </button>
            ) : (
              <span className="inline-flex max-w-full justify-center whitespace-normal break-words">{label}</span>
            )}
            <SalesColumnResizeHandle
              column={column}
              label={label}
              width={columnWidth}
              t={t}
              onResizeColumn={onResizeColumn}
            />
          </TableHead>
        );
      })}
    </TableRow>
  );
}
