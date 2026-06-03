import { useMemo, useState } from 'react';
import { allFilterValue } from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import type {
  EmployeeBusinessOption,
  EmployeeUnitOption,
  EmployeeViewModel,
  Option,
} from '../types/employees.types';

interface EmployeesFiltersParams {
  businessOptions: EmployeeBusinessOption[];
  copy: EmployeesTranslations;
  employees: EmployeeViewModel[];
  unitOptions: EmployeeUnitOption[];
}

const searchableEmployeeValues = (employee: EmployeeViewModel) => [
  employee.fullName,
  employee.code,
  employee.position,
  employee.email,
  employee.phone,
  employee.address,
  employee.nationalId,
  employee.taxId,
  employee.socialSecurityNumber,
  employee.registrationCountry,
  employee.stateProvince,
  employee.city,
  employee.postalCode,
  employee.alternatePhone,
  employee.emergencyContactName,
  employee.emergencyContactRelationship,
  employee.emergencyContactPhone,
];

export function useEmployeesFilters({
  businessOptions,
  copy,
  employees,
  unitOptions,
}: EmployeesFiltersParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState(allFilterValue);
  const [businessFilter, setBusinessFilter] = useState(allFilterValue);
  const [departmentFilter, setDepartmentFilter] = useState(allFilterValue);
  const [statusFilter, setStatusFilter] = useState('active');

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableEmployeeValues(employee).some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesUnit = unitFilter === allFilterValue || employee.unitId === unitFilter;
      const matchesBusiness = businessFilter === allFilterValue || employee.businessId === businessFilter;
      const matchesDepartment = departmentFilter === allFilterValue || employee.department === departmentFilter;
      const matchesStatus = statusFilter === allFilterValue || employee.status === statusFilter;

      return matchesSearch && matchesUnit && matchesBusiness && matchesDepartment && matchesStatus;
    });
  }, [
    businessFilter,
    departmentFilter,
    employees,
    searchQuery,
    statusFilter,
    unitFilter,
  ]);

  const departmentFilterOptions = useMemo<Option<string>[]>(
    () => [
      { value: allFilterValue, label: copy.filters.all },
      ...departmentOptions.map((department) => ({ value: department, label: department })),
    ],
    [copy.filters.all, departmentOptions],
  );
  const unitFilterOptions = useMemo<Option<string>[]>(
    () => unitOptions.length > 0 ? unitOptions : [{ value: allFilterValue, label: copy.filters.all }],
    [copy.filters.all, unitOptions],
  );
  const businessFilterOptions = useMemo<Option<string>[]>(
    () => businessOptions.length > 0 ? businessOptions : [{ value: allFilterValue, label: copy.filters.all }],
    [businessOptions, copy.filters.all],
  );
  const statusFilterOptions = useMemo<Option<string>[]>(
    () => [
      { value: allFilterValue, label: copy.filters.all },
      { value: 'active', label: copy.statusLabels.active },
      { value: 'inactive', label: copy.statusLabels.inactive },
      { value: 'terminated', label: copy.statusLabels.terminated },
    ],
    [
      copy.filters.all,
      copy.statusLabels.active,
      copy.statusLabels.inactive,
      copy.statusLabels.terminated,
    ],
  );
  const filtersKey = [
    searchQuery,
    unitFilter,
    businessFilter,
    departmentFilter,
    statusFilter,
  ].join('\u0000');

  return {
    businessFilter,
    businessFilterOptions,
    departmentFilter,
    departmentFilterOptions,
    departmentOptions,
    filteredEmployees,
    filtersKey,
    searchQuery,
    setBusinessFilter,
    setDepartmentFilter,
    setSearchQuery,
    setStatusFilter,
    setUnitFilter,
    statusFilter,
    statusFilterOptions,
    unitFilter,
    unitFilterOptions,
  };
}
