import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type {
  AgendaColumnId,
  AgendaFixedColumnId,
  AgendaSortState,
  AgendaTableColumnId,
} from '../types';
import { AgendaSortableTableHead, AgendaStaticTableHead } from './AgendaTablePrimitives';

const agendaPageSizeOptions = [20, 50, 100] as const;

interface AgendaTableViewProps {
  agendaColumnWidths: Record<AgendaTableColumnId, number>;
  agendaCopy: AgendaTranslations;
  agendaTableColumnCount: number;
  agendaTableMinWidth: number;
  filteredTasks: AgendaTaskItem[];
  fixedAgendaColumns: ColumnConfig[];
  handleResizeStart: (event: ReactMouseEvent, columnId: AgendaTableColumnId) => void;
  handleSort: (columnId: AgendaColumnId) => void;
  isAgendaViewLoading: boolean;
  isTaskPending: (taskId: number) => boolean;
  renderAgendaTaskCell: (task: AgendaTaskItem, columnId: AgendaColumnId) => ReactNode;
  renderTaskActions: (task: AgendaTaskItem) => ReactNode;
  resizingColumn: AgendaTableColumnId | null;
  rowSelection: {
    isSelected: (id: number) => boolean;
    toggleAllVisible: (ids: number[], selected: boolean) => void;
    toggleSelection: (id: number, selected: boolean) => void;
  };
  selectionColumnWidth: number;
  sortState: AgendaSortState;
  sortedTasks: AgendaTaskItem[];
  visibleAgendaColumns: ColumnConfig[];
}

