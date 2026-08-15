type TicketCopy = {
  tab: string;
  title: string;
  distributorSubtitle: string;
  rootSubtitle: string;
  newTicket: string;
  filters: string;
  filterSubtitle: string;
  search: string;
  searchPlaceholder: string;
  status: string;
  type: string;
  all: string;
  active: string;
  open: string;
  inReview: string;
  planned: string;
  resolved: string;
  closed: string;
  failure: string;
  improvement: string;
  total: string;
  completed: string;
  folio: string;
  report: string;
  distributor: string;
  priority: string;
  module: string;
  reportedBy: string;
  updated: string;
  actions: string;
  view: string;
  noTickets: string;
  noTicketsHelp: string;
  loading: string;
  retry: string;
  createTitle: string;
  createDescription: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  moduleLabel: string;
  modulePlaceholder: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityCritical: string;
  cancel: string;
  create: string;
  creating: string;
  createdMessage: string;
  detailTitle: string;
  rootResponse: string;
  rootResponsePlaceholder: string;
  save: string;
  saving: string;
  close: string;
  createdAt: string;
  reporter: string;
  itemLabel: string;
};

const en: TicketCopy = {
  tab: 'System tickets', title: 'System tickets',
  distributorSubtitle: 'Report system failures and improvement ideas, then follow each assigned folio.',
  rootSubtitle: 'Create, review, and manage system reports from Root and every distributor account.',
  newTicket: 'New ticket', filters: 'Ticket filters', filterSubtitle: 'Find reports by folio, title, module, or distributor.',
  search: 'Search', searchPlaceholder: 'Folio, title, module, or distributor', status: 'Status', type: 'Type', all: 'All', active: 'Open folios',
  open: 'Open', inReview: 'In review', planned: 'Planned', resolved: 'Resolved', closed: 'Closed', failure: 'Failure', improvement: 'Improvement',
  total: 'Total reports', completed: 'Completed', folio: 'Folio', report: 'Report', distributor: 'Distributor', priority: 'Priority', module: 'Module',
  reportedBy: 'Reported by', updated: 'Last update', actions: 'Actions', view: 'View ticket', noTickets: 'No tickets match these filters.',
  noTicketsHelp: 'Create the first report or adjust the filters.', loading: 'Loading system tickets…', retry: 'Try again',
  createTitle: 'Report a system ticket', createDescription: 'Describe a failure or improvement clearly so the Root team can evaluate it.',
  titleLabel: 'Short title', titlePlaceholder: 'Example: Inventory list does not load', descriptionLabel: 'Detailed description',
  descriptionPlaceholder: 'Explain what happened, what you expected, and how to reproduce it.', moduleLabel: 'Affected module', modulePlaceholder: 'Example: Inventory',
  priorityLow: 'Low', priorityMedium: 'Medium', priorityHigh: 'High', priorityCritical: 'Critical', cancel: 'Cancel', create: 'Create ticket', creating: 'Creating…',
  createdMessage: 'Ticket created successfully.', detailTitle: 'Ticket details', rootResponse: 'Root response',
  rootResponsePlaceholder: 'Share progress, a solution, or the next action with the distributor.', save: 'Save changes', saving: 'Saving…', close: 'Close',
  createdAt: 'Created', reporter: 'Reporter', itemLabel: 'tickets',
};

