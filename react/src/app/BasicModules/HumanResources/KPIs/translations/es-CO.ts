import { esMX } from './es-MX';
import type { KPIsTranslations } from './types';

export const esCO = {
  ...esMX,
  title: 'KPIs de Gestión Humana',
  subtitle: 'Indicadores clave para controlar personal, asistencia, pago y operación.',
  cards: {
    ...esMX.cards,
    activeEmployees: 'Personal activo',
    permissionsRequested: 'Solicitudes de permiso',
    payrollCost: 'Costo de pago',
    avgCostPerEmployee: 'Costo promedio por persona',
  },
  table: {
    ...esMX.table,
    employees: 'Personal',
    payroll: 'Pago',
  },
} as const satisfies KPIsTranslations;
