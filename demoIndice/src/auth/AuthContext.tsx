import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoAuthApi } from './demoAuthApi';
import { AuthContext, type AuthContextValue } from './authContextValue';
import { DEMO_SOURCE_LOGOUT_EVENT } from './sourceAuthBridge';
import type { DemoSession } from './authTypes';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    demoAuthApi.getSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const clearSession = () => setSession(null);

    window.addEventListener(DEMO_SOURCE_LOGOUT_EVENT, clearSession);
    return () => window.removeEventListener(DEMO_SOURCE_LOGOUT_EVENT, clearSession);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isLoading,
    async login(payload) {
      const result = await demoAuthApi.login(payload);

      if (result.kind === 'authenticated') {
        setSession(result.session);
      }

      return result;
    },
    async register(payload) {
      const nextSession = await demoAuthApi.register(payload);
      setSession(nextSession);
      return nextSession;
    },
    async logout() {
      await demoAuthApi.logout();
      setSession(null);
    },
  }), [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
