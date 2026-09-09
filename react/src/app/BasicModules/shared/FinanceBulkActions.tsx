import { useRef, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { OperationalBulkActionsBar } from './operational/OperationalBulkActionsBar';
import { getFinanceBulkCopy, type FinanceBulkAction } from './financeBulkActions.copy';

export type FinanceBulkOption = { value: string; label: string };
export type FinanceBulkActionConfig = { action: FinanceBulkAction; options?: FinanceBulkOption[]; blockedReason?: string; hint?: string };

/** Presentation only: each module owns its eligibility rules and atomic mutation. */
export function FinanceBulkActions({ count, locale, actions, onApply, onClear, formatError }: {
  count: number; locale: string; actions: FinanceBulkActionConfig[];
  onApply: (action: FinanceBulkAction, targetId: string, reason: string) => Promise<void>;
  onClear: () => void; formatError: (error: unknown) => string;
}) {
  const copy = getFinanceBulkCopy(locale);
  const [active, setActive] = useState<FinanceBulkAction | null>(null);
  const [target, setTarget] = useState('__choose__');
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const config = actions.find(item => item.action === active);
  const blocked = count > 200 ? copy.limit : config?.blockedReason;
  const options = config?.options ?? [];
  const filtered = options.filter(option => option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || option.value === target);
  const validTarget = target === '' || options.some(option => option.value === target);
  const valid = !blocked && count > 0 && (active === 'DELETE' ? reason.trim().length >= 8 : target !== '__choose__' && validTarget);
  const open = (action: FinanceBulkAction) => { setActive(action); setTarget('__choose__'); setQuery(''); setReason(''); setError(''); };
  const close = () => { if (!inFlight.current) setActive(null); };
  const apply = async () => {
    if (!active || !valid || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      await onApply(active, target, reason.trim());
      setActive(null); onClear();
    } catch (failure) { setError(formatError(failure) || copy.error); }
    finally { inFlight.current = false; setBusy(false); }
  };
  if (!count) return null;
  return <>
    <OperationalBulkActionsBar title={copy.title} selectedLabel={`${count} ${copy.selected}`} actions={[
      ...actions.map(item => ({ id: item.action, label: copy[item.action], disabled: busy, onClick: () => open(item.action), tone: item.action === 'DELETE' ? 'danger' as const : 'default' as const })),
      { id: 'clear', label: copy.cancel, disabled: busy, onClick: onClear },
    ]} />
    {config && active && <IndiceModalFrame open onOpenChange={next => { if (!next) close(); }} busy={busy} tone="green"
      icon={<ListChecks />} title={copy[active]} description={`${count} ${copy.selected}`} modalType="standard-form"
      footer={<><Button variant="outline" disabled={busy} onClick={close}>{copy.cancel}</Button><Button disabled={!valid || busy} onClick={() => void apply()}>{copy.apply}</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">{copy.confirm}</p>
        {config.hint && <IndiceModalValidation tone="info" messages={[config.hint]} />}
        {blocked ? <IndiceModalValidation tone="warning" messages={[blocked]} /> : active === 'DELETE'
          ? <label className="block text-sm font-medium">{copy.reason}<textarea className="mt-2 w-full rounded-lg border bg-transparent p-3" value={reason} maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
          : <div className="space-y-3">
            <input aria-label={copy.search} placeholder={copy.search} className="w-full rounded-lg border bg-transparent p-3" value={query} disabled={busy} onChange={event => setQuery(event.target.value)} />
            <select aria-label={copy[active]} className="w-full rounded-lg border bg-white p-3 text-slate-900 dark:bg-slate-900 dark:text-white" value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>
              <option value="__choose__" disabled>{copy.choose}</option><option value="">{copy.clear}</option>
              {filtered.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>}
        {error && <IndiceModalValidation messages={[error]} />}
      </div>
    </IndiceModalFrame>}
  </>;
}
