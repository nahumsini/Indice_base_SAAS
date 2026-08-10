import { resolvePanelInicialLocale } from '../translations';

export interface UsersTranslations {
  organization: { business: string; businessUnit: string; module: string; modules: string; selectBusiness: string; selectBusinessUnit: string };
  screen: {
    title: string;
    subtitle: string;
    businessStructure: string;
    invite: string;
    search: string;
    filters: { all: string; active: string; pending: string; inactive: string };
    roles: { superAdmin: string; admin: string; user: string };
    status: { active: string; pending: string; inactive: string };
    table: { name: string; status: string; actions: string };
    modal: { cancel: string; copied: string; copyLink: string; email: string; inviteLink: string; modules: string; name: string; newUser: string; role: string; save: string; send: string };
    resend: string;
  };
  accessEditor: {
    kiosksDescription: string;
    kiosksTitle: string;
    organizationDescription: string;
    organizationTitle: string;
    permissionsDescription: string;
    permissionsTitle: string;
    review: string;
    role: string;
    roleAdjusted: (count: number, role: string) => string;
    title: string;
  };
  kioskPermissions: {
    assigned: (count: number) => string;
    companyWide: string;
    description: string;
    empty: string;
    title: string;
  };
  accessProfiles: {
    admin: { description: string; label: string };
    basic: { description: string; label: string };
    custom: { description: string; label: string };
    description: string;
    operation: { description: string; label: string };
    responsible: { description: string; label: string };
    title: string;
  };
  actions: {
    activate: string;
    deactivate: string;
    manage: string;
    more: string;
  };
  bulk: {
    activate: string;
    clear: string;
    deactivate: string;
    selectAll: string;
    selectUser: (name: string) => string;
    selected: (count: number) => string;
    title: string;
    updatingDescription: string;
    updatingTitle: string;
  };
  clearFilters: string;
  close: string;
  currentUser: string;
  delete: string;
  deleteConfirmationDescription: string;
  deleteConfirmationTitle: string;
  deactivateConfirmationDescription: string;
  deactivateConfirmationTitle: string;
  deactivateConfirmationWarning: string;
  deleting: string;
  emailDeliveryDisabled: string;
  emailNotSent: string;
  emailSent: string;
  errors: {
    businessAssignment: string;
    copyLink: string;
    deleteInvitation: string;
    load: string;
    moduleAccess: string;
    resendInvitation: string;
    selectBusiness: string;
    sendInvitation: string;
    status: string;
    role: string;
  };
  filters: {
    advancedActive: (count: number) => string;
    hideAdvanced: string;
    more: string;
    role: string;
    status: string;
    title: string;
  };
  insight: (filtered: number, total: number) => string;
  inviteCreated: string;
  inviteSuccess: string;
  inviteWizard: {
    access: string;
    accessError: string;
    back: string;
    completed: string;
    finalReview: string;
    identity: string;
    identityError: string;
    inheritedProfile: string;
    next: string;
    organization: string;
    organizationError: string;
    progress: (step: number, total: number) => string;
    reviewFields: string;
  };
  loading: string;
  noResults: string;
  overlays: {
    activatingDescription: string;
    activatingTitle: string;
    deactivatingDescription: string;
    deactivatingTitle: string;
    deletingDescription: string;
    deletingTitle: string;
    resendingDescription: string;
    resendingTitle: string;
    sendingDescription: string;
    sendingTitle: string;
  };
  pagination: {
    itemLabel: string;
    next: string;
    previous: string;
    rowsPerPage: string;
    showing: (start: number, end: number, total: number, label: string) => string;
  };
  resendCreated: string;
  resendEmailHint: string;
  resendEmailLabel: string;
  resendSuccess: string;
  scope: {
    business: string;
    business_office: string;
    corporate: string;
    corporate_office: string;
    label: string;
    unit: string;
    unit_headquarters: string;
  };
  seats: {
    active: string;
    activeCompany: string;
    available: string;
    currentCompany: string;
    limitReached: string;
    pending: string;
    summary: (active: number, pending: number, available: number | string) => string;
    unlimited: string;
  };
  selectedModules: (count: number) => string;
  statusFallback: string;
  tabPermissions: {
    all: string;
    collapse: string;
    expand: string;
    noResults: string;
    none: string;
    protected: string;
    search: string;
    selected: (count: number) => string;
    title: string;
    categoriesAriaLabel: string;
    categories: { all: string; basic: string; complementary: string; ai: string };
    availability: { fullAccess: string; comingSoon: string; development: string; pilot: string; available: string; notIncluded: string; tabs: string };
    roleAccess: string;
    roleScope: string;
    allowedTabs: string;
    roleNames: { user: string; admin: string; superadmin: string };
    roleDescriptions: { user: string; admin: string; superadmin: string };
    capabilityLabels: Record<string, string>;
  };
  total: string;
}

