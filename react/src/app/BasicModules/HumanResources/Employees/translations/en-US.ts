import type { EmployeesTranslations } from './types';
import { enCA } from './en-CA';

export const enUS = {
  ...enCA,
  subtitle: 'Employee records, assignments, schedules, and payroll context',
  columns: {
    ...enCA.columns,
    socialSecurityNumber: 'SSN',
    stateProvince: 'State',
    postalCode: 'ZIP code',
    joinDate: 'Hire date',
  },
  columnDescriptions: {
    ...enCA.columnDescriptions,
    socialSecurityNumber: 'Social Security number used for payroll processes.',
    stateProvince: 'State from the employee profile.',
    postalCode: 'ZIP code from the employee profile.',
  },
  modal: {
    ...enCA.modal,
    labels: {
      ...enCA.modal.labels,
      socialSecurityNumber: 'SSN',
      stateProvince: 'State',
      postalCode: 'ZIP code',
    },
    helpers: {
      ...enCA.modal.helpers,
      socialSecurityNumber: 'Optional. You can add the SSN later.',
    },
    placeholders: {
      ...enCA.modal.placeholders,
      address: 'Street, number, city, state, ZIP code',
      nationalId: 'e.g. driver license or passport number',
      taxId: 'e.g. EIN when applicable',
      socialSecurityNumber: 'e.g. 123-45-6789',
      phone: 'e.g. 5125551234',
      emergencyContactName: 'e.g. Maria Smith',
      stateProvince: 'e.g. Texas',
      city: 'e.g. Austin',
      postalCode: 'e.g. 78701',
    },
  },
} as const satisfies EmployeesTranslations;
