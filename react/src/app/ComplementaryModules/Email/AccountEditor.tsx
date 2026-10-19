import { useEffect, useRef, useState } from 'react';
import { Inbox, Mail, Send, ShieldCheck, UserRound } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ApiClientError } from '../../lib/apiClient';
import { emailAccountsApi, type AccountInput, type EmailAccount } from './emailApi';
import { useEmailCopy } from './translations';
import { useEmailExperienceCopy } from './emailExperienceCopy';

export function AccountEditor({ account, onClose, onSaved }: {
  account: EmailAccount | null; onClose: () => void; onSaved: () => void;
}) {
  const { copy } = useEmailCopy();
  const ux = useEmailExperienceCopy();
  const [value, setValue] = useState<AccountInput>(() => ({
    label: account?.label ?? '', email: account?.email ?? '', displayName: account?.displayName ?? '',
    smtpHost: account?.smtpHost ?? '', smtpPort: account?.smtpPort ?? 465,
    smtpSecurity: account?.smtpSecurity ?? 'TLS', smtpUsername: account?.smtpUsername ?? '', smtpPassword: '',
    receiveProtocol: account?.receiveProtocol ?? 'NONE', receiveHost: account?.receiveHost ?? '',
    receivePort: account?.receivePort ?? 993, receiveUsername: account?.receiveUsername ?? '', receivePassword: '',
    mailingEnabled: account?.mailingEnabled ?? false, version: account?.version ?? 0,
  }));
  const id = useRef(account?.id ?? crypto.randomUUID());
  const initial = useRef(JSON.stringify(value));
  const form = useRef<HTMLFormElement>(null);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(value) !== initial.current;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function close() { if (!busy) dirty ? setDiscard(true) : onClose(); }
  function update<K extends keyof AccountInput>(key: K, next: AccountInput[K]) { setValue(v => ({ ...v, [key]: next })); setError(''); }
  async function save() {
    if (!form.current?.reportValidity()) { setError(copy.required); return; }
    setBusy(true); setError('');
    try { await emailAccountsApi.save(id.current, value); onSaved(); }
    catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 409) { setError(copy.conflict); setBlocked(true); }
      else setError(copy.saveError);
    } finally { setBusy(false); }
  }
  const field = (key: 'label' | 'email' | 'displayName' | 'smtpHost' | 'smtpUsername' | 'smtpPassword' | 'receiveHost' | 'receiveUsername' | 'receivePassword', label: string) => {
    const password = key.endsWith('Password');
    const stored = key === 'smtpPassword' ? account?.hasSmtpPassword : account?.hasReceivePassword;
    return <label className="block space-y-2 text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{label}{(!password || !stored) && <span aria-hidden className="ml-1 text-blue-600 dark:text-blue-300">*</span>}</span>
      <Input className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-label={label} aria-describedby={password && stored ? `${id.current}-${key}-hint` : undefined} value={value[key]} required={!password || !stored}
        maxLength={password ? 2048 : key.endsWith('Host') ? 253 : key === 'label' || key === 'displayName' ? 160 : 240}
        type={password ? 'password' : key === 'email' ? 'email' : 'text'}
        autoComplete={password ? 'new-password' : 'off'} disabled={busy}
        onChange={event => update(key, event.target.value)} />
      {password && stored && <span id={`${id.current}-${key}-hint`} className="block text-xs text-slate-500 dark:text-slate-400">{copy.passwordHint}</span>}
    </label>;
  };
  const selectClass = 'h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:focus-visible:ring-blue-900';
  return <IndiceModalFrame open tone="blue" modalType={discard ? 'confirmation' : 'standard-form'} busy={busy}
    icon={<Mail className="h-5 w-5" />} title={discard ? copy.discardTitle : copy.accountForm}
    description={discard ? copy.discardDescription : copy.formDescription} closeLabel={copy.cancel}
    bodyClassName="bg-white dark:bg-slate-950"
    onOpenChange={open => { if (!open) discard ? setDiscard(false) : close(); }}
    footerLeading={<Button className="h-11 rounded-xl !border-white !bg-white px-5 !text-slate-600 hover:!bg-white/90" variant="outline" disabled={busy} onClick={() => discard ? setDiscard(false) : close()}>{discard ? copy.keepEditing : copy.cancel}</Button>}
    footer={discard ? <Button data-modal-destructive onClick={onClose}>{copy.discard}</Button>
      : <Button disabled={busy || blocked} onClick={() => void save()}>{busy ? copy.saving : copy.save}</Button>}>
    {!discard && <form ref={form} onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4">
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{ux.requiredHint}</p>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
      <fieldset disabled={busy} className="space-y-3"><legend className="mb-1 flex items-center gap-2 text-sm font-semibold"><UserRound aria-hidden className="h-4 w-4 text-blue-600 dark:text-blue-400" />{copy.identity}</legend>
        {field('label', copy.label)}<div className="grid gap-4 sm:grid-cols-2">{field('email', copy.address)}{field('displayName', copy.displayName)}</div>
      </fieldset>
      <fieldset disabled={busy} className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700"><legend className="flex items-center gap-2 pr-3 text-sm font-semibold"><Send aria-hidden className="h-4 w-4 text-blue-600 dark:text-blue-400" />{copy.outgoing}</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">{field('smtpHost', copy.host)}
          <label className="space-y-2 text-sm"><span className="block font-medium text-slate-700 dark:text-slate-200">{copy.port} · {copy.security}</span>
            <select className={selectClass} value={value.smtpPort} onChange={e => setValue(v => ({ ...v, smtpPort: Number(e.target.value), smtpSecurity: e.target.value === '465' ? 'TLS' : 'STARTTLS' }))}>
              <option value={465}>465 · TLS</option><option value={587}>587 · STARTTLS</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{field('smtpUsername', copy.username)}{field('smtpPassword', copy.password)}</div>
      </fieldset>
      <fieldset disabled={busy} className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700"><legend className="flex items-center gap-2 pr-3 text-sm font-semibold"><Inbox aria-hidden className="h-4 w-4 text-blue-600 dark:text-blue-400" />{copy.incoming}</legend>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2 text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{copy.receiveProtocol}</span>
          <select className={selectClass} value={value.receiveProtocol} onChange={e => setValue(v => ({ ...v, receiveProtocol: e.target.value as AccountInput['receiveProtocol'], receivePort: e.target.value === 'POP3' ? 995 : 993 }))}>
            <option value="NONE">{copy.none}</option><option value="IMAP">IMAP · 993 · TLS</option><option value="POP3">POP3 · 995 · TLS</option>
          </select>
        </label>
        {value.receiveProtocol !== 'NONE' && field('receiveHost', copy.host)}</div>
        {value.receiveProtocol !== 'NONE' && <><div className="grid gap-4 sm:grid-cols-2">{field('receiveUsername', copy.username)}{field('receivePassword', copy.password)}</div></>}
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.receiveHint}</p>
      </fieldset>
      <fieldset disabled={busy} className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4" checked={value.mailingEnabled} onChange={e => update('mailingEnabled', e.target.checked)} />{copy.mailingEnabled}</label>
        <p className="ml-7 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.mailingHint}</p>
      </fieldset>
      <div className="flex gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{ux.passwordHint}</p><p className="mt-1">{copy.credentialsHint}</p></div></div>
    </form>}
  </IndiceModalFrame>;
}
