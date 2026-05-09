import { esMX } from './es-MX';
import type { AssetsTranslations } from './types';

export const esCO = {
  ...esMX,
  title: 'Activos de la empresa',
  subtitle: 'Controla equipos asignados, dispositivos, custodias y mantenimiento.',
  filters: {
    ...esMX.filters,
    custody: 'Custodia',
  },
  statuses: {
    ...esMX.statuses,
    Resguardo: 'Custodia',
  },
  kpis: {
    ...esMX.kpis,
    summary: (
      assignedCount: number,
      availableCount: number,
      maintenanceCount: number,
      selectedCount: number,
      visibleCount: number,
      totalCount: number,
    ) =>
      `Resumen de activos: ${assignedCount} asignados · ${availableCount} disponibles · ${maintenanceCount} en mantenimiento · ${selectedCount} seleccionados · mostrando ${visibleCount} de ${totalCount}.`,
  },
  addNewAsset: {
    ...esMX.addNewAsset,
    options: {
      ...esMX.addNewAsset.options,
      custody: 'Custodia',
    },
  },
} as const satisfies AssetsTranslations;
