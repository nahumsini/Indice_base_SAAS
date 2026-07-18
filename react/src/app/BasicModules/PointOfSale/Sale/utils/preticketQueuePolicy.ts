import type { Product } from '../../shared/commercial/products';

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
