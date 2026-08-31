import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnConfig } from '../../types/expenseView.types';
import { IndiceViewState } from '../../../../components/frontend-os';
import {
  getIndiceTableMinimumWidth,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { Checkbox } from '../../../../components/ui/checkbox';
import { TableBody, TableCell, TableRow } from '../../../../components/ui/table';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
import { useExpenseRowSelection } from '../../hooks/useExpenseRowSelection';
import { useBudgetsResolvedLocale, useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';
import { BudgetBulkActionsBar } from './BudgetBulkActionsBar';
import { BudgetLineActions, BudgetLineCell } from './BudgetLineCells';
import { BudgetLineMobileCards } from './BudgetLineMobileCards';
import {
  budgetLineActionsWidth,
  budgetLineColumnIds,
  budgetLineDefaultWidths,
  budgetLineMinimumWidths,
  budgetLineSelectionWidth,
  getBudgetLineColumnAlignment,
  getBudgetLineColumnLabel,
  isBudgetLineColumnId,
  sortBudgetLines,
  type BudgetLineColumnId,
  type BudgetSortDirection,
} from './budgetLineTableConfig';
import { BudgetTableLoadError } from './BudgetTableLoadError';

type BudgetLinesTableProps = {
  budgetLines: BudgetLineTableRow[];
  columns: ColumnConfig[];
  errorMessage?: string;
  selectionResetKey?: number;
  onDeleteBudgetLine: (budgetLineId: string) => void;
  onDeleteBudgetLines: (budgetLineIds: string[]) => void;
  onEditBudgetLine: (budgetLineId: string) => void;
  onRetry?: () => void;
};

type BudgetTableWorkspaceState = {
  currentPage: number;
  pageSize: number;
  sortDirection: BudgetSortDirection;
  sortField: BudgetLineColumnId;
};

const budgetTableWorkspaceDefaults: BudgetTableWorkspaceState = {
  currentPage: 1,
  pageSize: 10,
  sortDirection: 'asc',
  sortField: 'dueDate',
};

const budgetTableWorkspaceUrlFields: Partial<Record<keyof BudgetTableWorkspaceState, string>> = {
  currentPage: 'bu_page',
  pageSize: 'bu_rows',
  sortDirection: 'bu_dir',
  sortField: 'bu_sort',
};

export function BudgetLinesTable({
  budgetLines,
  columns,
  errorMessage,
  selectionResetKey = 0,
  onDeleteBudgetLine,
  onDeleteBudgetLines,
  onEditBudgetLine,
  onRetry,
}: BudgetLinesTableProps) {
  const t = useBudgetsTranslations();
  const locale = useBudgetsResolvedLocale();
  const [sortDirection, setSortDirection] = useState<BudgetSortDirection>('asc');
  const [sortField, setSortField] = useState<BudgetLineColumnId>('dueDate');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rowSelection = useExpenseRowSelection<string>();
  const workspaceState = useMemo<BudgetTableWorkspaceState>(() => ({
    currentPage,
    pageSize,
    sortDirection,
    sortField,
  }), [currentPage, pageSize, sortDirection, sortField]);
  const restoreWorkspaceState = useCallback((restoredState: BudgetTableWorkspaceState) => {
    setCurrentPage(restoredState.currentPage);
    setPageSize(restoredState.pageSize);
    setSortDirection(restoredState.sortDirection);
    setSortField(restoredState.sortField);
  }, []);
  const handlePaginationChange = useCallback((nextState: { currentPage: number; pageSize: number }) => {
    setCurrentPage(nextState.currentPage);
    setPageSize(nextState.pageSize);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'budgets-table',
    state: workspaceState,
    defaults: budgetTableWorkspaceDefaults,
    urlFields: budgetTableWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
    rememberScroll: false,
  });

  const visibleColumnIds = useMemo(() => columns
    .filter(column => column.visible && isBudgetLineColumnId(column.key))
    .map(column => column.key as BudgetLineColumnId), [columns]);
  const headerLabels = useMemo<Record<BudgetLineColumnId, string>>(() => Object.fromEntries(
    budgetLineColumnIds.map(columnId => [columnId, getBudgetLineColumnLabel(columnId, t)]),
  ) as Record<BudgetLineColumnId, string>, [t]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<BudgetLineColumnId>({
    defaults: budgetLineDefaultWidths,
    headerLabels,
    minWidths: budgetLineMinimumWidths,
    sortableColumnIds: budgetLineColumnIds,
    storageKey: 'expenses-budget-lines-column-widths-v2',
  });
  const tableColumns = useMemo<Array<IndiceTableColumnDefinition<BudgetLineColumnId>>>(() => visibleColumnIds.map(columnId => ({
    id: columnId,
    label: headerLabels[columnId],
    width: columnWidths[columnId],
    defaultWidth: budgetLineDefaultWidths[columnId],
    contentMinimumWidth: budgetLineMinimumWidths[columnId],
    alignment: getBudgetLineColumnAlignment(columnId),
    sortable: true,
    resizeLabel: headerLabels[columnId],
  })), [columnWidths, headerLabels, visibleColumnIds]);
  const sortedBudgetLines = useMemo(
    () => sortBudgetLines(budgetLines, sortField, sortDirection, locale),
    [budgetLines, locale, sortDirection, sortField],
  );
  const pagination = useTablePagination({
    controlledCurrentPage: currentPage,
    controlledPageSize: pageSize,
    onPaginationChange: handlePaginationChange,
    rows: sortedBudgetLines,
  });
  const visibleBudgetLineIds = useMemo(() => pagination.paginatedRows.map(budgetLine => budgetLine.id), [pagination.paginatedRows]);
  const visibleSelection = rowSelection.visibleSelectionState(visibleBudgetLineIds);
  const tableMinimumWidth = getIndiceTableMinimumWidth({
    actionsWidth: budgetLineActionsWidth,
    columns: tableColumns,
    leadingControlWidth: budgetLineSelectionWidth,
  });

  useEffect(() => {
    rowSelection.pruneSelection(budgetLines.map(budgetLine => budgetLine.id));
  }, [budgetLines, rowSelection.pruneSelection]);

  useEffect(() => {
    rowSelection.clearSelection();
  }, [rowSelection.clearSelection, selectionResetKey]);

  const handleSort = (columnId: BudgetLineColumnId) => {
    setCurrentPage(1);
    if (sortField === columnId) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(columnId);
    setSortDirection('asc');
  };

  return (
    <IndiceTableShell pagination={budgetLines.length > 0 ? <BudgetPagination pagination={pagination} t={t} /> : undefined}>
      {rowSelection.selectedCount > 0 ? (
        <BudgetBulkActionsBar selectedCount={rowSelection.selectedCount} onClearSelection={rowSelection.clearSelection} onDeleteSelected={() => onDeleteBudgetLines(rowSelection.selectedIdList)} />
      ) : null}
      {errorMessage ? <BudgetTableLoadError errorMessage={errorMessage} onRetry={onRetry} /> : null}
      {budgetLines.length === 0 ? (
        <IndiceViewState className="rounded-none border-0 shadow-none" compact description={t.budgets.messages.emptyMessage} title={t.budgets.messages.emptyTitle} tone="green" variant="empty" />
      ) : (
        <>
          <BudgetLineMobileCards
            budgetLines={pagination.paginatedRows}
            isSelected={rowSelection.isSelected}
            locale={locale}
            onDelete={onDeleteBudgetLine}
            onEdit={onEditBudgetLine}
            onSelectionChange={rowSelection.toggleSelection}
            t={t}
          />
          <div className="hidden md:block">
            <IndiceOperationalTable minimumWidth={tableMinimumWidth}>
              <IndiceTableColGroup actionsWidth={budgetLineActionsWidth} columns={tableColumns} leadingControlWidth={budgetLineSelectionWidth} />
              <IndiceTableHeaderRow
                actions={{ label: t.budgets.columns.actions.label, width: budgetLineActionsWidth }}
                columns={tableColumns}
                leadingControl={{
                  label: t.budgets.table.allVisibleSelection,
                  width: budgetLineSelectionWidth,
                  content: (
                    <Checkbox
                      aria-label={t.budgets.table.allVisibleSelection}
                      checked={visibleSelection.someVisibleSelected ? 'indeterminate' : visibleSelection.allVisibleSelected}
                      className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
                      onCheckedChange={(checked) => rowSelection.toggleAllVisible(visibleBudgetLineIds, checked === true)}
                    />
                  ),
                }}
                onResize={resizeColumn}
                onSort={handleSort}
                sortState={{ columnId: sortField, direction: sortDirection }}
                tone="green"
              />
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pagination.paginatedRows.map(budgetLine => (
                  <TableRow key={budgetLine.id} aria-selected={rowSelection.isSelected(budgetLine.id)} data-state={rowSelection.isSelected(budgetLine.id) ? 'selected' : undefined} className="border-slate-200 hover:bg-[#147514]/[0.035] data-[state=selected]:bg-[#147514]/5 dark:border-slate-700 dark:hover:bg-[#147514]/10 dark:data-[state=selected]:bg-[#147514]/10">
                    <TableCell className="px-5 py-4" style={{ width: budgetLineSelectionWidth, minWidth: budgetLineSelectionWidth }}>
                      <Checkbox
                        aria-label={t.budgets.table.selectBudgetLine(budgetLine.folio)}
                        checked={rowSelection.isSelected(budgetLine.id)}
                        className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
                        onCheckedChange={(checked) => rowSelection.toggleSelection(budgetLine.id, checked === true)}
                      />
                    </TableCell>
                    {visibleColumnIds.map(columnId => (
                      <TableCell key={columnId} className={`whitespace-normal px-5 py-4 text-sm text-slate-700 dark:text-slate-200 ${getBudgetLineColumnAlignment(columnId) === 'right' ? 'text-right' : getBudgetLineColumnAlignment(columnId) === 'center' ? 'text-center' : 'text-left'}`}>
                        <BudgetLineCell budgetLine={budgetLine} columnId={columnId} locale={locale} t={t} />
                      </TableCell>
                    ))}
                    <TableCell className="px-4 py-4 text-right" style={{ width: budgetLineActionsWidth, minWidth: budgetLineActionsWidth }}>
                      <BudgetLineActions budgetLineId={budgetLine.id} onDelete={onDeleteBudgetLine} onEdit={onEditBudgetLine} t={t} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </IndiceOperationalTable>
          </div>
        </>
      )}
    </IndiceTableShell>
  );
}

function BudgetPagination({
  pagination,
  t,
}: {
  pagination: ReturnType<typeof useTablePagination<BudgetLineTableRow>>;
  t: ReturnType<typeof useBudgetsTranslations>;
}) {
  return (
    <DataTablePagination
      currentPage={pagination.currentPage}
      labels={{
        next: t.common.next,
        page: (current, total) => `${current} / ${total}`,
        previous: t.common.previous,
        rowsPerPage: t.common.rowsPerPage,
        showing: (start, end, total) => t.common.showing(start, end, total),
      }}
      onPageChange={pagination.onPageChange}
      onPageSizeChange={pagination.onPageSizeChange}
      pageEnd={pagination.pageEnd}
      pageSize={pagination.pageSize}
      pageSizeOptions={pagination.pageSizeOptions}
      pageStart={pagination.pageStart}
      totalCount={pagination.totalCount}
      totalPages={pagination.totalPages}
    />
  );
}
