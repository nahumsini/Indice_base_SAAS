export interface KioskCenterCopy {
  locale: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  refresh: string;
  loadingTitle: string;
  loadingDescription: string;
  stats: {
    total: string;
    active: string;
    attention: string;
    modules: string;
  };
  filters: {
    title: string;
    subtitle: string;
  };
  search: {
    label: string;
    placeholder: string;
    status: string;
    module: string;
    type: string;
    risk: string;
    all: string;
    withRisk: string;
    results: (shown: number, total: number) => string;
    clear: string;
  };
  table: {
    kiosk: string;
    module: string;
    status: string;
    scope: string;
    access: string;
    versions: string;
    activity: string;
    risks: string;
    actions: string;
  };
  empty: {
    title: string;
    description: string;
    filteredTitle: string;
    filteredDescription: string;
  };
  error: {
    title: string;
    load: string;
    unavailable: string;
    forbidden: string;
    detail: string;
    audit: string;
    lifecycle: string;
    retry: string;
  };
  status: Record<string, string>;
  modules: Record<string, string>;
  types: Record<string, string>;
  accessLevels: Record<string, string>;
  accessMethods: Record<string, string>;
  risks: Record<string, string>;
  labels: {
    corporate: string;
    unit: string;
    business: string;
    location: string;
    never: string;
    expires: string;
    noExpiration: string;
    configVersion: string;
    adapterVersion: string;
    identifier: string;
    legacyIdentifier: string;
    noDescription: string;
    actor: string;
    capability: string;
    moduleReference: string;
    safeSnapshot: string;
    unknown: string;
    technicalDetails: string;
  };
  auditLabels: {
    events: Record<string, string>;
    outcomes: Record<string, string>;
    actors: Record<string, string>;
  };
  actions: {
    inspect: string;
    openAdmin: string;
    disable: string;
    revoke: string;
    close: string;
  };
  detail: {
    eyebrow: string;
    description: string;
    overview: string;
    audit: string;
    loading: string;
    auditEmpty: string;
    historicalTitle: (id: number) => string;
    historicalDescription: string;
  };
  lifecycle: {
    disableEyebrow: string;
    disableTitle: string;
    disableDescription: string;
    revokeEyebrow: string;
    revokeTitle: string;
    revokeDescription: string;
    reason: string;
    reasonPlaceholder: string;
    reasonHelp: string;
    cancel: string;
    disabling: string;
    revoking: string;
    confirmDisable: string;
    confirmRevoke: string;
    successDisable: (name: string) => string;
    successRevoke: (name: string) => string;
  };
}

