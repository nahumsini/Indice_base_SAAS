import { useCallback, useEffect, useRef, useState } from 'react';
import { usePointOfSaleKioskTranslations } from '../../Kiosks/kioskTranslations';
import type { Product } from '../../shared/commercial/products';
import type { PreTicket } from '../../shared/commercial/pretickets';
import { selfServiceKioskApi, type SelfServicePreticket } from '../../SelfServiceKiosk/selfServiceKioskApi';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import { cartLinesFromPreticket, resolvePreticketProductRequests } from '../utils/preticketQueuePolicy';
import type { CartBatchResult, PreticketCartLineRequest } from './useSaleCart';

interface UsePendingPreTicketsOptions {
  cashRegisterId?: number;
  products: Product[];
  cartHasItems: boolean;
  replaceCartWithPreticket: (requests: PreticketCartLineRequest[]) => CartBatchResult;
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
  cartHasItems,
  replaceCartWithPreticket,
  pushActivity,
  formatCurrency,
}: UsePendingPreTicketsOptions) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [queue, setQueue] = useState<{ cashRegisterId?: number; items: PreTicket[] }>({ items: [] });
  const [queueError, setQueueError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [claimingPreTicketIds, setClaimingPreTicketIds] = useState<string[]>([]);
  const [activePreticket, setActivePreticket] = useState<SelfServicePreticket | null>(null);
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
    if (claimLocks.current.size > 0 || claimLocks.current.has(preTicketId)) return;
    const requestedRegisterId = cashRegisterId;
    const preTicket = preTickets.find((candidate) => candidate.id === preTicketId);
    if (!preTicket) return;
    if (cartHasItems || activePreticket) {
      pushActivity({
        type: 'sale',
        title: 'Termina el ticket actual',
        description: 'Cancela o cobra el ticket activo antes de cargar un pedido de kiosco.',
        actor: copy.pendingPretickets.engineActor,
        badge: 'Ticket ocupado',
        tone: 'warning',
      });
      return;
    }
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

      const cartResult = replaceCartWithPreticket(cartLinesFromPreticket(claimed, resolvedClaim.requests));
      if (cartResult.addedCount !== resolvedClaim.requests.length) {
        await selfServiceKioskApi.releasePreticket(Number(preTicketId), requestedRegisterId)
          .catch(() => undefined);
        claimNeedsRelease = false;
        throw new Error('PRETICKET_CART_REJECTED');
      }
      claimNeedsRelease = false;
      setActivePreticket(claimed);
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

  const releaseActivePreticket = async () => {
    if (!activePreticket) return true;
    try {
      await selfServiceKioskApi.releasePreticket(activePreticket.id, activePreticket.cashRegisterId);
      setActivePreticket(null);
      void reloadPreTickets();
      return true;
    } catch {
      pushActivity({
        type: 'sale',
        title: 'No se pudo liberar el preticket',
        description: 'El ticket permanece reservado para evitar que otro cajero lo cobre al mismo tiempo.',
        actor: copy.pendingPretickets.engineActor,
        badge: copy.pendingPretickets.unavailableBadge,
        tone: 'warning',
      });
      return false;
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
    activePreticketId: activePreticket?.id,
    activePreticketCode: activePreticket?.claimCode || activePreticket?.preticketNumber,
    releaseActivePreticket,
    completeActivePreticket: () => setActivePreticket(null),
  };
}
