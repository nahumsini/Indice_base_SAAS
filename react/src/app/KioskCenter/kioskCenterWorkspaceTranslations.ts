export type KioskCenterWorkspaceView = 'multi-kiosks' | 'inventory' | 'people' | 'activity';

export interface KioskCenterWorkspaceCopy {
  locale: string;
  navigationLabel: string;
  navigation: Record<KioskCenterWorkspaceView, { label: string; description: string }>;
  access: {
    title: string;
    subtitle: string;
    refresh: string;
    filtersTitle: string;
    filtersSubtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    statusLabel: string;
    all: string;
    ready: string;
    attention: string;
    resultCount: (shown: number, total: number) => string;
    employee: string;
    assignment: string;
    pin: string;
    modules: string;
    tabScopes: string;
    organizationScope: string;
    configured: string;
    missing: string;
    inherited: string;
    backendValidation: string;
    corporate: string;
    noModules: string;
    noResults: string;
    noResultsHelp: string;
    loadError: string;
    guidanceTitle: string;
    guidance: string;
    readinessNote: string;
    issueLabels: Record<string, string>;
  };
  activity: {
    title: string;
    subtitle: string;
    refresh: string;
    filtersTitle: string;
    filtersSubtitle: string;
    kioskLabel: string;
    selectKiosk: string;
    searchLabel: string;
    searchPlaceholder: string;
    allEvents: string;
    successful: string;
    attention: string;
    actor: string;
    capability: string;
    empty: string;
    emptyHelp: string;
    loadError: string;
    auditError: string;
    retry: string;
    guidanceTitle: string;
    guidance: string;
  };
  options: {
    title: string;
    description: string;
    close: string;
    rotate: string;
    rotateHelp: string;
    enable: string;
    enableHelp: string;
    disable: string;
    disableHelp: string;
    revoke: string;
    revokeHelp: string;
  };
  confirmation: {
    cancel: string;
    processing: string;
    rotateTitle: string;
    rotateDescription: string;
    rotateAction: string;
    enableTitle: string;
    enableDescription: string;
    enableAction: string;
    disableTitle: string;
    disableDescription: string;
    disableAction: string;
    revokeTitle: string;
    revokeDescription: string;
    revokeAction: string;
  };
}

