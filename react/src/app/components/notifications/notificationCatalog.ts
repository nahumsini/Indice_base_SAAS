import type { AppNotification } from '../../api/notifications';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface NotificationModuleMeta {
  slug: string;
  label: string;
  shortLabel: string;
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
    color: 'green',
  },
  processes_tasks: {
    slug: 'processes_tasks',
    label: 'Processes & Tasks',
    shortLabel: 'Tasks',
    color: 'yellow',
  },
  finance: {
    slug: 'finance',
    label: 'Finance',
    shortLabel: 'Finance',
    color: 'blue',
  },
  expenses: {
    slug: 'expenses',
    label: 'Expenses',
    shortLabel: 'Expenses',
    color: 'coral',
  },
  sales: {
    slug: 'sales',
    label: 'Sales',
    shortLabel: 'Sales',
    color: 'coral',
  },
  point_of_sale: {
    slug: 'point_of_sale',
    label: 'Point of Sale',
    shortLabel: 'POS',
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

export function getNotificationModule(notification: AppNotification): NotificationModuleMeta {
  return moduleCatalog[notification.module_slug] ?? {
    slug: notification.module_slug || 'general',
    label: titleCase((notification.module_slug || 'general').replace(/_/g, ' ')),
    shortLabel: titleCase((notification.module_slug || 'General').replace(/_/g, ' ')),
    color: 'gray',
  };
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
