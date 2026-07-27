import { ApiClientError, apiClient } from '../lib/apiClient';
import { getCachedAuthSession, setCachedAuthSession, setCachedCsrfToken } from './authSessionStore';
import type { AuthSessionResponse } from './auth.types';
import { endpoints } from './endpoints';

export type { AuthSessionResponse } from './auth.types';

export interface LoginCredentials {
  companyName: string;
  email: string;
  password: string;
}

export interface AccountSignupPayload {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  industry: string;
  companySize: string;
  country: string;
  phone: string;
}

export interface AccountSignupCheckoutPayload extends AccountSignupPayload {
  planId: string;
  moduleCount: number;
  extraCollaborators: number;
  selectedModuleSlugs: string[];
}

export interface CsrfTokenResponse {
  csrfToken: string;
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

  async login({ companyName, email, password }: LoginCredentials) {
    setCachedAuthSession(undefined);
    setCachedCsrfToken(null);
    clearPendingSessionRequest();
    await this.csrf();
    try {
      const session = await apiClient<AuthSessionResponse>(endpoints.auth.login, {
        method: 'POST',
        body: JSON.stringify({
          companyName,
          email,
          password,
        }),
      });

      cacheSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        cacheSession(null);
        throw new Error(error.message || 'Invalid company, email, or password.');
      }

      throw error;
    }
  },

  async register(payload: AccountSignupPayload) {
    setCachedAuthSession(undefined);
    setCachedCsrfToken(null);
    clearPendingSessionRequest();

    try {
      const session = await apiClient<AuthSessionResponse>(endpoints.auth.register, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      cacheSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 400) {
        throw new Error(error.message || 'Account could not be created.');
      }

      throw error;
    }
  },

  csrf() {
    return apiClient<CsrfTokenResponse>(endpoints.auth.csrf);
  },

  async startSignupTrial(payload: AccountSignupCheckoutPayload) {
    setCachedAuthSession(undefined);
    setCachedCsrfToken(null);
    clearPendingSessionRequest();
    await this.csrf();

    try {
      const session = await apiClient<AuthSessionResponse>(endpoints.auth.signupTrial, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      cacheSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiClientError && [400, 403].includes(error.status)) {
        throw new Error(error.message || 'Trial account could not be created.');
      }

      throw error;
    }
  },

  async switchCompany(companyId: number) {
    const session = await apiClient<AuthSessionResponse>(endpoints.auth.company, {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId }),
    });
    cacheSession(session);
    return session;
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
      setCachedCsrfToken(null);
      clearPendingSessionRequest();
    }
  },
};
