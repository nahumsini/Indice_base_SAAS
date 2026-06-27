import type { HumanResourcesTranslations } from './types';

export const esMX = {
  title: 'Recursos Humanos',
  subtitle: 'Administra colaboradores, asistencia, nómina y operación del equipo.',
  back: 'Regresar',
  loading: {
    title: 'Cargando pestaña de RH',
    description: 'Descargando solo el espacio seleccionado de recursos humanos.',
  },
  access: {
    loadingTitle: 'Cargando acceso de RH',
    loadingDescription: 'Validando qué espacios de trabajo están disponibles.',
    empty: 'Este usuario no tiene pestañas de Recursos Humanos disponibles.',
  },
  tabError: {
    eyebrow: 'Pestaña no disponible',
    title: 'No se pudo cargar esta pestaña de Recursos Humanos',
    description: 'La app no pudo descargar este espacio de trabajo. Recarga la pestaña para solicitar el módulo de nuevo.',
    reload: 'Recargar pestaña',
  },
  tabs: {
    collaborators: 'Colaboradores',
    attendance: 'Asistencia',
    control: 'Control de asistencia',
    payroll: 'Nómina',
    announcements: 'Comunicados',
    assets: 'Activos',
    records: 'Actas',
    permissions: 'Permisos',
    incentives: 'Incentivos',
    kpis: 'Indicadores',
  },
} satisfies HumanResourcesTranslations;
