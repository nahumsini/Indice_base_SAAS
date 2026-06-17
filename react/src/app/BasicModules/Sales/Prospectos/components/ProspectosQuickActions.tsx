import type { ReactNode } from 'react';
import { History, Mail, MessageCircle, Paperclip, PencilLine, Phone, Trash2 } from 'lucide-react';
import type { SalesOpportunity } from '../../salesCrmContext';
import { getPhoneHref, getWhatsAppHref } from '../../utils/salesCommunicationUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
import { cn } from '../../../../components/ui/utils';
import type { ProspectosCopy } from '../translations';

export function OpportunityActionButton({
  label,
  icon,
  className,
  href,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const controlClassName = cn(
    'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20',
    className,
    disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 hover:bg-slate-100',
  );

  const control = href && !disabled
    ? (
      <a
        href={href}
        aria-label={label}
        className={controlClassName}
        target={href.startsWith('https://') ? '_blank' : undefined}
        rel={href.startsWith('https://') ? 'noreferrer' : undefined}
      >
        {icon}
      </a>
    )
    : (
      <button type="button" aria-label={label} className={controlClassName} onClick={onClick} disabled={disabled}>
        {icon}
      </button>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-[220px] rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold leading-4 text-white shadow-xl"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProspectosQuickActions({
  copy,
  opportunity,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onDelete,
}: {
  copy: ProspectosCopy['quickActions'];
  opportunity: SalesOpportunity;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onDelete?: (opportunity: SalesOpportunity) => void;
}) {
  const hasPhone = Boolean(opportunity.phone.trim());
  const hasEmail = Boolean(opportunity.email.trim());

  return (
    <div className="mx-auto grid w-fit grid-cols-[repeat(4,2.25rem)] gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      <OpportunityActionButton label={hasPhone ? copy.call(opportunity.contactPerson) : copy.noPhone} icon={<Phone className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15" href={hasPhone ? getPhoneHref(opportunity.phone) : undefined} disabled={!hasPhone} />
      <OpportunityActionButton label={hasPhone ? copy.whatsapp(opportunity.contactPerson) : copy.noPhone} icon={<MessageCircle className="h-4 w-4" />} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" href={hasPhone ? getWhatsAppHref(opportunity.phone) : undefined} disabled={!hasPhone} />
      <OpportunityActionButton label={hasEmail ? copy.email(opportunity.contactPerson) : copy.noEmail} icon={<Mail className="h-4 w-4" />} className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20" href={hasEmail ? `mailto:${opportunity.email}` : undefined} disabled={!hasEmail} />
      <OpportunityActionButton label={copy.files(opportunity.opportunityName)} icon={<Paperclip className="h-4 w-4" />} className="border-[#F4C84A]/35 bg-[#F4C84A]/15 text-[#9a6b05] hover:bg-[#F4C84A]/25" onClick={() => onOpenFiles(opportunity)} />
      <OpportunityActionButton label={copy.history(opportunity.opportunityName)} icon={<History className="h-4 w-4" />} className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => onOpenHistory(opportunity)} />
      <OpportunityActionButton label={copy.edit(opportunity.opportunityName)} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100" onClick={() => onEdit(opportunity)} />
      {onDelete ? (
        <OpportunityActionButton label={copy.delete(opportunity.opportunityName)} icon={<Trash2 className="h-4 w-4" />} className="border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] hover:bg-[#FF6B5E]/20" onClick={() => onDelete(opportunity)} />
      ) : null}
    </div>
  );
}
