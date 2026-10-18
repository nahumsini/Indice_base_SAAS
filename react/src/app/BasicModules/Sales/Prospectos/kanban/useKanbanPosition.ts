import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '../../../../api/auth';
import { useAuthorizationRevision } from '../../../../hooks/useAuthorizationRevision';

/** Session-only viewport positions; no records or durable business state. */
export function useKanbanPosition(flowId: number, ready: boolean) {
  const revision = useAuthorizationRevision();
  const [scope, setScope] = useState('');
  const positions = useRef<Record<string, { top: number; left: number }>>({});
  const elements = useRef(new Map<string, HTMLElement>());
  const restored = useRef(new Set<string>());
  const cacheKey = useRef('');
  useEffect(() => {
    let cancelled = false;
    setScope(''); cacheKey.current = ''; positions.current = {}; restored.current.clear();
    void authApi.getSessionOrNull().then(session => {
      if (!session || cancelled) return;
      const key = `indice:workspace-scroll:${session.company.id}:${session.user.id}:sales:kanban:${flowId}`;
      try {
        const value = JSON.parse(window.sessionStorage.getItem(key) || '{}');
        positions.current = Object.fromEntries(Object.entries(value).filter(([, position]) => {
          const item = position as { top?: number; left?: number };
          return item && Number.isFinite(item.top) && Number.isFinite(item.left) && item.top! >= 0 && item.left! >= 0;
        })) as typeof positions.current;
      } catch { /* Position memory is optional. */ }
      cacheKey.current = key; setScope(key);
    }).catch(() => { /* Navigation still works without optional position memory. */ });
    return () => { cancelled = true; cacheKey.current = ''; };
  }, [flowId, revision]);

  const restore = useCallback((key: string, element: HTMLElement) => {
    if (!ready || !scope || restored.current.has(key) || element.clientWidth === 0) return;
    const position = positions.current[key];
    if (position) { element.scrollTop = position.top; element.scrollLeft = position.left; }
    restored.current.add(key);
  }, [ready, scope]);
  useEffect(() => { elements.current.forEach((element, key) => restore(key, element)); }, [restore]);
  const register = useCallback((key: string, element: HTMLElement | null) => {
    if (element) { elements.current.set(key, element); restore(key, element); }
    else elements.current.delete(key);
  }, [restore]);
  const remember = (key: string, element: HTMLElement) => {
    if (!ready || !cacheKey.current || element.clientWidth === 0) return;
    positions.current[key] = { top: element.scrollTop, left: element.scrollLeft };
    try { window.sessionStorage.setItem(cacheKey.current, JSON.stringify(positions.current)); } catch { /* Optional session memory. */ }
  };
  return { register, remember };
}
