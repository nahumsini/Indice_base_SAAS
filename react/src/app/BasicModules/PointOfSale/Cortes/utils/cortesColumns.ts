export type CortesColumnId =
  | 'folio'
  | 'closedAt'
  | 'context'
  | 'cashRegister'
  | 'cashier'
  | 'tickets'
  | 'totalSales'
  | 'cash'
  | 'card'
  | 'transfer'
  | 'credit';

export const cortesColumnLabels: Record<CortesColumnId, string> = {
  cashier: 'Cajero',
  card: 'Tarjeta',
  cashRegister: 'Caja',
  cash: 'Efectivo',
  closedAt: 'Fecha cierre',
  context: 'Almacén',
  credit: 'Crédito',
  folio: 'Corte',
  tickets: 'Tickets',
  totalSales: 'Ventas',
  transfer: 'Transferencia',
};

export const defaultCortesColumns: CortesColumnId[] = [
  'folio',
  'closedAt',
  'context',
  'cashRegister',
  'cashier',
  'tickets',
  'totalSales',
  'cash',
  'card',
  'transfer',
  'credit',
];

export const cortesColumnOptions = Object.entries(cortesColumnLabels).map(([id, label]) => ({
  id: id as CortesColumnId,
  label,
}));
