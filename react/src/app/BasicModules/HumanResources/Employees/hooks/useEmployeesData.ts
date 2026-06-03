import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardApi } from '../../../../api/dashboard';
import {
  humanResourcesApi,
  type AttendanceControlLocation,
  type BackendHrUser,
} from '../../../../api/humanResources';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { allFilterValue } from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import type {
  EmployeeBusinessOption,
  EmployeeSummary,
  EmployeeUnitOption,
  EmployeeViewModel,
} from '../types/employees.types';
import { mapEmployee, mapEmployeeDetails } from '../utils/employees.adapters';
import { normalizeErrorMessage } from '../utils/employees.utils';

const emptySummary: EmployeeSummary = {
  total_count: 0,
  active_count: 0,
  inactive_count: 0,
  terminated_count: 0,
  total_payroll_amount_monthly: 0,
};

export function useEmployeesData(copy: EmployeesTranslations) {
  const [employees, setEmployees] = useState<EmployeeViewModel[]>([]);
  const [summary, setSummary] = useState<EmployeeSummary>(emptySummary);
  const [unitOptions, setUnitOptions] = useState<EmployeeUnitOption[]>([]);
  const [businessOptions, setBusinessOptions] = useState<EmployeeBusinessOption[]>([]);
  const [attendanceLocations, setAttendanceLocations] = useState<AttendanceControlLocation[]>([]);
  const [hasLoadedAttendanceLocations, setHasLoadedAttendanceLocations] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const hydratedEmployeeIdsRef = useRef(new Set<number>());
  const attendanceLocationsRequestRef = useRef<Promise<AttendanceControlLocation[]> | null>(null);

  const hydrateEmployeeDetails = useCallback(async (employeeIds: number[]) => {
    const pendingEmployeeIds = Array.from(new Set(employeeIds)).filter((employeeId) => (
      !hydratedEmployeeIdsRef.current.has(employeeId)
    ));

    if (pendingEmployeeIds.length === 0) {
      return;
    }

    const detailResults = await Promise.allSettled(
      pendingEmployeeIds.map((employeeId) => humanResourcesApi.getHrUserDetails(employeeId)),
    );
    const employeesById = new Map<number, EmployeeViewModel>();

    detailResults.forEach((result) => {
      if (result.status !== 'fulfilled') {
        return;
      }

      const hydratedEmployee = mapEmployeeDetails(result.value, copy.unitFallback, copy.businessFallback);
      hydratedEmployeeIdsRef.current.add(hydratedEmployee.id);
      employeesById.set(hydratedEmployee.id, hydratedEmployee);
    });

    if (employeesById.size === 0) {
      return;
    }

    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) => employeesById.get(employee.id) ?? employee),
    );
  }, [copy.businessFallback, copy.unitFallback]);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const [employeesResponse, unitsResponse, businessesResponse] = await runWithMinimumDuration(
        Promise.all([
          humanResourcesApi.listHrUsers(),
          dashboardApi.listUnits().catch(() => []),
          dashboardApi.listBusinesses().catch(() => []),
        ]),
      );

      hydratedEmployeeIdsRef.current.clear();
      const mappedEmployees = employeesResponse.items.map((employee) =>
        mapEmployee(employee, copy.unitFallback, copy.businessFallback),
      );
      setEmployees(mappedEmployees);
      setSummary(employeesResponse.summary);
      setUnitOptions([
        { value: allFilterValue, label: copy.filters.all },
        ...unitsResponse.map((unit) => ({ value: String(unit.id), label: unit.name })),
      ]);
      setBusinessOptions([
        { value: allFilterValue, label: copy.filters.all },
        ...businessesResponse.map((business) => ({
          value: String(business.id),
          label: business.name,
          unitId: business.unitId ? String(business.unitId) : business.unit_id ? String(business.unit_id) : undefined,
          unit_id: business.unit_id ? String(business.unit_id) : business.unitId ? String(business.unitId) : undefined,
        })),
      ]);
    } catch (error) {
      setLoadError(normalizeErrorMessage(error, copy.errorMessages.load));
    } finally {
      setIsLoading(false);
    }
  }, [
    copy.businessFallback,
    copy.errorMessages.load,
    copy.filters.all,
    copy.unitFallback,
    hydrateEmployeeDetails,
  ]);

  const refreshEmployees = useCallback(async () => {
    const response = await humanResourcesApi.listHrUsers();
    hydratedEmployeeIdsRef.current.clear();
    const mappedEmployees = response.items.map((employee) =>
      mapEmployee(employee, copy.unitFallback, copy.businessFallback),
    );
    setEmployees(mappedEmployees);
    setSummary(response.summary);
  }, [copy.businessFallback, copy.unitFallback]);

  const ensureAttendanceLocations = useCallback(async () => {
    if (hasLoadedAttendanceLocations) {
      return attendanceLocations;
    }

    if (!attendanceLocationsRequestRef.current) {
      attendanceLocationsRequestRef.current = humanResourcesApi
        .listAttendanceControlLocations()
        .then((response) => response.items)
        .catch(() => [])
        .then((locations) => {
          setAttendanceLocations(locations);
          setHasLoadedAttendanceLocations(true);
          attendanceLocationsRequestRef.current = null;
          return locations;
        });
    }

    return attendanceLocationsRequestRef.current;
  }, [attendanceLocations, hasLoadedAttendanceLocations]);

  const replaceEmployee = useCallback((employee: BackendHrUser) => {
    const mappedEmployee = mapEmployee(employee, copy.unitFallback, copy.businessFallback);

    setEmployees((currentEmployees) =>
      currentEmployees.map((currentEmployee) =>
        currentEmployee.id === employee.id
          ? {
              ...currentEmployee,
              ...mappedEmployee,
            }
          : currentEmployee,
      ),
    );
  }, [copy.businessFallback, copy.unitFallback]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  return {
    attendanceLocations,
    businessOptions,
    employees,
    ensureAttendanceLocations,
    hydrateEmployeeDetails,
    isLoading,
    loadEmployees,
    loadError,
    refreshEmployees,
    replaceEmployee,
    summary,
    unitOptions,
  };
}
