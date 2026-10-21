import { useRef, useEffect, useState } from 'react';
import { Archive, CheckCheck, Mail, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { MailboxFolder } from './mailboxApi';
import { useMailDailyCopy } from './mailDailyCopy';
export function MailBulkActions({ count, available, all, busy, progress, folders, folderId, onSelectAll, onClear, onAction }: {
  count: number; available: number; all: boolean; busy: boolean; progress: number; folders: MailboxFolder[]; folderId?: string;
  onSelectAll: () => void; onClear: () => void; onAction: (action: string, target?: string) => void;
}) {
  const copy = useMailDailyCopy(); const checkbox = useRef<HTMLInputElement>(null); const [target, setTarget] = useState('');
  useEffect(() => { if (checkbox.current) checkbox.current.indeterminate = count > 0 && !all; }, [count, all]);
  const archive = folders.find(folder => folder.kind === 'ARCHIVE' && folder.id !== folderId);
  return <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/40 px-3 py-2 dark:border-slate-700 dark:bg-blue-950/20">
    <label className="flex min-h-11 items-center gap-2 text-xs font-medium"><input ref={checkbox} type="checkbox" className="h-4 w-4 accent-blue-600" checked={all} disabled={busy || !available} onChange={onSelectAll} aria-label={copy.selectPage} />{count ? `${count} ${copy.selected}` : copy.selectPage}</label>
    {count > 0 && <>
      <Button variant="ghost" disabled={busy} onClick={() => onAction('READ')}><CheckCheck className="h-4 w-4" />{copy.read}</Button>
      <Button variant="ghost" disabled={busy} onClick={() => onAction('UNREAD')}><Mail className="h-4 w-4" />{copy.unread}</Button>
      {archive && <Button variant="ghost" disabled={busy} onClick={() => onAction('MOVE', archive.id)}><Archive className="h-4 w-4" />{copy.archive}</Button>}
      <select aria-label={copy.move} className="h-11 max-w-48 rounded-xl border bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" disabled={busy} value={target} onChange={event => setTarget(event.target.value)}><option value="">{copy.move}</option>{folders.filter(f => f.id !== folderId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      <Button variant="outline" disabled={busy || !folders.some(f => f.id === target && f.id !== folderId)} onClick={() => onAction('MOVE', target)}>{copy.apply}</Button>
      <Button variant="ghost" disabled={busy} onClick={onClear} aria-label={copy.clear}><X className="h-4 w-4" /></Button>
    </>}
    {progress > 0 && busy && <span role="status" className="text-xs">{copy.progress} · {progress}/{count}</span>}
  </div>;
}
