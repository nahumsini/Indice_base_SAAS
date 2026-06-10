import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { Product } from '../../shared/commercial/products';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import type { Payment, PaymentMethod, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
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
}

export function useSaleCheckout({
  cart,
  products,
  currentShift,
  setCurrentShift,
  resetCart,
  pushActivity,
  formatCurrency,
}: UseSaleCheckoutOptions) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [, setCashReceived] = useState(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
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
    if (cart.length === 0) {
      alert('No hay productos en la venta');
      return;
    }

    if (totals.isPaid) {
      alert('El pago ya está completo');
      return;
    }

    setSelectedPaymentMethod(method);
    setShowAddPaymentModal(true);
  };

  const confirmAddPayment = (amount: number, reference?: string, receivedCash?: number) => {
    if (!selectedPaymentMethod) {
      return;
    }

    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      method: selectedPaymentMethod,
      amount,
      reference,
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

  const completeSale = (salePayments: Payment[] = payments, saleTotals: SaleTotals = totals) => {
    if (!saleTotals.isPaid) {
      alert('El pago no está completo. Agrega más pagos para cubrir el total.');
      return;
    }

    if (!currentShift) {
      alert('No hay turno activo');
      return;
    }

    const saleNumber = `V${currentShift.id.slice(-6).toUpperCase()}-${String(currentShift.sales + 1).padStart(4, '0')}`;

    setLastSale({
      saleNumber,
      items: [...cart],
      payments: [...salePayments],
      totals: { ...saleTotals },
    });

    const cashPayment = salePayments
      .filter((payment) => payment.method === 'cash')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const cardPayment = salePayments
      .filter((payment) => payment.method === 'card')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const transferPayment = salePayments
      .filter((payment) => payment.method === 'transfer')
      .reduce((sum, payment) => sum + payment.amount, 0);

    setCurrentShift({
      ...currentShift,
      sales: currentShift.sales + 1,
      totalSales: currentShift.totalSales + saleTotals.total,
      expectedCash: currentShift.expectedCash + cashPayment,
      cashSales: currentShift.cashSales + cashPayment,
      cardSales: currentShift.cardSales + cardPayment,
      transferSales: currentShift.transferSales + transferPayment,
    });

    cart.forEach((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (product && product.useInventory) {
        console.log(`Decrease stock: ${product.name} by ${item.quantity}`);
      }
    });

    resetCart();
    clearPayments();
    setShowTicketModal(true);
    pushActivity({
      type: 'sale',
      title: 'Venta completada',
      description: `${cart.length} linea${cart.length === 1 ? '' : 's'} cobrada${cart.length === 1 ? '' : 's'} por ${currentShift.cashierName}`,
      actor: currentShift.cashierName,
      badge: formatCurrency(saleTotals.total),
      tone: 'success',
    });
  };

  const handleExactPayment = () => {
    if (cart.length === 0) {
      alert('No hay productos en la venta');
      return;
    }

    if (totals.isPaid) {
      alert('El pago ya está completo');
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
      completeSale(nextPayments, nextTotals);
    }, 100);
  };

  return {
    payments,
    setPayments,
    setCashReceived,
    totals,
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
