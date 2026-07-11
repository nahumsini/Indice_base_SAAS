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
} as const;

const spanishModuleLabels: Record<string, { label: string; shortLabel: string }> = {
  human_resources: { label: 'Recursos Humanos', shortLabel: 'RH' },
  processes_tasks: { label: 'Procesos y tareas', shortLabel: 'Tareas' },
  finance: { label: 'Finanzas', shortLabel: 'Finanzas' },
  expenses: { label: 'Gastos', shortLabel: 'Gastos' },
  sales: { label: 'Ventas', shortLabel: 'Ventas' },
  point_of_sale: { label: 'Punto de venta', shortLabel: 'PDV' },
};

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

export function localizeNotificationModule(moduleMeta: NotificationModuleMeta, locale: string) {
  if (!locale.toLowerCase().startsWith('es')) {
    return moduleMeta;
  }

  const localizedLabels = spanishModuleLabels[moduleMeta.slug];
  return localizedLabels ? { ...moduleMeta, ...localizedLabels } : moduleMeta;
}

export function getLocalizedNotificationPreferenceGroups(locale: string): NotificationPreferenceGroup[] {
  if (!locale.toLowerCase().startsWith('es')) {
    return notificationPreferenceGroups;
  }

  return notificationPreferenceGroups.map((group) => ({
    module: localizeNotificationModule(group.module, locale),
    items: group.items.map((item) => ({
      ...item,
      label: notificationTitles.es[item.eventType as keyof typeof notificationTitles.es] ?? item.label,
      description: spanishPreferenceDescriptions[item.eventType] ?? item.description,
    })),
  }));
}

export function getNotificationDisplayTitle(notification: AppNotification, locale: string) {
  const language = locale.toLowerCase().startsWith('es') ? 'es' : 'en';
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
