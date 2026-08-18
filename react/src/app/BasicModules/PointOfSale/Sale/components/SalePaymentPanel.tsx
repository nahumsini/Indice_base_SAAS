import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, Banknote, Check, ChevronDown, ChevronUp, Coins, CreditCard, Eye, Landmark, Monitor, Pause, ReceiptText, RotateCcw, Trash2 } from 'lucide-react';
import { evaluateCreditPurchase, findCreditRuleForCustomer, type CreditRule } from '../../shared/commercial/credit';
import type { Customer } from '../../shared/commercial/customers';
import type { OperationalActivity } from './OperationalActivityFeed';
import { OperationalActivityFeed } from './OperationalActivityFeed';
import type { SuspendedSale } from './SuspendedSalesPanel';
import { TouchCheckoutModal } from './TouchCheckoutModal';
import type { CreditPaymentDetails, Payment, PaymentMethod, PaymentPreview } from '../types/sale.types';
import type { SaleTotals } from '../utils/saleCalculations';
import mxn20Banknote from '../../../../../assets/pos/cash/mxn-20-sample.jpg';
import mxn50Banknote from '../../../../../assets/pos/cash/mxn-50-sample.jpg';
import mxn100Banknote from '../../../../../assets/pos/cash/mxn-100-sample.jpg';
import mxn200Banknote from '../../../../../assets/pos/cash/mxn-200-sample.jpg';
import mxn500Banknote from '../../../../../assets/pos/cash/mxn-500-sample.jpg';
import mxn1000Banknote from '../../../../../assets/pos/cash/mxn-1000-sample.jpg';

const quantityOptions = [1, 2, 3, 5, 10];
const workspacePaymentMethods: Array<{ method: PaymentMethod; label: string; icon: ReactNode }> = [
  { method: 'cash', label: 'Efectivo', icon: <Banknote className="h-5 w-5" /> },
  { method: 'card', label: 'Tarjeta', icon: <CreditCard className="h-5 w-5" /> },
  { method: 'transfer', label: 'Transferencia', icon: <Landmark className="h-5 w-5" /> },
  { method: 'credit', label: 'Crédito', icon: <ReceiptText className="h-5 w-5" /> },
];

type CashDenomination = {
  value: number;
  kind: 'coin' | 'bill';
};

const cashDenominationsByCurrency: Record<string, CashDenomination[]> = {
  MXN: [
    { value: 0.1, kind: 'coin' }, { value: 0.2, kind: 'coin' }, { value: 0.5, kind: 'coin' },
    { value: 1, kind: 'coin' }, { value: 2, kind: 'coin' },
    { value: 5, kind: 'coin' }, { value: 10, kind: 'coin' }, { value: 20, kind: 'coin' },
    { value: 20, kind: 'bill' }, { value: 50, kind: 'bill' }, { value: 100, kind: 'bill' },
    { value: 200, kind: 'bill' }, { value: 500, kind: 'bill' }, { value: 1000, kind: 'bill' },
  ],
  USD: [
    { value: 0.01, kind: 'coin' }, { value: 0.05, kind: 'coin' }, { value: 0.1, kind: 'coin' },
    { value: 0.25, kind: 'coin' }, { value: 1, kind: 'coin' }, { value: 1, kind: 'bill' },
    { value: 5, kind: 'bill' }, { value: 10, kind: 'bill' }, { value: 20, kind: 'bill' },
    { value: 50, kind: 'bill' }, { value: 100, kind: 'bill' },
  ],
  CAD: [
    { value: 0.05, kind: 'coin' }, { value: 0.1, kind: 'coin' }, { value: 0.25, kind: 'coin' },
    { value: 1, kind: 'coin' }, { value: 2, kind: 'coin' }, { value: 5, kind: 'bill' },
    { value: 10, kind: 'bill' }, { value: 20, kind: 'bill' }, { value: 50, kind: 'bill' },
    { value: 100, kind: 'bill' },
  ],
  COP: [
    { value: 50, kind: 'coin' }, { value: 100, kind: 'coin' }, { value: 200, kind: 'coin' },
    { value: 500, kind: 'coin' }, { value: 1000, kind: 'coin' }, { value: 2000, kind: 'bill' },
    { value: 5000, kind: 'bill' }, { value: 10000, kind: 'bill' }, { value: 20000, kind: 'bill' },
    { value: 50000, kind: 'bill' }, { value: 100000, kind: 'bill' },
  ],
  BRL: [
    { value: 0.05, kind: 'coin' }, { value: 0.1, kind: 'coin' }, { value: 0.25, kind: 'coin' },
    { value: 0.5, kind: 'coin' }, { value: 1, kind: 'coin' }, { value: 2, kind: 'bill' },
    { value: 5, kind: 'bill' }, { value: 10, kind: 'bill' }, { value: 20, kind: 'bill' },
    { value: 50, kind: 'bill' }, { value: 100, kind: 'bill' }, { value: 200, kind: 'bill' },
  ],
};

const denominationKey = ({ value, kind }: CashDenomination) => `${kind}-${value}`;