const es: KioskCenterCopy = {
  locale: 'es-MX',
  eyebrow: 'Inventario operativo',
  title: 'Kioscos operativos',
  subtitle: 'Supervisa los kioscos de la empresa, detecta cuáles requieren atención y abre su módulo propietario para administrarlos.',
  refresh: 'Actualizar',
  loadingTitle: 'Cargando Centro de Kioskos',
  loadingDescription: 'Consolidando el inventario y las señales de operación.',
  stats: {
    total: 'Todos los kioscos',
    active: 'Activos',
    attention: 'Requieren atención',
    modules: 'Módulos',
  },
  filters: {
    title: 'Filtros',
    subtitle: 'Encuentra un kiosco por nombre, módulo, alcance o estado.',
  },
  search: {
    label: 'Buscar kioscos',
    placeholder: 'Nombre, módulo o ubicación',
    status: 'Estado',
    module: 'Módulo',
    type: 'Tipo',
    risk: 'Señales',
    all: 'Todos',
    withRisk: 'Con atención',
    results: (shown, total) => `${shown} de ${total} kioscos`,
    clear: 'Limpiar filtros',
  },
  table: {
    kiosk: 'Kiosco',
    module: 'Módulo',
    status: 'Estado y señales',
    scope: 'Alcance',
    access: 'Acceso',
    versions: 'Configuración',
    activity: 'Última actividad',
    risks: 'Señales',
    actions: 'Acciones',
  },
  empty: {
    title: 'Todavía no hay kioscos operativos',
    description: 'Los kioscos aparecerán aquí cuando se creen desde sus módulos propietarios.',
    filteredTitle: 'No hay coincidencias',
    filteredDescription: 'Ajusta la búsqueda o limpia los filtros para volver a ver el inventario.',
  },
  error: {
    title: 'No pudimos cargar los kioscos',
    load: 'No fue posible cargar el inventario de kioscos.',
    unavailable: 'El Centro de kioscos aún no está habilitado para esta empresa.',
    forbidden: 'Tu perfil no tiene permiso para consultar esta superficie administrativa.',
    detail: 'No fue posible cargar el detalle del kiosco.',
    audit: 'No fue posible cargar su historial de auditoría.',
    lifecycle: 'No fue posible completar el cambio de estado.',
    retry: 'Reintentar',
  },
  status: {
    ACTIVE: 'Activo',
    DISABLED: 'Deshabilitado',
    EXPIRED: 'Expirado',
    REVOKED: 'Revocado',
    DELETED: 'Eliminado',
  },
  modules: {
    PROCESS_TASKS: 'Tareas y procesos',
    EXPENSES: 'Gastos',
    PETTY_CASH: 'Caja chica',
    HUMAN_RESOURCES: 'Recursos Humanos',
    POINT_OF_SALE: 'Punto de venta',
    SALES: 'Ventas',
    PROCUREMENT: 'Compras',
  },
  types: {
    task_access: 'Acceso a tareas',
    task_operations: 'Operación de tareas',
    accounts_payable: 'Cuentas por pagar',
    receipt_capture: 'Captura de comprobantes',
    business_unit: 'Asistencia por unidad',
    contract_site: 'Asistencia en sitio',
    head_office: 'Asistencia corporativa',
    open_attendance: 'Asistencia abierta',
    customer_display: 'Pantalla de cliente',
    self_service: 'Autoservicio POS',
    public_catalog: 'Catálogo público',
    supplier_portal: 'Portal de proveedores',
  },
  accessLevels: {
    PUBLIC: 'Público',
    IDENTIFIED: 'Identificado',
    VERIFIED: 'Verificado',
    CONTROLLED: 'Controlado',
  },
  accessMethods: {
    IDENTIFICATION: 'Identificación',
    EMAIL_OTP: 'Código por correo',
    PIN: 'PIN',
    INDEX_SESSION: 'Sesión Índice',
  },
  risks: {
    EXPIRED: 'Expirado',
    EXPIRING_SOON: 'Expira pronto',
    REVOKED: 'Revocado',
    REPEATED_FAILURES: 'Fallos repetidos',
  },
  labels: {
    corporate: 'Corporativo',
    unit: 'Unidad',
    business: 'Negocio',
    location: 'Ubicación',
    never: 'Sin actividad registrada',
    expires: 'Expira',
    noExpiration: 'Sin expiración programada',
    configVersion: 'Configuración',
    adapterVersion: 'Adaptador',
    identifier: 'ID técnico',
    legacyIdentifier: 'ID funcional',
    noDescription: 'Sin descripción adicional.',
    actor: 'Actor',
    capability: 'Capacidad',
    moduleReference: 'Referencia del módulo',
    safeSnapshot: 'Datos seguros del evento',
    unknown: 'No disponible',
    technicalDetails: 'Detalles técnicos',
  },
  auditLabels: {
    events: {
      KIOSK_GRANT_CREATED: 'Acceso creado',
      KIOSK_CREATED: 'Kiosco creado',
      KIOSK_UPDATED: 'Kiosco actualizado',
      KIOSK_DISABLED: 'Kiosco deshabilitado',
      KIOSK_REVOKED: 'Kiosco revocado',
      KIOSK_ACTION_REQUESTED: 'Acción solicitada',
      KIOSK_ACTION_REJECTED: 'Acción no autorizada',
      KIOSK_ACTION_FAILED: 'La acción no pudo completarse',
      KIOSK_SESSION_CREATED: 'Sesión iniciada',
      KIOSK_SESSION_CLOSED: 'Sesión cerrada',
      IDENTIFICATION_SUCCEEDED: 'Identificación correcta',
      IDENTIFICATION_FAILED: 'Identificación rechazada',
      ACCESS_GRANTED: 'Acceso concedido',
      ACCESS_DENIED: 'Acceso rechazado',
    },
    outcomes: {
      SUCCEEDED: 'Correcto',
      SUCCESS: 'Correcto',
      REQUESTED: 'Solicitado',
      REJECTED: 'Rechazado',
      FAILED: 'Fallido',
      DENIED: 'Rechazado',
    },
    actors: {
      USER: 'Usuario',
      EMPLOYEE: 'Colaborador',
      SYSTEM: 'Sistema',
      ADMIN: 'Administrador',
      ROOT: 'Root',
    },
  },
  actions: {
    inspect: 'Ver detalle y auditoría',
    openAdmin: 'Abrir administración del módulo',
    disable: 'Deshabilitar',
    revoke: 'Revocar acceso',
    close: 'Cerrar',
  },
  detail: {
    eyebrow: 'Detalle del kiosco',
    description: 'Consulta su estado, alcance e historial sin exponer credenciales de acceso.',
    overview: 'Resumen',
    audit: 'Auditoría',
    loading: 'Cargando detalle e historial…',
    auditEmpty: 'Este kiosco todavía no tiene eventos de auditoría.',
    historicalTitle: (id) => `Kiosco histórico #${id}`,
    historicalDescription: 'La definición funcional ya no está en el inventario, pero su trazabilidad retenida permanece disponible.',
  },
  lifecycle: {
    disableEyebrow: 'Pausa operativa',
    disableTitle: 'Deshabilitar kiosco',
    disableDescription: 'El kiosco dejará de aceptar sesiones y acciones hasta que se reactive desde su módulo propietario.',
    revokeEyebrow: 'Acción irreversible',
    revokeTitle: 'Revocar kiosco',
    revokeDescription: 'La revocación invalida su acceso y no puede revertirse. El historial permanecerá disponible para auditoría.',
    reason: 'Motivo administrativo',
    reasonPlaceholder: 'Describe por qué se realiza este cambio',
    reasonHelp: 'Escribe al menos 8 caracteres. El motivo quedará en la trazabilidad del módulo.',
    cancel: 'Cancelar',
    disabling: 'Deshabilitando…',
    revoking: 'Revocando…',
    confirmDisable: 'Confirmar deshabilitación',
    confirmRevoke: 'Confirmar revocación',
    successDisable: (name) => `${name} quedó deshabilitado.`,
    successRevoke: (name) => `${name} quedó revocado.`,
  },
};

