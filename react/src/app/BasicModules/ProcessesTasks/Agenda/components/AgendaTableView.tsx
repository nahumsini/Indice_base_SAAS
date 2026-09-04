import { useMemo, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { CalendarDays, FolderKanban, Maximize2, X } from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Button } from '../../../../components/ui/button';
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
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS, useTablePagination } from '../../../../hooks/useTablePagination';
import { AgendaSortableTableHead, AgendaStaticTableHead } from './AgendaTablePrimitives';
import { getTaskDisplayStatus } from '../utils/agendaTaskStatus';

const agendaPageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS;

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
  onClearFilters: () => void;
  onCreateTask: () => void;
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
  onClearFilters,
  onCreateTask,
  renderAgendaTaskCell,
  renderTaskActions,
  resizingColumn,
  rowSelection,
  selectionColumnWidth,
  sortState,
  sortedTasks,
  visibleAgendaColumns,
}: AgendaTableViewProps) {
  const primaryMobileColumn = visibleAgendaColumns[0];
  const secondaryMobileColumns = visibleAgendaColumns.slice(1);
  const actionsMobileLabel = fixedAgendaColumns[0]?.label ?? agendaCopy.columns.actions.label;
  const [mobileDetailTask, setMobileDetailTask] = useState<AgendaTaskItem | null>(null);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedTasks,
    totalCount,
    totalPages,
  } = useTablePagination({
    initialPageSize: agendaPageSizeOptions[0],
    pageSizeOptions: agendaPageSizeOptions,
    resetKey: sortedTasks.map((task) => task.taskId).join('|'),
    rows: sortedTasks,
  });
  const pageTaskIds = useMemo(() => paginatedTasks.map((task) => task.taskId), [paginatedTasks]);
  const pageSelection = useMemo(() => {
    const selectedCount = pageTaskIds.filter((taskId) => rowSelection.isSelected(taskId)).length;

    return {
      allVisibleSelected: pageTaskIds.length > 0 && selectedCount === pageTaskIds.length,
      someVisibleSelected: selectedCount > 0 && selectedCount < pageTaskIds.length,
    };
  }, [pageTaskIds, rowSelection]);

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
            <span className="mb-3 block text-3xl" aria-hidden="true">📋</span>
            <p className="font-medium">{agendaCopy.table.empty}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={onClearFilters}>{agendaCopy.filters.clear}</Button>
              <Button type="button" className="bg-[#F4C84A] text-slate-950 hover:bg-[#E5B835]" onClick={onCreateTask}>{agendaCopy.header.actions.create}</Button>
            </div>
          </div>
        ) : null}

        {!isAgendaViewLoading && paginatedTasks.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginatedTasks.map((task) => {
              const selected = rowSelection.isSelected(task.taskId);
              const displayStatus = getTaskDisplayStatus(task);

              return (
                <article
                  key={task.taskId}
                  className={cn(
                    'bg-white px-3 py-3 dark:bg-slate-800',
                    selected && 'border-[#F4C84A]/60 bg-[#F4C84A]/10 dark:bg-[#F4C84A]/15',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      aria-label={`${agendaCopy.columns.folio.label}: ${task.folio}`}
                      checked={selected}
                      disabled={isTaskPending(task.taskId)}
                      onCheckedChange={(checked) => rowSelection.toggleSelection(task.taskId, checked === true)}
                      className="mt-1 border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{task.title}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{task.folio}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          {agendaCopy.statuses[displayStatus]}
                        </span>
                      </div>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex min-w-0 items-center gap-1"><FolderKanban className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{task.projectName ?? task.processTitle ?? task.businessName ?? agendaCopy.common.noRecord}</span></span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{task.dueDate ?? agendaCopy.common.noDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 pl-8">
                    <div className="min-w-0 flex-1 overflow-x-auto">{renderTaskActions(task)}</div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-medium"
                      onClick={() => setMobileDetailTask(task)}
                    >
                      <Maximize2 className="h-4 w-4" />
                      {agendaCopy.actions.viewDetails}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      {mobileDetailTask ? (
        <div className="fixed inset-0 z-[170] flex flex-col bg-white dark:bg-slate-950 md:hidden" role="dialog" aria-modal="true" aria-label={agendaCopy.actions.viewDetails}>
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#9A6B05]">{mobileDetailTask.folio}</p>
              <h2 className="mt-1 text-lg font-medium leading-tight text-slate-950 dark:text-white">{mobileDetailTask.title}</h2>
            </div>
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={agendaCopy.actions.closeDetails} onClick={() => setMobileDetailTask(null)}>
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
            <div className="grid gap-3">
              {[primaryMobileColumn, ...secondaryMobileColumns].filter(Boolean).map((column) => column ? (
                <section key={`${mobileDetailTask.taskId}-detail-${column.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">{column.label}</p>
                  {renderAgendaTaskCell(mobileDetailTask, column.id as AgendaColumnId)}
                </section>
              ) : null)}
            </div>
          </div>
          <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <p className="mb-2 text-[10px] font-medium text-slate-500">{actionsMobileLabel}</p>
            {renderTaskActions(mobileDetailTask)}
          </footer>
        </div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <Table style={{ minWidth: agendaTableMinWidth, tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead
                className="px-4 py-4"
                style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
              >
                <Checkbox
                  aria-label={agendaCopy.columns.folio.description}
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
                    className="px-4 py-3.5 align-middle"
                    style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
                  >
                    <Checkbox
                      aria-label={`${agendaCopy.columns.folio.label}: ${task.folio}`}
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
                        className="whitespace-normal break-words px-4 py-3.5 align-middle"
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
                        className="whitespace-normal px-4 py-3.5 align-middle"
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
                  <span className="mb-3 block text-3xl" aria-hidden="true">📋</span>
                  <span className="font-medium">{agendaCopy.table.empty}</span>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="outline" onClick={onClearFilters}>{agendaCopy.filters.clear}</Button>
                    <Button type="button" className="bg-[#F4C84A] text-slate-950 hover:bg-[#E5B835]" onClick={onCreateTask}>{agendaCopy.header.actions.create}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      {!isAgendaViewLoading && totalCount > 0 ? (
        <DataTablePagination
          currentPage={currentPage}
          itemLabel={agendaCopy.header.title}
          labels={{
            next: agendaCopy.table.next,
            page: (page, pageCount) => `${page} / ${pageCount}`,
            previous: agendaCopy.table.previous,
            rowsPerPage: agendaCopy.table.rowsPerPage,
            showing: (start, end, total) => agendaCopy.table.showing(start, end, total),
          }}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      ) : null}
    </section>
  );
}
