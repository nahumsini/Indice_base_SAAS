import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getAuthorizationRevision, subscribeToAuthorizationChanged } from '../../../../api/authSessionStore';
import { getIncidentReport } from '../services/incidentReportApi';
import type { IncidentReport, IncidentReportPeriod, IncidentReportQuery } from '../types/incidentReport';
import { incidentPeriodRange, validIncidentRange } from '../utils/incidentReportPeriod';

export function useIncidentReport(date: string) {
  const authorization = useSyncExternalStore(subscribeToAuthorizationChanged, getAuthorizationRevision);
  const [period, setPeriod] = useState<IncidentReportPeriod>('month');
  const [anchor, setAnchor] = useState(date);
  const [query, setQuery] = useState<IncidentReportQuery>(() => incidentPeriodRange('month', date));
  const [result, setResult] = useState<{ report: IncidentReport; key: string; authorization: number } | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(false);
  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const queryKey = JSON.stringify(query);
  const valid = validIncidentRange(query.from, query.to);

  useEffect(() => { controller.current?.abort(); setLoading(false); setError(false); }, [queryKey, authorization]);
  useEffect(() => () => controller.current?.abort(), []);
  const report = result?.authorization === authorization ? result.report : null;
  const stale = Boolean(report && result?.key !== queryKey);
  const changePeriod = (next: IncidentReportPeriod) => {
    setPeriod(next);
    if (next !== 'custom') setQuery(q => ({ ...q, ...incidentPeriodRange(next, anchor) }));
  };
  const changeAnchor = (value: string) => {
    setAnchor(value); setQuery(q => ({ ...q, ...incidentPeriodRange(period, value) }));
  };
  const generate = async () => {
    if (!valid) return;
    controller.current?.abort(); const next = new AbortController(); controller.current = next;
    setLoading(true); setError(false);
    try {
      const response = await getIncidentReport(query, next.signal);
      if (next.signal.aborted || authorization !== getAuthorizationRevision()) return;
      setResult({ report: response, key: queryKey, authorization }); setView('summary');
      setSelectedId(response.employees[0]?.person.id ?? null);
    } catch {
      if (!next.signal.aborted) setError(true);
    } finally { if (!next.signal.aborted) setLoading(false); }
  };
  return { anchor, query, period, valid, report, stale, loading, error, view, selectedId,
    changeAnchor, changePeriod, setQuery, generate, setView, setSelectedId };
}
