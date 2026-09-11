export const PETTY_CASH_METHOD_KEYS = {
  CASH: 'CASH',
  EXTERNAL_MEDIA: 'EXTERNAL_MEDIA',
  CHECK: 'CHECK',
  DEBIT_CARD: 'DEBIT_CARD',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  RECEIPT_REPLENISHMENT: 'RECEIPT_REPLENISHMENT',
  REIMBURSABLE_PURCHASE: 'REIMBURSABLE_PURCHASE',
  TRANSFER: 'TRANSFER',
} as const;

export type PettyCashMethodKey = (typeof PETTY_CASH_METHOD_KEYS)[keyof typeof PETTY_CASH_METHOD_KEYS];

export const pettyCashFundingMethodOptions: PettyCashMethodKey[] = [
  PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER,
  PETTY_CASH_METHOD_KEYS.CASH,
  PETTY_CASH_METHOD_KEYS.CHECK,
  PETTY_CASH_METHOD_KEYS.RECEIPT_REPLENISHMENT,
];

export const pettyCashSpendingMethodOptions: PettyCashMethodKey[] = [
  PETTY_CASH_METHOD_KEYS.CASH,
  PETTY_CASH_METHOD_KEYS.DEBIT_CARD,
  PETTY_CASH_METHOD_KEYS.TRANSFER,
  PETTY_CASH_METHOD_KEYS.REIMBURSABLE_PURCHASE,
];

const legacyMethodAliases: Record<string, PettyCashMethodKey> = {
  'Cheque': PETTY_CASH_METHOD_KEYS.CHECK,
  'Compra reembolsable': PETTY_CASH_METHOD_KEYS.REIMBURSABLE_PURCHASE,
  'Efectivo': PETTY_CASH_METHOD_KEYS.CASH,
  'Reposicion contra comprobantes': PETTY_CASH_METHOD_KEYS.RECEIPT_REPLENISHMENT,
  'Reposición contra comprobantes': PETTY_CASH_METHOD_KEYS.RECEIPT_REPLENISHMENT,
  'Tarjeta de debito': PETTY_CASH_METHOD_KEYS.DEBIT_CARD,
  'Tarjeta de débito': PETTY_CASH_METHOD_KEYS.DEBIT_CARD,
  'Transferencia': PETTY_CASH_METHOD_KEYS.TRANSFER,
  'Transferencia interna': PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER,
};

export function normalizePettyCashMethod(value: string): string {
  return legacyMethodAliases[value] ?? value;
}

export function normalizePettyCashMethods(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizePettyCashMethod)));
}

export function getPettyCashMethodLabel(labels: Record<string, string>, value: string): string {
  const normalizedValue = normalizePettyCashMethod(value);
  return labels[normalizedValue] ?? value;
}
