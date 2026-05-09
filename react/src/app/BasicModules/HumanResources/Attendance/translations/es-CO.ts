import type { AttendanceTranslations } from './types';
import { esMX } from './es-MX';

export const esCO = {
  ...esMX,
  subtitle: 'Registra tu ingreso y salida con foto y ubicación.',
  success: {
    ...esMX.success,
    checkIn: 'Ingreso registrado correctamente.',
  },
  summary: {
    ...esMX.summary,
    late: 'Llegadas tarde',
  },
  statuses: {
    ...esMX.statuses,
    late: 'Tarde',
  },
  labels: {
    ...esMX.labels,
    collaborator: 'Persona',
    searchEmployee: 'Buscar persona',
    employeeSummary: 'Resumen de la persona',
    unassignedPosition: 'Sin cargo',
    position: 'Cargo',
    statusLoggedIn: 'Ingreso activo',
    statusReady: 'Listo para ingresar',
  },
  recorder: {
    ...esMX.recorder,
    checkIn: 'Registrar ingreso',
    checkOut: 'Registrar salida',
    checkInAlreadyRecorded: 'El ingreso de hoy ya fue registrado.',
    checkOutRequiresCheckIn: 'Debes registrar un ingreso activo antes de registrar salida.',
    statusActiveTitle: 'Ya registraste tu ingreso.',
    statusActiveDescription: 'Ingreso registrado a las',
    statusIdleTitle: 'Aún no registras ingreso.',
    statusIdleDescription: 'Toma una foto y captura tu ubicación cuando estés listo para registrar ingreso.',
  },
} as const satisfies AttendanceTranslations;
