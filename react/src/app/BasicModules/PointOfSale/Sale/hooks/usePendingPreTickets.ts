import { useCallback, useEffect, useRef, useState } from 'react';
import { usePointOfSaleKioskTranslations } from '../../Kiosks/kioskTranslations';
import type { Product } from '../../shared/commercial/products';
import type { PreTicket } from '../../shared/commercial/pretickets';
import { selfServiceKioskApi, type SelfServicePreticket } from '../../SelfServiceKiosk/selfServiceKioskApi';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import { resolvePreticketProductRequests } from '../utils/preticketQueuePolicy';
import type { CartBatchResult } from './useSaleCart';

interface UsePendingPreTicketsOptions {
  cashRegisterId?: number;
  products: Product[];
  addProductsToCart: (requests: Array<{ product: Product; quantity: number }>) => CartBatchResult;
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
}

const toPreTicket = (source: SelfServicePreticket): PreTicket => ({
  id: String(source.id),
  code: source.claimCode || source.preticketNumber,
  customerName: source.customerName || '',
  advisorName: '',
  createdAt: new Date(source.createdAt),
  businessName: source.cashRegisterName,
  items: source.items.map((item) => ({
    productId: String(item.productId),
    name: item.productName,
    quantity: Number(item.quantity),
    price: Number(item.unitPrice),
  })),
  total: Number(source.totalAmount),
  status: 'pending',
});

