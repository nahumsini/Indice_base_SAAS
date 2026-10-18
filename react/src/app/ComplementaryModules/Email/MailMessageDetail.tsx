import { useState } from 'react';
import { SafeMailView } from './SafeMailView';
import { MailAttachments } from './MailAttachments';
import { useMailCompletionCopy } from './completionCopy';
import { mailboxApi } from './mailboxApi';
import { IndiceTitleBarOverflow, IndiceViewState } from '../../components/frontend-os';
import { Button } from '../../components/ui/button';
import type { MailboxFolder, MailboxMessage } from './mailboxApi';
import { useEmailCopy } from './translations';
import { useMailboxCopy, type MailboxCopy } from './mailboxCopy';
export function messageState(state: MailboxMessage['state'], text: MailboxCopy) {
  return ({ RECEIVED: text.received, DRAFT: text.draft, ACCEPTED: text.accepted, FAILED: text.failed, UNKNOWN: text.unknown, SUBMITTING: text.submitting })[state];
}
export function MailMessageDetail({ account, accountVersion, message, folders, busy, onBack, onWrite, onAction, onDiscard }: {
  account:string;accountVersion:number; message: MailboxMessage | null; folders: MailboxFolder[]; busy: boolean; onBack: () => void;
  onWrite: (mode: 'edit' | 'reply' | 'all' | 'forward' | 'copy') => void;
  onAction: (action: string, target?: string) => void; onDiscard: () => void;
}) {
  const { copy } = useEmailCopy(); const text = useMailboxCopy(); const extra=useMailCompletionCopy();const [copyState,setCopyState]=useState<string>();const [copyBusy,setCopyBusy]=useState(false);const [copyError,setCopyError]=useState(false);
  if (!message) return <IndiceViewState variant="empty" title={copy.selectMessage} tone="blue" />;
  const folder = folders.find(f => f.id === message.folderId);
  const remote = !!folder && message.state === 'RECEIVED';
  const target = (kind: string) => folders.find(f => f.kind === kind && f.id !== message.folderId);
  const hint = ({ ACCEPTED: text.acceptedHint, FAILED: text.failedHint, UNKNOWN: text.unknownHint, SUBMITTING: text.submittingHint } as Record<string, string>)[message.state];
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" disabled={busy} onClick={onBack}>{copy.back}</Button>
      {remote && <IndiceTitleBarOverflow label={copy.actions} items={[
        { id: 'star', label: message.starred ? copy.unstar : copy.star, disabled: busy, onSelect: () => onAction(message.starred ? 'UNSTAR' : 'STAR') },
        { id: 'read', label: copy.unread, disabled: busy, onSelect: () => onAction('UNREAD') },
        ...(['ARCHIVE', 'TRASH', 'INBOX'] as const).flatMap(kind => target(kind) ? [{ id: kind, label: kind === 'ARCHIVE' ? copy.archiveMessage : kind === 'TRASH' ? copy.moveTrash : copy.moveInbox, disabled: busy, onSelect: () => onAction('MOVE', target(kind)!.id) }] : []),
      ]} />}
    </div>
    <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{messageState(message.state, text)}</span><span>·</span><time dateTime={message.occurredAt}>{new Date(message.occurredAt).toLocaleString()}</time></div>
    <h3 className="break-words text-xl font-medium">{message.subject || copy.noSubject}</h3>
    <dl className="my-5 space-y-2 border-b border-slate-100 pb-5 text-sm dark:border-slate-800">
      <div className="break-words"><dt className="inline text-slate-500 dark:text-slate-400">{text.from}: </dt><dd className="inline">{message.fromName} &lt;{message.fromAddress}&gt;</dd></div>
      {(['to', 'cc', 'bcc'] as const).map(field => message[field].length > 0 && <div key={field} className="break-words"><dt className="inline text-slate-500 dark:text-slate-400">{field === 'to' ? copy.to : text[field]}: </dt><dd className="inline">{message[field].join(', ')}</dd></div>)}
    </dl>
    {hint && <p role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">{hint}</p>}
    {message.state==='ACCEPTED'&&<div className="mb-4 space-y-2 text-sm"><p>{(copyState??message.sentCopyState)==='COPIED'?extra.copied:['UNKNOWN','COPYING'].includes(copyState??message.sentCopyState??'')?extra.copyUnknown:(copyState??message.sentCopyState)==='UNAVAILABLE'?extra.copyMissing:extra.copyPending}</p><Button variant="outline" disabled={busy||copyBusy} onClick={async()=>{setCopyBusy(true);setCopyError(false);try{const value=await mailboxApi.sentCopy(account,message.id);setCopyState(value.sentCopyState);}catch{setCopyError(true);}finally{setCopyBusy(false);}}}>{extra.copy}</Button>{copyError&&<p role="alert">{extra.error}</p>}</div>}
    <SafeMailView text={message.bodyText||text.noBody} html={message.bodyHtml}/>
    {message.bodyTruncated && <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{text.truncated}</p>}
    {message.hasAttachments && <MailAttachments account={account} messageId={message.id} version={message.version} accountVersion={accountVersion}/>}
    <div className="mt-7 flex flex-wrap gap-2">
      {message.state === 'DRAFT' ? <><Button disabled={busy} onClick={() => onWrite('edit')}>{text.editDraft}</Button><Button variant="outline" disabled={busy} onClick={onDiscard}>{text.deleteDraft}</Button></>
        : ['UNKNOWN', 'SUBMITTING'].includes(message.state) ? null
          : message.state === 'FAILED' ? <Button disabled={busy} onClick={() => onWrite('copy')}>{text.copyDraft}</Button>
            : <><Button variant="outline" disabled={busy} onClick={() => onWrite('reply')}>{copy.reply}</Button><Button variant="outline" disabled={busy} onClick={() => onWrite('all')}>{text.replyAll}</Button><Button variant="outline" disabled={busy} onClick={() => onWrite('forward')}>{copy.forward}</Button></>}
    </div>
  </>;
}
