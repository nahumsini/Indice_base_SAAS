import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  GripVertical,
  Trash2,
} from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Skeleton } from '../../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { EmployeesTranslations } from '../translations';
import type {
  EmployeeColumnId,
  EmployeeSortState,
  EmployeeViewModel,
} from '../types/employees.types';
import { EmployeeTableActionButton } from './EmployeeTableControls';

interface EmployeesTableProps {
  actionsLabel: string;
  columns: ColumnConfig[];
  getColumnWidth: (columnId: string) => number;
  isLoading: boolean;
  isRowSelected: (employeeId: number) => boolean;
  onResizeStart: (event: ReactMouseEvent, columnId: string) => void;
  onDeleteEmployee: (employee: EmployeeViewModel) => void;
  onEditEmployee: (employee: EmployeeViewModel) => void;
  onToggleAllRows: (checked: boolean) => void;
  onToggleRowSelection: (employeeId: number, checked: boolean) => void;
  onSort: (columnId: EmployeeColumnId) => void;
  renderColumnCell: (employee: EmployeeViewModel, columnId: string) => ReactNode;
  renderPinAction?: (employee: EmployeeViewModel) => ReactNode;
  resizingColumn: string | null;
  rows: EmployeeViewModel[];
  selectionColumnWidth: number;
  selectionState: {
    allVisibleSelected: boolean;
    someVisibleSelected: boolean;
  };
  sortState: EmployeeSortState;
  tableLabels: EmployeesTranslations['table'];
  tableMinWidth: number;
  totalCount: number;
}

const wrappingColumnIds = new Set<string>([
  'employee',
  'email',
  'address',
  'unit',
  'business',
  'emergencyContactName',
  'emergencyContactRelationship',
]);