const en: KioskCenterCopy = {
  locale: 'en-US',
  eyebrow: 'Operational inventory',
  title: 'Operational kiosks',
  subtitle: 'Monitor company kiosks, identify those that need attention, and open their owning module to manage them.',
  refresh: 'Refresh',
  loadingTitle: 'Loading Kiosk Center',
  loadingDescription: 'Consolidating inventory and operational signals.',
  stats: { total: 'All kiosks', active: 'Active', attention: 'Need attention', modules: 'Modules' },
  filters: { title: 'Filters', subtitle: 'Find a kiosk by name, module, scope, or status.' },
  search: {
    label: 'Search kiosks', placeholder: 'Name, module, or location', status: 'Status', module: 'Module', type: 'Type', risk: 'Signals', all: 'All', withRisk: 'Needs attention',
    results: (shown, total) => `${shown} of ${total} kiosks`, clear: 'Clear filters',
  },
  table: { kiosk: 'Kiosk', module: 'Module', status: 'Status and signals', scope: 'Scope', access: 'Access', versions: 'Configuration', activity: 'Last activity', risks: 'Signals', actions: 'Actions' },
  empty: {
    title: 'There are no operational kiosks yet',
    description: 'Kiosks appear here after they are created in their owning modules.',
    filteredTitle: 'No matches found',
    filteredDescription: 'Adjust the search or clear filters to see the inventory again.',
  },
  error: {
    title: 'Kiosks could not be loaded', load: 'The kiosk inventory could not be loaded.', unavailable: 'Kiosk Center is not enabled for this company yet.', forbidden: 'Your profile cannot access this administrative surface.', detail: 'The kiosk details could not be loaded.', audit: 'Its audit history could not be loaded.', lifecycle: 'The status change could not be completed.', retry: 'Try again',
  },
  status: { ACTIVE: 'Active', DISABLED: 'Disabled', EXPIRED: 'Expired', REVOKED: 'Revoked', DELETED: 'Deleted' },
  modules: { PROCESS_TASKS: 'Processes & Tasks', EXPENSES: 'Expenses', PETTY_CASH: 'Petty Cash', HUMAN_RESOURCES: 'Human Resources', POINT_OF_SALE: 'Point of Sale', SALES: 'Sales', PROCUREMENT: 'Procurement' },
  types: { task_access: 'Task access', task_operations: 'Task operations', accounts_payable: 'Accounts payable', receipt_capture: 'Receipt capture', business_unit: 'Unit attendance', contract_site: 'Site attendance', head_office: 'Head office attendance', open_attendance: 'Open attendance', customer_display: 'Customer display', self_service: 'POS self service', public_catalog: 'Public catalog', supplier_portal: 'Supplier portal' },
  accessLevels: { PUBLIC: 'Public', IDENTIFIED: 'Identified', VERIFIED: 'Verified', CONTROLLED: 'Controlled' },
  accessMethods: { IDENTIFICATION: 'Identification', EMAIL_OTP: 'Email code', PIN: 'PIN', INDEX_SESSION: 'Indice session' },
  risks: { EXPIRED: 'Expired', EXPIRING_SOON: 'Expiring soon', REVOKED: 'Revoked', REPEATED_FAILURES: 'Repeated failures' },
  labels: { corporate: 'Corporate', unit: 'Unit', business: 'Business', location: 'Location', never: 'No recorded activity', expires: 'Expires', noExpiration: 'No scheduled expiration', configVersion: 'Configuration', adapterVersion: 'Adapter', identifier: 'Technical ID', legacyIdentifier: 'Functional ID', noDescription: 'No additional description.', actor: 'Actor', capability: 'Capability', moduleReference: 'Module reference', safeSnapshot: 'Safe event data', unknown: 'Unavailable', technicalDetails: 'Technical details' },
  auditLabels: {
    events: {
      KIOSK_GRANT_CREATED: 'Access created', KIOSK_CREATED: 'Kiosk created', KIOSK_UPDATED: 'Kiosk updated', KIOSK_DISABLED: 'Kiosk disabled', KIOSK_REVOKED: 'Kiosk revoked',
      KIOSK_ACTION_REQUESTED: 'Action requested', KIOSK_ACTION_REJECTED: 'Action not authorized', KIOSK_ACTION_FAILED: 'Action could not be completed', KIOSK_SESSION_CREATED: 'Session started', KIOSK_SESSION_CLOSED: 'Session closed',
      IDENTIFICATION_SUCCEEDED: 'Identification succeeded', IDENTIFICATION_FAILED: 'Identification rejected', ACCESS_GRANTED: 'Access granted', ACCESS_DENIED: 'Access denied',
    },
    outcomes: { SUCCEEDED: 'Successful', SUCCESS: 'Successful', REQUESTED: 'Requested', REJECTED: 'Rejected', FAILED: 'Failed', DENIED: 'Denied' },
    actors: { USER: 'User', EMPLOYEE: 'Collaborator', SYSTEM: 'System', ADMIN: 'Administrator', ROOT: 'Root' },
  },
  actions: { inspect: 'View details and audit', openAdmin: 'Open module administration', disable: 'Disable', revoke: 'Revoke access', close: 'Close' },
  detail: { eyebrow: 'Cross-module detail', description: 'Review status, scope, and history without exposing access credentials.', overview: 'Overview', audit: 'Audit', loading: 'Loading details and history…', auditEmpty: 'This kiosk has no audit events yet.', historicalTitle: (id) => `Historical kiosk #${id}`, historicalDescription: 'The functional definition is no longer in the inventory, but its retained traceability remains available.' },
  lifecycle: {
    disableEyebrow: 'Operational pause', disableTitle: 'Disable kiosk', disableDescription: 'The kiosk will stop accepting sessions and actions until it is enabled from its owning module.', revokeEyebrow: 'Irreversible action', revokeTitle: 'Revoke kiosk', revokeDescription: 'Revocation invalidates its access and cannot be undone. History remains available for audit.', reason: 'Administrative reason', reasonPlaceholder: 'Describe why this change is required', reasonHelp: 'Enter at least 8 characters. The reason becomes part of the module traceability.', cancel: 'Cancel', disabling: 'Disabling…', revoking: 'Revoking…', confirmDisable: 'Confirm disable', confirmRevoke: 'Confirm revocation', successDisable: (name) => `${name} was disabled.`, successRevoke: (name) => `${name} was revoked.`,
  },
};

export function getKioskCenterCopy(locale?: string | null): KioskCenterCopy {
  return locale?.toLowerCase().startsWith('es') ? es : en;
}
