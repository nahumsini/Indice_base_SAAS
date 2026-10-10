import { useCallback, useEffect, useRef, useState } from 'react';
import { IndiceConfirmationDialog } from '../../components/indice-modal/IndiceConfirmationDialog';
import type { KioskNavigationState } from '../../components/kiosk-engine/KioskNavigationBoundary';
import { employeePortalCopy } from './employeePortalCopy';

export function useEmployeeNavigationGuard(locale: string) {
  const states = useRef(new Map<string, KioskNavigationState>());
  const [pending, setPending] = useState<(() => void) | null>(null);
  const register = useCallback((id: string, state: KioskNavigationState | null) => {
    if (state) states.current.set(id, state); else states.current.delete(id);
  }, []);
  const request = useCallback((action: () => void) => {
    const current = [...states.current.values()];
    if (current.some(state => state.busy || state.blocked)) return;
    if (current.some(state => state.dirty)) setPending(() => action);
    else action();
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ([...states.current.values()].some(state => state.dirty || state.busy)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  const clear = useCallback(() => { states.current.clear(); setPending(null); }, []);
  const isBlocked = useCallback(() => [...states.current.values()].some(state => state.busy || state.dirty || state.blocked), []);
  const c = employeePortalCopy(locale);
  const prompt = <IndiceConfirmationDialog open={Boolean(pending)} title={c.leave} description={c.draft} confirmLabel={c.discard} cancelLabel={c.keep} tone="blue"
    onCancel={() => setPending(null)} onConfirm={() => {
      if ([...states.current.values()].some(state => state.busy)) return;
      const action = pending; setPending(null); states.current.clear(); action?.();
    }} />;
  return { register, request, prompt, clear, isBlocked };
}
