import { apiClient } from '../../../../lib/apiClient';
export type ContinuityKind = 'won' | 'lost';
export const continuitySortColumns = ['client', 'sale', 'stage', 'owner', 'lossReason', 'nextAction'] as const;
export type ContinuitySortColumn = typeof continuitySortColumns[number];
export type ContinuitySort = { columnId: ContinuitySortColumn; direction: 'asc' | 'desc' };
export type ContinuityStage = { key: string; label: string; colorToken: string };
export type ContinuityFlow = { id: number; name: string; version: number; archived: boolean; stages: ContinuityStage[] };
export type ContinuityItem = {
  kind: ContinuityKind; sourceId: number; reference: string; title: string; clientName: string;
  contactName: string; phone: string; email: string; contactId: number | null; opportunityId: number | null;
  workId: number | null; version: number; flowId: number; stageKey: string; ownerId: number | null; ownerName: string;
  nextAction: string; nextActionDate: string | null; notes: string; lossReason: string;
  recoveryStatus: string; recoveredOpportunityId: number | null;
};
export type ContinuityWorkspace = {
  items: ContinuityItem[]; counts: { total: number; overdue: number; today: number; unscheduled: number; completed: number };
  page: number; pageSize: number; flows: ContinuityFlow[]; owners: Array<{ id: number; name: string }>;
  today: string; timezone: string; canReactivate: boolean;
};
export type ContinuityDetail = { item: ContinuityItem; history: Array<{ id: number; type: string; actor: string; detail: string; createdAt: string }> };
export type SaveContinuityWork = {
  requestKey: string; version: number; flowId: number; stageKey: string; ownerId: number | null;
  nextAction: string; nextActionDate: string | null; notes: string; lossReason: string; paused: boolean;
};
export type SaveContinuityFlow = { requestKey: string; version?: number; name: string; archived: boolean; stages: ContinuityStage[] };
const base = '/api/v1/sales/post-sales/workspace';
export const postSaleWorkspaceApi = {
  workspace(params: { kind: ContinuityKind; search: string; flow?: number; owner?: number; stage?: string; page: number; pageSize?: number; sort?: ContinuitySortColumn; direction?: ContinuitySort['direction'] }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
    return apiClient<ContinuityWorkspace>(`${base}?${query}`);
  },
  detail(kind: ContinuityKind, id: number) { return apiClient<ContinuityDetail>(`${base}/items/${kind}/${id}`); },
  save(kind: ContinuityKind, id: number, command: SaveContinuityWork) {
    return apiClient<ContinuityDetail>(`${base}/items/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(command) });
  },
  saveFlow(id: number | null, command: SaveContinuityFlow) {
    return apiClient<ContinuityFlow>(id === null ? `${base}/flows` : `${base}/flows/${id}`, { method: id === null ? 'POST' : 'PUT', body: JSON.stringify(command) });
  },
  reactivate(id: number, command: { requestKey: string; version: number; opportunityName: string }) {
    return apiClient<ContinuityDetail>(`${base}/items/lost/${id}/reactivate`, { method: 'POST', body: JSON.stringify(command) });
  },
};
