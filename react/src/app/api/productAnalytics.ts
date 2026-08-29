import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export type ProductAnalyticsEventType = 'PAGE_VIEW' | 'ACTIVE_TIME' | 'CTA_CLICK' | 'LEAD_SUBMIT';

export interface ProductAnalyticsObservation {
  sessionKey: string;
  eventType: ProductAnalyticsEventType;
  routeKey: string;
  sectionKey?: string;
  activeSeconds?: number;
  locale?: string;
  deviceType: 'DESKTOP' | 'TABLET' | 'MOBILE';
}

export const productAnalyticsApi = {
  collectApp: (observation: ProductAnalyticsObservation) => apiClient<{ accepted: boolean }>(
    endpoints.productAnalytics.appCollect,
    { method: 'POST', body: JSON.stringify(observation) },
  ),
};
