import { esMX } from './es-MX';
import type { ControlTranslations } from './types';

export const esCO = {
  ...esMX,
  subtitle: 'Monitorea la asistencia en tiempo real y administra el control operativo.',
  searchPlaceholder: 'Buscar persona, código, cargo o turno',
  summary: {
    ...esMX.summary,
    employees: 'Personal en alcance',
    assigned: 'Turnos asignados',
    unassigned: 'Sin turno',
    late: 'Llegadas tarde del día',
  },
  sections: {
    ...esMX.sections,
    employees: 'Cobertura por persona',
    employeesHint: 'Usa esta lista para validar quién tiene turno asignado y cómo se resolvió la fecha seleccionada.',
    employeeDetail: 'Detalle de la persona',
    access: 'Acceso de la persona',
  },
  labels: {
    ...esMX.labels,
    assignedEmployees: 'Personas asignadas',
    noEmployees: 'No hay personal con la búsqueda actual.',
    noEmployeeSelected: 'Selecciona una persona para inspeccionar cobertura de turno y resultado del día.',
    unassignedWarning: 'Esta persona no tiene un turno activo asignado para la fecha seleccionada.',
    selectEmployeeCalendar: 'Selecciona una persona para cargar el calendario de asistencia.',
    searchLabel: 'Buscar personal',
    selectedEmployee: 'Persona seleccionada',
    employeesToAssign: 'Personas a asignar',
    pinPlaceholder: 'Captura o restablece el PIN de la persona',
    metadataHint: 'Administra aquí los métodos del kiosco y la inscripción biométrica de la persona.',
  },
  kpi: {
    ...esMX.kpi,
    activeShifts: 'turnos activos',
    late: 'llegadas tarde',
    reviewBadge: (count: number) => `${count} por revisar`,
    summaryInsight: ({ activeShiftCount, checkInsCount, reviewCount, totalCount }: Parameters<ControlTranslations['kpi']['summaryInsight']>[0]) => {
      if (totalCount === 0) {
        return 'Operación del día: sin personal para esta fecha.';
      }

      const reviewText = reviewCount > 0
        ? `${reviewCount} requieren seguimiento.`
        : 'sin incidencias pendientes.';

      return `Operación del día: ${checkInsCount} de ${totalCount} personas ya registraron ingreso, ${activeShiftCount} siguen en turno y ${reviewText}`;
    },
  },
} satisfies ControlTranslations;
