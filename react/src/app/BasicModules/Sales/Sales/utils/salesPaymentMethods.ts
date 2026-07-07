export const salesPaymentMethodIds = [
  'cash',
  'card',
  'transfer',
  'wallet',
  'check',
  'credit',
] as const;

export type SalesPaymentMethodId = typeof salesPaymentMethodIds[number];

const aliases: Record<string, SalesPaymentMethodId> = {
  cash: 'cash',
  efectivo: 'cash',
  card: 'card',
  tarjeta: 'card',
  creditcard: 'card',
  credit_card: 'card',
  debitcard: 'card',
  debit_card: 'card',
  transfer: 'transfer',
  transferencia: 'transfer',
  banktransfer: 'transfer',
  bank_transfer: 'transfer',
  wiretransfer: 'transfer',
  wire_transfer: 'transfer',
  wallet: 'wallet',
  billetera: 'wallet',
  digitalwallet: 'wallet',
  digital_wallet: 'wallet',
  check: 'check',
  cheque: 'check',
  credit: 'credit',
  credito: 'credit',
  credito_cliente: 'credit',
  customer_credit: 'credit',
};

function cleanPaymentMethod(value?: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeSalesPaymentMethod(value?: string | null): SalesPaymentMethodId | '' {
  const cleaned = cleanPaymentMethod(value);
  return aliases[cleaned] ?? '';
}

export function isSalesCreditPaymentMethod(value?: string | null) {
  return normalizeSalesPaymentMethod(value) === 'credit';
}

export function getSalesPaymentMethodForStorage(value?: string | null) {
  return normalizeSalesPaymentMethod(value) || (value ?? '').trim();
}
