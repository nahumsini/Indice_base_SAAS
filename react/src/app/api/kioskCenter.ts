import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export type KioskCenterStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'REVOKED' | 'DELETED';
export type KioskCenterAccessLevel = 'PUBLIC' | 'IDENTIFIED' | 'VERIFIED' | 'CONTROLLED';
export type KioskCenterLifecycleAction = 'disable' | 'revoke';

export interface KioskCenterItem {
  id: number;
  company_id: number;
  owner_module: string;
  kiosk_type: string;
  legacy_reference_id?: number;
  code: string;
  name: string;
  description?: string;
  status: KioskCenterStatus;
  access_level: KioskCenterAccessLevel;
  access_methods: string[];
  unit_id?: number;
  unit_name?: string;
  business_id?: number;
  business_name?: string;
  location_id?: number;
  expires_at?: string;
  public_token_hint: string;
  configuration_version: number;
  adapter_version: number;
  last_activity_at?: string;
  risk_signals: string[];
}

export interface KioskCenterAuditEvent {
  event_id: string;
  request_id?: string;
  action_id?: string;
  session_id?: string;
  event_type: string;
  outcome: string;
  actor_type?: string;
  actor_id?: number;
  capability?: string;
  module_reference?: string;
  snapshot?: Record<string, unknown>;
  created_at: string;
}

interface KioskCenterEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
  };
}

const kioskPath = (kioskId: number) => (
  `${endpoints.kioskCenter.kiosks}/${encodeURIComponent(String(kioskId))}`
);

export const kioskCenterApi = {
  async list(signal?: AbortSignal) {
    const response = await apiClient<KioskCenterEnvelope<{ items: KioskCenterItem[] }>>(
      endpoints.kioskCenter.kiosks,
      { signal },
    );
    return response.data.items;
  },

  async detail(kioskId: number, signal?: AbortSignal) {
    const response = await apiClient<KioskCenterEnvelope<KioskCenterItem>>(
      kioskPath(kioskId),
      { signal },
    );
    return response.data;
  },

  async audit(kioskId: number, signal?: AbortSignal) {
    const response = await apiClient<KioskCenterEnvelope<{ items: KioskCenterAuditEvent[] }>>(
      `${kioskPath(kioskId)}/audit`,
      { signal },
    );
    return response.data.items;
  },

  async transition(
    kioskId: number,
    action: KioskCenterLifecycleAction,
    reason: string,
  ) {
    const response = await apiClient<KioskCenterEnvelope<KioskCenterItem>>(
      `${kioskPath(kioskId)}/${action}`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      },
    );
    return response.data;
  },
};
