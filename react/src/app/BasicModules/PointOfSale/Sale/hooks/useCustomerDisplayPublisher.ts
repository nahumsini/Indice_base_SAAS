import { useEffect, useMemo } from 'react';
import {
  customerDisplayApi,
  type CustomerDisplayPayment,
  type CustomerDisplaySnapshotPayload,
  type CustomerDisplayStatus,
} from '../../shared/customerDisplay/customerDisplayApi';
import type { Payment, PaymentPreview, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import type { SaleTotals } from '../utils/saleCalculations';

const publishDelayMs = 350;

interface UseCustomerDisplayPublisherParams {
  cart: SaleItem[];
  payments: Payment[];
  totals: SaleTotals;
  currentShift: Shift | null;
  currencyCode: string;
  paymentPreview?: PaymentPreview | null;
}

export function useCustomerDisplayPublisher({
  cart,
  payments,
  totals,
  currentShift,
  currencyCode,
  paymentPreview = null,
}: UseCustomerDisplayPublisherParams) {
  const snapshot = useMemo(() => {
    if (!currentShift) {
      return null;
    }
    const status = resolveStatus(cart.length, totals.isPaid, paymentPreview);
    const previewCashReceived = paymentPreview?.method === 'cash'
      ? Math.max(paymentPreview.cashReceived ?? 0, 0)
      : 0;
    const previewAppliedAmount = paymentPreview?.method === 'cash'
      ? Math.min(previewCashReceived, Math.max(paymentPreview.amount, 0))
      : 0;
    const displayPaidAmount = totals.paid + previewCashReceived;
    const displayBalanceAmount = paymentPreview?.method === 'cash'
      ? Math.max(totals.remaining - previewAppliedAmount, 0)
      : Math.max(totals.remaining, 0);
    const previewDisplayPayment: CustomerDisplayPayment | null = paymentPreview
      ? {
          paymentMethod: paymentPreview.method.trim().toUpperCase(),
          amount: Math.max(paymentPreview.amount, 0),
          cashReceived: paymentPreview.method === 'cash' ? previewCashReceived : null,
          changeAmount: paymentPreview.method === 'cash' ? Math.max(paymentPreview.change ?? 0, 0) : null,
          pending: true,
        }
      : null;
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
      payments: [
        ...payments.map(toDisplayPayment),
        ...(previewDisplayPayment ? [previewDisplayPayment] : []),
      ],
      subtotalAmount: totals.subtotal,
      discountAmount: cart.reduce((sum, item) => sum + Math.max((item.price * item.quantity) - item.subtotal, 0), 0),
      taxAmount: totals.tax,
      totalAmount: totals.total,
      paidAmount: paymentPreview?.method === 'cash' ? displayPaidAmount : totals.paid,
      changeAmount: paymentPreview?.method === 'cash'
        ? Math.max(paymentPreview.change ?? 0, 0)
        : totals.change,
      balanceAmount: displayBalanceAmount,
      ticketNumber: null,
      customerMessage: status === 'IDLE'
        ? 'Caja lista'
        : status === 'READY_TO_PAY' && paymentPreview?.method === 'cash'
        ? 'El cajero está registrando tu pago en efectivo'
        : status === 'READY_TO_PAY'
        ? 'El cajero está preparando tu forma de pago'
        : status === 'PAID'
        ? 'Pago completo'
        : 'Revisa tus productos y total en pantalla',
    };
    return payload;
  }, [cart, currencyCode, currentShift, paymentPreview, payments, totals]);

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

function resolveStatus(
  cartItemCount: number,
  isPaid: boolean,
  paymentPreview: PaymentPreview | null,
): CustomerDisplayStatus {
  if (cartItemCount === 0) {
    return 'IDLE';
  }
  if (isPaid) return 'PAID';
  return paymentPreview ? 'READY_TO_PAY' : 'ACTIVE';
}

function toDisplayPayment(payment: Payment): CustomerDisplayPayment {
  return {
    paymentMethod: payment.method.trim().toUpperCase(),
    amount: payment.amount,
    cashReceived: payment.cashReceived ?? null,
    changeAmount: payment.change ?? null,
    pending: false,
  };
}
