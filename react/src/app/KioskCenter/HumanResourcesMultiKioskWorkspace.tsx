import {
  Bell,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type {
  HumanResourcesKioskAnnouncement,
  HumanResourcesKioskPermission,
  HumanResourcesKioskRecord,
  MultiKioskChildWorkspace,
} from '../api/multiKiosks';
import { multiKioskPublicApi } from '../api/multiKiosks';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import {
  KioskToolWorkspaceFrame,
  KioskWorkspaceEmptyState,
  KioskWorkspaceNotice,
  KioskWorkspaceSectionHeader,
  KioskWorkspaceSurface,
} from '../components/kiosk-engine/KioskToolWorkspace';
import { KioskWorkspaceTabs } from '../components/kiosk-engine/KioskWorkspacePrimitives';
import { cn } from '../components/ui/utils';
import { getHumanResourcesKioskCopy } from './humanResourcesKioskTranslations';
import { AttendanceMultiKioskWorkspace } from './AttendanceMultiKioskWorkspace';

const capabilities = {
  attendancePhoto: 'attendance.photo.presign@1',
  attendancePunch: 'attendance.punch.create@1',
  announcementsRead: 'human-resources.announcements.read@1',
  recordsRead: 'human-resources.records.read@1',
  permissionsRead: 'human-resources.permissions.read@1',
  permissionCreate: 'human-resources.permission.create@1',
} as const;

type HrSection = 'attendance' | 'announcements' | 'records' | 'permissions';

interface HumanResourcesMultiKioskWorkspaceProps {
  token: string;
  kioskId: number;
  workspace: MultiKioskChildWorkspace;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
}

interface SectionDefinition {
  key: HrSection;
  label: string;
  Icon: typeof Clock3;
}

function csrfFor(token: string) {
  try {
    return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  } catch {
    return '';
  }
}

function dateLabel(value: string | undefined, locale: string) {
  if (!value) return '';
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
  } catch {
    return value;
  }
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function statusLabel(value: string | undefined, labels: Record<string, string>) {
  const normalized = text(value).toLowerCase();
  return labels[normalized] ?? text(value, '—');
}

function StatusBadge({ value, labels }: { value?: string; labels: Record<string, string> }) {
  const normalized = text(value).toLowerCase();
  const tone = normalized === 'approved' || normalized === 'resolved' || normalized === 'closed'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200'
    : normalized === 'rejected' || normalized === 'high'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-200'
      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200';
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', tone)}>
      {statusLabel(value, labels)}
    </span>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <KioskWorkspaceEmptyState
      description={children}
      icon={<ClipboardList className="h-7 w-7" />}
      tone="aqua"
    />
  );
}

