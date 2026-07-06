import { ApiClientError, apiClient } from '../lib/apiClient';
import { getCachedAuthSession, setCachedAuthSession, setCachedCsrfToken } from './authSessionStore';
import type { AuthSessionResponse } from './auth.types';
import { endpoints } from './endpoints';

export type { AuthSessionResponse } from './auth.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordResetRequestPayload {
  email: string;
}

export interface PasswordResetCompletePayload {
  password: string;
  confirm_password: string;
}

export interface PasswordResetMessageResponse {
  message: string;
}

export interface PasswordResetValidationResponse {
  valid: boolean;
}

export interface PasswordResetCompleteResponse {
  success: boolean;
  message: string;
}

let sessionRequest: Promise<AuthSessionResponse | null> | null = null;

const cacheSession = (session: AuthSessionResponse | null) => {
  setCachedAuthSession(session);
};

const clearPendingSessionRequest = () => {
  sessionRequest = null;
};

const fetchSessionOrNull = async () => {
  try {
    const session = await apiClient<AuthSessionResponse>(endpoints.auth.me);
    cacheSession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      cacheSession(null);
      return null;
    }

    throw error;
  } finally {
    clearPendingSessionRequest();
  }
};

export const authApi = {
  async me() {
    const session = await apiClient<AuthSessionResponse>(endpoints.auth.me);
    cacheSession(session);
    return session;
  },

  getSessionOrNull() {
    const cachedSession = getCachedAuthSession();
    if (cachedSession !== undefined) {
      return Promise.resolve(cachedSession);
    }

    if (sessionRequest) {
      return sessionRequest;
    }

    sessionRequest = fetchSessionOrNull();
    return sessionRequest;
  },

  async login({ email, password }: LoginCredentials) {
    setCachedAuthSession(undefined);
    setCachedCsrfToken(null);
    clearPendingSessionRequest();

    try {
      const session = await apiClient<AuthSessionResponse>(endpoints.auth.login, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      cacheSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        cacheSession(null);
        throw new Error(error.message || 'Invalid email or password.');
      }

      throw error;
    }
  },

  requestPasswordReset({ email }: PasswordResetRequestPayload) {
    return apiClient<PasswordResetMessageResponse>(`${endpoints.auth.passwordReset}/request`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  validatePasswordResetToken(token: string) {
    return apiClient<PasswordResetValidationResponse>(
      `${endpoints.auth.passwordReset}/${encodeURIComponent(token)}`,
    );
  },

  completePasswordReset(token: string, payload: PasswordResetCompletePayload) {
    return apiClient<PasswordResetCompleteResponse>(
      `${endpoints.auth.passwordReset}/${encodeURIComponent(token)}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async logout() {
    try {
      await apiClient<{ success: boolean }>(endpoints.auth.logout, {
        method: 'POST',
      });
    } finally {
      cacheSession(null);
      clearPendingSessionRequest();
    }
  },
};
