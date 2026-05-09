import { esMX } from './es-MX';
import type { RecordsTranslations } from './types';

export const esCO = {
  ...esMX,
  title: 'Registros',
  subtitle: 'Historial del personal, novedades, reportes y acciones de seguimiento.',
  actions: {
    ...esMX.actions,
    addRecord: 'Agregar registro',
    editRecord: 'Editar registro',
  },
  columns: {
    ...esMX.columns,
    id: 'Registro',
    employee: 'Persona',
  },
  filters: {
    ...esMX.filters,
    searchLabel: 'Buscar registro',
    searchPlaceholder: 'Persona, título, tipo o descripción',
  },
  kpis: {
    ...esMX.kpis,
    total: 'Total de registros',
    summary: (
      pendingCount: number,
      reviewedCount: number,
      resolvedCount: number,
      highSeverityCount: number,
      visibleCount: number,
      totalCount: number,
    ) =>
      `Resumen de registros: ${pendingCount} pendientes · ${reviewedCount} revisados · ${resolvedCount} resueltos · ${highSeverityCount} de alta gravedad · mostrando ${visibleCount} de ${totalCount}.`,
  },
  pagination: {
    showing: (start: number, end: number, total: number) => `Mostrando ${start}-${end} de ${total} registros`,
    page: esMX.pagination.page,
  },
  modal: {
    ...esMX.modal,
    newTitle: 'Nuevo registro',
    editTitle: 'Editar registro',
    employee: 'Persona',
    createRecord: 'Crear registro',
  },
  pdf: {
    ...esMX.pdf,
    employee: 'Persona',
    recordNumber: (id: string) => `Registro #${id}`,
  },
} as const satisfies RecordsTranslations;
