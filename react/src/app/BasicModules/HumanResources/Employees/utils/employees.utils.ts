import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { EmployeeDocumentType } from '../components/CreateEmployeeModal';
import {
  columnsStorageKey,
  employeeColumnDocumentTypeMap,
  employeePayPeriodOrder,
  employeeStatusOrder,
} from '../constants/employees.constants';
import type {
  EmployeeColumnId,
  EmployeeDocumentView,
  EmployeeSortDirection,
  EmployeeStatus,
  EmployeeViewModel,
} from '../types/employees.types';

export {
  isCorporateHeadquartersLabel,
  isCorporateOfficeUnitLabel,
  isUnitHeadquartersLabel,
  mergeTextOptions,
  normalizeOptionLabel,
  normalizeOrganizationLabel,
} from './employees.organization';
export {
  buildHireScheduleTemplatePayload,
  normalizeScheduleTemplatePayload,
  payloadFromAttendanceTemplate,
} from './employees.schedule';

export const getInitialColumns = (defaultColumns: ColumnConfig[]) => {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(columnsStorageKey);
    if (!rawColumns) {
      return defaultColumns;
    }

    const parsedColumns = JSON.parse(rawColumns) as Array<Partial<ColumnConfig>>;
    const defaultColumnMap = new Map(defaultColumns.map((column) => [column.id, column]));

    const restoredColumns = parsedColumns
      .map((column) => {
        if (!column?.id || !defaultColumnMap.has(column.id)) {
          return null;
        }

        const baseColumn = defaultColumnMap.get(column.id)!;
        return {
          ...baseColumn,
          visible: typeof column.visible === 'boolean' ? column.visible : baseColumn.visible,
        };
      })
      .filter((column): column is ColumnConfig => column !== null);

    const missingColumns = defaultColumns.filter(
      (column) => !restoredColumns.some((restored) => restored.id === column.id),
    );

    return restoredColumns.length > 0 ? [...restoredColumns, ...missingColumns] : defaultColumns;
  } catch {
    return defaultColumns;
  }
};

export const formatDate = (value: string, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

export const normalizeErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

export const getStatusClasses = (status: EmployeeStatus) => {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'inactive':
      return 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300';
    case 'terminated':
      return 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300';
    default:
      return 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

export function getEmployeeInitials(employee: EmployeeViewModel) {
  const firstInitial = employee.firstName.trim().charAt(0);
  const lastInitial = employee.lastName.trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.trim();

  if (initials) {
    return initials.toUpperCase();
  }

  return employee.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'HR';
}

export function compareEmployeeSortValues(
  leftValue: unknown,
  rightValue: unknown,
  direction: EmployeeSortDirection,
) {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) * multiplier;
}

export const createEmptyDocumentRecord = (): Record<EmployeeDocumentType, EmployeeDocumentView | null> => ({
  birth_certificate: null,
  government_id: null,
  proof_of_address: null,
  resume: null,
  profile_photo: null,
});

export const calculateEmployeesMonthlyPayroll = (employees: EmployeeViewModel[]) => {
  return employees.reduce((total, employee) => {
    if (employee.status !== 'active') {
      return total;
    }

    if (employee.salaryType === 'hourly') {
      const workdayHours = employee.workdayHours ?? 8;
      return total + (employee.hourlyRate * workdayHours * 260) / 12;
    }

    const payPeriodFactor = employee.payPeriod === 'monthly'
      ? 1
      : employee.payPeriod === 'biweekly'
        ? 26 / 12
        : 52 / 12;

    return total + employee.salary * payPeriodFactor;
  }, 0);
};

export const getEmployeeSortValue = (employee: EmployeeViewModel, columnId: EmployeeColumnId) => {
  switch (columnId) {
    case 'employee':
      return employee.fullName;
    case 'employeeNumber':
      return employee.code;
    case 'firstName':
      return employee.firstName;
    case 'lastName':
      return employee.lastName;
    case 'email':
      return employee.email;
    case 'phone':
      return employee.phone;
    case 'dateOfBirth':
      return employee.dateOfBirth;
    case 'address':
      return employee.address;
    case 'nationalId':
      return employee.nationalId;
    case 'taxId':
      return employee.taxId;
    case 'socialSecurityNumber':
      return employee.socialSecurityNumber;
    case 'registrationCountry':
      return employee.registrationCountry;
    case 'stateProvince':
      return employee.stateProvince;
    case 'city':
      return employee.city;
    case 'postalCode':
      return employee.postalCode;
    case 'alternatePhone':
      return employee.alternatePhone;
    case 'emergencyContactName':
      return employee.emergencyContactName;
    case 'emergencyContactRelationship':
      return employee.emergencyContactRelationship;
    case 'emergencyContactPhone':
      return employee.emergencyContactPhone;
    case 'position':
      return employee.position;
    case 'department':
      return employee.department;
    case 'unit':
      return employee.unitLabel;
    case 'business':
      return employee.businessLabel;
    case 'status':
      return employeeStatusOrder[employee.status];
    case 'scheduleOnHire':
      return employee.scheduleOnHire === null ? '' : Number(employee.scheduleOnHire);
    case 'scheduleStartDate':
      return employee.scheduleStartDate;
    case 'scheduleEndDate':
      return employee.scheduleEndDate;
    case 'scheduleStartTime':
      return employee.scheduleStartTime;
    case 'scheduleEndTime':
      return employee.scheduleEndTime;
    case 'scheduleMealMinutes':
      return employee.scheduleMealMinutes ?? 0;
    case 'scheduleRestMinutes':
      return employee.scheduleRestMinutes ?? 0;
    case 'scheduleLateAfterMinutes':
      return employee.scheduleLateAfterMinutes ?? 0;
    case 'scheduleLocationRule':
      return employee.scheduleLocationRule;
    case 'scheduleLocationId':
      return employee.scheduleLocationId;
    case 'salaryType':
      return employee.salaryType;
    case 'workdayHours':
      return employee.workdayHours ?? 0;
    case 'salary':
      return employee.salaryType === 'hourly' ? employee.hourlyRate : employee.salary;
    case 'hourlyRate':
      return employee.hourlyRate;
    case 'payPeriod':
      return employeePayPeriodOrder[employee.payPeriod];
    case 'contractType':
      return employee.contractType;
    case 'contractStartDate':
      return employee.contractStartDate;
    case 'contractEndDate':
      return employee.contractEndDate;
    case 'joinDate':
      return employee.joinDate;
    case 'birthCertificate':
    case 'governmentId':
    case 'proofOfAddress':
    case 'resume':
    case 'profilePhoto': {
      const documentType = employeeColumnDocumentTypeMap[columnId];
      return documentType ? employee.documents[documentType]?.fileName ?? '' : '';
    }
    default:
      return '';
  }
};

export const parseForeignKeyValue = (value: string | undefined) => {
  const normalized = String(value ?? '').trim();
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
};