const en: UsersTranslations = {
  organization: { business: 'Business', businessUnit: 'Business unit', module: 'module', modules: 'modules', selectBusiness: 'Select a business', selectBusinessUnit: 'Select a business unit' },
  screen: {
    title: 'Users', subtitle: 'Manage access, responsibilities, and organizational scope.', businessStructure: 'Business structure', invite: 'Invite user', search: 'Search by name or email',
    filters: { all: 'All', active: 'Active', pending: 'Pending', inactive: 'Inactive' },
    roles: { superAdmin: 'Super administrator', admin: 'Administrator', user: 'User' }, status: { active: 'Active', pending: 'Pending', inactive: 'Inactive' }, table: { name: 'Name', status: 'Status', actions: 'Actions' },
    modal: { cancel: 'Cancel', copied: 'Copied', copyLink: 'Copy link', email: 'Email', inviteLink: 'Invitation link', modules: 'Modules', name: 'Name', newUser: 'Invite a new user', role: 'Role', save: 'Save', send: 'Send invitation' }, resend: 'Resend invitation',
  },
  accessEditor: {
    kiosksDescription: 'Enable only the employee kiosks this person needs.', kiosksTitle: 'Employee kiosks',
    organizationDescription: 'Define the responsibility level and where it applies.', organizationTitle: 'Role and organizational scope',
    permissionsDescription: 'Choose modules first, then refine the tabs inside each module.', permissionsTitle: 'Modules and tabs',
    review: 'Access summary', role: 'System role',
    roleAdjusted: (count, role) => `${count} incompatible tab permission${count === 1 ? '' : 's'} ${count === 1 ? 'was' : 'were'} removed when changing to ${role}.`,
    title: 'Edit role, scope and access',
  },
  kioskPermissions: {
    assigned: (count) => `${count} assigned`,
    companyWide: 'Company-wide',
    description: 'Assign only the experiences this person needs for work.',
    empty: 'No employee kiosks are available yet.',
    title: 'Operational kiosks',
  },
  accessProfiles: {
    admin: { description: 'All access that you are allowed to delegate.', label: 'Administrator' },
    basic: { description: 'Personal profile and essential self-service.', label: 'Basic' },
    custom: { description: 'A manually adjusted combination.', label: 'Custom' },
    description: 'Start with a safe profile and fine-tune it below before sending.',
    operation: { description: 'Daily people and process operations.', label: 'Operations' },
    responsible: { description: 'All available basic operating modules.', label: 'Manager' },
    title: 'Access profile',
  },
  actions: { activate: 'Activate user', deactivate: 'Deactivate user', manage: 'Manage', more: 'More actions' },
  bulk: {
    activate: 'Activate selected', clear: 'Clear selection', deactivate: 'Deactivate selected',
    selectAll: 'Select visible users', selectUser: (name) => `Select ${name}`,
    selected: (count) => `${count} selected`, title: 'Bulk user actions',
    updatingDescription: 'Applying the status change to the selected users.', updatingTitle: 'Updating selected users...',
  },
  clearFilters: 'Clear filters',
  close: 'Close', currentUser: 'You', delete: 'Delete', deleting: 'Deleting...',
  deleteConfirmationTitle: 'Delete invitation?',
  deleteConfirmationDescription: 'This cancels the pending invite link and removes it from the users list.',
  deactivateConfirmationTitle: 'Deactivate user?',
  deactivateConfirmationDescription: 'The user will immediately lose access to this company.',
  deactivateConfirmationWarning: 'Their HR work profile and historical records are preserved. Reactivating them will require an available seat.',
  emailDeliveryDisabled: 'Email delivery disabled', emailNotSent: 'Email not sent', emailSent: 'Email sent',
  errors: {
    businessAssignment: 'Unable to update business assignment.', copyLink: 'Unable to copy the invitation link.',
    deleteInvitation: 'Unable to delete invitation.', load: 'Unable to load users.', moduleAccess: 'Unable to save module access.',
    resendInvitation: 'Unable to resend invitation.', selectBusiness: 'Select both a business unit and business.',
    sendInvitation: 'Unable to send invitation.', status: 'Unable to update user status.', role: 'Unable to update user role.',
  },
  filters: {
    advancedActive: (count) => `${count} advanced filter${count === 1 ? '' : 's'} active`,
    hideAdvanced: 'Hide filters', more: 'More filters', role: 'Role', status: 'Status', title: 'Find a user',
  },
  insight: (filtered, total) => `Showing ${filtered} of ${total} users.`,
  inviteCreated: 'Invitation link created.', inviteSuccess: 'Invitation sent successfully.', loading: 'Loading users...',
  noResults: 'No users match the current filters.', resendCreated: 'Invitation link refreshed.',
  resendEmailHint: 'Leave it empty to use the current email.', resendEmailLabel: 'New email (optional)',
  resendSuccess: 'Invitation resent successfully.', statusFallback: 'Use the invite link below to test the acceptance flow.', total: 'Total users',
  overlays: {
    activatingDescription: 'Reserving an available seat and restoring company access.', activatingTitle: 'Activating user...',
    deactivatingDescription: 'Revoking company access while preserving historical records.', deactivatingTitle: 'Deactivating user...',
    deletingDescription: 'Cancelling the pending invite link and refreshing the users list.', deletingTitle: 'Deleting invitation...',
    resendingDescription: 'Refreshing the invite link and sending the email again.', resendingTitle: 'Resending invitation...',
    sendingDescription: 'Creating the user invitation and preparing email delivery.', sendingTitle: 'Sending invitation...',
  },
  pagination: {
    itemLabel: 'users', next: 'Next', previous: 'Previous', rowsPerPage: 'Rows per page',
    showing: (start, end, total, label) => `Showing ${start}-${end} of ${total} ${label}`,
  },
  scope: {
    business: 'Specific business', business_office: 'Business', corporate: 'Entire company',
    corporate_office: 'Corporate', label: 'Organizational scope', unit: 'Business unit', unit_headquarters: 'Unit',
  },
  seats: {
    active: 'Active seats', activeCompany: 'Active company', available: 'Available seats', currentCompany: 'Current company',
    limitReached: 'No seats are available. Deactivate a user or expand the plan to invite or activate another user.',
    pending: 'Pending invitations',
    summary: (active, pending, available) => `${active} active · ${pending} pending · ${available} available`,
    unlimited: 'No limit',
  },
  tabPermissions: {
    all: 'All', collapse: 'Collapse module', expand: 'Expand module', noResults: 'No modules or tabs match this search.',
    none: 'None', protected: 'Protected', search: 'Search module or tab',
    selected: (count) => `${count} tabs selected`, title: 'Module access', categoriesAriaLabel: 'Module categories',
    categories: { all: 'All', basic: 'Basic', complementary: 'Complementary', ai: 'AI' },
    availability: { fullAccess: 'Full module access', comingSoon: 'Coming soon', development: 'In development', pilot: 'Pilot', available: 'Available', notIncluded: 'Not included', tabs: 'tabs' },
    roleAccess: 'Effective access', roleScope: 'Scope', allowedTabs: 'available for this role',
    roleNames: { user: 'User', admin: 'Administrator', superadmin: 'Super administrator' },
    roleDescriptions: { user: 'Operates only the selected functions within their scope. Administrative areas remain protected.', admin: 'Manages selected functions within their scope and delegates only access they already hold.', superadmin: 'Manages the entire company, including protected access, and can delegate permissions.' },
    capabilityLabels: { view: 'View', personal_use: 'Personal use', operate_scope: 'Operate in scope', manage_scope: 'Manage scope', manage_company: 'Manage company', delegate_owned: 'Delegate owned access', delegate_access: 'Delegate access', protected_access: 'Protected access' },
  },
  selectedModules: (count) => `${count} module${count === 1 ? '' : 's'} selected`,
  inviteWizard: {
    access: 'Access', accessError: 'Select at least one module before sending the invitation.', back: 'Back',
    completed: 'Invitation ready', finalReview: 'Final review', identity: 'Profile',
    identityError: 'Enter a valid name and email address to continue.', inheritedProfile: 'Profile to invite',
    next: 'Continue', organization: 'Organization', organizationError: 'Select a business unit and business to continue.',
    progress: (step, total) => `Step ${step} of ${total}`, reviewFields: 'Review the required fields',
  },
};

