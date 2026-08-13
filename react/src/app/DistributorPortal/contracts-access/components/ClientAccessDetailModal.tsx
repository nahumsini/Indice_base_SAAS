import { Building2, CalendarClock, FileText, Mail, MapPin, PackageCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { IndiceModalFrame } from '../../../components/indice-modal';
import type { DistributorClient } from '../types/contractsAccess';
import type { DistributorPortalCopy } from '../translations';
import { formatContract, formatDate, formatSystemValue } from '../utils/contractsAccessFormatters';
import { CommercialStageBadge } from './CommercialStageBadge';

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]">{icon}</span>
        <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</div></div>
      </div>
    </div>
  );
}

export function ClientAccessDetailModal({
  client,
  copy,
  locale,
  onClose,
}: {
  client: DistributorClient;
  copy: DistributorPortalCopy;
  locale: string;
  onClose: () => void;
}) {
  const contract = formatContract(client);
  const nextEvent = formatDate(client.next_event_at, locale);
  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      tone="blue"
      icon={<Building2 className="h-5 w-5" />}
      eyebrow={copy.detail.eyebrow}
      title={client.company_name}
      description={copy.detail.subtitle}
      contentClassName="sm:max-w-3xl"
      footer={<button type="button" onClick={onClose}>{copy.actions.close}</button>}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-[#177D66]">
          {copy.detail.directPortfolio}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem icon={<Mail className="h-4 w-4" />} label={copy.detail.contact} value={client.owner_email || '—'} />
          <DetailItem icon={<MapPin className="h-4 w-4" />} label={copy.detail.country} value={client.country_code || '—'} />
          <DetailItem icon={<PackageCheck className="h-4 w-4" />} label={copy.detail.stage} value={<CommercialStageBadge copy={copy} stage={client.commercial_stage} />} />
          <DetailItem icon={<FileText className="h-4 w-4" />} label={copy.detail.contract} value={<span className="capitalize">{contract || copy.table.noPlan}</span>} />
          <DetailItem icon={<PackageCheck className="h-4 w-4" />} label={copy.detail.access} value={<span className="capitalize">{formatSystemValue(client.access_mode)}</span>} />
          <DetailItem icon={<FileText className="h-4 w-4" />} label={copy.detail.billing} value={<span className="capitalize">{formatSystemValue(client.billing_status)}</span>} />
          <DetailItem icon={<Users className="h-4 w-4" />} label={copy.detail.capacity} value={`${client.active_members} / ${client.seat_capacity}`} />
          <DetailItem icon={<CalendarClock className="h-4 w-4" />} label={copy.detail.nextEvent} value={nextEvent || copy.table.noDate} />
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">{copy.detail.modules}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {client.module_names.length ? client.module_names.map((module) => (
              <span key={module} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100">{module}</span>
            )) : <span className="text-sm text-slate-500">{copy.table.noModules}</span>}
          </div>
        </section>
      </div>
    </IndiceModalFrame>
  );
}
