import { useEffect, useState } from 'react';
import { getKpiMonetaryAggregates, type KpiMonetaryAggregate, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';

// Keep the shared backend limits; never truncate analytical groups to fit one request.
export async function loadReceivablesKpiAggregates(queries: KpiMonetaryBatchQuery[], isActive = () => true) {
  const results: Record<string, KpiMonetaryAggregate> = {};
  for (let offset = 0; offset < queries.length && isActive(); offset += 100) {
    const batch = queries.slice(offset, offset + 100);
    const response = await getKpiMonetaryAggregates(batch);
    if (batch.some(query => !response[query.key])) throw new Error('Incomplete receivables KPI response');
    Object.assign(results, response);
  }
  return results;
}

export function useReceivablesKpiAggregates(queries: KpiMonetaryBatchQuery[], sourceRevision: object, enabled = true) {
  const key = JSON.stringify(queries);
  const [snapshot, setSnapshot] = useState<{
    key: string; revision: object; data: Record<string, KpiMonetaryAggregate>; error: Error | null;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadReceivablesKpiAggregates(JSON.parse(key), () => active)
      .then(data => { if (active) setSnapshot({ key, revision: sourceRevision, data, error: null }); })
      .catch(error => { if (active) setSnapshot({ key, revision: sourceRevision, data: {}, error: error instanceof Error ? error : new Error('Receivables KPI request failed') }); });
    return () => { active = false; };
  }, [enabled, key, sourceRevision]);
  const current = enabled && snapshot?.key === key && snapshot.revision === sourceRevision;
  return { data: current ? snapshot.data : {}, error: current ? snapshot.error : null, loading: enabled && !current };
}

export function completeAmount(aggregate?: KpiMonetaryAggregate | null) {
  return aggregate && !aggregate.partial && Number.isFinite(aggregate.preferredTotal) ? aggregate.preferredTotal : null;
}
