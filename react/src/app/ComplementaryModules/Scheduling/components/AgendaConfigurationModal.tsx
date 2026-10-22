import { useCallback, useState } from 'react';
import { getServiceTermsCopy, serviceChargeLabel } from '../translations/serviceTermsCopy';
import { Plus } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { schedulingApi } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';
import { ConfigurationTable } from './ConfigurationTable';
import { ServiceEditor } from './ServiceEditor';
import { StaffEditor } from './StaffEditor';
import { TeamAvailabilityWorkspace } from './TeamAvailabilityWorkspace';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export type AgendaConfigurationSection = 'services' | 'team';

/** Browsing is a workspace; an editor replaces it, never stacks a second dialog. */
export function AgendaConfigurationModal({ section, copy, locale, onClose, onChanged }: {
  section: AgendaConfigurationSection; copy: SchedulingCopy; locale: string;
  onClose: () => void; onChanged: () => void;
}) {
  const terms = getServiceTermsCopy(locale);
  const [editor, setEditor] = useState<{ id?: number } | null>(null);
  const query = useSchedulingQuery(useCallback(async (signal: AbortSignal) => {
    if (section === 'services') return { services: await schedulingApi.services(signal), staff: [], members: [] };
    const [staff, members] = await Promise.all([schedulingApi.staff(signal), schedulingApi.members(signal)]);
    return { services: [], staff, members };
  }, [section]));
  const saved = () => { setEditor(null); query.reload(); onChanged(); };
  const closeButton = <ActionButton className={section === 'team' ? '!border-[#222831]/25 !bg-transparent !text-[#222831] hover:!bg-white/20 dark:!border-white/40 dark:!text-white' : undefined} onClick={onClose}>{copy.close}</ActionButton>;
  if (editor && query.data) {
    return section === 'services'
      ? <ServiceEditor key={editor.id ?? 'new-service'} service={query.data.services.find(item => item.id === editor.id)} configuredServices={query.data.services} onEditConfigured={id => setEditor({ id })} copy={copy} onClose={() => setEditor(null)} onSaved={saved} />
      : <StaffEditor staff={query.data.staff.find(item => item.id === editor.id)} members={editor.id?query.data.members:query.data.members.filter(member=>!query.data.staff.some(person=>person.userId===member.id))} copy={copy} locale={locale} onClose={() => setEditor(null)} onSaved={saved} />;
  }
  return <IndiceModalFrame open tone={schedulingTone} modalType="operational-workspace"
    contentClassName={section === 'team' ? 'group/agenda-team data-[dialog-compact-viewport=true]:!overflow-hidden' : undefined}
    bodyClassName={section === 'team' ? 'group-data-[dialog-compact-viewport=true]/agenda-team:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/agenda-team:!overflow-y-auto' : undefined}
    title={section === 'services' ? copy.services : copy.team}
    description={section === 'services' ? copy.servicesHint : <span className="group-data-[dialog-compact-viewport=true]/agenda-team:sr-only">{copy.teamHint}</span>}
    icon={<span className="text-xl leading-none">{schedulingEmoji[section]}</span>} closeLabel={copy.close}
    onOpenChange={open => { if (!open) onClose(); }}
    footerLeading={section === 'team' ? closeButton : undefined}
    footer={<>{section === 'services' ? closeButton : null}<ActionButton primary disabled={!query.data || query.loading} onClick={() => setEditor({})}><Plus className="h-4 w-4" />{section === 'services' ? copy.newService : copy.newStaff}</ActionButton></>}>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<ActionButton onClick={query.reload}>{copy.retry}</ActionButton></Feedback> : query.data &&
      (section === 'team' ? <TeamAvailabilityWorkspace staff={query.data.staff} members={query.data.members} copy={copy} locale={locale} onEdit={id => setEditor({ id })}/>
        : <ConfigurationTable copy={copy} onEdit={id => setEditor({ id })} rows={query.data.services.map(item => ({ id: item.id, title: item.name, detail: `${item.productId ? terms.inventoryService : terms.agendaService} · ${serviceChargeLabel(item.chargePolicy,locale)} · ${copy.duration}: ${item.durationMinutes} ${copy.minutes} · ${copy.buffer}: ${item.bufferMinutes} ${copy.minutes} · ${copy.notice}: ${item.noticeHours}`, active: item.active }))} />)}
  </IndiceModalFrame>;
}
