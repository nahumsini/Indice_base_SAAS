import { Building2, ExternalLink, Link2, MapPin, MonitorSmartphone, Radio, ShieldCheck } from 'lucide-react';
import { type AttendanceKioskDevice } from '../../../../../api/humanResources';
import { Button } from '../../../../../components/ui/button';
import { KioskActionsMenu } from './KioskActionsMenu';

export interface KioskCardProps {
  device: AttendanceKioskDevice;
  hasPublicLink: boolean;
  isSaving: boolean;
  kioskTypeLabel: string;
  locationRuleDescription: string;
  publicLinkLabel: string;
  scopeDescription: string;
  statusClassName: string;
  statusLabel: string;
  usageLabel: string;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onRotate: () => void;
  onShowQr: () => void;
}

export function KioskCard({
  device,
  hasPublicLink,
  isSaving,
  kioskTypeLabel,
  locationRuleDescription,
  publicLinkLabel,
  scopeDescription,
  statusClassName,
  statusLabel,
  usageLabel,
  onCopy,
  onDelete,
  onEdit,
  onOpen,
  onRotate,
  onShowQr,
}: KioskCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#143675]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#143675]/10 text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
              <MonitorSmartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-semibold text-slate-950 dark:text-white">{device.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Device code: {device.code || 'Not assigned'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <Building2 className="h-4 w-4 text-[#143675] dark:text-[#8bb3ff]" />
                Scope
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{scopeDescription}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kioskTypeLabel}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-[#143675] dark:text-[#8bb3ff]" />
                Check-in location rule
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{locationRuleDescription}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Link2 className="h-3.5 w-3.5" />
              Public link: {publicLinkLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Radio className="h-3.5 w-3.5" />
              {usageLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#143675]/10 px-3 py-1.5 text-xs font-semibold text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Device control
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <Button
            type="button"
            className="h-10 gap-2 rounded-lg bg-[#143675] px-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f2855] hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            disabled={!hasPublicLink}
            onClick={onOpen}
          >
            <ExternalLink className="h-4 w-4" />
            Open kiosk
          </Button>
          <KioskActionsMenu
            hasPublicLink={hasPublicLink}
            isSaving={isSaving}
            onCopy={onCopy}
            onDelete={onDelete}
            onEdit={onEdit}
            onRotate={onRotate}
            onShowQr={onShowQr}
          />
        </div>
      </div>
    </article>
  );
}
