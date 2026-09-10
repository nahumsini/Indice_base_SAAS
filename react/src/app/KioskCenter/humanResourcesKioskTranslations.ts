export interface HumanResourcesKioskCopy {
  navigationLabel: string;
  tabs: {
    attendance: string;
    announcements: string;
    records: string;
    permissions: string;
  };
  announcements: {
    title: string;
    description: string;
    empty: string;
    detail: string;
    publishedBy: (author: string) => string;
  };
  records: {
    title: string;
    description: string;
    empty: string;
    detail: string;
    actions: string;
  };
  permissions: {
    title: string;
    description: string;
    empty: string;
    create: string;
    formTitle: string;
    formDescription: string;
    type: string;
    startDate: string;
    endDate: string;
    halfDay: string;
    reason: string;
    reasonPlaceholder: string;
    submit: string;
    cancel: string;
    success: string;
    genericError: string;
    types: Record<string, string>;
  };
  unavailable: string;
  close: string;
  status: Record<string, string>;
}

const esMX: HumanResourcesKioskCopy = {
  navigationLabel: 'Secciones de Recursos Humanos',
  tabs: { attendance: 'Asistencia', announcements: 'Comunicados', records: 'Actas', permissions: 'Permisos' },
  announcements: {
    title: 'Comunicados para ti',
    description: 'Noticias e indicaciones publicadas por Recursos Humanos.',
    empty: 'No tienes comunicados publicados.',
    detail: 'Detalle del comunicado',
    publishedBy: author => `Publicado por ${author}`,
  },
  records: {
    title: 'Mis actas',
    description: 'Consulta únicamente las actas vinculadas con tu expediente.',
    empty: 'No tienes actas registradas.',
    detail: 'Detalle del acta',
    actions: 'Acciones registradas',
  },
  permissions: {
    title: 'Mis permisos',
    description: 'Solicita un permiso y consulta su avance.',
    empty: 'No tienes solicitudes de permiso.',
    create: 'Solicitar permiso',
    formTitle: 'Nueva solicitud de permiso',
    formDescription: 'Recursos Humanos revisará la solicitud antes de aprobarla.',
    type: 'Tipo de permiso',
    startDate: 'Fecha de inicio',
    endDate: 'Fecha final',
    halfDay: 'Solicitar medio día',
    reason: 'Motivo',
    reasonPlaceholder: 'Explica brevemente el motivo de la solicitud',
    submit: 'Enviar solicitud',
    cancel: 'Cancelar',
    success: 'La solicitud se envió a Recursos Humanos.',
    genericError: 'No fue posible enviar la solicitud. Revisa los datos e intenta nuevamente.',
    types: {
      vacation: 'Vacaciones', sick_leave: 'Incapacidad o enfermedad', personal: 'Asunto personal',
      maternity: 'Maternidad', bereavement: 'Duelo', unpaid: 'Permiso sin goce', other: 'Otro',
    },
  },
  unavailable: 'Esta información no está disponible en este momento. Tu acceso a las demás secciones sigue activo.',
  close: 'Cerrar',
  status: {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', reviewed: 'Revisada',
    resolved: 'Resuelta', open: 'Abierta', closed: 'Cerrada', low: 'Baja', medium: 'Media', high: 'Alta',
  },
};

const enCA: HumanResourcesKioskCopy = {
  navigationLabel: 'Human Resources sections',
  tabs: { attendance: 'Attendance', announcements: 'News', records: 'Records', permissions: 'Leave' },
  announcements: {
    title: 'News for you', description: 'Updates and guidance published by Human Resources.',
    empty: 'There are no published announcements for you.', detail: 'Announcement details',
    publishedBy: author => `Published by ${author}`,
  },
  records: {
    title: 'My records', description: 'View only records linked to your employee file.',
    empty: 'There are no records in your file.', detail: 'Record details', actions: 'Recorded actions',
  },
  permissions: {
    title: 'My leave requests', description: 'Request time away and follow its status.',
    empty: 'You have no leave requests.', create: 'Request leave', formTitle: 'New leave request',
    formDescription: 'Human Resources will review the request before approving it.', type: 'Request type',
    startDate: 'Start date', endDate: 'End date', halfDay: 'Request a half day', reason: 'Reason',
    reasonPlaceholder: 'Briefly explain the reason for your request', submit: 'Send request', cancel: 'Cancel',
    success: 'Your request was sent to Human Resources.',
    genericError: 'The request could not be sent. Check the information and try again.',
    types: {
      vacation: 'Vacation', sick_leave: 'Sick leave', personal: 'Personal', maternity: 'Maternity',
      bereavement: 'Bereavement', unpaid: 'Unpaid leave', other: 'Other',
    },
  },
  unavailable: 'This information is temporarily unavailable. Your access to the other sections is still active.',
  close: 'Close',
  status: {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected', reviewed: 'Reviewed',
    resolved: 'Resolved', open: 'Open', closed: 'Closed', low: 'Low', medium: 'Medium', high: 'High',
  },
};

