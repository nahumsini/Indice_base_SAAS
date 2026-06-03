import { esMX } from './es-MX';
import type { KPIsTranslations } from './types';

export const esCO = {
  ...esMX,
  title: 'KPIs de Gestión Humana',
  subtitle: 'Indicadores clave para controlar personal, asistencia, pago y operación.',
  loading: {
    title: 'Cargando KPIs',
    description: 'Preparando gráficas e indicadores de Gestión Humana.',
  },
  dashboard: {
    ...esMX.dashboard,
    errors: {
      ...esMX.dashboard.errors,
      employees: 'No se pudo cargar el personal.',
    },
    filters: {
      ...esMX.dashboard.filters,
      business: 'Área de negocio',
      allBusinesses: 'Todas las áreas de negocio',
    },
    sections: {
      ...esMX.dashboard.sections,
      unitSummaryHint: 'Personal activo, asistencia, permisos, actas, activos y preparación.',
      attentionQueueHint: 'Personas con señales que requieren seguimiento antes de cerrar el día.',
    },
    cards: {
      ...esMX.dashboard.cards,
      workforce: {
        title: 'Personal activo',
        target: (activeRate: string) => `${activeRate} personal activo`,
        description: 'Personal activo dentro del alcance seleccionado.',
      },
      attendance: {
        ...esMX.dashboard.cards.attendance,
        target: (registered: number, total: number) => `${registered} de ${total} personas con asistencia`,
      },
      assets: {
        ...esMX.dashboard.cards.assets,
        description: 'Activos asignados comparados contra el personal activo.',
      },
    },
    insights: {
      ...esMX.dashboard.insights,
      empty: 'No hay personal activo para los filtros actuales. Ajusta el alcance para calcular los KPIs de Gestión Humana.',
    },
    labels: {
      ...esMX.dashboard.labels,
      totalEmployees: 'Total de personal',
    },
    table: {
      ...esMX.dashboard.table,
      employees: 'Personal',
    },
  },
  cards: {
    ...esMX.cards,
    activeEmployees: 'Personal activo',
    permissionsRequested: 'Solicitudes de permiso',
    payrollCost: 'Cobertura operativa',
    avgCostPerEmployee: 'Costo promedio por persona',
  },
  table: {
    ...esMX.table,
    employees: 'Personal',
    payroll: 'Cobertura',
  },
} as const satisfies KPIsTranslations;
