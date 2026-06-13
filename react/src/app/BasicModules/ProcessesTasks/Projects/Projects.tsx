import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Columns3,
  Eye,
  FolderKanban,
  Gauge,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Timer,
  Trash2,
} from 'lucide-react';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { ColumnasConfigModal, type ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { priorityClasses } from '../Processes/processesData';
import { listProcesses } from '../Processes/processesApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessRecord,
  ProcessUnitOption,
} from '../Processes/types';
import { collaboratorCanOwnScopedRecord } from '../shared/assignmentScope';
import { ProjectFormDialog, type ProjectFormValues } from './components/ProjectFormDialog';
import { ProjectActionButton, SortableTableHead } from './components/ProjectTablePrimitives';
import { ProjectTasksWorkspace } from './components/ProjectTasksWorkspace';
import {
  cancelProject,
  completeProject,
  createProject,
  deleteProject,
  listProjects,
  updateProject,
  type ProjectPayload,
  type ProjectPriority,
  type ProjectRecord,
  type ProjectStatus,
} from './projectsApi';
import { useProjectsTranslations, type ProjectsTranslations } from './translations';

type StatusFilter = 'all' | ProjectStatus | 'at-risk';
type OptionFilter = 'all' | string;
type ProjectConfirmation = { type: 'cancel' | 'delete'; project: ProjectRecord };
type ProjectColumnId =
  | 'folio'
  | 'name'
  | 'unit'
  | 'business'
  | 'owner'
  | 'status'
  | 'priority'
  | 'startDate'
  | 'dueDate'
  | 'progress'
  | 'tasks'
  | 'updated';
type ProjectSortDirection = 'asc' | 'desc';
type ProjectSortValue = string | number | null;

interface ProjectSortState {
  columnId: ProjectColumnId;
  direction: ProjectSortDirection;
}

interface StoredProjectFilters {
  business: OptionFilter;
  owner: OptionFilter;
  search: string;
  status: StatusFilter;
  unit: OptionFilter;
}

const statusClasses: Record<ProjectStatus, string> = {
  active:
    'border-[#F4C84A]/30 bg-[#F4C84A]/10 text-[#9A6B05] dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]',
  paused:
    'border-[#F4C84A]/40 bg-[#F4C84A]/15 text-[#9A6B05] dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/20 dark:text-[#FEF3C7]',
  completed:
    'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177D66] dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15 dark:text-emerald-200',
  cancelled:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

const progressTrackClass = 'h-2 w-full overflow-hidden rounded-full bg-[#F4C84A]/12 ring-1 ring-[#F4C84A]/20 dark:bg-slate-700 dark:ring-slate-600';
const NO_UNIT_VALUE = '__no_unit__';
const NO_BUSINESS_VALUE = '__no_business__';
const UNASSIGNED_OWNER_VALUE = '__unassigned_owner__';
const NO_PRIORITY_VALUE = '__no_priority__';
const projectColumnsStorageKey = 'processes-tasks-projects-columns-v1';
const projectFiltersStorageKey = 'processes-tasks-projects-filters-v1';
const projectPriorityValues: ProjectPriority[] = ['low', 'medium', 'high'];
const projectStatusValues: ProjectStatus[] = ['active', 'paused', 'completed', 'cancelled'];
const projectSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const projectPrioritySortRank: Record<ProjectPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function createDefaultProjectColumns(columnCopy: ProjectsTranslations['columns']): ColumnConfig[] {
  return [
    { id: 'folio', label: columnCopy.folio.label, visible: true, description: columnCopy.folio.description },
    { id: 'name', label: columnCopy.name.label, visible: true, description: columnCopy.name.description },
    { id: 'unit', label: columnCopy.unit.label, visible: true, description: columnCopy.unit.description },
    { id: 'business', label: columnCopy.business.label, visible: true, description: columnCopy.business.description },
    { id: 'owner', label: columnCopy.owner.label, visible: true, description: columnCopy.owner.description },
    { id: 'status', label: columnCopy.status.label, visible: true, description: columnCopy.status.description },
    { id: 'priority', label: columnCopy.priority.label, visible: true, description: columnCopy.priority.description },
    { id: 'startDate', label: columnCopy.startDate.label, visible: false, description: columnCopy.startDate.description },
    { id: 'dueDate', label: columnCopy.dueDate.label, visible: true, description: columnCopy.dueDate.description },
    { id: 'progress', label: columnCopy.progress.label, visible: true, description: columnCopy.progress.description },
    { id: 'tasks', label: columnCopy.tasks.label, visible: true, description: columnCopy.tasks.description },
    { id: 'updated', label: columnCopy.updated.label, visible: false, description: columnCopy.updated.description },
  ];
}

function getInitialProjectColumns(defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(projectColumnsStorageKey);
    if (!rawColumns) {
      return defaultColumns;
    }

    const parsedColumns = JSON.parse(rawColumns) as Array<Partial<ColumnConfig>>;
    const defaultColumnMap = new Map(defaultColumns.map((column) => [column.id, column]));
    const restoredColumns = parsedColumns
      .map((column) => {
        if (!column?.id || !defaultColumnMap.has(column.id)) {
          return null;
        }

        const baseColumn = defaultColumnMap.get(column.id)!;
        return {
          ...baseColumn,
          visible: typeof column.visible === 'boolean' ? column.visible : baseColumn.visible,
        };
      })
      .filter((column): column is ColumnConfig => column !== null);
    const missingColumns = defaultColumns.filter(
      (column) => !restoredColumns.some((restoredColumn) => restoredColumn.id === column.id),
    );

    return restoredColumns.length > 0 ? [...restoredColumns, ...missingColumns] : defaultColumns;
  } catch {
    return defaultColumns;
  }
}