const es: UsersTranslations = {
  ...en,
  organization: { business: 'Negocio', businessUnit: 'Unidad de negocio', module: 'módulo', modules: 'módulos', selectBusiness: 'Selecciona un negocio', selectBusinessUnit: 'Selecciona una unidad de negocio' },
  screen: {
    title: 'Usuarios', subtitle: 'Administra accesos, responsabilidades y alcance organizacional.', businessStructure: 'Estructura empresarial', invite: 'Invitar usuario', search: 'Buscar por nombre o correo',
    filters: { all: 'Todos', active: 'Activos', pending: 'Pendientes', inactive: 'Inactivos' },
    roles: { superAdmin: 'Superadministrador', admin: 'Administrador', user: 'Usuario' }, status: { active: 'Activo', pending: 'Pendiente', inactive: 'Inactivo' }, table: { name: 'Nombre', status: 'Estado', actions: 'Acciones' },
    modal: { cancel: 'Cancelar', copied: 'Copiado', copyLink: 'Copiar enlace', email: 'Correo electrónico', inviteLink: 'Enlace de invitación', modules: 'Módulos', name: 'Nombre', newUser: 'Invitar nuevo usuario', role: 'Rol', save: 'Guardar', send: 'Enviar invitación' }, resend: 'Reenviar invitación',
  },
  accessEditor: {
    kiosksDescription: 'Habilita únicamente los kioscos de colaborador que esta persona necesita.', kiosksTitle: 'Kioscos de colaborador',
    organizationDescription: 'Define el nivel de responsabilidad y dónde aplica.', organizationTitle: 'Rol y alcance organizacional',
    permissionsDescription: 'Elige módulos y después afina sus pestañas.', permissionsTitle: 'Módulos y pestañas',
    review: 'Resumen de accesos', role: 'Rol del sistema',
    roleAdjusted: (count, role) => `Se ${count === 1 ? 'retiró' : 'retiraron'} ${count} acceso${count === 1 ? '' : 's'} incompatible${count === 1 ? '' : 's'} al cambiar a ${role}.`,
    title: 'Editar rol, alcance y accesos',
  },
  kioskPermissions: {
    assigned: (count) => `${count} asignados`,
    companyWide: 'Toda la empresa',
    description: 'Asigna solamente las experiencias que esta persona necesita para trabajar.',
    empty: 'Aún no hay kioscos de colaboradores disponibles.',
    title: 'Kioscos operativos',
  },
  accessProfiles: {
    admin: { description: 'Todo el acceso que tienes permitido delegar.', label: 'Administrador' },
    basic: { description: 'Perfil personal y autoservicio esencial.', label: 'Básico' },
    custom: { description: 'Una combinación ajustada manualmente.', label: 'Personalizado' },
    description: 'Parte de un perfil seguro y afínalo antes de enviar la invitación.',
    operation: { description: 'Operación diaria de personas y procesos.', label: 'Operación' },
    responsible: { description: 'Todos los módulos operativos básicos disponibles.', label: 'Responsable' },
    title: 'Perfil de acceso',
  },
  actions: { activate: 'Activar usuario', deactivate: 'Desactivar usuario', manage: 'Administrar', more: 'Más acciones' },
  deactivateConfirmationTitle: '¿Desactivar usuario?',
  deactivateConfirmationDescription: 'El usuario perderá de inmediato el acceso a esta empresa.',
  deactivateConfirmationWarning: 'Su perfil laboral de Recursos Humanos y sus registros históricos se conservan. Para reactivarlo deberá existir una licencia disponible.',
  scope: {
    business: 'Negocio específico', business_office: 'Negocio', corporate: 'Toda la empresa',
    corporate_office: 'Corporativo', label: 'Alcance organizacional', unit: 'Unidad de negocio', unit_headquarters: 'Unidad',
  },
  seats: {
    active: 'Usuarios activos', activeCompany: 'Empresa activa', available: 'Lugares disponibles', currentCompany: 'Empresa actual',
    limitReached: 'No hay lugares disponibles. Desactiva un usuario o amplía el plan para invitar o activar a otro.',
    pending: 'Invitaciones pendientes',
    summary: (active, pending, available) => `${active} usuarios activos · ${pending} invitaciones · ${available} lugares disponibles`,
    unlimited: 'Sin límite',
  },
  tabPermissions: {
    all: 'Todas', collapse: 'Contraer módulo', expand: 'Expandir módulo', noResults: 'No hay módulos o pestañas que coincidan.',
    none: 'Ninguna', protected: 'Protegido', search: 'Buscar módulo o pestaña',
    selected: (count) => `${count} pestañas seleccionadas`, title: 'Accesos por módulo', categoriesAriaLabel: 'Categorías de módulos',
    categories: { all: 'Todos', basic: 'Básicos', complementary: 'Complementarios', ai: 'IA' },
    availability: { fullAccess: 'Acceso completo al módulo', comingSoon: 'Próximamente', development: 'En desarrollo', pilot: 'Piloto', available: 'Disponible', notIncluded: 'No incluido', tabs: 'pestañas' },
    roleAccess: 'Acceso efectivo', roleScope: 'Alcance', allowedTabs: 'disponibles para este rol',
    roleNames: { user: 'Usuario', admin: 'Administrador', superadmin: 'Superadministrador' },
    roleDescriptions: { user: 'Opera únicamente las funciones seleccionadas dentro de su alcance. Las áreas administrativas permanecen protegidas.', admin: 'Administra las funciones seleccionadas dentro de su alcance y solo puede delegar accesos que ya posee.', superadmin: 'Administra toda la empresa, incluidos accesos protegidos, y puede delegar permisos.' },
    capabilityLabels: { view: 'Consultar', personal_use: 'Uso personal', operate_scope: 'Operar en su alcance', manage_scope: 'Administrar su alcance', manage_company: 'Administrar empresa', delegate_owned: 'Delegar acceso propio', delegate_access: 'Delegar accesos', protected_access: 'Acceso protegido' },
  },
  bulk: {
    activate: 'Activar seleccionados', clear: 'Limpiar selección', deactivate: 'Desactivar seleccionados',
    selectAll: 'Seleccionar usuarios visibles', selectUser: (name) => `Seleccionar a ${name}`,
    selected: (count) => `${count} seleccionados`, title: 'Acciones masivas de usuarios',
    updatingDescription: 'Aplicando el cambio de estado a los usuarios seleccionados.', updatingTitle: 'Actualizando usuarios seleccionados...',
  },
  clearFilters: 'Limpiar filtros',
  close: 'Cerrar', currentUser: 'Tú', delete: 'Eliminar', deleting: 'Eliminando...',
  deleteConfirmationTitle: '¿Eliminar invitación?',
  deleteConfirmationDescription: 'Esto cancela el enlace pendiente y elimina la invitación de la lista de usuarios.',
  emailDeliveryDisabled: 'Envío de correo deshabilitado', emailNotSent: 'Correo no enviado', emailSent: 'Correo enviado',
  errors: {
    businessAssignment: 'No fue posible actualizar la asignación empresarial.', copyLink: 'No fue posible copiar el enlace de invitación.',
    deleteInvitation: 'No fue posible eliminar la invitación.', load: 'No fue posible cargar los usuarios.', moduleAccess: 'No fue posible guardar el acceso a módulos.',
    resendInvitation: 'No fue posible reenviar la invitación.', selectBusiness: 'Selecciona una unidad empresarial y un negocio.',
    sendInvitation: 'No fue posible enviar la invitación.', status: 'No fue posible actualizar el estado del usuario.', role: 'No fue posible actualizar el rol del usuario.',
  },
  filters: {
    advancedActive: (count) => `${count} filtro${count === 1 ? '' : 's'} avanzado${count === 1 ? '' : 's'} activo${count === 1 ? '' : 's'}`,
    hideAdvanced: 'Ocultar filtros', more: 'Más filtros', role: 'Rol', status: 'Estado', title: 'Encontrar usuario',
  },
  insight: (filtered, total) => `Mostrando ${filtered} de ${total} usuarios.`,
  inviteCreated: 'Enlace de invitación creado.', inviteSuccess: 'Invitación enviada correctamente.', loading: 'Cargando usuarios...',
  noResults: 'Ningún usuario coincide con los filtros actuales.', resendCreated: 'Enlace de invitación actualizado.',
  resendEmailHint: 'Déjalo vacío para usar el correo actual.', resendEmailLabel: 'Nuevo correo (opcional)',
  resendSuccess: 'Invitación reenviada correctamente.', statusFallback: 'Usa el enlace de invitación para completar el flujo de aceptación.', total: 'Total de usuarios',
  overlays: {
    activatingDescription: 'Reservando una licencia disponible y restaurando el acceso a la empresa.', activatingTitle: 'Activando usuario...',
    deactivatingDescription: 'Revocando el acceso a la empresa y conservando el historial.', deactivatingTitle: 'Desactivando usuario...',
    deletingDescription: 'Cancelando el enlace pendiente y actualizando la lista de usuarios.', deletingTitle: 'Eliminando invitación...',
    resendingDescription: 'Actualizando el enlace y reenviando el correo.', resendingTitle: 'Reenviando invitación...',
    sendingDescription: 'Creando la invitación y preparando el envío del correo.', sendingTitle: 'Enviando invitación...',
  },
  pagination: {
    itemLabel: 'usuarios', next: 'Siguiente', previous: 'Anterior', rowsPerPage: 'Filas por página',
    showing: (start, end, total, label) => `Mostrando ${start}-${end} de ${total} ${label}`,
  },
  selectedModules: (count) => `${count} módulo${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}`,
  inviteWizard: {
    access: 'Accesos', accessError: 'Selecciona al menos un módulo antes de enviar la invitación.', back: 'Atrás',
    completed: 'Invitación lista', finalReview: 'Revisión final', identity: 'Perfil',
    identityError: 'Ingresa un nombre y un correo válidos para continuar.', inheritedProfile: 'Perfil por invitar',
    next: 'Continuar', organization: 'Organización', organizationError: 'Selecciona una unidad y un negocio para continuar.',
    progress: (step, total) => `Paso ${step} de ${total}`, reviewFields: 'Revisa los campos necesarios',
  },
};

