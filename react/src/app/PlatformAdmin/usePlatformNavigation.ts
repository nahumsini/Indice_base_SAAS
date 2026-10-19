import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useWorkspaceNavigationMemory } from '../hooks/useWorkspaceNavigationMemory';

/** The router owns section URLs; workspace memory owns only the saved preference. */
export function usePlatformNavigation<T extends string>(fallback: T, isSection: (value: unknown) => value is T) {
  const [activeTab, setCurrent] = useState<T>(fallback);
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const normalize = useCallback((value: unknown): T => {
    const candidate = value === 'users' || value === 'activities' ? 'companies' : value === 'training' ? fallback : value;
    return isSection(candidate) ? candidate : fallback;
  }, [fallback, isSection]);
  useEffect(() => { setCurrent(normalize(requested)); }, [requested, normalize]);

  const restore = useCallback((remembered: { section?: unknown }) => {
    const current = new URLSearchParams(window.location.search);
    const explicit = current.get('section');
    const section = normalize(explicit ?? remembered.section);
    setCurrent(section);
    if (explicit === null) {
      current.set('section', section);
      setParams(current, { replace: true });
    }
  }, [normalize, setParams]);
  const state = useMemo(() => ({ section: activeTab }), [activeTab]);
  useWorkspaceNavigationMemory({
    moduleKey: 'platform-admin', tabKey: 'primary-navigation', state,
    defaults: { section: fallback }, onRestore: restore, rememberScroll: false,
    // Do not map section with urlFields: a delayed memory effect must never rewrite
    // the history entry we are leaving while a routed selection is being committed.
  });

  const setActiveTab = (section: T, options?: { replace?: boolean }) => {
    if (!isSection(section) || section === activeTab) return;
    setCurrent(section);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('section', section);
      return next;
    }, options);
  };
  return { activeTab, setActiveTab };
}
