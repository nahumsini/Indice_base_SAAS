import { resolvePanelInicialLocale } from '../translations';

export interface UsersTranslations {
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
  };
  total: string;
}

const en: UsersTranslations = {
  accessEditor: {
    kiosksDescription: 'Enable only the employee kiosks this person needs.', kiosksTitle: 'Employee kiosks',
    organizationDescription: 'Define the responsibility level and where it applies.', organizationTitle: 'Role and organizational scope',
    permissionsDescription: 'Choose modules first, then refine the tabs inside each module.', permissionsTitle: 'Modules and tabs',
    review: 'Access summary', role: 'System role',
    roleAdjusted: (count, role) => `${count} incompatible tab permission${count === 1 ? '' : 's'} ${count === 1 ? 'was' : 'were'} removed when changing to ${role}.`,
    title: 'Edit role, scope and access',
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
    selected: (count) => `${count} tabs selected`, title: 'Module access',
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
  accessEditor: {
    kiosksDescription: 'Habilita únicamente los kioscos de colaborador que esta persona necesita.', kiosksTitle: 'Kioscos de colaborador',
    organizationDescription: 'Define el nivel de responsabilidad y dónde aplica.', organizationTitle: 'Rol y alcance organizacional',
    permissionsDescription: 'Elige módulos y después afina sus pestañas.', permissionsTitle: 'Módulos y pestañas',
    review: 'Resumen de accesos', role: 'Rol del sistema',
    roleAdjusted: (count, role) => `Se ${count === 1 ? 'retiró' : 'retiraron'} ${count} acceso${count === 1 ? '' : 's'} incompatible${count === 1 ? '' : 's'} al cambiar a ${role}.`,
    title: 'Editar rol, alcance y accesos',
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
    selected: (count) => `${count} pestañas seleccionadas`, title: 'Accesos por módulo',
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
  bulk: { ...es.bulk, activate: 'Ativar selecionados', clear: 'Limpar seleção', deactivate: 'Desativar selecionados', selected: (count) => `${count} selecionados`, title: 'Ações em massa' },
  clearFilters: 'Limpar filtros',
  close: 'Fechar', currentUser: 'Você', delete: 'Excluir', deleting: 'Excluindo...',
  filters: { ...es.filters, title: 'Filtros', role: 'Função', status: 'Status' }, insight: (filtered, total) => `Mostrando ${filtered} de ${total} usuários.`, loading: 'Carregando usuários...', total: 'Total de usuários',
  noResults: 'Nenhum usuário corresponde aos filtros atuais.', resendEmailLabel: 'Novo e-mail (opcional)',
  resendEmailHint: 'Deixe em branco para usar o e-mail atual.',
  pagination: { itemLabel: 'usuários', next: 'Próximo', previous: 'Anterior', rowsPerPage: 'Linhas por página', showing: (s, e, t, l) => `Mostrando ${s}-${e} de ${t} ${l}` },
};

const ko: UsersTranslations = {
  ...en, bulk: { ...en.bulk, activate: '선택 활성화', clear: '선택 해제', deactivate: '선택 비활성화', selected: (count) => `${count}개 선택됨`, title: '사용자 일괄 작업' }, clearFilters: '필터 지우기', close: '닫기', currentUser: '나', delete: '삭제', deleting: '삭제 중...',
  filters: { ...en.filters, title: '필터', role: '역할', status: '상태' }, insight: (filtered, total) => `전체 ${total}명 중 ${filtered}명 표시.`, loading: '사용자 로드 중...', total: '전체 사용자',
  noResults: '현재 필터와 일치하는 사용자가 없습니다.', resendEmailLabel: '새 이메일(선택 사항)', resendEmailHint: '현재 이메일을 사용하려면 비워 두세요.',
  pagination: { itemLabel: '사용자', next: '다음', previous: '이전', rowsPerPage: '페이지당 행', showing: (s, e, t, l) => `${t}${l} 중 ${s}-${e}` },
  selectedModules: (count) => `${count}개 모듈 선택됨`,
};

const zh: UsersTranslations = {
  ...en, bulk: { ...en.bulk, activate: '启用所选用户', clear: '清除选择', deactivate: '停用所选用户', selected: (count) => `已选择 ${count} 项`, title: '批量用户操作' }, clearFilters: '清除筛选', close: '关闭', currentUser: '你', delete: '删除', deleting: '正在删除...',
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