const esMX: KioskCenterWorkspaceCopy = {
  locale: 'es-MX',
  navigationLabel: 'Vistas del Centro de kioscos',
  navigation: {
    'multi-kiosks': { label: 'Multikioscos', description: 'Acceso común por PIN' },
    inventory: { label: 'Kioscos de módulos', description: 'Inventario del Engine' },
    people: { label: 'Colaboradores', description: 'Preparación y alcance' },
    activity: { label: 'Actividad', description: 'Sesiones y auditoría' },
  },
  access: {
    title: 'Colaboradores y acceso efectivo',
    subtitle: 'Comprueba PIN, módulos, scopes y alcance para saber qué tarjetas recibirá cada persona. Aquí no se asignan colaboradores al Multikiosco.',
    refresh: 'Actualizar',
    filtersTitle: 'Filtros',
    filtersSubtitle: 'Encuentra a una persona y revisa qué condición debe completar.',
    searchLabel: 'Buscar colaborador',
    searchPlaceholder: 'Nombre, correo, unidad o negocio',
    statusLabel: 'Preparación',
    all: 'Todos',
    ready: 'Listos',
    attention: 'Requieren atención',
    resultCount: (shown, total) => `${shown} de ${total} colaboradores`,
    employee: 'Colaborador',
    assignment: 'Perfil organizacional',
    pin: 'PIN personal',
    modules: 'Módulos',
    tabScopes: 'Scopes',
    organizationScope: 'Alcance',
    configured: 'Listo',
    missing: 'Pendiente',
    inherited: 'Acceso elevado',
    backendValidation: 'Validación backend',
    corporate: 'Corporativo',
    noModules: 'Sin módulos habilitados',
    noResults: 'No hay colaboradores para esta lectura',
    noResultsHelp: 'Ajusta la búsqueda o cambia el filtro de preparación.',
    loadError: 'No fue posible cargar el catálogo de colaboradores.',
    guidanceTitle: 'Cómo se concede el acceso',
    guidance: 'El enlace del Multikiosco es común para la compañía. El PIN identifica a la persona y el backend cruza membresía activa, módulo, scope de pestaña, unidad o negocio y capacidades para mostrar únicamente sus tarjetas autorizadas.',
    readinessNote: 'Esta vista explica preparación; no asigna personas al Multikiosco, no concede permisos ni sustituye la validación del backend.',
    issueLabels: {
      PIN_REQUIRED: 'Falta configurar el PIN personal',
      MODULE_ACCESS_REQUIRED: 'Falta acceso a un módulo requerido',
      TAB_SCOPE_REQUIRED: 'Falta un scope de pestaña requerido',
      ORGANIZATION_SCOPE_MISMATCH: 'El alcance de unidad o negocio no coincide',
      EMPLOYEE_INACTIVE: 'El colaborador no está activo',
    },
  },
  activity: {
    title: 'Actividad y auditoría',
    subtitle: 'Consulta la trazabilidad segura de un kiosco sin exponer PIN, tokens ni credenciales públicas.',
    refresh: 'Actualizar',
    filtersTitle: 'Contexto de auditoría',
    filtersSubtitle: 'Selecciona un kiosco del inventario y filtra sus eventos retenidos.',
    kioskLabel: 'Kiosco',
    selectKiosk: 'Selecciona un kiosco',
    searchLabel: 'Resultado',
    searchPlaceholder: 'Todos los resultados',
    allEvents: 'Todos',
    successful: 'Correctos',
    attention: 'Con atención',
    actor: 'Actor',
    capability: 'Capacidad',
    empty: 'No hay eventos para esta lectura',
    emptyHelp: 'El historial aparecerá cuando el Engine registre actividad del kiosco seleccionado.',
    loadError: 'No fue posible cargar el inventario para auditoría.',
    auditError: 'No fue posible cargar el historial de este kiosco.',
    retry: 'Reintentar',
    guidanceTitle: 'Trazabilidad por propietario',
    guidance: 'El Centro permite inspeccionar; cada módulo conserva la verdad de negocio y administra sus propias operaciones.',
  },
  options: {
    title: 'Opciones del Multikiosco',
    description: 'Administra el acceso y su ciclo de vida sin abrir la operación de los kioscos hijos.',
    close: 'Cerrar',
    rotate: 'Renovar enlace',
    rotateHelp: 'Invalida el enlace anterior y cierra sus sesiones.',
    enable: 'Habilitar',
    enableHelp: 'Permite nuevamente identificaciones y sesiones.',
    disable: 'Deshabilitar',
    disableHelp: 'Pausa nuevas sesiones hasta volver a habilitarlo.',
    revoke: 'Revocar definitivamente',
    revokeHelp: 'Invalida el acceso y conserva la trazabilidad.',
  },
  confirmation: {
    cancel: 'Cancelar', processing: 'Procesando…',
    rotateTitle: 'Renovar enlace', rotateDescription: 'El enlace actual dejará de funcionar y todas sus sesiones se cerrarán.', rotateAction: 'Generar nuevo enlace',
    enableTitle: 'Habilitar Multikiosco', enableDescription: 'Los colaboradores activos con PIN podrán volver a identificarse.', enableAction: 'Habilitar',
    disableTitle: 'Deshabilitar Multikiosco', disableDescription: 'Se cerrarán las sesiones activas y el acceso quedará pausado.', disableAction: 'Deshabilitar',
    revokeTitle: 'Revocar Multikiosco', revokeDescription: 'Esta acción es definitiva: invalida el acceso y cierra todas las sesiones.', revokeAction: 'Revocar definitivamente',
  },
};

