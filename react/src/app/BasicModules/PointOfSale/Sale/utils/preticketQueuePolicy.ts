import type { Product } from '../../shared/commercial/products';
import type { SelfServicePreticket } from '../../SelfServiceKiosk/selfServiceKioskApi';
import type { PreticketCartLineRequest } from '../hooks/useSaleCart';

export type PreticketProductRequest = { product: Product; quantity: number };

export function resolvePreticketProductRequests(
  items: Array<{ productId: string | number; quantity: string | number }>,
  products: Product[],
): { ok: true; requests: PreticketProductRequest[] } | { ok: false; requests: [] } {
  const requests: PreticketProductRequest[] = [];
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const product = products.find((candidate) => (
      candidate.salesProductBackendId === productId
      || candidate.id === String(item.productId)
    ));
    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, requests: [] };
    }
    requests.push({ product, quantity });
  }
  return { ok: true, requests };
}

const money = (value: number) => Math.round(value * 100) / 100;

export function cartLinesFromPreticket(
  preticket: SelfServicePreticket,
  requests: Array<{ product: Product; quantity: number }>,
): PreticketCartLineRequest[] {
  const orderRuleId = preticket.discountRuleId == null ? null : Number(preticket.discountRuleId);
  const orderDiscountCents = orderRuleId == null ? 0 : Math.round(Number(preticket.discountAmount) * 100);
  const baseCents = preticket.items.map((item) => (
    Math.round(Number(item.unitPrice) * Number(item.quantity) * 100)
  ));
  const totalBaseCents = baseCents.reduce((sum, value) => sum + value, 0);
  let allocatedCents = 0;

  return preticket.items.map((item, index) => {
    let discountAmount = money(Number(item.discountAmount));
    let discountRuleId = item.discountRuleId == null ? null : Number(item.discountRuleId);
    if (orderRuleId != null) {
      const isLast = index === preticket.items.length - 1;
      const cents = isLast
        ? orderDiscountCents - allocatedCents
        : Math.round(orderDiscountCents * (baseCents[index] / Math.max(totalBaseCents, 1)));
      allocatedCents += cents;
      discountAmount = cents / 100;
      discountRuleId = orderRuleId;
    }
    return {
      product: requests[index].product,
      quantity: Number(item.quantity),
      unitPrice: money(Number(item.unitPrice)),
      discountAmount,
      discountRuleId,
    };
  });
}
