import { useEffect, useState } from 'react';
import type { PlatformPagination } from '../../api/platformAdmin';

export function useCompanyWorkspacePage<T extends { company_id: number; pagination: PlatformPagination }>(
  companyId: number,
  load: (companyId: number, page: number, pageSize: number) => Promise<T>,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setData(null);
    void load(companyId, page, pageSize).then((response) => {
      if (cancelled) return;
      if (response.company_id !== companyId) throw new Error('Company response mismatch');
      setData(response);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [companyId, load, page, pageSize, revision]);
  return {
    data: data?.company_id === companyId ? data : null,
    loading, failed, setPage,
    setPageSize: (size: number) => { setPage(1); setPageSize(size); },
    reload: () => setRevision((value) => value + 1),
  };
}