const enCA: KioskCenterWorkspaceCopy = {
  ...esMX,
  locale: 'en-CA',
  navigationLabel: 'Kiosk Center views',
  navigation: {
    'multi-kiosks': { label: 'Multi-kiosks', description: 'Shared PIN access' },
    inventory: { label: 'Module kiosks', description: 'Engine inventory' },
    people: { label: 'Collaborators', description: 'Readiness and scope' },
    activity: { label: 'Activity', description: 'Sessions and audit' },
  },
  access: {
    ...esMX.access,
    title: 'Collaborators and effective access',
    subtitle: 'Check PIN, modules, tab scopes, and organizational scope to understand which cards each person will receive. Collaborators are not assigned to a Multi-kiosk here.',
    refresh: 'Refresh', filtersTitle: 'Filters', filtersSubtitle: 'Find a person and review any missing condition.',
    searchLabel: 'Search collaborator', searchPlaceholder: 'Name, email, unit, or business', statusLabel: 'Readiness',
    all: 'All', ready: 'Ready', attention: 'Needs attention', resultCount: (shown, total) => `${shown} of ${total} collaborators`,
    employee: 'Collaborator', assignment: 'Organization profile', pin: 'Personal PIN', modules: 'Modules', tabScopes: 'Scopes', organizationScope: 'Scope',
    configured: 'Ready', missing: 'Pending', inherited: 'Elevated access', backendValidation: 'Backend validation', corporate: 'Corporate', noModules: 'No enabled modules',
    noResults: 'No collaborators match this view', noResultsHelp: 'Adjust the search or readiness filter.', loadError: 'The collaborator catalogue could not be loaded.',
    guidanceTitle: 'How access is granted', guidance: 'The Multi-kiosk link is shared across the company. The PIN identifies the person, and the backend intersects active membership, module, tab scope, unit or business, and capabilities to show only authorized cards.',
    readinessNote: 'This view explains readiness; it does not assign people to a Multi-kiosk, grant permission, or replace backend validation.',
    issueLabels: {
      PIN_REQUIRED: 'A personal PIN must be configured', MODULE_ACCESS_REQUIRED: 'A required module is missing', TAB_SCOPE_REQUIRED: 'A required tab scope is missing',
      ORGANIZATION_SCOPE_MISMATCH: 'The unit or business scope does not match', EMPLOYEE_INACTIVE: 'The collaborator is not active',
    },
  },
  activity: {
    ...esMX.activity,
    title: 'Activity and audit', subtitle: 'Review safe kiosk traceability without exposing PINs, tokens, or public credentials.', refresh: 'Refresh',
    filtersTitle: 'Audit context', filtersSubtitle: 'Select a kiosk from the inventory and filter its retained events.', kioskLabel: 'Kiosk', selectKiosk: 'Select a kiosk',
    searchLabel: 'Outcome', searchPlaceholder: 'All outcomes', allEvents: 'All', successful: 'Successful', attention: 'Needs attention', actor: 'Actor', capability: 'Capability',
    empty: 'No events match this view', emptyHelp: 'History appears when the Engine records activity for the selected kiosk.', loadError: 'The audit inventory could not be loaded.',
    auditError: 'The history for this kiosk could not be loaded.', retry: 'Try again', guidanceTitle: 'Owner-based traceability',
    guidance: 'The Center supports inspection; each module keeps business truth and owns its operations.',
  },
  options: {
    title: 'Multi-kiosk options', description: 'Manage access lifecycle without opening child-kiosk operations.', close: 'Close',
    rotate: 'Rotate link', rotateHelp: 'Invalidates the previous link and closes its sessions.', enable: 'Enable', enableHelp: 'Allows identification and sessions again.',
    disable: 'Disable', disableHelp: 'Pauses new sessions until it is enabled again.', revoke: 'Revoke permanently', revokeHelp: 'Invalidates access while retaining traceability.',
  },
  confirmation: {
    cancel: 'Cancel', processing: 'Processing…', rotateTitle: 'Rotate link', rotateDescription: 'The current link will stop working and all sessions will close.', rotateAction: 'Generate new link',
    enableTitle: 'Enable Multi-kiosk', enableDescription: 'Active collaborators with a PIN will be able to identify again.', enableAction: 'Enable',
    disableTitle: 'Disable Multi-kiosk', disableDescription: 'Active sessions will close and access will be paused.', disableAction: 'Disable',
    revokeTitle: 'Revoke Multi-kiosk', revokeDescription: 'This is permanent: access is invalidated and all sessions are closed.', revokeAction: 'Revoke permanently',
  },
};

export function getKioskCenterWorkspaceCopy(locale?: string | null): KioskCenterWorkspaceCopy {
  return locale?.toLowerCase().startsWith('es') ? esMX : enCA;
}
