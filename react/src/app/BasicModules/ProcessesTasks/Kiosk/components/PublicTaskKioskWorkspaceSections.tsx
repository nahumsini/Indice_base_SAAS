import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  FolderKanban,
  MapPin,
  Paperclip,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Button } from '../../../../components/ui/button';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';
import type { TaskKioskTranslations } from '../translations';

export function PublicTaskKioskSessionBanners({
  isOnline,
  isSessionExpiring,
  copy,
}: {
  isOnline: boolean;
  isSessionExpiring: boolean;
  copy: TaskKioskTranslations;
}) {
  return (
    <>
      {!isOnline ? (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
          {copy.session.offline}
        </div>
      ) : null}
      {isSessionExpiring ? (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
          {copy.session.expiring}
        </div>
      ) : null}
    </>
  );
}

export function PublicTaskKioskHeader({
  copy,
  currentTimeLabel,
  pointLabel,
  scopeLabel,
}: {
  copy: TaskKioskTranslations;
  currentTimeLabel: string;
  pointLabel: string;
  scopeLabel: string;
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-medium text-[#9A6B05] dark:text-[#FDE68A]">{copy.header.badge}</p>
      <h1 className="mt-1 line-clamp-2 break-words text-xl font-medium leading-tight tracking-tight text-slate-950 dark:text-white">{pointLabel}</h1>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{scopeLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
          {currentTimeLabel}
        </span>
      </div>
    </header>
  );
}

export function PublicTaskKioskIdentityCard({
  compact = false,
  detail,
  initials,
  name,
  onReset,
  resetLabel,
  scopeLabel,
  verifiedLabel,
}: {
  compact?: boolean;
  detail: string;
  initials: string;
  name: string;
  onReset: () => void;
  resetLabel: string;
  scopeLabel: string;
  verifiedLabel: string;
}) {
  if (compact) {
    return (
      <section className="rounded-2xl border border-[#F4C84A]/45 bg-white px-3 py-2.5 shadow-sm dark:border-[#F4C84A]/25 dark:bg-slate-950">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A] text-sm font-medium text-[#5F4003]">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{detail} · {scopeLabel}</p>
            <span className="sr-only">{verifiedLabel}</span>
          </div>
          <Button type="button" variant="outline" aria-label={resetLabel} className="h-11 w-11 shrink-0 rounded-xl border-slate-200 bg-white p-0 text-slate-600 hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" onClick={onReset}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#F4C84A]/45 bg-white p-4 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.8)] dark:border-[#F4C84A]/25 dark:bg-slate-950">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A] text-base font-medium text-[#5F4003] shadow-sm dark:bg-[#F4C84A] dark:text-[#5F4003]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-[#9A6B05] dark:text-[#FDE68A]">{verifiedLabel}</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-medium leading-tight tracking-tight text-slate-950 dark:text-white">{name}</h2>
          <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label={resetLabel}
          className="h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 hover:text-[#7A5204] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          onClick={onReset}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          <span className="hidden min-[390px]:inline">{resetLabel}</span>
        </Button>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-[#F4C84A]/20 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9A6B05]" />
        <span className="truncate">{scopeLabel}</span>
      </div>
    </section>
  );
}

export function PublicTaskKioskSummaryStrip({
  compact = false,
  openLabel,
  openValue,
  overdueLabel,
  overdueValue,
  resolvedLabel,
  resolvedValue,
}: {
  compact?: boolean;
  openLabel: string;
  openValue: number;
  overdueLabel: string;
  overdueValue: number;
  resolvedLabel: string;
  resolvedValue: number;
}) {
  const metrics = [
    { icon: <FolderKanban className="h-4 w-4" />, label: openLabel, value: openValue, valueClass: 'text-slate-950 dark:text-white' },
    { icon: <CircleAlert className="h-4 w-4" />, label: overdueLabel, value: overdueValue, valueClass: overdueValue > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-950 dark:text-white' },
    { icon: <CheckCircle2 className="h-4 w-4" />, label: resolvedLabel, value: resolvedValue, valueClass: 'text-emerald-700 dark:text-emerald-300' },
  ];

  if (compact) {
    return (
      <section className="flex min-h-11 items-center divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white px-1 shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
        {metrics.map(metric => (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-2" key={metric.label}>
            <span className="shrink-0 text-[#9A6B05] dark:text-[#FDE68A]">{metric.icon}</span>
            <span className={`text-sm font-medium ${metric.valueClass}`}>{metric.value}</span>
            <span className="hidden truncate text-[10px] text-slate-500 min-[390px]:inline dark:text-slate-400">{metric.label}</span>
            <span className="sr-only min-[390px]:hidden">{metric.label}</span>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-3 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
      {metrics.map((metric) => (
        <div className="min-w-0 px-2 py-3 text-center" key={metric.label}>
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4C84A]/22 text-[#7A5204] dark:bg-[#F4C84A]/10 dark:text-[#FDE68A]">{metric.icon}</div>
          <p className={`mt-1 text-xl font-medium leading-none ${metric.valueClass}`}>{metric.value}</p>
          <p className="mt-1 truncate text-[9px] font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
        </div>
      ))}
    </section>
  );
}

export function PublicTaskKioskToolbar({
  activeFilterCount,
  createLabel,
  filterLabel,
  filterSummary,
  onCreate,
  onOpenFilters,
}: {
  activeFilterCount: number;
  createLabel: string;
  filterLabel: string;
  filterSummary: string;
  onCreate: () => void;
  onOpenFilters: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 rounded-xl bg-[#F4C84A]/12 px-3 py-2 text-left outline-none transition hover:bg-[#F4C84A]/20 focus-visible:ring-4 focus-visible:ring-[#F4C84A]/25 dark:bg-[#F4C84A]/10 dark:hover:bg-[#F4C84A]/15"
          onClick={onOpenFilters}
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A] text-[#5F4003] shadow-sm dark:bg-[#F4C84A] dark:text-[#5F4003]">
            <Filter aria-hidden="true" className="h-4 w-4" />
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[9px] font-medium text-white dark:bg-white dark:text-slate-950">{activeFilterCount}</span>
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-medium text-[#7A5204] dark:text-[#FDE68A]">{filterLabel}</span>
            <span className="mt-0.5 block truncate text-sm font-medium text-slate-950 dark:text-white">{filterSummary}</span>
          </span>
        </button>
        <Button
          type="button"
          aria-label={createLabel}
          className="h-auto min-h-12 gap-2 rounded-xl bg-[#F4C84A] px-3 text-xs font-medium text-[#5F4003] shadow-sm hover:bg-[#E5B835]"
          onClick={onCreate}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span className="hidden min-[390px]:inline">{createLabel}</span>
        </Button>
      </div>
    </section>
  );
}

export function PublicTaskKioskFiltersSheet({
  applyLabel,
  children,
  clearLabel,
  description,
  isOpen,
  onClear,
  onClose,
  title,
}: {
  applyLabel: string;
  children: ReactNode;
  clearLabel: string;
  description: string;
  isOpen: boolean;
  onClear: () => void;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="task-kiosk-filters-title">
      <button type="button" aria-label={applyLabel} className="absolute inset-0 min-h-0 min-w-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose} />
      <section className="relative max-h-[88dvh] w-full overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-w-md sm:rounded-[28px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4C84A] text-[#5F4003]"><SlidersHorizontal aria-hidden="true" className="h-5 w-5" /></span>
            <h2 id="task-kiosk-filters-title" className="mt-3 text-xl font-medium tracking-tight text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          <button type="button" aria-label={applyLabel} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" onClick={onClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <div className="max-h-[calc(88dvh-13rem)] overflow-y-auto px-5 py-5">{children}</div>
        <footer className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950">
          <Button type="button" variant="outline" className="h-12 rounded-xl px-4 text-sm font-medium" onClick={onClear}>{clearLabel}</Button>
          <Button type="button" className="h-12 rounded-xl bg-[#F4C84A] text-sm font-medium text-[#5F4003] hover:bg-[#E5B835]" onClick={onClose}>{applyLabel}</Button>
        </footer>
      </section>
    </div>
  );
}

export function PublicTaskKioskTaskCard({
  attachmentsLabel,
  copy,
  dueLabel,
  formattedDueDate,
  onOpen,
  scheduleLabel,
  statusLabelOverride,
  statusTone,
  task,
  taskType,
  viewLabel,
}: {
  attachmentsLabel: string;
  copy: TaskKioskTranslations;
  dueLabel: string;
  formattedDueDate: string;
  onOpen: () => void;
  scheduleLabel?: string;
  statusLabelOverride?: string;
  statusTone?: 'danger' | 'success' | 'info' | 'warning' | 'neutral';
  task: PublicTaskKioskTask;
  taskType: string;
  viewLabel: string;
}) {
  const origin = task.process_title || task.project_name || task.business_name || task.unit_name;
  const priorityLabel = task.priority === 'high'
    ? copy.create.priorityHigh
    : task.priority === 'low'
      ? copy.create.priorityLow
      : copy.create.priorityMedium;
  const statusLabel = statusLabelOverride ?? (task.status === 'completed'
    ? copy.task.resolved
    : task.is_overdue
      ? copy.task.overdue
      : priorityLabel);
  const resolvedTone = statusTone ?? (task.is_overdue ? 'danger' : task.status === 'completed' ? 'success' : 'neutral');
  const statusClassName = {
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
  }[resolvedTone];

  return (
    <article className={`overflow-hidden rounded-xl border bg-white shadow-sm transition dark:bg-slate-950 ${resolvedTone === 'danger' ? 'border-rose-200 dark:border-rose-900/60' : 'border-[#F4C84A]/35 dark:border-[#F4C84A]/20'}`}>
      <button type="button" className="block w-full p-3 text-left outline-none transition hover:bg-slate-50/70 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#F4C84A]/25 dark:hover:bg-slate-900/60" onClick={onOpen}>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#F4C84A]/25 px-2.5 py-1 text-[10px] font-medium text-[#7A5204] dark:text-[#FDE68A]">
            <FolderKanban aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{taskType}</span>
          </span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${statusClassName}`}>{statusLabel}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-[15px] font-medium leading-5 tracking-tight text-slate-950 dark:text-white">{task.title}</h3>
        {task.description ? <p className="mt-1 hidden line-clamp-1 text-xs leading-4 text-slate-500 dark:text-slate-400 min-[420px]:block">{task.description}</p> : null}
        {origin ? (
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <FolderKanban aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9A6B05]" />
            <span className="truncate">{origin}</span>
          </p>
        ) : null}

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">{dueLabel}: </span>{formattedDueDate}</span>
            {scheduleLabel ? <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{scheduleLabel}</span> : null}
            {task.attachments > 0 ? <span className="inline-flex items-center gap-1.5"><Paperclip aria-hidden="true" className="h-3.5 w-3.5" />{task.attachments} {attachmentsLabel}</span> : null}
          </div>
          <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#F4C84A]/20 px-2 text-[11px] font-medium text-[#7A5204] dark:text-[#FDE68A]">{viewLabel}<ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></span>
        </div>

        {task.completion_percent > 0 ? (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#F4C84A]" style={{ width: `${Math.min(100, Math.max(0, task.completion_percent))}%` }} /></div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-slate-400"><span>{copy.selectedTask.completion}</span><span>{task.completion_percent}%</span></div>
          </div>
        ) : null}
      </button>
    </article>
  );
}

export function PublicTaskKioskEmptyState({
  body,
  icon = <CheckCircle2 className="h-7 w-7" />,
  title,
}: {
  body: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4C84A]/25 text-[#9A6B05] dark:bg-[#F4C84A]/10 dark:text-[#FDE68A]">{icon}</div>
      <h3 className="mt-4 text-lg font-medium tracking-tight text-slate-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500 dark:text-slate-400">{body}</p>
    </section>
  );
}

export function TaskKioskFilterField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function TaskKioskFilterSelect({ children, onChange, value }: { children: ReactNode; onChange: (value: string) => void; value: string }) {
  return (
    <select value={value} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  );
}
