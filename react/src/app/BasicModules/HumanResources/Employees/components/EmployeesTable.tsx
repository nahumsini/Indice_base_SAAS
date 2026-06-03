import type { ReactNode } from 'react';
import {
  ArrowUpDown,
  Edit,
  Trash2,
} from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
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
  isLoading: boolean;
  onDeleteEmployee: (employee: EmployeeViewModel) => void;
  onEditEmployee: (employee: EmployeeViewModel) => void;
  onSort: (columnId: EmployeeColumnId) => void;
  renderColumnCell: (employee: EmployeeViewModel, columnId: string) => ReactNode;
  rows: EmployeeViewModel[];
  sortState: EmployeeSortState;
  tableLabels: EmployeesTranslations['table'];
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
  onSort,
  sortState,
}: Pick<
  EmployeesTableProps,
  'actionsLabel' | 'columns' | 'onSort' | 'sortState'
>) {
  return (
    <TableHeader>
      <TableRow className="border-slate-200 dark:border-slate-700">
        {columns.map((column) => (
          <TableHead key={column.id} className="px-5 py-6">
            <button
              type="button"
              onClick={() => onSort(column.id as EmployeeColumnId)}
              className="flex items-center gap-2 text-left text-sm font-semibold text-slate-500 dark:text-slate-400"
            >
              <span>{column.label}</span>
              <ArrowUpDown
                className={cn(
                  'h-4 w-4',
                  sortState.columnId === column.id ? 'text-[#59C3A5] dark:text-blue-300' : 'text-slate-400',
                )}
              />
            </button>
          </TableHead>
        ))}
        <TableHead className="px-5 py-6 text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
          {actionsLabel}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

function EmployeesTableBody({
  columns,
  isLoading,
  onDeleteEmployee,
  onEditEmployee,
  renderColumnCell,
  rows,
  tableLabels,
  totalCount,
}: Pick<
  EmployeesTableProps,
  | 'columns'
  | 'isLoading'
  | 'onDeleteEmployee'
  | 'onEditEmployee'
  | 'renderColumnCell'
  | 'rows'
  | 'tableLabels'
  | 'totalCount'
>) {
  if (isLoading) {
    return (
      <TableBody>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="border-slate-200 dark:border-slate-700">
            {columns.map((column) => (
              <TableCell key={column.id} className="px-5 py-6">
                <Skeleton className="h-4 w-full max-w-[180px]" />
              </TableCell>
            ))}
            <TableCell className="px-5 py-6">
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
            colSpan={columns.length + 1}
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
          className="border-slate-200 dark:border-slate-700"
        >
          {columns.map((column) => (
            <TableCell
              key={`${employee.id}-${column.id}`}
              className={cn('px-5 py-6 align-middle', wrappingColumnIds.has(column.id) ? 'whitespace-normal' : '')}
            >
              {renderColumnCell(employee, column.id)}
            </TableCell>
          ))}
          <TableCell className="px-5 py-6">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
              <EmployeeTableActionButton
                icon={<Edit className="h-4 w-4 text-blue-600" />}
                label={tableLabels.editHrUserLabel}
                onClick={() => onEditEmployee(employee)}
                toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
              />
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
  isLoading,
  onDeleteEmployee,
  onEditEmployee,
  onSort,
  renderColumnCell,
  rows,
  sortState,
  tableLabels,
  totalCount,
}: EmployeesTableProps) {
  return (
    <Table style={{ minWidth: Math.max(1320, columns.length * 190 + 120) }}>
      <EmployeesTableHeader
        actionsLabel={actionsLabel}
        columns={columns}
        onSort={onSort}
        sortState={sortState}
      />
      <EmployeesTableBody
        columns={columns}
        isLoading={isLoading}
        onDeleteEmployee={onDeleteEmployee}
        onEditEmployee={onEditEmployee}
        renderColumnCell={renderColumnCell}
        rows={rows}
        tableLabels={tableLabels}
        totalCount={totalCount}
      />
    </Table>
  );
}
