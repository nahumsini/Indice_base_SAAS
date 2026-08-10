import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';
import { esMXIncentiveForm } from './formLocales';

export const esMX = {
  ...enCA,
  form: esMXIncentiveForm,
  title: 'Incentivos',
  subtitle: 'Gestiona bonos manuales, reglas automatizadas y aplicación en nómina.',
  actions: {
    columns: 'Columnas',
    addIncentive: 'Agregar incentivo',
  },
  columns: {
    incentive: 'Incentivo',
    type: 'Tipo',
    scope: 'Alcance',
    amount: 'Monto',
    application: 'Aplicación',
    status: 'Estado',
  },
  filters: {
    title: 'Filtros',
    searchLabel: 'Buscar incentivo',
    searchPlaceholder: 'Nombre, alcance, monto o aplicación',
    type: 'Tipo',
    status: 'Estado',
    allTypes: 'Todos los tipos',
    allStatuses: 'Todos los estados',
  },
  types: {
    Automatizado: 'Automatizado',
    Manual: 'Manual',
  },
  statuses: {
    Activo: 'Activo',
    Programado: 'Programado',
    Pausado: 'Pausado',
  },
  kpis: {
    total: 'Total de incentivos',
    active: 'Activos',
    automated: 'Automatizados',
    manual: 'Manuales',
    visibleAfterFilters: 'visibles tras filtros',
    eligibleEmployees: 'colaboradores elegibles',
    summary: (
      activeCount: number,
      scheduledCount: number,
      pausedCount: number,
      selectedCount: number,
      visibleCount: number,
      totalCount: number,
    ) =>
      `Resumen de incentivos: ${activeCount} activos · ${scheduledCount} programados · ${pausedCount} pausados · ${selectedCount} seleccionados · mostrando ${visibleCount} de ${totalCount}.`,
  },
  columnsModal: {
    title: 'Columnas de la tabla',
    subtitle: 'Elige las columnas de incentivos visibles en esta vista.',
    close: 'Cerrar modal de columnas',
    required: 'Obligatoria',
    done: 'Listo',
  },
  table: {
    empty: 'No hay incentivos que coincidan con los filtros actuales.',
    showing: (count: number) => `Mostrando ${count} incentivos`,
    page: 'Página 1 de 1',
    previous: 'Anterior',
    next: 'Siguiente',
  },
  pagination: {
    pageSize: 'Filas por página',
    showing: (start: number, end: number, total: number) => `Mostrando ${start}-${end} de ${total} incentivos`,
    page: (current: number, total: number) => `Página ${current} de ${total}`,
    previous: 'Anterior',
    next: 'Siguiente',
  },
  newIncentive: {
    selectedCollaborators: (count: number) => `${count} colaboradores`,
    automatedRule: 'Regla automática',
    fixed: 'fijo',
    pending: 'Pendiente',
    nextPayroll: 'Siguiente nómina',
  },
} as const satisfies IncentivesTranslations;
