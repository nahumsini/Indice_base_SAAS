import { History, Mail, MessageCircle, Paperclip, PencilLine, Phone } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity } from '../../salesCrmContext';
import { getPhoneHref, getWhatsAppHref } from '../../utils/salesCommunicationUtils';
import { OpportunityActionButton } from '../components/ProspectosQuickActions';
import type { ProspectosCopy } from '../translations';
import { formatCurrencyAmount, parseMoney, setOpportunityDragData } from '../utils/prospectosFormatters';
import { statusClasses, temperatureClasses } from '../utils/prospectosStatus';

export function ProspectosKanbanCard({
  copy,
  opportunity,
  onOpenFiles,
  onOpenHistory,
  onEdit,
}: {
  copy: ProspectosCopy;
  opportunity: SalesOpportunity;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
}) {
  const hasPhone = Boolean(opportunity.phone.trim());
  const hasEmail = Boolean(opportunity.email.trim());

  return (
    <article
      draggable
      onDragStart={(event) => setOpportunityDragData(event, opportunity.id)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FF6B5E]/35 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{opportunity.opportunityName}</p>
          <p className="mt-1 text-xs font-semibold text-[#2563EB]">{opportunity.company}</p>
        </div>
        <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 font-semibold', temperatureClasses[opportunity.temperature])}>
          {copy.options.temperatures[opportunity.temperature]}
        </Badge>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="font-semibold text-slate-900">{opportunity.contactPerson}</p>
        <p className="text-slate-500">{opportunity.owner}</p>
        <p className="text-slate-500">{formatCurrencyAmount(parseMoney(opportunity.estimatedValue), opportunity.currency)} · {opportunity.probability}</p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{copy.agenda.nextAction}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{copy.options.nextActions[opportunity.nextAction]}</p>
        <p className="mt-1 text-xs font-semibold text-[#9a6b05]">{opportunity.nextActionDate || copy.agenda.noTime}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <OpportunityActionButton label={hasPhone ? copy.quickActions.call(opportunity.contactPerson) : copy.quickActions.noPhone} icon={<Phone className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15" href={hasPhone ? getPhoneHref(opportunity.phone) : undefined} disabled={!hasPhone} />
        <OpportunityActionButton label={hasPhone ? copy.quickActions.whatsapp(opportunity.contactPerson) : copy.quickActions.noPhone} icon={<MessageCircle className="h-4 w-4" />} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" href={hasPhone ? getWhatsAppHref(opportunity.phone) : undefined} disabled={!hasPhone} />
        <OpportunityActionButton label={hasEmail ? copy.quickActions.email(opportunity.contactPerson) : copy.quickActions.noEmail} icon={<Mail className="h-4 w-4" />} className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20" href={hasEmail ? `mailto:${opportunity.email}` : undefined} disabled={!hasEmail} />
        <OpportunityActionButton label={copy.quickActions.files(opportunity.opportunityName)} icon={<Paperclip className="h-4 w-4" />} className="border-[#F4C84A]/35 bg-[#F4C84A]/15 text-[#9a6b05] hover:bg-[#F4C84A]/25" onClick={() => onOpenFiles(opportunity)} />
        <OpportunityActionButton label={copy.quickActions.history(opportunity.opportunityName)} icon={<History className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100" onClick={() => onOpenHistory(opportunity)} />
        <OpportunityActionButton label={copy.quickActions.edit(opportunity.opportunityName)} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100" onClick={() => onEdit(opportunity)} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-400">{copy.kanban.dragHint}</p>
        <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 font-semibold', statusClasses[opportunity.status])}>
          {copy.options.statuses[opportunity.status]}
        </Badge>
      </div>
    </article>
  );
}
