import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  ExternalLink,
  Eye,
  FileCheck2,
  Gauge,
  ListChecks,
  Printer,
  RefreshCw,
  Search,
  Trophy,
  Users,
  UserX,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  SelectItem,
} from '../../../components/ui/select';
import { cn } from '../../../components/ui/utils';
import { LearningModeTitleBarBridge } from '../../../learningMode';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import {
  listProcessTaskKpis,
  type ProcessTaskKpiCard,
  type ProcessTaskKpiDashboard,
  type ProcessTaskKpiStatus,
} from './kpisApi';
import { FilterSelect, KpiSkeleton } from './components/KpiControls';
import { KpiPerformanceWorkspace } from './components/KpiPerformanceWorkspace';
import { printKpisDashboardPdf } from './kpisPdf';
import { useKpisTranslations, type KpisTranslations } from './translations';
import { getProcessTaskStandardUiCopy } from './translations/standardUiCopy';
import { agendaFocusFilterValues, agendaStatusFilterValues } from '../Agenda/hooks/useAgendaFilters';
import { useAgendaTranslations, type AgendaTranslations } from '../Agenda/translations';
import type { AgendaFocusFilter, PeriodFilter as AgendaPeriodFilter, StatusFilter } from '../Agenda/types';
import { listProjects, type ProjectRecord } from '../Projects/projectsApi';

interface UnitOption {
  id: number;
  name: string;
}

interface BusinessOption {
  id: number;
  name: string;
  unitId: number | null;
}

interface CollaboratorOption {
  userCompanyId: number;
  name: string;
  email?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  businessId?: number | null;
  businessName?: string | null;
}

const allValue = 'all';
const agendaUnassignedFilterValue = '__unassigned__';

const statusClasses: Record<ProcessTaskKpiStatus, string> = {
  healthy:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  watch:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
};

const scoreBarClasses: Record<ProcessTaskKpiStatus, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-[#F4C84A]',
  critical: 'bg-rose-500',
};

function compactText(value?: string | null) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  nextDate.setDate(nextDate.getDate() + mondayOffset);
  return nextDate;
}

