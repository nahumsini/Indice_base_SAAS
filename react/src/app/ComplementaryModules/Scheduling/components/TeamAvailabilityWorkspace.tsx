import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../components/frontend-os/IndiceFilterBar';
import { IndiceViewState } from '../../../components/frontend-os/IndiceViewState';
import type { Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getStaffEditorCopy } from '../translations/staffEditorCopy';
import { getTeamWorkspaceCopy } from '../translations/teamWorkspaceCopy';
import { ActionButton } from './SchedulingPrimitives';

/** Compact directory: editing opens the existing staff wizard directly. */
export function TeamAvailabilityWorkspace({ staff, members, copy, locale, onEdit }: {
  staff: Staff[]; members: { id: number; name: string }[]; copy: SchedulingCopy; locale: string; onEdit: (id: number) => void;
}) {
  const text = getTeamWorkspaceCopy(locale), editor = getStaffEditorCopy(locale);
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all');
  const term = search.trim().toLocaleLowerCase(locale);
  const visible = [...staff].filter(person => (!term || `${person.publicName} ${members.find(member => member.id === person.userId)?.name ?? ''} ${person.timezone}`.toLocaleLowerCase(locale).includes(term))
    && (status === 'all' || person.active === (status === 'active'))).sort((a,b) => a.publicName.localeCompare(b.publicName,locale));
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <IndiceFilterBar title={copy.filters} className="!rounded-2xl !p-3 sm:!p-4" gridClassName="md:!grid-cols-[minmax(0,1fr)_12rem]">
      <IndiceFilterSearch label={text.search} placeholder={text.searchHint} tone="coral" value={search} onValueChange={setSearch} onClear={() => setSearch('')} clearLabel={text.clear}/>
      <IndiceFilterSelect label={copy.status} tone="coral" value={status} onValueChange={setStatus} options={[{ value:'all',label:copy.allStates },{ value:'active',label:copy.active },{ value:'inactive',label:editor.inactive }]}/>
    </IndiceFilterBar>
    {visible.length ? <ul aria-label={text.roster} className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
      {visible.map(person => <li key={person.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="col-span-2 min-w-0 sm:col-span-1"><p className="break-words text-sm font-medium">{person.publicName}</p><p className="mt-1 text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{person.timezone}</p></div>
        <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${person.active ? 'bg-emerald-500' : 'bg-slate-400'}`}/>{person.active ? copy.active : editor.inactive}</span>
        <ActionButton onClick={() => onEdit(person.id)} aria-label={`${copy.edit}: ${person.publicName}`}><Pencil aria-hidden="true" className="h-4 w-4"/>{copy.edit}</ActionButton>
      </li>)}
    </ul> : <IndiceViewState variant="empty" compact tone="coral" title={staff.length ? text.noMatches : copy.empty} description={staff.length ? undefined : copy.setupHint}/>}
  </div>;
}
