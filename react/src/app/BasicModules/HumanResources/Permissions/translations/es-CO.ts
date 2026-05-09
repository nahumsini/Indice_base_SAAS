import { esMX } from './es-MX';
import type { PermissionsTranslations } from './types';

export const esCO = {
  ...esMX,
  subtitle: 'Gestiona solicitudes, ausencias, vacaciones y estados de aprobación del personal.',
  columns: {
    ...esMX.columns,
    employee: 'Persona',
  },
  filters: {
    ...esMX.filters,
    employee: 'Persona',
    allEmployees: 'Todo el personal',
  },
  detail: {
    ...esMX.detail,
    employeeInformation: 'Información de la persona',
  },
} as const satisfies PermissionsTranslations;
