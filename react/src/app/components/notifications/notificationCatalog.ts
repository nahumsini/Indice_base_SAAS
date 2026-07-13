import type { AppNotification } from '../../api/notifications';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface NotificationModuleMeta {
  slug: string;
  label: string;
  shortLabel: string;
  emoji: string;
  color: 'blue' | 'green' | 'yellow' | 'coral' | 'gray';
}

export interface NotificationPreferenceItem {
  eventType: string;
  label: string;
  description: string;
  priority: NotificationPriority;
  defaultEnabled: boolean;
}

export interface NotificationPreferenceGroup {
  module: NotificationModuleMeta;
  items: NotificationPreferenceItem[];
}

const moduleCatalog: Record<string, NotificationModuleMeta> = {
  human_resources: {
    slug: 'human_resources',
    label: 'Human Resources',
    shortLabel: 'HR',
    emoji: '👥',
    color: 'green',
  },
  processes_tasks: {
    slug: 'processes_tasks',
    label: 'Processes & Tasks',
    shortLabel: 'Tasks',
    emoji: '✅',
    color: 'yellow',
  },
  finance: {
    slug: 'finance',
    label: 'Finance',
    shortLabel: 'Finance',
    emoji: '💰',
    color: 'blue',
  },
  expenses: {
    slug: 'expenses',
    label: 'Expenses',
    shortLabel: 'Expenses',
    emoji: '💸',
    color: 'coral',
  },
  sales: {
    slug: 'sales',
    label: 'Sales',
    shortLabel: 'Sales',
    emoji: '💼',
    color: 'coral',
  },
  point_of_sale: {
    slug: 'point_of_sale',
    label: 'Point of Sale',
    shortLabel: 'POS',
    emoji: '🛒',
    color: 'coral',
  },
};

export const notificationPreferenceGroups: NotificationPreferenceGroup[] = [
  {
    module: moduleCatalog.human_resources,
    items: [
      {
        eventType: 'general',
        label: 'Published announcements',
        description: 'Company, unit, department, or employee announcements.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'urgent',
        label: 'Urgent announcements',
        description: 'Critical HR communications that require fast review.',
        priority: 'high',
        defaultEnabled: true,
      },
      {
        eventType: 'reminder',
        label: 'HR reminders',
        description: 'Attendance, records, payroll, or document reminders.',
        priority: 'medium',
        defaultEnabled: true,
      },
    ],
  },
  {
    module: moduleCatalog.processes_tasks,
    items: [
      {
        eventType: 'task_assigned',
        label: 'Task assigned',
        description: 'A task was assigned to you.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'task_reassigned',
        label: 'Task reassigned',
        description: 'Responsibility changed on a task you need to track.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'task_due_today',
        label: 'Due today',
        description: 'A task reaches its due date today.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'task_overdue',
        label: 'Overdue task',
        description: 'A task passed its due date and needs attention.',
        priority: 'high',
        defaultEnabled: true,
      },
      {
        eventType: 'task_pending_audit',
        label: 'Pending review',
        description: 'A completed task is waiting for review or audit.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'task_audited',
        label: 'Reviewed task',
        description: 'A task was reviewed and closed by the responsible reviewer.',
        priority: 'low',
        defaultEnabled: true,
      },
    ],
  },
  {
    module: moduleCatalog.expenses,
    items: [
      {
        eventType: 'expense_submitted',
        label: 'Expense submitted',
        description: 'A collaborator submitted an expense for review.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'expense_pending_approval',
        label: 'Pending approval',
        description: 'An expense requires approval before payment.',
        priority: 'high',
        defaultEnabled: true,
      },
      {
        eventType: 'expense_due',
        label: 'Payment due',
        description: 'A payable expense reaches its due date.',
        priority: 'high',
        defaultEnabled: true,
      },
      {
        eventType: 'expense_paid',
        label: 'Expense paid',
        description: 'An expense was paid and closed.',
        priority: 'low',
        defaultEnabled: true,
      },
    ],
  },
  {
    module: moduleCatalog.point_of_sale,
    items: [
      {
        eventType: 'pos_shift_opened',
        label: 'Shift opened',
        description: 'A cashier opened a POS shift.',
        priority: 'low',
        defaultEnabled: true,
      },
      {
        eventType: 'pos_shift_closed',
        label: 'Shift closed',
        description: 'A POS shift was closed and is ready for review.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'pos_stock_low',
        label: 'Low stock',
        description: 'A POS product or warehouse needs replenishment.',
        priority: 'high',
        defaultEnabled: true,
      },
      {
        eventType: 'pos_purchase_pending',
        label: 'Purchase pending',
        description: 'A purchase order or supplier invoice needs attention.',
        priority: 'medium',
        defaultEnabled: true,
      },
    ],
  },
  {
    module: moduleCatalog.sales,
    items: [
      {
        eventType: 'sales_quote_follow_up',
        label: 'Quote follow-up',
        description: 'A quote needs follow-up before it goes cold.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'sales_order_ready',
        label: 'Order ready',
        description: 'A sales order is ready for next operational step.',
        priority: 'medium',
        defaultEnabled: true,
      },
      {
        eventType: 'sales_invoice_overdue',
        label: 'Invoice overdue',
        description: 'A customer invoice is overdue.',
        priority: 'high',
        defaultEnabled: true,
      },
      {
        eventType: 'sales_customer_activity',
        label: 'Customer activity',
        description: 'Relevant customer movement or commercial activity occurred.',
        priority: 'low',
        defaultEnabled: true,
      },
    ],
  },
];

