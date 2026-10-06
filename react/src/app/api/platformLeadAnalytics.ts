import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';
import type { PlatformLeadStatus } from './platformLeads';

export type LeadMarket = 'all' | 'MX' | 'CA' | 'OTHER';
export type LeadAnalyticsView = 'received' | 'contacted' | 'scheduled' | 'diagnosed' | 'trial' | 'proposal' | 'won' | 'lost' | 'nurture'
  | 'sla_missed' | 'overdue' | 'unassigned' | 'missing_action' | 'uncontacted' | 'trial_attention';
export type AcquisitionView = 'overview' | 'sources' | 'traffic';
export interface LeadAnalyticsPeriod { days: number; from: string; to: string; market: LeadMarket; measuredAt: string }
export interface LeadBreakdown {
  source: string; medium: string; campaign: string; plan: string;
  received: number; diagnosed: number; proposals: number; won: number;
  diagnosisRate: number | null; proposalWinRate: number | null;
}
export interface LeadAnalyticsDashboard {
  period: LeadAnalyticsPeriod;
  totals: { received: number; contacted: number; scheduled: number; diagnosed: number; trials: number;
    proposals: number; won: number; lost: number; nurture: number; slaEligible: number; slaMet: number;
    averageContactHours: number | null };
  rates: { contactSla: number | null; diagnosis: number | null; proposalWin: number | null };
  stages: Array<{ code: LeadAnalyticsView; count: number; cohortRate: number | null }>;
  attention: { overdue: number; unassigned: number; missingAction: number; uncontacted: number; trialsEnding: number; trialsExpired: number };
  sources: LeadBreakdown[]; sourceGroups: number; plans: LeadBreakdown[];
}
export interface LeadAnalyticsRow {
  id: number; companyName: string; status: PlatformLeadStatus; market: Exclude<LeadMarket, 'all'>;
  assignedName: string | null; source: string; medium: string; campaign: string; plan: string;
  createdAt: string; nextActionAt: string | null; firstContactAt: string | null;
}
export interface LeadAnalyticsDetails {
  period: LeadAnalyticsPeriod; view: LeadAnalyticsView; currentBacklog: boolean;
  items: LeadAnalyticsRow[]; total: number; page: number; pageSize: number; totalPages: number;
}
export type LeadDetailSelection = { view: LeadAnalyticsView; source?: string; medium?: string; campaign?: string; plan?: string };
const path = `${endpoints.platformAdmin.leads}/analytics`;
export const platformLeadAnalyticsApi = {
  dashboard: (days: number, market: LeadMarket) => apiClient<LeadAnalyticsDashboard>(`${path}?${new URLSearchParams({ days: String(days), market })}`),
  details: (days: number, market: LeadMarket, selection: LeadDetailSelection, page = 1) => {
    const query = new URLSearchParams({ days: String(days), market, view: selection.view, page: String(page), pageSize: '25' });
    for (const key of ['source', 'medium', 'campaign', 'plan'] as const) if (selection[key]) query.set(key, selection[key]);
    return apiClient<LeadAnalyticsDetails>(`${path}/details?${query}`);
  },
};
