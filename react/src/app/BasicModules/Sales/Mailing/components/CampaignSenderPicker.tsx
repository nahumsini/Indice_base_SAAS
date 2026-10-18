import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { MailingSender } from '../../../../ComplementaryModules/Email/emailApi';
import { useEmailCopy } from '../../../../ComplementaryModules/Email/translations';
import { mailingApi } from '../mailingApi';

export function CampaignSenderPicker({ value, disabled, onChange, onConfigure, onResolved }: {
  value: string | null; disabled: boolean; onChange: (sender: MailingSender | null) => void; onConfigure?: () => void; onResolved: (sender: MailingSender | null) => void;
}) {
  const { copy } = useEmailCopy();
  const [items, setItems] = useState<MailingSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setFailed(false);
    mailingApi.senders(controller.signal).then(result => { if (!controller.signal.aborted) setItems(result); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const selected = items.find(item => item.id === value);
  useEffect(() => { onResolved(selected ?? null); }, [selected, onResolved]);
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <label className="block space-y-2 text-sm"><span>{copy.senderAccount}</span>
      <select className="h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
        disabled={disabled || loading || failed} value={value ?? ''} onChange={e => onChange(items.find(item => item.id === e.target.value) ?? null)}>
        <option value="">{copy.chooseSender}</option>
        {value && !selected && <option value={value} disabled>{copy.senderUnavailable}</option>}
        {items.map(item => <option key={item.id} value={item.id}>{item.label} · {item.email}</option>)}
      </select>
    </label>
    {failed ? <div role="alert" className="text-sm"><p>{copy.senderLoadError}</p><Button variant="outline" onClick={() => setRefresh(v => v + 1)}>{copy.refresh}</Button></div>
      : <p className="text-sm text-slate-500 dark:text-slate-400">{value && !selected && !loading ? copy.senderUnavailable : !items.length && !loading ? copy.noSenders : copy.senderHint}</p>}
    {selected && <p className="text-sm">SMTP · {selected.smtpStatus === 'VERIFIED' ? copy.verified : selected.smtpStatus === 'ERROR' ? copy.failed : copy.untested}</p>}
    {onConfigure && <Button type="button" variant="outline" disabled={disabled} onClick={onConfigure}><Settings className="mr-2 h-4 w-4" />{copy.saveAndConfigure}</Button>}
  </section>;
}
