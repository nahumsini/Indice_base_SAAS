import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { EmployeesTranslations } from '../translations';
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
  getBusinessOptionsForUnit: (unitId: string) => OrganizationSelectOption[];
  inlineDepartmentOptions: string[];
  inlineDrafts: Record<number, InlineEmployeeUpdateOverrides>;
  inlineSavingKey: string | null;
  inlineUnitOptions: OrganizationSelectOption[];
  isLoading: boolean;
  locale: string;
  onDeleteEmployee: (employee: EmployeeViewModel) => void;
  onEditEmployee: (employee: EmployeeViewModel) => void;
  onInlineEmployeeUpdate: (
    employee: EmployeeViewModel,
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => void | Promise<void>;
  onPageChange: (page: number) => void;
  onSort: (columnId: EmployeeColumnId) => void;
  pageEnd: number;
  pageStart: number;
  resolveDefaultBusinessIdForUnit: (unitId: string, currentBusinessId: string) => string;
  rows: EmployeeViewModel[];
  sortState: EmployeeSortState;
  totalCount: number;
  totalPages: number;
}

export function EmployeesTableSection({
  columns,
  copy,
  currentPage,
  employeePositionOptions,
  getBusinessOptionsForUnit,
  inlineDepartmentOptions,
  inlineDrafts,
  inlineSavingKey,
  inlineUnitOptions,
  isLoading,
  locale,
  onDeleteEmployee,
  onEditEmployee,
  onInlineEmployeeUpdate,
  onPageChange,
  onSort,
  pageEnd,
  pageStart,
  resolveDefaultBusinessIdForUnit,
  rows,
  sortState,
  totalCount,
  totalPages,
}: EmployeesTableSectionProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <EmployeesTable
        actionsLabel={copy.columns.actions}
        columns={columns}
        isLoading={isLoading}
        onDeleteEmployee={onDeleteEmployee}
        onEditEmployee={onEditEmployee}
        onSort={onSort}
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
            onInlineEmployeeUpdate={onInlineEmployeeUpdate}
            resolveDefaultBusinessIdForUnit={resolveDefaultBusinessIdForUnit}
          />
        )}
        rows={rows}
        sortState={sortState}
        tableLabels={copy.table}
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