export function getNotificationModule(notification: AppNotification, locale = 'en-CA'): NotificationModuleMeta {
  const moduleMeta = moduleCatalog[notification.module_slug] ?? {
    slug: notification.module_slug || 'general',
    label: titleCase((notification.module_slug || 'general').replace(/_/g, ' ')),
    shortLabel: titleCase((notification.module_slug || 'General').replace(/_/g, ' ')),
    emoji: '🔔',
    color: 'gray',
  };

  return localizeNotificationModule(moduleMeta, locale);
}

const notificationTitles = {
  en: {
    general: 'New notification',
    urgent: 'Urgent announcement',
    reminder: 'Reminder',
    celebration: 'New achievement',
    task_assigned: 'Task assigned',
    task_reassigned: 'Task reassigned',
    task_due_today: 'Task due today',
    task_overdue: 'Overdue task',
    task_pending_audit: 'Task pending review',
    task_audited: 'Task reviewed',
    expense_submitted: 'Expense submitted',
    expense_pending_approval: 'Expense pending approval',
    expense_due: 'Expense payment due',
    expense_paid: 'Expense paid',
    pos_shift_opened: 'POS shift opened',
    pos_shift_closed: 'POS shift closed',
    pos_stock_low: 'Low stock',
    pos_purchase_pending: 'Purchase pending',
    sales_quote_follow_up: 'Quote follow-up',
    sales_order_ready: 'Sales order ready',
    sales_invoice_overdue: 'Invoice overdue',
    sales_customer_activity: 'Customer activity',
  },
  es: {
    general: 'Nueva notificación',
    urgent: 'Comunicado urgente',
    reminder: 'Recordatorio',
    celebration: 'Nuevo logro',
    task_assigned: 'Tarea asignada',
    task_reassigned: 'Tarea reasignada',
    task_due_today: 'Tarea con vencimiento hoy',
    task_overdue: 'Tarea vencida',
    task_pending_audit: 'Tarea pendiente de revisión',
    task_audited: 'Tarea revisada',
    expense_submitted: 'Gasto enviado',
    expense_pending_approval: 'Gasto pendiente de aprobación',
    expense_due: 'Pago de gasto pendiente',
    expense_paid: 'Gasto pagado',
    pos_shift_opened: 'Turno de caja abierto',
    pos_shift_closed: 'Turno de caja cerrado',
    pos_stock_low: 'Inventario bajo',
    pos_purchase_pending: 'Compra pendiente',
    sales_quote_follow_up: 'Seguimiento de cotización',
    sales_order_ready: 'Pedido listo',
    sales_invoice_overdue: 'Factura vencida',
    sales_customer_activity: 'Actividad de cliente',
  },
  fr: {
    general: 'Nouvelle notification', urgent: 'Communication urgente', reminder: 'Rappel', celebration: 'Nouvelle réussite', task_assigned: 'Tâche assignée', task_reassigned: 'Tâche réassignée', task_due_today: 'Tâche à remettre aujourd’hui', task_overdue: 'Tâche en retard', task_pending_audit: 'Tâche en attente de révision', task_audited: 'Tâche révisée', expense_submitted: 'Dépense soumise', expense_pending_approval: 'Dépense en attente d’approbation', expense_due: 'Paiement de dépense exigible', expense_paid: 'Dépense payée', pos_shift_opened: 'Quart de caisse ouvert', pos_shift_closed: 'Quart de caisse fermé', pos_stock_low: 'Stock faible', pos_purchase_pending: 'Achat en attente', sales_quote_follow_up: 'Suivi de soumission', sales_order_ready: 'Commande prête', sales_invoice_overdue: 'Facture en retard', sales_customer_activity: 'Activité client',
  },
  pt: {
    general: 'Nova notificação', urgent: 'Comunicado urgente', reminder: 'Lembrete', celebration: 'Nova conquista', task_assigned: 'Tarefa atribuída', task_reassigned: 'Tarefa reatribuída', task_due_today: 'Tarefa vence hoje', task_overdue: 'Tarefa atrasada', task_pending_audit: 'Tarefa aguardando revisão', task_audited: 'Tarefa revisada', expense_submitted: 'Despesa enviada', expense_pending_approval: 'Despesa aguardando aprovação', expense_due: 'Pagamento de despesa pendente', expense_paid: 'Despesa paga', pos_shift_opened: 'Turno de caixa aberto', pos_shift_closed: 'Turno de caixa fechado', pos_stock_low: 'Estoque baixo', pos_purchase_pending: 'Compra pendente', sales_quote_follow_up: 'Acompanhamento de cotação', sales_order_ready: 'Pedido pronto', sales_invoice_overdue: 'Fatura vencida', sales_customer_activity: 'Atividade do cliente',
  },
  ko: {
    general: '새 알림', urgent: '긴급 공지', reminder: '알림', celebration: '새 성과', task_assigned: '작업 배정됨', task_reassigned: '작업 재배정됨', task_due_today: '오늘 마감 작업', task_overdue: '기한이 지난 작업', task_pending_audit: '검토 대기 작업', task_audited: '검토된 작업', expense_submitted: '비용 제출됨', expense_pending_approval: '승인 대기 비용', expense_due: '비용 지급 기한', expense_paid: '비용 지급 완료', pos_shift_opened: 'POS 근무 시작', pos_shift_closed: 'POS 근무 종료', pos_stock_low: '재고 부족', pos_purchase_pending: '구매 대기', sales_quote_follow_up: '견적 후속 조치', sales_order_ready: '판매 주문 준비 완료', sales_invoice_overdue: '기한이 지난 송장', sales_customer_activity: '고객 활동',
  },
  zh: {
    general: '新通知', urgent: '紧急公告', reminder: '提醒', celebration: '新成就', task_assigned: '已分配任务', task_reassigned: '已重新分配任务', task_due_today: '任务今日到期', task_overdue: '任务已逾期', task_pending_audit: '任务待审核', task_audited: '任务已审核', expense_submitted: '费用已提交', expense_pending_approval: '费用待批准', expense_due: '费用付款到期', expense_paid: '费用已支付', pos_shift_opened: 'POS 班次已开始', pos_shift_closed: 'POS 班次已结束', pos_stock_low: '库存不足', pos_purchase_pending: '采购待处理', sales_quote_follow_up: '报价跟进', sales_order_ready: '销售订单已就绪', sales_invoice_overdue: '发票已逾期', sales_customer_activity: '客户动态',
  },
} as const;

