import { apiClient } from '../../../lib/apiClient';
export type ReportRule = { id: number; title: string; description: string; reportType: 'EXECUTIVE' | 'ACCOUNTING'; cadence: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; status: 'ready' | 'draft' | 'paused'; unitId: number | null; businessId: number | null; preferredCurrency: string; nextRun: string | null; version: number; latestRunId: number | null; lastErrorCode: string | null };
export type RuleInput = Omit<ReportRule, 'id' | 'nextRun' | 'latestRunId' | 'lastErrorCode'>;
export type ReportRun = { id: number; ruleId: number; reportType: ReportRule['reportType']; from: string; to: string; generatedAt: string; snapshot: Record<string, unknown> };
const base = '/api/v1/kpis/automated-reports';
export const automatedReportsApi = {
  list: () => apiClient<{ items: ReportRule[] }>(base),
  save: (input: RuleInput, id?: number) => apiClient<ReportRule>(id ? `${base}/${id}` : base, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }),
  generate: (id: number, idempotencyKey: string) => apiClient<ReportRun>(`${base}/${id}/runs`, { method: 'POST', body: JSON.stringify({ idempotencyKey }) }),
  run: (id: number, run: number) => apiClient<ReportRun>(`${base}/${id}/runs/${run}`),
};
