import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
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
  visibleTaskIds: number[];
  visibleTaskSelection: {
    allVisibleSelected: boolean;
    someVisibleSelected: boolean;
  };
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
  visibleTaskIds,
  visibleTaskSelection,
}: AgendaTableViewProps) {
  const primaryMobileColumn = visibleAgendaColumns[0];
  const secondaryMobileColumns = visibleAgendaColumns.slice(1);
  const actionsMobileLabel = fixedAgendaColumns[0]?.label ?? agendaCopy.columns.actions.label;

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

        {!isAgendaViewLoading && sortedTasks.length > 0 ? (
          <div className="space-y-3 p-3">
            {sortedTasks.map((task) => {
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
                    visibleTaskSelection.allVisibleSelected
                      ? true
                      : visibleTaskSelection.someVisibleSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) => rowSelection.toggleAllVisible(visibleTaskIds, checked === true)}
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
            {sortedTasks.map((task) => {
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
                        className="px-5 py-5 align-middle"
                        style={{
                          width: agendaColumnWidths[columnId],
                          minWidth: agendaColumnWidths[columnId],
                        }}
                      >
                        {renderAgendaTaskCell(task, columnId)}
                      </TableCell>
                    );
                  })}
                  {fixedAgendaColumns.map((column) => {
                    const columnId = column.id as AgendaFixedColumnId;

                    return (
                      <TableCell
                        key={`${task.taskId}-${column.id}`}
                        className="px-5 py-5 align-middle"
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
    </section>
  );
}
