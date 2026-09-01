import { apiClient } from '../lib/apiClient';

const basePath = '/api/v1/ai/connections';

export interface AiConnection {
  id: number;
  provider: string;
  label: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface IssuedAiConnection extends AiConnection {
  accessToken: string;
}

export interface AiConnectionActivity {
  id: string;
  kind: 'READ' | 'ACTION';
  toolName: string;
  eventType: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'REPLAY';
  statusCode?: number | null;
  riskLevel: number;
  createdAt: string;
}

export const aiConnectionsApi = {
  list: () => apiClient<{ connections: AiConnection[] }>(basePath),
  create: (payload: { label: string; expiresInDays: number; scopes: string[] }) => (
    apiClient<IssuedAiConnection>(basePath, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  ),
  revoke: (connectionId: number) => apiClient<void>(`${basePath}/${connectionId}`, {
    method: 'DELETE',
  }),
  activity: (connectionId: number, limit = 40) => (
    apiClient<{ events: AiConnectionActivity[] }>(`${basePath}/${connectionId}/activity?limit=${limit}`)
  ),
};
