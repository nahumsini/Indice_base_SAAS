import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../../lib/apiClient';
import type { SalesOpportunity } from '../../types/opportunities';
import { nextActionDraft, nextActionPatch, validateNextAction, type NextActionDraft, type NextActionPatch } from '../utils/nextActionDraft';

/** One ephemeral draft per mounted modal; the existing Sales owner commits the partial update. */
export function useNextActionDraft(opportunity: SalesOpportunity, onSave: (id: string, patch: NextActionPatch) => Promise<unknown>, onClose: () => void, failureMessage: string) {
  const [initial] = useState(() => nextActionDraft(opportunity));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const validation = validateNextAction(draft);
  const patch = nextActionPatch(initial, draft);
  const dirty = Object.keys(patch).length > 0;
  const update = (changes: Partial<NextActionDraft>) => {
    if (pending.current) return;
    setDraft(current => ({ ...current, ...changes }));
    setError('');
  };
  const close = () => { if (!pending.current) onClose(); };
  const save = async () => {
    if (pending.current || validation || !dirty) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(opportunity.id, patch);
      if (mounted.current) onClose();
    } catch (failure) {
      if (mounted.current) setError(failure instanceof ApiClientError && [400, 422].includes(failure.status) && failure.message ? failure.message : failureMessage);
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return { draft, update, saving, error, validation, dirty, close, save };
}
