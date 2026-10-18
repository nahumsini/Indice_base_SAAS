import { apiClient } from '../../../../lib/apiClient';
export type ScriptBlock = { title: string; text: string };
export type ScriptContent = { name: string; goal: string; stageKey: string; blocks: ScriptBlock[] };
export type CallScript = { id: number; version: number; publishedVersion: number | null; archived: boolean; content: ScriptContent; published: ScriptContent | null };
export type SaveScript = { id?: number; expectedVersion?: number; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; content: ScriptContent };
export const callOutcomes = ['answered', 'no_answer', 'busy', 'wrong_number', 'information_requested', 'callback'] as const;
export type CallOutcome = typeof callOutcomes[number];
export type CallCommand = { requestKey: string; revision: string; outcome: CallOutcome; notes: string; scriptId: number | null; scriptVersion: number | null; followupMode: 'schedule' | 'clear'; nextAction: string | null; nextActionAt: string | null };
export type CallInteraction = { id: number; outcome: CallOutcome; notes: string; actorName: string; createdAt: string; scriptName: string | null; scriptVersion: number | null; followupMode: string; nextAction: string | null; nextActionAt: string | null };
export type SellerOpportunity = { revision: string; opportunity: Record<string, unknown> };
export type CallHistory = { items: CallInteraction[]; nextCursor: number | null };
export type DaySummary = { date: string; timezone: string; attempts: number; conversations: number; followups: number };
const base = (flow: number) => `/api/v1/sales/opportunity-flow/${flow}/seller`;
export const sellerApi = {
  scripts: (flow: number) => apiClient<CallScript[]>(base(flow) + '/scripts'),
  saveScript: (flow: number, value: SaveScript) => apiClient<CallScript>(base(flow) + '/scripts', { method: 'POST', body: JSON.stringify(value) }),
  summary: (flow: number) => apiClient<DaySummary>(base(flow) + '/summary'),
  opportunity: (flow: number, id: number) => apiClient<SellerOpportunity>(base(flow) + `/opportunities/${id}`),
  history: (flow: number, id: number, before?: number) => apiClient<CallHistory>(base(flow) + `/opportunities/${id}/interactions` + (before ? `?before=${before}` : '')),
  record: (flow: number, id: number, value: CallCommand) => apiClient<{ interaction: CallInteraction; current: SellerOpportunity }>(base(flow) + `/opportunities/${id}/interactions`, { method: 'POST', body: JSON.stringify(value) }),
};
