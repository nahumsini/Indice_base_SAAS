import { createContext, useContext, useEffect, useId } from 'react';
export type KioskNavigationState = { dirty: boolean; busy: boolean; blocked?: boolean };
export const KioskNavigationBoundary = createContext<(id: string, state: KioskNavigationState | null) => void>(() => {});
export function useKioskNavigationState(state: KioskNavigationState) {
  const register = useContext(KioskNavigationBoundary);
  const id = useId();
  useEffect(() => { register(id, state); return () => register(id, null); }, [id, register, state.dirty, state.busy, state.blocked]);
}
