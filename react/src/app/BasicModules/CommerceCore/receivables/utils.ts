import type { PointOfSaleCompletion } from '../posSales';
import type {
  ReceivableAccount,
  ReceivableMetrics,
  ReceivablePayment,
  ReceivableStatus,
} from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

function compareIsoDate(left: string, right: string) {
  return left.slice(0, 10).localeCompare(right.slice(0, 10));
}

export function getReceivableStatus(receivable: Pick<ReceivableAccount, 'balance' | 'dueDate' | 'status'>): ReceivableStatus {
  if (receivable.status === 'blocked' || receivable.status === 'written_off') {
    return receivable.status;
  }

  if (receivable.balance <= 0) {
    return 'paid';
  }

  const today = todayIso();
  if (compareIsoDate(receivable.dueDate, today) < 0) {
    return receivable.status === 'partial' ? 'partial' : 'overdue';
  }

  if (compareIsoDate(receivable.dueDate, today) === 0) {
    return 'due_today';
  }

  return receivable.status === 'partial' ? 'partial' : 'current';
}

export function normalizeReceivable(receivable: ReceivableAccount): ReceivableAccount {
  const payments = receivable.payments ?? [];
  const paidAmount = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const originalAmount = Number(receivable.originalAmount) || 0;
  const balance = Math.max(originalAmount - paidAmount, 0);
  const status = getReceivableStatus({
    balance,
    dueDate: receivable.dueDate,
    status: balance > 0 && paidAmount > 0 ? 'partial' : receivable.status,
  });

  return {
    ...receivable,
    originalAmount,
    paidAmount,
    balance,
    currency: receivable.currency || 'MXN',
    issuedAt: receivable.issuedAt || todayIso(),
    dueDate: receivable.dueDate || todayIso(),
    termDays: Number(receivable.termDays) || 0,
    status,
    payments,
    updatedAt: receivable.updatedAt || new Date().toISOString(),
  };
}

export function applyReceivablePayment(
  receivable: ReceivableAccount,
  payment: Omit<ReceivablePayment, 'id'>,
): ReceivableAccount {
  const cappedAmount = Math.min(Math.max(Number(payment.amount) || 0, 0), receivable.balance);
  const nextPayment: ReceivablePayment = {
    ...payment,
    id: `rcv-pay-${Date.now()}`,
    amount: cappedAmount,
  };

  return normalizeReceivable({
    ...receivable,
    payments: [...receivable.payments, nextPayment],
    updatedAt: new Date().toISOString(),
  });
}

export function buildReceivableFromPointOfSale(completion: PointOfSaleCompletion): ReceivableAccount | null {
  const creditPayment = completion.payments.find((payment) => payment.method === 'credit' && payment.creditDetails);
  if (!creditPayment?.creditDetails) {
    return null;
  }

  const details = creditPayment.creditDetails;
  return normalizeReceivable({
    id: `rcv-pos-${completion.saleNumber}`,
    source: 'pos',
    saleNumber: completion.saleNumber,
    customerId: details.customerId,
    customerName: details.customerName,
    businessUnitId: completion.shift.businessUnitId,
    businessUnitName: completion.shift.businessUnitName,
    businessId: completion.shift.businessId,
    businessName: completion.shift.businessName,
    originalAmount: creditPayment.amount,
    paidAmount: 0,
    balance: creditPayment.amount,
    currency: completion.currency,
    issuedAt: new Date().toISOString().slice(0, 10),
    dueDate: details.dueDate,
    termDays: details.termDays,
    creditRuleId: details.ruleId,
    creditRuleName: details.ruleName,
    creditDecision: details.decision,
    status: 'current',
    payments: [],
    notes: `Origen POS · Caja ${completion.shift.cashRegisterCode}`,
    updatedAt: new Date().toISOString(),
  });
}

export function getReceivableMetrics(receivables: ReceivableAccount[]): ReceivableMetrics {
  const normalizedReceivables = receivables.map(normalizeReceivable);
  return normalizedReceivables.reduce<ReceivableMetrics>((metrics, receivable) => {
    const isOpen = receivable.status !== 'paid' && receivable.status !== 'written_off';
    return {
      totalAccounts: metrics.totalAccounts + 1,
      openAccounts: metrics.openAccounts + (isOpen ? 1 : 0),
      overdueAccounts: metrics.overdueAccounts + (receivable.status === 'overdue' ? 1 : 0),
      dueTodayAccounts: metrics.dueTodayAccounts + (receivable.status === 'due_today' ? 1 : 0),
      paidAccounts: metrics.paidAccounts + (receivable.status === 'paid' ? 1 : 0),
      totalOriginal: metrics.totalOriginal + receivable.originalAmount,
      totalBalance: metrics.totalBalance + receivable.balance,
      overdueBalance: metrics.overdueBalance + (receivable.status === 'overdue' ? receivable.balance : 0),
      collectedAmount: metrics.collectedAmount + receivable.paidAmount,
    };
  }, {
    totalAccounts: 0,
    openAccounts: 0,
    overdueAccounts: 0,
    dueTodayAccounts: 0,
    paidAccounts: 0,
    totalOriginal: 0,
    totalBalance: 0,
    overdueBalance: 0,
    collectedAmount: 0,
  });
}
