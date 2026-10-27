import { apiClient, ApiClientError, type ApiClientRequestInit } from '../lib/apiClient';

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

const oauthErrorMessages: Record<string, string> = {
  invalid_scope: 'La solicitud incluye permisos no válidos o una lista demasiado larga. Reinicia la conexión desde tu asistente.',
  invalid_request: 'La solicitud de conexión está incompleta o ya no es válida. Reinicia la conexión desde tu asistente.',
  invalid_target: 'La solicitud no corresponde a este servidor de Índice. Reinicia la conexión desde tu asistente.',
  unauthorized_client: 'No encontramos el registro del asistente. Crea de nuevo la conexión desde tu asistente.',
  unsupported_response_type: 'El asistente debe conectarse mediante autorización con código. Reinicia la conexión desde tu asistente.',
  access_denied: 'No se pudo autorizar esta conexión. Comprueba tu sesión y tus permisos en la empresa activa.',
  connection_limit_reached: 'Alcanzaste el límite de conexiones de IA activas. Administra tus conexiones y vuelve a comprobar.',
  temporarily_unavailable: 'No pudimos preparar la conexión en este momento. Vuelve a comprobar en unos instantes.',
};

async function oauthRequest<T>(path: string, init?: ApiClientRequestInit): Promise<T> {
  try {
    return await apiClient<T>(path, init);
  } catch (failure) {
    const fallback = 'No pudimos completar la conexión. Vuelve a comprobar; si continúa, reiníciala desde tu asistente.';
    if (!(failure instanceof ApiClientError)) throw new Error(fallback);
    // OAuth returns error/error_description, unlike the native API message envelope.
    // Map only known codes to actionable copy; do not render raw provider or request details.
    const payload = failure.payload;
    const code = typeof payload === 'object' && payload !== null && 'error' in payload
      && typeof payload.error === 'string' ? payload.error : failure.code;
    const message = code && Object.hasOwn(oauthErrorMessages, code) ? oauthErrorMessages[code] : fallback;
    throw new ApiClientError(message, failure.status, code, payload);
  }
}

export const aiOAuthApi = {
  context: (query: string) => oauthRequest<AiOAuthConsentContext>(`${basePath}${query}`),
  decide: (query: URLSearchParams, approved: boolean) => oauthRequest<AiOAuthAuthorizationResult>(basePath, {
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
