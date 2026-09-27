import { apiClient } from '../../../lib/apiClient';

export type TerminalRefundAdjustmentState =
  | 'PENDING_REVIEW' | 'APPROVED' | 'POSTED' | 'RECONCILIATION_REQUIRED' | 'FAILED';

export interface TerminalRefundAdjustment {
  id: number;
  providerCode: string;
  providerPaymentId: string;
  providerRefundId: string;
  ticketId: number;
  ticketNumber: string;
  shiftId: number;
  closingId: number;
  paymentAccountId: number | null;
  paymentAccountName: string | null;
  amount: number;
  currencyCode: string;
  state: TerminalRefundAdjustmentState;
  approvalReason: string | null;
  postingBalance: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  version: number;
}

export interface TerminalRefundAdjustmentPage {
  items: TerminalRefundAdjustment[];
  nextCursor: number | null;
  totalCount: number;
}

const path = '/api/v1/finance/terminal-refund-adjustments';

export const terminalRefundAdjustmentsService = {
  list: (state?: TerminalRefundAdjustmentState) => apiClient<TerminalRefundAdjustment[]>(
    `${path}${state ? `?state=${encodeURIComponent(state)}` : ''}`,
  ),
  page: (state?: TerminalRefundAdjustmentState | 'ATTENTION', beforeId?: number | null) => {
    const query = new URLSearchParams({ limit: '50' });
    if (state) query.set('state', state);
    if (beforeId) query.set('beforeId', String(beforeId));
    return apiClient<TerminalRefundAdjustmentPage>(`${path}/page?${query.toString()}`);
  },
  approve: (id: number, reason: string, version: number) => apiClient<TerminalRefundAdjustment>(
    `${path}/${id}/approve`, { method: 'POST', body: JSON.stringify({ reason, version }) },
  ),
  post: (id: number, version: number) => apiClient<TerminalRefundAdjustment>(
    `${path}/${id}/post`, { method: 'POST', body: JSON.stringify({ version }) },
  ),
  resolve: (id: number, reason: string, version: number) => apiClient<TerminalRefundAdjustment>(
    `${path}/${id}/resolve`, { method: 'POST', body: JSON.stringify({ reason, version }) },
  ),
};
