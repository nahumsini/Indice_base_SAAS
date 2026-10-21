import type { ReactNode } from 'react';
import { FolderPlus } from 'lucide-react';
import { IndiceWorkspaceNavigation } from '../../components/frontend-os';
import { Button } from '../../components/ui/button';
import { useEmailCopy } from './translations';
import { useMailWorkspaceCopy } from './mailWorkspaceCopy';
import { useMailboxCopy } from './mailboxCopy';

type FolderItem = { id: string; label: string; icon: ReactNode; kind?: string; group?: string; description?: string; unread?: number };
export function MailFolderRail({ items, namedFolders, value, collapsed = false, busy, canCreate, lastSync, onChange, onCreate }: {
  items: FolderItem[]; namedFolders: { id: string; name: string; label: string }[]; value: string;
  collapsed?: boolean; busy: boolean; canCreate: boolean; lastSync: string | null;
  onChange: (id: string) => void; onCreate: () => void;
}) {
  const { copy, locale } = useEmailCopy(); const work = useMailWorkspaceCopy(); const text = useMailboxCopy();
  return <div className={`mail-folder-rail ${collapsed ? 'mail-folder-rail--compact' : ''}`}>
    {!collapsed && <h3 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{work.folders}</h3>}
    <IndiceWorkspaceNavigation className="mail-folder-nav" variant="workbar" orientation="vertical" iconOnly={collapsed}
      tone="blue" ariaLabel={copy.folders} value={value} onValueChange={id => { if (!busy) onChange(id); }} items={items.map(item => ({ ...item, disabled: busy,
        label: item.unread ? `${item.label} (${item.unread})` : item.label,
        icon: <span className="mail-folder-icon relative" data-mail-kind={item.kind ?? 'CUSTOM'}>{item.icon}{collapsed && !!item.unread && <span className="absolute -right-2 -top-2 rounded-full bg-blue-700 px-1 text-[10px] text-white">{item.unread > 99 ? '99+' : item.unread}</span>}</span>,
      }))} />
    {canCreate && <Button className={`mt-4 h-11 ${collapsed ? 'w-11 px-0' : 'w-full justify-start'}`} variant="ghost" disabled={busy} aria-label={work.newFolder} title={work.newFolder} onClick={onCreate}><FolderPlus className="h-4 w-4" />{!collapsed && work.newFolder}</Button>}
    {!collapsed && <>
      <details className="mt-4 px-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer rounded-md py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{work.folderHelp}</summary>
        <p className="mt-2">{work.folderGuide}</p><p className="mt-2">{work.localGuide}</p>
        <ul className="mt-3 space-y-2">{namedFolders.map(f => <li key={f.id} className="break-all"><span className="font-medium">{f.label}</span><br />{f.name}</li>)}</ul>
      </details>
      <p className="mt-4 break-words px-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{lastSync ? `${text.lastSync}: ${new Date(lastSync).toLocaleString(locale)}` : text.neverSynced}</p>
    </>}
  </div>;
}
