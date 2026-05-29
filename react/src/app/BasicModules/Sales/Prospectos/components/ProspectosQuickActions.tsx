import type { ReactNode } from 'react';
import { History, Mail, MessageCircle, Paperclip, PencilLine, Phone, Trash2 } from 'lucide-react';
import type { SalesOpportunity } from '../../salesCrmContext';
import { getPhoneHref, getWhatsAppHref } from '../../utils/salesCommunicationUtils';
import { cn } from '../../../../components/ui/utils';

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
    'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20',
    className,
    disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 hover:bg-slate-100',
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        title={label}
        aria-label={label}
        className={controlClassName}
        target={href.startsWith('https://') ? '_blank' : undefined}
        rel={href.startsWith('https://') ? 'noreferrer' : undefined}
      >
        {icon}
      </a>
    );
  }

  return (
    <button type="button" title={label} aria-label={label} className={controlClassName} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  );
}

export function ProspectosQuickActions({
  opportunity,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onDelete,
}: {
  opportunity: SalesOpportunity;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onDelete?: (opportunity: SalesOpportunity) => void;
}) {
  const hasPhone = Boolean(opportunity.phone.trim());
  const hasEmail = Boolean(opportunity.email.trim());

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
      <OpportunityActionButton label={hasPhone ? `Llamar a ${opportunity.contactPerson}` : 'Sin teléfono disponible'} icon={<Phone className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15" href={hasPhone ? getPhoneHref(opportunity.phone) : undefined} disabled={!hasPhone} />
      <OpportunityActionButton label={hasPhone ? `WhatsApp a ${opportunity.contactPerson}` : 'Sin teléfono disponible'} icon={<MessageCircle className="h-4 w-4" />} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" href={hasPhone ? getWhatsAppHref(opportunity.phone) : undefined} disabled={!hasPhone} />
      <OpportunityActionButton label={hasEmail ? `Email a ${opportunity.contactPerson}` : 'Sin email disponible'} icon={<Mail className="h-4 w-4" />} className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20" href={hasEmail ? `mailto:${opportunity.email}` : undefined} disabled={!hasEmail} />
      <OpportunityActionButton label={`Archivos de ${opportunity.opportunityName}`} icon={<Paperclip className="h-4 w-4" />} className="border-[#F4C84A]/35 bg-[#F4C84A]/15 text-[#9a6b05] hover:bg-[#F4C84A]/25" onClick={() => onOpenFiles(opportunity)} />
      <OpportunityActionButton label={`Historial de ${opportunity.opportunityName}`} icon={<History className="h-4 w-4" />} className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => onOpenHistory(opportunity)} />
      <OpportunityActionButton label={`Editar ${opportunity.opportunityName}`} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100" onClick={() => onEdit(opportunity)} />
      {onDelete ? (
        <OpportunityActionButton label={`Eliminar ${opportunity.opportunityName}`} icon={<Trash2 className="h-4 w-4" />} className="border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] hover:bg-[#FF6B5E]/20" onClick={() => onDelete(opportunity)} />
      ) : null}
    </div>
  );
}
