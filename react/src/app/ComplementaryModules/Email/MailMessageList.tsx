import { Paperclip, Star } from 'lucide-react';
import type { MailboxMessage } from './mailboxApi';
import { messageState } from './MailMessageDetail';
import { useEmailCopy } from './translations';
import { useMailboxCopy } from './mailboxCopy';
import { useEmailExperienceCopy } from './emailExperienceCopy';

// Decorative identity only: the same correspondent keeps a tint across messages and sorting.
const avatarTints = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  'bg-[#59C3A5]/20 text-[#1D6254] dark:bg-[#59C3A5]/15 dark:text-[#8FE0CA]',
];
function avatarTint(identity: string) {
  let hash = 0;
  for (const character of identity.trim().toLowerCase()) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return avatarTints[hash % avatarTints.length];
}

/** Presentation only: opening, paging and remote read state stay with the mailbox owner. */
export function MailMessageList({ messages, selectedId, busy, onOpen, outgoing = false }: {
  outgoing?: boolean; messages: MailboxMessage[]; selectedId?: string; busy: boolean; onOpen: (message: MailboxMessage) => void;
}) {
  const { copy, locale } = useEmailCopy();
  const text = useMailboxCopy();
  const ux = useEmailExperienceCopy();
  return <ul aria-label={copy.mailbox} className="divide-y divide-slate-100 dark:divide-slate-800">
    {messages.map(message => {
      const sender = outgoing || message.state !== 'RECEIVED' ? `${copy.to}: ${message.to.join(', ')}` : message.fromName || message.fromAddress;
      const identity = (outgoing || message.state !== 'RECEIVED' ? message.to[0] : message.fromAddress) || sender;
      const selected = selectedId === message.id;
      return <li key={message.id}><button disabled={busy} aria-pressed={selected} onClick={() => onOpen(message)}
        className={`flex w-full min-w-0 gap-2.5 border-l-[3px] px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:opacity-60 ${selected ? 'border-l-blue-600 bg-blue-100/70 dark:bg-blue-950/70' : `border-l-transparent hover:bg-blue-50 dark:hover:bg-slate-800/70 ${!message.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}`}>
        <span aria-hidden className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTint(identity)}`}>{((outgoing || message.state !== 'RECEIVED' ? message.to[0] : message.fromName || message.fromAddress) || copy.me).trim().slice(0, 1).toLocaleUpperCase(locale)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span title={sender} className={`min-w-0 flex-1 truncate text-sm ${message.read ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-950 dark:text-white'}`}>{sender}</span>
            <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400" dateTime={message.occurredAt} title={new Date(message.occurredAt).toLocaleString(locale)}>{new Date(message.occurredAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', ...(new Date(message.occurredAt).getFullYear() !== new Date().getFullYear() ? { year: '2-digit' as const } : {}) })}</time>
            {!message.read && <span aria-label={copy.notRead} className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
          </div>
          <p title={message.subject || copy.noSubject} className={`mt-1 line-clamp-2 break-words text-sm leading-5 ${message.read ? 'text-slate-600 dark:text-slate-300' : 'font-medium text-slate-900 dark:text-slate-100'}`}>{message.subject || copy.noSubject}</p>
          {(message.state !== 'RECEIVED' || message.hasAttachments || message.starred) && <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {message.state !== 'RECEIVED' && <span className={['FAILED','UNKNOWN'].includes(message.state) ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>{messageState(message.state, text)}</span>}
              {message.hasAttachments && <Paperclip aria-label={ux.attachment} className="h-3.5 w-3.5" />}
              {message.starred && <Star aria-label={copy.starred} className="h-3.5 w-3.5 fill-amber-400 text-amber-600 dark:text-amber-400" />}
          </div>}
        </div>
      </button></li>;
    })}
  </ul>;
}
