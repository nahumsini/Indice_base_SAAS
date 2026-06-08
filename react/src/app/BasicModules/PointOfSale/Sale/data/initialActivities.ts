import type { OperationalActivity } from '../components/OperationalActivityFeed';

export function buildInitialActivities(): OperationalActivity[] {
  const now = Date.now();

  return [
    {
      id: 'activity-sale-completed',
      type: 'sale',
      title: 'Sale completed',
      description: 'Counter ticket collected with mixed payment',
      timestamp: new Date(now - 5 * 60 * 1000),
      actor: 'Ana POS',
      badge: '$1,250',
      tone: 'success',
    },
    {
      id: 'activity-shift-opened',
      type: 'shift',
      title: 'Shift opened',
      description: 'Juan opened register 01',
      timestamp: new Date(now - 18 * 60 * 1000),
      actor: 'Juan',
      badge: 'Register 01',
      tone: 'info',
    },
    {
      id: 'activity-low-stock',
      type: 'stock',
      title: 'Low stock detected',
      description: 'Reorder point reached in quick-sale products',
      timestamp: new Date(now - 31 * 60 * 1000),
      actor: 'System',
      badge: 'Stock',
      tone: 'warning',
    },
    {
      id: 'activity-invoice-generated',
      type: 'invoice',
      title: 'Invoice generated',
      description: 'Customer invoice sent by email',
      timestamp: new Date(now - 44 * 60 * 1000),
      actor: 'Finance',
      badge: 'PDF/XML',
      tone: 'neutral',
    },
    {
      id: 'activity-return-processed',
      type: 'return',
      title: 'Return processed',
      description: 'Partial return authorized by supervisor',
      timestamp: new Date(now - 56 * 60 * 1000),
      actor: 'Supervisor',
      badge: 'Return',
      tone: 'danger',
    },
  ];
}

