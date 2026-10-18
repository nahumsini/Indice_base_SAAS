import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mail, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { IndiceTitleBar, IndiceTitleBarOverflow, IndiceViewState } from '../../components/frontend-os';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { ApiClientError } from '../../lib/apiClient';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import { emailAccountsApi, type ConnectionStatus, type EmailAccount } from './emailApi';
import { AccountEditor } from './AccountEditor';
import { useEmailCopy } from './translations';

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const { copy } = useEmailCopy();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status === 'VERIFIED'
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : status === 'ERROR'
      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
    {status === 'VERIFIED' ? copy.verified : status === 'ERROR' ? copy.failed : copy.untested}
  </span>;
}

export function EmailAccountsWorkspace({ onReturn }: { onReturn?: () => void }) {
  const { copy, locale } = useEmailCopy();
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
      if ((channel === 'SMTP' ? next.smtpStatus : next.receiveStatus) === 'ERROR') setError(copy.testFailure);
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
        {onReturn && <Button variant="outline" disabled={!!busy} onClick={onReturn}><ArrowLeft className="mr-2 h-4 w-4" />{copy.returnMailing}</Button>}
        <Button variant="outline" disabled={loading || !!busy} onClick={() => setRefresh(v => v + 1)}><RefreshCw className="mr-2 h-4 w-4" />{copy.refresh}</Button>
        <Button disabled={loading || !!busy || !data?.configurationAvailable} onClick={() => setEditor('new')}><Plus className="mr-2 h-4 w-4" />{copy.connect}</Button>
      </>} />
    {error && !disconnect && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{notice}</p>}
    {loading ? <IndiceViewState variant="loading" title={copy.loading} tone="blue" />
      : !data ? <IndiceViewState variant="error" title={copy.loadError} tone="blue" action={<Button variant="outline" onClick={() => setRefresh(v => v + 1)}>{copy.refresh}</Button>} />
      : <>
        {!data.configurationAvailable && <IndiceViewState variant="restricted" title={copy.setupUnavailable} description={copy.setupUnavailableDescription} tone="blue" />}
        {!data.items.length ? <IndiceViewState variant="empty" title={copy.noAccounts} description={copy.noAccountsDescription} tone="blue"
          action={data.configurationAvailable ? <Button onClick={() => setEditor('new')}>{copy.connect}</Button> : undefined} />
          : <div className="grid gap-5 xl:grid-cols-2">{data.items.map(account => <article key={account.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-base font-medium">{account.label}</h3><p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">{account.email}</p></div>
              <IndiceTitleBarOverflow label={copy.actions} items={[
                { id: 'edit', label: copy.edit, disabled: !!busy, onSelect: () => setEditor(account) },
                { id: 'disconnect', label: copy.disconnect, disabled: !!busy, onSelect: () => { setError('');setDisconnect(account); } },
              ]} />
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4" />{copy.privateAccount}</p>
            <dl className="mt-5 space-y-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><dt>{copy.sending} · SMTP</dt><dd><ConnectionBadge status={account.smtpStatus} />{account.smtpCheckedAt && <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{copy.lastTest}: {new Date(account.smtpCheckedAt).toLocaleString(locale)}</p>}</dd></div>
              <div className="flex flex-wrap items-center justify-between gap-2"><dt>{copy.receiving}{account.receiveProtocol !== 'NONE' && ` · ${account.receiveProtocol}`}</dt><dd>{account.receiveProtocol === 'NONE' ? <span className="text-slate-500">{copy.disabled}</span> : <span><ConnectionBadge status={account.receiveStatus} />{account.receiveCheckedAt && <span className="mt-1 block text-right text-xs text-slate-500 dark:text-slate-400">{copy.lastTest}: {new Date(account.receiveCheckedAt).toLocaleString(locale)}</span>}</span>}</dd></div>
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800"><dt className="text-slate-500 dark:text-slate-400">Mailing</dt><dd className="mt-1">{account.mailingEnabled ? copy.mailingHint : copy.disabled}</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" disabled={!!busy || !data.configurationAvailable} onClick={() => void test(account, 'SMTP')}>{busy === account.id ? copy.testing : copy.testSmtp}</Button>
              {account.receiveProtocol !== 'NONE' && <Button variant="outline" disabled={!!busy || !data.configurationAvailable} onClick={() => void test(account, 'RECEIVE')}>{copy.testReceive}</Button>}
            </div>
          </article>)}</div>}
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
