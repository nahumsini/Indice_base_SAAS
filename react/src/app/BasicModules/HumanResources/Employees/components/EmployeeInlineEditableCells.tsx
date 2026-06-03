import {
  allFilterValue,
  inlineUnassignedValue,
} from '../constants/employees.constants';
import { getSuggestedPositionsByDepartment } from '../data/departmentPositionMap';
import type { EmployeesTranslations } from '../translations';
import type {
  EmployeeViewModel,
  InlineEditableEmployeeField,
  InlineEmployeeUpdateOverrides,
  OrganizationSelectOption,
} from '../types/employees.types';
import { mergeTextOptions } from '../utils/employees.utils';
import { InlineTableSelect } from './EmployeeTableControls';

type InlineEmployeeUpdateHandler = (
  employee: EmployeeViewModel,
  field: InlineEditableEmployeeField,
  overrides: InlineEmployeeUpdateOverrides,
) => void | Promise<void>;

interface InlineCellBaseProps {
  copy: EmployeesTranslations;
  employee: EmployeeViewModel;
  inlineDrafts: Record<number, InlineEmployeeUpdateOverrides>;
  inlineSavingKey: string | null;
  locale: string;
  onInlineEmployeeUpdate: InlineEmployeeUpdateHandler;
}

interface EmployeeDepartmentInlineCellProps extends InlineCellBaseProps {
  departmentOptions: string[];
}

interface EmployeePositionInlineCellProps extends InlineCellBaseProps {
  employeePositionOptions: string[];
}

interface EmployeeUnitInlineCellProps extends InlineCellBaseProps {
  inlineUnitOptions: OrganizationSelectOption[];
  resolveDefaultBusinessIdForUnit: (unitId: string, currentBusinessId: string) => string;
}

interface EmployeeBusinessInlineCellProps extends InlineCellBaseProps {
  getBusinessOptionsForUnit: (unitId: string) => OrganizationSelectOption[];
}

const toInlineSelectValue = (value: string | null | undefined) => {
  const normalized = String(value ?? '').trim();
  return normalized && normalized !== allFilterValue ? normalized : inlineUnassignedValue;
};

const withCurrentTextOption = (options: string[], currentValue: string) =>
  mergeTextOptions(options, currentValue ? [currentValue] : []);

const ensureSelectedOrganizationOption = (
  options: OrganizationSelectOption[],
  value: string,
  fallbackLabel: string,
): OrganizationSelectOption[] => {
  if (value !== inlineUnassignedValue && options.some((option) => option.value === value)) {
    return options;
  }

  return [
    {
      value,
      label: fallbackLabel,
      disabled: value === inlineUnassignedValue,
    },
    ...options,
  ];
};

export function EmployeeDepartmentInlineCell({
  copy,
  departmentOptions,
  employee,
  inlineDrafts,
  inlineSavingKey,
  onInlineEmployeeUpdate,
}: EmployeeDepartmentInlineCellProps) {
  const draft = inlineDrafts[employee.id] ?? {};
  const effectiveDepartment = draft.department ?? employee.department;
  const value = toInlineSelectValue(effectiveDepartment);
  const options = ensureSelectedOrganizationOption(
    withCurrentTextOption(departmentOptions, effectiveDepartment).map((department) => ({
      value: department,
      label: department,
    })),
    value,
    copy.fieldFallback,
  );

  return (
    <InlineTableSelect
      value={value}
      options={options}
      placeholder={copy.fieldFallback}
      disabled={inlineSavingKey === `${employee.id}:department`}
      onChange={(nextDepartment) => {
        if (nextDepartment === inlineUnassignedValue) {
          return;
        }
        void onInlineEmployeeUpdate(employee, 'department', { department: nextDepartment });
      }}
    />
  );
}

export function EmployeePositionInlineCell({
  copy,
  employee,
  employeePositionOptions,
  inlineDrafts,
  inlineSavingKey,
  locale,
  onInlineEmployeeUpdate,
}: EmployeePositionInlineCellProps) {
  const draft = inlineDrafts[employee.id] ?? {};
  const effectiveDepartment = draft.department ?? employee.department;
  const effectivePosition = draft.position ?? employee.position;
  const value = toInlineSelectValue(effectivePosition);
  const positionOptions = mergeTextOptions(
    getSuggestedPositionsByDepartment(effectiveDepartment, locale),
    employeePositionOptions,
    effectivePosition ? [effectivePosition] : [],
  );
  const options = ensureSelectedOrganizationOption(
    positionOptions.map((position) => ({
      value: position,
      label: position,
    })),
    value,
    copy.fieldFallback,
  );

  return (
    <InlineTableSelect
      value={value}
      options={options}
      placeholder={copy.fieldFallback}
      disabled={inlineSavingKey === `${employee.id}:position`}
      onChange={(nextPosition) => {
        if (nextPosition === inlineUnassignedValue) {
          return;
        }
        void onInlineEmployeeUpdate(employee, 'position', { position: nextPosition });
      }}
    />
  );
}

export function EmployeeUnitInlineCell({
  copy,
  employee,
  inlineDrafts,
  inlineSavingKey,
  inlineUnitOptions,
  onInlineEmployeeUpdate,
  resolveDefaultBusinessIdForUnit,
}: EmployeeUnitInlineCellProps) {
  const draft = inlineDrafts[employee.id] ?? {};
  const effectiveUnitId = draft.unitId ?? employee.unitId;
  const value = toInlineSelectValue(effectiveUnitId);
  const options = ensureSelectedOrganizationOption(
    inlineUnitOptions,
    value,
    employee.unitLabel || copy.unitFallback,
  );

  return (
    <InlineTableSelect
      value={value}
      options={options}
      placeholder={copy.unitFallback}
      disabled={inlineSavingKey === `${employee.id}:unit`}
      onChange={(nextUnitId) => {
        if (nextUnitId === inlineUnassignedValue) {
          return;
        }

        const nextBusinessId = resolveDefaultBusinessIdForUnit(nextUnitId, draft.businessId ?? employee.businessId);
        void onInlineEmployeeUpdate(employee, 'unit', {
          unitId: nextUnitId,
          businessId: nextBusinessId,
        });
      }}
    />
  );
}

export function EmployeeBusinessInlineCell({
  copy,
  employee,
  getBusinessOptionsForUnit,
  inlineDrafts,
  inlineSavingKey,
  onInlineEmployeeUpdate,
}: EmployeeBusinessInlineCellProps) {
  const draft = inlineDrafts[employee.id] ?? {};
  const unitValue = toInlineSelectValue(draft.unitId ?? employee.unitId);
  const value = toInlineSelectValue(draft.businessId ?? employee.businessId);
  const businessOptionsForUnit = unitValue === inlineUnassignedValue ? [] : getBusinessOptionsForUnit(unitValue);
  const options = ensureSelectedOrganizationOption(
    businessOptionsForUnit,
    value,
    employee.businessLabel || copy.businessFallback,
  );

  return (
    <InlineTableSelect
      value={value}
      options={options}
      placeholder={copy.businessFallback}
      disabled={inlineSavingKey === `${employee.id}:business` || unitValue === inlineUnassignedValue}
      onChange={(nextBusinessId) => {
        if (nextBusinessId === inlineUnassignedValue) {
          return;
        }
        void onInlineEmployeeUpdate(employee, 'business', { businessId: nextBusinessId });
      }}
    />
  );
}
