import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { authApi } from '../api/auth';
import { workspaceStateApi } from '../api/workspaceState';
import { useDeferredTabChange } from './useDeferredTabChange';

interface RoutedModuleTabOptions {
  minimumLoadingDurationMs?: number;
}

export function useRoutedModuleTab<T extends string>(
  defaultTab: T,
  validTabs: readonly T[],
  legacyTabAliases: Partial<Record<string, T>> = {},
  options: RoutedModuleTabOptions = {},
) {
  const navigate = useNavigate();
  const params = useParams();
  const pageId = params.pageId;
  const wildcardPath = params['*'];
  const [rememberedTab, setRememberedTab] = useState<T | null>(null);
  const [isMemoryReady, setIsMemoryReady] = useState(false);
  const [memoryStorageKey, setMemoryStorageKey] = useState('');
  const [memoryPageId, setMemoryPageId] = useState<string | null>(null);
  const requestedTab = wildcardPath?.split('/').filter(Boolean)[0];
  const resolvedTab = requestedTab ? (legacyTabAliases[requestedTab] ?? requestedTab) : undefined;
  const isRequestedTabValid = validTabs.includes(resolvedTab as T);
  const resolvedStoredTab = rememberedTab ? (legacyTabAliases[rememberedTab] ?? rememberedTab) : undefined;
  const fallbackTab = validTabs.includes(resolvedStoredTab as T) ? (resolvedStoredTab as T) : defaultTab;
  const activeTab = isRequestedTabValid ? (resolvedTab as T) : fallbackTab;
  const shouldRedirect = isMemoryReady && (!requestedTab || !isRequestedTabValid || requestedTab !== activeTab);
  const { changeTab, isTabLoading } = useDeferredTabChange(
    activeTab,
    (nextTab) => {
      if (pageId) {
        navigate(`/${pageId}/${nextTab}`);
      }
    },
    options.minimumLoadingDurationMs,
  );

  useEffect(() => {
    let cancelled = false;
    setIsMemoryReady(false);
    setRememberedTab(null);
    setMemoryStorageKey('');
    setMemoryPageId(null);

    const restoreTab = async () => {
      if (!pageId) {
        setIsMemoryReady(true);
        return;
      }

      const session = await authApi.getSessionOrNull();
      if (cancelled) return;
      if (!session) {
        setIsMemoryReady(true);
        return;
      }

      const storageKey = `indice:module-tab:${session.company.id}:${session.user.id}:${pageId}`;
      setMemoryStorageKey(storageKey);
      setMemoryPageId(pageId);
      const localTab = window.localStorage.getItem(storageKey);
      let remoteTab = '';
      try {
        const remote = await workspaceStateApi.get<{ activeTab: string }>(pageId, 'navigation');
        remoteTab = remote.state?.activeTab ?? '';
      } catch {
        // The scoped local copy keeps module navigation available offline.
      }
      if (cancelled) return;

      const candidate = remoteTab || localTab || '';
      const normalizedCandidate = legacyTabAliases[candidate] ?? candidate;
      if (validTabs.includes(normalizedCandidate as T)) {
        setRememberedTab(normalizedCandidate as T);
      }
      setIsMemoryReady(true);
    };

    void restoreTab();
    return () => { cancelled = true; };
  }, [pageId]);

  useEffect(() => {
    if (!pageId || memoryPageId !== pageId || !isMemoryReady || !memoryStorageKey) return undefined;
    window.localStorage.setItem(memoryStorageKey, activeTab);
    const timeout = window.setTimeout(() => {
      void workspaceStateApi.save(pageId, 'navigation', { activeTab }).catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [activeTab, isMemoryReady, memoryPageId, memoryStorageKey, pageId]);

  useEffect(() => {
    if (!pageId || !shouldRedirect) {
      return;
    }

    navigate(`/${pageId}/${activeTab}`, { replace: true });
  }, [activeTab, navigate, pageId, shouldRedirect]);

  const setActiveTab = (nextTab: T) => {
    if (!pageId || nextTab === activeTab) {
      return;
    }

    changeTab(nextTab);
  };

  return {
    activeTab,
    isTabLoading: isTabLoading || !isMemoryReady,
    setActiveTab,
  };
}
