import { useEffect, useMemo } from 'react';
import {
  customerDisplayApi,
  type CustomerDisplayPayment,
  type CustomerDisplaySnapshotPayload,
  type CustomerDisplayStatus,
} from '../../shared/customerDisplay/customerDisplayApi';
import type { Payment, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import type { SaleTotals } from '../utils/saleCalculations';

const publishDelayMs = 350;

interface UseCustomerDisplayPublisherParams {
  cart: SaleItem[];
  payments: Payment[];
  totals: SaleTotals;
  currentShift: Shift | null;
  currencyCode: string;
}

export function useCustomerDisplayPublisher({
  cart,
  payments,
  totals,
  currentShift,
  currencyCode,
}: UseCustomerDisplayPublisherParams) {
  const snapshot = useMemo(() => {
    if (!currentShift) {
      return null;
    }
    const status = resolveStatus(cart.length, totals.isPaid);
    const payload: CustomerDisplaySnapshotPayload = {
      cashRegisterId: Number(currentShift.cashRegisterId),
      shiftId: Number(currentShift.id),
      status,
      currencyCode: (currencyCode || currentShift.currencyCode || 'MXN').trim().toUpperCase(),
      items: cart.map((item) => {
        const baseSubtotal = item.price * item.quantity;
        return {
          productName: item.name,
          sku: item.sku ?? null,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: Math.max(baseSubtotal - item.subtotal, 0),
          taxAmount: item.tax,
          lineTotalAmount: item.total,
        };
      }),
      payments: payments.map(toDisplayPayment),
      subtotalAmount: totals.subtotal,
      discountAmount: cart.reduce((sum, item) => sum + Math.max((item.price * item.quantity) - item.subtotal, 0), 0),
      taxAmount: totals.tax,
      totalAmount: totals.total,
      paidAmount: totals.paid,
      changeAmount: totals.change,
      balanceAmount: Math.max(totals.remaining, 0),
      ticketNumber: null,
      customerMessage: status === 'IDLE'
        ? 'Caja lista'
        : status === 'PAID'
        ? 'Pago completo'
        : 'Revisa tus productos y total en pantalla',
    };
    return payload;
  }, [cart, currencyCode, currentShift, payments, totals]);

  const snapshotKey = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  useEffect(() => {
    if (!snapshot || Number.isNaN(snapshot.cashRegisterId) || Number.isNaN(snapshot.shiftId)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      customerDisplayApi.publishState(snapshot).catch((error) => {
        console.warn('[PointOfSale] Customer display snapshot could not be published.', error);
      });
    }, publishDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [snapshot, snapshotKey]);
}

function resolveStatus(cartItemCount: number, isPaid: boolean): CustomerDisplayStatus {
  if (cartItemCount === 0) {
    return 'IDLE';
  }
  return isPaid ? 'PAID' : 'ACTIVE';
}

function toDisplayPayment(payment: Payment): CustomerDisplayPayment {
  return {
    paymentMethod: payment.method.trim().toUpperCase(),
    amount: payment.amount,
  };
}
