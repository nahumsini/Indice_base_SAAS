import type {
  AriaAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import { useEffect } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Table, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '../ui/utils';
import { getIndiceTableMinimumColumnWidth } from './indiceTableColumnSizing';

export type IndiceTableSortDirection = 'asc' | 'desc';
export type IndiceTableAlignment = 'left' | 'center' | 'right';

export type IndiceTableColumnDefinition<ColumnId extends string> = {
  id: ColumnId;
  label: string;
  width: number;
  defaultWidth: number;
  contentMinimumWidth: number;
  alignment?: IndiceTableAlignment;
  sortable?: boolean;
  maxWidth?: number;
  resizeLabel: string;
};

export type IndiceTableLeadingControl = {
  label: string;
  width?: number;
  content?: ReactNode;
  className?: string;
};

export type IndiceTableActionsColumn = {
  label: string;
  width: number;
  className?: string;
};

const alignmentClassNames: Record<IndiceTableAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const alignmentJustifyClassNames: Record<IndiceTableAlignment, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

function toAriaSort(direction?: IndiceTableSortDirection): AriaAttributes['aria-sort'] {
  if (direction === 'asc') return 'ascending';
  if (direction === 'desc') return 'descending';
  return 'none';
}

export function IndiceTableShell({
  children,
  className,
  pagination,
}: {
  children: ReactNode;
  className?: string;
  pagination?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800',
        className,
      )}
    >
      {children}
      {pagination}
    </section>
  );
}

/**
 * Canonical table canvas. Keeping the rendered table at the exact sum of its
 * column widths prevents the browser from redistributing spare space between
 * columns. The Table primitive owns the single horizontal-scroll viewport.
 */
export function IndiceOperationalTable({
  children,
  className,
  minimumWidth,
}: {
  children: ReactNode;
  className?: string;
  minimumWidth: number;
}) {
  const resolvedWidth = Math.max(1, Math.round(minimumWidth));

  return (
    <Table
      className={cn('table-fixed', className)}
      style={{ minWidth: resolvedWidth, width: resolvedWidth }}
    >
      {children}
    </Table>
  );
}

export function IndiceTableUtilityHead({
  children,
  className,
  label,
  width = 56,
}: {
  children?: ReactNode;
  className?: string;
  label: string;
  width?: number;
}) {
  return (
    <TableHead
      className={cn('h-[52px] px-4 py-0 text-[13px] font-normal leading-4 text-slate-500 dark:text-slate-300', className)}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <span className={children ? undefined : 'sr-only'}>{children ?? label}</span>
    </TableHead>
  );
}

export function IndiceTableActionsHead({
  className,
  label,
  width,
}: {
  className?: string;
  label: string;
  width: number;
}) {
  return (
    <TableHead
      className={cn('h-[52px] px-4 py-0 text-right text-[13px] font-normal leading-4 text-slate-500 dark:text-slate-300', className)}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <span className="whitespace-nowrap">{label}</span>
    </TableHead>
  );
}

