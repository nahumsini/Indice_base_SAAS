import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../lib/apiClient';
import { funnelApi } from './funnelApi';
import { validateFunnel, type FunnelInput, type FunnelPlan } from './funnelModel';

export type ContentNavigationGuard = { current: ((action: () => void) => void) | null };
export function campaignContentDraft(plan: FunnelPlan): FunnelInput {
  return structuredClone({ name: plan.name, objective: plan.objective, audience: plan.audience,
    channel: plan.channel, notes: plan.notes, stages: plan.stages, status: plan.status,
    workshop: plan.workshop, contentGuide: plan.contentGuide, version: plan.version });
}
export function useCampaignContent({ plan, guard, onSaved }: { plan: FunnelPlan; guard: ContentNavigationGuard; onSaved: (plan: FunnelPlan) => void }) {
  const [draft, setDraft] = useState(() => campaignContentDraft(plan));
  const baseline = useRef(campaignContentDraft(plan)), saving = useRef(false), mounted = useRef(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState<'network' | 'conflict' | 'invalid' | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null), [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.current);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (plan.version === baseline.current.version) return;
    if (dirty || saving.current) { setError('conflict'); return; }
    const next = campaignContentDraft(plan); baseline.current = next; setDraft(next); setError(null);
  }, [plan.version]);
  function navigate(action: () => void) { if (saving.current) return; if (dirty) setPending(() => action); else action(); }
  useEffect(() => { guard.current = navigate; return () => { if (guard.current === navigate) guard.current = null; }; });
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, busy]);
  function update(value: Partial<FunnelInput>) { if (saving.current || error === 'conflict') return; setDraft(d => ({ ...d, ...value })); setSaved(false); setError(null); }
  async function save() {
    if (saving.current || error === 'conflict' || !dirty) return;
    if (validateFunnel(draft)) { setError('invalid'); return; }
    saving.current = true; setBusy(true); setError(null);
    try {
      const result = await funnelApi.save(plan.id, draft);
      if (!mounted.current) return;
      const next = campaignContentDraft(result); baseline.current = next; setDraft(next); setSaved(true); onSaved(result);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof ApiClientError && failure.status === 409 ? 'conflict' : 'network');
    } finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  function discard() { const action = pending; setPending(null); setDraft(structuredClone(baseline.current)); setError(null); setSaved(false); action?.(); }
  return { draft, dirty, busy, error, saved, update, save, pending: Boolean(pending), navigate, discard, keepEditing: () => setPending(null) };
}
