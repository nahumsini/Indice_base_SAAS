import type { AppNotification } from '../../api/notifications';

export const getNotificationStyle = (notification: AppNotification) => {
  switch (notification.source_subtype) {
    case 'urgent':
      return {
        emoji: '!',
        color: 'red',
        priority: 'high',
        type: 'alert',
      };
    case 'reminder':
      return {
        emoji: 'i',
        color: 'blue',
        priority: 'medium',
        type: 'info',
      };
    case 'celebration':
      return {
        emoji: '*',
        color: 'gold',
        priority: 'low',
        type: 'info',
      };
    case 'task_assigned':
    case 'task_reassigned':
      return {
        emoji: '+',
        color: 'yellow',
        priority: 'medium',
        type: 'info',
      };
    case 'task_due_today':
      return {
        emoji: '!',
        color: 'yellow',
        priority: 'medium',
        type: 'alert',
      };
    case 'task_overdue':
    case 'expense_due':
    case 'expense_pending_approval':
    case 'pos_stock_low':
    case 'sales_invoice_overdue':
      return {
        emoji: '!',
        color: 'red',
        priority: 'high',
        type: 'alert',
      };
    case 'task_pending_audit':
    case 'expense_submitted':
    case 'pos_purchase_pending':
    case 'sales_quote_follow_up':
    case 'sales_order_ready':
      return {
        emoji: '?',
        color: 'blue',
        priority: 'medium',
        type: 'info',
      };
    case 'task_audited':
    case 'expense_paid':
    case 'pos_shift_opened':
    case 'pos_shift_closed':
    case 'sales_customer_activity':
      return {
        emoji: 'ok',
        color: 'green',
        priority: 'low',
        type: 'info',
      };
    default:
      return {
        emoji: 'i',
        color: 'blue',
        priority: 'medium',
        type: 'info',
      };
  }
};

export const getModuleColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-[#2563EB]/10 dark:bg-[#2563EB]/20', text: 'text-[#2563EB] dark:text-[#93C5FD]', border: 'border-[#2563EB]/25 dark:border-[#2563EB]/35' },
    coral: { bg: 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20', text: 'text-[#B63B32] dark:text-[#FFB0AA]', border: 'border-[#FF6B5E]/25 dark:border-[#FF6B5E]/35' },
    yellow: { bg: 'bg-[#F4C84A]/15 dark:bg-[#F4C84A]/20', text: 'text-[#9A6B05] dark:text-[#FEF3C7]', border: 'border-[#F4C84A]/35 dark:border-[#F4C84A]/40' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
    orange: { bg: 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20', text: 'text-[#B63B32] dark:text-[#FFB0AA]', border: 'border-[#FF6B5E]/25 dark:border-[#FF6B5E]/35' },
    gold: { bg: 'bg-[#F4C84A]/15 dark:bg-[#F4C84A]/20', text: 'text-[#9A6B05] dark:text-[#FEF3C7]', border: 'border-[#F4C84A]/35 dark:border-[#F4C84A]/40' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  };
  return colorMap[color] || colorMap.blue;
};
