import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { EmployeesTranslations } from '../translations';
import type { EmployeeDocumentType } from './CreateEmployeeModal';
import type {
  EmployeeColumnId,
  EmployeeSortState,
  EmployeeViewModel,
  InlineEditableEmployeeField,
  InlineEmployeeUpdateOverrides,
  OrganizationSelectOption,
} from '../types/employees.types';
import { EmployeesPagination } from './EmployeesPagination';
import { EmployeesTable } from './EmployeesTable';
import { EmployeesTableCellContent } from './EmployeesTableCells';

interface EmployeesTableSectionProps {
  columns: ColumnConfig[];
  copy: EmployeesTranslations;
  currentPage: number;
  employeePositionOptions: string[];
  getColumnWidth: (columnId: string) => number;
  getBusinessOptionsForUnit: (unitId: string) => OrganizationSelectOption[];
  inlineDepartmentOptions: string[];
  inlineDrafts: Record<number, InlineEmployeeUpdateOverrides>;
  inlineSavingKey: string | null;
  inlineUnitOptions: OrganizationSelectOption[];
  isLoading: boolean;
  isRowSelected: (employeeId: number) => boolean;
  locale: string;
  onDeleteEmployee: (employee: EmployeeViewModel) => void;
  onDocumentUpload?: (employee: EmployeeViewModel, documentType: EmployeeDocumentType, file: File) => void | Promise<void>;
  onEditEmployee: (employee: EmployeeViewModel) => void;
  onInlineEmployeeUpdate: (
    employee: EmployeeViewModel,
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => void | Promise<void>;
  onPageChange: (page: number) => void;
  onResizeStart: (event: ReactMouseEvent, columnId: string) => void;
  onSort: (columnId: EmployeeColumnId) => void;
  onToggleAllRows: (checked: boolean) => void;
  onToggleRowSelection: (employeeId: number, checked: boolean) => void;
  pageEnd: number;
  pageStart: number;
  resolveDefaultBusinessIdForUnit: (unitId: string, currentBusinessId: string) => string;
  resizingColumn: string | null;
  rows: EmployeeViewModel[];
  selectionColumnWidth: number;
  selectionState: {
    allVisibleSelected: boolean;
    someVisibleSelected: boolean;
  };
  sortState: EmployeeSortState;
  tableMinWidth: number;
  totalCount: number;
  totalPages: number;
  uploadingDocumentKey?: string | null;
}

export function EmployeesTableSection({
  columns,
  copy,
  currentPage,
  employeePositionOptions,
  getColumnWidth,
  getBusinessOptionsForUnit,
  inlineDepartmentOptions,
  inlineDrafts,
  inlineSavingKey,
  inlineUnitOptions,
  isLoading,
  isRowSelected,
  locale,
  onDeleteEmployee,
  onDocumentUpload,
  onEditEmployee,
  onInlineEmployeeUpdate,
  onPageChange,
  onResizeStart,
  onSort,
  onToggleAllRows,
  onToggleRowSelection,
  pageEnd,
  pageStart,
  resolveDefaultBusinessIdForUnit,
  resizingColumn,
  rows,
  selectionColumnWidth,
  selectionState,
  sortState,
  tableMinWidth,
  totalCount,
  totalPages,
  uploadingDocumentKey,
}: EmployeesTableSectionProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <EmployeesTable
        actionsLabel={copy.columns.actions}
        columns={columns}
        getColumnWidth={getColumnWidth}
        isLoading={isLoading}
        isRowSelected={isRowSelected}
        onDeleteEmployee={onDeleteEmployee}
        onEditEmployee={onEditEmployee}
        onResizeStart={onResizeStart}
        onSort={onSort}
        onToggleAllRows={onToggleAllRows}
        onToggleRowSelection={onToggleRowSelection}
        renderColumnCell={(employee, columnId) => (
          <EmployeesTableCellContent
            columnId={columnId}
            copy={copy}
            employee={employee}
            employeePositionOptions={employeePositionOptions}
            getBusinessOptionsForUnit={getBusinessOptionsForUnit}
            inlineDepartmentOptions={inlineDepartmentOptions}
            inlineDrafts={inlineDrafts}
            inlineSavingKey={inlineSavingKey}
            inlineUnitOptions={inlineUnitOptions}
            locale={locale}
            onDocumentUpload={onDocumentUpload}
            onInlineEmployeeUpdate={onInlineEmployeeUpdate}
            resolveDefaultBusinessIdForUnit={resolveDefaultBusinessIdForUnit}
            uploadingDocumentKey={uploadingDocumentKey}
          />
        )}
        resizingColumn={resizingColumn}
        rows={rows}
        selectionColumnWidth={selectionColumnWidth}
        selectionState={selectionState}
        sortState={sortState}
        tableLabels={copy.table}
        tableMinWidth={tableMinWidth}
        totalCount={totalCount}
      />

      <EmployeesPagination
        currentPage={currentPage}
        labels={copy.pagination}
        onPageChange={onPageChange}
        pageEnd={pageEnd}
        pageStart={pageStart}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </section>
  );
}
