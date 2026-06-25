export type CortesColumnId =
  | 'folio'
  | 'closedAt'
  | 'context'
  | 'cashRegister'
  | 'cashier'
  | 'shift'
  | 'tickets'
  | 'totalSales'
  | 'expected'
  | 'counted'
  | 'difference'
  | 'status';

export const cortesColumnLabels: Record<CortesColumnId, string> = {
  cashier: 'Cajero',
  cashRegister: 'Caja',
  closedAt: 'Fecha cierre',
  context: 'Almacén',
  counted: 'Contado',
  difference: 'Diferencia',
  expected: 'Esperado',
  folio: 'Corte',
  shift: 'Turno',
  status: 'Estado',
  tickets: 'Tickets',
  totalSales: 'Ventas',
};

export const defaultCortesColumns: CortesColumnId[] = [
  'folio',
  'closedAt',
  'context',
  'cashRegister',
  'cashier',
  'tickets',
  'totalSales',
  'expected',
  'counted',
  'difference',
  'status',
];

export const cortesColumnOptions = Object.entries(cortesColumnLabels).map(([id, label]) => ({
  id: id as CortesColumnId,
  label,
}));
