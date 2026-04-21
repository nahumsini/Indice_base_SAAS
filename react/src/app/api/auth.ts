import { ApiClientError, apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface AuthSessionResponse {
  user: {
    id: number;
    name: string;
    role: string | null;
  };
  company: {
    id: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

let sessionCache: AuthSessionResponse | null | undefined;
let sessionRequest: Promise<AuthSessionResponse | null> | null = null;

const cacheSession = (session: AuthSessionResponse | null) => {
  sessionCache = session;
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
  me() {
    return apiClient<AuthSessionResponse>(endpoints.auth.me);
  },

  getSessionOrNull() {
    if (sessionCache !== undefined) {
      return Promise.resolve(sessionCache);
    }

    if (sessionRequest) {
      return sessionRequest;
    }

    sessionRequest = fetchSessionOrNull();
    return sessionRequest;
  },

  async login({ email, password }: LoginCredentials) {
    cacheSession(undefined);
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