export function IndiceResizableTableHead<ColumnId extends string>({
  activeDirection,
  alignment = 'left',
  className,
  columnId,
  defaultWidth,
  label,
  maxWidth = 480,
  minWidth = 120,
  onResize,
  onSort,
  resizeLabel,
  sortable = false,
  width,
}: {
  activeDirection?: IndiceTableSortDirection;
  alignment?: IndiceTableAlignment;
  className?: string;
  columnId: ColumnId;
  defaultWidth: number;
  label: string;
  maxWidth?: number;
  minWidth?: number;
  onResize: (columnId: ColumnId, width: number) => void;
  onSort?: (columnId: ColumnId) => void;
  resizeLabel: string;
  sortable?: boolean;
  width: number;
}) {
  const effectiveMinimumWidth = Math.min(maxWidth, getIndiceTableMinimumColumnWidth({
    contentMinimumWidth: minWidth,
    label,
    sortable,
  }));
  const clampedWidth = Math.min(maxWidth, Math.max(effectiveMinimumWidth, width));
  const SortIcon = activeDirection === 'asc'
    ? ArrowUp
    : activeDirection === 'desc'
      ? ArrowDown
      : ArrowUpDown;

  useEffect(() => {
    if (width < effectiveMinimumWidth) {
      onResize(columnId, effectiveMinimumWidth);
    }
  }, [columnId, effectiveMinimumWidth, onResize, width]);

  const resizeBy = (delta: number) => {
    onResize(columnId, Math.min(maxWidth, Math.max(effectiveMinimumWidth, clampedWidth + delta)));
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = clampedWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onResize(columnId, Math.min(maxWidth, Math.max(effectiveMinimumWidth, startWidth + moveEvent.clientX - startX)));
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

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      resizeBy(-step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      resizeBy(step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onResize(columnId, defaultWidth);
    }
  };

  return (
    <TableHead
      aria-sort={sortable ? toAriaSort(activeDirection) : undefined}
      className={cn(
        'group relative h-[52px] whitespace-nowrap px-4 py-0 text-[13px] font-normal leading-4 text-slate-500 dark:text-slate-300',
        alignmentClassNames[alignment],
        className,
      )}
      style={{ width: clampedWidth, minWidth: clampedWidth, maxWidth: clampedWidth }}
    >
      {sortable && onSort ? (
        <button
          type="button"
          className={cn(
            'inline-flex min-h-9 w-full min-w-0 items-center gap-2 pr-2 font-normal leading-4 text-inherit transition-colors hover:text-slate-950 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 dark:hover:text-white',
            alignmentJustifyClassNames[alignment],
            activeDirection && 'text-[#B63B32] dark:text-[#FFB0AA]',
          )}
          onClick={() => onSort(columnId)}
        >
          <span className="whitespace-nowrap">{label}</span>
          <SortIcon
            aria-hidden="true"
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-opacity',
              activeDirection ? 'text-[#FF6B5E] opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
            )}
          />
        </button>
      ) : (
        <span className={cn('flex min-h-9 w-full items-center whitespace-nowrap pr-2', alignmentJustifyClassNames[alignment])}>{label}</span>
      )}

      <div
        role="separator"
        aria-label={resizeLabel}
        aria-orientation="vertical"
        aria-valuemax={maxWidth}
        aria-valuemin={effectiveMinimumWidth}
        aria-valuenow={clampedWidth}
        tabIndex={0}
        className="absolute right-0 top-1/2 h-8 w-2 -translate-y-1/2 cursor-col-resize rounded-full border-r border-slate-300 transition-colors hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/20 focus-visible:border-[#FF6B5E] focus-visible:bg-[#FF6B5E]/20 focus-visible:outline-none dark:border-slate-600"
        onDoubleClick={() => onResize(columnId, defaultWidth)}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
      />
    </TableHead>
  );
}

/**
 * Canonical operational-table header. Modules provide business labels and sort
 * handlers; this component owns the visual and accessibility contract.
 */
export function IndiceTableHeaderRow<ColumnId extends string>({
  actions,
  columns,
  leadingControl,
  onResize,
  onSort,
  sortState,
}: {
  actions?: IndiceTableActionsColumn;
  columns: Array<IndiceTableColumnDefinition<ColumnId>>;
  leadingControl?: IndiceTableLeadingControl;
  onResize: (columnId: ColumnId, width: number) => void;
  onSort?: (columnId: ColumnId) => void;
  sortState?: { columnId: ColumnId; direction: IndiceTableSortDirection } | null;
}) {
  return (
    <TableHeader>
      <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
        {leadingControl ? (
          <IndiceTableUtilityHead
            className={leadingControl.className}
            label={leadingControl.label}
            width={leadingControl.width}
          >
            {leadingControl.content}
          </IndiceTableUtilityHead>
        ) : null}

        {columns.map((column) => (
          <IndiceResizableTableHead
            key={column.id}
            activeDirection={sortState?.columnId === column.id ? sortState.direction : undefined}
            alignment={column.alignment}
            columnId={column.id}
            defaultWidth={column.defaultWidth}
            label={column.label}
            maxWidth={column.maxWidth}
            minWidth={column.contentMinimumWidth}
            onResize={onResize}
            onSort={column.sortable ? onSort : undefined}
            resizeLabel={column.resizeLabel}
            sortable={column.sortable}
            width={column.width}
          />
        ))}

        {actions ? (
          <IndiceTableActionsHead className={actions.className} label={actions.label} width={actions.width} />
        ) : null}
      </TableRow>
    </TableHeader>
  );
}

export function IndiceTableColGroup<ColumnId extends string>({
  actionsWidth,
  columns,
  leadingControlWidth,
}: {
  actionsWidth?: number;
  columns: Array<Pick<IndiceTableColumnDefinition<ColumnId>, 'id' | 'width'>>;
  leadingControlWidth?: number;
}) {
  return (
    <colgroup>
      {leadingControlWidth ? <col style={{ width: leadingControlWidth }} /> : null}
      {columns.map((column) => <col key={column.id} style={{ width: column.width }} />)}
      {actionsWidth ? <col style={{ width: actionsWidth }} /> : null}
    </colgroup>
  );
}

export function getIndiceTableMinimumWidth<ColumnId extends string>({
  actionsWidth = 0,
  columns,
  leadingControlWidth = 0,
}: {
  actionsWidth?: number;
  columns: Array<Pick<IndiceTableColumnDefinition<ColumnId>, 'width'>>;
  leadingControlWidth?: number;
}) {
  return columns.reduce((total, column) => total + column.width, leadingControlWidth + actionsWidth);
}

export function IndiceTableActionGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'ml-auto inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70',
        className,
      )}
    >
      {children}
    </div>
  );
}