export function HumanResourcesMultiKioskWorkspace({
  token,
  kioskId,
  workspace,
  locale,
  onAuthorizationFailure,
  onRefresh,
}: HumanResourcesMultiKioskWorkspaceProps) {
  const copy = getHumanResourcesKioskCopy(locale);
  const granted = workspace.session.capabilities;
  const has = (capability: string) => granted.includes(capability);
  const sections = useMemo<SectionDefinition[]>(() => {
    const available: SectionDefinition[] = [];
    if (has(capabilities.attendancePhoto) || has(capabilities.attendancePunch)) {
      available.push({ key: 'attendance', label: copy.tabs.attendance, Icon: Clock3 });
    }
    if (has(capabilities.announcementsRead)) {
      available.push({ key: 'announcements', label: copy.tabs.announcements, Icon: Bell });
    }
    if (has(capabilities.recordsRead)) {
      available.push({ key: 'records', label: copy.tabs.records, Icon: ClipboardList });
    }
    if (has(capabilities.permissionsRead)) {
      available.push({ key: 'permissions', label: copy.tabs.permissions, Icon: CalendarDays });
    }
    return available;
  // The child session is the immutable permission snapshot for this mounted workspace.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted.join('|'), locale]);
  const [activeSection, setActiveSection] = useState<HrSection>(sections[0]?.key ?? 'attendance');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<HumanResourcesKioskAnnouncement | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HumanResourcesKioskRecord | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [permissionSuccess, setPermissionSuccess] = useState('');

  useEffect(() => {
    if (!sections.some(section => section.key === activeSection)) {
      setActiveSection(sections[0]?.key ?? 'attendance');
    }
  }, [activeSection, sections]);

  const portal = workspace.bootstrap?.hr_portal;
  const announcements = portal?.announcements;
  const records = portal?.records;
  const permissions = portal?.permissions;

  const submitPermission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (permissionBusy) return;
    const form = new FormData(event.currentTarget);
    setPermissionBusy(true);
    setPermissionError('');
    setPermissionSuccess('');
    try {
      await multiKioskPublicApi.action(
        token,
        kioskId,
        capabilities.permissionCreate,
        {
          type: String(form.get('type') ?? ''),
          start_date: String(form.get('start_date') ?? ''),
          end_date: String(form.get('end_date') ?? ''),
          half_day: form.get('half_day') === 'on',
          reason: String(form.get('reason') ?? ''),
        },
        csrfFor(token),
      );
      await onRefresh();
      setPermissionModalOpen(false);
      setPermissionSuccess(copy.permissions.success);
    } catch (error) {
      if (!onAuthorizationFailure(error)) setPermissionError(copy.permissions.genericError);
    } finally {
      setPermissionBusy(false);
    }
  };

  if (sections.length === 0) {
    return <EmptyState>{copy.unavailable}</EmptyState>;
  }

  return (
    <KioskToolWorkspaceFrame data-human-resources-kiosk>
      <KioskWorkspaceTabs<HrSection>
        activeValue={activeSection}
        ariaLabel={copy.navigationLabel}
        items={sections.map(({ key, label, Icon }) => ({
          icon: <Icon className="h-4 w-4" />,
          label,
          value: key,
        }))}
        onChange={setActiveSection}
        sticky={false}
        tone="aqua"
      />

      <div aria-label={sections.find(section => section.key === activeSection)?.label} role="tabpanel">
        {activeSection === 'attendance' ? (
          <AttendanceMultiKioskWorkspace
            token={token}
            kioskId={kioskId}
            workspace={workspace}
            locale={locale}
            onAuthorizationFailure={onAuthorizationFailure}
            onRefresh={onRefresh}
          />
        ) : null}

        {activeSection === 'announcements' ? (
          <KioskWorkspaceSurface className="space-y-4">
            <KioskWorkspaceSectionHeader icon={<Bell className="h-5 w-5" />} title={copy.announcements.title} description={copy.announcements.description} tone="aqua" />
            {!announcements?.available ? <EmptyState>{copy.unavailable}</EmptyState> : announcements.items.length === 0 ? (
              <EmptyState>{copy.announcements.empty}</EmptyState>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {announcements.items.map(item => (
                  <button
                    className="min-h-24 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#177D66]/20 dark:border-slate-700"
                    key={item.id}
                    onClick={() => setSelectedAnnouncement(item)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-5 text-slate-950 dark:text-white">{item.title}</p>
                      {!item.is_read ? <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#177D66]" /> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{text(item.content)}</p>
                    <p className="mt-2 text-xs text-slate-400">{dateLabel(item.published_at, locale)}</p>
                  </button>
                ))}
              </div>
            )}
          </KioskWorkspaceSurface>
        ) : null}

        {activeSection === 'records' ? (
          <KioskWorkspaceSurface className="space-y-4">
            <KioskWorkspaceSectionHeader icon={<ClipboardList className="h-5 w-5" />} title={copy.records.title} description={copy.records.description} tone="aqua" />
            {!records?.available ? <EmptyState>{copy.unavailable}</EmptyState> : records.items.length === 0 ? (
              <EmptyState>{copy.records.empty}</EmptyState>
            ) : (
              <div className="space-y-2">
                {records.items.map(item => (
                  <button
                    className="flex min-h-20 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#177D66]/20 dark:border-slate-700"
                    key={item.id}
                    onClick={() => setSelectedRecord(item)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-950 dark:text-white">{item.title}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {[text(item.record_number), dateLabel(item.event_date, locale)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <StatusBadge value={item.status} labels={copy.status} />
                  </button>
                ))}
              </div>
            )}
          </KioskWorkspaceSurface>
        ) : null}

        {activeSection === 'permissions' ? (
          <KioskWorkspaceSurface className="space-y-4">
            <KioskWorkspaceSectionHeader
              icon={<CalendarDays className="h-5 w-5" />}
              title={copy.permissions.title}
              description={copy.permissions.description}
              tone="aqua"
              action={has(capabilities.permissionCreate) ? (
                <button
                  aria-label={copy.permissions.create}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#126652] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#177D66]/20"
                  onClick={() => { setPermissionError(''); setPermissionModalOpen(true); }}
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden min-[390px]:inline">{copy.permissions.create}</span>
                </button>
              ) : undefined}
            />
            {permissionSuccess ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200">{permissionSuccess}</p> : null}
            {!permissions?.available ? <EmptyState>{copy.unavailable}</EmptyState> : permissions.items.length === 0 ? (
              <EmptyState>{copy.permissions.empty}</EmptyState>
            ) : (
              <div className="space-y-2">
                {permissions.items.map(item => (
                  <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950 dark:text-white">{copy.permissions.types[text(item.type).toLowerCase()] ?? text(item.type, item.folio || '—')}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {dateLabel(item.startDate, locale)}{item.endDate && item.endDate !== item.startDate ? ` – ${dateLabel(item.endDate, locale)}` : ''}
                        </p>
                      </div>
                      <StatusBadge value={item.status} labels={copy.status} />
                    </div>
                    {item.reason ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.reason}</p> : null}
                    {item.folio ? <p className="mt-2 text-xs text-slate-400">{item.folio}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </KioskWorkspaceSurface>
        ) : null}
      </div>

      <KioskModalFrame
        open={Boolean(selectedAnnouncement)}
        onOpenChange={open => { if (!open) setSelectedAnnouncement(null); }}
        size="form"
        surface="public"
        tone="aqua"
        icon={<Bell className="h-5 w-5" />}
        title={selectedAnnouncement?.title ?? copy.announcements.detail}
        description={selectedAnnouncement ? [dateLabel(selectedAnnouncement.published_at, locale), selectedAnnouncement.author_name ? copy.announcements.publishedBy(selectedAnnouncement.author_name) : ''].filter(Boolean).join(' · ') : copy.announcements.description}
        footer={<button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-medium" onClick={() => setSelectedAnnouncement(null)} type="button">{copy.close}</button>}
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{selectedAnnouncement?.content}</p>
      </KioskModalFrame>

      <KioskModalFrame
        open={Boolean(selectedRecord)}
        onOpenChange={open => { if (!open) setSelectedRecord(null); }}
        size="form"
        surface="public"
        tone="aqua"
        icon={<FileText className="h-5 w-5" />}
        title={selectedRecord?.title ?? copy.records.detail}
        description={selectedRecord ? [text(selectedRecord.record_number), dateLabel(selectedRecord.event_date, locale)].filter(Boolean).join(' · ') : copy.records.description}
        footer={<button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-medium" onClick={() => setSelectedRecord(null)} type="button">{copy.close}</button>}
      >
        <div className="space-y-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
          <div className="flex flex-wrap gap-2"><StatusBadge value={selectedRecord?.status} labels={copy.status} />{selectedRecord?.severity ? <StatusBadge value={selectedRecord.severity} labels={copy.status} /> : null}</div>
          <p className="whitespace-pre-wrap">{selectedRecord?.description}</p>
          {selectedRecord?.actions_taken ? <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{copy.records.actions}</p><p className="mt-1 whitespace-pre-wrap">{selectedRecord.actions_taken}</p></div> : null}
        </div>
      </KioskModalFrame>

      <KioskModalFrame
        busy={permissionBusy}
        open={permissionModalOpen}
        onOpenChange={open => { if (!permissionBusy) setPermissionModalOpen(open); }}
        size="form"
        surface="public"
        tone="aqua"
        icon={<CalendarDays className="h-5 w-5" />}
        title={copy.permissions.formTitle}
        description={copy.permissions.formDescription}
        footer={<button aria-busy={permissionBusy || undefined} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium disabled:opacity-60" disabled={permissionBusy} form="hr-permission-form" type="submit">{permissionBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{copy.permissions.submit}</button>}
        footerLeading={<button className="min-h-12 rounded-xl border border-slate-300 px-4 text-sm font-medium" disabled={permissionBusy} onClick={() => setPermissionModalOpen(false)} type="button">{copy.permissions.cancel}</button>}
      >
        <form aria-busy={permissionBusy || undefined} className="space-y-4" id="hr-permission-form" onSubmit={submitPermission}>
          {permissionError ? <KioskWorkspaceNotice kind="error">{permissionError}</KioskWorkspaceNotice> : null}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.permissions.type}</span>
            <select className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#177D66] focus:ring-4 focus:ring-[#177D66]/15 dark:border-slate-700 dark:bg-slate-950" name="type" defaultValue="personal" required>
              {Object.entries(copy.permissions.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.permissions.startDate}</span><input className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#177D66] focus:ring-4 focus:ring-[#177D66]/15 dark:border-slate-700 dark:bg-slate-950" name="start_date" type="date" required /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.permissions.endDate}</span><input className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#177D66] focus:ring-4 focus:ring-[#177D66]/15 dark:border-slate-700 dark:bg-slate-950" name="end_date" type="date" required /></label>
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"><input className="h-5 w-5 accent-[#177D66]" name="half_day" type="checkbox" />{copy.permissions.halfDay}</label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.permissions.reason}</span><textarea className="min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#177D66] focus:ring-4 focus:ring-[#177D66]/15 dark:border-slate-700 dark:bg-slate-950" maxLength={2000} name="reason" placeholder={copy.permissions.reasonPlaceholder} required /></label>
        </form>
      </KioskModalFrame>
    </KioskToolWorkspaceFrame>
  );
}