const fr: UsersTranslations = {
  ...en,
  kioskPermissions: {
    assigned: (count) => `${count} attribués`,
    companyWide: 'Toute l’entreprise',
    description: 'Attribuez uniquement les expériences nécessaires au travail de cette personne.',
    empty: 'Aucun kiosque pour le personnel n’est encore disponible.',
    title: 'Kiosques opérationnels',
  },
  organization: { business: 'Établissement', businessUnit: 'Unité d’affaires', module: 'module', modules: 'modules', selectBusiness: 'Sélectionner un établissement', selectBusinessUnit: 'Sélectionner une unité d’affaires' },
  screen: {
    title: 'Utilisateurs', subtitle: 'Gérez les accès, les responsabilités et la portée organisationnelle.', businessStructure: 'Structure de l’entreprise', invite: 'Inviter une personne', search: 'Rechercher par nom ou courriel',
    filters: { all: 'Tous', active: 'Actifs', pending: 'En attente', inactive: 'Inactifs' }, roles: { superAdmin: 'Superadministrateur', admin: 'Administrateur', user: 'Utilisateur' }, status: { active: 'Actif', pending: 'En attente', inactive: 'Inactif' }, table: { name: 'Nom', status: 'État', actions: 'Actions' },
    modal: { cancel: 'Annuler', copied: 'Copié', copyLink: 'Copier le lien', email: 'Courriel', inviteLink: 'Lien d’invitation', modules: 'Modules', name: 'Nom', newUser: 'Inviter une personne', role: 'Rôle', save: 'Enregistrer', send: 'Envoyer l’invitation' }, resend: 'Renvoyer l’invitation',
  },
  tabPermissions: {
    ...en.tabPermissions, all: 'Toutes', collapse: 'Réduire le module', expand: 'Développer le module', noResults: 'Aucun module ni onglet ne correspond à la recherche.', none: 'Aucune', protected: 'Protégé', search: 'Rechercher un module ou un onglet', selected: (count) => `${count} onglets sélectionnés`, title: 'Accès aux modules', categoriesAriaLabel: 'Catégories de modules',
    categories: { all: 'Tous', basic: 'De base', complementary: 'Complémentaires', ai: 'IA' }, availability: { fullAccess: 'Accès complet au module', comingSoon: 'À venir', development: 'En développement', pilot: 'Pilote', available: 'Disponible', notIncluded: 'Non inclus', tabs: 'onglets' },
    roleAccess: 'Accès réel', roleScope: 'Portée', allowedTabs: 'offerts pour ce rôle', roleNames: { user: 'Utilisateur', admin: 'Administrateur', superadmin: 'Superadministrateur' },
    roleDescriptions: { user: 'Utilise uniquement les fonctions sélectionnées dans sa portée. Les zones administratives demeurent protégées.', admin: 'Gère les fonctions sélectionnées dans sa portée et ne délègue que les accès qu’il possède.', superadmin: 'Gère toute l’entreprise, y compris les accès protégés, et peut déléguer des autorisations.' },
    capabilityLabels: { view: 'Consulter', personal_use: 'Usage personnel', operate_scope: 'Exploiter dans sa portée', manage_scope: 'Gérer sa portée', manage_company: 'Gérer l’entreprise', delegate_owned: 'Déléguer ses accès', delegate_access: 'Déléguer les accès', protected_access: 'Accès protégé' },
  },
  bulk: { ...en.bulk, activate: 'Activer la sélection', clear: 'Effacer la sélection', deactivate: 'Désactiver la sélection', selected: (count) => `${count} sélectionnés`, title: 'Actions groupées' },
  clearFilters: 'Effacer les filtres',
  close: 'Fermer', currentUser: 'Vous', delete: 'Supprimer', deleting: 'Suppression...',
  filters: { ...en.filters, title: 'Filtres', role: 'Rôle', status: 'État' }, insight: (filtered, total) => `${filtered} utilisateurs affichés sur ${total}.`, loading: 'Chargement des utilisateurs...', total: 'Total des utilisateurs',
  noResults: 'Aucun utilisateur ne correspond aux filtres actuels.', resendEmailLabel: 'Nouvelle adresse courriel (facultatif)',
  resendEmailHint: "Laissez ce champ vide pour utiliser l'adresse actuelle.",
  pagination: { itemLabel: 'utilisateurs', next: 'Suivant', previous: 'Précédent', rowsPerPage: 'Lignes par page', showing: (s, e, t, l) => `${s}-${e} sur ${t} ${l}` },
};