const spanishModuleLabels: Record<string, { label: string; shortLabel: string }> = {
  human_resources: { label: 'Recursos Humanos', shortLabel: 'RH' },
  processes_tasks: { label: 'Procesos y tareas', shortLabel: 'Tareas' },
  finance: { label: 'Finanzas', shortLabel: 'Finanzas' },
  expenses: { label: 'Gastos', shortLabel: 'Gastos' },
  sales: { label: 'Ventas', shortLabel: 'Ventas' },
  point_of_sale: { label: 'Punto de venta', shortLabel: 'PDV' },
};

const localizedModuleLabels: Record<string, Record<string, { label: string; shortLabel: string }>> = {
  es: spanishModuleLabels,
  fr: { human_resources: { label: 'Ressources humaines', shortLabel: 'RH' }, processes_tasks: { label: 'Processus et tâches', shortLabel: 'Tâches' }, finance: { label: 'Finances', shortLabel: 'Finances' }, expenses: { label: 'Dépenses', shortLabel: 'Dépenses' }, sales: { label: 'Ventes', shortLabel: 'Ventes' }, point_of_sale: { label: 'Point de vente', shortLabel: 'PDV' } },
  pt: { human_resources: { label: 'Recursos Humanos', shortLabel: 'RH' }, processes_tasks: { label: 'Processos e tarefas', shortLabel: 'Tarefas' }, finance: { label: 'Finanças', shortLabel: 'Finanças' }, expenses: { label: 'Despesas', shortLabel: 'Despesas' }, sales: { label: 'Vendas', shortLabel: 'Vendas' }, point_of_sale: { label: 'Ponto de venda', shortLabel: 'PDV' } },
  ko: { human_resources: { label: '인사 관리', shortLabel: '인사' }, processes_tasks: { label: '프로세스 및 작업', shortLabel: '작업' }, finance: { label: '재무', shortLabel: '재무' }, expenses: { label: '비용', shortLabel: '비용' }, sales: { label: '영업', shortLabel: '영업' }, point_of_sale: { label: '판매 시점', shortLabel: 'POS' } },
  zh: { human_resources: { label: '人力资源', shortLabel: '人力' }, processes_tasks: { label: '流程和任务', shortLabel: '任务' }, finance: { label: '财务', shortLabel: '财务' }, expenses: { label: '费用', shortLabel: '费用' }, sales: { label: '销售', shortLabel: '销售' }, point_of_sale: { label: '销售点', shortLabel: 'POS' } },
};

