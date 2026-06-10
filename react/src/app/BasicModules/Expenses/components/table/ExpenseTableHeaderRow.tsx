import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import {
  EXPENSE_TABLE_HEADERS,
  type ExpenseSortField,
} from '../../constants/expenseTableConfig';

type ExpenseTableHeaderRowProps = {
  columnWidths: Record<string, number>;
  getSortIcon: (field: ExpenseSortField) => ReactNode;
  isColumnVisible: (key: string) => boolean;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  onSort: (field: ExpenseSortField) => void;
  resizingColumn: string | null;
};

export function ExpenseTableHeaderRow({
  columnWidths,
  getSortIcon,
  isColumnVisible,
  onResizeStart,
  onSort,
  resizingColumn,
}: ExpenseTableHeaderRowProps) {
  return (
    <tr>
      {EXPENSE_TABLE_HEADERS.map((header) => {
        if (!isColumnVisible(header.visibleWhen ?? header.key)) return null;
        if (header.sortable) {
          return (
            <SortableHeader
              key={header.key}
              columnKey={header.sortable}
              label={header.label}
              width={columnWidths[header.key]}
              resizingColumn={resizingColumn}
              onResizeStart={onResizeStart}
              onSort={onSort}
              sortIcon={getSortIcon(header.sortable)}
            />
          );
        }

        return (
          <StaticHeader
            key={header.key}
            columnKey={header.key}
            label={header.label}
            width={columnWidths[header.key]}
            resizingColumn={resizingColumn}
            onResizeStart={onResizeStart}
          />
        );
      })}
      <th
        className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
        style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
      >
        Acciones
      </th>
    </tr>
  );
}

function SortableHeader({
  columnKey,
  label,
  onResizeStart,
  onSort,
  resizingColumn,
  sortIcon,
  width,
}: {
  columnKey: ExpenseSortField;
  label: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  onSort: (field: ExpenseSortField) => void;
  resizingColumn: string | null;
  sortIcon: ReactNode;
  width: number;
}) {
  return (
    <th className="group relative px-5 py-4 text-left align-middle" style={{ width, minWidth: width }}>
      <div className="flex items-center">
        <button type="button" onClick={() => onSort(columnKey)} className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <span>{label}</span>
          {sortIcon}
        </button>
        <ColumnResizeHandle columnKey={columnKey} resizingColumn={resizingColumn} onResizeStart={onResizeStart} />
      </div>
    </th>
  );
}

function StaticHeader({
  columnKey,
  label,
  onResizeStart,
  resizingColumn,
  width,
}: {
  columnKey: string;
  label: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  resizingColumn: string | null;
  width: number;
}) {
  return (
    <th className="group relative px-5 py-4 text-left align-middle" style={{ width, minWidth: width }}>
      <div className="flex items-center">
        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
        <ColumnResizeHandle columnKey={columnKey} resizingColumn={resizingColumn} onResizeStart={onResizeStart} />
      </div>
    </th>
  );
}

function ColumnResizeHandle({
  columnKey,
  onResizeStart,
  resizingColumn,
}: {
  columnKey: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  resizingColumn: string | null;
}) {
  return (
    <div
      onMouseDown={(event) => onResizeStart(event, columnKey)}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: resizingColumn === columnKey ? '#147514' : '' }}
    />
  );
}