export function AgendaTableView({
  agendaColumnWidths,
  agendaCopy,
  agendaTableColumnCount,
  agendaTableMinWidth,
  filteredTasks,
  fixedAgendaColumns,
  handleResizeStart,
  handleSort,
  isAgendaViewLoading,
  isTaskPending,
  renderAgendaTaskCell,
  renderTaskActions,
  resizingColumn,
  rowSelection,
  selectionColumnWidth,
  sortState,
  sortedTasks,
  visibleAgendaColumns,
}: AgendaTableViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof agendaPageSizeOptions)[number]>(20);
  const primaryMobileColumn = visibleAgendaColumns[0];
  const secondaryMobileColumns = visibleAgendaColumns.slice(1);
  const actionsMobileLabel = fixedAgendaColumns[0]?.label ?? agendaCopy.columns.actions.label;
  const totalRows = sortedTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedTasks = useMemo(
    () => sortedTasks.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, sortedTasks],
  );
  const pageTaskIds = useMemo(() => paginatedTasks.map((task) => task.taskId), [paginatedTasks]);
  const pageSelection = useMemo(() => {
    const selectedCount = pageTaskIds.filter((taskId) => rowSelection.isSelected(taskId)).length;

    return {
      allVisibleSelected: pageTaskIds.length > 0 && selectedCount === pageTaskIds.length,
      someVisibleSelected: selectedCount > 0 && selectedCount < pageTaskIds.length,
    };
  }, [pageTaskIds, rowSelection]);
  const paginationStart = totalRows === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = totalRows === 0 ? 0 : Math.min(pageEndIndex, totalRows);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, sortedTasks]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="md:hidden">
        {isAgendaViewLoading ? (
          <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
            {agendaCopy.kanban.loading}
          </div>
        ) : null}

        {!isAgendaViewLoading && filteredTasks.length === 0 ? (
          <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
            {agendaCopy.table.empty}
          </div>
        ) : null}

        {!isAgendaViewLoading && paginatedTasks.length > 0 ? (
          <div className="space-y-3 p-3">
            {paginatedTasks.map((task) => {
              const selected = rowSelection.isSelected(task.taskId);

              return (
                <article
                  key={task.taskId}
                  className={cn(
                    'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800',
                    selected && 'border-[#F4C84A]/60 bg-[#F4C84A]/10 dark:bg-[#F4C84A]/15',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      aria-label={`Seleccionar ${task.folio}`}
                      checked={selected}
                      disabled={isTaskPending(task.taskId)}
                      onCheckedChange={(checked) => rowSelection.toggleSelection(task.taskId, checked === true)}
                      className="mt-1 border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                    />
                    {primaryMobileColumn ? (
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          {primaryMobileColumn.label}
                        </p>
                        {renderAgendaTaskCell(task, primaryMobileColumn.id as AgendaColumnId)}
                      </div>
                    ) : null}
                  </div>

                  {secondaryMobileColumns.length > 0 ? (
                    <div className="mt-4 grid gap-3">
                      {secondaryMobileColumns.map((column) => (
                        <div
                          key={`${task.taskId}-${column.id}`}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/50"
                        >
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {column.label}
                          </p>
                          <div className="min-w-0">
                            {renderAgendaTaskCell(task, column.id as AgendaColumnId)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {actionsMobileLabel}
                    </p>
                    {renderTaskActions(task)}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table style={{ minWidth: agendaTableMinWidth, tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead
                className="px-5 py-5"
                style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
              >
                <Checkbox
                  aria-label="Seleccionar tareas visibles"
                  checked={
                    pageSelection.allVisibleSelected
                      ? true
                      : pageSelection.someVisibleSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) => rowSelection.toggleAllVisible(pageTaskIds, checked === true)}
                  className="border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                />
              </TableHead>
              {visibleAgendaColumns.map((column) => (
                <AgendaSortableTableHead
                  key={column.id}
                  column={column}
                  width={agendaColumnWidths[column.id as AgendaColumnId]}
                  sortState={sortState}
                  resizingColumn={resizingColumn}
                  onSort={handleSort}
                  resizeLabel={agendaCopy.table.resizeColumn}
                  onResizeStart={handleResizeStart}
                />
              ))}
              {fixedAgendaColumns.map((column) => {
                const columnId = column.id as AgendaFixedColumnId;

                return (
                  <AgendaStaticTableHead
                    key={column.id}
                    column={column}
                    columnId={columnId}
                    width={agendaColumnWidths[columnId]}
                    resizingColumn={resizingColumn}
                    resizeLabel={agendaCopy.table.resizeColumn}
                    onResizeStart={handleResizeStart}
                  />
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.map((task) => {
              const selected = rowSelection.isSelected(task.taskId);

              return (
                <TableRow
                  key={task.taskId}
                  className={cn(
                    'border-slate-200 dark:border-slate-700',
                    selected && 'bg-[#F4C84A]/10 dark:bg-[#F4C84A]/15',
                  )}
                >
                  <TableCell
                    className="px-5 py-5 align-middle"
                    style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
                  >
                    <Checkbox
                      aria-label={`Seleccionar ${task.folio}`}
                      checked={selected}
                      disabled={isTaskPending(task.taskId)}
                      onCheckedChange={(checked) => rowSelection.toggleSelection(task.taskId, checked === true)}
                      className="border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                    />
                  </TableCell>
                  {visibleAgendaColumns.map((column) => {
                    const columnId = column.id as AgendaColumnId;

                    return (
                      <TableCell
                        key={`${task.taskId}-${column.id}`}
                        className="whitespace-normal break-words px-5 py-5 align-middle"
                        style={{
                          width: agendaColumnWidths[columnId],
                          minWidth: agendaColumnWidths[columnId],
                        }}
                      >
                        <div className="min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                          {renderAgendaTaskCell(task, columnId)}
                        </div>
                      </TableCell>
                    );
                  })}
                  {fixedAgendaColumns.map((column) => {
                    const columnId = column.id as AgendaFixedColumnId;

                    return (
                      <TableCell
                        key={`${task.taskId}-${column.id}`}
                        className="whitespace-normal px-5 py-5 align-middle"
                        style={{
                          width: agendaColumnWidths[columnId],
                          minWidth: agendaColumnWidths[columnId],
                        }}
                      >
                        {renderTaskActions(task)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            {isAgendaViewLoading ? (
              <TableRow>
                <TableCell
                  colSpan={agendaTableColumnCount}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  {agendaCopy.kanban.loading}
                </TableCell>
              </TableRow>
            ) : null}

            {!isAgendaViewLoading && filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={agendaTableColumnCount}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  {agendaCopy.table.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      {!isAgendaViewLoading && totalRows > 0 ? (
        <AgendaTablePagination
          copy={agendaCopy.table}
          currentPage={safeCurrentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          pageEnd={paginationEnd}
          pageSize={pageSize}
          pageStart={paginationStart}
          totalPages={totalPages}
          totalRows={totalRows}
        />
      ) : null}
    </section>
  );
}

function AgendaTablePagination({
  copy,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageStart,
  totalPages,
  totalRows,
}: {
  copy: AgendaTranslations['table'];
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: (typeof agendaPageSizeOptions)[number]) => void;
  pageEnd: number;
  pageSize: (typeof agendaPageSizeOptions)[number];
  pageStart: number;
  totalPages: number;
  totalRows: number;
}) {
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {copy.showing(pageStart, pageEnd, totalRows)}
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
          <span>{copy.rowsPerPage}</span>
          <select
            aria-label={copy.rowsPerPage}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as (typeof agendaPageSizeOptions)[number])}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-[#F4C84A] focus:ring-2 focus:ring-[#F4C84A]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {agendaPageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <PaginationButton disabled={!hasPreviousPage} onClick={() => onPageChange(currentPage - 1)}>
            {copy.previous}
          </PaginationButton>
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            {currentPage} / {totalPages}
          </span>
          <PaginationButton disabled={!hasNextPage} onClick={() => onPageChange(currentPage + 1)}>
            {copy.next}
          </PaginationButton>
          {hasNextPage ? (
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#F4C84A]/50 bg-[#F4C84A] px-4 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-[#E5B835]"
            >
              {copy.loadMore}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaginationButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}
