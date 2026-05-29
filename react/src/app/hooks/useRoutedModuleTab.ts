import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useDeferredTabChange } from './useDeferredTabChange';
import { useLocalStorageState } from './useLocalStorageState';

const LAST_ACTIVE_MODULE_TABS_STORAGE_KEY = 'indice.moduleTabs.lastActiveTab';

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
  const [lastActiveTabs, setLastActiveTabs] = useLocalStorageState<Record<string, string>>(
    LAST_ACTIVE_MODULE_TABS_STORAGE_KEY,
    {},
  );
  const requestedTab = wildcardPath?.split('/').filter(Boolean)[0];
  const resolvedTab = requestedTab ? (legacyTabAliases[requestedTab] ?? requestedTab) : undefined;
  const isRequestedTabValid = validTabs.includes(resolvedTab as T);
  const storedTab = pageId ? lastActiveTabs[pageId] : undefined;
  const resolvedStoredTab = storedTab ? (legacyTabAliases[storedTab] ?? storedTab) : undefined;
  const fallbackTab = validTabs.includes(resolvedStoredTab as T) ? (resolvedStoredTab as T) : defaultTab;
  const activeTab = isRequestedTabValid ? (resolvedTab as T) : fallbackTab;
  const shouldRedirect = !requestedTab || !isRequestedTabValid || requestedTab !== activeTab;
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
    if (!pageId) {
      return;
    }

    setLastActiveTabs((currentTabs) => {
      if (currentTabs[pageId] === activeTab) {
        return currentTabs;
      }

      return {
        ...currentTabs,
        [pageId]: activeTab,
      };
    });
  }, [activeTab, pageId, setLastActiveTabs]);

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
    isTabLoading,
    setActiveTab,
  };
}
