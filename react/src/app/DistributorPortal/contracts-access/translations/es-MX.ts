import type { DistributorPortalCopy } from './types';

export const esMX: DistributorPortalCopy = {
  navigation: { portalName: 'Portal de distribución', local: 'Local', backToErp: 'Volver al ERP' },
  tabs: { contractsAccess: 'Contratos y accesos', consulting: 'Consultorías' },
  header: {
    eyebrow: 'Operación de distribución', title: 'Contratos y accesos',
    subtitle: 'Da seguimiento a cada prospecto de tu cartera, desde el primer acceso hasta su contrato activo.',
  },
  actions: { refresh: 'Actualizar', refreshing: 'Actualizando…', view: 'Ver cliente', manage: 'Administrar', addClient: 'Agregar cliente', extendTrial: 'Extender prueba', close: 'Cerrar' },
  metrics: {
    totalClients: 'Clientes en cartera', prospects: 'Prospectos', demosTrials: 'Demos y pruebas',
    activeContracts: 'Contratos activos', attention: 'Requieren atención',
  },
  filters: {
    title: 'Cartera comercial', subtitle: 'Encuentra una empresa por nombre, correo del propietario o número de cuenta.',
    matches: 'clientes coinciden', search: 'Buscar', searchPlaceholder: 'Empresa, correo o número de cuenta',
    stage: 'Etapa comercial', allStages: 'Todas las etapas',
  },
  table: {
    title: 'Prospectos y clientes', subtitle: 'Aquí sólo aparecen las cuentas vinculadas formalmente a tu empresa distribuidora.',
    company: 'Empresa', stage: 'Etapa', access: 'Acceso y módulos', contract: 'Contrato', users: 'Usuarios',
    nextEvent: 'Próximo evento', action: 'Acción', noResults: 'No hay clientes que coincidan con los filtros.',
    noClients: 'Tu cartera vinculada todavía está vacía.', noPlan: 'Sin contrato', noModules: 'Sin módulos habilitados',
    noDate: 'Sin fecha programada', daysRemaining: 'días restantes', members: 'activos', seats: 'capacidad', review: 'Revisar pago',
  },
  detail: {
    eyebrow: 'Cliente de cartera', subtitle: 'Resumen comercial y de acceso de sólo lectura.', contact: 'Contacto propietario',
    country: 'País', stage: 'Etapa comercial', access: 'Estado de acceso', contract: 'Contrato', billing: 'Estado de pago',
    modules: 'Módulos habilitados', capacity: 'Capacidad de usuarios', nextEvent: 'Próximo evento',
    directPortfolio: 'Esta cuenta está vinculada directamente a tu empresa distribuidora.',
  },
  states: { PROSPECT: 'Prospecto', DEMO: 'Demo', TRIAL: 'Prueba', ACTIVE: 'Activo', ATTENTION: 'Atención', INACTIVE: 'Inactivo' },
  errors: { title: 'No se pudo cargar la cartera', retry: 'Intentar de nuevo', forbidden: 'Esta empresa no tiene acceso al portal de distribución.' },
};
