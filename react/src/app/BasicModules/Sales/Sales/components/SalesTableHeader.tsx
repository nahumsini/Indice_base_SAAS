import {
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import { Checkbox } from '../../../../components/ui/checkbox';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesColumnId } from '../types/salesTypes';
import {
  defaultSalesColumnWidths,
  minimumSalesColumnWidths,
  salesActionsColumnWidth,
  sortableSalesColumns,
  type SalesSortState,
  type SortableSalesColumnId,
} from '../utils/salesTableColumns';

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
  const tableColumns: Array<IndiceTableColumnDefinition<SalesColumnId>> = visibleColumns
    .filter((column) => column !== 'actions')
    .map((column) => {
      const label = t.table.columns[column];
      return {
        id: column,
        label,
        width: columnWidths[column] ?? defaultSalesColumnWidths[column],
        defaultWidth: defaultSalesColumnWidths[column],
        contentMinimumWidth: minimumSalesColumnWidths[column],
        sortable: sortableSalesColumns.has(column),
        resizeLabel: t.table.resizeColumn(label),
      };
    });

  return (
    <IndiceTableHeaderRow
      actions={visibleColumns.includes('actions') ? { label: t.table.columns.actions, width: salesActionsColumnWidth } : undefined}
      columns={tableColumns}
      leadingControl={{
        label: t.table.selection.selectVisible,
        width: 56,
        content: (
          <Checkbox
            aria-label={t.table.selection.selectVisible}
            checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
            className="border-slate-300 data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
            onCheckedChange={(checked) => onToggleAllVisible(checked === true)}
          />
        ),
      }}
      onResize={onResizeColumn}
      onSort={onSort}
      sortState={sortState}
    />
  );
}