function endOfWeek(date: Date) {
  const nextDate = startOfWeek(date);
  nextDate.setDate(nextDate.getDate() + 6);
  return nextDate;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function dateRangeForPeriod(period: AgendaPeriodFilter, customFrom: string, customTo: string) {
  const today = new Date();
  const todayText = localDateString(today);

  if (period === 'all') {
    return {
      from: '1900-01-01',
      to: '2999-12-31',
      includeOverdueBacklog: true,
      overdueOnly: false,
    };
  }

  if (period === 'today') {
    return {
      from: todayText,
      to: todayText,
      includeOverdueBacklog: true,
      overdueOnly: false,
    };
  }

  if (period === 'tomorrow') {
    const tomorrowText = localDateString(addDays(today, 1));
    return {
      from: tomorrowText,
      to: tomorrowText,
      includeOverdueBacklog: true,
      overdueOnly: false,
    };
  }

  if (period === 'yesterday') {
    const yesterdayText = localDateString(addDays(today, -1));
    return {
      from: yesterdayText,
      to: yesterdayText,
      includeOverdueBacklog: true,
      overdueOnly: false,
    };
  }

  if (period === 'week') {
    return {
      from: localDateString(startOfWeek(today)),
      to: localDateString(endOfWeek(today)),
      includeOverdueBacklog: false,
      overdueOnly: false,
    };
  }

  if (period === 'month') {
    return {
      from: localDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: localDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      includeOverdueBacklog: false,
      overdueOnly: false,
    };
  }

  if (period === 'custom') {
    return {
      from: customFrom || todayText,
      to: customTo || customFrom || todayText,
      includeOverdueBacklog: true,
      overdueOnly: false,
    };
  }

  return {
    from: todayText,
    to: todayText,
    includeOverdueBacklog: false,
    overdueOnly: false,
  };
}

function normalizeUnit(unit: BackendUnit): UnitOption {
  return {
    id: unit.id,
    name: compactText(unit.name),
  };
}

function normalizeBusiness(business: BackendBusiness): BusinessOption {
  return {
    id: business.id,
    name: compactText(business.name),
    unitId: business.unitId ?? business.unit_id ?? null,
  };
}

function normalizeCollaborator(user: BackendHrUser): CollaboratorOption | null {
  const userCompanyId = user.user_company_id ?? user.legacy_user_company_id ?? null;
  const name = compactText(user.full_name) || compactText(`${user.first_name ?? ''} ${user.last_name ?? ''}`);

  if (!userCompanyId || !name || user.status !== 'active') {
    return null;
  }

  return {
    userCompanyId,
    name,
    email: user.email,
    unitId: user.unit_id ?? null,
    unitName: compactText(user.unit_name),
    businessId: user.business_id ?? null,
    businessName: compactText(user.business_name),
  };
}

function projectOptionLabel(project: ProjectRecord) {
  const folio = compactText(project.folio);
  const name = compactText(project.name);
  return name ? `${folio ? `${folio} - ` : ''}${name}` : `${folio || `Proyecto #${project.id}`}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function scoreStatus(score: number): ProcessTaskKpiStatus {
  if (score >= 85) {
    return 'healthy';
  }
  if (score >= 65) {
    return 'watch';
  }
  return 'critical';
}

function formatDate(value: string | null | undefined, noDateLabel: string, locale: string) {
  if (!value) {
    return noDateLabel;
  }

  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${year}-${month}-${day}T00:00:00`));
}

function formatWeighting(value: number | null, notApplicableLabel: string) {
  return value == null ? notApplicableLabel : `${value}/5`;
}

function formatSignedValue(value: number, suffix = '') {
  if (value === 0) {
    return `0${suffix}`;
  }

  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function agendaPeriodParams(period: AgendaPeriodFilter, range: ProcessTaskKpiDashboard['range']) {
  const params = new URLSearchParams();
  params.set('period', period);

  if (period === 'custom') {
    params.set('from', range.from);
    params.set('to', range.to);
  }

  return params;
}

function buildKpiInsight(summary: ProcessTaskKpiDashboard['summary'], copy: KpisTranslations) {
  if (summary.totalTasks === 0) {
    return copy.summary.insights.empty;
  }

  if (summary.overdueTasks > 0) {
    return copy.summary.insights.overdue(summary.overdueTasks, summary.averageCompletion, summary.pendingAuditTasks);
  }

  if (summary.pendingAuditTasks > 0) {
    return copy.summary.insights.pendingAudit(summary.pendingAuditTasks);
  }

  if (summary.productivityScore >= 85) {
    return copy.summary.insights.healthy(summary.productivityScore);
  }

  return copy.summary.insights.default(summary.productivityScore);
}

function localizeKpiCard(
  card: ProcessTaskKpiCard,
  dashboard: ProcessTaskKpiDashboard,
  standardCopy: ReturnType<typeof getProcessTaskStandardUiCopy>,
): ProcessTaskKpiCard {
  const { summary } = dashboard;
  const localized = standardCopy.cards[card.id];
  return localized
    ? { ...card, title: localized.title, target: localized.target(summary), description: localized.description }
    : card;
}

function cardProgress(cardId: string, summary: ProcessTaskKpiDashboard['summary']) {
  const percent = (value: number, total: number) => total > 0 ? Math.round((value * 100) / total) : 0;
  switch (cardId) {
    case 'volume': return summary.totalTasks > 0 ? 100 : 0;
    case 'closed': return summary.completionRate;
    case 'open': return 100 - percent(summary.openTasks, summary.actionableTasks);
    case 'overdue': return 100 - percent(summary.overdueTasks, summary.actionableTasks);
    case 'timeliness': return summary.timelinessRate;
    case 'audit': return summary.auditRate;
    case 'evidence': return summary.evidenceRate;
    case 'productivity': return summary.productivityScore;
    default: return 0;
  }
}

function KpiMetric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {icon}
      </span>
      <span className={cn('font-semibold', valueClassName)}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ copy, status }: { copy: KpisTranslations; status: ProcessTaskKpiStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusClasses[status])}>
      {copy.statuses[status]}
    </span>
  );
}

function ScoreBar({ score, status }: { score: number; status?: ProcessTaskKpiStatus }) {
  const resolvedStatus = status ?? scoreStatus(score);
  return (
    <div className="flex min-w-[130px] items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={cn('h-full rounded-full', scoreBarClasses[resolvedStatus])} style={{ width: `${score}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-slate-900 dark:text-white">{score}%</span>
    </div>
  );
}

function KpiCard({ card, copy, progress }: { card: ProcessTaskKpiCard; copy: KpisTranslations; progress: number }) {
  const iconByCardId: Record<string, ReactNode> = {
    volume: <ListChecks className="h-5 w-5" />,
    closed: <CheckCircle2 className="h-5 w-5" />,
    open: <Clock3 className="h-5 w-5" />,
    overdue: <AlertTriangle className="h-5 w-5" />,
    productivity: <Gauge className="h-5 w-5" />,
    compliance: <CheckCircle2 className="h-5 w-5" />,
    timeliness: <Clock3 className="h-5 w-5" />,
    audit: <ClipboardCheck className="h-5 w-5" />,
    evidence: <FileCheck2 className="h-5 w-5" />,
    quality: <Trophy className="h-5 w-5" />,
    collaborators: <Users className="h-5 w-5" />,
  };

  return (
    <article className="flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F4C84A]/30 bg-[#F4C84A]/12 text-[#9A6B05] dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]">
          {iconByCardId[card.id] ?? <Gauge className="h-5 w-5" />}
        </span>
        <StatusBadge copy={copy} status={card.status} />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{card.title}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{card.value}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={cn('h-full rounded-full', scoreBarClasses[card.status])} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{progress}%</span>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{card.target}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{card.description}</p>
    </article>
  );
}

