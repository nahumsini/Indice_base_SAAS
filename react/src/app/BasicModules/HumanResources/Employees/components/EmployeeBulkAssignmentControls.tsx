import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  allFilterValue,
  inlineUnassignedValue,
} from '../constants/employees.constants';
import { getAllPositionLabels } from '../data/positionOptions';
import type { EmployeesTranslations } from '../translations';
import type {
  EmployeeViewModel,
  InlineEditableEmployeeField,
  InlineEmployeeUpdateOverrides,
  OrganizationSelectOption,
} from '../types/employees.types';
import { mergeTextOptions } from '../utils/employees.utils';
import { InlineTableSelect } from './EmployeeTableControls';

interface EmployeeBulkAssignmentControlsProps {
  copy: EmployeesTranslations;
  employeePositionOptions: string[];
  getBusinessOptionsForUnit: (unitId: string) => OrganizationSelectOption[];
  inlineDepartmentOptions: string[];
  inlineUnitOptions: OrganizationSelectOption[];
  isSaving: boolean;
  locale: string;
  onBulkEmployeeUpdate: (
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => void | Promise<void>;
  resolveDefaultBusinessIdForUnit: (unitId: string, currentBusinessId: string) => string;
  selectedEmployees: EmployeeViewModel[];
}

const normalizeBulkValue = (value: string | null | undefined) => {
  const normalized = String(value ?? '').trim();
  return normalized && normalized !== allFilterValue ? normalized : inlineUnassignedValue;
};

const getSharedValue = (
  employees: EmployeeViewModel[],
  selector: (employee: EmployeeViewModel) => string,
) => {
  const values = new Set(employees.map((employee) => normalizeBulkValue(selector(employee))));
  return values.size === 1 ? Array.from(values)[0] : inlineUnassignedValue;
};

const toSelectOptions = (options: string[]): OrganizationSelectOption[] =>
  options.map((option) => ({ value: option, label: option }));

const withPlaceholderOption = (
  options: OrganizationSelectOption[],
  placeholder: string,
) => [
  {
    value: inlineUnassignedValue,
    label: placeholder,
    disabled: true,
  },
  ...options.filter((option) => option.value !== inlineUnassignedValue),
];

function BulkSelectControl({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

export function EmployeeBulkAssignmentControls({
  copy,
  employeePositionOptions,
  getBusinessOptionsForUnit,
  inlineDepartmentOptions,
  inlineUnitOptions,
  isSaving,
  locale,
  onBulkEmployeeUpdate,
  resolveDefaultBusinessIdForUnit,
  selectedEmployees,
}: EmployeeBulkAssignmentControlsProps) {
  const selectedEmployeeKey = useMemo(
    () => selectedEmployees.map((employee) => employee.id).sort((left, right) => left - right).join('|'),
    [selectedEmployees],
  );
  const sharedUnitId = useMemo(
    () => getSharedValue(selectedEmployees, (employee) => employee.unitId),
    [selectedEmployees],
  );
  const sharedBusinessId = useMemo(
    () => getSharedValue(selectedEmployees, (employee) => employee.businessId),
    [selectedEmployees],
  );
  const sharedDepartment = useMemo(
    () => getSharedValue(selectedEmployees, (employee) => employee.department),
    [selectedEmployees],
  );
  const sharedPosition = useMemo(
    () => getSharedValue(selectedEmployees, (employee) => employee.position),
    [selectedEmployees],
  );
  const [bulkUnitId, setBulkUnitId] = useState(sharedUnitId);
  const [bulkBusinessId, setBulkBusinessId] = useState(sharedBusinessId);
  const [bulkDepartment, setBulkDepartment] = useState(sharedDepartment);
  const [bulkPosition, setBulkPosition] = useState(sharedPosition);
  const businessOptions = useMemo(
    () => bulkUnitId === inlineUnassignedValue ? [] : getBusinessOptionsForUnit(bulkUnitId),
    [bulkUnitId, getBusinessOptionsForUnit],
  );
  const departmentOptions = useMemo(
    () => withPlaceholderOption(
      toSelectOptions(mergeTextOptions(inlineDepartmentOptions, bulkDepartment !== inlineUnassignedValue ? [bulkDepartment] : [])),
      copy.bulk.mixedSelection,
    ),
    [bulkDepartment, copy.bulk.mixedSelection, inlineDepartmentOptions],
  );
  const positionOptions = useMemo(
    () => withPlaceholderOption(
      toSelectOptions(
        mergeTextOptions(
          getAllPositionLabels(locale),
          employeePositionOptions,
          bulkPosition !== inlineUnassignedValue ? [bulkPosition] : [],
        ),
      ),
      copy.bulk.mixedSelection,
    ),
    [bulkPosition, copy.bulk.mixedSelection, employeePositionOptions, locale],
  );

  useEffect(() => {
    setBulkUnitId(sharedUnitId);
    setBulkBusinessId(sharedBusinessId);
    setBulkDepartment(sharedDepartment);
    setBulkPosition(sharedPosition);
  }, [
    selectedEmployeeKey,
    sharedBusinessId,
    sharedDepartment,
    sharedPosition,
    sharedUnitId,
  ]);

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
      <BulkSelectControl label={copy.bulk.changeUnit}>
        <InlineTableSelect
          disabled={isSaving}
          onChange={(nextUnitId) => {
            if (nextUnitId === inlineUnassignedValue) {
              return;
            }

            const currentBusinessId = bulkBusinessId === inlineUnassignedValue ? '' : bulkBusinessId;
            const nextBusinessId = resolveDefaultBusinessIdForUnit(nextUnitId, currentBusinessId);
            setBulkUnitId(nextUnitId);
            setBulkBusinessId(nextBusinessId || inlineUnassignedValue);
            void onBulkEmployeeUpdate('unit', {
              unitId: nextUnitId,
              ...(nextBusinessId ? { businessId: nextBusinessId } : {}),
            });
          }}
          options={withPlaceholderOption(inlineUnitOptions, copy.bulk.mixedSelection)}
          placeholder={copy.bulk.mixedSelection}
          value={bulkUnitId}
        />
      </BulkSelectControl>

      <BulkSelectControl label={copy.bulk.changeBusiness}>
        <InlineTableSelect
          disabled={isSaving || bulkUnitId === inlineUnassignedValue || businessOptions.length === 0}
          onChange={(nextBusinessId) => {
            if (nextBusinessId === inlineUnassignedValue || bulkUnitId === inlineUnassignedValue) {
              return;
            }

            setBulkBusinessId(nextBusinessId);
            void onBulkEmployeeUpdate('business', {
              unitId: bulkUnitId,
              businessId: nextBusinessId,
            });
          }}
          options={withPlaceholderOption(
            businessOptions,
            bulkUnitId === inlineUnassignedValue ? copy.bulk.selectUnitFirst : copy.bulk.mixedSelection,
          )}
          placeholder={bulkUnitId === inlineUnassignedValue ? copy.bulk.selectUnitFirst : copy.bulk.mixedSelection}
          value={bulkBusinessId}
        />
      </BulkSelectControl>

      <BulkSelectControl label={copy.bulk.changeDepartment}>
        <InlineTableSelect
          disabled={isSaving}
          onChange={(nextDepartment) => {
            if (nextDepartment === inlineUnassignedValue) {
              return;
            }

            setBulkDepartment(nextDepartment);
            void onBulkEmployeeUpdate('department', { department: nextDepartment });
          }}
          options={departmentOptions}
          placeholder={copy.bulk.mixedSelection}
          value={bulkDepartment}
        />
      </BulkSelectControl>

      <BulkSelectControl label={copy.bulk.changePosition}>
        <InlineTableSelect
          disabled={isSaving}
          onChange={(nextPosition) => {
            if (nextPosition === inlineUnassignedValue) {
              return;
            }

            setBulkPosition(nextPosition);
            void onBulkEmployeeUpdate('position', { position: nextPosition });
          }}
          options={positionOptions}
          placeholder={copy.bulk.mixedSelection}
          value={bulkPosition}
        />
      </BulkSelectControl>
    </div>
  );
}
