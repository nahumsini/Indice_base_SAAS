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
  syncCheckoutData?: () => Promise<void>;
  onCreditCheckoutCompleted?: (candidateSaleId: string, saleNumber: string) => void;
  inventoryBalancesLoading?: boolean;
  inventoryBalancesError?: string | null;
  customerId?: string;
  preticketId?: number;
  restaurantOrderId?: number;
  onCheckoutCompleted?: () => void;
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
  syncCheckoutData,
  onCreditCheckoutCompleted,
  inventoryBalancesLoading = false,
  inventoryBalancesError,
  customerId,
  preticketId,
  restaurantOrderId,
  onCheckoutCompleted,
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
      setCheckoutNotice('Las ventas a credito se administran desde el modulo de Cartera.');
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
      cashReceived: selectedPaymentMethod === 'cash' ? receivedCash : undefined,
      change: selectedPaymentMethod === 'cash' && receivedCash != null
        ? Math.max(toMoney(receivedCash - amount), 0)
        : undefined,
      creditDetails,
    };

    setPayments([...payments, newPayment]);

    if (selectedPaymentMethod === 'cash' && receivedCash) {
      setCashReceived(receivedCash);
    }

    closeAddPaymentModal();
  };

  const confirmWorkspacePayment = (
    method: PaymentMethod,
    amount: number,
    reference?: string,
    receivedCash?: number,
    creditDetails?: CreditPaymentDetails,
  ) => {
    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      method,
      amount,
      reference,
      cashReceived: method === 'cash' ? receivedCash : undefined,
      change: method === 'cash' && receivedCash != null
        ? Math.max(toMoney(receivedCash - amount), 0)
        : undefined,
      creditDetails,
    };

    setPayments((currentPayments) => [...currentPayments, newPayment]);
    if (method === 'cash' && receivedCash) setCashReceived(receivedCash);
    setCheckoutNotice('');
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

    const hasInventoryItems = cart.some((item) => (
      products.find((product) => product.id === item.productId)?.useInventory === true
    ));

    if (hasInventoryItems && inventoryBalancesLoading) {
      setCheckoutNotice('Espera a que terminen de cargar las existencias del almacén antes de cobrar.');
      return;
    }

    if (hasInventoryItems && inventoryBalancesError) {
      setCheckoutNotice('No se puede cobrar este ticket hasta validar las existencias del almacén. Actualiza inventario e inténtalo de nuevo.');
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

    const completedItems = [...cart];
    const completedPayments = [...salePayments];
    const creditPayment = completedPayments.find((payment) => payment.method === 'credit');
    const closesAsCredit = Boolean(creditPayment);
    const checkoutCurrency = currency.trim().toUpperCase();
    const shiftCurrency = currentShift.currencyCode?.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(checkoutCurrency)) {
      setCheckoutNotice('No hay una divisa valida para guardar la venta.');
      return;
    }

    if (shiftCurrency && shiftCurrency !== checkoutCurrency) {
      setCheckoutNotice(`El turno actual esta abierto en ${shiftCurrency}, pero la venta esta configurada en ${checkoutCurrency}. Cierra este turno y abre caja en ${checkoutCurrency}, o cambia el pais fiscal para usar ${shiftCurrency}.`);
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
        customerId: toBackendId(creditPayment?.creditDetails?.customerId ?? customerId),
        preticketId: preticketId ?? null,
        restaurantOrderId: restaurantOrderId ?? null,
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
      onCheckoutCompleted?.();
      setCheckoutNotice(
        closesAsCredit
          ? `Venta ${saleNumber} guardada como credito. Abriendo Cartera para configurar la venta a credito.`
          : `Venta ${saleNumber} guardada. Los productos con inventario descuentan stock automaticamente; servicios, digitales y lineas custom no afectan inventario.`,
      );
      setShowTicketModal(!closesAsCredit);
      pushActivity({
        type: 'sale',
        title: closesAsCredit ? 'Venta a credito enviada' : 'Venta guardada',
        description: closesAsCredit
          ? `${completedItems.length} linea${completedItems.length === 1 ? '' : 's'} registrada${completedItems.length === 1 ? '' : 's'} en POS. Cartera configurara politica y corrida financiera.`
          : `${completedItems.length} linea${completedItems.length === 1 ? '' : 's'} registrada${completedItems.length === 1 ? '' : 's'} en POS. Inventario actualizado para productos stock.`,
        actor: currentShift.cashierName,
        badge: formatCurrency(completedTotals.total),
        tone: 'success',
      });

      const syncTasks: Promise<void>[] = [];
      if (refreshRegisterContext) {
        syncTasks.push(refreshRegisterContext());
      }
      if (syncCheckoutData) {
        syncTasks.push(syncCheckoutData());
      }

      const syncResults = await Promise.allSettled(syncTasks);
      if (syncResults.some((result) => result.status === 'rejected')) {
        console.warn('[POS] Checkout saved, but post-checkout data sync failed.', syncResults);
        setCheckoutNotice(
          `Venta ${saleNumber} guardada. Actualiza la vista si no ves el comprobante comercial o el movimiento de inventario al momento.`,
        );
      }

      if (closesAsCredit && response.ticket.salesRecordId && onCreditCheckoutCompleted) {
        onCreditCheckoutCompleted(`sales:${response.ticket.salesRecordId}`, saleNumber);
      }
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
      cashReceived: totals.remaining,
      change: 0,
    };

    setPayments((currentPayments) => [...currentPayments, exactPayment]);
    setCheckoutNotice('Pago exacto agregado. Finaliza la venta para cerrar el cobro.');
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
    confirmWorkspacePayment,
    removePayment,
    completeSale,
    handleExactPayment,
  };
}
