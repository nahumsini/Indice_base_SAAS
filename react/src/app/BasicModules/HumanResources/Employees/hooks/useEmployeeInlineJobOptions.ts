import { useMemo } from 'react';
import { getDepartmentOptionLabels } from '../data/departmentOptions';
import type { EmployeeViewModel } from '../types/employees.types';
import { mergeTextOptions } from '../utils/employees.utils';

interface EmployeeInlineJobOptionsParams {
  departmentOptions: string[];
  employees: EmployeeViewModel[];
  locale: string;
}

export function useEmployeeInlineJobOptions({
  departmentOptions,
  employees,
  locale,
}: EmployeeInlineJobOptionsParams) {
  const employeePositionOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.position).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [employees],
  );

  const inlineDepartmentOptions = useMemo(
    () => mergeTextOptions(getDepartmentOptionLabels(locale), departmentOptions),
    [departmentOptions, locale],
  );

  return {
    employeePositionOptions,
    inlineDepartmentOptions,
  };
}
