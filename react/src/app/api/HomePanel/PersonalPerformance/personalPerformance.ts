import { apiClient } from '../../../lib/apiClient';

const personalPerformanceEndpoint = '/api/v1/dashboard/personal-performance/me';

export type PersonalPerformanceSectionKey =
  | 'sleep_recovery'
  | 'nutrition_energy'
  | 'stress_clarity'
  | 'balance_sustainability';

export type PersonalPerformanceSectionStatus = 'draft' | 'in_progress' | 'completed';

export interface PersonalPerformanceSectionData {
  ui_key: string;
  answers: Record<string, number>;
  saved_at: string | null;
  answered_count: number;
  question_count: number;
  [key: string]: unknown;
}

export interface PersonalPerformanceSection {
  id: number | null;
  section_key: PersonalPerformanceSectionKey;
  status: PersonalPerformanceSectionStatus;
  completed_at: string | null;
  data: PersonalPerformanceSectionData;
}

export interface PersonalPerformanceRecord {
  id: number | null;
  user_id: number;
  company_id: number;
  version: number;
  status: PersonalPerformanceSectionStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface PersonalPerformanceResponse {
  profile: PersonalPerformanceRecord;
  sections: Record<PersonalPerformanceSectionKey, PersonalPerformanceSection>;
}

export interface SavePersonalPerformanceSectionPayload {
  status?: PersonalPerformanceSectionStatus;
  completed_at?: string | null;
  data?: Partial<PersonalPerformanceSectionData>;
}

export interface SavePersonalPerformancePayload {
  sections: Partial<Record<PersonalPerformanceSectionKey, SavePersonalPerformanceSectionPayload>>;
}

export const personalPerformanceApi = {
  getPersonalPerformance() {
    return apiClient<PersonalPerformanceResponse>(personalPerformanceEndpoint);
  },

  savePersonalPerformance(payload: SavePersonalPerformancePayload) {
    return apiClient<PersonalPerformanceResponse>(personalPerformanceEndpoint, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

