import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export type PlatformLeadStatus =
  | 'NEW' | 'CONTACTED' | 'DIAGNOSIS_SCHEDULED' | 'DIAGNOSIS_COMPLETED'
  | 'TRIAL_ACTIVE' | 'PROPOSAL' | 'WON' | 'LOST' | 'NURTURE';

export interface PlatformLead {
  id: number;
  fullName: string;
  companyName: string;
  email: string;
  phone: string | null;
  country: string | null;
  challenge: string;
  landingPath: string | null;
  sourceChannel: 'WEBSITE' | 'SOCIAL';
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  planInterest: 'CONTROLA' | 'ESCALA' | 'CORPORATIVO' | null;
  status: PlatformLeadStatus;
  assignedAdminId: number | null;
  assignedName: string | null;
  nextActionAt: string | null;
  diagnosisCompletedAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PlatformLeadEvent {
  id: number;
  eventType: string;
  fromStatus: PlatformLeadStatus | null;
  toStatus: PlatformLeadStatus | null;
  note: string | null;
  actorName: string | null;
  occurredAt: string;
}

export interface PlatformLeadDetail {
  lead: PlatformLead;
  events: PlatformLeadEvent[];
}

export interface PlatformLeadAssignee {
  id: number;
  name: string;
  email: string;
}

export interface PlatformLeadUpdate {
  status: PlatformLeadStatus;
  assignedAdminId: number | null;
  nextActionAt: string | null;
  clearNextAction: boolean;
  note: string;
  version: number;
}

export const platformLeadsApi = {
  list: (query = '', status = '') => {
    const search = new URLSearchParams({ q: query, status });
    return apiClient<{ items: PlatformLead[]; total: number }>(`${endpoints.platformAdmin.leads}?${search}`);
  },
  assignees: () => apiClient<PlatformLeadAssignee[]>(`${endpoints.platformAdmin.leads}/assignees`),
  detail: (id: number) => apiClient<PlatformLeadDetail>(`${endpoints.platformAdmin.leads}/${id}`),
  update: (id: number, payload: PlatformLeadUpdate) => apiClient<PlatformLeadDetail>(
    `${endpoints.platformAdmin.leads}/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
};
