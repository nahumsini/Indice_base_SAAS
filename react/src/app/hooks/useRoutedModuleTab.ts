import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
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
  const requestedTab = wildcardPath?.split('/').filter(Boolean)[0];
  const resolvedTab = requestedTab ? (legacyTabAliases[requestedTab] ?? requestedTab) : undefined;
  const isValidTab = validTabs.includes(resolvedTab as T);
  const activeTab = isValidTab ? (resolvedTab as T) : defaultTab;
  const shouldRedirect = !requestedTab || !isValidTab || requestedTab !== activeTab;
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
