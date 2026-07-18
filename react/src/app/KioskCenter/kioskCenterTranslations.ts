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
  eyebrow: 'Kiosk Engine V2 · Control transversal',
  title: 'Centro global de kioskos',
  subtitle: 'Inventario operativo de todos los kioskos de la empresa. Consulta alcance, salud, versiones y trazabilidad sin revelar credenciales públicas.',
  refresh: 'Actualizar',
  loadingTitle: 'Cargando Centro de Kioskos',
  loadingDescription: 'Consolidando el inventario y las señales de operación.',
  stats: {
    total: 'Kioskos registrados',
    active: 'Activos',
    attention: 'Requieren atención',
    modules: 'Módulos representados',
  },
  search: {
    label: 'Buscar kioskos',
    placeholder: 'Nombre, código, módulo o tipo',
    status: 'Estado',
    module: 'Módulo',
    type: 'Tipo',
    risk: 'Señales',
    all: 'Todos',
    withRisk: 'Con atención',
    results: (shown, total) => `${shown} de ${total} kioskos`,
    clear: 'Limpiar filtros',
  },
  table: {
    kiosk: 'Kiosko',
    scope: 'Alcance',
    access: 'Acceso',
    versions: 'Versiones',
    activity: 'Última actividad',
    risks: 'Señales',
    actions: 'Acciones',
  },
  empty: {
    title: 'Todavía no hay kioskos en el motor',
    description: 'Los kioskos aparecerán aquí cuando un módulo registre su definición en Kiosk Engine V2.',
    filteredTitle: 'No hay coincidencias',
    filteredDescription: 'Ajusta la búsqueda o limpia los filtros para volver a ver el inventario.',
  },
  error: {
    title: 'No pudimos abrir el Centro de Kioskos',
    load: 'No fue posible cargar el inventario transversal.',
    unavailable: 'El Centro global aún no está habilitado para esta empresa.',
    forbidden: 'Tu perfil no tiene permiso para consultar esta superficie administrativa.',
    detail: 'No fue posible cargar el detalle del kiosko.',
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
    identifier: 'ID del Engine',
    legacyIdentifier: 'ID funcional',
    noDescription: 'Sin descripción adicional.',
    actor: 'Actor',
    capability: 'Capacidad',
    moduleReference: 'Referencia del módulo',
    safeSnapshot: 'Datos seguros del evento',
    unknown: 'No disponible',
  },
  actions: {
    inspect: 'Ver detalle y auditoría',
    openAdmin: 'Abrir administración del módulo',
    disable: 'Deshabilitar',
    revoke: 'Revocar acceso',
    close: 'Cerrar',
  },
  detail: {
    eyebrow: 'Detalle transversal',
    description: 'Información consolidada del Engine; las credenciales públicas nunca se muestran.',
    overview: 'Resumen',
    audit: 'Auditoría',
    loading: 'Cargando detalle e historial…',
    auditEmpty: 'Este kiosko todavía no tiene eventos de auditoría.',
    historicalTitle: (id) => `Kiosko histórico #${id}`,
    historicalDescription: 'La definición funcional ya no está en el inventario, pero su trazabilidad retenida permanece disponible.',
  },
  lifecycle: {
    disableEyebrow: 'Pausa operativa',
    disableTitle: 'Deshabilitar kiosko',
    disableDescription: 'El kiosko dejará de aceptar sesiones y acciones hasta que se reactive desde su módulo propietario.',
    revokeEyebrow: 'Acción irreversible',
    revokeTitle: 'Revocar kiosko',
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
  eyebrow: 'Kiosk Engine V2 · Cross-module control',
  title: 'Global Kiosk Center',
  subtitle: 'Operational inventory for every company kiosk. Review scope, health, versions, and traceability without exposing public credentials.',
  refresh: 'Refresh',
  loadingTitle: 'Loading Kiosk Center',
  loadingDescription: 'Consolidating inventory and operational signals.',
  stats: { total: 'Registered kiosks', active: 'Active', attention: 'Need attention', modules: 'Modules represented' },
  search: {
    label: 'Search kiosks', placeholder: 'Name, code, module, or type', status: 'Status', module: 'Module', type: 'Type', risk: 'Signals', all: 'All', withRisk: 'Needs attention',
    results: (shown, total) => `${shown} of ${total} kiosks`, clear: 'Clear filters',
  },
  table: { kiosk: 'Kiosk', scope: 'Scope', access: 'Access', versions: 'Versions', activity: 'Last activity', risks: 'Signals', actions: 'Actions' },
  empty: {
    title: 'There are no kiosks in the Engine yet',
    description: 'Kiosks will appear here when a module registers its definition in Kiosk Engine V2.',
    filteredTitle: 'No matches found',
    filteredDescription: 'Adjust the search or clear filters to see the inventory again.',
  },
  error: {
    title: 'Kiosk Center could not be opened', load: 'The cross-module inventory could not be loaded.', unavailable: 'The Global Center is not enabled for this company yet.', forbidden: 'Your profile cannot access this administrative surface.', detail: 'The kiosk details could not be loaded.', audit: 'Its audit history could not be loaded.', lifecycle: 'The status change could not be completed.', retry: 'Try again',
  },
  status: { ACTIVE: 'Active', DISABLED: 'Disabled', EXPIRED: 'Expired', REVOKED: 'Revoked', DELETED: 'Deleted' },
  modules: { PROCESS_TASKS: 'Processes & Tasks', EXPENSES: 'Expenses', PETTY_CASH: 'Petty Cash', HUMAN_RESOURCES: 'Human Resources', POINT_OF_SALE: 'Point of Sale', SALES: 'Sales', PROCUREMENT: 'Procurement' },
  types: { task_access: 'Task access', task_operations: 'Task operations', accounts_payable: 'Accounts payable', receipt_capture: 'Receipt capture', business_unit: 'Unit attendance', contract_site: 'Site attendance', head_office: 'Head office attendance', open_attendance: 'Open attendance', customer_display: 'Customer display', self_service: 'POS self service', public_catalog: 'Public catalog', supplier_portal: 'Supplier portal' },
  accessLevels: { PUBLIC: 'Public', IDENTIFIED: 'Identified', VERIFIED: 'Verified', CONTROLLED: 'Controlled' },
  accessMethods: { IDENTIFICATION: 'Identification', EMAIL_OTP: 'Email code', PIN: 'PIN', INDEX_SESSION: 'Indice session' },
  risks: { EXPIRED: 'Expired', EXPIRING_SOON: 'Expiring soon', REVOKED: 'Revoked', REPEATED_FAILURES: 'Repeated failures' },
  labels: { corporate: 'Corporate', unit: 'Unit', business: 'Business', location: 'Location', never: 'No recorded activity', expires: 'Expires', noExpiration: 'No scheduled expiration', configVersion: 'Configuration', adapterVersion: 'Adapter', identifier: 'Engine ID', legacyIdentifier: 'Functional ID', noDescription: 'No additional description.', actor: 'Actor', capability: 'Capability', moduleReference: 'Module reference', safeSnapshot: 'Safe event data', unknown: 'Unavailable' },
  actions: { inspect: 'View details and audit', openAdmin: 'Open module administration', disable: 'Disable', revoke: 'Revoke access', close: 'Close' },
  detail: { eyebrow: 'Cross-module detail', description: 'Consolidated Engine information; public credentials are never displayed.', overview: 'Overview', audit: 'Audit', loading: 'Loading details and history…', auditEmpty: 'This kiosk has no audit events yet.', historicalTitle: (id) => `Historical kiosk #${id}`, historicalDescription: 'The functional definition is no longer in the inventory, but its retained traceability remains available.' },
  lifecycle: {
    disableEyebrow: 'Operational pause', disableTitle: 'Disable kiosk', disableDescription: 'The kiosk will stop accepting sessions and actions until it is enabled from its owning module.', revokeEyebrow: 'Irreversible action', revokeTitle: 'Revoke kiosk', revokeDescription: 'Revocation invalidates its access and cannot be undone. History remains available for audit.', reason: 'Administrative reason', reasonPlaceholder: 'Describe why this change is required', reasonHelp: 'Enter at least 8 characters. The reason becomes part of the module traceability.', cancel: 'Cancel', disabling: 'Disabling…', revoking: 'Revoking…', confirmDisable: 'Confirm disable', confirmRevoke: 'Confirm revocation', successDisable: (name) => `${name} was disabled.`, successRevoke: (name) => `${name} was revoked.`,
  },
};

export function getKioskCenterCopy(locale?: string | null): KioskCenterCopy {
  return locale?.toLowerCase().startsWith('es') ? es : en;
}