function notificationLanguage(locale: string): keyof typeof notificationTitles {
  if (locale.startsWith('es')) return 'es';
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('pt')) return 'pt';
  if (locale.startsWith('ko')) return 'ko';
  if (locale.startsWith('zh')) return 'zh';
  return 'en';
}

const spanishPreferenceDescriptions: Record<string, string> = {
  general: 'Comunicados dirigidos a la empresa, unidad, departamento o colaborador.',
  urgent: 'Comunicaciones críticas de RH que requieren revisión inmediata.',
  reminder: 'Recordatorios de asistencia, expedientes, nómina o documentos.',
  task_assigned: 'Se te asignó una nueva tarea.',
  task_reassigned: 'Cambió la responsabilidad de una tarea que debes seguir.',
  task_due_today: 'Una tarea llega hoy a su fecha de vencimiento.',
  task_overdue: 'Una tarea superó su fecha de vencimiento y requiere atención.',
  task_pending_audit: 'Una tarea completada está esperando revisión o auditoría.',
  task_audited: 'La persona responsable revisó y cerró una tarea.',
  expense_submitted: 'Un colaborador envió un gasto para revisión.',
  expense_pending_approval: 'Un gasto requiere aprobación antes de pagarse.',
  expense_due: 'Un gasto por pagar alcanza su fecha de vencimiento.',
  expense_paid: 'Un gasto fue pagado y cerrado.',
  pos_shift_opened: 'Una persona abrió un turno de punto de venta.',
  pos_shift_closed: 'Un turno de punto de venta fue cerrado y está listo para revisión.',
  pos_stock_low: 'Un producto o almacén necesita reabastecimiento.',
  pos_purchase_pending: 'Una orden de compra o factura de proveedor requiere atención.',
  sales_quote_follow_up: 'Una cotización necesita seguimiento antes de perder vigencia.',
  sales_order_ready: 'Un pedido está listo para el siguiente paso operativo.',
  sales_invoice_overdue: 'Una factura de cliente está vencida.',
  sales_customer_activity: 'Se registró actividad comercial relevante de un cliente.',
};

const preferenceDescriptionFallbacks: Partial<Record<keyof typeof notificationTitles, string>> = {
  fr: 'Consultez cet événement et effectuez l’action opérationnelle requise.',
  pt: 'Revise este evento e realize a ação operacional necessária.',
  ko: '이 이벤트를 확인하고 필요한 운영 조치를 수행하세요.',
  zh: '请查看此事件并完成所需的运营操作。',
};

export function localizeNotificationModule(moduleMeta: NotificationModuleMeta, locale: string) {
  const localizedLabels = localizedModuleLabels[notificationLanguage(locale)]?.[moduleMeta.slug];
  return localizedLabels ? { ...moduleMeta, ...localizedLabels } : moduleMeta;
}

export function getLocalizedNotificationPreferenceGroups(locale: string): NotificationPreferenceGroup[] {
  const language = notificationLanguage(locale);

  return notificationPreferenceGroups.map((group) => ({
    module: localizeNotificationModule(group.module, locale),
    items: group.items.map((item) => ({
      ...item,
      label: notificationTitles[language][item.eventType as keyof typeof notificationTitles.en] ?? item.label,
      description: language === 'es'
        ? spanishPreferenceDescriptions[item.eventType] ?? item.description
        : preferenceDescriptionFallbacks[language] ?? item.description,
    })),
  }));
}

export function getNotificationDisplayTitle(notification: AppNotification, locale: string) {
  const language = notificationLanguage(locale);
  const subtype = notification.source_subtype as keyof typeof notificationTitles.en;
  const catalogTitle = notificationTitles[language][subtype];

  if (catalogTitle) {
    return catalogTitle;
  }

  return notification.title
    .replace(/\s*:\s*[A-Z]{1,12}-[A-Z0-9-]+\s*$/i, '')
    .trim() || notificationTitles[language].general;
}

export function getNotificationPriority(notification: AppNotification): NotificationPriority {
  const subtype = notification.source_subtype;
  if (subtype === 'urgent' || subtype === 'task_overdue') {
    return 'high';
  }
  if (subtype.includes('overdue') || subtype.includes('due') || subtype.includes('low')) {
    return 'high';
  }
  if (subtype === 'celebration' || subtype === 'task_audited' || subtype.includes('paid')) {
    return 'low';
  }
  return 'medium';
}

export function isActionableNotification(notification: AppNotification) {
  return getNotificationPriority(notification) !== 'low' || notification.is_unread;
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}
