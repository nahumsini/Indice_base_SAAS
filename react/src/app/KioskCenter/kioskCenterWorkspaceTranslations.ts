export type KioskCenterWorkspaceView = 'multi-kiosks' | 'inventory' | 'people' | 'activity';

export interface KioskCenterWorkspaceCopy {
  locale: string;
  backToDashboard: string;
  navigationLabel: string;
  navigation: Record<KioskCenterWorkspaceView, { label: string; description: string }>;
  multi: {
    statusNavigation: string;
    total: string;
    active: string;
    attention: string;
    filtersTitle: string;
    filtersSubtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    statusLabel: string;
    all: string;
    statuses: Record<string, string>;
    refresh: string;
    loadError: string;
    openError: string;
    rotateError: string;
    stateError: string;
    linkReady: string;
    linkUnavailable: string;
    edit: string;
    share: string;
    open: string;
    more: string;
    shareTitle: string;
    shareDescription: string;
    close: string;
    qrAlt: string;
    copied: string;
    copyLink: string;
    resultCount: (shown: number, total: number) => string;
  };
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
    readiness: string;
    reason: string;
    reviewAccess: string;
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
    technicalDetails: string;
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
  backToDashboard: 'Volver al dashboard',
  navigationLabel: 'Vistas del Centro de kioscos',
  navigation: {
    'multi-kiosks': { label: 'Multikioscos', description: 'Acceso común por PIN' },
    inventory: { label: 'Kioscos operativos', description: 'Estado y administración' },
    people: { label: 'Acceso de colaboradores', description: 'Preparación y alcance' },
    activity: { label: 'Actividad', description: 'Eventos y auditoría' },
  },
  multi: {
    statusNavigation: 'Estado de los Multikioscos',
    total: 'Todos', active: 'Activos', attention: 'Requieren atención',
    filtersTitle: 'Filtros', filtersSubtitle: 'Encuentra un Multikiosco por nombre, descripción o estado.',
    searchLabel: 'Buscar Multikiosco', searchPlaceholder: 'Nombre o descripción', statusLabel: 'Estado', all: 'Todos',
    statuses: { ACTIVE: 'Activo', DISABLED: 'Deshabilitado', EXPIRED: 'Vencido', REVOKED: 'Revocado' },
    refresh: 'Actualizar Multikioscos', loadError: 'No fue posible cargar el Centro de kioscos.', openError: 'No fue posible abrir este Multikiosco.',
    rotateError: 'No fue posible renovar el enlace.', stateError: 'No fue posible cambiar el estado.',
    linkReady: 'Enlace listo', linkUnavailable: 'Enlace protegido no disponible', edit: 'Editar', share: 'Compartir enlace y QR', open: 'Abrir enlace', more: 'Más opciones',
    shareTitle: 'Compartir Multikiosco', shareDescription: 'Escanea el código o copia el enlace para abrir este acceso.', close: 'Cerrar', qrAlt: 'Código QR del Multikiosco', copied: 'Enlace copiado', copyLink: 'Copiar enlace',
    resultCount: (shown, total) => `${shown} de ${total} Multikioscos`,
  },
  access: {
    title: 'Acceso de colaboradores',
    subtitle: 'Identifica quién puede usar el Multikiosco y qué condición debe completar antes de entrar.',
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
    readiness: 'Preparación',
    reason: 'Qué falta',
    reviewAccess: 'Revisar acceso',
    configured: 'Listo',
    missing: 'Pendiente',
    inherited: 'Acceso elevado',
    backendValidation: 'Validación backend',
    corporate: 'Corporativo',
    noModules: 'Sin módulos habilitados',
    noResults: 'No hay colaboradores para esta lectura',
    noResultsHelp: 'Ajusta la búsqueda o cambia el filtro de preparación.',
    loadError: 'No fue posible cargar el catálogo de colaboradores.',
    guidanceTitle: 'Lectura sencilla',
    guidance: 'Listo significa que la persona tiene PIN y al menos una herramienta autorizada. Requiere atención indica exactamente qué debe corregirse.',
    readinessNote: 'Los permisos se administran desde Usuarios; el Centro de kioscos únicamente comprueba el acceso efectivo.',
    issueLabels: {
      PIN_REQUIRED: 'Falta configurar el PIN personal',
      MODULE_ACCESS_REQUIRED: 'Falta acceso a un módulo requerido',
      TAB_SCOPE_REQUIRED: 'Falta un permiso requerido dentro del módulo',
      ORGANIZATION_SCOPE_MISMATCH: 'El alcance de unidad o negocio no coincide',
      EMPLOYEE_INACTIVE: 'El colaborador no está activo',
    },
  },
  activity: {
    title: 'Actividad y auditoría',
    subtitle: 'Revisa qué ocurrió en un kiosco, cuándo ocurrió y si la acción terminó correctamente.',
    refresh: 'Actualizar',
    filtersTitle: 'Contexto de auditoría',
    filtersSubtitle: 'Selecciona un kiosco y filtra su historial por resultado.',
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
    emptyHelp: 'El historial aparecerá cuando se registre actividad en el kiosco seleccionado.',
    loadError: 'No fue posible cargar el inventario para auditoría.',
    auditError: 'No fue posible cargar el historial de este kiosco.',
    retry: 'Reintentar',
    guidanceTitle: 'Historial seguro',
    guidance: 'El Centro muestra los cambios y errores del kiosco. Las operaciones de negocio continúan administrándose en el módulo propietario.',
    technicalDetails: 'Detalles técnicos',
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
  backToDashboard: 'Back to dashboard',
  navigationLabel: 'Kiosk Center views',
  navigation: {
    'multi-kiosks': { label: 'Multi-kiosks', description: 'Shared PIN access' },
    inventory: { label: 'Operational kiosks', description: 'Status and administration' },
    people: { label: 'Collaborator access', description: 'Readiness and scope' },
    activity: { label: 'Activity', description: 'Events and audit' },
  },
  multi: {
    statusNavigation: 'Multi-kiosk status', total: 'All', active: 'Active', attention: 'Need attention', filtersTitle: 'Filters', filtersSubtitle: 'Find a Multi-kiosk by name, description, or status.',
    searchLabel: 'Search Multi-kiosks', searchPlaceholder: 'Name or description', statusLabel: 'Status', all: 'All', statuses: { ACTIVE: 'Active', DISABLED: 'Disabled', EXPIRED: 'Expired', REVOKED: 'Revoked' },
    refresh: 'Refresh Multi-kiosks', loadError: 'Kiosk Center could not be loaded.', openError: 'This Multi-kiosk could not be opened.', rotateError: 'The link could not be rotated.', stateError: 'The status could not be changed.',
    linkReady: 'Link ready', linkUnavailable: 'Protected link unavailable', edit: 'Edit', share: 'Share link and QR', open: 'Open link', more: 'More options',
    shareTitle: 'Share Multi-kiosk', shareDescription: 'Scan the code or copy the link to open this access.', close: 'Close', qrAlt: 'Multi-kiosk QR code', copied: 'Link copied', copyLink: 'Copy link', resultCount: (shown, total) => `${shown} of ${total} Multi-kiosks`,
  },
  access: {
    ...esMX.access,
    title: 'Collaborator access',
    subtitle: 'See who can use the Multi-kiosk and what must be completed before they sign in.',
    refresh: 'Refresh', filtersTitle: 'Filters', filtersSubtitle: 'Find a person and review any missing condition.',
    searchLabel: 'Search collaborator', searchPlaceholder: 'Name, email, unit, or business', statusLabel: 'Readiness',
    all: 'All', ready: 'Ready', attention: 'Needs attention', resultCount: (shown, total) => `${shown} of ${total} collaborators`,
    employee: 'Collaborator', assignment: 'Organization profile', pin: 'Personal PIN', modules: 'Modules', tabScopes: 'Scopes', organizationScope: 'Scope', readiness: 'Readiness', reason: 'What is missing', reviewAccess: 'Review access',
    configured: 'Ready', missing: 'Pending', inherited: 'Elevated access', backendValidation: 'Backend validation', corporate: 'Corporate', noModules: 'No enabled modules',
    noResults: 'No collaborators match this view', noResultsHelp: 'Adjust the search or readiness filter.', loadError: 'The collaborator catalogue could not be loaded.',
    guidanceTitle: 'Simple reading', guidance: 'Ready means the person has a PIN and at least one authorized tool. Needs attention explains exactly what must be corrected.',
    readinessNote: 'Permissions are managed in Users; Kiosk Center only checks effective access.',
    issueLabels: {
      PIN_REQUIRED: 'A personal PIN must be configured', MODULE_ACCESS_REQUIRED: 'A required module is missing', TAB_SCOPE_REQUIRED: 'A required tab scope is missing',
      ORGANIZATION_SCOPE_MISMATCH: 'The unit or business scope does not match', EMPLOYEE_INACTIVE: 'The collaborator is not active',
    },
  },
  activity: {
    ...esMX.activity,
    title: 'Activity', subtitle: 'Review what happened in a kiosk, when it happened, and whether the action completed successfully.', refresh: 'Refresh',
    filtersTitle: 'Activity filters', filtersSubtitle: 'Select a kiosk and filter its history by result.', kioskLabel: 'Kiosk', selectKiosk: 'Select a kiosk',
    searchLabel: 'Outcome', searchPlaceholder: 'All outcomes', allEvents: 'All', successful: 'Successful', attention: 'Needs attention', actor: 'Actor', capability: 'Capability',
    empty: 'No events match this view', emptyHelp: 'History appears when activity is recorded for the selected kiosk.', loadError: 'The audit inventory could not be loaded.',
    auditError: 'The history for this kiosk could not be loaded.', retry: 'Try again', guidanceTitle: 'Safe history',
    guidance: 'Kiosk Center shows kiosk changes and errors. Business operations remain managed in the owning module.', technicalDetails: 'Technical details',
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