const frCA: HumanResourcesKioskCopy = {
  ...enCA,
  navigationLabel: 'Sections des Ressources humaines',
  tabs: { attendance: 'Présence', announcements: 'Annonces', records: 'Dossiers', permissions: 'Congés' },
  announcements: { ...enCA.announcements, title: 'Annonces pour vous', description: 'Nouvelles et consignes publiées par les Ressources humaines.', empty: 'Aucune annonce publiée pour vous.', detail: "Détail de l’annonce", publishedBy: author => `Publié par ${author}` },
  records: { title: 'Mes dossiers', description: 'Consultez seulement les dossiers liés à votre profil.', empty: 'Aucun dossier à afficher.', detail: 'Détail du dossier', actions: 'Actions consignées' },
  permissions: { ...enCA.permissions, title: 'Mes demandes', description: 'Demandez un congé et suivez son état.', empty: 'Aucune demande de congé.', create: 'Demander un congé', formTitle: 'Nouvelle demande', formDescription: 'Les Ressources humaines examineront la demande avant son approbation.', type: 'Type de demande', startDate: 'Date de début', endDate: 'Date de fin', halfDay: 'Demander une demi-journée', reason: 'Motif', submit: 'Envoyer', cancel: 'Annuler', success: 'La demande a été envoyée.', genericError: "Impossible d’envoyer la demande." },
  unavailable: 'Cette information est temporairement indisponible.', close: 'Fermer',
};

const ptBR: HumanResourcesKioskCopy = {
  ...enCA,
  navigationLabel: 'Seções de Recursos Humanos',
  tabs: { attendance: 'Ponto', announcements: 'Comunicados', records: 'Registros', permissions: 'Licenças' },
  announcements: { ...enCA.announcements, title: 'Comunicados para você', description: 'Notícias e orientações de Recursos Humanos.', empty: 'Não há comunicados publicados.', detail: 'Detalhes do comunicado', publishedBy: author => `Publicado por ${author}` },
  records: { title: 'Meus registros', description: 'Consulte somente os registros ligados ao seu perfil.', empty: 'Não há registros.', detail: 'Detalhes do registro', actions: 'Ações registradas' },
  permissions: { ...enCA.permissions, title: 'Minhas licenças', description: 'Solicite uma licença e acompanhe o status.', empty: 'Não há solicitações.', create: 'Solicitar licença', formTitle: 'Nova solicitação', formDescription: 'Recursos Humanos revisará a solicitação.', type: 'Tipo', startDate: 'Data inicial', endDate: 'Data final', halfDay: 'Solicitar meio período', reason: 'Motivo', submit: 'Enviar solicitação', cancel: 'Cancelar', success: 'A solicitação foi enviada.', genericError: 'Não foi possível enviar a solicitação.' },
  unavailable: 'Estas informações estão temporariamente indisponíveis.', close: 'Fechar',
};

const koCA: HumanResourcesKioskCopy = {
  ...enCA,
  navigationLabel: '인사 섹션',
  tabs: { attendance: '근태', announcements: '공지', records: '기록', permissions: '휴가' },
};

const zhCA: HumanResourcesKioskCopy = {
  ...enCA,
  navigationLabel: '人力资源栏目',
  tabs: { attendance: '考勤', announcements: '通知', records: '记录', permissions: '请假' },
};

const copies: Record<string, HumanResourcesKioskCopy> = {
  'es-MX': esMX,
  'es-CO': esMX,
  'en-CA': enCA,
  'en-US': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export function getHumanResourcesKioskCopy(locale: string) {
  return copies[locale] ?? (locale.toLowerCase().startsWith('es') ? esMX : enCA);
}
