import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import {
  EXPENSE_TABLE_HEADERS,
  type ExpenseSortField,
} from '../../constants/expenseTableConfig';
import { Checkbox } from '../../../../components/ui/checkbox';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';

type ExpenseTableHeaderRowProps = {
  allVisibleSelected: boolean;
  columnWidths: Record<string, number>;
  getSortIcon: (field: ExpenseSortField) => ReactNode;
  isColumnVisible: (key: string) => boolean;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  onSort: (field: ExpenseSortField) => void;
  onToggleAllVisible: (selected: boolean) => void;
  resizingColumn: string | null;
  selectionColumnWidth: number;
  someVisibleSelected: boolean;
};

export function ExpenseTableHeaderRow({
  allVisibleSelected,
  columnWidths,
  getSortIcon,
  isColumnVisible,
  onResizeStart,
  onSort,
  onToggleAllVisible,
  resizingColumn,
  selectionColumnWidth,
  someVisibleSelected,
}: ExpenseTableHeaderRowProps) {
  const t = useExpensesTranslations();

  return (
    <tr>
      <th
        className="px-5 py-4 text-left align-middle"
        style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
      >
        <Checkbox
          aria-label={t.expenses.table.allVisibleSelection}
          checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
          onCheckedChange={(checked) => onToggleAllVisible(checked === true)}
          className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
        />
      </th>
      {EXPENSE_TABLE_HEADERS.map((header) => {
        if (!isColumnVisible(header.visibleWhen ?? header.key)) return null;
        const label = t.expenses.columns[header.key]?.label ?? header.label;
        if (header.sortable) {
          return (
            <SortableHeader
              key={header.key}
              columnKey={header.sortable}
              label={label}
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
            label={label}
            width={columnWidths[header.key]}
            resizingColumn={resizingColumn}
            onResizeStart={onResizeStart}
          />
        );
      })}
      <th
        className="px-5 py-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
        style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
      >
        {t.common.actions}
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
        <button type="button" onClick={() => onSort(columnKey)} className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
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
        <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
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
