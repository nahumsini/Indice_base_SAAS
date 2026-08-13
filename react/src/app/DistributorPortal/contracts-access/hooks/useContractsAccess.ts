import { useCallback, useEffect, useRef, useState } from 'react';
import { distributorPortalApi } from '../services/distributorPortalApi';
import type { PlatformCatalog } from '../../../api/platformAdmin';
import type {
  DistributorPortalContext,
  DistributorPortfolio,
  DistributorStageFilter,
} from '../types/contractsAccess';

export function useContractsAccess() {
  const [context, setContext] = useState<DistributorPortalContext | null>(null);
  const [portfolio, setPortfolio] = useState<DistributorPortfolio | null>(null);
  const [catalog, setCatalog] = useState<PlatformCatalog | null>(null);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<DistributorStageFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const loadContext = useCallback(async () => {
    const [nextContext, nextCatalog] = await Promise.all([
      distributorPortalApi.getContext(),
      distributorPortalApi.getCatalog(),
    ]);
    setContext(nextContext);
    setCatalog(nextCatalog);
  }, []);

  const loadPortfolio = useCallback(async (
    nextQuery: string,
    nextStage: DistributorStageFilter,
    manual = false,
  ) => {
    const currentRequest = ++requestId.current;
    if (manual) setRefreshing(true);
    setError('');
    try {
      const nextPortfolio = await distributorPortalApi.getPortfolio(nextQuery, nextStage);
      if (currentRequest === requestId.current) setPortfolio(nextPortfolio);
    } catch (loadError) {
      if (currentRequest === requestId.current) {
        setError(loadError instanceof Error ? loadError.message : 'Request failed');
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadContext().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Request failed');
      setLoading(false);
    });
  }, [loadContext]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPortfolio(query.trim(), stage);
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadPortfolio, query, stage]);

  return {
    context,
    catalog,
    portfolio,
    query,
    stage,
    loading,
    refreshing,
    error,
    setQuery,
    setStage,
    refresh: () => loadPortfolio(query.trim(), stage, true),
  };
}
