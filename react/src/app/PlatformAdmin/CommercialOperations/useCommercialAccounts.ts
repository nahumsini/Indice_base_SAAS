import { useCallback, useEffect, useRef, useState } from 'react';
import { platformAdminApi, type PlatformCompanySummary } from '../../api/platformAdmin';
import { ApiClientError } from '../../lib/apiClient';
import { mergeCompanies } from './model';

export function isAccessDenied(error: unknown) {
  return error instanceof ApiClientError && [401, 403].includes(error.status);
}

export function useCommercialAccounts(query: string) {
  const [accounts, setAccounts] = useState<PlatformCompanySummary[]>([]);
  const [pagination, setPagination] = useState({ page: 0, total_items: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'error' | 'denied' | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(async (page: number, requestGeneration: number) => {
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdminApi.getOverview({ query: query.trim(), userType: 'SUPER_ADMIN', status: 'all', sort: 'id', direction: 'asc', page, pageSize: 50 });
      if (generation.current !== requestGeneration) return;
      setAccounts(current => page === 1 ? result.companies : mergeCompanies(current, result.companies));
      setPagination(result.pagination);
    } catch (cause) {
      if (generation.current !== requestGeneration) return;
      const denied = isAccessDenied(cause);
      setError(denied ? 'denied' : 'error');
      if (denied) {
        setAccounts([]);
        setPagination({ page: 0, total_items: 0, total_pages: 0 });
      }
    } finally {
      if (generation.current === requestGeneration) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    const current = ++generation.current;
    setAccounts([]);
    setPagination({ page: 0, total_items: 0, total_pages: 0 });
    setError(null);
    setLoading(true);
    inFlight.current = true;
    const timer = window.setTimeout(() => void load(1, current), 300);
    return () => { window.clearTimeout(timer); generation.current++; };
  }, [load, revision]);

  return {
    accounts, pagination, loading, error,
    refresh: () => setRevision(value => value + 1),
    more: () => {
      if (!inFlight.current && error !== 'denied' && pagination.page < pagination.total_pages) void load(pagination.page + 1, generation.current);
    },
  };
}
