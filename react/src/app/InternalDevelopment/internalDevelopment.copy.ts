import type {
  InternalDevelopmentArea,
  InternalDevelopmentEntryType,
  InternalDevelopmentStatus,
} from './internalDevelopment.types';

const spanishTypes: Record<InternalDevelopmentEntryType, string> = {
  WEEKLY_REPORT: 'Reporte semanal',
  CONTRIBUTION: 'Contribución',
  BOARD_MEETING: 'Junta de consejo',
  WORKING_MEETING: 'Junta de trabajo',
  MINUTES: 'Minuta',
  DECISION: 'Decisión',
};
const englishTypes: Record<InternalDevelopmentEntryType, string> = {
  WEEKLY_REPORT: 'Weekly report',
  CONTRIBUTION: 'Contribution',
  BOARD_MEETING: 'Board meeting',
  WORKING_MEETING: 'Working meeting',
  MINUTES: 'Minutes',
  DECISION: 'Decision',
};
const spanishAreas: Record<InternalDevelopmentArea, string> = {
  DEVELOPMENT: 'Desarrollo', PRODUCT: 'Producto', OPERATIONS: 'Operaciones',
  COMMERCIAL: 'Comercial', FINANCE: 'Finanzas', GOVERNANCE: 'Gobierno', GENERAL: 'General',
};
const englishAreas: Record<InternalDevelopmentArea, string> = {
  DEVELOPMENT: 'Development', PRODUCT: 'Product', OPERATIONS: 'Operations',
  COMMERCIAL: 'Commercial', FINANCE: 'Finance', GOVERNANCE: 'Governance', GENERAL: 'General',
};
const spanishStatuses: Record<InternalDevelopmentStatus, string> = {
  DRAFT: 'Borrador', PLANNED: 'Programado', RECORDED: 'Registrado', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
};
const englishStatuses: Record<InternalDevelopmentStatus, string> = {
  DRAFT: 'Draft', PLANNED: 'Planned', RECORDED: 'Recorded', CLOSED: 'Closed', CANCELLED: 'Cancelled',
};

export function getInternalDevelopmentCopy(english: boolean) {
  return {
    types: english ? englishTypes : spanishTypes,
    areas: english ? englishAreas : spanishAreas,
    statuses: english ? englishStatuses : spanishStatuses,
    title: english ? 'Internal development log' : 'Registro de desarrollo interno',
    subtitle: english
      ? 'Preserve weekly contributions, meetings, minutes and decisions in one auditable corporate history.'
      : 'Conserva contribuciones semanales, juntas, minutas y decisiones en una sola historia corporativa auditable.',
    eyebrow: english ? 'Root corporate traceability' : 'Trazabilidad corporativa Root',
    newEntry: english ? 'New record' : 'Nuevo registro',
    refresh: english ? 'Refresh' : 'Actualizar',
    filters: english ? 'Registry filters' : 'Filtros del registro',
    filtersSubtitle: english ? 'Find an event by content, responsibility or date.' : 'Encuentra un evento por contenido, responsabilidad o fecha.',
    search: english ? 'Search' : 'Buscar',
    searchPlaceholder: english ? 'Folio, title, summary or detail' : 'Folio, título, resumen o detalle',
    allTypes: english ? 'All types' : 'Todos los tipos',
    allAreas: english ? 'All areas' : 'Todas las áreas',
    allStatuses: english ? 'All statuses' : 'Todos los estados',
    allOwners: english ? 'All responsible people' : 'Todos los responsables',
    type: english ? 'Type' : 'Tipo',
    area: english ? 'Area' : 'Área',
    status: english ? 'Status' : 'Estado',
    owner: english ? 'Responsible' : 'Responsable',
    from: english ? 'From' : 'Desde',
    to: english ? 'To' : 'Hasta',
    clear: english ? 'Clear filters' : 'Limpiar filtros',
    records: english ? 'records' : 'registros',
    submitted: english ? 'Weekly reports submitted' : 'Reportes semanales entregados',
    pending: english ? 'Weekly reports pending' : 'Reportes semanales pendientes',
    upcoming: english ? 'Upcoming meetings' : 'Próximas juntas',
    thisMonth: english ? 'Records this month' : 'Registros del mes',
    pendingNames: english ? 'Pending this week' : 'Pendientes esta semana',
    tableTitle: english ? 'Corporate event history' : 'Historial de eventos corporativos',
    dateFolio: english ? 'Date and folio' : 'Fecha y folio',
    record: english ? 'Record' : 'Registro',
    participants: english ? 'Participants' : 'Participantes',
    actions: english ? 'Actions' : 'Acciones',
    view: english ? 'View' : 'Ver',
    noRecords: english ? 'No records match these filters.' : 'No hay registros con estos filtros.',
    loading: english ? 'Loading corporate history…' : 'Cargando historial corporativo…',
    retry: english ? 'Try again' : 'Reintentar',
    edit: english ? 'Edit' : 'Editar',
  };
}
