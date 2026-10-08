import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { schedulingApi } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';
import { ConfigurationTable } from './ConfigurationTable';
import { ServiceEditor } from './ServiceEditor';
import { StaffEditor } from './StaffEditor';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export type AgendaConfigurationSection = 'services' | 'team';

/** Browsing is a workspace; an editor replaces it, never stacks a second dialog. */
export function AgendaConfigurationModal({ section, copy, locale, onClose, onChanged }: {
  section: AgendaConfigurationSection; copy: SchedulingCopy; locale: string;
  onClose: () => void; onChanged: () => void;
}) {
  const [editor, setEditor] = useState<{ id?: number } | null>(null);
  const query = useSchedulingQuery(useCallback(async (signal: AbortSignal) => {
    if (section === 'services') return { services: await schedulingApi.services(signal), staff: [], members: [] };
    const [staff, members] = await Promise.all([schedulingApi.staff(signal), schedulingApi.members(signal)]);
    return { services: [], staff, members };
  }, [section]));
  const saved = () => { setEditor(null); query.reload(); onChanged(); };
  if (editor && query.data) {
    return section === 'services'
      ? <ServiceEditor service={query.data.services.find(item => item.id === editor.id)} copy={copy} onClose={() => setEditor(null)} onSaved={saved} />
      : <StaffEditor staff={query.data.staff.find(item => item.id === editor.id)} members={query.data.members} copy={copy} locale={locale} onClose={() => setEditor(null)} onSaved={saved} />;
  }
  return <IndiceModalFrame open tone={schedulingTone} modalType="operational-workspace"
    title={section === 'services' ? copy.services : copy.team}
    description={section === 'services' ? copy.servicesHint : copy.teamHint}
    icon={<span className="text-xl leading-none">{schedulingEmoji[section]}</span>} closeLabel={copy.close}
    onOpenChange={open => { if (!open) onClose(); }}
    footer={<><ActionButton onClick={onClose}>{copy.close}</ActionButton>
      <ActionButton primary disabled={!query.data || query.loading} onClick={() => setEditor({})}><Plus className="h-4 w-4" />{section === 'services' ? copy.newService : copy.newStaff}</ActionButton></>}>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<ActionButton onClick={query.reload}>{copy.retry}</ActionButton></Feedback> : query.data &&
      <ConfigurationTable copy={copy} onEdit={id => setEditor({ id })} rows={section === 'services'
        ? query.data.services.map(item => ({ id: item.id, title: item.name, detail: `${copy.duration}: ${item.durationMinutes} ${copy.minutes} · ${copy.buffer}: ${item.bufferMinutes} ${copy.minutes} · ${copy.notice}: ${item.noticeHours}`, active: item.active }))
        : query.data.staff.map(item => ({ id: item.id, title: item.publicName, detail: item.timezone, active: item.active }))} />}
  </IndiceModalFrame>;
}