function DeltaPill({
  value,
  suffix = '',
  positiveIsGood = true,
}: {
  value: number;
  suffix?: string;
  positiveIsGood?: boolean;
}) {
  const isFlat = value === 0;
  const isGood = positiveIsGood ? value > 0 : value < 0;
  const isBad = positiveIsGood ? value < 0 : value > 0;
  const Icon = isFlat ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        isGood && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
        isBad && 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
        isFlat && 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatSignedValue(value, suffix)}
    </span>
  );
}

function SignalAction({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function OperationalSignals({
  copy,
  dashboard,
  onOpenOverdue,
  onOpenPendingAudit,
  onOpenUnassigned,
}: {
  copy: KpisTranslations;
  dashboard: ProcessTaskKpiDashboard;
  onOpenOverdue: () => void;
  onOpenPendingAudit: () => void;
  onOpenUnassigned: () => void;
}) {
  const { comparison, summary } = dashboard;
  const overdueBuckets = [
    {
      label: copy.signals.overdueAging.oneToThree,
      value: summary.overdue1To3Days,
      className: 'bg-amber-400',
    },
    {
      label: copy.signals.overdueAging.fourToSeven,
      value: summary.overdue4To7Days,
      className: 'bg-orange-500',
    },
    {
      label: copy.signals.overdueAging.eightPlus,
      value: summary.overdue8PlusDays,
      className: 'bg-rose-500',
    },
  ];
  const overdueTotal = overdueBuckets.reduce((sum, bucket) => sum + bucket.value, 0);

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.signals.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{copy.signals.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{copy.signals.comparison.title}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {comparison.available ? `${comparison.productivityScore}%` : copy.common.notApplicable}
              </p>
            </div>
            {comparison.available ? <DeltaPill value={comparison.productivityDelta} suffix={` ${copy.common.points}`} /> : null}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {comparison.available && comparison.from && comparison.to
              ? copy.signals.comparison.previousRange(
                  formatDate(comparison.from, copy.common.noDate, copy.locale),
                  formatDate(comparison.to, copy.common.noDate, copy.locale),
                )
              : copy.signals.comparison.unavailable}
          </p>
          {comparison.available ? (
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400">{copy.signals.comparison.completion}</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-semibold text-slate-900 dark:text-white">{comparison.completionRate}%</span>
                  <DeltaPill value={comparison.completionDelta} suffix={` ${copy.common.points}`} />
                </div>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{copy.signals.comparison.overdue}</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-semibold text-slate-900 dark:text-white">{comparison.overdueTasks}</span>
                  <DeltaPill value={comparison.overdueDelta} positiveIsGood={false} />
                </div>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{copy.signals.comparison.total}</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-semibold text-slate-900 dark:text-white">{comparison.totalTasks}</span>
                  <DeltaPill value={comparison.totalDelta} positiveIsGood />
                </div>
              </div>
            </div>
          ) : null}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{copy.signals.unassigned.title}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summary.unassignedOpenTasks}</p>
            </div>
            <UserX className="h-5 w-5 text-rose-500" />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {copy.signals.unassigned.description(summary.unassignedOpenTasks, summary.unassignedOverdueTasks)}
          </p>
          <SignalAction
            disabled={summary.unassignedOpenTasks === 0}
            label={copy.signals.unassigned.action}
            onClick={onOpenUnassigned}
          />
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{copy.signals.overdueAging.title}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summary.overdueTasks}</p>
            </div>
            <Clock3 className="h-5 w-5 text-orange-500" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="flex h-full">
              {overdueBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className={bucket.className}
                  style={{ width: overdueTotal > 0 ? `${(bucket.value / overdueTotal) * 100}%` : '0%' }}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {overdueBuckets.map((bucket) => (
              <div key={bucket.label}>
                <p className="font-semibold text-slate-900 dark:text-white">{bucket.value}</p>
                <p className="text-slate-500 dark:text-slate-400">{bucket.label}</p>
              </div>
            ))}
          </div>
          <SignalAction disabled={summary.overdueTasks === 0} label={copy.signals.overdueAging.action} onClick={onOpenOverdue} />
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{copy.signals.pendingAudit.title}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summary.pendingAuditTasks}</p>
            </div>
            <ListChecks className="h-5 w-5 text-violet-500" />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {copy.signals.pendingAudit.description(summary.pendingAuditTasks, summary.closedTasks)}
          </p>
          <SignalAction
            disabled={summary.pendingAuditTasks === 0}
            label={copy.signals.pendingAudit.action}
            onClick={onOpenPendingAudit}
          />
        </article>
      </div>
    </section>
  );
}

