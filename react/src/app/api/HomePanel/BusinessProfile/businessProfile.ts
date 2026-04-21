import { apiClient } from '../../../lib/apiClient';

const businessProfileEndpoint = '/api/v1/dashboard/business-profile';

export type BusinessProfileSectionKey = 'people' | 'processes' | 'products' | 'finance';

export type BusinessProfileSectionStatus = 'draft' | 'in_progress' | 'completed';

export interface BusinessProfileSectionData {
  ui_key: string;
  answers: Record<string, number>;
  saved_at: string | null;
  answered_count: number;
  question_count: number;
  [key: string]: unknown;
}

export interface BusinessProfileSection {
  id: number | null;
  section_key: BusinessProfileSectionKey;
  status: BusinessProfileSectionStatus;
  completed_at: string | null;
  data: BusinessProfileSectionData;
}

export interface BusinessProfileRecord {
  id: number | null;
  company_id: number;
  version: number;
  status: BusinessProfileSectionStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface BusinessProfileResponse {
  profile: BusinessProfileRecord;
  sections: Record<BusinessProfileSectionKey, BusinessProfileSection>;
}

export interface SaveBusinessProfileSectionPayload {
  status?: BusinessProfileSectionStatus;
  completed_at?: string | null;
  data?: Partial<BusinessProfileSectionData>;
}

export interface SaveBusinessProfilePayload {
  sections: Partial<Record<BusinessProfileSectionKey, SaveBusinessProfileSectionPayload>>;
}

export const businessProfileApi = {
  getBusinessProfile() {
    return apiClient<BusinessProfileResponse>(businessProfileEndpoint);
  },

  saveBusinessProfile(payload: SaveBusinessProfilePayload) {
    return apiClient<BusinessProfileResponse>(businessProfileEndpoint, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
