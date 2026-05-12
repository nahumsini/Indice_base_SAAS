import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FolderKanban,
  Gauge,
  ListChecks,
  Repeat2,
  Search,
  Timer,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import {
  listProcessTaskKpis,
  type CollaboratorPerformanceRow,
  type ProcessPerformanceRow,
  type ProcessTaskKpiCard,
  type ProcessTaskKpiDashboard,
  type ProcessTaskKpiStatus,
  type ProjectPerformanceRow,
} from './kpisApi';
import { useKpisTranslations, type KpisTranslations } from './translations';

type PeriodFilter = 'day' | 'week' | 'month' | 'overdue' | 'custom';

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
  businessId?: number | null;
}

const allValue = 'all';

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
  watch: 'bg-[rgb(235,165,52)]',
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

function dateRangeForPeriod(period: PeriodFilter, customFrom: string, customTo: string) {
  const today = new Date();

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

  if (period === 'overdue') {
    const todayText = localDateString(today);
    return {
      from: todayText,
      to: todayText,
      includeOverdueBacklog: false,
      overdueOnly: true,
    };
  }

  if (period === 'custom') {
    const fallback = localDateString(today);
    return {
      from: customFrom || fallback,
      to: customTo || customFrom || fallback,
      includeOverdueBacklog: false,
      overdueOnly: false,
    };
  }

  const todayText = localDateString(today);
  return {
    from: todayText,
    to: todayText,
    includeOverdueBacklog: true,
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
    businessId: user.business_id ?? null,
  };
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
  copy: KpisTranslations,
): ProcessTaskKpiCard {
  const { summary } = dashboard;

  switch (card.id) {
    case 'productivity':
      return { ...card, ...copy.cards.productivity };
    case 'compliance':
      return {
        ...card,
        title: copy.cards.compliance.title,
        target: copy.cards.compliance.target(summary.completedTasks),
        description: copy.cards.compliance.description,
      };
    case 'timeliness':
      return {
        ...card,
        title: copy.cards.timeliness.title,
        target: copy.cards.timeliness.target(summary.overdueTasks),
        description: copy.cards.timeliness.description,
      };
    case 'audit':
      return {
        ...card,
        title: copy.cards.audit.title,
        target: copy.cards.audit.target(summary.pendingAuditTasks),
        description: copy.cards.audit.description,
      };
    case 'quality':
      return { ...card, ...copy.cards.quality };
    case 'collaborators':
      return {
        ...card,
        title: copy.cards.collaborators.title,
        target: copy.cards.collaborators.target(dashboard.projects.length, dashboard.processes.length),
        description: copy.cards.collaborators.description,
      };
    default:
      return card;
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

function KpiCard({ card, copy }: { card: ProcessTaskKpiCard; copy: KpisTranslations }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{card.title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
        </div>
        <StatusBadge copy={copy} status={card.status} />
      </div>
      <ScoreBar
        score={Number.parseInt(card.value, 10) || (card.status === 'healthy' ? 100 : card.status === 'watch' ? 70 : 40)}
        status={card.status}
      />
      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{card.target}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
    </article>
  );
}

function KpiSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

function SummaryStrip({ copy, dashboard }: { copy: KpisTranslations; dashboard: ProcessTaskKpiDashboard }) {
  const summary = dashboard.summary;
  const statusSegments = [
    { label: copy.summary.segments.inProgress, count: summary.openTasks, className: 'bg-blue-500' },
    { label: copy.summary.segments.closed, count: summary.completedTasks, className: 'bg-emerald-500' },
    { label: copy.summary.segments.audited, count: summary.auditedTasks, className: 'bg-violet-500' },
    { label: copy.summary.segments.overdue, count: summary.overdueTasks, className: 'bg-rose-500' },
    { label: copy.summary.segments.cancelled, count: summary.cancelledTasks, className: 'bg-slate-400' },
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
            icon={<Timer className="h-4 w-4" />}
            label={copy.summary.labels.open}
            value={summary.openTasks}
            valueClassName="text-blue-600 dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={copy.summary.labels.closed}
            value={summary.completedTasks}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <KpiMetric
            icon={<AlertTriangle className="h-4 w-4" />}
            label={copy.summary.labels.overdue}
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
            valueClassName="text-[rgb(235,165,52)]"
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

      <div className="rounded-lg border border-[rgb(235,165,52)]/20 bg-[rgb(235,165,52)]/10 px-4 py-3 dark:border-[rgb(235,165,52)]/30 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(235,165,52)]" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{buildKpiInsight(summary, copy)}</p>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function CollaboratorsTable({ copy, rows }: { copy: KpisTranslations; rows: CollaboratorPerformanceRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.collaboratorsTable.title}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {copy.collaboratorsTable.subtitle}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
          {copy.common.collaborators(rows.length)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1180px]">
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.rank}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.collaborator}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.context}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.score}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.tasks}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.closure}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.timeliness}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.audit}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.quality}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.evidence}</TableHead>
              <TableHead className="px-5 py-4">{copy.collaboratorsTable.headers.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.collaboratorId ?? 'unassigned'}-${row.rank}`} className="border-slate-200 dark:border-slate-700">
                <TableCell className="px-5 py-4 font-semibold text-slate-900 dark:text-white">#{row.rank}</TableCell>
                <TableCell className="px-5 py-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{row.collaboratorName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {copy.collaboratorsTable.details.openOverdue(row.openTasks, row.overdueTasks)}
                  </p>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                  <p>{row.unitName ?? copy.common.noUnit}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.businessName ?? copy.common.noBusiness}</p>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <ScoreBar score={row.productivityScore} status={row.status} />
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {row.completedTasks}/{row.totalTasks}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{row.completionRate}%</TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{row.timelinessRate}%</TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {copy.collaboratorsTable.details.audit(row.auditRate, row.pendingAuditTasks)}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {formatWeighting(row.averageWeighting, copy.common.notApplicable)}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{row.evidenceRate}%</TableCell>
                <TableCell className="px-5 py-4">
                  <StatusBadge copy={copy} status={row.status} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.collaboratorsTable.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ProcessesTable({ copy, rows }: { copy: KpisTranslations; rows: ProcessPerformanceRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.processesTable.title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {copy.processesTable.subtitle}
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-5 py-4">{copy.processesTable.headers.process}</TableHead>
              <TableHead className="px-5 py-4">{copy.processesTable.headers.score}</TableHead>
              <TableHead className="px-5 py-4">{copy.processesTable.headers.tasks}</TableHead>
              <TableHead className="px-5 py-4">{copy.processesTable.headers.audit}</TableHead>
              <TableHead className="px-5 py-4">{copy.processesTable.headers.next}</TableHead>
              <TableHead className="px-5 py-4">{copy.processesTable.headers.engine}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 8).map((row) => (
              <TableRow key={row.processId}>
                <TableCell className="px-5 py-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{row.processTitle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.processFolio ?? copy.common.noFolio}</p>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <ScoreBar score={row.productivityScore} status={row.status} />
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {copy.processesTable.details.tasks(row.completedTasks, row.totalTasks, row.overdueTasks)}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {copy.processesTable.details.audit(row.auditRate, formatWeighting(row.averageWeighting, copy.common.notApplicable))}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(row.nextOccurrenceDate, copy.common.noDate, copy.locale)}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', row.isActive ? statusClasses.healthy : statusClasses.watch)}>
                    {row.isActive ? copy.statuses.active : copy.statuses.paused}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.processesTable.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ProjectsTable({ copy, rows }: { copy: KpisTranslations; rows: ProjectPerformanceRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.projectsTable.title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {copy.projectsTable.subtitle}
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-5 py-4">{copy.projectsTable.headers.project}</TableHead>
              <TableHead className="px-5 py-4">{copy.projectsTable.headers.health}</TableHead>
              <TableHead className="px-5 py-4">{copy.projectsTable.headers.progress}</TableHead>
              <TableHead className="px-5 py-4">{copy.projectsTable.headers.tasks}</TableHead>
              <TableHead className="px-5 py-4">{copy.projectsTable.headers.audit}</TableHead>
              <TableHead className="px-5 py-4">{copy.projectsTable.headers.dueDate}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 8).map((row) => (
              <TableRow key={row.projectId}>
                <TableCell className="px-5 py-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{row.projectName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.projectFolio ?? copy.common.noFolio}</p>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <ScoreBar score={row.healthScore} status={row.status} />
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{row.averageCompletion}%</TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {copy.projectsTable.details.tasks(row.completedTasks, row.totalTasks, row.overdueTasks)}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {copy.projectsTable.details.audit(row.auditRate, row.pendingAuditTasks)}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(row.dueDate, copy.common.noDate, copy.locale)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.projectsTable.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default function KPIs() {
  const copy = useKpisTranslations();
  const headerCopy = copy.header;
  const periodLabels = copy.periods;
  const [dashboard, setDashboard] = useState<ProcessTaskKpiDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('day');
  const [customFrom, setCustomFrom] = useState(localDateString(new Date()));
  const [customTo, setCustomTo] = useState(localDateString(new Date()));
  const [unitFilter, setUnitFilter] = useState(allValue);
  const [businessFilter, setBusinessFilter] = useState(allValue);
  const [collaboratorFilter, setCollaboratorFilter] = useState(allValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);

  const selectedUnitId = unitFilter === allValue ? null : Number(unitFilter);
  const selectedBusinessId = businessFilter === allValue ? null : Number(businessFilter);
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

  const range = useMemo(() => dateRangeForPeriod(period, customFrom, customTo), [customFrom, customTo, period]);

  useEffect(() => {
    let isActive = true;

    async function loadCatalogs() {
      try {
        const [unitItems, businessItems, hrUsers] = await Promise.all([
          dashboardApi.listUnits(),
          dashboardApi.listBusinesses(),
          humanResourcesApi.listHrUsers(),
        ]);

        if (!isActive) {
          return;
        }

        setUnits(
          unitItems
            .map(normalizeUnit)
            .filter((unit) => unit.name)
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        setBusinesses(
          businessItems
            .map(normalizeBusiness)
            .filter((business) => business.name)
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        setCollaborators(
          hrUsers.items
            .map(normalizeCollaborator)
            .filter((collaborator): collaborator is CollaboratorOption => collaborator != null)
            .sort((left, right) => left.name.localeCompare(right.name)),
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
  }, [copy.messages.loadCatalogs]);

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
    selectedUnitId,
    copy.messages.loadKpis,
  ]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleCollaborators = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return dashboard.collaborators.filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      return [row.collaboratorName, row.unitName, row.businessName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [dashboard, normalizedSearch]);

  const handleUnitChange = (value: string) => {
    setUnitFilter(value);
    setBusinessFilter(allValue);
    setCollaboratorFilter(allValue);
  };

  const handleBusinessChange = (value: string) => {
    setBusinessFilter(value);
    setCollaboratorFilter(allValue);
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <span className="text-2xl leading-none" aria-hidden="true">{headerCopy.emoji}</span>
              {headerCopy.title}
            </h2>
            <p className="max-w-4xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {headerCopy.subtitle}
            </p>
          </div>
          {dashboard ? (
            <div className="rounded-xl border border-white/80 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">{periodLabels[period]}</p>
              <p>
                {formatDate(dashboard.range.from, copy.common.noDate, copy.locale)} - {formatDate(dashboard.range.to, copy.common.noDate, copy.locale)}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <FilterSelect label={copy.filters.period} value={period} onChange={(value) => setPeriod(value as PeriodFilter)}>
            {Object.entries(periodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={copy.filters.unit} value={unitFilter} onChange={handleUnitChange}>
            <SelectItem value={allValue}>{copy.common.allFemale}</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={String(unit.id)}>
                {unit.name}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={copy.filters.business} value={businessFilter} onChange={handleBusinessChange}>
            <SelectItem value={allValue}>{copy.common.all}</SelectItem>
            {scopedBusinesses.map((business) => (
              <SelectItem key={business.id} value={String(business.id)}>
                {business.name}
              </SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect label={copy.filters.collaborator} value={collaboratorFilter} onChange={setCollaboratorFilter}>
            <SelectItem value={allValue}>{copy.common.all}</SelectItem>
            {scopedCollaborators.map((collaborator) => (
              <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>
                {collaborator.name}
              </SelectItem>
            ))}
          </FilterSelect>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.filters.searchPlaceholder}
                className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {period === 'custom' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.from}</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.to}</label>
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {isLoading ? <KpiSkeleton /> : null}

      {!isLoading && dashboard ? (
        <>
          <SummaryStrip copy={copy} dashboard={dashboard} />

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.cards.map((card) => (
              <KpiCard key={card.id} card={localizeKpiCard(card, dashboard, copy)} copy={copy} />
            ))}
          </section>

          <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.chart.title}</h3>
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
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Users className="mb-4 h-5 w-5 text-blue-600 dark:text-blue-300" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.snapshots.collaborators}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{dashboard.collaborators.length}</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Repeat2 className="mb-4 h-5 w-5 text-cyan-600 dark:text-cyan-300" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.snapshots.processTasks}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{dashboard.summary.processTasks}</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <FolderKanban className="mb-4 h-5 w-5 text-violet-600 dark:text-violet-300" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.snapshots.projectTasks}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{dashboard.summary.projectTasks}</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Trophy className="mb-4 h-5 w-5 text-[rgb(235,165,52)]" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.snapshots.quality}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{formatWeighting(dashboard.summary.averageWeighting, copy.common.notApplicable)}</p>
            </article>
          </section>

          <div className="space-y-6">
            <CollaboratorsTable copy={copy} rows={visibleCollaborators} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ProcessesTable copy={copy} rows={dashboard.processes} />
              <ProjectsTable copy={copy} rows={dashboard.projects} />
            </div>
          </div>
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