const pt: UsersTranslations = {
  ...es,
  kioskPermissions: {
    assigned: (count) => `${count} atribuídos`,
    companyWide: 'Toda a empresa',
    description: 'Atribua somente as experiências necessárias para o trabalho desta pessoa.',
    empty: 'Ainda não há quiosques de colaboradores disponíveis.',
    title: 'Quiosques operacionais',
  },
  organization: { business: 'Negócio', businessUnit: 'Unidade de negócio', module: 'módulo', modules: 'módulos', selectBusiness: 'Selecione um negócio', selectBusinessUnit: 'Selecione uma unidade de negócio' },
  screen: {
    title: 'Usuários', subtitle: 'Gerencie acessos, responsabilidades e abrangência organizacional.', businessStructure: 'Estrutura empresarial', invite: 'Convidar usuário', search: 'Buscar por nome ou e-mail',
    filters: { all: 'Todos', active: 'Ativos', pending: 'Pendentes', inactive: 'Inativos' }, roles: { superAdmin: 'Superadministrador', admin: 'Administrador', user: 'Usuário' }, status: { active: 'Ativo', pending: 'Pendente', inactive: 'Inativo' }, table: { name: 'Nome', status: 'Status', actions: 'Ações' },
    modal: { cancel: 'Cancelar', copied: 'Copiado', copyLink: 'Copiar link', email: 'E-mail', inviteLink: 'Link de convite', modules: 'Módulos', name: 'Nome', newUser: 'Convidar novo usuário', role: 'Função', save: 'Salvar', send: 'Enviar convite' }, resend: 'Reenviar convite',
  },
  tabPermissions: {
    ...es.tabPermissions, all: 'Todas', collapse: 'Recolher módulo', expand: 'Expandir módulo', noResults: 'Nenhum módulo ou aba corresponde à busca.', none: 'Nenhuma', protected: 'Protegido', search: 'Buscar módulo ou aba', selected: (count) => `${count} abas selecionadas`, title: 'Acessos por módulo', categoriesAriaLabel: 'Categorias de módulos',
    categories: { all: 'Todos', basic: 'Básicos', complementary: 'Complementares', ai: 'IA' }, availability: { fullAccess: 'Acesso completo ao módulo', comingSoon: 'Em breve', development: 'Em desenvolvimento', pilot: 'Piloto', available: 'Disponível', notIncluded: 'Não incluído', tabs: 'abas' },
    roleAccess: 'Acesso efetivo', roleScope: 'Abrangência', allowedTabs: 'disponíveis para esta função', roleNames: { user: 'Usuário', admin: 'Administrador', superadmin: 'Superadministrador' },
    roleDescriptions: { user: 'Opera somente as funções selecionadas dentro da sua abrangência. As áreas administrativas continuam protegidas.', admin: 'Gerencia as funções selecionadas dentro da sua abrangência e delega apenas os acessos que possui.', superadmin: 'Gerencia toda a empresa, inclusive acessos protegidos, e pode delegar permissões.' },
    capabilityLabels: { view: 'Consultar', personal_use: 'Uso pessoal', operate_scope: 'Operar na abrangência', manage_scope: 'Gerenciar abrangência', manage_company: 'Gerenciar empresa', delegate_owned: 'Delegar acesso próprio', delegate_access: 'Delegar acessos', protected_access: 'Acesso protegido' },
  },
  bulk: { ...es.bulk, activate: 'Ativar selecionados', clear: 'Limpar seleção', deactivate: 'Desativar selecionados', selected: (count) => `${count} selecionados`, title: 'Ações em massa' },
  clearFilters: 'Limpar filtros',
  close: 'Fechar', currentUser: 'Você', delete: 'Excluir', deleting: 'Excluindo...',
  filters: { ...es.filters, title: 'Filtros', role: 'Função', status: 'Status' }, insight: (filtered, total) => `Mostrando ${filtered} de ${total} usuários.`, loading: 'Carregando usuários...', total: 'Total de usuários',
  noResults: 'Nenhum usuário corresponde aos filtros atuais.', resendEmailLabel: 'Novo e-mail (opcional)',
  resendEmailHint: 'Deixe em branco para usar o e-mail atual.',
  pagination: { itemLabel: 'usuários', next: 'Próximo', previous: 'Anterior', rowsPerPage: 'Linhas por página', showing: (s, e, t, l) => `Mostrando ${s}-${e} de ${t} ${l}` },
};

