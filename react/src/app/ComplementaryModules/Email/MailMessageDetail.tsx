import { useMailDailyCopy } from './mailDailyCopy';
import { useState } from 'react';
import { Archive, ArrowLeft, ChevronDown, FolderInput, Forward, MailOpen, Maximize2, Minimize2, MoreHorizontal, Reply, ReplyAll, Star, Trash2 } from 'lucide-react';
import { useMailWorkspaceCopy, sendFailureText } from './mailWorkspaceCopy';
import { SafeMailView } from './SafeMailView';
import { MailAttachments } from './MailAttachments';
import { useMailCompletionCopy } from './completionCopy';
import { mailboxApi } from './mailboxApi';
import { IndiceViewState } from '../../components/frontend-os';
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { presentMailFolders } from './mailFolderPresentation';
import type { MailboxFolder, MailboxMessage } from './mailboxApi';
import { useEmailCopy } from './translations';
import { useMailboxCopy, type MailboxCopy } from './mailboxCopy';
export function messageState(state: MailboxMessage['state'], text: MailboxCopy) {
  return ({ RECEIVED: text.received, DRAFT: text.draft, ACCEPTED: text.accepted, FAILED: text.failed, UNKNOWN: text.unknown, SUBMITTING: text.submitting })[state];
}
export function MailMessageDetail({ account, accountVersion, message, folders, busy, onBack, onWrite, onAction, onDiscard, expanded = false, onToggleExpanded }: {
  account:string;accountVersion:number; message: MailboxMessage | null; folders: MailboxFolder[]; busy: boolean; onBack: () => void;
  onWrite: (mode: 'edit' | 'reply' | 'all' | 'forward' | 'copy') => void;
  onAction: (action: string, target?: string) => void; onDiscard: () => void;
  expanded?: boolean; onToggleExpanded?: () => void;
}) {
  const daily=useMailDailyCopy();const work=useMailWorkspaceCopy();const { copy, locale } = useEmailCopy(); const text = useMailboxCopy(); const extra=useMailCompletionCopy();const [copyState,setCopyState]=useState<string>();const [copyBusy,setCopyBusy]=useState(false);const [copyError,setCopyError]=useState(false);
  if (!message) return <IndiceViewState compact className="min-h-[360px] rounded-none border-0 bg-transparent shadow-none dark:bg-transparent" variant="empty" title={work.emptyReader} description={work.readerHint} tone="blue" />;
  const folder = folders.find(f => f.id === message.folderId);
  const remote = !!folder && ['RECEIVED','ACCEPTED'].includes(message.state);
  const target = (kind: string) => folders.find(f => f.kind === kind && f.id !== message.folderId);
  const diagnostic = sendFailureText(message.failureCode,work) ?? ({email_send_authentication_failed:copy.testAuthentication,email_send_dns_failed:copy.testDns,email_send_connection_failed:copy.testConnection,email_send_tls_failed:copy.testTls} as Record<string,string>)[message.failureCode??''];
  const hint = diagnostic ?? ({ ACCEPTED: daily.acceptedHint, FAILED: text.failedHint, UNKNOWN: text.unknownHint, SUBMITTING: text.submittingHint } as Record<string, string>)[message.state];
  const canReply = ['RECEIVED', 'ACCEPTED'].includes(message.state);
  const namedFolders = presentMailFolders(folders, { INBOX: work.inbox, SENT: copy.sent, ARCHIVE: work.archive, TRASH: copy.trash, JUNK: work.spam, DRAFTS: copy.drafts });
  const iconButton = 'h-11 w-11 shrink-0 rounded-lg';
  return <>
    <div className="sticky top-0 z-[2] flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50/80 px-3 py-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
      <div className="flex items-center gap-0.5" role="group" aria-label={work.organize}>
        <Button className={iconButton} variant="ghost" size="icon" aria-label={copy.back} title={copy.back} disabled={busy} onClick={onBack}><ArrowLeft aria-hidden className="h-4 w-4" /></Button>
        {remote && <>
          <span aria-hidden className="mx-1 h-5 border-l border-slate-300 dark:border-slate-600" />
          {(['ARCHIVE', 'TRASH'] as const).map(kind => target(kind) && <Button key={kind} className={`${iconButton} ${kind === 'ARCHIVE' ? 'text-[#257B68] hover:bg-[#59C3A5]/15 dark:text-[#8FE0CA]' : 'hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-200'}`} variant="ghost" size="icon" disabled={busy} aria-label={kind === 'ARCHIVE' ? copy.archiveMessage : copy.moveTrash} title={kind === 'ARCHIVE' ? copy.archiveMessage : copy.moveTrash} onClick={() => onAction('MOVE', target(kind)!.id)}>{kind === 'ARCHIVE' ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}</Button>)}
          <DropdownMenu><DropdownMenuTrigger asChild><Button className={`${iconButton} text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-900/40`} variant="ghost" size="icon" disabled={busy} aria-label={work.move} title={work.move}><FolderInput className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-xl p-1.5">
              <p className="px-2 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">{work.move}</p>
              {namedFolders.filter(f => f.id !== message.folderId).map(f => <DropdownMenuItem key={f.id} disabled={busy} title={f.name} className="min-h-11 rounded-lg break-words" onSelect={() => onAction('MOVE', f.id)}>{f.label}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className={iconButton} variant="ghost" size="icon" aria-label={message.starred ? copy.unstar : copy.star} title={message.starred ? copy.unstar : copy.star} aria-pressed={message.starred} disabled={busy} onClick={() => onAction(message.starred ? 'UNSTAR' : 'STAR')}><Star className={`h-4 w-4 ${message.starred ? 'fill-amber-400 text-amber-600' : ''}`} /></Button>
        </>}
      </div>
      <div className="flex items-center gap-1">
        {onToggleExpanded && <Button variant="ghost" className={`${expanded ? 'inline-flex' : 'hidden lg:inline-flex'} h-11 rounded-lg text-xs text-violet-800 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/40`} aria-pressed={expanded} onClick={onToggleExpanded}>{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}{expanded ? work.restoreReading : work.expandReading}</Button>}
        {message.state === 'DRAFT' && <><Button className="h-11 rounded-lg" disabled={busy} onClick={() => onWrite('edit')}>{text.editDraft}</Button><Button className={iconButton} size="icon" variant="ghost" aria-label={text.deleteDraft} title={text.deleteDraft} disabled={busy} onClick={onDiscard}><Trash2 className="h-4 w-4" /></Button></>}
        {message.state === 'FAILED' && <Button className="h-11 rounded-lg" disabled={busy} onClick={() => onWrite('copy')}>{text.copyDraft}</Button>}
        {canReply && <Button variant="outline" className="h-11 rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60" disabled={busy} onClick={() => onWrite('reply')}><Reply aria-hidden className="h-4 w-4" />{copy.reply}</Button>}
        {(canReply || remote) && <DropdownMenu><DropdownMenuTrigger asChild><Button className="h-11 rounded-lg" variant="ghost" disabled={busy} aria-label={copy.actions} title={copy.actions}><MoreHorizontal className="h-4 w-4" />{work.more}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
            {canReply && <><DropdownMenuItem className="min-h-11 rounded-lg" disabled={busy} onSelect={() => onWrite('all')}><ReplyAll className="h-4 w-4" />{text.replyAll}</DropdownMenuItem><DropdownMenuItem className="min-h-11 rounded-lg" disabled={busy} onSelect={() => onWrite('forward')}><Forward className="h-4 w-4" />{copy.forward}</DropdownMenuItem></>}
            {remote && <DropdownMenuItem className="min-h-11 rounded-lg" disabled={busy} onSelect={() => onAction('UNREAD')}><MailOpen className="h-4 w-4" />{copy.unread}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </div>
    <div className={`p-4 sm:p-5 ${expanded ? 'mx-auto max-w-4xl' : ''}`}>
    <h3 className="break-words text-xl font-semibold leading-snug">{message.subject || copy.noSubject}</h3>
    <div className="my-4 rounded-xl border border-blue-100/80 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 break-words text-sm font-medium">{message.fromName || message.fromAddress}</p>
        <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={message.occurredAt}>{new Date(message.occurredAt).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
      </div>
      {message.fromName && <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">{message.fromAddress}</p>}
      <details className="group mt-1 text-xs">
        <summary aria-label={work.details} className="flex min-h-11 cursor-pointer items-center gap-1 rounded-lg text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400"><span className="min-w-0 truncate">{copy.to}: {message.to.join(', ') || '—'}</span><ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" /></summary>
        <dl className="mt-1 space-y-2 rounded-xl bg-slate-50 p-3 leading-5 dark:bg-slate-800">
          <div className="break-words"><dt className="inline text-slate-500 dark:text-slate-400">{text.from}: </dt><dd className="inline">{message.fromName} &lt;{message.fromAddress}&gt;</dd></div>
          {(['to', 'cc', 'bcc'] as const).map(field => message[field].length > 0 && <div key={field} className="break-words"><dt className="inline text-slate-500 dark:text-slate-400">{field === 'to' ? copy.to : text[field]}: </dt><dd className="inline">{message[field].join(', ')}</dd></div>)}
          <div>{message.state === 'ACCEPTED' ? daily.accepted : messageState(message.state, text)} · {new Date(message.occurredAt).toLocaleString(locale)}</div>
          {folder && <div className="break-words">{copy.folders}: {folder.name}</div>}
        </dl>
      </details>
    </div>
    {hint && <p role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">{hint}</p>}
    {message.state==='ACCEPTED'&&<div className="mb-4 space-y-2 text-sm"><p>{(copyState??message.sentCopyState)==='COPIED'?extra.copied:['UNKNOWN','COPYING'].includes(copyState??message.sentCopyState??'')?extra.copyUnknown:(copyState??message.sentCopyState)==='UNAVAILABLE'?extra.copyMissing:extra.copyPending}</p><Button className="h-11 rounded-xl" variant="outline" disabled={busy||copyBusy} onClick={async()=>{setCopyBusy(true);setCopyError(false);try{const value=await mailboxApi.sentCopy(account,message.id);setCopyState(value.sentCopyState);}catch{setCopyError(true);}finally{setCopyBusy(false);}}}>{extra.copy}</Button>{copyError&&<p role="alert">{extra.error}</p>}</div>}
    <SafeMailView text={message.bodyText||text.noBody} html={message.bodyHtml}/>
    {message.bodyTruncated && <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{text.truncated}</p>}
    {message.hasAttachments && <MailAttachments account={account} messageId={message.id} version={message.version} accountVersion={accountVersion}/>}
    </div>
  </>;
}
