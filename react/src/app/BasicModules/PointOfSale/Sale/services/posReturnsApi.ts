import { apiClient } from '../../../../lib/apiClient';

export type ReturnCandidate = { id: number; ticketNumber: string; totalAmount: number | string; currency: string; status: string };
export type PosReturn = {
  id: number; ticketId: number; ticketNumber: string; shiftId: number;
  status: 'PREPARED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  reason: string; totalAmount: number | string; currency: string;
  payments: Array<{ id: number; paymentId: number; paymentMethod: string; amount: number | string; currency: string;
    status: string; providerRefundId: string | null; evidenceReference: string | null }>;
};
const base = '/api/v1/pos/returns';
export const posReturnsApi = {
  tickets: (shiftId: number, search: string) => apiClient<ReturnCandidate[]>(base + '/tickets?' + new URLSearchParams({ shiftId: String(shiftId), search })),
  active: (ticketId: number) => apiClient<PosReturn | null>(base + '/ticket/' + ticketId),
  prepare: (ticketId: number, reason: string, goodsReceived: boolean, requestKey: string) =>
    apiClient<PosReturn>(base, { method: 'POST', body: JSON.stringify({ ticketId, reason, goodsReceived, requestKey }) }),
  confirm: (id: number, cashReturned: boolean, transferReferences: Record<number, string>) =>
    apiClient<PosReturn>(base + '/' + id + '/confirm', { method: 'POST', body: JSON.stringify({ cashReturned, transferReferences }) }),
  cancel: (id: number) => apiClient<PosReturn>(base + '/' + id + '/cancel', { method: 'POST' }),
};
