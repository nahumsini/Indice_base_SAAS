import { useEffect, useState } from 'react';
import { useAuthorizationRevision } from '../../../../hooks/useAuthorizationRevision';
import { salesApi, type SalesKpiWorkspaceSource } from '../../salesApi';

export function useSalesKpiSource() {
  const authorizationRevision = useAuthorizationRevision();
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    authorizationRevision: number;
    refreshRevision: number;
    data: SalesKpiWorkspaceSource | null;
    error: boolean;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    salesApi.kpiWorkspace()
      .then((data) => {
        if (active) setSnapshot({ authorizationRevision, refreshRevision, data, error: false, updatedAt: new Date().toISOString() });
      })
      .catch(() => {
        if (active) setSnapshot({ authorizationRevision, refreshRevision, data: null, error: true, updatedAt: '' });
      });
    return () => { active = false; };
  }, [authorizationRevision, refreshRevision]);

  const current = snapshot?.authorizationRevision === authorizationRevision
    && snapshot.refreshRevision === refreshRevision;
  return {
    data: current ? snapshot.data : null,
    error: Boolean(current && snapshot.error),
    loading: !current,
    updatedAt: current ? snapshot.updatedAt : '',
    refresh: () => setRefreshRevision((value) => value + 1),
  };
}