const ko: UsersTranslations = {
  ...en,
  kioskPermissions: {
    assigned: (count) => `${count}개 할당됨`,
    companyWide: '회사 전체',
    description: '이 사용자의 업무에 필요한 키오스크만 할당하세요.',
    empty: '아직 사용할 수 있는 직원 키오스크가 없습니다.',
    title: '운영 키오스크',
  },
  organization: { business: '사업장', businessUnit: '사업 단위', module: '모듈', modules: '모듈', selectBusiness: '사업장 선택', selectBusinessUnit: '사업 단위 선택' },
  screen: { title: '사용자', subtitle: '접근 권한, 책임 및 조직 범위를 관리합니다.', businessStructure: '사업 구조', invite: '사용자 초대', search: '이름 또는 이메일 검색', filters: { all: '전체', active: '활성', pending: '대기 중', inactive: '비활성' }, roles: { superAdmin: '최고 관리자', admin: '관리자', user: '사용자' }, status: { active: '활성', pending: '대기 중', inactive: '비활성' }, table: { name: '이름', status: '상태', actions: '작업' }, modal: { cancel: '취소', copied: '복사됨', copyLink: '링크 복사', email: '이메일', inviteLink: '초대 링크', modules: '모듈', name: '이름', newUser: '새 사용자 초대', role: '역할', save: '저장', send: '초대 보내기' }, resend: '초대 다시 보내기' },
  tabPermissions: { ...en.tabPermissions, all: '전체', collapse: '모듈 접기', expand: '모듈 펼치기', noResults: '검색과 일치하는 모듈 또는 탭이 없습니다.', none: '없음', protected: '보호됨', search: '모듈 또는 탭 검색', selected: (count) => `${count}개 탭 선택됨`, title: '모듈 접근 권한', categoriesAriaLabel: '모듈 카테고리', categories: { all: '전체', basic: '기본', complementary: '추가', ai: 'AI' }, availability: { fullAccess: '모듈 전체 접근', comingSoon: '출시 예정', development: '개발 중', pilot: '파일럿', available: '사용 가능', notIncluded: '포함되지 않음', tabs: '탭' }, roleAccess: '실제 접근 권한', roleScope: '범위', allowedTabs: '이 역할에서 사용 가능', roleNames: { user: '사용자', admin: '관리자', superadmin: '최고 관리자' }, roleDescriptions: { user: '지정된 범위에서 선택한 기능만 사용합니다. 관리 영역은 보호됩니다.', admin: '지정된 범위에서 선택한 기능을 관리하며 본인이 가진 접근 권한만 위임합니다.', superadmin: '보호된 접근을 포함해 회사 전체를 관리하고 권한을 위임할 수 있습니다.' }, capabilityLabels: { view: '조회', personal_use: '개인 사용', operate_scope: '범위 내 운영', manage_scope: '범위 관리', manage_company: '회사 관리', delegate_owned: '보유 접근 위임', delegate_access: '접근 권한 위임', protected_access: '보호된 접근' } },
  bulk: { ...en.bulk, activate: '선택 활성화', clear: '선택 해제', deactivate: '선택 비활성화', selected: (count) => `${count}개 선택됨`, title: '사용자 일괄 작업' }, clearFilters: '필터 지우기', close: '닫기', currentUser: '나', delete: '삭제', deleting: '삭제 중...',
  filters: { ...en.filters, title: '필터', role: '역할', status: '상태' }, insight: (filtered, total) => `전체 ${total}명 중 ${filtered}명 표시.`, loading: '사용자 로드 중...', total: '전체 사용자',
  noResults: '현재 필터와 일치하는 사용자가 없습니다.', resendEmailLabel: '새 이메일(선택 사항)', resendEmailHint: '현재 이메일을 사용하려면 비워 두세요.',
  pagination: { itemLabel: '사용자', next: '다음', previous: '이전', rowsPerPage: '페이지당 행', showing: (s, e, t, l) => `${t}${l} 중 ${s}-${e}` },
  selectedModules: (count) => `${count}개 모듈 선택됨`,
};