function SummaryStrip({
  agendaCopy,
  copy,
  dashboard,
}: {
  agendaCopy: AgendaTranslations;
  copy: KpisTranslations;
  dashboard: ProcessTaskKpiDashboard;
}) {
  const summary = dashboard.summary;
  const statusSegments = [
    { label: agendaCopy.statuses.pending, count: summary.pendingTasks, className: 'bg-slate-400' },
    { label: agendaCopy.statuses.in_progress, count: summary.inProgressTasks, className: 'bg-blue-500' },
    { label: agendaCopy.statuses.paused, count: summary.pausedTasks, className: 'bg-amber-500' },
    { label: agendaCopy.statuses.completed, count: summary.completedTasks, className: 'bg-emerald-500' },
    { label: agendaCopy.statuses.audited, count: summary.auditedTasks, className: 'bg-violet-500' },
    { label: agendaCopy.statuses.overdue, count: summary.overdueTasks, className: 'bg-rose-500' },
  ];
  const totalSegments = statusSegments.reduce((sum, segment) => sum + segment.count, 0);
  const status = scoreStatus(summary.productivityScore);

  return (
    <section className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <KpiMetric icon={<Eye className="h-4 w-4" />} label={copy.summary.labels.visible} value={summary.totalTasks} />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<ListChecks className="h-4 w-4" />}
            label={copy.summary.labels.open}
            value={summary.openTasks}
            valueClassName="text-slate-700 dark:text-slate-200"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={copy.summary.labels.closed}
            value={summary.closedTasks}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<AlertTriangle className="h-4 w-4" />}
            label={agendaCopy.statuses.overdue}
            value={summary.overdueTasks}
            valueClassName="text-rose-600 dark:text-rose-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<ClipboardCheck className="h-4 w-4" />}
            label={copy.summary.labels.pendingAudit}
            value={summary.pendingAuditTasks}
            valueClassName="text-violet-600 dark:text-violet-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<FileCheck2 className="h-4 w-4" />}
            label={copy.summary.labels.withEvidence}
            value={`${summary.evidenceRate}%`}
            valueClassName="text-[#9A6B05]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', statusClasses[status])}>
            {copy.summary.labels.productivity(summary.productivityScore)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            {copy.summary.labels.weighting(formatWeighting(summary.averageWeighting, copy.common.notApplicable))}
          </span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          {statusSegments.map((segment) => (
            <div
              key={segment.label}
              className={cn('transition-all duration-300', segment.className)}
              style={{ width: totalSegments > 0 ? `${(segment.count / totalSegments) * 100}%` : '0%' }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#F4C84A]/20 bg-[#F4C84A]/10 px-4 py-3 dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/15">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6B05]" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{buildKpiInsight(summary, copy)}</p>
        </div>
      </div>
    </section>
  );
}

function RankingPanel({
  emptyLabel,
  rows,
  title,
}: {
  emptyLabel: string;
  rows: Array<{ id: string; label: string; detail: string; value: string; progress: number; onClick?: () => void }>;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p> : rows.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            disabled={!row.onClick}
            className="grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 text-left transition enabled:hover:bg-[#F4C84A]/10 disabled:cursor-default"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{index + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{row.label}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{row.detail}</span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <span className="block h-full rounded-full bg-[#E4AD18]" style={{ width: `${Math.max(4, Math.min(100, row.progress))}%` }} />
              </span>
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{row.value}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

interface KpisProps {
  learningModeActive?: boolean;
}

export default function KPIs({ learningModeActive: _learningModeActive = false }: KpisProps) {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const copy = useKpisTranslations();
  const standardCopy = getProcessTaskStandardUiCopy(copy.locale);
  const agendaCopy = useAgendaTranslations();
  const headerCopy = copy.header;
  const periodLabels = agendaCopy.periods;
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const [dashboard, setDashboard] = useState<ProcessTaskKpiDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState<AgendaPeriodFilter>('today');
  const [focusFilter, setFocusFilter] = useState<AgendaFocusFilter>('mine');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customFrom, setCustomFrom] = useState(localDateString(new Date()));
  const [customTo, setCustomTo] = useState(localDateString(new Date()));
  const [unitFilter, setUnitFilter] = useState(allValue);
  const [businessFilter, setBusinessFilter] = useState(allValue);
  const [projectFilter, setProjectFilter] = useState(allValue);
  const [collaboratorFilter, setCollaboratorFilter] = useState(allValue);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);

  const selectedUnitId = unitFilter === allValue ? null : Number(unitFilter);
  const selectedBusinessId = businessFilter === allValue ? null : Number(businessFilter);
  const selectedProjectId = projectFilter === allValue ? null : Number(projectFilter);
  const selectedCollaboratorId = collaboratorFilter === allValue ? null : Number(collaboratorFilter);

  const scopedBusinesses = useMemo(
    () =>
      businesses.filter((business) => selectedUnitId == null || business.unitId == null || business.unitId === selectedUnitId),
    [businesses, selectedUnitId],
  );

  const scopedCollaborators = useMemo(
    () =>
      collaborators.filter((collaborator) => {
        if (selectedBusinessId != null) {
          return collaborator.businessId === selectedBusinessId;
        }
        if (selectedUnitId != null) {
          return collaborator.unitId === selectedUnitId;
        }
        return true;
      }),
    [collaborators, selectedBusinessId, selectedUnitId],
  );

  const scopedProjects = useMemo(
    () =>
      projects.filter((project) => {
        if (selectedBusinessId != null) {
          return project.businessId === selectedBusinessId;
        }
        if (selectedUnitId != null) {
          return project.unitId === selectedUnitId;
        }
        return true;
      }),
    [projects, selectedBusinessId, selectedUnitId],
  );

  const selectedUnitName = useMemo(
    () => (selectedUnitId == null ? null : units.find((unit) => unit.id === selectedUnitId)?.name ?? null),
    [selectedUnitId, units],
  );

  const selectedBusinessName = useMemo(
    () =>
      selectedBusinessId == null
        ? null
        : businesses.find((business) => business.id === selectedBusinessId)?.name ?? null,
    [businesses, selectedBusinessId],
  );

  const selectedProjectName = useMemo(
    () => {
      if (selectedProjectId == null) {
        return null;
      }

      const selectedProject = projects.find((project) => project.id === selectedProjectId);
      return selectedProject ? projectOptionLabel(selectedProject) : `${agendaCopy.form.labels.project} #${selectedProjectId}`;
    },
    [agendaCopy.form.labels.project, projects, selectedProjectId],
  );

  const range = useMemo(() => dateRangeForPeriod(period, customFrom, customTo), [customFrom, customTo, period]);

  const openAgendaDrilldown = useCallback(
    (params: Record<string, string>) => {
      const nextParams = agendaPeriodParams(period, range);
      nextParams.set('focus', focusFilter);

      if (statusFilter !== 'all') {
        nextParams.set('status', statusFilter);
      }

      if (selectedUnitName) {
        nextParams.set('unit', selectedUnitName);
      }
      if (selectedBusinessName) {
        nextParams.set('business', selectedBusinessName);
      }
      if (selectedCollaboratorId != null) {
        nextParams.set('collaborator', `user-company:${selectedCollaboratorId}`);
      }
      if (selectedProjectId != null) {
        nextParams.set('project', `project:${selectedProjectId}`);
      }

      Object.entries(params).forEach(([key, value]) => {
        nextParams.set(key, value);
      });

      navigate(`/${pageId ?? 'processes-tasks'}/calendar?${nextParams.toString()}`);
    },
    [
      focusFilter,
      navigate,
      pageId,
      period,
      range,
      selectedBusinessName,
      selectedCollaboratorId,
      selectedProjectId,
      selectedUnitName,
      statusFilter,
    ],
  );

  useEffect(() => {
    let isActive = true;

    async function loadCatalogs() {
      try {
        const [unitItems, businessItems, projectItems, hrUsers] = await Promise.all([
          dashboardApi.listUnits(),
          dashboardApi.listBusinesses(),
          listProjects(),
          humanResourcesApi.listHrUsers(),
        ]);

        if (!isActive) {
          return;
        }

        setUnits(
          unitItems
            .map(normalizeUnit)
            .filter((unit) => unit.name)
            .sort((left, right) => left.name.localeCompare(right.name, copy.locale)),
        );
        setBusinesses(
          businessItems
            .map(normalizeBusiness)
            .filter((business) => business.name)
            .sort((left, right) => left.name.localeCompare(right.name, copy.locale)),
        );
        setProjects(
          projectItems
            .filter((project) => project.id > 0 && project.name)
            .sort((left, right) => projectOptionLabel(left).localeCompare(projectOptionLabel(right), copy.locale)),
        );
        setCollaborators(
          hrUsers.items
            .map(normalizeCollaborator)
            .filter((collaborator): collaborator is CollaboratorOption => collaborator != null)
            .sort((left, right) => left.name.localeCompare(right.name, copy.locale)),
        );
      } catch (catalogError) {
        if (isActive) {
          setError((currentError) => currentError ?? getErrorMessage(catalogError, copy.messages.loadCatalogs));
        }
      }
    }

    void loadCatalogs();

    return () => {
      isActive = false;
    };
  }, [copy.locale, copy.messages.loadCatalogs]);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const nextDashboard = await listProcessTaskKpis({
          from: range.from,
          to: range.to,
          includeOverdueBacklog: range.includeOverdueBacklog,
          overdueOnly: range.overdueOnly,
          unitId: selectedUnitId,
          businessId: selectedBusinessId,
          collaboratorId: selectedCollaboratorId,
          projectId: selectedProjectId,
          focus: focusFilter,
          status: statusFilter,
          search: deferredSearchQuery,
        });

        if (isActive) {
          setDashboard(nextDashboard);
        }
      } catch (loadError) {
        if (isActive) {
          setDashboard(null);
          setError(getErrorMessage(loadError, copy.messages.loadKpis));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [
    range.from,
    range.includeOverdueBacklog,
    range.overdueOnly,
    range.to,
    selectedBusinessId,
    selectedCollaboratorId,
    selectedProjectId,
    selectedUnitId,
    focusFilter,
    statusFilter,
    copy.messages.loadKpis,
    deferredSearchQuery,
    refreshKey,
  ]);

  const visibleCollaborators = useMemo(() => {
    return dashboard?.collaborators ?? [];
  }, [dashboard]);

  const compositionData = useMemo(() => dashboard ? [
    { name: agendaCopy.statuses.pending, value: dashboard.summary.pendingTasks, color: '#94a3b8' },
    { name: agendaCopy.statuses.in_progress, value: dashboard.summary.inProgressTasks, color: '#3b82f6' },
    { name: agendaCopy.statuses.paused, value: dashboard.summary.pausedTasks, color: '#f59e0b' },
    { name: agendaCopy.statuses.completed, value: dashboard.summary.completedTasks, color: '#10b981' },
    { name: agendaCopy.statuses.audited, value: dashboard.summary.auditedTasks, color: '#8b5cf6' },
    { name: agendaCopy.statuses.overdue, value: dashboard.summary.overdueTasks, color: '#f43f5e' },
  ].filter((item) => item.value > 0) : [], [agendaCopy.statuses, dashboard]);

  const topCompliance = useMemo(
    () => [...(dashboard?.collaborators ?? [])].filter((row) => row.totalTasks > 0).sort((a, b) => b.productivityScore - a.productivityScore).slice(0, 5),
    [dashboard],
  );
  const topOverdue = useMemo(
    () => [...(dashboard?.collaborators ?? [])].filter((row) => row.overdueTasks > 0).sort((a, b) => b.overdueTasks - a.overdueTasks).slice(0, 5),
    [dashboard],
  );
  const riskyProcesses = useMemo(
    () => [...(dashboard?.processes ?? [])].filter((row) => row.overdueTasks > 0 || row.pendingAuditTasks > 0).sort((a, b) => b.overdueTasks - a.overdueTasks || a.productivityScore - b.productivityScore).slice(0, 5),
    [dashboard],
  );
  const riskyProjects = useMemo(
    () => [...(dashboard?.projects ?? [])].filter((row) => row.overdueTasks > 0 || row.pendingAuditTasks > 0).sort((a, b) => b.overdueTasks - a.overdueTasks || a.healthScore - b.healthScore).slice(0, 5),
    [dashboard],
  );

  const handleUnitChange = (value: string) => {
    setUnitFilter(value);
    setBusinessFilter(allValue);
    setProjectFilter(allValue);
    setCollaboratorFilter(allValue);
  };

  const handleBusinessChange = (value: string) => {
    setBusinessFilter(value);
    setProjectFilter(allValue);
    setCollaboratorFilter(allValue);
  };

  const handleFocusChange = (value: AgendaFocusFilter) => {
    setFocusFilter(value);
    setCollaboratorFilter(allValue);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setUnitFilter(allValue);
    setBusinessFilter(allValue);
    setPeriod('today');
    setStatusFilter('all');
    setFocusFilter('mine');
    setProjectFilter(allValue);
    setCollaboratorFilter(allValue);
    setCustomFrom(localDateString(new Date()));
    setCustomTo(localDateString(new Date()));
  };

  const handlePrintPdf = () => {
    if (!dashboard) {
      return;
    }

    setIsPrintingPdf(true);
    setError(null);

    try {
      const rangeLabel = `${formatDate(dashboard.range.from, copy.common.noDate, copy.locale)} - ${formatDate(dashboard.range.to, copy.common.noDate, copy.locale)}`;
      const statusLabel = statusFilter === 'all' ? copy.common.all : agendaCopy.statuses[statusFilter];

      printKpisDashboardPdf({
        companyIdentity: companyPrintIdentity,
        dashboard,
        copy,
        periodLabel: periodLabels[period],
        rangeLabel,
        unitLabel: selectedUnitName ?? copy.common.allFemale,
        businessLabel: selectedBusinessName ?? copy.common.all,
        projectLabel: selectedProjectName ?? copy.common.all,
        focusLabel: agendaCopy.focus[focusFilter],
        statusLabel,
        collaboratorLabel:
          selectedCollaboratorId == null
            ? copy.common.all
            : collaborators.find((collaborator) => collaborator.userCompanyId === selectedCollaboratorId)?.name ?? copy.common.unassigned,
        filterLines: [
          `${agendaCopy.filters.focus}: ${agendaCopy.focus[focusFilter]} | ${agendaCopy.filters.period}: ${periodLabels[period]} | ${rangeLabel}`,
          `${agendaCopy.filters.unit}: ${selectedUnitName ?? copy.common.allFemale} | ${agendaCopy.filters.business}: ${selectedBusinessName ?? copy.common.all}`,
          `${agendaCopy.form.labels.project}: ${selectedProjectName ?? copy.common.all} | ${agendaCopy.filters.collaborator}: ${
            selectedCollaboratorId == null
              ? copy.common.all
              : collaborators.find((collaborator) => collaborator.userCompanyId === selectedCollaboratorId)?.name ?? copy.common.unassigned
          } | ${agendaCopy.filters.status}: ${statusLabel}`,
        ],
      });
    } catch (printError) {
      setError(getErrorMessage(printError, copy.messages.printKpis));
    } finally {
      setIsPrintingPdf(false);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={() => setRefreshKey((current) => current + 1)}
        className="h-10 gap-2 rounded-xl border-[#F4C84A]/40 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:border-[#F4C84A] hover:bg-[#F4C84A]/15 dark:border-[#F4C84A]/40 dark:bg-slate-800 dark:text-[#FEF3C7]"
      >
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        {standardCopy.refresh}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!dashboard || isPrintingPdf || !isCompanyPrintIdentityReady}
        title={copy.pdf.print}
        onClick={handlePrintPdf}
        className="h-10 gap-2 rounded-xl border-[#F4C84A]/40 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-slate-950 disabled:opacity-60 dark:border-[#F4C84A]/40 dark:bg-slate-800 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
      >
        <Printer className="h-4 w-4" />
        {copy.pdf.print}
      </Button>
    </div>
  );

  return (
    <>
      <LearningModeTitleBarBridge actions={headerActions}>
        <section className="mb-5 rounded-xl border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-5 py-4 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F4C84A]/35 bg-white/80 text-xl shadow-sm dark:bg-slate-800" aria-hidden="true">
                {headerCopy.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">{standardCopy.title}</h2>
                <p className="mt-1 max-w-4xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{standardCopy.subtitle}</p>
              </div>
            </div>
            {headerActions}
          </div>
        </section>
      </LearningModeTitleBarBridge>

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#B98508]" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">{standardCopy.filterTitle}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{standardCopy.results(dashboard?.summary.totalTasks ?? 0)}</span>
            <button type="button" onClick={handleClearFilters} className="inline-flex items-center gap-1.5 transition hover:text-[#9A6B05] dark:hover:text-[#FEF3C7]">
              <RefreshCw className="h-3.5 w-3.5" />{standardCopy.clear}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{standardCopy.search}</span>
            <span className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={standardCopy.searchPlaceholder}
                className="h-11 w-full min-w-0 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </span>
          </label>
          <FilterSelect id="kpis-unit-filter" label={agendaCopy.filters.unit} value={unitFilter} onChange={handleUnitChange}>
            <SelectItem value={allValue}>{copy.common.allFemale}</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={String(unit.id)}>
                {unit.name}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect id="kpis-business-filter" label={agendaCopy.filters.business} value={businessFilter} onChange={handleBusinessChange}>
            <SelectItem value={allValue}>{copy.common.all}</SelectItem>
            {scopedBusinesses.map((business) => (
              <SelectItem key={business.id} value={String(business.id)}>
                {business.name}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect id="kpis-period-filter" label={agendaCopy.filters.period} value={period} onChange={(value) => setPeriod(value as AgendaPeriodFilter)}>
            {Object.entries(periodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect id="kpis-status-filter" label={agendaCopy.filters.status} value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectItem value={allValue}>{copy.common.all}</SelectItem>
            {agendaStatusFilterValues.map((value) => (
              <SelectItem key={value} value={value}>{agendaCopy.statuses[value]}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect id="kpis-focus-filter" label={agendaCopy.filters.focus} value={focusFilter} onChange={(value) => handleFocusChange(value as AgendaFocusFilter)}>
            {agendaFocusFilterValues.map((value) => (
              <SelectItem key={value} value={value}>{agendaCopy.focus[value]}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect id="kpis-project-filter" label={agendaCopy.form.labels.project} value={projectFilter} onChange={setProjectFilter}>
            <SelectItem value={allValue}>{copy.common.all}</SelectItem>
            {scopedProjects.map((project) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {projectOptionLabel(project)}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect id="kpis-collaborator-filter" label={agendaCopy.filters.collaborator} value={collaboratorFilter} onChange={setCollaboratorFilter}>
            <SelectItem value={allValue}>{copy.common.all}</SelectItem>
            {scopedCollaborators.map((collaborator) => (
              <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>
                {collaborator.name}
              </SelectItem>
            ))}
          </FilterSelect>

          {period === 'custom' ? (
            <>
              <div className="space-y-2">
                <label htmlFor="kpis-date-from" className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.from}</label>
                <Input id="kpis-date-from" type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div className="space-y-2">
                <label htmlFor="kpis-date-to" className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.to}</label>
                <Input id="kpis-date-to" type="date" value={customTo} min={customFrom} onChange={(event) => setCustomTo(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
            </>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {isLoading ? <KpiSkeleton /> : null}

      {!isLoading && dashboard ? (
        <>
          <section className="mb-6 rounded-2xl border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-5 py-4 dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/15">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{standardCopy.contextTitle}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{standardCopy.contextSubtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="rounded-full border border-[#F4C84A]/30 bg-white/80 px-3 py-1.5 dark:bg-slate-800/80">{standardCopy.selectedRange}: {formatDate(dashboard.range.from, copy.common.noDate, copy.locale)} – {formatDate(dashboard.range.to, copy.common.noDate, copy.locale)}</span>
                <span className="rounded-full border border-[#F4C84A]/30 bg-white/80 px-3 py-1.5 dark:bg-slate-800/80">{standardCopy.selectedScope}: {agendaCopy.focus[focusFilter]}</span>
                <span className="rounded-full border border-[#F4C84A]/30 bg-white/80 px-3 py-1.5 dark:bg-slate-800/80">{standardCopy.updated}: {dashboard.generatedAt ? new Intl.DateTimeFormat(copy.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dashboard.generatedAt)) : '—'}</span>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.cards.map((card) => (
              <KpiCard key={card.id} card={localizeKpiCard(card, dashboard, standardCopy)} copy={copy} progress={cardProgress(card.id, dashboard.summary)} />
            ))}
          </section>

          <SummaryStrip agendaCopy={agendaCopy} copy={copy} dashboard={dashboard} />

          <OperationalSignals
            copy={copy}
            dashboard={dashboard}
            onOpenOverdue={() => openAgendaDrilldown({ status: 'overdue' })}
            onOpenPendingAudit={() => openAgendaDrilldown({ status: 'completed' })}
            onOpenUnassigned={() =>
              openAgendaDrilldown({
                collaborator: agendaUnassignedFilterValue,
                status: 'all',
              })
            }
          />

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800" aria-labelledby="kpis-trend-title">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 id="kpis-trend-title" className="text-lg font-semibold text-slate-900 dark:text-white">{copy.chart.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {copy.chart.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> {copy.chart.series.scheduled}</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {copy.chart.series.closed}</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> {copy.chart.series.overdue}</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> {copy.chart.series.audited}</span>
              </div>
            </div>
            <div className="h-72">
              {dashboard.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => formatDate(String(value), copy.common.noDate, copy.locale)}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(value) => formatDate(String(value), copy.common.noDate, copy.locale)} />
                    <Bar dataKey="totalTasks" name={copy.chart.series.scheduled} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completedTasks" name={copy.chart.series.closed} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdueTasks" name={copy.chart.series.overdue} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="auditedTasks" name={copy.chart.series.audited} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {copy.chart.empty}
                </div>
              )}
            </div>
            <p className="sr-only">{copy.chart.subtitle}</p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{standardCopy.compositionTitle}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{standardCopy.compositionSubtitle}</p>
              <div className="mt-4 h-80">
                {compositionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={compositionData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                        {compositionData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">{standardCopy.noData}</div>}
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                {compositionData.map((item) => <span key={item.name} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}: {item.value}</span>)}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{standardCopy.unitsTitle}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{standardCopy.unitsSubtitle}</p>
              <div className="mt-4 h-80">
                {dashboard.units.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.units.slice(0, 8)} layout="vertical" margin={{ left: 16, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="unitName" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="productivityScore" name={standardCopy.productivity} fill="#E4AD18" radius={[0, 5, 5, 0]} />
                      <Bar dataKey="timelinessRate" name={standardCopy.timeliness} fill="#10b981" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">{standardCopy.noData}</div>}
              </div>
            </article>
          </section>

          <section className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{standardCopy.topsTitle}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{standardCopy.topsSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <RankingPanel emptyLabel={standardCopy.noData} title={standardCopy.topCompliance} rows={topCompliance.map((row) => ({ id: `compliance-${row.collaboratorId ?? 'none'}`, label: row.collaboratorName, detail: `${row.closedTasks}/${row.totalTasks} ${standardCopy.tasks}`, value: `${row.productivityScore} ${standardCopy.score}`, progress: row.productivityScore, onClick: row.collaboratorId == null ? undefined : () => openAgendaDrilldown({ collaborator: `user-company:${row.collaboratorId}` }) }))} />
              <RankingPanel emptyLabel={standardCopy.noData} title={standardCopy.topOverdue} rows={topOverdue.map((row) => ({ id: `overdue-${row.collaboratorId ?? 'none'}`, label: row.collaboratorName, detail: `${row.openTasks} ${copy.summary.labels.open}`, value: `${row.overdueTasks} ${copy.common.overdue}`, progress: row.totalTasks > 0 ? (row.overdueTasks / row.totalTasks) * 100 : 0, onClick: row.collaboratorId == null ? undefined : () => openAgendaDrilldown({ collaborator: `user-company:${row.collaboratorId}`, status: 'overdue' }) }))} />
              <RankingPanel emptyLabel={standardCopy.noData} title={standardCopy.riskyProcesses} rows={riskyProcesses.map((row) => ({ id: `process-${row.processId}`, label: row.processTitle, detail: `${row.pendingAuditTasks} ${copy.common.pending}`, value: `${row.overdueTasks} ${copy.common.overdue}`, progress: 100 - row.productivityScore, onClick: () => openAgendaDrilldown({ search: row.processFolio ?? row.processTitle }) }))} />
              <RankingPanel emptyLabel={standardCopy.noData} title={standardCopy.riskyProjects} rows={riskyProjects.map((row) => ({ id: `project-${row.projectId}`, label: row.projectName, detail: `${row.pendingAuditTasks} ${copy.common.pending}`, value: `${row.overdueTasks} ${copy.common.overdue}`, progress: 100 - row.healthScore, onClick: () => openAgendaDrilldown({ project: `project:${row.projectId}` }) }))} />
            </div>
          </section>

          <KpiPerformanceWorkspace
            agendaCopy={agendaCopy}
            collaborators={visibleCollaborators}
            copy={copy}
            onOpenAgenda={openAgendaDrilldown}
            processes={dashboard.processes}
            projects={dashboard.projects}
          />
        </>
      ) : null}

      {!isLoading && !dashboard && !error ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {copy.messages.empty}
        </div>
      ) : null}
    </>
  );
}