function EmployeesTableHeader({
  actionsLabel,
  columns,
  getColumnWidth,
  onResizeStart,
  onToggleAllRows,
  onSort,
  resizingColumn,
  selectionColumnWidth,
  selectionState,
  sortState,
  tableLabels,
}: Pick<
  EmployeesTableProps,
  | 'actionsLabel'
  | 'columns'
  | 'getColumnWidth'
  | 'onResizeStart'
  | 'onToggleAllRows'
  | 'onSort'
  | 'resizingColumn'
  | 'selectionColumnWidth'
  | 'selectionState'
  | 'sortState'
  | 'tableLabels'
>) {
  return (
    <TableHeader>
      <TableRow className="border-slate-200 dark:border-slate-700">
        <TableHead
          className="px-5 py-5"
          style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
        >
          <Checkbox
            aria-label={tableLabels.selectAllVisible}
            checked={
              selectionState.allVisibleSelected
                ? true
                : selectionState.someVisibleSelected
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(checked) => onToggleAllRows(checked === true)}
            className="border-slate-300 data-[state=checked]:border-[#59C3A5] data-[state=checked]:bg-[#59C3A5]"
          />
        </TableHead>
        {columns.map((column) => (
          <TableHead
            key={column.id}
            className="group relative px-5 py-5"
            style={{ width: getColumnWidth(column.id), minWidth: getColumnWidth(column.id) }}
          >
            <div className="flex min-w-0 items-center justify-between gap-3 pr-2">
              <button
                type="button"
                onClick={() => onSort(column.id as EmployeeColumnId)}
                className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:text-[#177d66] dark:text-slate-400"
              >
                <span className="truncate">{column.label}</span>
                {(() => {
                  const isActiveSort = sortState.columnId === column.id;
                  const SortIcon = isActiveSort
                    ? sortState.direction === 'asc'
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;

                  return (
                    <SortIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActiveSort ? 'text-[#59C3A5]' : 'text-slate-400',
                      )}
                    />
                  );
                })()}
              </button>
              <button
                type="button"
                title={tableLabels.resizeColumn}
                aria-label={tableLabels.resizeColumn}
                onMouseDown={(event) => onResizeStart(event, column.id)}
                className={cn(
                  'absolute bottom-0 right-0 top-0 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:bg-[#59C3A5]/20 group-hover:opacity-100',
                  resizingColumn === column.id && 'bg-[#59C3A5]/25 opacity-100',
                )}
              >
                <GripVertical className="h-4 w-4 text-[#177d66]" />
              </button>
            </div>
          </TableHead>
        ))}
        <TableHead
          className="group relative px-5 py-5 text-sm font-semibold uppercase text-slate-500 dark:text-slate-400"
          style={{ width: getColumnWidth('actions'), minWidth: getColumnWidth('actions') }}
        >
          <div className="flex min-w-0 items-center justify-between gap-3 pr-2">
            <span className="truncate">{actionsLabel}</span>
            <button
              type="button"
              title={tableLabels.resizeColumn}
              aria-label={tableLabels.resizeColumn}
              onMouseDown={(event) => onResizeStart(event, 'actions')}
              className={cn(
                'absolute bottom-0 right-0 top-0 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:bg-[#59C3A5]/20 group-hover:opacity-100',
                resizingColumn === 'actions' && 'bg-[#59C3A5]/25 opacity-100',
              )}
            >
              <GripVertical className="h-4 w-4 text-[#177d66]" />
            </button>
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

function EmployeesTableBody({
  columns,
  getColumnWidth,
  isLoading,
  isRowSelected,
  onDeleteEmployee,
  onEditEmployee,
  onToggleRowSelection,
  renderColumnCell,
  renderPinAction,
  rows,
  selectionColumnWidth,
  tableLabels,
  totalCount,
}: Pick<
  EmployeesTableProps,
  | 'columns'
  | 'getColumnWidth'
  | 'isLoading'
  | 'isRowSelected'
  | 'onDeleteEmployee'
  | 'onEditEmployee'
  | 'onToggleRowSelection'
  | 'renderColumnCell'
  | 'renderPinAction'
  | 'rows'
  | 'selectionColumnWidth'
  | 'tableLabels'
  | 'totalCount'
>) {
  if (isLoading) {
    return (
      <TableBody>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="border-slate-200 dark:border-slate-700">
            <TableCell
              className="px-5 py-6"
              style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
            >
              <Skeleton className="h-4 w-4 rounded" />
            </TableCell>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                className="px-5 py-6"
                style={{ width: getColumnWidth(column.id), minWidth: getColumnWidth(column.id) }}
              >
                <Skeleton className="h-4 w-full max-w-[180px]" />
              </TableCell>
            ))}
            <TableCell
              className="px-5 py-6"
              style={{ width: getColumnWidth('actions'), minWidth: getColumnWidth('actions') }}
            >
              <Skeleton className="h-9 w-24 rounded-2xl" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  }

  if (totalCount === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={columns.length + 2}
            className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
          >
            {tableLabels.emptyState}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {rows.map((employee) => (
        <TableRow
          key={employee.id}
          className={cn(
            'border-slate-200 dark:border-slate-700',
            isRowSelected(employee.id) && 'bg-[#59C3A5]/10 dark:bg-[#59C3A5]/15',
          )}
        >
          <TableCell
            className="px-5 py-6 align-middle"
            style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
          >
            <Checkbox
              aria-label={tableLabels.selectEmployee(employee.fullName)}
              checked={isRowSelected(employee.id)}
              onCheckedChange={(checked) => onToggleRowSelection(employee.id, checked === true)}
              className="border-slate-300 data-[state=checked]:border-[#59C3A5] data-[state=checked]:bg-[#59C3A5]"
            />
          </TableCell>
          {columns.map((column) => (
            <TableCell
              key={`${employee.id}-${column.id}`}
              className={cn('overflow-hidden px-5 py-6 align-middle', wrappingColumnIds.has(column.id) ? 'whitespace-normal' : '')}
              style={{ width: getColumnWidth(column.id), minWidth: getColumnWidth(column.id) }}
            >
              {renderColumnCell(employee, column.id)}
            </TableCell>
          ))}
          <TableCell
            className="px-5 py-6"
            style={{ width: getColumnWidth('actions'), minWidth: getColumnWidth('actions') }}
          >
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
              <EmployeeTableActionButton
                icon={<Edit className="h-4 w-4 text-blue-600" />}
                label={tableLabels.editHrUserLabel}
                onClick={() => onEditEmployee(employee)}
                toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
              />
              {renderPinAction?.(employee)}
              <EmployeeTableActionButton
                icon={<Trash2 className="h-4 w-4 text-red-600" />}
                label={employee.status === 'terminated' ? tableLabels.deleteHrUserLabel : tableLabels.terminateHrUserLabel}
                onClick={() => onDeleteEmployee(employee)}
                toneClassName="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
              />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export function EmployeesTable({
  actionsLabel,
  columns,
  getColumnWidth,
  isLoading,
  isRowSelected,
  onResizeStart,
  onDeleteEmployee,
  onEditEmployee,
  onToggleAllRows,
  onToggleRowSelection,
  onSort,
  renderColumnCell,
  renderPinAction,
  resizingColumn,
  rows,
  selectionColumnWidth,
  selectionState,
  sortState,
  tableLabels,
  tableMinWidth,
  totalCount,
}: EmployeesTableProps) {
  return (
    <Table style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
      <EmployeesTableHeader
        actionsLabel={actionsLabel}
        columns={columns}
        getColumnWidth={getColumnWidth}
        onResizeStart={onResizeStart}
        onToggleAllRows={onToggleAllRows}
        onSort={onSort}
        resizingColumn={resizingColumn}
        selectionColumnWidth={selectionColumnWidth}
        selectionState={selectionState}
        sortState={sortState}
        tableLabels={tableLabels}
      />
      <EmployeesTableBody
        columns={columns}
        getColumnWidth={getColumnWidth}
        isLoading={isLoading}
        isRowSelected={isRowSelected}
        onDeleteEmployee={onDeleteEmployee}
        onEditEmployee={onEditEmployee}
        onToggleRowSelection={onToggleRowSelection}
        renderColumnCell={renderColumnCell}
        renderPinAction={renderPinAction}
        rows={rows}
        selectionColumnWidth={selectionColumnWidth}
        tableLabels={tableLabels}
        totalCount={totalCount}
      />
    </Table>
  );
}
