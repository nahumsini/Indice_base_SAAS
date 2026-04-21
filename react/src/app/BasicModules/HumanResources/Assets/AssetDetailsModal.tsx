import type { ReactNode } from 'react';
import {
  Boxes,
  CalendarClock,
  Package2,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import { useLanguage } from '../../../shared/context';
import { type HrAsset } from '../../../api/HumanResources/assets';
import { useHRLanguage } from '../HRLanguage';
import { useAssetsPortalTheme } from './useAssetsPortalTheme';

interface AssetDetailsModalProps {
  isOpen: boolean;
  asset: HrAsset | null;
  onClose: () => void;
}

const getAssetTypeFilter = (assetType: string) => {
  const normalized = assetType.trim().toLowerCase();

  if (normalized === 'laptop') {
    return 'laptop';
  }
  if (normalized === 'attendance') {
    return 'attendance';
  }
  if (normalized === 'operations') {
    return 'operations';
  }
  if (normalized === 'maintenance') {
    return 'maintenance';
  }

  return 'other';
};

const getAssetTypeLabel = (assetType: string, t: ReturnType<typeof useHRLanguage>) => {
  const normalizedType = getAssetTypeFilter(assetType);

  if (normalizedType === 'laptop') {
    return t.assets.addNewAsset.options.laptop;
  }
  if (normalizedType === 'attendance') {
    return t.assets.filters.attendanceControl;
  }
  if (normalizedType === 'operations') {
    return t.assets.filters.operation;
  }
  if (normalizedType === 'maintenance') {
    return t.assets.filters.maintenance;
  }

  return assetType
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStatusLabel = (status: HrAsset['status'], t: ReturnType<typeof useHRLanguage>) => {
  const labelMap = {
    available: t.assets.filters.available,
    assigned: t.assets.filters.assigned,
    maintenance: t.assets.filters.inMaintenance,
    custody: t.assets.filters.custody,
    inactive: t.assets.filters.inactive,
  } as const;

  return labelMap[status];
};

const getStatusClasses = (status: HrAsset['status']) => {
  const styles = {
    available:
      'border-[#d4ddff] bg-[#eef2ff] text-[#4054c6] dark:border-[#4658d4]/40 dark:bg-[#4658d4]/18 dark:text-[#a9b6ff]',
    assigned:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-300',
    maintenance:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-300',
    custody:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/25 dark:bg-slate-500/14 dark:text-slate-300',
    inactive:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/12 dark:text-rose-300',
  } as const;

  return styles[status];
};

const formatDateTime = (value: string | null, locale: string) => {
  if (!value) {
    return '-';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const formatValue = (value: number | null, locale: string) => {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

function SummaryStat({
  icon,
  label,
  value,
  isDarkMode,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3',
        isDarkMode ? 'border-white/10 bg-[#0f1832]' : 'border-[#dfe4f6] bg-white',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl',
            isDarkMode ? 'bg-[#3121a8]/30 text-[#b8b0ff]' : 'bg-[#edeaff] text-[#4c38d6]',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.14em]',
              isDarkMode ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {label}
          </div>
          <div className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  rows,
  isDarkMode,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  isDarkMode: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-[24px] border p-5',
        isDarkMode ? 'border-white/10 bg-[#10192f]' : 'border-[#d9deef] bg-white',
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl',
            isDarkMode ? 'bg-[#3121a8]/28 text-[#bdb6ff]' : 'bg-[#edeaff] text-[#4c38d6]',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {title}
          </h3>
          {subtitle ? (
            <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-2xl border',
          isDarkMode ? 'border-white/8 bg-[#0b1224]' : 'border-[#e4e8f4] bg-[#fbfcff]',
        )}
      >
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.label}
                className={cn(
                  index !== rows.length - 1 && (isDarkMode ? 'border-b border-white/8' : 'border-b border-[#e8ebf6]'),
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'w-[34%] px-4 py-3 text-left align-top text-[11px] font-semibold uppercase tracking-[0.16em] sm:w-[220px]',
                    isDarkMode ? 'text-slate-400' : 'text-slate-500',
                  )}
                >
                  {row.label}
                </th>
                <td
                  className={cn(
                    'px-4 py-3 text-sm leading-6 align-top break-words',
                    isDarkMode ? 'text-white' : 'text-slate-900',
                  )}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AssetDetailsModal({ isOpen, asset, onClose }: AssetDetailsModalProps) {
  const t = useHRLanguage();
  const { currentLanguage } = useLanguage();
  const isDarkMode = useAssetsPortalTheme();
  const copy = t.assets.detailsModal;

  if (!asset) {
    return null;
  }

  const statusBadge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        getStatusClasses(asset.status),
      )}
    >
      {getStatusLabel(asset.status, t)}
    </span>
  );

  const summaryStats = [
    {
      icon: <Wallet className="size-4" />,
      label: copy.fields.value,
      value: formatValue(asset.value_amount, currentLanguage.code),
    },
    {
      icon: <CalendarClock className="size-4" />,
      label: copy.fields.assignedAt,
      value: formatDateTime(asset.assigned_at, currentLanguage.code),
    },
    {
      icon: <Boxes className="size-4" />,
      label: copy.fields.unit,
      value: asset.unit_name || copy.empty.noUnit,
    },
  ];

  const overviewRows = [
    { label: copy.fields.code, value: asset.asset_code },
    { label: copy.fields.type, value: getAssetTypeLabel(asset.asset_type, t) },
    { label: copy.fields.asset, value: asset.name },
    { label: copy.fields.model, value: asset.model || '-' },
    { label: copy.fields.serialNumber, value: asset.serial_number || '-' },
    { label: copy.fields.notes, value: asset.notes || copy.empty.noNotes },
  ];

  const assignmentRows = [
    { label: copy.fields.responsible, value: asset.responsible_name || copy.empty.unassigned },
    { label: copy.fields.responsibleEmail, value: asset.responsible_email || copy.empty.noEmail },
    { label: copy.fields.unit, value: asset.unit_name || copy.empty.noUnit },
    { label: copy.fields.status, value: statusBadge },
    { label: copy.fields.assignedAt, value: formatDateTime(asset.assigned_at, currentLanguage.code) },
  ];

  const auditRows = [
    { label: copy.fields.createdBy, value: asset.created_by_name || copy.empty.system },
    { label: copy.fields.createdAt, value: formatDateTime(asset.created_at, currentLanguage.code) },
    { label: copy.fields.updatedBy, value: asset.updated_by_name || copy.empty.system },
    { label: copy.fields.updatedAt, value: formatDateTime(asset.updated_at, currentLanguage.code) },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        className={cn(
          'w-[min(1120px,calc(100vw-2rem))] max-w-[min(1120px,calc(100vw-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[min(1120px,calc(100vw-3rem))] sm:rounded-[26px]',
          isDarkMode
            ? 'border border-[#27345f] bg-[#0d152b] text-white shadow-[0_36px_90px_rgba(2,8,23,0.72)]'
            : 'border border-[#d8deef] bg-[#f5f7fc] text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.24)]',
        )}
      >
        <DialogClose className="hidden" />
        <DialogHeader
          className={cn(
            'relative border-b px-7 py-6 text-left',
            isDarkMode ? 'border-[#2a3561] bg-[#3121a8]' : 'border-[#d8deef] bg-[#3121a8]',
          )}
        >
          <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2">
            <div className="rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              {getAssetTypeLabel(asset.asset_type, t)}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="flex items-center gap-3 text-left text-white">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                <Package2 className="size-6" />
              </span>
              <div>
                <div className="text-[30px] font-semibold leading-tight">{copy.title}</div>
                <div className="mt-1 text-sm font-normal text-white/80">{asset.asset_code}</div>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[82vh] overflow-y-auto px-7 py-6 lg:px-8">
          <div className="space-y-5">
            <section
              className={cn(
                'rounded-[24px] border p-5',
                isDarkMode ? 'border-[#33406f] bg-[#141f3f]' : 'border-[#cfd7f3] bg-white',
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        isDarkMode ? 'bg-white/10 text-white/85' : 'bg-[#efecff] text-[#4c38d6]',
                      )}
                    >
                      {copy.sections.overview}
                    </span>
                    {statusBadge}
                  </div>
                  <h3 className={cn('text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {asset.name}
                  </h3>
                  <p className={cn('mt-2 max-w-2xl text-sm leading-7', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                    {copy.subtitle}
                  </p>
                </div>

                <div
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm',
                    isDarkMode ? 'border-white/10 bg-[#0d1731] text-slate-200' : 'border-[#e1e6f5] bg-[#f8faff] text-slate-700',
                  )}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {copy.fields.code}
                  </div>
                  <div className={cn('mt-2 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {asset.asset_code}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {summaryStats.map((stat) => (
                  <SummaryStat
                    key={stat.label}
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <SectionCard
                icon={<Package2 className="size-5" />}
                title={copy.sections.overview}
                subtitle={getAssetTypeLabel(asset.asset_type, t)}
                rows={overviewRows}
                isDarkMode={isDarkMode}
              />

              <SectionCard
                icon={<UserRound className="size-5" />}
                title={copy.sections.assignment}
                subtitle={copy.fields.responsible}
                rows={assignmentRows}
                isDarkMode={isDarkMode}
              />
            </div>

            <SectionCard
              icon={<ShieldCheck className="size-5" />}
              title={copy.sections.audit}
              subtitle={copy.fields.updatedAt}
              rows={auditRows}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        <DialogFooter
          className={cn(
            'border-t px-7 py-4 sm:justify-end',
            isDarkMode ? 'border-[#2a3561] bg-[#0b1223]' : 'border-[#d8deef] bg-white',
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              'min-w-[132px] rounded-xl px-5',
              isDarkMode
                ? 'border-[#405188] bg-[#121d39] text-slate-100 hover:bg-[#1a2748] hover:text-white'
                : 'border-[#d1d7ea] bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {copy.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
