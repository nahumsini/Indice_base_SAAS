import { useState } from 'react';
import type { Product } from '../../shared/commercial/products';
import { pendingPreTickets, type PreTicket } from '../../shared/commercial/pretickets';
import type { OperationalActivity } from '../components/OperationalActivityFeed';

interface UsePendingPreTicketsOptions {
  products: Product[];
  addProductsToCart: (requests: Array<{ product: Product; quantity: number }>) => void;
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
}

export function usePendingPreTickets({
  products,
  addProductsToCart,
  pushActivity,
  formatCurrency,
}: UsePendingPreTicketsOptions) {
  const [preTickets, setPreTickets] = useState<PreTicket[]>(pendingPreTickets);

  const pullPreTicket = (preTicketId: string) => {
    const preTicket = preTickets.find((candidate) => candidate.id === preTicketId);
    if (!preTicket) {
      return;
    }

    const requests = preTicket.items
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter((request): request is { product: Product; quantity: number } => Boolean(request));

    addProductsToCart(requests);
    setPreTickets((current) => current.filter((candidate) => candidate.id !== preTicketId));
    pushActivity({
      type: 'sale',
      title: 'Preventa cargada',
      description: `${preTicket.code} · ${preTicket.items.length} lineas · ${formatCurrency(preTicket.total)}`,
      actor: preTicket.advisorName,
      badge: 'Preventa',
      tone: 'info',
    });
  };

  return {
    preTickets,
    pullPreTicket,
  };
}