const es: TicketCopy = {
  ...en,
  tab: 'Tickets de sistema', title: 'Tickets de sistema',
  distributorSubtitle: 'Reporta fallas y propuestas de mejora, y da seguimiento a cada folio asignado.',
  rootSubtitle: 'Crea, revisa y administra reportes de Root y de todas las cuentas distribuidoras.',
  newTicket: 'Nuevo ticket', filters: 'Filtros de tickets', filterSubtitle: 'Encuentra reportes por folio, título, módulo o distribuidor.',
  search: 'Buscar', searchPlaceholder: 'Folio, título, módulo o distribuidor', status: 'Estado', type: 'Tipo', all: 'Todos', active: 'Folios abiertos',
  open: 'Abierto', inReview: 'En revisión', planned: 'Planeado', resolved: 'Resuelto', closed: 'Cerrado', failure: 'Falla', improvement: 'Mejora',
  total: 'Reportes totales', completed: 'Completados', folio: 'Folio', report: 'Reporte', distributor: 'Distribuidor', priority: 'Prioridad', module: 'Módulo',
  reportedBy: 'Reportado por', updated: 'Última actualización', actions: 'Acciones', view: 'Ver ticket', noTickets: 'No hay tickets con estos filtros.',
  noTicketsHelp: 'Crea el primer reporte o ajusta los filtros.', loading: 'Cargando tickets de sistema…', retry: 'Reintentar',
  createTitle: 'Reportar ticket de sistema', createDescription: 'Describe claramente la falla o mejora para que el equipo Root pueda evaluarla.',
  titleLabel: 'Título breve', titlePlaceholder: 'Ejemplo: No carga la lista de inventario', descriptionLabel: 'Descripción detallada',
  descriptionPlaceholder: 'Explica qué ocurrió, qué esperabas y cómo puede reproducirse.', moduleLabel: 'Módulo afectado', modulePlaceholder: 'Ejemplo: Inventarios',
  priorityLow: 'Baja', priorityMedium: 'Media', priorityHigh: 'Alta', priorityCritical: 'Crítica', cancel: 'Cancelar', create: 'Crear ticket', creating: 'Creando…',
  createdMessage: 'Ticket creado correctamente.', detailTitle: 'Detalle del ticket', rootResponse: 'Respuesta de Root',
  rootResponsePlaceholder: 'Comparte avances, la solución o el siguiente paso con el distribuidor.', save: 'Guardar cambios', saving: 'Guardando…', close: 'Cerrar',
  createdAt: 'Creado', reporter: 'Reportante', itemLabel: 'tickets',
};

const fr: TicketCopy = {
  ...en, tab: 'Billets système', title: 'Billets système', newTicket: 'Nouveau billet', filters: 'Filtres', search: 'Rechercher',
  all: 'Tous', active: 'Billets ouverts', open: 'Ouvert', inReview: 'En révision', planned: 'Planifié', resolved: 'Résolu', closed: 'Fermé',
  failure: 'Incident', improvement: 'Amélioration', priority: 'Priorité', module: 'Module', actions: 'Actions', view: 'Voir le billet', cancel: 'Annuler',
  create: 'Créer le billet', close: 'Fermer', save: 'Enregistrer', rootResponse: 'Réponse Root', itemLabel: 'billets',
};

const pt: TicketCopy = {
  ...en, tab: 'Tickets do sistema', title: 'Tickets do sistema', newTicket: 'Novo ticket', filters: 'Filtros', search: 'Buscar',
  all: 'Todos', active: 'Tickets abertos', open: 'Aberto', inReview: 'Em análise', planned: 'Planejado', resolved: 'Resolvido', closed: 'Fechado',
  failure: 'Falha', improvement: 'Melhoria', priority: 'Prioridade', module: 'Módulo', actions: 'Ações', view: 'Ver ticket', cancel: 'Cancelar',
  create: 'Criar ticket', close: 'Fechar', save: 'Salvar', rootResponse: 'Resposta da Root', itemLabel: 'tickets',
};

const ko: TicketCopy = { ...en, tab: '시스템 티켓', title: '시스템 티켓', newTicket: '새 티켓', search: '검색', all: '전체', active: '열린 티켓', close: '닫기', save: '저장', itemLabel: '티켓' };
const zh: TicketCopy = { ...en, tab: '系统工单', title: '系统工单', newTicket: '新建工单', search: '搜索', all: '全部', active: '未结工单', close: '关闭', save: '保存', itemLabel: '工单' };

export const getSystemTicketCopy = (locale: string): TicketCopy => {
  if (locale === 'es-MX' || locale === 'es-CO') return es;
  if (locale === 'fr-CA') return fr;
  if (locale === 'pt-BR') return pt;
  if (locale === 'ko-CA') return ko;
  if (locale === 'zh-CA') return zh;
  return en;
};
