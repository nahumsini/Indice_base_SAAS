import type { PreTicket } from '../types';

export function getPreTicketItemCount(preTicket: PreTicket) {
  return preTicket.items.reduce((sum, item) => sum + item.quantity, 0);
}
