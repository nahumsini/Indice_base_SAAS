import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../../lib/apiClient';
import type { ContentNavigationGuard } from '../useCampaignContent';
import { contentCalendarApi } from './contentCalendarApi';
import type { CalendarInput, ContentCalendar, ContentDocument } from './contentCalendarModel';

export function useContentCalendar(id: string, guard: ContentNavigationGuard) {
  const [calendar, setCalendar] = useState<ContentCalendar | null>(null);
  const [draft, setDraft] = useState<ContentDocument | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState<'load'|'save'|'conflict'|'invalid'|null>(null);
  const [pending, setPending] = useState<(() => void)|null>(null), [saved, setSaved] = useState(false), [reload, setReload] = useState(0);
  const saving = useRef(false), mounted = useRef(true), request = useRef<CalendarInput | null>(null);
  const dirty = !!draft && !!calendar && JSON.stringify(draft) !== JSON.stringify(calendar.content);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null); setSaved(false);
    contentCalendarApi.get(id,controller.signal).then(value => {
      if (controller.signal.aborted) return;
      // An empty calendar adopts the device zone only as an explicit unsaved first-save choice.
      const content = value.version ? value.content : { ...value.content, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
      const next = { ...value, content }; setCalendar(next); setDraft(structuredClone(content)); request.current = null;
    }).catch(() => { if (!controller.signal.aborted) setError('load'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id,reload]);
  function navigate(action: () => void) { if (saving.current) return; if (dirty) setPending(() => action); else action(); }
  useEffect(() => { guard.current = navigate; return () => { if (guard.current === navigate) guard.current = null; }; });
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn);
  }, [dirty,busy]);
  function update(content: ContentDocument) {
    if (saving.current || error === 'conflict') return;
    setDraft(content); request.current = null; setError(null); setSaved(false);
  }
  async function save() {
    if (!draft || !calendar || !dirty || saving.current || error === 'conflict') return;
    saving.current = true; setBusy(true); setError(null);
    request.current ??= { content: structuredClone(draft), version: calendar.version, mutationId: crypto.randomUUID() };
    try {
      const value = await contentCalendarApi.save(id,request.current,calendar.actorKey);
      if (!mounted.current) return;
      setCalendar(value); setDraft(structuredClone(value.content)); request.current = null; setSaved(true);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof ApiClientError && failure.status === 409 ? 'conflict' : failure instanceof ApiClientError && failure.status === 400 ? 'invalid' : 'save');
    } finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  function discard() { const action = pending; setPending(null); if (calendar) setDraft(structuredClone(calendar.content)); request.current = null; action?.(); }
  return { calendar,draft,dirty,busy,loading,error,saved,update,save,navigate,pending:!!pending,discard,
    keepEditing:() => setPending(null),reload:() => navigate(() => setReload(value => value+1)) };
}