const zh: UsersTranslations = {
  ...en,
  kioskPermissions: {
    assigned: (count) => `已分配 ${count} 个`,
    companyWide: '全公司',
    description: '仅分配此人工作所需的员工终端。',
    empty: '目前没有可用的员工终端。',
    title: '运营终端',
  },
  organization: { business: '业务', businessUnit: '业务单元', module: '模块', modules: '模块', selectBusiness: '选择业务', selectBusinessUnit: '选择业务单元' },
  screen: { title: '用户', subtitle: '管理访问权限、职责和组织范围。', businessStructure: '企业结构', invite: '邀请用户', search: '按姓名或邮箱搜索', filters: { all: '全部', active: '活跃', pending: '待处理', inactive: '已停用' }, roles: { superAdmin: '超级管理员', admin: '管理员', user: '用户' }, status: { active: '活跃', pending: '待处理', inactive: '已停用' }, table: { name: '姓名', status: '状态', actions: '操作' }, modal: { cancel: '取消', copied: '已复制', copyLink: '复制链接', email: '电子邮件', inviteLink: '邀请链接', modules: '模块', name: '姓名', newUser: '邀请新用户', role: '角色', save: '保存', send: '发送邀请' }, resend: '重新发送邀请' },
  tabPermissions: { ...en.tabPermissions, all: '全部', collapse: '收起模块', expand: '展开模块', noResults: '没有符合搜索的模块或标签页。', none: '无', protected: '受保护', search: '搜索模块或标签页', selected: (count) => `已选择 ${count} 个标签页`, title: '模块访问权限', categoriesAriaLabel: '模块类别', categories: { all: '全部', basic: '基础', complementary: '附加', ai: '人工智能' }, availability: { fullAccess: '完整模块访问权限', comingSoon: '即将推出', development: '开发中', pilot: '试点', available: '可用', notIncluded: '未包含', tabs: '标签页' }, roleAccess: '有效访问权限', roleScope: '范围', allowedTabs: '此角色可用', roleNames: { user: '用户', admin: '管理员', superadmin: '超级管理员' }, roleDescriptions: { user: '仅在指定范围内操作所选功能，管理区域仍受保护。', admin: '管理指定范围内的所选功能，并且只能委派自己已有的访问权限。', superadmin: '管理整个公司（包括受保护访问权限），并可委派权限。' }, capabilityLabels: { view: '查看', personal_use: '个人使用', operate_scope: '在范围内操作', manage_scope: '管理范围', manage_company: '管理公司', delegate_owned: '委派自有权限', delegate_access: '委派访问权限', protected_access: '受保护访问' } },
  bulk: { ...en.bulk, activate: '启用所选用户', clear: '清除选择', deactivate: '停用所选用户', selected: (count) => `已选择 ${count} 项`, title: '批量用户操作' }, clearFilters: '清除筛选', close: '关闭', currentUser: '你', delete: '删除', deleting: '正在删除...',
  filters: { ...en.filters, title: '筛选', role: '角色', status: '状态' }, insight: (filtered, total) => `显示 ${filtered} 位用户，共 ${total} 位。`, loading: '正在加载用户...', total: '用户总数',
  noResults: '没有符合当前筛选条件的用户。', resendEmailLabel: '新电子邮件（可选）', resendEmailHint: '留空将使用当前电子邮件。',
  pagination: { itemLabel: '用户', next: '下一页', previous: '上一页', rowsPerPage: '每页行数', showing: (s, e, t, l) => `显示 ${s}-${e}，共 ${t} ${l}` },
  selectedModules: (count) => `已选择 ${count} 个模块`,
};

export function getUsersTranslations(locale: string | null | undefined): UsersTranslations {
  switch (resolvePanelInicialLocale(locale)) {
    case 'es-MX': case 'es-CO': return es;
    case 'fr-CA': return fr;
    case 'pt-BR': return pt;
    case 'ko-CA': return ko;
    case 'zh-CA': return zh;
    default: return en;
  }
}
