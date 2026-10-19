import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, CircleAlert, Inbox, Mail, Pencil, Plus, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { IndiceTitleBar, IndiceTitleBarOverflow, IndiceViewState } from '../../components/frontend-os';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { ApiClientError } from '../../lib/apiClient';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import { emailAccountsApi, type ConnectionStatus, type EmailAccount } from './emailApi';
import { connectionTestMessage } from './connectionDiagnostics';
import { AccountEditor } from './AccountEditor';
import { useEmailCopy } from './translations';
import { useEmailExperienceCopy } from './emailExperienceCopy';

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const { copy } = useEmailCopy();
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status === 'VERIFIED'
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : status === 'ERROR'
      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
    {status === 'VERIFIED' ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : status === 'ERROR' ? <CircleAlert aria-hidden className="h-3.5 w-3.5" /> : <Circle aria-hidden className="h-3.5 w-3.5" />}
    {status === 'VERIFIED' ? copy.verified : status === 'ERROR' ? copy.failed : copy.untested}
  </span>;
}

export function EmailAccountsWorkspace({ onReturn, onMailbox }: { onReturn?: () => void; onMailbox?: () => void }) {
  const { copy, locale } = useEmailCopy();
  const ux = useEmailExperienceCopy();
  const revision = useAuthorizationRevision();
  const scope = useRef(revision);scope.current = revision;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true;return () => { mounted.current = false; }; }, []);
  const [data, setData] = useState<{ items: EmailAccount[]; configurationAvailable: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<EmailAccount | 'new' | null>(null);
  const [disconnect, setDisconnect] = useState<EmailAccount | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { setEditor(null); setDisconnect(null); setNotice(''); setBusy(''); }, [revision]);
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setError('');setData(null);
    emailAccountsApi.list(controller.signal).then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError(copy.loadError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, revision, copy.loadError]);
  async function test(account: EmailAccount, channel: 'SMTP' | 'RECEIVE') {
    const requestScope = revision;
    setBusy(account.id);setError('');setNotice('');
    try {
      const next = await emailAccountsApi.test(account, channel);
      if (!mounted.current || scope.current !== requestScope) return;
      setData(d => d && ({ ...d, items: d.items.map(item => item.id === next.id ? next : item) }));
      if ((channel === 'SMTP' ? next.smtpStatus : next.receiveStatus) === 'ERROR') setError(`${channel === 'SMTP' ? 'SMTP' : account.receiveProtocol}: ${connectionTestMessage(next.failureCode, copy)}`);
      else setNotice(copy.verified);
    } catch (failure) { if (!mounted.current || scope.current !== requestScope) return;setError(failure instanceof ApiClientError && failure.status === 429 ? copy.rateLimited : failure instanceof ApiClientError && failure.status === 409 ? copy.conflict : copy.testFailure); }
    finally { if (mounted.current && scope.current === requestScope) setBusy(''); }
  }
  async function remove() {
    if (!disconnect) return;const requestScope = revision;setBusy(disconnect.id);setError('');
    try { await emailAccountsApi.disconnect(disconnect);if (!mounted.current || scope.current !== requestScope) return;setDisconnect(null);setNotice(copy.disconnected);setRefresh(v => v + 1); }
    catch (failure) { if (!mounted.current || scope.current !== requestScope) return;setError(failure instanceof ApiClientError && failure.status === 409 ? copy.conflict : copy.saveError); }
    finally { if (mounted.current && scope.current === requestScope) setBusy(''); }
  }
  return <div className="space-y-5">
    <IndiceTitleBar title={copy.accounts} subtitle={copy.accountsDescription} icon={<Mail className="h-5 w-5" />} tone="blue"
      actions={<>
        {!onReturn && onMailbox && <Button variant="outline" disabled={!!busy} onClick={onMailbox}><Inbox className="mr-2 h-4 w-4" />{ux.openMailbox}</Button>}
        {onReturn && <Button variant="outline" disabled={!!busy} onClick={onReturn}><ArrowLeft className="mr-2 h-4 w-4" />{copy.returnMailing}</Button>}
        <Button variant="outline" disabled={loading || !!busy} onClick={() => setRefresh(v => v + 1)}><RefreshCw className="mr-2 h-4 w-4" />{copy.refresh}</Button>
        <Button disabled={loading || !!busy || !data?.configurationAvailable} onClick={() => setEditor('new')}><Plus className="mr-2 h-4 w-4" />{copy.connect}</Button>
      </>} />
    {error && !disconnect && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 aria-hidden className="h-4 w-4 shrink-0" />{notice}</p>}
    {loading ? <IndiceViewState variant="loading" title={copy.loading} tone="blue" />
      : !data ? <IndiceViewState variant="error" title={copy.loadError} tone="blue" action={<Button variant="outline" onClick={() => setRefresh(v => v + 1)}>{copy.refresh}</Button>} />
      : <>
        {!data.configurationAvailable && <IndiceViewState variant="restricted" title={copy.setupUnavailable} description={copy.setupUnavailableDescription} tone="blue" />}
        {!data.items.length ? <IndiceViewState variant="empty" title={copy.noAccounts} description={copy.noAccountsDescription} tone="blue"
          action={data.configurationAvailable ? <Button onClick={() => setEditor('new')}>{copy.connect}</Button> : undefined} />
          : <div className={`grid gap-5 ${data.items.length > 1 ? '2xl:grid-cols-2' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400 2xl:col-span-full">
              <p>{ux.connectionGuide}</p><span className="flex items-center gap-1.5"><ShieldCheck aria-hidden className="h-4 w-4" />{copy.privateAccount}</span>
            </div>
            {data.items.map(account => <article key={account.id} aria-busy={busy === account.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"><Mail aria-hidden className="h-6 w-6" /></span>
                  <div className="min-w-0"><h3 className="break-words text-lg font-semibold text-slate-900 dark:text-slate-100">{account.label}</h3><p className="mt-0.5 break-all text-sm text-slate-500 dark:text-slate-400">{account.email}</p></div>
                </div>
                <div className="flex shrink-0 items-center gap-2"><Button className="h-11 rounded-xl" variant="outline" disabled={!!busy} onClick={() => setEditor(account)}><Pencil aria-hidden className="mr-2 h-4 w-4" />{copy.edit}</Button>
                  <IndiceTitleBarOverflow className="w-auto shrink-0 rounded-xl" label={copy.actions} items={[
                    { id: 'disconnect', label: copy.disconnect, disabled: !!busy, onSelect: () => { setError('');setDisconnect(account); } },
                  ]} />
                </div>
              </header>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <section aria-label={`${copy.sending} · SMTP`} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold"><Send aria-hidden className="h-4 w-4 text-blue-600 dark:text-blue-400" />{copy.sending} · SMTP</h4><ConnectionBadge status={account.smtpStatus} /></div>
                  <p className="break-all text-sm text-slate-700 dark:text-slate-200">{account.smtpHost}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.port} {account.smtpPort} · {account.smtpSecurity}</p>
                  {account.smtpCheckedAt && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.lastTest}: {new Date(account.smtpCheckedAt).toLocaleString(locale)}</p>}
                  <div className="mt-auto pt-4"><Button className="h-11 w-full rounded-xl bg-white dark:bg-slate-900" variant="outline" disabled={!!busy || !data.configurationAvailable} onClick={() => void test(account, 'SMTP')}><RefreshCw aria-hidden className="mr-2 h-4 w-4" />{copy.testSmtp}</Button></div>
                </section>
                <section aria-label={copy.receiving} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold"><Inbox aria-hidden className="h-4 w-4 text-blue-600 dark:text-blue-400" />{copy.receiving}{account.receiveProtocol !== 'NONE' && ` · ${account.receiveProtocol}`}</h4>{account.receiveProtocol !== 'NONE' && <ConnectionBadge status={account.receiveStatus} />}</div>
                  {account.receiveProtocol === 'NONE' ? <p className="text-sm text-slate-500 dark:text-slate-400">{copy.disabled}</p> : <>
                    <p className="break-all text-sm text-slate-700 dark:text-slate-200">{account.receiveHost}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.port} {account.receivePort} · TLS</p>
                    {account.receiveCheckedAt && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.lastTest}: {new Date(account.receiveCheckedAt).toLocaleString(locale)}</p>}
                    <div className="mt-auto pt-4"><Button className="h-11 w-full rounded-xl bg-white dark:bg-slate-900" variant="outline" disabled={!!busy || !data.configurationAvailable} onClick={() => void test(account, 'RECEIVE')}><RefreshCw aria-hidden className="mr-2 h-4 w-4" />{copy.testReceive}</Button></div>
                  </>}
                </section>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-800">
                <div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium"><span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${account.mailingEnabled ? 'bg-blue-600' : 'bg-slate-400'}`} />{account.mailingEnabled ? ux.mailingOn : ux.mailingOff}</p>{account.mailingEnabled && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.mailingHint}</p>}</div>
                {busy === account.id && <span role="status" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300"><RefreshCw aria-hidden className="h-4 w-4 animate-spin" />{copy.testing}</span>}
              </div>
            </article>)}
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400 2xl:col-span-full">{ux.checkHint}</p>
          </div>}

      </>}
    {editor && <AccountEditor account={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null);setNotice(copy.saved);setRefresh(v => v + 1); }} />}
    {disconnect && <IndiceModalFrame open tone="blue" modalType="confirmation" busy={!!busy} icon={<Mail className="h-5 w-5" />}
      title={copy.disconnectTitle} description={copy.disconnectDescription} closeLabel={copy.cancel} onOpenChange={open => { if (!open) setDisconnect(null); }}
      footerLeading={<Button className="h-11 rounded-xl !border-white !bg-white px-5 !text-slate-600 hover:!bg-white/90" variant="outline" disabled={!!busy} onClick={() => setDisconnect(null)}>{copy.cancel}</Button>}
      footer={<Button data-modal-destructive disabled={!!busy} onClick={() => void remove()}>{copy.disconnect}</Button>}>
      <p className="break-all text-sm">{disconnect.email}</p>{error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </IndiceModalFrame>}
  </div>;
}
