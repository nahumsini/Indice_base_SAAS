import { useState } from 'react';
import { Mail, PenLine, Search, Settings } from 'lucide-react';
import { IndiceTitleBar, IndiceTitleBarOverflow, IndiceViewState, IndiceWorkspaceNavigation } from '../../components/frontend-os';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useWorkspaceNavigationMemory } from '../../hooks/useWorkspaceNavigationMemory';
import { previewMessages, type MailFolder, type MailMessage } from './mailboxPreview';
import { PreviewComposer } from './PreviewComposer';
import { useEmailCopy } from './translations';

const folderIds: MailFolder[] = ['inbox', 'sent', 'drafts', 'archive', 'trash'];
const defaults = { folder: 'inbox' as MailFolder, query: '' };
export function EmailMailboxWorkspace({ preview, onAccounts }: { preview: boolean; onAccounts?: () => void }) {
  const { copy } = useEmailCopy();
  const [messages, setMessages] = useState<MailMessage[]>(() => preview ? previewMessages.map(item => ({ ...item })) : []);
  const [filters, setFilters] = useState(defaults);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ address: string; subject: string; body: string } | null>(null);
  const [notice, setNotice] = useState('');
  useWorkspaceNavigationMemory({ moduleKey: 'email', tabKey: 'mail', defaults, state: filters,
    onRestore: value => setFilters({ folder: folderIds.includes(value.folder) ? value.folder : 'inbox', query: typeof value.query === 'string' ? value.query.slice(0, 180) : '' }) });
  const selected = messages.find(item => item.id === selectedId);
  const visible = messages.filter(item => item.folder === filters.folder && `${item.sender} ${item.address} ${item.subject} ${item.body}`.toLocaleLowerCase().includes(filters.query.trim().toLocaleLowerCase()));
  function update(patch: Partial<MailMessage>) { setMessages(items => items.map(item => item.id === selectedId ? { ...item, ...patch } : item)); }
  const write = (address = '', subject = '', body = '') => setCompose({ address, subject, body });
  return <div className="space-y-5">
    <IndiceTitleBar title={copy.mailbox} subtitle={copy.subtitle} icon={<Mail className="h-5 w-5" />} tone="blue" actions={<>
      {onAccounts && <Button variant="outline" onClick={onAccounts}><Settings className="mr-2 h-4 w-4" />{copy.accounts}</Button>}
      {preview && <Button onClick={() => write()}><PenLine className="mr-2 h-4 w-4" />{copy.compose}</Button>}
    </>} />
    {notice && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{notice}</p>}
    {!preview ? <IndiceViewState variant="empty" title={copy.mailboxPending} description={copy.mailboxDescription} tone="blue"
      action={onAccounts ? <Button onClick={onAccounts}>{copy.connect}</Button> : undefined} />
      : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-4 border-b border-slate-200 p-4 dark:border-slate-700">
          <IndiceWorkspaceNavigation ariaLabel={copy.folders} tone="blue" value={filters.folder}
            onValueChange={folder => { setFilters(f => ({ ...f, folder })); setSelectedId(null); }}
            items={folderIds.map(id => ({ id, label: copy[id] }))} />
          <label className="relative block max-w-xl"><span className="sr-only">{copy.search}</span><Search aria-hidden className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input className="h-11 pl-10" value={filters.query} placeholder={copy.searchPlaceholder} maxLength={180} onChange={e => { setFilters(f => ({ ...f, query: e.target.value })); setSelectedId(null); }} />
          </label>
        </div>
        <div className="grid min-h-[420px] lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <div className={`${selected ? 'hidden lg:block' : ''} max-h-[65dvh] overflow-y-auto border-slate-200 dark:border-slate-700 lg:border-r`}>
            {!visible.length && <IndiceViewState variant="empty" compact title={filters.query ? copy.noResults : copy.emptyFolder} tone="blue" />}
            {visible.map(message => <button key={message.id} aria-pressed={message.id === selectedId}
              onClick={() => { setSelectedId(message.id);setMessages(items => items.map(item => item.id === message.id ? { ...item, read: true } : item)); }}
              className={`w-full border-b border-slate-100 p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-slate-800 ${message.id === selectedId ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className="flex items-center gap-2"><span className="flex-1 truncate text-sm font-medium">{message.folder === 'sent' ? `${copy.to}: ${message.address}` : message.sender}</span>
                {!message.read && <span aria-label={copy.notRead} className="h-2 w-2 rounded-full bg-blue-600" />}{message.starred && <span aria-label={copy.starred}>★</span>}
              </div><p className="mt-2 truncate text-sm">{message.subject}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{message.body}</p>
            </button>)}
          </div>
          <article className={`${selected ? '' : 'hidden lg:block'} min-w-0 p-5 md:p-7`}>
            {!selected ? <IndiceViewState variant="empty" title={copy.selectMessage} tone="blue" /> : <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" onClick={() => setSelectedId(null)}>{copy.back}</Button>
                <IndiceTitleBarOverflow label={copy.actions} items={[
                  { id: 'star', label: selected.starred ? copy.unstar : copy.star, onSelect: () => update({ starred: !selected.starred }) },
                  { id: 'unread', label: copy.unread, onSelect: () => { update({ read: false });setSelectedId(null); } },
                  { id: 'archive', label: ['archive', 'trash'].includes(filters.folder) ? copy.moveInbox : copy.archiveMessage, onSelect: () => { update({ folder: ['archive', 'trash'].includes(filters.folder) ? 'inbox' : 'archive' });setSelectedId(null); } },
                  ...(filters.folder === 'trash' ? [] : [{ id: 'trash', label: copy.moveTrash, onSelect: () => { update({ folder: 'trash' });setSelectedId(null); } }]),
                ]} />
              </div>
              <h3 className="break-words text-xl font-medium">{selected.subject}</h3><div className="my-5 border-b border-slate-100 pb-5 text-sm dark:border-slate-800"><p>{selected.sender}</p><p className="mt-1 break-all text-slate-500 dark:text-slate-400">{selected.address}</p></div>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">{selected.body}</p>
              <div className="mt-8 flex flex-wrap gap-2"><Button variant="outline" onClick={() => write(filters.folder === 'inbox' ? selected.address : '', `Re: ${selected.subject}`)}>{copy.reply}</Button>
                <Button variant="outline" onClick={() => write('', `Fwd: ${selected.subject}`, `\n\n----- ${copy.original} -----\n${selected.body}`)}>{copy.forward}</Button>
                {filters.folder === 'drafts' && <Button variant="outline" onClick={() => write(selected.address, selected.subject, selected.body)}>{copy.editCopy}</Button>}
              </div>
            </>}
          </article>
        </div>
      </section>}
    {compose && <PreviewComposer initial={compose} onClose={() => setCompose(null)} onSave={value => {
      setMessages(items => [{ id: crypto.randomUUID(), ...value, subject: value.subject.trim() || copy.noSubject, sender: copy.me, folder: 'drafts', read: true, starred: false }, ...items]);
      setCompose(null);setNotice(copy.draftSaved);setFilters(f => ({ ...f, folder: 'drafts', query: '' }));setSelectedId(null);
    }} />}
  </div>;
}
