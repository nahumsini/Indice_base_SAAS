import { createContext } from 'react';
import type { AuthResult, DemoSession, LoginPayload, RegisterPayload } from './authTypes';

export type AuthContextValue = {
  session: DemoSession | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<DemoSession>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
