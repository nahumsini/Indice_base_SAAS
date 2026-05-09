import { esMX } from './es-MX';
import type { AnnouncementsTranslations } from './types';

export const esCO = {
  ...esMX,
  pageSubtitle: 'Avisos internos, mensajes por área y comunicaciones de gestión humana programadas.',
  actions: {
    ...esMX.actions,
    addAnnouncement: 'Agregar aviso',
  },
  filters: {
    ...esMX.filters,
    searchLabel: 'Buscar aviso',
    audience: 'Personal',
    audienceOptions: {
      ...esMX.filters.audienceOptions,
      everyone: 'Todo el personal',
    },
  },
  table: {
    ...esMX.table,
    columns: {
      ...esMX.table.columns,
      announcement: 'Aviso',
      audience: 'Personal',
    },
    emptyState: 'No hay avisos que coincidan con los filtros actuales.',
    showing: (count: number) => `Mostrando ${count} avisos`,
  },
  columnsModal: {
    ...esMX.columnsModal,
    subtitle: 'Elige qué datos del aviso se muestran en la tabla.',
  },
  deleteDialog: {
    ...esMX.deleteDialog,
    title: 'Eliminar aviso',
    description: 'Este aviso se eliminará de la lista.',
  },
  exportFileName: 'rh-avisos.csv',
  exportHeaders: ['Aviso', 'Tipo', 'Personal', 'Publicación', 'Lecturas', 'Estado', 'Autor'],
  audienceLabels: {
    ...esMX.audienceLabels,
    everyone: 'Todo el personal',
    specificEmployees: 'Personas específicas',
  },
  modal: {
    ...esMX.modal,
    title: 'Nuevo aviso',
    subtitle: 'Crea, segmenta y programa comunicaciones internas de gestión humana.',
    audienceOptions: {
      ...esMX.modal.audienceOptions,
      all: 'Todo el personal',
      employees: 'Personas específicas',
    },
    employees: {
      ...esMX.modal.employees,
      title: (count: number) => `Seleccionar personas (${count})`,
      helper: 'Busca y elige las personas que deben recibir este aviso.',
    },
  },
} as const satisfies AnnouncementsTranslations;
