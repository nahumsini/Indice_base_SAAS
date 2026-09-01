import { apiClient } from '../lib/apiClient';

export interface AiOAuthConsentContext {
  clientName: string;
  scopes: string[];
  expiresInDays: number;
  userName: string;
}

export interface AiOAuthAuthorizationResult {
  redirectUrl: string;
}

const basePath = '/api/v1/ai/oauth/consent';

export const aiOAuthApi = {
  context: (query: string) => apiClient<AiOAuthConsentContext>(`${basePath}${query}`),
  decide: (query: URLSearchParams, approved: boolean) => apiClient<AiOAuthAuthorizationResult>(basePath, {
    method: 'POST',
    body: JSON.stringify({
      approved,
      response_type: query.get('response_type'),
      client_id: query.get('client_id'),
      redirect_uri: query.get('redirect_uri'),
      scope: query.get('scope'),
      state: query.get('state'),
      code_challenge: query.get('code_challenge'),
      code_challenge_method: query.get('code_challenge_method'),
      resource: query.get('resource'),
    }),
  }),
};
