import type { OperationalActivity } from '../components/OperationalActivityFeed';

export function buildInitialActivities(): OperationalActivity[] {
  const now = Date.now();

  return [
    {
      id: 'activity-sale-completed',
      type: 'sale',
      title: 'Venta completada',
      description: 'Ticket de mostrador cobrado con pago mixto',
      timestamp: new Date(now - 5 * 60 * 1000),
      actor: 'Ana POS',
      badge: '$1,250',
      tone: 'success',
    },
    {
      id: 'activity-shift-opened',
      type: 'shift',
      title: 'Turno abierto',
      description: 'Juan abrio la caja 01',
      timestamp: new Date(now - 18 * 60 * 1000),
      actor: 'Juan',
      badge: 'Caja 01',
      tone: 'info',
    },
    {
      id: 'activity-low-stock',
      type: 'stock',
      title: 'Stock bajo detectado',
      description: 'Punto de reorden alcanzado en productos rapidos',
      timestamp: new Date(now - 31 * 60 * 1000),
      actor: 'Sistema',
      badge: 'Stock',
      tone: 'warning',
    },
    {
      id: 'activity-return-processed',
      type: 'return',
      title: 'Devolucion procesada',
      description: 'Devolucion parcial autorizada por supervisor',
      timestamp: new Date(now - 56 * 60 * 1000),
      actor: 'Supervisor',
      badge: 'Devolucion',
      tone: 'danger',
    },
  ];
}
