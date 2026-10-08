import { useEffect, useState } from 'react';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';

/** No tenant records are persisted; clear old data on every scope/request revision. */
export function useSchedulingQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const authorizationRevision = useAuthorizationRevision();
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined); setLoading(true); setError(false);
    Promise.resolve().then(() => load(controller.signal)).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load, revision, authorizationRevision]);
  return { data, loading, error, reload: () => setRevision(value => value + 1) };
}
