import type { PaymentAccount, PaymentSortField } from './types';

export type PaymentColumnKey = keyof Pick<
  PaymentAccount,
  'accountNumber' | 'balance' | 'bank' | 'businessId' | 'currency' | 'isActive' | 'lastTransaction' | 'name' | 'type' | 'unitId'
>;

export type PaymentColumnConfig = {
  description?: string;
  fixed?: boolean;
  key: PaymentColumnKey;
  label: string;
  sortField: PaymentSortField;
  visible: boolean;
};

export const defaultPaymentColumnWidths: Record<PaymentColumnKey | 'actions', number> = {
  name: 250,
  type: 160,
  unitId: 170,
  businessId: 170,
  bank: 180,
  accountNumber: 170,
  balance: 160,
  currency: 120,
  lastTransaction: 180,
  isActive: 140,
  actions: 170,
};

export const defaultPaymentColumns: PaymentColumnConfig[] = [
  { key: 'name', label: 'Cuenta de pago', description: 'Nombre operativo de la cuenta financiera.', sortField: 'name', visible: true, fixed: true },
  { key: 'type', label: 'Tipo', description: 'Banco, efectivo, tarjeta o billetera.', sortField: 'type', visible: true },
  { key: 'unitId', label: 'Unidad', description: 'Unidad de negocio asignada.', sortField: 'unitId', visible: true },
  { key: 'businessId', label: 'Negocio', description: 'Negocio relacionado dentro de la unidad.', sortField: 'businessId', visible: true },
  { key: 'bank', label: 'Banco/Emisor', description: 'Institución, custodio o emisor.', sortField: 'bank', visible: true },
  { key: 'accountNumber', label: 'Número', description: 'Número o terminación visible.', sortField: 'accountNumber', visible: true },
  { key: 'balance', label: 'Saldo', description: 'Saldo operativo visible.', sortField: 'balance', visible: true },
  { key: 'currency', label: 'Moneda', description: 'Moneda de operación.', sortField: 'currency', visible: true },
  { key: 'lastTransaction', label: 'Última transacción', description: 'Último movimiento registrado.', sortField: 'lastTransaction', visible: true },
  { key: 'isActive', label: 'Estado', description: 'Disponibilidad actual de la cuenta.', sortField: 'isActive', visible: true },
];

export const paymentHeaders = defaultPaymentColumns;
