import type {
  CandidateSale,
  CreditPolicy,
  CreditSale,
  CreditSaleStatus,
  CreditSimulation,
  PeriodFilter,
  ReceivableAccount,
  ReceivableInstallment,
  ReceivablePayment,
  ReceivableStatus,
} from './types';

const dayMs = 24 * 60 * 60 * 1000;

export const formatMoney = (amount: number, currency = 'MXN') => (
  new Intl.NumberFormat('es-MX', {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount)
);

export const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
};

export const addMonths = (date: string, months: number) => {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate.toISOString().slice(0, 10);
};

export const getDaysUntil = (date: string) => {
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  const target = new Date(`${date}T00:00:00`).getTime();
  return Math.ceil((target - today) / dayMs);
};

export const resolveReceivableStatus = (
  account: Pick<ReceivableAccount, 'balance' | 'dueDate' | 'status'>,
): ReceivableStatus => {
  if (account.balance <= 0) {
    return 'paid';
  }

  if (account.status === 'restructured') {
    return 'restructured';
  }

  const daysUntilDue = getDaysUntil(account.dueDate);
  if (daysUntilDue < 0) {
    return 'overdue';
  }
  if (daysUntilDue <= 7) {
    return 'due_soon';
  }

  return 'on_time';
};

export const resolveInstallmentStatus = (
  installment: Pick<ReceivableInstallment, 'balance' | 'dueDate' | 'paidAmount' | 'status'>,
): ReceivableStatus => {
  if (installment.balance <= 0) {
    return 'paid';
  }

  if (installment.status === 'cancelled') {
    return 'cancelled';
  }

  const daysUntilDue = getDaysUntil(installment.dueDate);
  if (daysUntilDue < 0) {
    return 'overdue';
  }
  if (installment.paidAmount > 0) {
    return 'partial';
  }
  if (daysUntilDue <= 7) {
    return 'due_soon';
  }

  return 'on_time';
};

export const statusLabels: Record<CreditSaleStatus | ReceivableStatus, string> = {
  active: 'Activa',
  approved: 'Aprobada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  draft: 'Borrador',
  due_soon: 'Por vencer',
  on_time: 'A tiempo',
  overdue: 'Vencida',
  partial: 'Parcial',
  paid: 'Pagada',
  rejected: 'Rechazada',
  restructured: 'Reestructurada',
  simulated: 'Simulada',
};

export const statusClasses: Record<CreditSaleStatus | ReceivableStatus, string> = {
  active: 'border-[#147514]/20 bg-[#147514]/10 text-[#147514]',
  approved: 'border-lime-200 bg-lime-50 text-lime-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-500',
  completed: 'border-slate-200 bg-slate-50 text-slate-600',
  draft: 'border-slate-200 bg-slate-50 text-slate-500',
  due_soon: 'border-amber-200 bg-amber-50 text-amber-700',
  on_time: 'border-[#147514]/20 bg-[#147514]/10 text-[#147514]',
  overdue: 'border-red-200 bg-red-50 text-red-700',
  partial: 'border-sky-200 bg-sky-50 text-sky-700',
  paid: 'border-slate-200 bg-slate-50 text-slate-600',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  restructured: 'border-blue-200 bg-blue-50 text-blue-700',
  simulated: 'border-teal-200 bg-teal-50 text-teal-700',
};

export const buildCompoundSimulations = ({
  amount,
  annualInterestRate,
  termMonths,
}: {
  amount: number;
  annualInterestRate: number;
  termMonths: number;
}): CreditSimulation[] => {
  const variants = [
    { id: 'balanced', name: 'Balanceada', monthsFactor: 1, rateDelta: 0 },
    { id: 'accelerated', name: 'Acelerada', monthsFactor: 0.75, rateDelta: -1.5 },
    { id: 'extended', name: 'Extendida', monthsFactor: 1.25, rateDelta: 1.25 },
  ];

  return variants.map((variant) => {
    const months = Math.max(1, Math.round(termMonths * variant.monthsFactor));
    const annualRate = Math.max(0, annualInterestRate + variant.rateDelta);
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = monthlyRate === 0
      ? amount / months
      : amount * ((monthlyRate * ((1 + monthlyRate) ** months)) / (((1 + monthlyRate) ** months) - 1));
    const totalPayable = monthlyPayment * months;

    return {
      id: variant.id,
      name: variant.name,
      termMonths: months,
      annualInterestRate: annualRate,
      monthlyPayment: Number(monthlyPayment.toFixed(2)),
      totalPayable: Number(totalPayable.toFixed(2)),
      totalInterest: Number((totalPayable - amount).toFixed(2)),
    };
  });
};

