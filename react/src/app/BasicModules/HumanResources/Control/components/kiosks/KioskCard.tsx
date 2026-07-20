import { Building2, ExternalLink, Link2, MapPin, MoreHorizontal, Pencil, Radio, Share2, ShieldCheck } from 'lucide-react';
import { type AttendanceKioskDevice } from '../../../../../api/humanResources';
import { KioskAdminActionButton } from '../../../../../components/kiosk-engine/KioskAdminPrimitives';
import type { ControlTranslations } from '../../translations';

export interface KioskCardProps {
  device: AttendanceKioskDevice;
  copy: ControlTranslations;
  hasPublicLink: boolean;
  isSaving: boolean;
  kioskTypeLabel: string;
  locationRuleDescription: string;
  publicLinkLabel: string;
  scopeDescription: string;
  statusClassName: string;
  statusLabel: string;
  usageLabel: string;
  onEdit: () => void;
  onMore: () => void;
  onOpen: () => void;
  onShare: () => void;
}

export function KioskCard({
  device,
  copy,
  hasPublicLink,
  isSaving,
  kioskTypeLabel,
  locationRuleDescription,
  publicLinkLabel,
  scopeDescription,
  statusClassName,
  statusLabel,
  usageLabel,
  onEdit,
  onMore,
  onOpen,
  onShare,
}: KioskCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#59C3A5]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-semibold text-slate-950 dark:text-white">{device.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <Building2 className="h-4 w-4 text-[#59C3A5] dark:text-[#8FE0CA]" />
                {copy.kiosk.card.availableForLabel}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{scopeDescription}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kioskTypeLabel}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-[#59C3A5] dark:text-[#8FE0CA]" />
                {copy.kiosk.card.checkInRuleLabel}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{locationRuleDescription}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Link2 className="h-3.5 w-3.5" />
              {copy.kiosk.card.accessLabel}: {publicLinkLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Radio className="h-3.5 w-3.5" />
              {usageLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#59C3A5]/10 px-3 py-1.5 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {copy.kiosk.card.attendancePointLabel}
              {device.engine_status ? ` · Engine ${device.engine_status}` : ''}
              {device.configuration_version ? ` · v${device.configuration_version}` : ''}
            </span>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-end" aria-label={copy.kiosk.actions.openActions}>
          <KioskAdminActionButton accent="aqua" disabled={isSaving} label={copy.kiosk.actions.editAttendancePoint} onClick={onEdit} tone="primary">
            <Pencil className="h-4 w-4" />
          </KioskAdminActionButton>
          <KioskAdminActionButton accent="aqua" disabled={isSaving} label={copy.kiosk.card.openAttendanceScreen} onClick={onOpen}>
            <ExternalLink className="h-4 w-4" />
          </KioskAdminActionButton>
          <KioskAdminActionButton accent="aqua" disabled={isSaving} label={copy.kiosk.actions.copyAccessLink} onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </KioskAdminActionButton>
          <KioskAdminActionButton accent="aqua" disabled={isSaving} label={copy.kiosk.actions.openActions} onClick={onMore}>
            <MoreHorizontal className="h-4 w-4" />
          </KioskAdminActionButton>
        </div>
      </div>
    </article>
  );
}
