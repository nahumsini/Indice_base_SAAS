import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Product } from '../../shared/commercial/products';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import type { CreditPaymentDetails, Payment, PaymentMethod, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import { posBackendApi, type PosCheckoutResponse, type PosSquareTerminalPaymentResponse } from '../services/posBackendApi';
import { createSquareTerminalPaymentAndWait } from '../services/squareTerminalPaymentClient';
import {
  clearSquareTerminalAttempt,
  matchesSquareTerminalDraft,
  type SquareTerminalAttempt,
  type SquareTerminalAttemptScope,
} from '../services/squareTerminalAttemptStore';
import {
  squareTerminalRecoveryCopyByLocale,
  type SquareTerminalRecoveryCopy,
} from '../services/squareTerminalRecoveryCopy';
import { mercadoPagoTerminalApi } from '../services/mercadoPagoTerminalApi';
import { cartIdentity, dispatchCardTerminalPayment } from '../services/mercadoPagoTerminalWorkflow';
import { useMercadoPagoTerminalCheckout } from './useMercadoPagoTerminalCheckout';
import { useMercadoPagoTerminalCopy } from '../../CashRegisters/useMercadoPagoTerminalCopy';
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
  squareRecoveryBlocked?: boolean;
  squareTerminalCopy?: SquareTerminalRecoveryCopy;
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

const saleItemsFromBackend = (response: PosCheckoutResponse): SaleItem[] => (
  response.items.map((item) => {
    const quantity = toNumber(item.quantity);
    const total = toNumber(item.lineTotalAmount);
    const tax = toNumber(item.taxAmount);
    const subtotal = Math.max(total - tax, 0);
    const unitPrice = toNumber(item.unitPrice);
    return {
      id: `ticket-item-${item.id}`,
      productId: item.productId == null ? `ticket-item-${item.id}` : String(item.productId),
      sku: item.skuSnapshot ?? undefined,
      name: item.productNameSnapshot,
      price: unitPrice,
      quantity,
      discount: toNumber(item.discountAmount),
      discountType: 'fixed',
      subtotal,
      tax,
      total,
      taxRate: subtotal > 0 ? toMoney((tax / subtotal) * 100) : 0,
      currency: item.currencyCode,
    };
  })
);

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
  squareRecoveryBlocked = false,
  squareTerminalCopy = squareTerminalRecoveryCopyByLocale['en-CA'],
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
  const squareSaleSnapshot = useRef<{ items: SaleItem[]; totals: SaleTotals; identity: string } | null>(null);
  const completedSquareIntents = useRef(new Set<number>());
  const cardDispatchBusy = useRef(false);
  const [lookingUpTerminal, setLookingUpTerminal] = useState(false);
  const { copy: terminalCopy } = useMercadoPagoTerminalCopy();
  const draftIdentity = JSON.stringify([cartIdentity(cart), customerId ?? null, preticketId ?? null, restaurantOrderId ?? null, currency]);
  const squareScope: SquareTerminalAttemptScope | null = currentShift ? {
    companyId: currentShift.companyId,
    cashRegisterId: currentShift.cashRegisterId,
    shiftId: currentShift.id,
  } : null;
  const squareScopeKey = squareScope ? `${squareScope.companyId}:${squareScope.cashRegisterId}:${squareScope.shiftId}` : '';
  const latestDraft = useRef({ identity: draftIdentity, shiftId: currentShift?.id, squareScopeKey });
  latestDraft.current = { identity: draftIdentity, shiftId: currentShift?.id, squareScopeKey };

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
    if (isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked || cardDispatchBusy.current) {
      setCheckoutNotice(squareRecoveryBlocked
        ? squareTerminalCopy.blocked
        : 'La venta se esta guardando. Espera a que termine el proceso.');
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
    if (isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked || cardDispatchBusy.current) return;

    if (selectedPaymentMethod === 'card') {
      void startCardPayment(amount);
      closeAddPaymentModal();
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
    if (isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked || cardDispatchBusy.current) return;
    if (method === 'card') {
      void startCardPayment(amount);
      return;
    }

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

  const handleCheckoutSaved = async (
    response: PosCheckoutResponse,
    completedItems: SaleItem[],
    completedPayments: Payment[],
    saleTotals: SaleTotals,
    closesAsCredit: boolean,
    preserveDraft = false,
  ) => {
    if (!currentShift) return;
    const cashPayment = completedPayments
      .filter((payment) => payment.method === 'cash')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const cardPayment = completedPayments
      .filter((payment) => payment.method === 'card')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const transferPayment = completedPayments
      .filter((payment) => payment.method === 'transfer')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const saleNumber = response.printableSummary.ticketNumber || response.ticket.ticketNumber;
    const completedTotals = totalsFromBackend(response, saleTotals);

    setLastSale({ saleNumber, items: completedItems, payments: completedPayments, totals: completedTotals });
    if (!preserveDraft) setCurrentShift((existingShift) => {
      if (!existingShift || existingShift.id !== currentShift.id) return existingShift;
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

    if (!preserveDraft) {
      resetCart();
      clearPayments();
      onCheckoutCompleted?.();
    }
    setCheckoutNotice(closesAsCredit
      ? `Venta ${saleNumber} guardada como credito. Abriendo Cartera para configurar la venta a credito.`
      : `Venta ${saleNumber} guardada. Los productos con inventario descuentan stock automaticamente; servicios, digitales y lineas custom no afectan inventario.`);
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
    if (refreshRegisterContext) syncTasks.push(refreshRegisterContext());
    if (syncCheckoutData) syncTasks.push(syncCheckoutData());
    const syncResults = await Promise.allSettled(syncTasks);
    if (syncResults.some((result) => result.status === 'rejected')) {
      console.warn('[POS] Checkout saved, but post-checkout data sync failed.', syncResults);
      setCheckoutNotice(`Venta ${saleNumber} guardada. Actualiza la vista si no ves el comprobante comercial o el movimiento de inventario al momento.`);
    }
    if (closesAsCredit && response.ticket.salesRecordId && onCreditCheckoutCompleted) {
      onCreditCheckoutCompleted(`sales:${response.ticket.salesRecordId}`, saleNumber);
    }
  };

  const mercadoPago = useMercadoPagoTerminalCheckout({
    cart, draftIdentity, currentShift, setNotice: setCheckoutNotice,
    onCompleted: async (terminal, snapshot, matchesCart) => {
      if (!terminal.checkout) return;
      const payment: Payment = { id: `mercado-pago-${terminal.intentId}`, method: 'card', amount: toNumber(terminal.amount), reference: `Mercado Pago ${terminal.paymentId ?? terminal.orderId ?? terminal.intentId}` };
      await handleCheckoutSaved(terminal.checkout, matchesCart && snapshot ? snapshot.items : saleItemsFromBackend(terminal.checkout), [payment], snapshot?.totals ?? totals, false, !matchesCart);
    },
  });

  const consumeSquareTerminalResult = async (
    terminal: PosSquareTerminalPaymentResponse,
    attempt?: SquareTerminalAttempt,
    snapshot = squareSaleSnapshot.current,
  ) => {
    const linkedStatus = ['approved', 'partially_refunded', 'refunded'].includes(String(terminal.status).toLowerCase());
    if (!linkedStatus || !terminal.checkout) return false;
    if (completedSquareIntents.current.has(terminal.intentId)) {
      if (attempt && squareScope) clearSquareTerminalAttempt(squareScope, attempt.requestKey);
      return true;
    }
    const selected = latestDraft.current;
    const stillSelected = () => selected.identity === latestDraft.current.identity
      && selected.shiftId === latestDraft.current.shiftId
      && selected.squareScopeKey === latestDraft.current.squareScopeKey
      && selected.squareScopeKey === squareScopeKey;
    const matchesCurrent = Boolean(attempt && squareScope && selected.squareScopeKey === squareScopeKey
      && await matchesSquareTerminalDraft(attempt, selected.identity)
      && stillSelected());
    const snapshotMatches = Boolean(attempt && snapshot
      && await matchesSquareTerminalDraft(attempt, snapshot.identity));
    const payment: Payment = {
      id: `square-${terminal.intentId}`, method: 'card', amount: toNumber(terminal.amount),
      reference: `Square ${terminal.squarePaymentId ?? terminal.squareCheckoutId ?? terminal.intentId}`,
    };
    const consumeCurrentDraft = matchesCurrent && stillSelected();
    completedSquareIntents.current.add(terminal.intentId);
    try {
      await handleCheckoutSaved(terminal.checkout,
        snapshotMatches && snapshot ? snapshot.items : saleItemsFromBackend(terminal.checkout),
        [payment], snapshotMatches && snapshot ? snapshot.totals : totalsFromBackend(terminal.checkout, totals),
        false, !consumeCurrentDraft);
    } catch (error) {
      completedSquareIntents.current.delete(terminal.intentId);
      throw error;
    }
    if (attempt && squareScope) clearSquareTerminalAttempt(squareScope, attempt.requestKey);
    setCheckoutNotice(squareTerminalCopy.linked);
    return true;
  };

  const startCardPayment = async (requestedAmount: number) => {
    if (cardDispatchBusy.current || isCompletingSale || mercadoPago.blocked || squareRecoveryBlocked || mercadoPago.isCompletedDraft()) {
      setCheckoutNotice(squareRecoveryBlocked
        ? squareTerminalCopy.blockedCharge
        : terminalCopy.recoveryHelp);
      return;
    }
    const registerId = currentShift && toBackendId(currentShift.cashRegisterId);
    if (!registerId) { setCheckoutNotice(terminalCopy.noProvider); return; }
    cardDispatchBusy.current = true;
    setLookingUpTerminal(true);
    const originalDraft = latestDraft.current;
    const verifyDraft = () => {
      if (originalDraft.identity !== latestDraft.current.identity || originalDraft.shiftId !== latestDraft.current.shiftId
        || originalDraft.squareScopeKey !== latestDraft.current.squareScopeKey) throw new Error('PAYMENT_DRAFT_CHANGED');
    };
    try {
      await dispatchCardTerminalPayment(
        () => mercadoPagoTerminalApi.binding(registerId),
        () => { verifyDraft(); return startSquareCardPayment(requestedAmount); },
        async () => {
          verifyDraft();
          if (!currentShift || !cart.length || payments.length || !moneyEquals(requestedAmount, totals.total) || currency.trim().toUpperCase() !== 'MXN' || currentShift.currencyCode.trim().toUpperCase() !== 'MXN') {
            setCheckoutNotice(terminalCopy.mxnOnly); return;
          }
          const hasInventoryItems = cart.some((item) => products.find((product) => product.id === item.productId)?.useInventory === true);
          if (hasInventoryItems && (inventoryBalancesLoading || inventoryBalancesError)) { setCheckoutNotice(inventoryBalancesError || 'Espera a que terminen de cargar las existencias del almacén antes de cobrar.'); return; }
          const completedItems = cart.map((item) => ({ ...item }));
          await mercadoPago.start({ cashRegisterId: registerId, customerId: toBackendId(customerId), preticketId: preticketId ?? null, restaurantOrderId: restaurantOrderId ?? null, currencyCode: 'MXN', items: toPosCheckoutItems(completedItems, products), notes: `POS Mercado Pago Point checkout · caja ${currentShift.cashRegisterCode}` }, { items: completedItems, totals, identity: JSON.stringify([cartIdentity(completedItems), customerId ?? null, preticketId ?? null, restaurantOrderId ?? null, currency]) });
        },
      );
    } catch { setCheckoutNotice(terminalCopy.noProvider); }
    finally { cardDispatchBusy.current = false; setLookingUpTerminal(false); }
  };

  const startSquareCardPayment = async (requestedAmount: number) => {
    if (isCompletingSale) return;
    if (cart.length === 0) {
      setCheckoutNotice('Agrega productos al ticket antes de cobrar.');
      return;
    }
    if (payments.length > 0 || !moneyEquals(requestedAmount, totals.total)) {
      setCheckoutNotice(squareTerminalCopy.fullCard);
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
    if (!currentShift) {
      setCheckoutNotice('No hay turno activo.');
      return;
    }

    const cashRegisterId = toBackendId(currentShift.cashRegisterId);
    const checkoutCurrency = currency.trim().toUpperCase();
    const shiftCurrency = currentShift.currencyCode?.trim().toUpperCase();
    if (!cashRegisterId) {
      setCheckoutNotice('No hay una caja valida seleccionada para cobrar.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(checkoutCurrency)) {
      setCheckoutNotice('No hay una divisa valida para guardar la venta.');
      return;
    }
    if (shiftCurrency && shiftCurrency !== checkoutCurrency) {
      setCheckoutNotice(`El turno actual esta abierto en ${shiftCurrency}, pero la venta esta configurada en ${checkoutCurrency}. Cierra este turno y abre caja en ${checkoutCurrency}, o cambia el pais fiscal para usar ${shiftCurrency}.`);
      return;
    }

    const completedItems = [...cart];
    const completedIdentity = JSON.stringify([cartIdentity(completedItems), customerId ?? null,
      preticketId ?? null, restaurantOrderId ?? null, currency]);
    squareSaleSnapshot.current = { items: completedItems, totals, identity: completedIdentity };
    setIsCompletingSale(true);
    setCheckoutNotice('');
    try {
      if (!squareScope) return;
      const result = await createSquareTerminalPaymentAndWait({
        cashRegisterId,
        customerId: toBackendId(customerId),
        preticketId: preticketId ?? null,
        restaurantOrderId: restaurantOrderId ?? null,
        currencyCode: checkoutCurrency,
        items: toPosCheckoutItems(completedItems, products),
        notes: `POS Square Terminal checkout · caja ${currentShift.cashRegisterCode}`,
      }, { scope: squareScope, draftIdentity: completedIdentity, copy: squareTerminalCopy },
      (message) => setCheckoutNotice(message));
      const terminal = result.response;
      if (!(await consumeSquareTerminalResult(terminal, result.attempt))) {
        setCheckoutNotice(String(terminal.status).toLowerCase() === 'refunded' && !terminal.posTicketId
          ? squareTerminalCopy.refundedReleased : terminal.message || squareTerminalCopy.pending);
      }
    } catch (error) {
      setCheckoutNotice(error instanceof Error && error.message === 'SQUARE_DIFFERENT_DRAFT_PENDING'
        ? squareTerminalCopy.differentDraft
        : getPosRequestErrorMessage(error, squareTerminalCopy.chargeError));
    } finally {
      squareSaleSnapshot.current = null;
      setIsCompletingSale(false);
    }
  };

  const recoverSquareTerminalIntent = async (intentId: number | string,
    attempt?: SquareTerminalAttempt): Promise<PosSquareTerminalPaymentResponse | null> => {
    if (isCompletingSale || !currentShift) return null;
    setIsCompletingSale(true);
    setCheckoutNotice(squareTerminalCopy.recovering);
    try {
      const terminal = await posBackendApi.recoverSquareTerminalPayment(intentId);
      const status = String(terminal.status).toLowerCase();
      if (['approved', 'partially_refunded', 'refunded'].includes(status) && terminal.checkout) {
        await consumeSquareTerminalResult(terminal, attempt, null);
      } else if (['approved', 'partially_refunded', 'refunded'].includes(status) && terminal.posTicketId) {
        setCheckoutNotice(squareTerminalCopy.finalizing);
        const syncTasks = [refreshRegisterContext?.(), syncCheckoutData?.()]
          .filter((task): task is Promise<void> => Boolean(task));
        await Promise.allSettled(syncTasks);
      } else {
        setCheckoutNotice(terminal.message || squareTerminalCopy.pending);
      }
      return terminal;
    } catch (error) {
      setCheckoutNotice(getPosRequestErrorMessage(error, squareTerminalCopy.recoveryError));
      return null;
    } finally {
      setIsCompletingSale(false);
    }
  };

  const consumeSquareTerminalRequestResult = (
    response: PosSquareTerminalPaymentResponse,
    attempt: SquareTerminalAttempt,
  ) => consumeSquareTerminalResult(response, attempt, null);

  const retrySquareTerminalRequest = async () => {
    await startSquareCardPayment(totals.total);
  };

  const completeSale = async (salePayments: Payment[] = payments, saleTotals: SaleTotals = totals) => {
    if (isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked || cardDispatchBusy.current) {
      if (squareRecoveryBlocked) {
        setCheckoutNotice(squareTerminalCopy.blockedSale);
      }
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
    if (completedPayments.some((payment) => payment.method === 'card')) {
      setCheckoutNotice('Card payments must be completed through Square Terminal before the POS sale can close.');
      return;
    }
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
      await handleCheckoutSaved(response, completedItems, completedPayments, saleTotals, closesAsCredit);
    } catch (error) {
      setCheckoutNotice(getPosRequestErrorMessage(error, 'No se pudo guardar la venta en POS.'));
    } finally {
      setIsCompletingSale(false);
    }
  };

  const handleExactPayment = () => {
    if (isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked || cardDispatchBusy.current) {
      setCheckoutNotice(squareRecoveryBlocked
        ? squareTerminalCopy.blockedCash
        : 'La venta se esta guardando. Espera a que termine el proceso.');
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
    isCompletingSale: isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked,
    checkoutBusy: isCompletingSale || lookingUpTerminal,
    paymentActionsBlocked: isCompletingSale || lookingUpTerminal || mercadoPago.blocked || squareRecoveryBlocked,
    mercadoPago,
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
    recoverSquareTerminalIntent,
    consumeSquareTerminalRequestResult,
    retrySquareTerminalRequest,
  };
}
