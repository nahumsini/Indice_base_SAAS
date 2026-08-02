import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
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
import { Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import { HrMobileDataCard } from '../../shared/HrMobileDataCard';
import { EmployeeTableActionButton } from './EmployeeTableControls';

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
  onPageSizeChange: (pageSize: number) => void;
  onResizeStart: (event: ReactMouseEvent, columnId: string) => void;
  onSort: (columnId: EmployeeColumnId) => void;
  onToggleAllRows: (checked: boolean) => void;
  onToggleRowSelection: (employeeId: number, checked: boolean) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  pageStart: number;
  renderPinAction?: (employee: EmployeeViewModel) => ReactNode;
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
  onPageSizeChange,
  onResizeStart,
  onSort,
  onToggleAllRows,
  onToggleRowSelection,
  pageEnd,
  pageSize,
  pageSizeOptions,
  pageStart,
  renderPinAction,
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
      <div className="grid grid-cols-1 gap-3 bg-slate-50/60 p-3 lg:grid-cols-2 xl:hidden dark:bg-slate-900/30">
        {isLoading ? Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-[22px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        )) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{copy.table.emptyState}</div>
        ) : rows.map((employee) => (
          <HrMobileDataCard
            key={employee.id}
            selected={isRowSelected(employee.id)}
            selection={(
              <Checkbox
                aria-label={copy.table.selectEmployee(employee.fullName)}
                checked={isRowSelected(employee.id)}
                onCheckedChange={(checked) => onToggleRowSelection(employee.id, checked === true)}
                className="mt-1 border-slate-300 data-[state=checked]:border-[#59C3A5] data-[state=checked]:bg-[#59C3A5]"
              />
            )}
            leading={<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF8F4] text-lg dark:bg-[#13362F]">👥</div>}
            title={employee.fullName}
            subtitle={`${employee.code}${employee.email ? ` · ${employee.email}` : ''}`}
            badges={<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{copy.statusLabels[employee.status]}</span>}
            details={[
              { label: copy.columns.position, value: employee.position || '—' },
              { label: copy.columns.department, value: employee.department || '—' },
              { label: copy.columns.unit, value: employee.unitLabel || '—' },
              { label: copy.columns.business, value: employee.businessLabel || '—' },
              { label: copy.columns.phone, value: employee.phone || '—' },
              { label: copy.columns.salaryType, value: copy.salaryTypeLabels[employee.salaryType] },
            ]}
            actions={(
              <>
                <EmployeeTableActionButton
                  icon={<Edit className="h-4 w-4" />}
                  label={copy.table.editHrUserLabel}
                  onClick={() => onEditEmployee(employee)}
                  toneClassName="border-[#59C3A5]/35 bg-[#EAF8F4] text-[#177d66] hover:bg-[#D8F2EB] dark:border-[#59C3A5]/30 dark:bg-[#13362F] dark:text-[#8DE1CB]"
                />
                {renderPinAction?.(employee)}
                <EmployeeTableActionButton
                  icon={<Trash2 className="h-4 w-4" />}
                  label={employee.status === 'terminated' ? copy.table.deleteHrUserLabel : copy.table.terminateHrUserLabel}
                  onClick={() => onDeleteEmployee(employee)}
                  toneClassName="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
                />
              </>
            )}
          />
        ))}
      </div>
      <div className="hidden max-w-full overflow-x-auto xl:block">
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
          renderPinAction={renderPinAction}
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
      </div>

      <EmployeesPagination
        currentPage={currentPage}
        labels={copy.pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageEnd={pageEnd}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        pageStart={pageStart}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </section>
  );
}
