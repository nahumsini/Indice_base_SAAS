import type { ModuleDefinition } from '../shared';
import { EmployeesPage, AttendancePage, PayrollPage, PerformancePage } from './tabs';

export const hrModule: ModuleDefinition = {
  id: 'hr',
  displayName: 'Human Resources',
  routeSegment: 'human-resources',
  category: 'basic',
  defaultTabId: 'employees',
  tabs: [
    {
      id: 'employees',
      label: 'Employees',
      path: 'employees',
      component: EmployeesPage,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: 'attendance',
      component: AttendancePage,
    },
    {
      id: 'payroll',
      label: 'Payroll',
      path: 'payroll',
      component: PayrollPage,
    },
    {
      id: 'performance',
      label: 'Performance',
      path: 'performance',
      component: PerformancePage,
    },
  ],
};
