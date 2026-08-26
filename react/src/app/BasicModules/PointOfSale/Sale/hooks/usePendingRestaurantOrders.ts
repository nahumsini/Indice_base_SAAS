import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../../../lib/apiClient';
import type { Product } from '../../shared/commercial/products';
import type { PreTicket } from '../../shared/commercial/pretickets';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import { resolvePreticketProductRequests } from '../utils/preticketQueuePolicy';
import type { CartBatchResult, PreticketCartLineRequest } from './useSaleCart';

type PendingRestaurantOrder = {
  id: number; orderNumber: string; currencyCode: string; totalAmount: number | string;
  guestCount: number; tableName: string; ecosystemName: string; itemCount: number;
  status: string; createdAt: string;
};
type ClaimedRestaurantOrder = {
  id: number; orderNumber: string; currencyCode: string; cashRegisterId: number;
  items: Array<{ productId: number; sku?: string; name: string; quantity: number | string; unitPrice: number | string; lineTotal: number | string }>;
};

export function usePendingRestaurantOrders({
  cashRegisterId,
  products,
  cartHasItems,
  replaceCart,
  pushActivity,
}: {
  cashRegisterId?: number;
  products: Product[];
  cartHasItems: boolean;
  replaceCart: (requests: PreticketCartLineRequest[]) => CartBatchResult;
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
}) {
  const [source, setSource] = useState<PendingRestaurantOrder[]>([]);
  const [active, setActive] = useState<ClaimedRestaurantOrder | null>(null);
  const [claimingIds, setClaimingIds] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const locks = useRef(new Set<number>());

  const reload = useCallback(async () => {
    if (!cashRegisterId) { setSource([]); setError(false); return; }
    try {
      const response = await apiClient<{ items: PendingRestaurantOrder[] }>(`/api/v1/pos/restaurant/checkout/pending?cashRegisterId=${cashRegisterId}`);
      setSource(response.items); setError(false);
    } catch { setError(true); }
  }, [cashRegisterId]);

  useEffect(() => {
    void reload();
    const interval = window.setInterval(() => void reload(), 15_000);
    return () => window.clearInterval(interval);
  }, [reload]);

  const orders: PreTicket[] = source.map(order => ({
    id: `restaurant:${order.id}`,
    code: order.orderNumber,
    customerName: `${order.tableName} · ${order.guestCount} personas`,
    advisorName: order.ecosystemName,
    createdAt: new Date(order.createdAt),
    businessName: order.ecosystemName,
    items: Array.from({ length: order.itemCount }, (_, index) => ({ productId: `restaurant-line-${index}`, name: 'Partida', quantity: 1, price: 0 })),
    total: Number(order.totalAmount),
    status: 'pending',
  }));

  const pull = async (id: string) => {
    if (!cashRegisterId || !id.startsWith('restaurant:') || cartHasItems || active) return;
    const orderId = Number(id.split(':')[1]);
    if (!Number.isFinite(orderId) || locks.current.has(orderId)) return;
    locks.current.add(orderId); setClaimingIds(current => [...current, id]);
    let claimed = false;
    try {
      const order = await apiClient<ClaimedRestaurantOrder>(`/api/v1/pos/restaurant/orders/${orderId}/claim`, {
        method: 'POST', body: JSON.stringify({ cashRegisterId }),
      });
      claimed = true;
      const resolved = resolvePreticketProductRequests(order.items, products);
      if (!resolved.ok) throw new Error('RESTAURANT_PRODUCT_UNAVAILABLE');
      const lines: PreticketCartLineRequest[] = order.items.map((item, index) => ({
        product: resolved.requests[index].product,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountAmount: 0,
        discountRuleId: null,
      }));
      const result = replaceCart(lines);
      if (result.addedCount !== lines.length) throw new Error('RESTAURANT_CART_REJECTED');
      setActive(order);
      setSource(current => current.filter(item => item.id !== orderId));
      pushActivity({ type: 'sale', title: 'Comanda cargada', description: `${order.orderNumber} está reservada para esta caja.`, actor: 'Restaurante', badge: 'Comanda', tone: 'info' });
    } catch {
      if (claimed) await apiClient(`/api/v1/pos/restaurant/orders/${orderId}/release`, { method: 'POST', body: JSON.stringify({ cashRegisterId }) }).catch(() => undefined);
      pushActivity({ type: 'sale', title: 'No se pudo cargar la comanda', description: 'La comanda cambió o contiene productos que ya no están disponibles.', actor: 'Restaurante', badge: 'Revisar', tone: 'warning' });
      void reload();
    } finally {
      locks.current.delete(orderId); setClaimingIds(current => current.filter(value => value !== id));
    }
  };

  const release = async () => {
    if (!active || !cashRegisterId) return true;
    try {
      await apiClient(`/api/v1/pos/restaurant/orders/${active.id}/release`, { method: 'POST', body: JSON.stringify({ cashRegisterId }) });
      setActive(null); void reload(); return true;
    } catch { return false; }
  };

  return {
    orders,
    pull,
    reload,
    error,
    claimingIds,
    activeRestaurantOrderId: active?.id,
    activeRestaurantOrderCode: active?.orderNumber,
    release,
    complete: () => setActive(null),
  };
}