const mxnBanknoteImages: Record<number, string> = {
  20: mxn20Banknote,
  50: mxn50Banknote,
  100: mxn100Banknote,
  200: mxn200Banknote,
  500: mxn500Banknote,
  1000: mxn1000Banknote,
};

function calculateSuggestedChange(change: number, denominations: CashDenomination[]) {
  const uniqueValues = [...new Set(denominations.map(({ value }) => value))]
    .sort((left, right) => right - left);
  let remainingInCents = Math.max(0, Math.round(change * 100));
  const pieces: Array<{ value: number; count: number }> = [];

  uniqueValues.forEach((value) => {
    const denominationInCents = Math.round(value * 100);
    if (denominationInCents <= 0 || denominationInCents > remainingInCents) return;
    const count = Math.floor(remainingInCents / denominationInCents);
    if (count > 0) {
      pieces.push({ value, count });
      remainingInCents -= count * denominationInCents;
    }
  });

  return {
    pieces,
    remainder: remainingInCents / 100,
  };
}

interface SalePaymentPanelProps {
  totals: SaleTotals;
  payments: Payment[];
  cartItemCount: number;
  selectedQuickQuantity: number;
  suspendedSales: SuspendedSale[];
  recentActivities: OperationalActivity[];
  onRemovePayment: (paymentId: string) => void;
  onSuspendSale: () => void;
  onResumeSuspendedSale: (saleId: string) => void;
  onDiscardSuspendedSale: (saleId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onOpenSalePanel: () => void;
  onOpenReturn: () => void;
  onFullscreen: () => void;
  onExactPayment: () => void;
  onAddPayment: (method: PaymentMethod) => void;
  onConfirmWorkspacePayment?: (method: PaymentMethod, amount: number, reference?: string, cashReceived?: number, creditDetails?: CreditPaymentDetails) => void;
  onPaymentPreviewChange?: (preview: PaymentPreview | null) => void;
  creditRules?: CreditRule[];
  creditCustomers?: Customer[];
  currency?: string;
  onCompleteSale: () => void;
  isCompletingSale?: boolean;
  checkoutNotice?: string;
  checkoutRequestId?: number;
  workspaceMode?: boolean;
  onClearCheckoutNotice?: () => void;
  formatCurrency: (amount: number) => string;
}

export function SalePaymentPanel({
  totals,
  payments,
  cartItemCount,
  selectedQuickQuantity,
  suspendedSales,
  recentActivities,
  onRemovePayment,
  onSuspendSale,
  onResumeSuspendedSale,
  onDiscardSuspendedSale,
  onQuantityChange,
  onOpenSalePanel,
  onOpenReturn,
  onFullscreen,
  onExactPayment,
  onAddPayment,
  onConfirmWorkspacePayment,
  onPaymentPreviewChange,
  creditRules = [],
  creditCustomers = [],
  currency = 'MXN',
  onCompleteSale,
  isCompletingSale = false,
  checkoutNotice = '',
  checkoutRequestId = 0,
  workspaceMode = false,
  onClearCheckoutNotice,
  formatCurrency,
}: SalePaymentPanelProps) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [workspaceMethod, setWorkspaceMethod] = useState<PaymentMethod | null>(null);
  const [workspaceAmount, setWorkspaceAmount] = useState('');
  const [workspaceReference, setWorkspaceReference] = useState('');
  const [workspaceCashReceived, setWorkspaceCashReceived] = useState('');
  const [workspaceCashCounts, setWorkspaceCashCounts] = useState<Record<string, number>>({});
  const [workspaceCustomerId, setWorkspaceCustomerId] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const canOpenCheckout = cartItemCount > 0 || payments.length > 0;
  const normalizedCurrency = currency.trim().toUpperCase() || 'MXN';
  const cashDenominations = cashDenominationsByCurrency[normalizedCurrency] ?? cashDenominationsByCurrency.MXN;
  const denominationFormatter = useMemo(() => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }), [normalizedCurrency]);
  const workspaceAmountValue = Number(workspaceAmount) || 0;
  const workspaceCashReceivedValue = Number(workspaceCashReceived) || 0;
  const workspaceChangeValue = Math.max(0, workspaceCashReceivedValue - workspaceAmountValue);
  const workspaceCashShortfall = Math.max(0, workspaceAmountValue - workspaceCashReceivedValue);
  const isWorkspaceCashCovered = workspaceMethod === 'cash'
    && workspaceAmountValue > 0
    && workspaceCashReceivedValue >= workspaceAmountValue;
  const suggestedChange = useMemo(
    () => calculateSuggestedChange(workspaceChangeValue, cashDenominations),
    [cashDenominations, workspaceChangeValue],
  );
  const workspaceCashBreakdown = useMemo(() => cashDenominations
    .map((denomination) => ({
      ...denomination,
      count: workspaceCashCounts[denominationKey(denomination)] ?? 0,
    }))
    .filter(({ count }) => count > 0), [cashDenominations, workspaceCashCounts]);
  const workspaceCustomer = useMemo(() => creditCustomers.find((customer) => customer.id === workspaceCustomerId), [creditCustomers, workspaceCustomerId]);
  const workspaceCreditRule = useMemo(() => findCreditRuleForCustomer(creditRules, {
    customerId: workspaceCustomer?.id,
    customerGroup: workspaceCustomer?.customerType === 'business' ? 'Business' : 'Frequent retail',
    customerType: workspaceCustomer?.customerType,
  }), [creditRules, workspaceCustomer]);
  const workspaceCreditEvaluation = useMemo(() => {
    if (workspaceMethod !== 'credit' || !workspaceCreditRule) return null;
    return evaluateCreditPurchase(workspaceCreditRule, {
      ticketAmount: workspaceAmountValue || totals.remaining,
      currentBalance: workspaceCustomer?.currentBalance ?? 0,
      customerId: workspaceCustomer?.id,
      customerGroup: workspaceCreditRule.customerGroup,
      customerType: workspaceCustomer?.customerType,
      openInvoices: workspaceCustomer?.currentBalance ? 1 : 0,
      overdueBalance: 0,
    });
  }, [totals.remaining, workspaceAmountValue, workspaceCreditRule, workspaceCustomer, workspaceMethod]);

  useEffect(() => {
    if (!workspaceMode || !workspaceMethod) {
      onPaymentPreviewChange?.(null);
      return;
    }
    onPaymentPreviewChange?.({
      method: workspaceMethod,
      amount: workspaceAmountValue,
      cashReceived: workspaceMethod === 'cash' ? workspaceCashReceivedValue : undefined,
      change: workspaceMethod === 'cash' ? workspaceChangeValue : undefined,
    });
  }, [
    onPaymentPreviewChange,
    workspaceAmountValue,
    workspaceCashReceivedValue,
    workspaceChangeValue,
    workspaceMethod,
    workspaceMode,
  ]);

  useEffect(() => {
    if (
      isCheckoutOpen
      && !isCompletingSale
      && cartItemCount === 0
      && payments.length === 0
      && checkoutNotice.startsWith('Venta ')
    ) {
      setIsCheckoutOpen(false);
    }
  }, [cartItemCount, checkoutNotice, isCheckoutOpen, isCompletingSale, payments.length]);

  useEffect(() => {
    if (checkoutRequestId > 0 && canOpenCheckout) {
      setIsCheckoutOpen(true);
    }
  }, [canOpenCheckout, checkoutRequestId]);

  useEffect(() => {
    if (!workspaceMode) {
      setWorkspaceMethod(null);
      setWorkspaceError('');
    }
  }, [workspaceMode]);

  const openWorkspaceMethod = (method: PaymentMethod) => {
    setWorkspaceMethod(method);
    setWorkspaceAmount(totals.remaining.toFixed(2));
    setWorkspaceReference('');
    setWorkspaceCashReceived('');
    setWorkspaceCashCounts({});
    setWorkspaceCustomerId('');
    setWorkspaceError('');
  };

  const updateCashDenomination = (denomination: CashDenomination, delta: number) => {
    const key = denominationKey(denomination);
    setWorkspaceCashCounts((currentCounts) => {
      const nextCount = Math.max(0, (currentCounts[key] ?? 0) + delta);
      const nextCounts = { ...currentCounts, [key]: nextCount };
      const nextReceived = cashDenominations.reduce((total, option) => (
        total + option.value * (nextCounts[denominationKey(option)] ?? 0)
      ), 0);
      setWorkspaceCashReceived(nextReceived > 0 ? nextReceived.toFixed(2) : '');
      return nextCounts;
    });
    setWorkspaceError('');
  };

  const clearCashDenominations = () => {
    setWorkspaceCashCounts({});
    setWorkspaceCashReceived('');
    setWorkspaceError('');
  };

  const confirmWorkspaceMethod = () => {
    if (!workspaceMethod || !onConfirmWorkspacePayment) return;
    if (workspaceAmountValue <= 0 || workspaceAmountValue > totals.remaining) {
      setWorkspaceError(`Ingresa un monto entre 0.01 y ${formatCurrency(totals.remaining)}.`);
      return;
    }

    if (workspaceMethod === 'cash') {
      const received = workspaceCashReceivedValue;
      if (received < workspaceAmountValue) {
        setWorkspaceError('El efectivo recibido debe cubrir el monto del pago.');
        return;
      }
      const denominationReference = workspaceCashBreakdown.length > 0
        ? `${normalizedCurrency}: ${workspaceCashBreakdown.map(({ value, kind, count }) => `${count}x ${kind === 'bill' ? 'billete' : 'moneda'} ${denominationFormatter.format(value)}`).join(' + ')}`
        : workspaceReference || undefined;
      onConfirmWorkspacePayment(workspaceMethod, workspaceAmountValue, denominationReference, received);
    } else if (workspaceMethod === 'credit') {
      if (!workspaceCustomer || !workspaceCreditRule || !workspaceCreditEvaluation) {
        setWorkspaceError('Selecciona un cliente con una política de crédito disponible.');
        return;
      }
      if (workspaceCreditEvaluation.decision === 'blocked') {
        setWorkspaceError(workspaceCreditEvaluation.messages[0] ?? 'La política de crédito bloquea esta venta.');
        return;
      }
      const creditDetails: CreditPaymentDetails = {
        customerId: workspaceCustomer.id,
        customerName: workspaceCustomer.name,
        ruleId: workspaceCreditRule.id,
        ruleName: workspaceCreditRule.name ?? workspaceCreditRule.id,
        decision: workspaceCreditEvaluation.decision,
        termDays: workspaceCreditEvaluation.daysToPay,
        dueDate: workspaceCreditEvaluation.dueDate.toISOString().slice(0, 10),
        availableCredit: workspaceCreditEvaluation.availableCredit,
        projectedBalance: workspaceCreditEvaluation.projectedBalance,
        utilizationPercent: workspaceCreditEvaluation.utilizationPercent,
      };
      onConfirmWorkspacePayment(workspaceMethod, workspaceAmountValue, workspaceReference || `Crédito ${workspaceCreditRule.id}`, undefined, creditDetails);
    } else {
      onConfirmWorkspacePayment(workspaceMethod, workspaceAmountValue, workspaceReference || undefined);
    }

    setWorkspaceMethod(null);
    setWorkspaceAmount('');
    setWorkspaceReference('');
    setWorkspaceCashReceived('');
    setWorkspaceCashCounts({});
    setWorkspaceCustomerId('');
    setWorkspaceError('');
  };

  if (!canOpenCheckout) {
    return (
      <aside className="flex h-full min-h-[220px] min-w-0 flex-col justify-end rounded-xl border border-[#222831]/10 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <div>
            <p className="text-base font-medium text-[#222831] dark:text-white">Agrega productos</p>
            <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">El cobro se habilitará cuando el ticket tenga artículos.</p>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
          <p className="mt-1 break-words text-3xl font-medium leading-none text-[#222831] dark:text-white">{formatCurrency(0)}</p>
        </div>
      </aside>
    );
  }

  if (workspaceMode) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-[#222831] px-5 py-3 text-white dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/20 text-[#F4C84A]" aria-hidden="true">
              <Banknote className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-medium">
                {workspaceMethod === 'cash'
                  ? 'Registrar efectivo'
                  : totals.isPaid
                    ? 'Pago listo'
                    : payments.length > 0
                      ? 'Cobro dividido'
                      : 'Registrar pago'}
              </h2>
              <p className="truncate text-sm text-gray-300">
                {workspaceMethod === 'cash'
                  ? `Recibido ${formatCurrency(workspaceCashReceivedValue)}`
                  : totals.isPaid
                    ? totals.change > 0 ? 'Finaliza antes de entregar el cambio' : 'El pago está completo'
                    : payments.length > 0
                      ? `${payments.length} ${payments.length === 1 ? 'pago agregado' : 'pagos agregados'}`
                      : `${cartItemCount} artículos · Cobro touch`}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-[11px] font-medium ${isWorkspaceCashCovered ? 'text-[#7BE0C3]' : 'text-gray-400'}`}>
              {isWorkspaceCashCovered
                ? 'Cambio a entregar'
                : !workspaceMethod && totals.isPaid
                  ? totals.change > 0 ? 'Cambio pendiente' : 'Pago completo'
                : workspaceMethod === 'cash' && workspaceCashReceivedValue > 0
                  ? 'Falta recibir'
                  : 'Por cobrar'}
            </p>
            <p className={`text-2xl font-medium leading-none ${isWorkspaceCashCovered ? 'text-[#7BE0C3]' : 'text-white'}`}>
              {formatCurrency(
                isWorkspaceCashCovered
                  ? workspaceChangeValue
                  : !workspaceMethod && totals.isPaid
                    ? totals.change
                  : workspaceMethod === 'cash' && workspaceCashReceivedValue > 0
                    ? workspaceCashShortfall
                    : workspaceMethod
                      ? workspaceAmountValue
                      : totals.remaining,
              )}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F7F8FA] p-3 dark:bg-gray-950/30">
          {workspaceMethod ? (
            <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMethod(null);
                    setWorkspaceError('');
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[#222831] transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                  aria-label="Volver a métodos de pago"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Capturar pago</p>
                  <h3 className="text-base font-medium text-[#222831] dark:text-white">
                    {workspacePaymentMethods.find(({ method }) => method === workspaceMethod)?.label}
                  </h3>
                </div>
              </div>

              {workspaceError ? (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                  {workspaceError}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#222831] dark:text-white">Monto del pago</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-gray-500">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      max={totals.remaining}
                      step="0.01"
                      value={workspaceAmount}
                      onChange={(event) => setWorkspaceAmount(event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-lg font-medium text-[#222831] outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </label>

                {workspaceMethod === 'cash' ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[#222831] dark:text-white">Efectivo recibido</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-gray-500">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={workspaceAmountValue}
                      step="0.01"
                      value={workspaceCashReceived}
                      onChange={(event) => {
                        setWorkspaceCashReceived(event.target.value);
                        setWorkspaceCashCounts({});
                        setWorkspaceError('');
                      }}
                      className="min-h-12 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-lg font-medium text-[#222831] outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    </div>
                  </label>
                ) : null}

                {workspaceMethod === 'credit' ? (
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-[#222831] dark:text-white">Cliente de crédito</span>
                    <select
                      value={workspaceCustomerId}
                      onChange={(event) => setWorkspaceCustomerId(event.target.value)}
                      className="min-h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-base font-medium text-[#222831] outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Seleccionar cliente</option>
                      {creditCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {workspaceMethod !== 'cash' ? (
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-[#222831] dark:text-white">
                      {workspaceMethod === 'card' ? 'Autorización o referencia' : workspaceMethod === 'transfer' ? 'Referencia de transferencia' : 'Referencia de crédito'}
                    </span>
                    <input
                      type="text"
                      value={workspaceReference}
                      onChange={(event) => setWorkspaceReference(event.target.value)}
                      placeholder="Opcional"
                      className="min-h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-base text-[#222831] outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </label>
                ) : null}
              </div>

              {workspaceMethod === 'cash' ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-medium text-[#222831] dark:text-white">Denominaciones {normalizedCurrency}</h4>
                      <p className="text-[11px] text-gray-500">Toca cada pieza recibida.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWorkspaceCashCounts({});
                          setWorkspaceCashReceived(workspaceAmountValue.toFixed(2));
                          setWorkspaceError('');
                        }}
                        className="min-h-10 rounded-lg border border-[#59C3A5] bg-[#59C3A5]/10 px-3 text-sm font-medium text-[#14745F] active:scale-95"
                      >
                        Pago exacto
                      </button>
                      <button
                        type="button"
                        onClick={clearCashDenominations}
                        disabled={!workspaceCashReceivedValue}
                        className="min-h-10 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 active:scale-95 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
                    {cashDenominations.map((denomination) => {
                      const key = denominationKey(denomination);
                      const count = workspaceCashCounts[key] ?? 0;
                      const banknoteImage = normalizedCurrency === 'MXN' && denomination.kind === 'bill'
                        ? mxnBanknoteImages[denomination.value]
                        : undefined;
                      return (
                        <div key={key} className={`relative overflow-hidden rounded-lg border transition ${count > 0 ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 shadow-sm' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
                          <button
                            type="button"
                            onClick={() => updateCashDenomination(denomination, 1)}
                            className={`flex min-h-14 w-full items-center gap-1.5 pr-8 text-left active:scale-[0.97] ${banknoteImage ? 'px-1.5' : 'px-2.5'}`}
                            aria-label={`Agregar ${denomination.kind === 'bill' ? 'billete' : 'moneda'} de ${denominationFormatter.format(denomination.value)}`}
                          >
                            {banknoteImage ? (
                              <img
                                src={banknoteImage}
                                alt={`Billete ilustrativo de ${denominationFormatter.format(denomination.value)}`}
                                className="h-10 w-16 shrink-0 rounded border border-black/10 object-cover shadow-sm"
                                draggable={false}
                              />
                            ) : (
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${denomination.kind === 'bill' ? 'bg-[#59C3A5]/15 text-[#14745F]' : 'bg-[#F4C84A]/25 text-[#8A6500]'}`}>
                                {denomination.kind === 'bill' ? <Banknote className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                              </span>
                            )}
                            <span className="min-w-0">
                              <strong className="block truncate text-[13px] text-[#222831] dark:text-white">{denominationFormatter.format(denomination.value)}</strong>
                              <span className="text-[10px] capitalize text-gray-500">{denomination.kind === 'bill' ? 'billete' : 'moneda'}</span>
                            </span>
                          </button>
                          {count > 0 ? (
                            <button
                              type="button"
                              onClick={() => updateCashDenomination(denomination, -1)}
                              className="absolute right-1 top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#222831] px-1.5 text-[11px] font-medium text-white active:scale-90"
                              aria-label={`Quitar una pieza de ${denominationFormatter.format(denomination.value)}`}
                              title="Toca para restar una pieza"
                            >
                              ×{count}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className={`rounded-xl border px-3 py-2.5 ${isWorkspaceCashCovered ? 'border-[#14745F]/20 bg-[#59C3A5] text-[#222831] shadow-sm' : 'border-[#F4C84A]/50 bg-[#F4C84A]/20'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/75 ${isWorkspaceCashCovered ? 'text-[#14745F]' : 'text-[#8A6500]'}`}>
                          <Banknote className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <span className={`block text-sm font-medium ${isWorkspaceCashCovered ? 'text-[#0F5F4D]' : 'text-[#8A6500]'}`}>
                            {isWorkspaceCashCovered ? 'Cambio a entregar' : 'Falta recibir'}
                          </span>
                          <span className={`block truncate text-[11px] ${isWorkspaceCashCovered ? 'text-[#0F5F4D]' : 'text-gray-500'}`}>
                            Recibido {formatCurrency(workspaceCashReceivedValue)} · Venta {formatCurrency(workspaceAmountValue)}
                          </span>
                        </div>
                      </div>
                      <strong className={`shrink-0 text-3xl leading-none ${isWorkspaceCashCovered ? 'text-[#0B4F40]' : 'text-[#8A6500]'}`}>
                        {formatCurrency(Math.abs(workspaceCashReceivedValue - workspaceAmountValue))}
                      </strong>
                    </div>

                    {workspaceChangeValue > 0 ? (
                      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto border-t border-[#14745F]/15 pt-2" aria-label="Cambio sugerido">
                        <span className="shrink-0 text-[11px] font-medium text-[#14745F]">Entregar:</span>
                        {suggestedChange.pieces.map(({ value, count }) => {
                          const banknoteImage = normalizedCurrency === 'MXN' ? mxnBanknoteImages[value] : undefined;
                          return (
                            <span key={value} className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md bg-white/80 px-1.5 text-[#14745F] shadow-sm">
                              {banknoteImage ? (
                                <img src={banknoteImage} alt="" aria-hidden="true" className="h-6 w-10 rounded-sm border border-black/10 object-cover" draggable={false} />
                              ) : (
                                <Coins className="h-4 w-4" aria-hidden="true" />
                              )}
                              <span className="text-[11px] font-medium">{denominationFormatter.format(value)}</span>
                              <strong className="rounded-full bg-[#14745F] px-1.5 py-0.5 text-[10px] text-white">×{count}</strong>
                            </span>
                          );
                        })}
                        {suggestedChange.remainder > 0 ? (
                          <span className="shrink-0 rounded-md bg-[#F4C84A]/30 px-2 py-1 text-[11px] font-medium text-[#8A6500]">
                            Ajuste {formatCurrency(suggestedChange.remainder)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {workspaceMethod === 'credit' && workspaceCreditEvaluation ? (
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#F7F8FA] p-3 text-sm dark:bg-gray-800 sm:grid-cols-4">
                  <div><span className="block text-xs text-gray-500">Decisión</span><strong className="capitalize">{workspaceCreditEvaluation.decision}</strong></div>
                  <div><span className="block text-xs text-gray-500">Plazo</span><strong>{workspaceCreditEvaluation.daysToPay} días</strong></div>
                  <div><span className="block text-xs text-gray-500">Disponible</span><strong>{formatCurrency(workspaceCreditEvaluation.availableCredit)}</strong></div>
                  <div><span className="block text-xs text-gray-500">Uso proyectado</span><strong>{workspaceCreditEvaluation.utilizationPercent.toFixed(0)}%</strong></div>
                </div>
              ) : null}

            </section>
          ) : null}

          <section className={`${workspaceMethod || totals.isPaid ? 'hidden' : ''} rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium text-[#222831] dark:text-white">Método de pago</h3>
                <p className="text-xs text-gray-500">Selecciona cómo recibes el pago.</p>
              </div>
              <button type="button" onClick={onExactPayment} disabled={totals.isPaid || isCompletingSale} className="min-h-12 rounded-lg bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:opacity-40">
                Cobro exacto
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {workspacePaymentMethods.map(({ method, label, icon }) => (
                <button
                  key={method}
                  type="button"
                  disabled={Boolean(totals.isPaid || isCompletingSale || (payments.length > 0 && method === 'credit'))}
                  onClick={() => openWorkspaceMethod(method)}
                  className="flex min-h-16 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-left font-medium text-[#222831] transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/10 active:scale-[0.98] disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </section>

          {!workspaceMethod && totals.isPaid ? (
            <section className="rounded-xl border border-[#14745F]/25 bg-[#59C3A5] p-4 text-[#222831] shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#0B4F40]" aria-hidden="true">
                    {totals.change > 0 ? <Banknote className="h-6 w-6" /> : <Check className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-medium">{totals.change > 0 ? 'Cambio pendiente de entregar' : 'Pago completado'}</h3>
                    <p className="text-sm text-[#0F5F4D]">
                      {totals.change > 0 ? 'Entrégalo únicamente después de finalizar la venta.' : 'La venta está lista para finalizar.'}
                    </p>
                  </div>
                </div>
                <strong className="shrink-0 text-3xl font-medium leading-none text-[#0B4F40]">
                  {formatCurrency(totals.change)}
                </strong>
              </div>
            </section>
          ) : null}

          <section className={`${workspaceMethod ? 'hidden' : ''} rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-medium text-[#222831] dark:text-white">Pagos agregados</h3>
              <span className="text-sm font-medium text-gray-500">Pagado {formatCurrency(totals.paid)}</span>
            </div>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-[#F7F8FA] px-3 dark:bg-gray-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#222831] dark:text-white">
                      {workspacePaymentMethods.find(({ method }) => method === payment.method)?.label ?? payment.method}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {payment.method === 'cash' && payment.cashReceived != null
                        ? `Recibido ${formatCurrency(payment.cashReceived)} · Cambio pendiente ${formatCurrency(payment.change ?? 0)}`
                        : payment.reference || 'Sin referencia'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <strong className="text-sm text-[#222831] dark:text-white">{formatCurrency(payment.amount)}</strong>
                    <button type="button" onClick={() => onRemovePayment(payment.id)} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Quitar pago">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {payments.length === 0 ? <p className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">Todavía no hay pagos capturados.</p> : null}
            </div>
          </section>
        </div>

        <footer className="shrink-0 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          {workspaceMethod ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">
                  {isWorkspaceCashCovered
                    ? `Cambio ${formatCurrency(workspaceChangeValue)}`
                    : workspacePaymentMethods.find(({ method }) => method === workspaceMethod)?.label}
                </span>
                <strong className="text-lg text-[#222831] dark:text-white">{formatCurrency(workspaceAmountValue)}</strong>
              </div>
              <button
                type="button"
                onClick={confirmWorkspaceMethod}
                disabled={!onConfirmWorkspacePayment || isCompletingSale || (workspaceMethod === 'cash' && workspaceCashReceivedValue < workspaceAmountValue)}
                className="min-h-12 w-full rounded-lg bg-[#FF6B5E] px-5 text-base font-medium text-[#222831] transition hover:bg-[#ff5a4b] active:scale-[0.99] disabled:opacity-40"
              >
                {workspaceMethod === 'cash' && !isWorkspaceCashCovered
                  ? `Falta ${formatCurrency(workspaceCashShortfall)}`
                  : workspaceMethod === 'cash'
                    ? 'Registrar efectivo'
                    : 'Agregar pago'}
              </button>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">
                  {totals.isPaid
                    ? totals.change > 0
                      ? 'Cambio pendiente'
                      : 'Pago completo'
                    : `Falta ${formatCurrency(totals.remaining)}`}
                </span>
                <strong className={`text-lg ${totals.isPaid && totals.change > 0 ? 'text-[#14745F]' : 'text-[#222831] dark:text-white'}`}>
                  {totals.isPaid && totals.change > 0
                    ? formatCurrency(totals.change)
                    : formatCurrency(totals.total)}
                </strong>
              </div>
              <button type="button" onClick={onCompleteSale} disabled={!totals.isPaid || isCompletingSale} className="min-h-12 w-full rounded-lg bg-[#FF6B5E] px-5 text-base font-medium text-[#222831] disabled:cursor-not-allowed disabled:opacity-40">
                {isCompletingSale
                  ? 'Guardando venta...'
                  : totals.change > 0
                    ? 'Finalizar venta y entregar cambio'
                    : 'Finalizar venta'}
              </button>
            </>
          )}
        </footer>
      </section>
    );
  }

  return (
    <>
      <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
        <section className="order-3 mt-auto space-y-2.5 border-t border-gray-200 p-3 dark:border-gray-700">
          <div className={`rounded-xl p-3 ${totals.isPaid ? 'bg-[#59C3A5] text-[#222831]' : 'bg-[#222831] text-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium opacity-90">Cobro</p>
                <p className="mt-1 break-words text-3xl font-medium leading-none">
                  {formatCurrency(totals.total)}
                </p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                {totals.isPaid ? 'Listo' : 'Pendiente'}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <StatusTile label="Pagado" value={formatCurrency(totals.paid)} />
            <StatusTile
              label={totals.isPaid ? 'Cambio' : 'Falta'}
              value={formatCurrency(totals.isPaid ? totals.change : totals.remaining)}
              tone={totals.isPaid ? 'aqua' : 'warning'}
            />
          </div>

          <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${
            totals.isPaid
              ? 'border-[#59C3A5]/50 bg-[#59C3A5]/10'
              : 'border-[#F4C84A]/60 bg-[#F4C84A]/15'
          }`}>
            {totals.isPaid ? (
              <Check className="mt-1 h-5 w-5 shrink-0 text-[#14745F] dark:text-[#9DE7D3]" />
            ) : (
              <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#B77900] dark:text-[#F4C84A]" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#222831] dark:text-white">
                {totals.isPaid ? 'Pago completo' : 'Listo para cobrar'}
              </p>
              <p className="text-xs font-normal text-gray-600 dark:text-gray-300">
                {totals.isPaid
                  ? 'Abre el cobro para revisar y finalizar la venta.'
                  : 'Abre el modal touch para elegir método de pago.'}
              </p>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-[#F7F8FA] px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pagos registrados</p>
              <p className="text-base font-medium text-[#222831] dark:text-white">
                {payments.length} pago{payments.length === 1 ? '' : 's'} · {formatCurrency(totals.paid)}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            disabled={!canOpenCheckout || isCompletingSale}
            className="min-h-12 w-full rounded-xl bg-[#FF6B5E] px-5 py-2.5 text-lg font-medium text-[#222831] transition hover:bg-[#ff5a4b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {totals.isPaid
              ? 'Revisar y finalizar'
              : 'Cobrar'}
          </button>
        </section>

        <div className="order-1 border-b border-gray-200 p-3 dark:border-gray-700">
          <CompactPosActions
            selectedQuickQuantity={selectedQuickQuantity}
            suspendedSales={suspendedSales}
            canSuspend={cartItemCount > 0}
            onSuspend={onSuspendSale}
            onResume={onResumeSuspendedSale}
            onDiscard={onDiscardSuspendedSale}
            onQuantityChange={onQuantityChange}
            onOpenSalePanel={onOpenSalePanel}
            onOpenReturn={onOpenReturn}
            onFullscreen={onFullscreen}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="order-2 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
          <button
            onClick={() => setIsActivityOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            aria-expanded={isActivityOpen}
          >
            <span>Actividad reciente</span>
            {isActivityOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {isActivityOpen && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-700">
              <OperationalActivityFeed activities={recentActivities} />
            </div>
          )}
        </div>
      </div>

      <TouchCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        totals={totals}
        payments={payments}
        cartItemCount={cartItemCount}
        onRemovePayment={onRemovePayment}
        onExactPayment={onExactPayment}
        onAddPayment={onAddPayment}
        onCompleteSale={onCompleteSale}
        isCompletingSale={isCompletingSale}
        checkoutNotice={checkoutNotice}
        onClearCheckoutNotice={onClearCheckoutNotice}
        formatCurrency={formatCurrency}
      />
    </>
  );
}

function CompactPosActions({
  selectedQuickQuantity,
  suspendedSales,
  canSuspend,
  onSuspend,
  onResume,
  onDiscard,
  onQuantityChange,
  onOpenSalePanel,
  onOpenReturn,
  onFullscreen,
  formatCurrency,
}: {
  selectedQuickQuantity: number;
  suspendedSales: SuspendedSale[];
  canSuspend: boolean;
  onSuspend: () => void;
  onResume: (saleId: string) => void;
  onDiscard: (saleId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onOpenSalePanel: () => void;
  onOpenReturn: () => void;
  onFullscreen: () => void;
  formatCurrency: (amount: number) => string;
}) {
  const visibleSuspendedSales = suspendedSales.slice(0, 1);

  return (
    <section className="space-y-2.5">
      <div>
        <p className="mb-1.5 text-[10px] font-medium tracking-normal text-gray-500 dark:text-gray-400">
          Cantidad rápida
        </p>
        <div className="grid grid-cols-5 gap-2">
          {quantityOptions.map((quantity) => (
            <button
              key={quantity}
              type="button"
              onClick={() => onQuantityChange(quantity)}
              className={`min-h-11 rounded-xl text-sm font-medium transition active:scale-95 ${
                selectedQuickQuantity === quantity
                  ? 'bg-[#FF6B5E] text-[#222831]'
                  : 'bg-[#F7F8FA] text-gray-700 ring-1 ring-gray-200 hover:bg-[#FF6B5E]/10 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700'
              }`}
            >
              x{quantity}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <QuickActionButton label="Pausar" icon={<Pause className="h-4 w-4" />} disabled={!canSuspend} onClick={onSuspend} />
        <QuickActionButton label="Ticket" icon={<Eye className="h-4 w-4" />} onClick={onOpenSalePanel} />
        <QuickActionButton label="Devolución" icon={<RotateCcw className="h-4 w-4" />} onClick={onOpenReturn} />
        <QuickActionButton label="Pantalla" icon={<Monitor className="h-4 w-4" />} onClick={onFullscreen} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-[#F7F8FA] p-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#222831] dark:text-white">Tickets pausados</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {suspendedSales.length === 0
                ? 'Sin tickets en espera'
                : `${suspendedSales.length} ticket${suspendedSales.length === 1 ? '' : 's'} en espera`}
            </p>
          </div>
          {suspendedSales.length > 0 && (
            <span className="rounded-full bg-[#F4C84A]/20 px-2 py-1 text-xs font-medium text-[#8A6500] dark:text-[#F4C84A]">
              {suspendedSales.length}
            </span>
          )}
        </div>

        {suspendedSales.length > 0 && (
          <div className="mt-2 space-y-2">
            {visibleSuspendedSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 dark:bg-gray-950/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#222831] dark:text-white">{sale.title}</p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{formatCurrency(sale.total)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onResume(sale.id)}
                    className="min-h-9 rounded-xl bg-[#222831] px-3 py-1 text-xs font-medium text-white"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscard(sale.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Descartar ticket pausado"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {suspendedSales.length > visibleSuspendedSales.length && (
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                +{suspendedSales.length - visibleSuspendedSales.length} ticket{(suspendedSales.length - visibleSuspendedSales.length) === 1 ? '' : 's'} en espera
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:text-[#FFB0AA]"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function StatusTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'aqua' | 'warning';
}) {
  const toneClass = {
    default: 'bg-[#F7F8FA] text-[#222831] dark:bg-gray-900/40 dark:text-white',
    aqua: 'bg-[#59C3A5]/10 text-[#14745F] dark:bg-[#59C3A5]/10 dark:text-[#9DE7D3]',
    warning: 'bg-[#F4C84A]/15 text-[#8A6500] dark:bg-[#F4C84A]/10 dark:text-[#F4C84A]',
  }[tone];

  return (
    <div className={`rounded-xl px-3 py-2.5 ${toneClass}`}>
      <p className="text-[10px] font-medium tracking-normal opacity-75">{label}</p>
      <p className="mt-0.5 break-words text-base font-medium leading-tight">{value}</p>
    </div>
  );
}
