import type { CandidateSale, CreditPolicy, CreditSale, ReceivablePayment, ReceivablesState } from './types';
import {
  addDays,
  addMonths,
  applyPaymentToInstallments,
  buildCompoundSimulations,
  createInstallmentsFromCreditSale,
  createReceivableFromCreditSale,
  todayIso,
} from './utils';

export const fallbackCandidateSales: CandidateSale[] = [
  {
    id: 'sale-candidate-1',
    saleNumber: 'SAL-2026-0318',
    customerId: 'customer-aurora',
    customerName: 'Aurora Hospitality Group',
    unit: 'Unidad Norte',
    business: 'Hotel Boutique',
    saleDate: addDays(todayIso(), -3),
    amount: 128500,
    currency: 'MXN',
    source: 'sales',
  },
  {
    id: 'sale-candidate-2',
    saleNumber: 'POS-2026-0884',
    customerId: 'customer-costa',
    customerName: 'Costa Verde Operadora',
    unit: 'Unidad Pacifico',
    business: 'Restaurante',
    saleDate: addDays(todayIso(), -1),
    amount: 46200,
    currency: 'MXN',
    source: 'pos',
  },
  {
    id: 'sale-candidate-3',
    saleNumber: 'SAL-2026-0322',
    customerId: 'customer-luna',
    customerName: 'Luna Retail Co.',
    unit: 'Unidad Centro',
    business: 'Tienda',
    saleDate: todayIso(),
    amount: 73500,
    currency: 'MXN',
    source: 'sales',
  },
];

const creditPolicies: CreditPolicy[] = [
  {
    id: 'policy-aurora',
    customerId: 'customer-aurora',
    customerName: 'Aurora Hospitality Group',
    creditLine: 250000,
    monthlyPurchaseLimit: 130000,
    defaultTermMonths: 6,
    annualInterestRate: 22,
    availableCredit: 121500,
    status: 'active',
    unit: 'Unidad Norte',
    business: 'Hotel Boutique',
    notes: 'Cliente con historial estable y pagos por transferencia.',
  },
  {
    id: 'policy-costa',
    customerId: 'customer-costa',
    customerName: 'Costa Verde Operadora',
    creditLine: 90000,
    monthlyPurchaseLimit: 55000,
    defaultTermMonths: 4,
    annualInterestRate: 26,
    availableCredit: 43800,
    status: 'review',
    unit: 'Unidad Pacifico',
    business: 'Restaurante',
    notes: 'Revisar limite si acumula dos periodos vencidos.',
  },
  {
    id: 'policy-luna',
    customerId: 'customer-luna',
    customerName: 'Luna Retail Co.',
    creditLine: 180000,
    monthlyPurchaseLimit: 90000,
    defaultTermMonths: 5,
    annualInterestRate: 24,
    availableCredit: 106500,
    status: 'active',
    unit: 'Unidad Centro',
    business: 'Tienda',
    notes: 'Opera con compras recurrentes y buena rotacion.',
  },
];

const initialSimulation = buildCompoundSimulations({
  amount: fallbackCandidateSales[0].amount,
  annualInterestRate: 22,
  termMonths: 6,
})[0];

const initialCreditSale: CreditSale = {
  id: 'credit-sale-1',
  saleId: fallbackCandidateSales[0].id,
  saleNumber: fallbackCandidateSales[0].saleNumber,
  customerId: fallbackCandidateSales[0].customerId,
  customerName: fallbackCandidateSales[0].customerName,
  unit: fallbackCandidateSales[0].unit,
  business: fallbackCandidateSales[0].business,
  saleDate: fallbackCandidateSales[0].saleDate,
  originalAmount: fallbackCandidateSales[0].amount,
  financedAmount: fallbackCandidateSales[0].amount,
  currency: fallbackCandidateSales[0].currency,
  status: 'active',
  selectedSimulation: initialSimulation,
  firstDueDate: addMonths(todayIso(), 1),
  source: 'sales',
};

const initialReceivable = createReceivableFromCreditSale(initialCreditSale);
const initialInstallments = createInstallmentsFromCreditSale(initialCreditSale, initialReceivable);

const payments: ReceivablePayment[] = [
  {
    id: 'payment-1',
    receivableId: initialReceivable.id,
    saleNumber: initialCreditSale.saleNumber,
    customerName: initialCreditSale.customerName,
    paymentDate: addDays(todayIso(), -1),
    method: 'transfer',
    amount: 18500,
    reference: 'TR-88421',
    registeredBy: 'Finanzas',
  },
];

export const initialReceivablesState: ReceivablesState = {
  creditSales: [initialCreditSale],
  receivables: [{
    ...initialReceivable,
    paidAmount: payments[0].amount,
    balance: Number((initialReceivable.totalPayable - payments[0].amount).toFixed(2)),
  }],
  installments: applyPaymentToInstallments(initialInstallments, payments[0]),
  payments,
  creditPolicies,
};