export function usePendingPreTickets({
  cashRegisterId,
  products,
  addProductsToCart,
  pushActivity,
  formatCurrency,
}: UsePendingPreTicketsOptions) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [queue, setQueue] = useState<{ cashRegisterId?: number; items: PreTicket[] }>({ items: [] });
  const [queueError, setQueueError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [claimingPreTicketIds, setClaimingPreTicketIds] = useState<string[]>([]);
  const requestSequence = useRef(0);
  const claimLocks = useRef(new Set<string>());
  const activeCashRegister = useRef(cashRegisterId);
  activeCashRegister.current = cashRegisterId;
  const preTickets = queue.cashRegisterId === cashRegisterId ? queue.items : [];

  const reloadPreTickets = useCallback(async () => {
    if (!cashRegisterId || !Number.isFinite(cashRegisterId)) {
      requestSequence.current += 1;
      setQueue({ cashRegisterId, items: [] });
      setQueueError(false);
      setIsRefreshing(false);
      setLastUpdatedAt(null);
      return;
    }
    const requestedRegisterId = cashRegisterId;
    const requestId = ++requestSequence.current;
    setIsRefreshing(true);
    try {
      const response = await selfServiceKioskApi.pendingPretickets(requestedRegisterId);
      if (requestId === requestSequence.current
          && activeCashRegister.current === requestedRegisterId) {
        setQueue({ cashRegisterId: requestedRegisterId, items: response.items.map(toPreTicket) });
        setQueueError(false);
        setLastUpdatedAt(new Date());
      }
    } catch {
      if (requestId === requestSequence.current
          && activeCashRegister.current === requestedRegisterId) {
        setQueueError(true);
      }
    } finally {
      if (requestId === requestSequence.current
          && activeCashRegister.current === requestedRegisterId) {
        setIsRefreshing(false);
      }
    }
  }, [cashRegisterId]);

  useEffect(() => {
    requestSequence.current += 1;
    setQueue({ cashRegisterId, items: [] });
    setQueueError(false);
    setLastUpdatedAt(null);
    claimLocks.current.clear();
    setClaimingPreTicketIds([]);
    void reloadPreTickets();
    const intervalId = window.setInterval(() => void reloadPreTickets(), 15_000);
    return () => {
      requestSequence.current += 1;
      window.clearInterval(intervalId);
    };
  }, [reloadPreTickets]);

  const pullPreTicket = async (preTicketId: string) => {
    if (!cashRegisterId || !Number.isFinite(cashRegisterId)) return;
    if (claimLocks.current.has(preTicketId)) return;
    const requestedRegisterId = cashRegisterId;
    const preTicket = preTickets.find((candidate) => candidate.id === preTicketId);
    if (!preTicket) return;
    claimLocks.current.add(preTicketId);
    setClaimingPreTicketIds((current) => [...current, preTicketId]);
    let claimNeedsRelease = false;

    try {
      const availableLines = resolvePreticketProductRequests(preTicket.items, products);
      if (!availableLines.ok) {
        pushActivity({
          type: 'sale',
          title: copy.pendingPretickets.reviewTitle,
          description: copy.pendingPretickets.reviewDescription(preTicket.code),
          actor: copy.pendingPretickets.engineActor,
          badge: copy.pendingPretickets.reviewBadge,
          tone: 'warning',
        });
        return;
      }

      const claimed = await selfServiceKioskApi.claimPreticket(
        Number(preTicketId), requestedRegisterId,
      );
      claimNeedsRelease = true;
      if (activeCashRegister.current !== requestedRegisterId) {
        await selfServiceKioskApi.releasePreticket(Number(preTicketId), requestedRegisterId)
          .catch(() => undefined);
        claimNeedsRelease = false;
        return;
      }
      const resolvedClaim = resolvePreticketProductRequests(claimed.items, products);
      if (!resolvedClaim.ok) {
        await selfServiceKioskApi.releasePreticket(Number(preTicketId), requestedRegisterId)
          .catch(() => undefined);
        claimNeedsRelease = false;
        pushActivity({
          type: 'sale',
          title: copy.pendingPretickets.reviewTitle,
          description: copy.pendingPretickets.claimErrorDescription,
          actor: copy.pendingPretickets.engineActor,
          badge: copy.pendingPretickets.reviewBadge,
          tone: 'warning',
        });
        return;
      }

      const cartResult = addProductsToCart(resolvedClaim.requests);
      if (cartResult.addedCount !== resolvedClaim.requests.length) {
        await selfServiceKioskApi.releasePreticket(Number(preTicketId), requestedRegisterId)
          .catch(() => undefined);
        claimNeedsRelease = false;
        throw new Error('PRETICKET_CART_REJECTED');
      }
      claimNeedsRelease = false;
      setQueue((current) => current.cashRegisterId === requestedRegisterId
        ? { ...current, items: current.items.filter((candidate) => candidate.id !== preTicketId) }
        : current);
      pushActivity({
        type: 'sale',
        title: cartResult.insufficientStock.length > 0
          ? copy.pendingPretickets.reviewTitle
          : copy.pendingPretickets.loadedTitle,
        description: copy.pendingPretickets.loadedDescription(
          preTicket.code, preTicket.items.length, formatCurrency(preTicket.total),
        ),
        actor: preTicket.customerName || copy.pendingPretickets.customerFallback,
        badge: cartResult.insufficientStock.length > 0
          ? copy.pendingPretickets.reviewBadge
          : copy.pendingPretickets.serviceBadge,
        tone: cartResult.insufficientStock.length > 0 ? 'warning' : 'info',
      });
    } catch {
      if (claimNeedsRelease) {
        await selfServiceKioskApi.releasePreticket(Number(preTicketId), requestedRegisterId)
          .catch(() => undefined);
      }
      pushActivity({
        type: 'sale',
        title: copy.pendingPretickets.claimErrorTitle,
        description: copy.pendingPretickets.claimErrorDescription,
        actor: copy.pendingPretickets.engineActor,
        badge: copy.pendingPretickets.unavailableBadge,
        tone: 'warning',
      });
      void reloadPreTickets();
    } finally {
      claimLocks.current.delete(preTicketId);
      setClaimingPreTicketIds((current) => current.filter((id) => id !== preTicketId));
    }
  };

  return {
    preTickets,
    pullPreTicket,
    reloadPreTickets,
    queueError,
    isRefreshing,
    lastUpdatedAt,
    claimingPreTicketIds,
  };
}
