import type { ReceivableAccount } from '../../../Receivables/types';
import type {
  SaleNextActionKey,
  SaleReceivableSummary,
  SaleRecord,
} from '../types/salesTypes';
import { isSalesCreditPaymentMethod } from './salesPaymentMethods';

function normalizeReference(value?: string | null) {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function findSaleReceivable(
  record: SaleRecord,
  accounts: ReceivableAccount[],
) {
  return accounts.find((account) => (
    Boolean(record.backendId && account.salesRecordId === record.backendId)
    || normalizeReference(account.saleNumber) === normalizeReference(record.saleNumber)
  ));
}

export function buildSaleReceivableSummary(
  record: SaleRecord,
  accounts: ReceivableAccount[],
): SaleReceivableSummary | undefined {
  const account = findSaleReceivable(record, accounts);
  if (!account) return undefined;

  return {
    accountId: account.id,
    paidAmount: account.paidAmount,
    balance: account.balance,
    currency: account.currency,
    dueDate: account.dueDate,
    nextPaymentDate: account.nextPaymentDate,
    status: account.status,
  };
}

export function getSaleNextActionKey(
  record: SaleRecord,
  receivable?: SaleReceivableSummary,
): SaleNextActionKey {
  if (record.commercialStatus === 'cancelled') return 'cancelled';
  if (record.commercialStatus === 'rejected') return 'resolveCommercial';
  if (record.commercialStatus === 'pending_validation') return 'validateCommercial';

  if (isSalesCreditPaymentMethod(record.paymentMethod) && !receivable) {
    return 'createReceivable';
  }

  if (receivable?.balance && ['overdue', 'due_soon', 'partial'].includes(receivable.status)) {
    return 'collectBalance';
  }
  // POS owns stock and payment execution; do not suggest repeating them from CRM.
  if (record.sourceType === 'POS') return (receivable?.balance ?? 0) > 0 ? 'collectBalance' : 'completed';

  if (record.financeStatus === 'rejected' || record.paymentEvidenceStatus === 'rejected') {
    return 'resolveFinance';
  }

  if (
    record.financeStatus !== 'approved'
    && !isSalesCreditPaymentMethod(record.paymentMethod)
    && record.paymentEvidenceStatus === 'missing'
  ) {
    return 'uploadEvidence';
  }

  if (record.financeStatus === 'pending') return 'validatePayment';
  if (record.inventoryStatus === 'unavailable') return 'resolveInventory';
  if (record.inventoryMovementStatus === 'not_generated') return 'prepareInventory';

  if (
    record.inventoryMovementStatus === 'pending'
    || record.inventoryStatus === 'pending'
  ) {
    return 'validateInventory';
  }

  if (record.deliveryStatus === 'pending') return 'startDelivery';
  if (record.deliveryStatus === 'in_progress') return 'completeDelivery';
  if ((receivable?.balance ?? 0) > 0) return 'collectBalance';
  return 'completed';
}

export function getSaleNextActionPriority(key: SaleNextActionKey) {
  const priorities: Record<SaleNextActionKey, number> = {
    resolveCommercial: 1,
    validateCommercial: 2,
    resolveFinance: 3,
    createReceivable: 4,
    collectBalance: 5,
    uploadEvidence: 6,
    validatePayment: 7,
    resolveInventory: 8,
    prepareInventory: 9,
    validateInventory: 10,
    startDelivery: 11,
    completeDelivery: 12,
    completed: 13,
    cancelled: 14,
  };

  return priorities[key];
}
