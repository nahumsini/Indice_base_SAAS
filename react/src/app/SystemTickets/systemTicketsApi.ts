import { endpoints } from '../api/endpoints';
import { apiClient } from '../lib/apiClient';
import type {
  SystemTicket,
  SystemTicketCreatePayload,
  SystemTicketStatusFilter,
  SystemTicketType,
  SystemTicketUpdatePayload,
  SystemTicketWorkspaceData,
} from './types';

export type SystemTicketPortal = 'distributor' | 'root';

const basePath = (portal: SystemTicketPortal) => (
  portal === 'root'
    ? endpoints.platformAdmin.systemTickets
    : endpoints.distributorPortal.systemTickets
);

export const systemTicketsApi = {
  list: (
    portal: SystemTicketPortal,
    filters: { query: string; status: SystemTicketStatusFilter; type: 'ALL' | SystemTicketType },
  ) => {
    const params = new URLSearchParams({
      q: filters.query,
      status: filters.status,
      type: filters.type,
    });
    return apiClient<SystemTicketWorkspaceData>(`${basePath(portal)}?${params}`);
  },
  create: (portal: SystemTicketPortal, payload: SystemTicketCreatePayload) => apiClient<SystemTicket>(
    basePath(portal),
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  update: (ticketId: number, payload: SystemTicketUpdatePayload) => apiClient<SystemTicket>(
    `${endpoints.platformAdmin.systemTickets}/${ticketId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
};
