import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { Product } from '../../shared/commercial/products';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import type { CreditPaymentDetails, Payment, PaymentMethod, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import { posBackendApi, type PosCheckoutResponse } from '../services/posBackendApi';
import {
  isBackendUnsupportedPayment,
  toPosCheckoutItems,
  toPosCheckoutPayments,
} from '../utils/posCheckoutMappers';
import { getPosRequestErrorMessage, toBackendId } from '../utils/posShiftMappers';
import {
  calculateSaleTotals,
  type SaleTotals,
} from '../utils/saleCalculations';

interface UseSaleCheckoutOptions {
  cart: SaleItem[];
  products: Product[];
  currentShift: Shift | null;
  setCurrentShift: Dispatch<SetStateAction<Shift | null>>;
  resetCart: () => void;
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
  currency: string;
  refreshRegisterContext?: () => Promise<void>;
}

const toNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toMoney = (value: number) => Number(value.toFixed(2));

const moneyEquals = (first: number, second: number) => (
  Math.round(first * 100) === Math.round(second * 100)
);

const totalsFromBackend = (
  response: PosCheckoutResponse,
  fallback: SaleTotals,
): SaleTotals => {
  const summary = response.printableSummary;
  const total = toNumber(summary.totalAmount);
  const paid = toNumber(summary.paidAmount);

  return {
    subtotal: toNumber(summary.subtotalAmount),
    tax: toNumber(summary.taxAmount),
    total,
    paid,
    remaining: Math.max(total - paid, 0),
    change: fallback.change,
    isPaid: moneyEquals(paid, total),
  };
};

export function useSaleCheckout({
  cart,
  products,
  currentShift,
  setCurrentShift,
  resetCart,
  pushActivity,
  formatCurrency,
  currency,
  refreshRegisterContext,
}: UseSaleCheckoutOptions) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [, setCashReceived] = useState(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const [lastSale, setLastSale] = useState<{
    saleNumber: string;
    items: SaleItem[];
    payments: Payment[];
    totals: SaleTotals;
  } | null>(null);

  const totals = useMemo(() => calculateSaleTotals(cart, payments), [cart, payments]);

  const closeAddPaymentModal = () => {
    setShowAddPaymentModal(false);
    setSelectedPaymentMethod(null);
  };

  const clearPayments = () => {
    setPayments([]);
    setCashReceived(0);
  };

  const handleAddPayment = (method: PaymentMethod) => {
    if (isCompletingSale) {
      setCheckoutNotice('La venta se esta guardando. Espera a que termine el proceso.');
      return;
    }

    if (cart.length === 0) {
      setCheckoutNotice('Agrega productos al ticket antes de registrar pagos.');
      return;
    }

    if (isBackendUnsupportedPayment(method)) {
      setCheckoutNotice('Credit sales will be enabled after receivables are connected.');
      return;
    }

    if (totals.isPaid) {
      setCheckoutNotice('El pago ya esta completo.');
      return;
    }

    setCheckoutNotice('');
    setSelectedPaymentMethod(method);
    setShowAddPaymentModal(true);
  };

  const confirmAddPayment = (
    amount: number,
    reference?: string,
    receivedCash?: number,
    creditDetails?: CreditPaymentDetails,
  ) => {
    if (!selectedPaymentMethod) {
      return;
    }

    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      method: selectedPaymentMethod,
      amount,
      reference,
      creditDetails,
    };

    setPayments([...payments, newPayment]);

    if (selectedPaymentMethod === 'cash' && receivedCash) {
      setCashReceived(receivedCash);
    }

    closeAddPaymentModal();
  };

  const removePayment = (paymentId: string) => {
    setPayments(payments.filter((payment) => payment.id !== paymentId));
    setCashReceived(0);
  };

  const completeSale = async (salePayments: Payment[] = payments, saleTotals: SaleTotals = totals) => {
    if (isCompletingSale) {
      return;
    }

    if (cart.length === 0) {
      setCheckoutNotice('Agrega productos al ticket antes de cobrar.');
      return;
    }

    if (salePayments.length === 0) {
      setCheckoutNotice('Agrega al menos un pago antes de cobrar.');
      return;
    }

    if (!saleTotals.isPaid) {
      setCheckoutNotice('El pago no esta completo. Agrega mas pagos para cubrir el total.');
      return;
    }

    if (!moneyEquals(saleTotals.paid, saleTotals.total)) {
      setCheckoutNotice('El total pagado debe ser igual al total de la venta.');
      return;
    }

    if (!currentShift) {
      setCheckoutNotice('No hay turno activo.');
      return;
    }

    const cashRegisterId = toBackendId(currentShift.cashRegisterId);
    if (!cashRegisterId) {
      setCheckoutNotice('No hay una caja valida seleccionada para cobrar.');
      return;
    }

    if (salePayments.some((payment) => isBackendUnsupportedPayment(payment.method))) {
      setCheckoutNotice('Credit sales will be enabled after receivables are connected.');
      return;
    }

    const completedItems = [...cart];
    const completedPayments = [...salePayments];
    const checkoutCurrency = currency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(checkoutCurrency)) {
      setCheckoutNotice('No hay una divisa valida para guardar la venta.');
      return;
    }

    const cashPayment = salePayments
      .filter((payment) => payment.method === 'cash')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const cardPayment = salePayments
      .filter((payment) => payment.method === 'card')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const transferPayment = salePayments
      .filter((payment) => payment.method === 'transfer')
      .reduce((sum, payment) => sum + payment.amount, 0);

    setIsCompletingSale(true);
    setCheckoutNotice('');

    try {
      const response = await posBackendApi.checkout({
        cashRegisterId,
        customerId: null,
        currencyCode: checkoutCurrency,
        items: toPosCheckoutItems(completedItems, products),
        payments: toPosCheckoutPayments(completedPayments),
        notes: `POS checkout · caja ${currentShift.cashRegisterCode}`,
      });
      const saleNumber = response.printableSummary.ticketNumber || response.ticket.ticketNumber;
      const completedTotals = totalsFromBackend(response, saleTotals);

      setLastSale({
        saleNumber,
        items: completedItems,
        payments: completedPayments,
        totals: completedTotals,
      });

      setCurrentShift((existingShift) => {
        if (!existingShift || existingShift.id !== currentShift.id) {
          return existingShift;
        }

        return {
          ...existingShift,
          sales: existingShift.sales + 1,
          subtotalSales: toMoney(existingShift.subtotalSales + completedTotals.subtotal),
          taxSales: toMoney(existingShift.taxSales + completedTotals.tax),
          totalSales: toMoney(existingShift.totalSales + completedTotals.total),
          expectedCash: toMoney(existingShift.expectedCash + cashPayment),
          cashSales: toMoney(existingShift.cashSales + cashPayment),
          cardSales: toMoney(existingShift.cardSales + cardPayment),
          transferSales: toMoney(existingShift.transferSales + transferPayment),
        };
      });

      resetCart();
      clearPayments();
      setCheckoutNotice(`Venta ${saleNumber} guardada. El inventario aun no se descuenta en esta fase.`);
      setShowTicketModal(true);
      pushActivity({
        type: 'sale',
        title: 'Venta guardada',
        description: `${completedItems.length} linea${completedItems.length === 1 ? '' : 's'} registrada${completedItems.length === 1 ? '' : 's'} en POS. Inventario pendiente de descuento.`,
        actor: currentShift.cashierName,
        badge: formatCurrency(completedTotals.total),
        tone: 'success',
      });
      await refreshRegisterContext?.();
    } catch (error) {
      setCheckoutNotice(getPosRequestErrorMessage(error, 'No se pudo guardar la venta en POS.'));
    } finally {
      setIsCompletingSale(false);
    }
  };

  const handleExactPayment = () => {
    if (isCompletingSale) {
      setCheckoutNotice('La venta se esta guardando. Espera a que termine el proceso.');
      return;
    }

    if (cart.length === 0) {
      setCheckoutNotice('Agrega productos al ticket antes de cobrar.');
      return;
    }

    if (totals.isPaid) {
      setCheckoutNotice('El pago ya esta completo.');
      return;
    }

    const exactPayment: Payment = {
      id: `payment-${Date.now()}`,
      method: 'cash',
      amount: totals.remaining,
    };

    const nextPayments = [...payments, exactPayment];
    const nextTotals: SaleTotals = {
      ...totals,
      paid: totals.total,
      remaining: 0,
      change: 0,
      isPaid: true,
    };

    setPayments(nextPayments);

    setTimeout(() => {
      void completeSale(nextPayments, nextTotals);
    }, 100);
  };

  return {
    payments,
    setPayments,
    setCashReceived,
    totals,
    checkoutNotice,
    clearCheckoutNotice: () => setCheckoutNotice(''),
    isCompletingSale,
    showAddPaymentModal,
    selectedPaymentMethod,
    showTicketModal,
    setShowTicketModal,
    lastSale,
    clearPayments,
    closeAddPaymentModal,
    handleAddPayment,
    confirmAddPayment,
    removePayment,
    completeSale,
    handleExactPayment,
  };
}