function getStoredProjectFilters(): StoredProjectFilters | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawFilters = window.sessionStorage.getItem(projectFiltersStorageKey);
    if (!rawFilters) {
      return null;
    }

    const parsedFilters = JSON.parse(rawFilters) as Partial<StoredProjectFilters>;
    const status =
      parsedFilters.status === 'all' ||
      parsedFilters.status === 'at-risk' ||
      projectStatusValues.includes(parsedFilters.status as ProjectStatus)
        ? (parsedFilters.status as StatusFilter)
        : 'all';

    return {
      business: typeof parsedFilters.business === 'string' ? parsedFilters.business : 'all',
      owner: typeof parsedFilters.owner === 'string' ? parsedFilters.owner : 'all',
      search: typeof parsedFilters.search === 'string' ? parsedFilters.search : '',
      status,
      unit: typeof parsedFilters.unit === 'string' ? parsedFilters.unit : 'all',
    };
  } catch {
    return null;
  }
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isPastDate(value: string | null) {
  if (!value) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00`) < today;
}

function isProjectAtRisk(project: ProjectRecord) {
  return (
    project.status !== 'completed' &&
    project.status !== 'cancelled' &&
    (project.overdueTaskCount > 0 || isPastDate(project.dueDate))
  );
}

function createDefaultProjectForm(): ProjectFormValues {
  return {
    name: '',
    description: '',
    status: 'active',
    priority: 'none',
    ownerUserCompanyId: '',
    ownerName: '',
    businessId: '',
    unitId: '',
    startDate: '',
    dueDate: '',
  };
}

function toProjectFormValues(project: ProjectRecord): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    priority: project.priority ?? 'none',
    ownerUserCompanyId: project.ownerUserCompanyId?.toString() ?? '',
    ownerName: project.ownerName ?? '',
    businessId: project.businessId?.toString() ?? '',
    unitId: project.unitId?.toString() ?? '',
    startDate: project.startDate ?? '',
    dueDate: project.dueDate ?? '',
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseOptionalNumber(
  value: string,
  fieldLabel: string,
  positiveNumberMessage: (field: string) => string = (field) => `${field} debe ser un numero positivo.`,
) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(positiveNumberMessage(fieldLabel));
  }

  return parsed;
}

function buildProjectPayload(form: ProjectFormValues, copy: ProjectsTranslations): ProjectPayload {
  const ownerUserCompanyId = parseOptionalNumber(
    form.ownerUserCompanyId,
    copy.form.labels.owner,
    copy.messages.positiveNumber,
  );

  return {
    name: form.name.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    status: form.status,
    priority: form.priority === 'none' ? null : form.priority,
    ownerUserCompanyId,
    ownerName: form.ownerName.trim() ? form.ownerName.trim() : null,
    businessId: parseOptionalNumber(form.businessId, copy.form.labels.business, copy.messages.positiveNumber),
    unitId: parseOptionalNumber(form.unitId, copy.form.labels.unit, copy.messages.positiveNumber),
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
  };
}

function buildProjectPayloadFromRecord(project: ProjectRecord, patch: Partial<ProjectPayload> = {}): ProjectPayload {
  return {
    name: project.name.trim(),
    description: project.description?.trim() ? project.description.trim() : null,
    status: project.status,
    priority: project.priority,
    ownerUserCompanyId: project.ownerUserCompanyId,
    ownerName: project.ownerName?.trim() ? project.ownerName.trim() : null,
    businessId: project.businessId,
    unitId: project.unitId,
    startDate: project.startDate,
    dueDate: project.dueDate,
    ...patch,
  };
}

function formatDate(value: string | null, includeTime = false, noDateLabel: string) {
  if (!value) {
    return noDateLabel;
  }

  const date = includeTime ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit' as const,
          minute: '2-digit' as const,
        }
      : {}),
  }).format(date);
}

function sortableDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  const time = parsedDate.getTime();

  return Number.isNaN(time) ? null : time;
}

function compareSortValues(
  leftValue: ProjectSortValue,
  rightValue: ProjectSortValue,
  direction: ProjectSortDirection,
) {
  const leftIsEmpty = leftValue == null || leftValue === '';
  const rightIsEmpty = rightValue == null || rightValue === '';

  if (leftIsEmpty && rightIsEmpty) return 0;
  if (leftIsEmpty) return 1;
  if (rightIsEmpty) return -1;

  const result =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : projectSortCollator.compare(String(leftValue), String(rightValue));

  return direction === 'asc' ? result : result * -1;
}

function getProjectSortValue(project: ProjectRecord, columnId: ProjectColumnId): ProjectSortValue {
  switch (columnId) {
    case 'folio':
      return project.folio;
    case 'name':
      return project.name;
    case 'unit':
      return project.unitName ?? project.unit ?? '';
    case 'business':
      return project.businessName ?? project.business ?? '';
    case 'owner':
      return project.ownerName ?? '';
    case 'status':
      return project.status;
    case 'priority':
      return project.priority ? projectPrioritySortRank[project.priority] : 0;
    case 'startDate':
      return sortableDateValue(project.startDate);
    case 'dueDate':
      return sortableDateValue(project.dueDate);
    case 'progress':
      return project.completionPercent;
    case 'tasks':
      return project.taskCount;
    case 'updated':
      return sortableDateValue(project.updatedAt);
  }
}

function compactText(value?: string | null) {
  return value?.trim() ?? '';
}

function isSystemLikeUnitName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === 'sheet' || normalized === 'sheets';
}

function normalizeUnitOption(unit: BackendUnit): ProcessUnitOption | null {
  const name = compactText(unit.name);

  if (!name || isSystemLikeUnitName(name)) {
    return null;
  }

  return {
    id: unit.id,
    name,
  };
}

function normalizeBusinessOption(business: BackendBusiness): ProcessBusinessOption | null {
  const name = compactText(business.name);

  if (!name) {
    return null;
  }

  return {
    id: business.id,
    name,
    unitId: business.unitId ?? business.unit_id ?? null,
  };
}

function normalizeCollaboratorOption(user: BackendHrUser): ProcessCollaboratorOption | null {
  const userCompanyId = user.user_company_id ?? user.legacy_user_company_id ?? null;
  const name = compactText(user.full_name) || compactText(`${user.first_name ?? ''} ${user.last_name ?? ''}`);

  if (!userCompanyId || !name || user.status !== 'active') {
    return null;
  }

  return {
    userCompanyId,
    userId: user.user_id ?? null,
    name,
    email: user.email,
    unitId: user.unit_id ?? null,
    unitName: compactText(user.unit_name),
    businessId: user.business_id ?? null,
    businessName: compactText(user.business_name),
  };
}

function isHeadquarterUnitName(name?: string | null) {
  const normalizedName = compactText(name).toLowerCase().replace(/\s+/g, ' ');
  return normalizedName === 'headquarter' || normalizedName === 'headquarters' || normalizedName === 'headquater';
}

function businessMatchesUnit(business: ProcessBusinessOption, unitId: number | null) {
  return unitId == null || business.unitId == null || business.unitId === unitId;
}

interface ProjectKpiMetrics {
  activeCount: number;
  atRiskCount: number;
  auditedTaskCount: number;
  averageProgress: number;
  cancelledCount: number;
  completedCount: number;
  completedTaskCount: number;
  healthScore: number;
  linkedTaskCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  pausedCount: number;
  totalCount: number;
}

function ProjectKpiMetric({
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#9A6B05] shadow-sm ring-1 ring-[#F4C84A]/30 dark:bg-slate-800 dark:text-[#FEF3C7] dark:ring-[#F4C84A]/35">
        {icon}
      </span>
      <span className={cn('font-semibold', valueClassName)}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function segmentWidth(count: number, total: number) {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
}

function ProjectStatusBar({ copy, metrics }: { copy: ProjectsTranslations['kpis']; metrics: ProjectKpiMetrics }) {
  const segments = [
    { className: 'bg-[#F4C84A]', count: metrics.activeCount, label: copy.segments.active },
    { className: 'bg-slate-400', count: metrics.pausedCount, label: copy.segments.paused },
    { className: 'bg-[#59C3A5]', count: metrics.completedCount, label: copy.segments.completed },
    { className: 'bg-violet-500', count: metrics.auditedTaskCount, label: copy.segments.auditedTasks },
    { className: 'bg-[#FF2D5E]', count: metrics.atRiskCount, label: copy.segments.atRisk },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-700 dark:ring-slate-600">
        <div className="flex h-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={cn('transition-all duration-300', segment.className)}
              style={{ width: segmentWidth(segment.count, total) }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        {segments.map((segment) => (
          <span key={segment.label} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', segment.className)} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildProjectInsight(metrics: ProjectKpiMetrics, copy: ProjectsTranslations['kpis']['insights']) {
  if (metrics.totalCount === 0) {
    return copy.empty;
  }

  if (metrics.atRiskCount > 0) {
    return copy.atRisk(metrics.atRiskCount, metrics.overdueTaskCount, metrics.openTaskCount);
  }

  if (metrics.openTaskCount > 0) {
    return copy.open(metrics.openTaskCount, metrics.completedTaskCount, metrics.averageProgress);
  }

  if (metrics.healthScore >= 85) {
    return copy.healthy(metrics.totalCount, metrics.averageProgress, metrics.healthScore);
  }

  return copy.default(metrics.healthScore, metrics.totalCount, metrics.linkedTaskCount);
}

function ProjectKpiStrip({
  copy,
  isLoading,
  metrics,
}: {
  copy: ProjectsTranslations['kpis'];
  isLoading: boolean;
  metrics: ProjectKpiMetrics;
}) {
  if (isLoading) {
    return (
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-36 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const healthTone =
    metrics.healthScore >= 85
      ? 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177D66] dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15 dark:text-emerald-200'
      : metrics.healthScore >= 65
        ? 'border-[#F4C84A]/40 bg-[#F4C84A]/15 text-[#9A6B05] dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/20 dark:text-[#FEF3C7]'
        : 'border-[#FF2D5E]/30 bg-[#FF2D5E]/10 text-[#C60037] dark:border-[#FF2D5E]/45 dark:bg-[#FF2D5E]/15 dark:text-pink-200';

  return (
    <div className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ProjectKpiMetric icon={<Eye className="h-4 w-4" />} label={copy.labels.visible} value={metrics.totalCount} />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProjectKpiMetric
            icon={<FolderKanban className="h-4 w-4" />}
            label={copy.labels.active}
            value={metrics.activeCount}
            valueClassName="text-[#9A6B05] dark:text-[#FEF3C7]"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProjectKpiMetric
            icon={<Timer className="h-4 w-4" />}
            label={copy.labels.open}
            value={metrics.openTaskCount}
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProjectKpiMetric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={copy.labels.closed}
            value={metrics.completedTaskCount}
            valueClassName="text-[#177D66] dark:text-emerald-200"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProjectKpiMetric
            icon={<AlertTriangle className="h-4 w-4" />}
            label={copy.labels.overdue}
            value={metrics.overdueTaskCount}
            valueClassName="text-[#C60037] dark:text-pink-200"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProjectKpiMetric
            icon={<ListChecks className="h-4 w-4" />}
            label={copy.labels.averageProgress}
            value={`${metrics.averageProgress}%`}
            valueClassName="text-[#9A6B05] dark:text-[#FEF3C7]"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProjectKpiMetric icon={<Gauge className="h-4 w-4" />} label={copy.labels.tasks} value={metrics.linkedTaskCount} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {metrics.atRiskCount > 0 ? (
            <span className="rounded-full border border-[#FF2D5E]/30 bg-[#FF2D5E]/10 px-3 py-1 text-xs font-semibold text-[#C60037] dark:border-[#FF2D5E]/45 dark:bg-[#FF2D5E]/15 dark:text-pink-200">
              {copy.badges.atRisk(metrics.atRiskCount)}
            </span>
          ) : null}
          {metrics.pausedCount > 0 ? (
            <span className="rounded-full border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-3 py-1 text-xs font-semibold text-[#9A6B05] dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]">
              {copy.badges.paused(metrics.pausedCount)}
            </span>
          ) : null}
          {metrics.cancelledCount > 0 ? (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {copy.badges.cancelled(metrics.cancelledCount)}
            </span>
          ) : null}
          <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', healthTone)}>
            {copy.badges.health(metrics.healthScore)}
          </span>
        </div>
      </div>

      <ProjectStatusBar copy={copy} metrics={metrics} />

      <div className="rounded-lg border border-[#F4C84A]/20 bg-[#F4C84A]/10 px-4 py-3 dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/15">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6B05] dark:text-[#FEF3C7]" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{buildProjectInsight(metrics, copy.insights)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const projectCopy = useProjectsTranslations();
  const headerCopy = projectCopy.header;
  const defaultColumns = useMemo(() => createDefaultProjectColumns(projectCopy.columns), [projectCopy.columns]);
  const fixedColumns = useMemo<ColumnConfig[]>(
    () => [
      {
        id: 'actions',
        label: projectCopy.fixedColumns.actions.label,
        visible: true,
        locked: true,
        description: projectCopy.fixedColumns.actions.description,
      },
    ],
    [projectCopy.fixedColumns.actions.description, projectCopy.fixedColumns.actions.label],
  );
  const storedProjectFilters = useMemo(() => getStoredProjectFilters(), []);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(storedProjectFilters?.search ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(storedProjectFilters?.status ?? 'all');
  const [unitFilter, setUnitFilter] = useState<OptionFilter>(storedProjectFilters?.unit ?? 'all');
  const [businessFilter, setBusinessFilter] = useState<OptionFilter>(storedProjectFilters?.business ?? 'all');
  const [ownerFilter, setOwnerFilter] = useState<OptionFilter>(storedProjectFilters?.owner ?? 'all');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => getInitialProjectColumns(defaultColumns));
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [sortState, setSortState] = useState<ProjectSortState>({ columnId: 'dueDate', direction: 'asc' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectFormValues>(() => createDefaultProjectForm());
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [pendingProjectIds, setPendingProjectIds] = useState<number[]>([]);
  const [confirmation, setConfirmation] = useState<ProjectConfirmation | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [catalogUnits, setCatalogUnits] = useState<ProcessUnitOption[]>([]);
  const [catalogBusinesses, setCatalogBusinesses] = useState<ProcessBusinessOption[]>([]);
  const [catalogCollaborators, setCatalogCollaborators] = useState<ProcessCollaboratorOption[]>([]);
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectsError(null);

    try {
      const items = await listProjects();
      setProjects(items);
      setSelectedProjectId((currentProjectId) =>
        currentProjectId != null && items.some((project) => project.id === currentProjectId)
          ? currentProjectId
          : currentProjectId == null
            ? null
            : null,
      );
    } catch (error) {
      setProjects([]);
      setProjectsError(getErrorMessage(error, projectCopy.messages.loadProjects));
    } finally {
      setIsLoadingProjects(false);
    }
  }, [projectCopy.messages.loadProjects]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(projectColumnsStorageKey, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextFilters: StoredProjectFilters = {
      business: businessFilter,
      owner: ownerFilter,
      search: searchQuery,
      status: statusFilter,
      unit: unitFilter,
    };

    window.sessionStorage.setItem(projectFiltersStorageKey, JSON.stringify(nextFilters));
  }, [businessFilter, ownerFilter, searchQuery, statusFilter, unitFilter]);

  useEffect(() => {
    const defaultColumnMap = new Map(defaultColumns.map((column) => [column.id, column]));
    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        const translatedColumn = defaultColumnMap.get(column.id);

        return translatedColumn
          ? {
              ...translatedColumn,
              visible: column.visible,
            }
          : column;
      }),
    );
  }, [defaultColumns]);

  useEffect(() => {
    const loadRelations = async () => {
      const [processResult, unitResult, businessResult, hrUserResult] = await Promise.allSettled([
        listProcesses(),
        dashboardApi.listUnits(),
        dashboardApi.listBusinesses(),
        humanResourcesApi.listHrUsers(),
      ]);

      setProcesses(processResult.status === 'fulfilled' ? processResult.value : []);
      setCatalogUnits(
        unitResult.status === 'fulfilled'
          ? unitResult.value
              .map(normalizeUnitOption)
              .filter((option): option is ProcessUnitOption => option !== null)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
      setCatalogBusinesses(
        businessResult.status === 'fulfilled'
          ? businessResult.value
              .map(normalizeBusinessOption)
              .filter((option): option is ProcessBusinessOption => option !== null)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
      setCatalogCollaborators(
        hrUserResult.status === 'fulfilled'
          ? hrUserResult.value.items
              .map(normalizeCollaboratorOption)
              .filter((option): option is ProcessCollaboratorOption => option !== null)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
    };

    void loadRelations();
  }, []);

  const unitOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    catalogUnits.forEach((unit) => optionMap.set(String(unit.id), unit.name));
    projects.forEach((project) => {
      if (project.unitId != null) {
        optionMap.set(String(project.unitId), project.unitName ?? `${projectCopy.form.labels.unit} #${project.unitId}`);
      }
    });

    return Array.from(optionMap, ([value, label]) => ({ value, label })).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [catalogUnits, projectCopy.form.labels.unit, projects]);

  const businessOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    catalogBusinesses
      .filter((business) => unitFilter === 'all' || business.unitId == null || String(business.unitId) === unitFilter)
      .forEach((business) => optionMap.set(String(business.id), business.name));
    projects.forEach((project) => {
      if (
        project.businessId != null &&
        (unitFilter === 'all' || project.unitId == null || String(project.unitId) === unitFilter)
      ) {
        optionMap.set(
          String(project.businessId),
          project.businessName ?? `${projectCopy.form.labels.business} #${project.businessId}`,
        );
      }
    });

    return Array.from(optionMap, ([value, label]) => ({ value, label })).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [catalogBusinesses, projectCopy.form.labels.business, projects, unitFilter]);

  const ownerOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    catalogCollaborators.forEach((collaborator) => optionMap.set(String(collaborator.userCompanyId), collaborator.name));
    projects.forEach((project) => {
      if (project.ownerUserCompanyId != null) {
        optionMap.set(
          String(project.ownerUserCompanyId),
          project.ownerName ?? `${projectCopy.form.labels.owner} #${project.ownerUserCompanyId}`,
        );
      }
    });

    return Array.from(optionMap, ([value, label]) => ({ value, label })).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [catalogCollaborators, projectCopy.form.labels.owner, projects]);

  useEffect(() => {
    if (unitFilter !== 'all' && !unitOptions.some((option) => option.value === unitFilter)) {
      setUnitFilter('all');
    }
  }, [unitFilter, unitOptions]);

  useEffect(() => {
    if (businessFilter !== 'all' && !businessOptions.some((option) => option.value === businessFilter)) {
      setBusinessFilter('all');
    }
  }, [businessFilter, businessOptions]);

  useEffect(() => {
    if (ownerFilter !== 'all' && !ownerOptions.some((option) => option.value === ownerFilter)) {
      setOwnerFilter('all');
    }
  }, [ownerFilter, ownerOptions]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.folio.toLowerCase().includes(normalizedSearch) ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        (project.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (project.ownerName ?? '').toLowerCase().includes(normalizedSearch) ||
        (project.businessName ?? '').toLowerCase().includes(normalizedSearch) ||
        (project.unitName ?? '').toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'at-risk' ? isProjectAtRisk(project) : project.status === statusFilter);
      const matchesUnit = unitFilter === 'all' || String(project.unitId ?? '') === unitFilter;
      const matchesBusiness = businessFilter === 'all' || String(project.businessId ?? '') === businessFilter;
      const matchesOwner = ownerFilter === 'all' || String(project.ownerUserCompanyId ?? '') === ownerFilter;

      return matchesSearch && matchesStatus && matchesUnit && matchesBusiness && matchesOwner;
    });
  }, [businessFilter, ownerFilter, projects, searchQuery, statusFilter, unitFilter]);

  const sortedProjects = useMemo(() => {
    return filteredProjects
      .map((project, index) => ({ index, project }))
      .sort((left, right) => {
        const comparison = compareSortValues(
          getProjectSortValue(left.project, sortState.columnId),
          getProjectSortValue(right.project, sortState.columnId),
          sortState.direction,
        );

        return comparison === 0 ? left.index - right.index : comparison;
      })
      .map(({ project }) => project);
  }, [filteredProjects, sortState]);

  const metrics = useMemo(() => {
    const totalCount = filteredProjects.length;
    const activeCount = filteredProjects.filter((project) => project.status === 'active').length;
    const pausedCount = filteredProjects.filter((project) => project.status === 'paused').length;
    const completedCount = filteredProjects.filter((project) => project.status === 'completed').length;
    const cancelledCount = filteredProjects.filter((project) => project.status === 'cancelled').length;
    const linkedTaskCount = filteredProjects.reduce((sum, project) => sum + project.taskCount, 0);
    const openTaskCount = filteredProjects.reduce((sum, project) => sum + project.openTaskCount, 0);
    const completedTaskCount = filteredProjects.reduce((sum, project) => sum + project.completedTaskCount, 0);
    const overdueTaskCount = filteredProjects.reduce((sum, project) => sum + project.overdueTaskCount, 0);
    const auditedTaskCount = filteredProjects.reduce((sum, project) => sum + project.auditedTaskCount, 0);
    const atRiskCount = filteredProjects.filter(isProjectAtRisk).length;
    const averageProgress = totalCount
      ? clampPercent(filteredProjects.reduce((sum, project) => sum + project.completionPercent, 0) / totalCount)
      : 0;
    const activeRate = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
    const completionRate = linkedTaskCount > 0 ? (completedTaskCount / linkedTaskCount) * 100 : averageProgress;
    const timelinessRate =
      linkedTaskCount > 0 ? ((linkedTaskCount - overdueTaskCount) / linkedTaskCount) * 100 : 100;
    const healthScore = totalCount
      ? clampPercent(
          averageProgress * 0.4 +
            activeRate * 0.2 +
            completionRate * 0.2 +
            Math.max(0, timelinessRate) * 0.2,
        )
      : 0;

    return {
      activeCount,
      atRiskCount,
      auditedTaskCount,
      averageProgress,
      cancelledCount,
      completedCount,
      completedTaskCount,
      healthScore,
      linkedTaskCount,
      openTaskCount,
      overdueTaskCount,
      pausedCount,
      totalCount,
    };
  }, [filteredProjects]);

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const tableColumnCount = visibleColumns.length + fixedColumns.length;
  const tableMinWidth = Math.max(1280, visibleColumns.length * 170 + 340);
  const selectedProject = selectedProjectId != null ? projects.find((project) => project.id === selectedProjectId) ?? null : null;
  const headquarterUnitIds = useMemo(
    () => new Set(catalogUnits.filter((unit) => isHeadquarterUnitName(unit.name)).map((unit) => unit.id)),
    [catalogUnits],
  );
  const businessOptionsForProject = useCallback(
    (unitId: number | null) => catalogBusinesses.filter((business) => businessMatchesUnit(business, unitId)),
    [catalogBusinesses],
  );
  const ownerOptionsForProject = useCallback(
    (unitId: number | null, businessId: number | null) =>
      catalogCollaborators.filter((collaborator) =>
        collaboratorCanOwnScopedRecord(collaborator, unitId, businessId, headquarterUnitIds, catalogBusinesses),
      ),
    [catalogBusinesses, catalogCollaborators, headquarterUnitIds],
  );

  const setProjectPendingState = (projectId: number, isPending: boolean) => {
    setPendingProjectIds((currentIds) =>
      isPending
        ? currentIds.includes(projectId)
          ? currentIds
          : [...currentIds, projectId]
        : currentIds.filter((currentId) => currentId !== projectId),
    );
  };

  const isProjectPending = (projectId: number) => pendingProjectIds.includes(projectId);

  const resetForm = () => {
    setForm(createDefaultProjectForm());
    setEditingProjectId(null);
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (project: ProjectRecord) => {
    setDialogMode('edit');
    setEditingProjectId(project.id);
    setForm(toProjectFormValues(project));
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }

    setIsDialogOpen(open);
  };

  const handleSort = (columnId: ProjectColumnId) => {
    setSortState((currentState) =>
      currentState.columnId === columnId
        ? {
            columnId,
            direction: currentState.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            columnId,
            direction: 'asc',
          },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingProject(true);
    setProjectsError(null);

    try {
      const payload = buildProjectPayload(form, projectCopy);

      if (dialogMode === 'edit' && editingProjectId !== null) {
        const updatedProject = await updateProject(editingProjectId, payload);
        setProjects((currentProjects) =>
          currentProjects.map((project) => (project.id === editingProjectId ? updatedProject : project)),
        );
      } else {
        const createdProject = await createProject(payload);
        setProjects((currentProjects) => [createdProject, ...currentProjects]);
        setSelectedProjectId(createdProject.id);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setProjectsError(getErrorMessage(error, projectCopy.messages.saveProject));
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const persistProjectChange = async (project: ProjectRecord, patch: Partial<ProjectPayload>) => {
    if ('name' in patch && !patch.name?.trim()) {
      setProjectsError(projectCopy.messages.nameRequired);
      return;
    }

    setProjectPendingState(project.id, true);
    setProjectsError(null);

    try {
      const updatedProject = await updateProject(project.id, buildProjectPayloadFromRecord(project, patch));
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) => (currentProject.id === project.id ? updatedProject : currentProject)),
      );
    } catch (error) {
      setProjectsError(getErrorMessage(error, projectCopy.messages.updateProject));
    } finally {
      setProjectPendingState(project.id, false);
    }
  };

  const scopeOwnerPatch = (
    project: ProjectRecord,
    unitId: number | null,
    businessId: number | null,
  ): Partial<ProjectPayload> => {
    if (project.ownerUserCompanyId == null) {
      return {};
    }

    const currentOwner = catalogCollaborators.find(
      (collaborator) => collaborator.userCompanyId === project.ownerUserCompanyId,
    );

    if (
      !currentOwner ||
      collaboratorCanOwnScopedRecord(currentOwner, unitId, businessId, headquarterUnitIds, catalogBusinesses)
    ) {
      return {};
    }

    return {
      ownerUserCompanyId: null,
      ownerName: null,
    };
  };

  const handleProjectUnitChange = (project: ProjectRecord, value: string) => {
    const nextUnitId = value === NO_UNIT_VALUE ? null : Number(value);
    const normalizedUnitId = Number.isFinite(nextUnitId) ? nextUnitId : null;
    const currentBusiness =
      project.businessId != null
        ? catalogBusinesses.find((business) => business.id === project.businessId)
        : undefined;
    const nextBusinessId =
      currentBusiness && businessMatchesUnit(currentBusiness, normalizedUnitId) ? project.businessId : null;

    void persistProjectChange(project, {
      unitId: normalizedUnitId,
      businessId: nextBusinessId,
      ...scopeOwnerPatch(project, normalizedUnitId, nextBusinessId),
    });
  };

  const handleProjectBusinessChange = (project: ProjectRecord, value: string) => {
    const selectedBusiness =
      value === NO_BUSINESS_VALUE
        ? null
        : catalogBusinesses.find((business) => business.id === Number(value)) ?? null;
    const nextBusinessId = selectedBusiness?.id ?? null;
    const nextUnitId = selectedBusiness?.unitId ?? project.unitId ?? null;

    void persistProjectChange(project, {
      businessId: nextBusinessId,
      unitId: nextUnitId,
      ...scopeOwnerPatch(project, nextUnitId, nextBusinessId),
    });
  };

  const handleProjectOwnerChange = (project: ProjectRecord, value: string) => {
    if (value === UNASSIGNED_OWNER_VALUE) {
      void persistProjectChange(project, {
        ownerUserCompanyId: null,
        ownerName: null,
      });
      return;
    }

    const selectedOwner = catalogCollaborators.find(
      (collaborator) => collaborator.userCompanyId === Number(value),
    );

    if (!selectedOwner) {
      return;
    }

    void persistProjectChange(project, {
      ownerUserCompanyId: selectedOwner.userCompanyId,
      ownerName: selectedOwner.name,
      unitId: project.unitId ?? selectedOwner.unitId ?? null,
      businessId: project.businessId ?? selectedOwner.businessId ?? null,
    });
  };

  const handleComplete = async (project: ProjectRecord) => {
    setProjectPendingState(project.id, true);
    setProjectsError(null);

    try {
      const updatedProject = await completeProject(project.id);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) => (currentProject.id === project.id ? updatedProject : currentProject)),
      );
    } catch (error) {
      setProjectsError(getErrorMessage(error, projectCopy.messages.completeProject));
    } finally {
      setProjectPendingState(project.id, false);
    }
  };

  const handleCancel = (project: ProjectRecord) => {
    setConfirmation({ type: 'cancel', project });
  };

  const handleDelete = (project: ProjectRecord) => {
    setConfirmation({ type: 'delete', project });
  };

  const handleConfirmAction = async () => {
    if (!confirmation) {
      return;
    }

    const { project, type } = confirmation;
    setProjectPendingState(project.id, true);
    setProjectsError(null);

    try {
      if (type === 'cancel') {
        const updatedProject = await cancelProject(project.id);
        setProjects((currentProjects) =>
          currentProjects.map((currentProject) => (currentProject.id === project.id ? updatedProject : currentProject)),
        );
      } else {
        await deleteProject(project.id);
        setProjects((currentProjects) => currentProjects.filter((currentProject) => currentProject.id !== project.id));
        if (selectedProjectId === project.id) {
          setSelectedProjectId(null);
        }
      }

      setConfirmation(null);
    } catch (error) {
      setProjectsError(
        getErrorMessage(
          error,
          type === 'cancel' ? projectCopy.messages.cancelProject : projectCopy.messages.deleteProject,
        ),
      );
    } finally {
      setProjectPendingState(project.id, false);
    }
  };

  const renderProjectActions = (project: ProjectRecord) => {
    const pending = isProjectPending(project.id);
    const isSelected = selectedProjectId === project.id;

    return (
      <div className="flex w-full min-w-[265px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
        <ProjectActionButton
          label={isSelected ? projectCopy.actions.closeTasks : projectCopy.actions.openTasks}
          onClick={() => setSelectedProjectId(isSelected ? null : project.id)}
          disabled={pending}
          className={cn(
            'border-[#F4C84A]/35 bg-[#F4C84A]/10 text-[#9A6B05] hover:bg-[#F4C84A] hover:text-slate-950 dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]',
            isSelected && 'bg-[#F4C84A] text-slate-950',
          )}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <ProjectActionButton
          label={projectCopy.actions.edit}
          onClick={() => openEditDialog(project)}
          disabled={pending}
          className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15 dark:border-[#2563EB]/40 dark:bg-[#2563EB]/15 dark:text-blue-200"
          icon={<Pencil className="h-4 w-4" />}
        />
        <ProjectActionButton
          label={projectCopy.actions.complete}
          onClick={() => {
            void handleComplete(project);
          }}
          disabled={pending || project.status === 'completed' || project.status === 'cancelled'}
          className="border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177D66] hover:bg-[#59C3A5]/20 dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15 dark:text-emerald-200"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <ProjectActionButton
          label={projectCopy.actions.cancel}
          onClick={() => handleCancel(project)}
          disabled={pending || project.status === 'cancelled'}
          className="border-[#F4C84A]/40 bg-[#F4C84A]/15 text-[#9A6B05] hover:bg-[#F4C84A]/25 dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]"
          icon={<CircleSlash className="h-4 w-4" />}
        />
        <ProjectActionButton
          label={projectCopy.actions.delete}
          onClick={() => handleDelete(project)}
          disabled={pending}
          className="border-[#FF2D5E]/30 bg-[#FF2D5E]/10 text-[#C60037] hover:bg-[#FF2D5E]/20 dark:border-[#FF2D5E]/45 dark:bg-[#FF2D5E]/15 dark:text-pink-200"
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>
    );
  };

  const renderProjectCell = (project: ProjectRecord, columnId: ProjectColumnId): ReactNode => {
    switch (columnId) {
      case 'folio':
        return <div className="text-sm font-semibold text-slate-900 dark:text-white">{project.folio}</div>;
      case 'name':
        return (
          <div className="min-w-[280px] space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">{project.name}</p>
            {project.description ? (
              <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{project.description}</p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">{projectCopy.common.noDescription}</p>
            )}
          </div>
        );
      case 'unit':
        {
          const unitSelectValue = project.unitId != null ? String(project.unitId) : NO_UNIT_VALUE;
          const currentUnitMissing = project.unitId != null && !catalogUnits.some((unit) => unit.id === project.unitId);

          return (
            <Select
              value={unitSelectValue}
              disabled={isProjectPending(project.id)}
              onValueChange={(value) => handleProjectUnitChange(project, value)}
            >
              <SelectTrigger className="h-10 min-w-[170px] rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_UNIT_VALUE}>{projectCopy.common.noUnit}</SelectItem>
                {currentUnitMissing ? (
                  <SelectItem value={String(project.unitId)}>
                    {project.unitName ?? `${projectCopy.form.labels.unit} #${project.unitId}`}
                  </SelectItem>
                ) : null}
                {catalogUnits.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
      case 'business':
        {
          const businessSelectValue = project.businessId != null ? String(project.businessId) : NO_BUSINESS_VALUE;
          const rowBusinessOptions = businessOptionsForProject(project.unitId);
          const currentBusinessMissing =
            project.businessId != null && !rowBusinessOptions.some((business) => business.id === project.businessId);

          return (
            <Select
              value={businessSelectValue}
              disabled={isProjectPending(project.id)}
              onValueChange={(value) => handleProjectBusinessChange(project, value)}
            >
              <SelectTrigger className="h-10 min-w-[190px] rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BUSINESS_VALUE}>{projectCopy.common.noBusiness}</SelectItem>
                {currentBusinessMissing ? (
                  <SelectItem value={String(project.businessId)}>
                    {project.businessName ?? `${projectCopy.form.labels.business} #${project.businessId}`}
                  </SelectItem>
                ) : null}
                {rowBusinessOptions.map((business) => (
                  <SelectItem key={business.id} value={String(business.id)}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
      case 'owner':
        {
          const ownerSelectValue =
            project.ownerUserCompanyId != null ? String(project.ownerUserCompanyId) : UNASSIGNED_OWNER_VALUE;
          const rowOwnerOptions = ownerOptionsForProject(project.unitId, project.businessId);
          const currentOwnerMissing =
            project.ownerUserCompanyId != null &&
            !rowOwnerOptions.some((owner) => owner.userCompanyId === project.ownerUserCompanyId);

          return (
            <Select
              value={ownerSelectValue}
              disabled={isProjectPending(project.id)}
              onValueChange={(value) => handleProjectOwnerChange(project, value)}
            >
              <SelectTrigger className="h-10 min-w-[220px] rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_OWNER_VALUE}>{projectCopy.common.noResponsible}</SelectItem>
                {currentOwnerMissing ? (
                  <SelectItem value={String(project.ownerUserCompanyId)}>
                    {project.ownerName ?? `${projectCopy.form.labels.owner} #${project.ownerUserCompanyId}`}
                  </SelectItem>
                ) : null}
                {rowOwnerOptions.map((owner) => (
                  <SelectItem key={owner.userCompanyId} value={String(owner.userCompanyId)}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
      case 'status':
        return (
          <div className="flex min-w-[160px] flex-col items-start gap-2">
            <Select
              value={project.status}
              disabled={isProjectPending(project.id)}
              onValueChange={(value) => void persistProjectChange(project, { status: value as ProjectStatus })}
            >
              <SelectTrigger className={cn('h-10 rounded-lg border text-sm font-semibold shadow-none focus:ring-[#F4C84A]/20', statusClasses[project.status])}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectStatusValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {projectCopy.statuses[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProjectAtRisk(project) ? (
              <Badge variant="outline" className="rounded-full border-[#FF2D5E]/30 bg-[#FF2D5E]/10 px-3 py-1 font-semibold text-[#C60037] dark:border-[#FF2D5E]/45 dark:bg-[#FF2D5E]/15 dark:text-pink-200">
                {projectCopy.common.atRisk}
              </Badge>
            ) : null}
          </div>
        );
      case 'priority':
        return (
          <Select
            value={project.priority ?? NO_PRIORITY_VALUE}
            disabled={isProjectPending(project.id)}
            onValueChange={(value) =>
              void persistProjectChange(project, {
                priority: value === NO_PRIORITY_VALUE ? null : (value as ProjectPriority),
              })
            }
          >
            <SelectTrigger
              className={cn(
                'h-10 min-w-[140px] rounded-lg border bg-white text-sm font-semibold shadow-none focus:ring-[#F4C84A]/20 dark:bg-slate-700',
                project.priority
                  ? priorityClasses[project.priority]
                  : 'border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-300',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PRIORITY_VALUE}>{projectCopy.priorities.none}</SelectItem>
              {projectPriorityValues.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {projectCopy.priorities[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'startDate':
        return (
          <Input
            type="date"
            value={project.startDate ?? ''}
            disabled={isProjectPending(project.id)}
            className="h-10 min-w-[150px] rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            onChange={(event) => void persistProjectChange(project, { startDate: event.target.value || null })}
          />
        );
      case 'dueDate':
        return (
          <Input
            type="date"
            value={project.dueDate ?? ''}
            disabled={isProjectPending(project.id)}
            className="h-10 min-w-[150px] rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            onChange={(event) => void persistProjectChange(project, { dueDate: event.target.value || null })}
          />
        );
      case 'progress':
        return (
          <div className="min-w-[180px] space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{projectCopy.table.progress}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{clampPercent(project.completionPercent)}%</span>
            </div>
            <div className={progressTrackClass}>
              <div className="h-full rounded-full bg-[#F4C84A]" style={{ width: `${clampPercent(project.completionPercent)}%` }} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {project.completedTaskCount} {projectCopy.table.taskCounts.closed.toLowerCase()} / {project.openTaskCount}{' '}
              {projectCopy.table.taskCounts.open.toLowerCase()}
            </p>
          </div>
        );
      case 'tasks':
        return (
          <div className="min-w-[170px] space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              <ListChecks className="h-4 w-4" />
              {project.taskCount}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{projectCopy.table.taskCounts.open} {project.openTaskCount}</span>
              <span>{projectCopy.table.taskCounts.closed} {project.completedTaskCount}</span>
              {project.overdueTaskCount > 0 ? <span className="text-[#C60037] dark:text-pink-200">{projectCopy.table.taskCounts.overdue} {project.overdueTaskCount}</span> : null}
              {project.auditedTaskCount > 0 ? <span>{projectCopy.table.taskCounts.audited} {project.auditedTaskCount}</span> : null}
            </div>
          </div>
        );
      case 'updated':
        return <div className="min-w-[170px] text-sm text-slate-700 dark:text-slate-200">{formatDate(project.updatedAt, true, projectCopy.common.noDate)}</div>;
    }
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 p-6 shadow-sm dark:border-[#F4C84A]/45 dark:bg-[#F4C84A]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <span className="text-2xl leading-none" aria-hidden="true">{headerCopy.emoji}</span>
              {headerCopy.title}
            </h2>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {headerCopy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-lg border-[#F4C84A]/25 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:bg-[#F4C84A]/10 dark:border-[#F4C84A]/40 dark:bg-slate-800 dark:text-[#FEF3C7]"
              onClick={() => setIsColumnsModalOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              {headerCopy.actions.columns}
            </Button>
            <Button className="h-10 gap-2 rounded-lg bg-[#F4C84A] px-4 text-sm font-semibold text-slate-950 shadow-sm shadow-[#F4C84A]/20 hover:bg-[#E5B835]" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              {headerCopy.actions.create}
            </Button>
          </div>
        </div>
      </section>

      {projectsError ? (
        <section className="mb-6 rounded-lg border border-[#FF2D5E]/30 bg-[#FF2D5E]/10 px-5 py-4 text-sm text-[#C60037] dark:border-[#FF2D5E]/45 dark:bg-[#FF2D5E]/15 dark:text-pink-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{projectsError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg border-[#FF2D5E]/30 bg-white px-4 text-[#C60037] shadow-none hover:bg-[#FF2D5E]/10 dark:border-[#FF2D5E]/45 dark:bg-slate-800 dark:text-pink-200"
              onClick={() => {
                void loadProjects();
              }}
            >
              {projectCopy.common.retry}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-5 text-base font-bold text-slate-800 dark:text-white">{projectCopy.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 xl:col-span-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{projectCopy.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={projectCopy.filters.searchPlaceholder}
                className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{projectCopy.filters.unit}</label>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{projectCopy.common.all}</SelectItem>
                {unitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{projectCopy.filters.business}</label>
            <Select value={businessFilter} onValueChange={setBusinessFilter}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{projectCopy.common.all}</SelectItem>
                {businessOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{projectCopy.filters.owner}</label>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{projectCopy.common.all}</SelectItem>
                {ownerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{projectCopy.filters.status}</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{projectCopy.common.all}</SelectItem>
                {projectStatusValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {projectCopy.statuses[value]}
                  </SelectItem>
                ))}
                <SelectItem value="at-risk">{projectCopy.statuses.atRisk}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <ProjectKpiStrip copy={projectCopy.kpis} isLoading={isLoadingProjects} metrics={metrics} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table style={{ minWidth: tableMinWidth }}>
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-700">
                {visibleColumns.map((column) => (
                  <SortableTableHead key={column.id} column={column} sortState={sortState} onSort={handleSort} />
                ))}
                <TableHead className="px-5 py-5">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{projectCopy.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((project) => (
                <TableRow key={project.id} className={cn('border-slate-200 dark:border-slate-700', selectedProjectId === project.id && 'bg-[#F4C84A]/5')}>
                  {visibleColumns.map((column) => {
                    const columnId = column.id as ProjectColumnId;

                    return (
                      <TableCell key={`${project.id}-${column.id}`} className="px-5 py-5 align-middle">
                        {renderProjectCell(project, columnId)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="px-5 py-5 align-middle">{renderProjectActions(project)}</TableCell>
                </TableRow>
              ))}

              {isLoadingProjects ? (
                <TableRow>
                  <TableCell colSpan={tableColumnCount} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                    {projectCopy.table.loading}
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoadingProjects && sortedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColumnCount} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                    {projectCopy.table.empty}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>

      {selectedProject ? (
        <ProjectTasksWorkspace
          copy={projectCopy.workspace}
          project={selectedProject}
          projects={projects}
          processes={processes}
          unitOptions={catalogUnits}
          businessOptions={catalogBusinesses}
          collaboratorOptions={catalogCollaborators}
          onClose={() => setSelectedProjectId(null)}
          onProjectChanged={loadProjects}
        />
      ) : null}

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        defaultColumns={defaultColumns}
        fixedColumns={fixedColumns}
        theme="processes"
        onSave={setColumns}
      />

      <ProjectFormDialog
        copy={projectCopy}
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        onSubmit={handleSubmit}
        form={form}
        isSubmitting={isSubmittingProject}
        setForm={setForm}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        collaboratorOptions={catalogCollaborators}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(confirmation)}
        title={confirmation?.type === 'cancel' ? projectCopy.confirmation.cancelTitle : projectCopy.confirmation.deleteTitle}
        itemName={confirmation?.project.name}
        description={
          confirmation?.type === 'cancel'
            ? projectCopy.confirmation.cancelDescription
            : projectCopy.confirmation.deleteDescription
        }
        confirmLabel={confirmation?.type === 'cancel' ? projectCopy.confirmation.cancelConfirm : projectCopy.confirmation.deleteConfirm}
        cancelLabel={projectCopy.common.cancel}
        confirmDisabled={confirmation ? isProjectPending(confirmation.project.id) : false}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          void handleConfirmAction();
        }}
      />
    </>
  );
}
