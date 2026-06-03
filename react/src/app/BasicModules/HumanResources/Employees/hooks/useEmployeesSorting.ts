import { useCallback, useMemo, useState } from 'react';
import type {
  EmployeeColumnId,
  EmployeeSortState,
  EmployeeViewModel,
} from '../types/employees.types';
import {
  compareEmployeeSortValues,
  getEmployeeSortValue,
} from '../utils/employees.utils';

export function useEmployeesSorting(employees: EmployeeViewModel[]) {
  const [sortState, setSortState] = useState<EmployeeSortState>({
    columnId: 'employee',
    direction: 'asc',
  });

  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((leftEmployee, rightEmployee) =>
        compareEmployeeSortValues(
          getEmployeeSortValue(leftEmployee, sortState.columnId),
          getEmployeeSortValue(rightEmployee, sortState.columnId),
          sortState.direction,
        ),
      ),
    [employees, sortState.columnId, sortState.direction],
  );

  const handleSort = useCallback((columnId: EmployeeColumnId) => {
    setSortState((currentState) =>
      currentState.columnId === columnId
        ? {
            columnId,
            direction: currentState.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            columnId,
            direction: 'asc',
          },
    );
  }, []);

  return {
    handleSort,
    sortedEmployees,
    sortState,
  };
}