export const matchesPeriod = (date: string, period: PeriodFilter) => {
  if (period === 'all') {
    return true;
  }

  const current = new Date(`${todayIso()}T00:00:00`);
  const value = new Date(`${date}T00:00:00`);

  if (period === 'today') {
    return date === todayIso();
  }

  if (period === 'this_week') {
    const start = new Date(current);
    start.setDate(current.getDate() - current.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return value >= start && value <= end;
  }

  if (period === 'this_month') {
    return value.getFullYear() === current.getFullYear() && value.getMonth() === current.getMonth();
  }

  const lastMonth = new Date(current);
  lastMonth.setMonth(current.getMonth() - 1);
  return value.getFullYear() === lastMonth.getFullYear() && value.getMonth() === lastMonth.getMonth();
};

export const textMatch = (value: string, query: string) => (
  value.toLowerCase().includes(query.trim().toLowerCase())
);

export function getOptionsFromRows<Row>(rows: Row[], accessor: (row: Row) => string) {
  return Array.from(new Set(rows.map(accessor).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export function numericId(value?: string | number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export const createReceivableFromCreditSale = (sale: CreditSale): ReceivableAccount => {
  const dueDate = addMonths(sale.firstDueDate, Math.max(0, sale.selectedSimulation.termMonths - 1));

  return {
    id: `ar-${sale.id}`,
    creditSaleId: sale.id,
    saleNumber: sale.saleNumber,
    customerId: sale.customerId,
    customerName: sale.customerName,
    unit: sale.unit,
    business: sale.business,
    currency: sale.currency,
    originalAmount: sale.financedAmount,
    totalPayable: sale.selectedSimulation.totalPayable,
    paidAmount: 0,
    balance: sale.selectedSimulation.totalPayable,
    dueDate,
    nextPaymentDate: sale.firstDueDate,
    installmentAmount: sale.selectedSimulation.monthlyPayment,
    termMonths: sale.selectedSimulation.termMonths,
    annualInterestRate: sale.selectedSimulation.annualInterestRate,
    status: 'on_time',
  };
};

export const createInstallmentsFromCreditSale = (
  sale: CreditSale,
  account: ReceivableAccount,
): ReceivableInstallment[] => {
  const installments: ReceivableInstallment[] = [];
  let remaining = account.totalPayable;

  for (let index = 1; index <= sale.selectedSimulation.termMonths && remaining > 0; index += 1) {
    const amount = Number((
      index === sale.selectedSimulation.termMonths
        ? remaining
        : Math.min(sale.selectedSimulation.monthlyPayment, remaining)
    ).toFixed(2));

    if (amount <= 0) {
      break;
    }

    const installment: ReceivableInstallment = {
      id: `${account.id}-installment-${index}`,
      receivableId: account.id,
      creditSaleId: account.creditSaleId,
      installmentNumber: index,
      saleNumber: account.saleNumber,
      customerName: account.customerName,
      unit: account.unit,
      business: account.business,
      dueDate: addMonths(sale.firstDueDate, index - 1),
      amount,
      paidAmount: 0,
      balance: amount,
      currency: account.currency,
      status: 'on_time',
    };

    installments.push({
      ...installment,
      status: resolveInstallmentStatus(installment),
    });
    remaining = Math.max(0, Number((remaining - amount).toFixed(2)));
  }

  return installments;
};

export const applyPaymentToAccounts = (
  accounts: ReceivableAccount[],
  payment: ReceivablePayment,
) => accounts.map((account) => {
  if (account.id !== payment.receivableId) {
    return {
      ...account,
      status: resolveReceivableStatus(account),
    };
  }

  const paidAmount = Number((account.paidAmount + payment.amount).toFixed(2));
  const balance = Math.max(0, Number((account.totalPayable - paidAmount).toFixed(2)));
  const nextPaymentDate = balance === 0 ? account.dueDate : addMonths(account.nextPaymentDate, 1);
  const updated = {
    ...account,
    paidAmount,
    balance,
    nextPaymentDate,
  };

  return {
    ...updated,
    status: resolveReceivableStatus(updated),
  };
});

export const applyPaymentToInstallments = (
  installments: ReceivableInstallment[],
  payment: ReceivablePayment,
) => {
  let remaining = payment.amount;

  return installments.map((installment) => {
    if (installment.receivableId !== payment.receivableId || remaining <= 0 || installment.balance <= 0) {
      return {
        ...installment,
        status: resolveInstallmentStatus(installment),
      };
    }

    const applied = Math.min(installment.balance, remaining);
    remaining = Number((remaining - applied).toFixed(2));
    const paidAmount = Number((installment.paidAmount + applied).toFixed(2));
    const balance = Math.max(0, Number((installment.amount - paidAmount).toFixed(2)));
    const updated = {
      ...installment,
      paidAmount,
      balance,
    };

    return {
      ...updated,
      status: resolveInstallmentStatus(updated),
    };
  });
};

export const resolveCreditDefaults = (
  candidate: CandidateSale | null,
  policies: CreditPolicy[],
) => {
  const policy = candidate
    ? policies.find((item) => item.customerId === candidate.customerId)
    : undefined;

  return {
    annualInterestRate: policy?.annualInterestRate ?? 24,
    termMonths: policy?.defaultTermMonths ?? 6,
  };
};
