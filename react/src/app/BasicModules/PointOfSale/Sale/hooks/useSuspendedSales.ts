import { useState, type Dispatch, type SetStateAction } from 'react';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import type { SuspendedSale } from '../components/SuspendedSalesPanel';
import type { Payment, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import type { SaleTotals } from '../utils/saleCalculations';

interface UseSuspendedSalesOptions {
  cart: SaleItem[];
  payments: Payment[];
  totals: SaleTotals;
  currentShift: Shift | null;
  resetCart: () => void;
  setCart: Dispatch<SetStateAction<SaleItem[]>>;
  setPayments: Dispatch<SetStateAction<Payment[]>>;
  setCashReceived: Dispatch<SetStateAction<number>>;
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
}

export function useSuspendedSales({
  cart,
  payments,
  totals,
  currentShift,
  resetCart,
  setCart,
  setPayments,
  setCashReceived,
  pushActivity,
  formatCurrency,
}: UseSuspendedSalesOptions) {
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);

  const suspendCurrentSale = () => {
    if (cart.length === 0) {
      return;
    }

    const suspendedSale: SuspendedSale = {
      id: `suspended-${Date.now()}`,
      title: `Ticket ${suspendedSales.length + 1}`,
      items: [...cart],
      payments: [...payments],
      total: totals.total,
      createdAt: new Date(),
    };

    setSuspendedSales([suspendedSale, ...suspendedSales]);
    resetCart();
    setPayments([]);
    setCashReceived(0);
    pushActivity({
      type: 'sale',
      title: 'Sale suspended',
      description: `${suspendedSale.items.length} lines parked for later recovery`,
      actor: currentShift?.cashierName ?? 'Cashier',
      badge: formatCurrency(suspendedSale.total),
      tone: 'info',
    });
  };

  const resumeSuspendedSale = (saleId: string) => {
    const suspendedSale = suspendedSales.find((sale) => sale.id === saleId);
    if (!suspendedSale) {
      return;
    }

    if ((cart.length > 0 || payments.length > 0) && !confirm('Replace the current ticket with this suspended sale?')) {
      return;
    }

    setCart(suspendedSale.items);
    setPayments(suspendedSale.payments);
    setSuspendedSales(suspendedSales.filter((sale) => sale.id !== saleId));
    pushActivity({
      type: 'sale',
      title: 'Suspended sale resumed',
      description: `${suspendedSale.title} returned to the selling surface`,
      actor: currentShift?.cashierName ?? 'Cashier',
      badge: formatCurrency(suspendedSale.total),
      tone: 'success',
    });
  };

  const discardSuspendedSale = (saleId: string) => {
    setSuspendedSales(suspendedSales.filter((sale) => sale.id !== saleId));
  };

  return {
    suspendedSales,
    suspendCurrentSale,
    resumeSuspendedSale,
    discardSuspendedSale,
  };
}

