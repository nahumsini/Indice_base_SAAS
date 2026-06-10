import type { CashRegisterContext } from '../types';

export function formatCashRegisterLabel(context: CashRegisterContext) {
  return `${context.cashRegisterCode} · ${context.cashRegisterName}`;
}
