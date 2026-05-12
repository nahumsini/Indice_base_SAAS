import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarPlus,
  CheckCircle2,
  Columns3,
  Copy,
  Eye,
  Gauge,
  ListChecks,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Timer,
  Trash2,
} from 'lucide-react';
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
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../components/ui/utils';
import {
  accentButtonClass,
  cloneRecurrenceConfig,
  createDefaultProcessForm,
  frequencyOptions,
  normalizeRecurrenceConfig,
} from './processesData';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { createProcess, deleteProcess, listProcesses, materializeProcess, updateProcess } from './processesApi';
import { ProcessFormDialog } from './components/ProcessFormDialog';
import { useProcessesTranslations, type ProcessesTranslations } from './translations';
import type {
  Option,
  ProcessBusinessOption,
  ProcessColumnConfig,
  ProcessColumnId,
  ProcessCollaboratorOption,
  ProcessFormState,
  ProcessFrequency,
  ProcessPriority,
  ProcessRecord,
  ProcessSortState,
  ProcessUnitOption,
} from './types';

type FrequencyFilter = 'all' | ProcessFrequency;
type CollaboratorFilter = 'all' | string;
type BusinessFilter = 'all' | string;
type UnitFilter = 'all' | string;
type ProcessConfirmation = { type: 'delete'; record: ProcessRecord };

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors';
const progressTrackClass = 'h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700';
const NO_UNIT_VALUE = '__no_unit__';
const NO_BUSINESS_VALUE = '__no_business__';
const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';
const processColumnsStorageKey = 'processes-tasks-processes-columns-v1';
const processPriorityValues: ProcessPriority[] = ['high', 'medium', 'low'];

const prioritySelectClasses: Record<ProcessPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  medium:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

function createProcessColumns(copy: ProcessesTranslations['columns']): ProcessColumnConfig[] {
  return [
    { id: 'folio', label: copy.folio.label, visible: true, locked: true, description: copy.folio.description },
    { id: 'unit', label: copy.unit.label, visible: true, description: copy.unit.description },
    { id: 'business', label: copy.business.label, visible: true, description: copy.business.description },
    { id: 'title', label: copy.title.label, visible: true, description: copy.title.description },
    { id: 'description', label: copy.description.label, visible: true, description: copy.description.description },
    { id: 'template', label: copy.template.label, visible: true, description: copy.template.description },
    { id: 'createdAt', label: copy.createdAt.label, visible: true, description: copy.createdAt.description },
    { id: 'frequency', label: copy.frequency.label, visible: true, description: copy.frequency.description },
    { id: 'nextOccurrence', label: copy.nextOccurrence.label, visible: true, description: copy.nextOccurrence.description },
    { id: 'generatedUntil', label: copy.generatedUntil.label, visible: false, description: copy.generatedUntil.description },
    { id: 'progress', label: copy.progress.label, visible: true, description: copy.progress.description },
    { id: 'tasks', label: copy.tasks.label, visible: true, description: copy.tasks.description },
    { id: 'creator', label: copy.creator.label, visible: true, description: copy.creator.description },
    { id: 'responsible', label: copy.responsible.label, visible: true, description: copy.responsible.description },
    { id: 'priority', label: copy.priority.label, visible: true, description: copy.priority.description },
  ];
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isProcessAtRisk(record: ProcessRecord) {
  return record.isActive && record.overdueTaskCount > 0;
}

interface ProcessKpiMetrics {
  activeCount: number;
  auditedTaskCount: number;
  averageProgress: number;
  completedTaskCount: number;
  healthScore: number;
  inactiveCount: number;
  linkedTaskCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  totalCount: number;
}

interface ProcessKpiMetricProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}

interface ProcessStatusSegment {
  className: string;
  count: number;
  label: string;
}

function segmentWidth(count: number, total: number) {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
}

function ProcessKpiMetric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: ProcessKpiMetricProps) {
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

function ProcessStatusBar({ segments }: { segments: ProcessStatusSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
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

function buildProcessInsight(metrics: ProcessKpiMetrics, copy: ProcessesTranslations['kpis']['insights']) {
  if (metrics.totalCount === 0) {
    return copy.empty;
  }

  if (metrics.overdueTaskCount > 0) {
    return copy.overdue(metrics.overdueTaskCount, metrics.averageProgress, metrics.openTaskCount);
  }

  if (metrics.inactiveCount > 0) {
    return copy.paused(metrics.inactiveCount, metrics.openTaskCount, metrics.healthScore);
  }

  if (metrics.healthScore >= 85) {
    return copy.healthy(metrics.activeCount, metrics.completedTaskCount, metrics.healthScore);
  }

  return copy.default(metrics.healthScore, metrics.activeCount, metrics.averageProgress);
}

function ProcessKpiStrip({
  copy,
  isLoading,
  metrics,
}: {
  copy: ProcessesTranslations['kpis'];
  isLoading: boolean;
  metrics: ProcessKpiMetrics;
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

  const statusSegments: ProcessStatusSegment[] = [
    {
      className: 'bg-blue-500',
      count: metrics.activeCount,
      label: copy.segments.active,
    },
    {
      className: 'bg-slate-400',
      count: metrics.inactiveCount,
      label: copy.segments.paused,
    },
    {
      className: 'bg-emerald-500',
      count: metrics.completedTaskCount,
      label: copy.segments.closedTasks,
    },
    {
      className: 'bg-violet-500',
      count: metrics.auditedTaskCount,
      label: copy.segments.audited,
    },
    {
      className: 'bg-rose-500',
      count: metrics.overdueTaskCount,
      label: copy.segments.overdue,
    },
  ];

  const healthTone =
    metrics.healthScore >= 85
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
      : metrics.healthScore >= 65
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300';

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ProcessKpiMetric icon={<Eye className="h-4 w-4" />} label={copy.labels.visible} value={metrics.totalCount} />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProcessKpiMetric
            icon={<PlayCircle className="h-4 w-4" />}
            label={copy.labels.active}
            value={metrics.activeCount}
            valueClassName="text-blue-600 dark:text-blue-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProcessKpiMetric
            icon={<Timer className="h-4 w-4" />}
            label={copy.labels.open}
            value={metrics.openTaskCount}
            valueClassName="text-slate-900 dark:text-white"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProcessKpiMetric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={copy.labels.closed}
            value={metrics.completedTaskCount}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProcessKpiMetric
            icon={<AlertTriangle className="h-4 w-4" />}
            label={copy.labels.overdue}
            value={metrics.overdueTaskCount}
            valueClassName="text-rose-600 dark:text-rose-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProcessKpiMetric
            icon={<ListChecks className="h-4 w-4" />}
            label={copy.labels.averageProgress}
            value={`${metrics.averageProgress}%`}
            valueClassName="text-[rgb(235,165,52)]"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <ProcessKpiMetric
            icon={<Gauge className="h-4 w-4" />}
            label={copy.labels.tasks}
            value={metrics.linkedTaskCount}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {metrics.overdueTaskCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              {copy.badges.overdue(metrics.overdueTaskCount)}
            </span>
          ) : null}
          {metrics.inactiveCount > 0 ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              {copy.badges.paused(metrics.inactiveCount)}
            </span>
          ) : null}
          <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', healthTone)}>
            {copy.badges.health(metrics.healthScore)}
          </span>
        </div>
      </div>

      <ProcessStatusBar segments={statusSegments} />

      <div className="rounded-lg border border-[rgb(235,165,52)]/20 bg-[rgb(235,165,52)]/10 px-4 py-3 dark:border-[rgb(235,165,52)]/30 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(235,165,52)]" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{buildProcessInsight(metrics, copy.insights)}</p>
        </div>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatOptionalDate(date: string | null | undefined, fallback: string) {
  return date ? formatDate(date) : fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function compactText(value?: string | null) {
  return value?.trim() ?? '';
}

function toProcessFormState(record: ProcessRecord): ProcessFormState {
  return {
    unitId: record.unitId ?? null,
    unit: record.unit,
    businessId: record.businessId ?? null,
    business: record.business,
    title: record.title,
    description: record.description,
    taskTitleTemplate: record.taskTitleTemplate ?? record.title,
    taskDescriptionTemplate: record.taskDescriptionTemplate ?? record.description,
    taskNotesTemplate: record.taskNotesTemplate ?? '',
    frequency: record.frequency,
    responsibleUserCompanyId: record.responsibleUserCompanyId ?? null,
    responsible: record.responsible,
    priority: record.priority,
    recurrence: cloneRecurrenceConfig(record.recurrence),
    startDate: record.startDate ?? '',
    endDate: record.endDate ?? '',
    graceDays: String(record.graceDays ?? 0),
    generationWindowDays: String(record.generationWindowDays ?? 45),
    evidenceRequired: Boolean(record.evidenceRequired),
  };
}

function normalizeUnitOption(unit: BackendUnit): ProcessUnitOption {
  return {
    id: unit.id,
    name: compactText(unit.name),
  };
}

function normalizeBusinessOption(business: BackendBusiness): ProcessBusinessOption {
  return {
    id: business.id,
    name: compactText(business.name),
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
    businessId: user.business_id ?? null,
  };
}

function isHeadquarterUnitName(name?: string | null) {
  const normalized = compactText(name).toLowerCase().replace(/\s+/g, ' ');
  return normalized === 'headquarter' || normalized === 'headquarters' || normalized === 'headquater';
}

function collaboratorMatchesScope(
  collaborator: ProcessCollaboratorOption,
  unitId?: number | null,
  businessId?: number | null,
) {
  if (businessId != null) {
    return collaborator.businessId === businessId;
  }

  if (unitId != null) {
    return collaborator.unitId === unitId;
  }

  return true;
}

function collaboratorCanReceiveAssignment(
  collaborator: ProcessCollaboratorOption,
  unitId: number | null | undefined,
  businessId: number | null | undefined,
  headquarterUnitIds: ReadonlySet<number>,
) {
  if (collaborator.unitId != null && headquarterUnitIds.has(collaborator.unitId)) {
    return true;
  }

  return collaboratorMatchesScope(collaborator, unitId, businessId);
}

function responsibleStillMatchesScope(
  collaborators: ProcessCollaboratorOption[],
  responsibleUserCompanyId: number | null | undefined,
  unitId?: number | null,
  businessId?: number | null,
  headquarterUnitIds: ReadonlySet<number> = new Set(),
) {
  if (responsibleUserCompanyId == null) {
    return true;
  }

  const responsible = collaborators.find(
    (collaborator) => collaborator.userCompanyId === responsibleUserCompanyId,
  );

  return !responsible || collaboratorCanReceiveAssignment(responsible, unitId, businessId, headquarterUnitIds);
}

function createDefaultProcessFormFromCatalog(
  unitOptions: ProcessUnitOption[],
  businessOptions: ProcessBusinessOption[],
  collaboratorOptions: ProcessCollaboratorOption[],
  fallbackUnitNames: string[],
  fallbackBusinessNames: string[],
  fallbackCollaboratorNames: string[],
): ProcessFormState {
  const headquarterUnitIds = new Set(
    unitOptions.filter((unit) => isHeadquarterUnitName(unit.name)).map((unit) => unit.id),
  );
  const firstUnit = unitOptions[0] ?? null;
  const firstBusiness =
    (firstUnit
      ? businessOptions.find((business) => business.unitId === firstUnit.id || business.unitId == null)
      : businessOptions[0]) ?? null;
  const defaultUnitId = firstUnit?.id ?? firstBusiness?.unitId ?? null;
  const defaultBusinessId = firstBusiness?.id ?? null;
  const firstCollaborator =
    collaboratorOptions.find((collaborator) =>
      collaboratorCanReceiveAssignment(collaborator, defaultUnitId, defaultBusinessId, headquarterUnitIds),
    ) ?? null;

  if (!firstUnit && !firstBusiness && !firstCollaborator) {
    return createDefaultProcessForm(fallbackUnitNames, fallbackBusinessNames, fallbackCollaboratorNames);
  }

  return {
    unitId: defaultUnitId,
    unit: firstUnit?.name ?? fallbackUnitNames[0] ?? '',
    businessId: defaultBusinessId,
    business: firstBusiness?.name ?? fallbackBusinessNames[0] ?? '',
    title: '',
    description: '',
    taskTitleTemplate: '',
    taskDescriptionTemplate: '',
    taskNotesTemplate: '',
    frequency: 'weekly',
    responsibleUserCompanyId: firstCollaborator?.userCompanyId ?? null,
    responsible: firstCollaborator?.name ?? fallbackCollaboratorNames[0] ?? '',
    priority: 'medium',
    recurrence: cloneRecurrenceConfig(createDefaultProcessForm([], [], []).recurrence),
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    graceDays: '0',
    generationWindowDays: '45',
    evidenceRequired: false,
  };
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Option<T>[];
  value: T;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InlineSelectField<T extends string>({
  value,
  options,
  onChange,
  className,
  renderValue,
  disabled,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
  renderValue?: (value: T) => ReactNode;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-10 min-w-[148px] rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
          className,
        )}
      >
        {renderValue ? renderValue(value) : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InlineTextCell({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const nextValue = draft.trim();
    if (nextValue === value) {
      return;
    }

    const didCommit = await onCommit(nextValue);
    if (!didCommit) {
      setDraft(value);
    }
  };

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void handleBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'h-10 min-w-[220px] rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400',
        className,
      )}
    />
  );
}

function InlineTextareaCell({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const nextValue = draft.trim();
    if (nextValue === value) {
      return;
    }

    const didCommit = await onCommit(nextValue);
    if (!didCommit) {
      setDraft(value);
    }
  };

  return (
    <Textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void handleBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

function ProcessActionButton({
  className,
  icon,
  label,
  onClick,
  disabled,
}: {
  className: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonBaseClass, className, disabled && 'cursor-not-allowed opacity-60')}
    >
      {icon}
    </button>
  );
}

function getInitialProcessColumns(defaultProcessColumns: ProcessColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultProcessColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(processColumnsStorageKey);
    if (!rawColumns) {
      return defaultProcessColumns;
    }

    const parsedColumns = JSON.parse(rawColumns) as Array<Partial<ProcessColumnConfig>>;
    const defaultColumnMap = new Map(defaultProcessColumns.map((column) => [column.id, column]));
    const restoredColumns = parsedColumns
      .map((column) => {
        if (!column?.id || !defaultColumnMap.has(column.id as ProcessColumnId)) {
          return null;
        }

        const baseColumn = defaultColumnMap.get(column.id as ProcessColumnId)!;
        return {
          ...baseColumn,
          visible: typeof column.visible === 'boolean' ? column.visible : baseColumn.visible,
        };
      })
      .filter((column): column is ProcessColumnConfig => column !== null);
    const missingColumns = defaultProcessColumns.filter(
      (column) => !restoredColumns.some((restoredColumn) => restoredColumn.id === column.id),
    );

    return restoredColumns.length > 0 ? [...restoredColumns, ...missingColumns] : defaultProcessColumns;
  } catch {
    return defaultProcessColumns;
  }
}

export default function Processes() {
  const processCopy = useProcessesTranslations();
  const headerCopy = processCopy.header;
  const localizedColumns = useMemo(() => createProcessColumns(processCopy.columns), [processCopy.columns]);
  const [records, setRecords] = useState<ProcessRecord[]>([]);
  const [catalogUnits, setCatalogUnits] = useState<ProcessUnitOption[]>([]);
  const [catalogBusinesses, setCatalogBusinesses] = useState<ProcessBusinessOption[]>([]);
  const [catalogCollaborators, setCatalogCollaborators] = useState<ProcessCollaboratorOption[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(true);
  const [processesError, setProcessesError] = useState<string | null>(null);
  const [isSubmittingProcess, setIsSubmittingProcess] = useState(false);
  const [pendingRecordIds, setPendingRecordIds] = useState<number[]>([]);
  const [columns, setColumns] = useState<ProcessColumnConfig[]>(() => getInitialProcessColumns(localizedColumns));
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');
  const [businessFilter, setBusinessFilter] = useState<BusinessFilter>('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<CollaboratorFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [processEditorOpen, setProcessEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<ProcessConfirmation | null>(null);
  const [sortState, setSortState] = useState<ProcessSortState>({
    columnId: 'createdAt',
    direction: 'desc',
  });

  const unitOptions = useMemo(
    () =>
      Array.from(
        new Set(catalogUnits.map((option) => option.name).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [catalogUnits],
  );
  const businessOptions = useMemo(
    () =>
      Array.from(
        new Set(catalogBusinesses.map((option) => option.name).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [catalogBusinesses],
  );
  const collaboratorOptions = useMemo(
    () =>
      Array.from(
        new Set(catalogCollaborators.map((option) => option.name).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [catalogCollaborators],
  );

  const [form, setForm] = useState<ProcessFormState>(() =>
    createDefaultProcessFormFromCatalog(
      catalogUnits,
      catalogBusinesses,
      catalogCollaborators,
      unitOptions,
      businessOptions,
      collaboratorOptions,
    ),
  );
  const headquarterUnitIds = useMemo(
    () => new Set(catalogUnits.filter((unit) => isHeadquarterUnitName(unit.name)).map((unit) => unit.id)),
    [catalogUnits],
  );

  const loadProcesses = async () => {
    setIsLoadingProcesses(true);
    setProcessesError(null);

    try {
      const items = await listProcesses();
      setRecords(items);
    } catch (error) {
      setProcessesError(getErrorMessage(error, processCopy.messages.loadProcesses));
      setRecords([]);
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [units, businesses, hrUsers] = await Promise.all([
        dashboardApi.listUnits(),
        dashboardApi.listBusinesses(),
        humanResourcesApi.listHrUsers(),
      ]);

      setCatalogUnits(
        units
          .map(normalizeUnitOption)
          .filter((option) => option.name.length > 0)
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setCatalogBusinesses(
        businesses
          .map(normalizeBusinessOption)
          .filter((option) => option.name.length > 0)
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setCatalogCollaborators(
        hrUsers.items
          .map(normalizeCollaboratorOption)
          .filter((option): option is ProcessCollaboratorOption => option !== null)
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
    } catch (error) {
      setProcessesError((currentError) =>
        currentError ?? getErrorMessage(error, processCopy.messages.loadCatalogs),
      );
    }
  };

  useEffect(() => {
    void loadProcesses();
    void loadCatalogs();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(processColumnsStorageKey, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const localizedColumnMap = new Map(localizedColumns.map((column) => [column.id, column]));
    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        const localizedColumn = localizedColumnMap.get(column.id);

        return localizedColumn
          ? {
              ...localizedColumn,
              visible: column.visible,
            }
          : column;
      }),
    );
  }, [localizedColumns]);

  const visibleColumns = columns.filter((column) => column.visible);

  const localizedUnitOptions: Option<UnitFilter>[] = [
    { value: 'all', label: processCopy.common.all },
    ...unitOptions.map((option) => ({ value: option, label: option })),
  ];
  const localizedBusinessOptions: Option<BusinessFilter>[] = [
    { value: 'all', label: processCopy.common.all },
    ...businessOptions.map((option) => ({ value: option, label: option })),
  ];
  const localizedCollaboratorOptions: Option<CollaboratorFilter>[] = [
    { value: 'all', label: processCopy.common.all },
    ...collaboratorOptions.map((option) => ({ value: option, label: option })),
  ];
  const localizedFrequencyOptions: Option<FrequencyFilter>[] = [
    { value: 'all', label: processCopy.common.allFemale },
    ...frequencyOptions.map((option) => ({ value: option.value, label: processCopy.frequencies[option.value] })),
  ];
  const inlineUnitOptions: Option<string>[] = [
    { value: NO_UNIT_VALUE, label: processCopy.common.noUnit },
    ...catalogUnits.map((option) => ({
      value: option.id.toString(),
      label: option.name,
    })),
  ];
  const filteredRecords = records.filter((record) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      record.folio.toLowerCase().includes(normalizedSearch) ||
      record.title.toLowerCase().includes(normalizedSearch) ||
      record.description.toLowerCase().includes(normalizedSearch) ||
      record.unit.toLowerCase().includes(normalizedSearch) ||
      record.business.toLowerCase().includes(normalizedSearch) ||
      record.creator.toLowerCase().includes(normalizedSearch) ||
      record.responsible.toLowerCase().includes(normalizedSearch);
    const matchesUnit = unitFilter === 'all' || record.unit === unitFilter;
    const matchesBusiness = businessFilter === 'all' || record.business === businessFilter;
    const matchesCollaborator =
      collaboratorFilter === 'all' || record.responsible === collaboratorFilter;
    const matchesFrequency = frequencyFilter === 'all' || record.frequency === frequencyFilter;

    return matchesSearch && matchesUnit && matchesBusiness && matchesCollaborator && matchesFrequency;
  });

  const getSortValue = (record: ProcessRecord, columnId: ProcessColumnId) => {
    switch (columnId) {
      case 'folio':
        return record.folio;
      case 'unit':
        return record.unit;
      case 'business':
        return record.business;
      case 'title':
        return record.title;
      case 'description':
        return record.description;
      case 'template':
        return `${record.taskTitleTemplate ?? record.title} ${record.taskDescriptionTemplate ?? record.description}`;
      case 'createdAt':
        return record.createdAt;
      case 'frequency':
        return `${processCopy.frequencies[record.frequency]} ${processCopy.describeFrequency(record.frequency, record.recurrence)}`;
      case 'nextOccurrence':
        return record.nextOccurrenceDate ?? '';
      case 'generatedUntil':
        return record.generatedUntilDate ?? '';
      case 'progress':
        return record.completionPercent;
      case 'tasks':
        return record.taskCount;
      case 'creator':
        return record.creator;
      case 'responsible':
        return record.responsible;
      case 'priority':
        return processCopy.priorities[record.priority];
      default:
        return '';
    }
  };

  const sortedRecords = [...filteredRecords].sort((leftRecord, rightRecord) => {
    const leftValue = getSortValue(leftRecord, sortState.columnId);
    const rightValue = getSortValue(rightRecord, sortState.columnId);

    const comparison =
      typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
        : leftValue > rightValue
          ? 1
          : leftValue < rightValue
            ? -1
            : 0;

    return sortState.direction === 'asc' ? comparison : comparison * -1;
  });

  const activeCount = filteredRecords.filter((record) => record.isActive).length;
  const inactiveCount = filteredRecords.filter((record) => !record.isActive).length;
  const linkedTaskCount = filteredRecords.reduce((sum, record) => sum + record.taskCount, 0);
  const openTaskCount = filteredRecords.reduce((sum, record) => sum + record.openTaskCount, 0);
  const completedTaskCount = filteredRecords.reduce((sum, record) => sum + record.completedTaskCount, 0);
  const overdueTaskCount = filteredRecords.reduce((sum, record) => sum + record.overdueTaskCount, 0);
  const auditedTaskCount = filteredRecords.reduce((sum, record) => sum + record.auditedTaskCount, 0);
  const averageProgress = filteredRecords.length
    ? clampPercent(filteredRecords.reduce((sum, record) => sum + record.completionPercent, 0) / filteredRecords.length)
    : 0;
  const activeRate = filteredRecords.length > 0 ? (activeCount / filteredRecords.length) * 100 : 0;
  const completionRate = linkedTaskCount > 0 ? (completedTaskCount / linkedTaskCount) * 100 : 0;
  const timelinessRate = linkedTaskCount > 0 ? ((linkedTaskCount - overdueTaskCount) / linkedTaskCount) * 100 : 0;
  const healthScore = filteredRecords.length
    ? clampPercent(
        averageProgress * 0.4 +
          activeRate * 0.2 +
          completionRate * 0.2 +
          Math.max(0, timelinessRate) * 0.2,
      )
    : 0;
  const processKpiMetrics: ProcessKpiMetrics = {
    activeCount,
    auditedTaskCount,
    averageProgress,
    completedTaskCount,
    healthScore,
    inactiveCount,
    linkedTaskCount,
    openTaskCount,
    overdueTaskCount,
    totalCount: filteredRecords.length,
  };

  const setRecordPendingState = (recordId: number, isPending: boolean) => {
    setPendingRecordIds((currentIds) =>
      isPending
        ? currentIds.includes(recordId)
          ? currentIds
          : [...currentIds, recordId]
        : currentIds.filter((currentId) => currentId !== recordId),
    );
  };

  const isRecordPending = (recordId: number) => pendingRecordIds.includes(recordId);

  const persistRecordChange = async (
    recordId: number,
    updater: (record: ProcessRecord) => ProcessRecord,
  ) => {
    let previousRecord: ProcessRecord | null = null;
    let nextRecord: ProcessRecord | null = null;

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== recordId) {
          return record;
        }

        previousRecord = record;
        nextRecord = updater(record);
        return nextRecord;
      }),
    );

    if (!previousRecord || !nextRecord) {
      return false;
    }

    const originalRecord: ProcessRecord = previousRecord;
    const updatedRecord: ProcessRecord = nextRecord;

    setRecordPendingState(recordId, true);
    setProcessesError(null);

    try {
      const savedRecord = await updateProcess(recordId, {
        ...toProcessFormState(updatedRecord),
        isActive: updatedRecord.isActive,
      });

      setRecords((currentRecords) =>
        currentRecords.map((record) => (record.id === recordId ? savedRecord : record)),
      );
      return true;
    } catch (error) {
      setRecords((currentRecords) =>
        currentRecords.map((record) => (record.id === recordId ? originalRecord : record)),
      );
      setProcessesError(getErrorMessage(error, processCopy.messages.saveChanges));
      return false;
    } finally {
      setRecordPendingState(recordId, false);
    }
  };

  const resetForm = () => {
    setForm(
      createDefaultProcessFormFromCatalog(
        catalogUnits,
        catalogBusinesses,
        catalogCollaborators,
        unitOptions,
        businessOptions,
        collaboratorOptions,
      ),
    );
    setEditingProcessId(null);
  };

  const openCreateDialog = () => {
    setEditorMode('create');
    resetForm();
    setProcessEditorOpen(true);
  };

  const openEditDialog = (record: ProcessRecord) => {
    setEditorMode('edit');
    setEditingProcessId(record.id);
    setForm(toProcessFormState(record));
    setProcessEditorOpen(true);
  };

  const handleSort = (columnId: ProcessColumnId) => {
    setSortState((currentSort) => ({
      columnId,
      direction:
        currentSort.columnId === columnId && currentSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleToggleActive = async (recordId: number) => {
    await persistRecordChange(recordId, (record) => ({
      ...record,
      isActive: !record.isActive,
    }));
  };

  const handleDelete = (record: ProcessRecord) => {
    setConfirmation({ type: 'delete', record });
  };

  const handleConfirmDelete = async () => {
    if (!confirmation) {
      return;
    }

    const { record } = confirmation;
    setRecordPendingState(record.id, true);
    setProcessesError(null);

    try {
      await deleteProcess(record.id);
      setRecords((currentRecords) => currentRecords.filter((currentRecord) => currentRecord.id !== record.id));
      setConfirmation(null);
    } catch (error) {
      setProcessesError(getErrorMessage(error, processCopy.messages.deleteProcess));
    } finally {
      setRecordPendingState(record.id, false);
    }
  };

  const handleDuplicate = async (record: ProcessRecord) => {
    setRecordPendingState(record.id, true);
    setProcessesError(null);

    try {
      const duplicatedRecord = await createProcess({
        ...toProcessFormState(record),
        title: processCopy.messages.copyPrefix(record.title),
        recurrence: cloneRecurrenceConfig(record.recurrence),
      });

      setRecords((currentRecords) => [duplicatedRecord, ...currentRecords]);
    } catch (error) {
      setProcessesError(getErrorMessage(error, processCopy.messages.duplicateProcess));
    } finally {
      setRecordPendingState(record.id, false);
    }
  };

  const handleMaterialize = async (record: ProcessRecord) => {
    setRecordPendingState(record.id, true);
    setProcessesError(null);

    try {
      const materializedRecord = await materializeProcess(record.id);
      setRecords((currentRecords) =>
        currentRecords.map((currentRecord) => (currentRecord.id === record.id ? materializedRecord : currentRecord)),
      );
    } catch (error) {
      setProcessesError(getErrorMessage(error, processCopy.messages.runEngine));
    } finally {
      setRecordPendingState(record.id, false);
    }
  };

  const handleInlineTextCommit = async (
    recordId: number,
    field: 'title' | 'description',
    nextValue: string,
  ) => {
    if (!nextValue) {
      setProcessesError(field === 'title' ? processCopy.messages.titleRequired : processCopy.messages.descriptionRequired);
      return false;
    }

    return persistRecordChange(recordId, (record) => ({
      ...record,
      [field]: nextValue,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      return;
    }

    const normalizedForm: ProcessFormState = {
      unitId: form.unitId ?? null,
      unit: form.unit,
      businessId: form.businessId ?? null,
      business: form.business,
      title: form.title.trim(),
      description: form.description.trim(),
      taskTitleTemplate: form.taskTitleTemplate.trim(),
      taskDescriptionTemplate: form.taskDescriptionTemplate.trim(),
      taskNotesTemplate: form.taskNotesTemplate.trim(),
      frequency: form.frequency,
      responsibleUserCompanyId: form.responsibleUserCompanyId ?? null,
      responsible: form.responsible,
      priority: form.priority,
      recurrence: normalizeRecurrenceConfig(form.frequency, form.recurrence),
      startDate: form.startDate,
      endDate: form.endDate,
      graceDays: form.graceDays,
      generationWindowDays: form.generationWindowDays,
      evidenceRequired: form.evidenceRequired,
    };

    setIsSubmittingProcess(true);
    setProcessesError(null);

    try {
      if (editorMode === 'edit' && editingProcessId !== null) {
        const existingRecord = records.find((record) => record.id === editingProcessId);
        const updatedRecord = await updateProcess(editingProcessId, {
          ...normalizedForm,
          isActive: existingRecord?.isActive ?? true,
        });

        setRecords((currentRecords) =>
          currentRecords.map((record) => (record.id === editingProcessId ? updatedRecord : record)),
        );
      } else {
        const createdRecord = await createProcess(normalizedForm);
        setRecords((currentRecords) => [createdRecord, ...currentRecords]);
      }

      setProcessEditorOpen(false);
      resetForm();
    } catch (error) {
      setProcessesError(getErrorMessage(error, processCopy.messages.saveProcess));
    } finally {
      setIsSubmittingProcess(false);
    }
  };

  const handleEditorOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }

    setProcessEditorOpen(open);
  };

  const renderCell = (record: ProcessRecord, columnId: ProcessColumnId) => {
    switch (columnId) {
      case 'folio':
        return <span className="text-sm font-semibold text-slate-900 dark:text-white">{record.folio}</span>;
      case 'unit':
        return (
          <InlineSelectField
            value={record.unitId != null ? record.unitId.toString() : NO_UNIT_VALUE}
            options={inlineUnitOptions}
            onChange={(nextValue) => {
              const selectedUnit =
                nextValue === NO_UNIT_VALUE
                  ? null
                  : catalogUnits.find((unit) => unit.id.toString() === nextValue) ?? null;

              void persistRecordChange(record.id, (currentRecord) => {
                const currentBusiness = catalogBusinesses.find(
                  (business) => business.id === currentRecord.businessId,
                );
                const nextUnitId = selectedUnit?.id ?? null;
                const businessBelongsToUnit =
                  Boolean(selectedUnit) &&
                  Boolean(currentBusiness) &&
                  (currentBusiness?.unitId == null || currentBusiness.unitId === nextUnitId);
                const nextBusinessId = businessBelongsToUnit ? currentRecord.businessId : null;
                const nextBusiness = businessBelongsToUnit ? currentRecord.business : '';
                const responsibleMatches = responsibleStillMatchesScope(
                  catalogCollaborators,
                  currentRecord.responsibleUserCompanyId,
                  nextUnitId,
                  nextBusinessId,
                  headquarterUnitIds,
                );

                return {
                  ...currentRecord,
                  unitId: nextUnitId,
                  unit: selectedUnit?.name ?? '',
                  businessId: nextBusinessId,
                  business: nextBusiness,
                  responsibleUserCompanyId: responsibleMatches
                    ? currentRecord.responsibleUserCompanyId
                    : null,
                  responsibleUserId: responsibleMatches ? currentRecord.responsibleUserId : null,
                  responsible: responsibleMatches ? currentRecord.responsible : '',
                };
              });
            }}
            renderValue={() => (
              <span className="truncate">{record.unit || processCopy.common.noUnit}</span>
            )}
            disabled={isRecordPending(record.id)}
          />
        );
      case 'business':
        {
          const scopedBusinessOptions: Option<string>[] = [
            { value: NO_BUSINESS_VALUE, label: processCopy.common.noBusiness },
            ...catalogBusinesses
              .filter((business) => record.unitId == null || business.unitId == null || business.unitId === record.unitId)
              .map((business) => ({
                value: business.id.toString(),
                label: business.name,
              })),
          ];

          return (
          <InlineSelectField
            value={record.businessId != null ? record.businessId.toString() : NO_BUSINESS_VALUE}
            options={scopedBusinessOptions}
            onChange={(nextValue) => {
              const selectedBusiness =
                nextValue === NO_BUSINESS_VALUE
                  ? null
                  : catalogBusinesses.find((business) => business.id.toString() === nextValue) ?? null;
              const owningUnit =
                selectedBusiness?.unitId != null
                  ? catalogUnits.find((unit) => unit.id === selectedBusiness.unitId) ?? null
                  : null;

              void persistRecordChange(record.id, (currentRecord) => {
                const nextUnitId = owningUnit?.id ?? currentRecord.unitId ?? null;
                const nextUnit = owningUnit?.name ?? currentRecord.unit;
                const nextBusinessId = selectedBusiness?.id ?? null;
                const nextBusiness = selectedBusiness?.name ?? '';
                const responsibleMatches = responsibleStillMatchesScope(
                  catalogCollaborators,
                  currentRecord.responsibleUserCompanyId,
                  nextUnitId,
                  nextBusinessId,
                  headquarterUnitIds,
                );

                return {
                  ...currentRecord,
                  unitId: nextUnitId,
                  unit: nextUnit,
                  businessId: nextBusinessId,
                  business: nextBusiness,
                  responsibleUserCompanyId: responsibleMatches
                    ? currentRecord.responsibleUserCompanyId
                    : null,
                  responsibleUserId: responsibleMatches ? currentRecord.responsibleUserId : null,
                  responsible: responsibleMatches ? currentRecord.responsible : '',
                };
              });
            }}
            renderValue={() => (
              <span className="truncate">{record.business || processCopy.common.noBusiness}</span>
            )}
            disabled={isRecordPending(record.id)}
          />
          );
        }
      case 'title':
        return (
          <div className="min-w-[240px] space-y-2">
            <InlineTextCell
              value={record.title}
              onCommit={(nextValue) => handleInlineTextCommit(record.id, 'title', nextValue)}
              placeholder={processCopy.form.placeholders.title}
              className="font-semibold text-slate-900 dark:text-white"
              disabled={isRecordPending(record.id)}
            />
            <span
              className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase',
                record.isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
              )}
            >
              {record.isActive ? processCopy.statuses.active : processCopy.statuses.paused}
            </span>
          </div>
        );
      case 'description':
        return (
          <InlineTextareaCell
            value={record.description}
            onCommit={(nextValue) => handleInlineTextCommit(record.id, 'description', nextValue)}
            placeholder={processCopy.form.placeholders.description}
            className="min-h-[96px] min-w-[320px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-600 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            disabled={isRecordPending(record.id)}
          />
        );
      case 'template':
        return (
          <div className="min-w-[280px] space-y-2">
            <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
              {record.taskTitleTemplate || record.title}
            </p>
            <p className="line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
              {record.taskDescriptionTemplate || record.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                {processCopy.table.graceDays(record.graceDays ?? 0)}
              </Badge>
              {record.evidenceRequired ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  {processCopy.table.evidenceRequired}
                </Badge>
              ) : null}
            </div>
          </div>
        );
      case 'createdAt':
        return <span className="text-sm text-slate-700 dark:text-slate-200">{formatDate(record.createdAt)}</span>;
      case 'frequency':
        return (
          <div className="min-w-[220px] space-y-2">
            <InlineSelectField
              value={record.frequency}
              options={frequencyOptions.map((option) => ({ value: option.value, label: processCopy.frequencies[option.value] }))}
              onChange={(nextValue) =>
                void persistRecordChange(record.id, (currentRecord) => ({
                  ...currentRecord,
                  frequency: nextValue,
                  recurrence: normalizeRecurrenceConfig(nextValue, currentRecord.recurrence),
                }))
              }
              className="min-w-[180px]"
              renderValue={(value) => <span className="font-semibold">{processCopy.frequencies[value]}</span>}
              disabled={isRecordPending(record.id)}
            />
            <p className="px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {processCopy.describeFrequency(record.frequency, record.recurrence)}
            </p>
          </div>
        );
      case 'nextOccurrence':
        return (
          <div className="min-w-[190px] space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatOptionalDate(record.nextOccurrenceDate, processCopy.common.noDate)}
            </p>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {processCopy.table.start}: {formatOptionalDate(record.startDate, processCopy.common.noDate)}
              {record.endDate ? ` · ${processCopy.table.end}: ${formatOptionalDate(record.endDate, processCopy.common.noDate)}` : ''}
            </p>
          </div>
        );
      case 'generatedUntil':
        return (
          <div className="min-w-[190px] space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>{processCopy.table.until}: {formatOptionalDate(record.generatedUntilDate, processCopy.common.noDate)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {processCopy.table.window(record.generationWindowDays ?? 45)}
            </p>
          </div>
        );
      case 'progress':
        return (
          <div className="min-w-[190px] space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{processCopy.table.progress}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {clampPercent(record.completionPercent)}%
              </span>
            </div>
            <div className={progressTrackClass}>
              <div
                className="h-full rounded-full bg-[rgb(235,165,52)]"
                style={{ width: `${clampPercent(record.completionPercent)}%` }}
              />
            </div>
            {isProcessAtRisk(record) ? (
              <Badge
                variant="outline"
                className="rounded-full border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
              >
                {processCopy.statuses.atRisk}
              </Badge>
            ) : null}
          </div>
        );
      case 'tasks':
        return (
          <div className="min-w-[180px] space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              <ListChecks className="h-4 w-4" />
              {record.taskCount}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{processCopy.table.taskCounts.open} {record.openTaskCount}</span>
              <span>{processCopy.table.taskCounts.closed} {record.completedTaskCount}</span>
              {record.overdueTaskCount > 0 ? (
                <span className="text-red-600 dark:text-red-300">{processCopy.table.taskCounts.overdue} {record.overdueTaskCount}</span>
              ) : null}
              {record.auditedTaskCount > 0 ? <span>{processCopy.table.taskCounts.audited} {record.auditedTaskCount}</span> : null}
            </div>
          </div>
        );
      case 'creator':
        return (
          <div className="min-w-[160px] whitespace-normal text-sm leading-snug text-slate-700 dark:text-slate-200">
            {record.creator}
          </div>
        );
      case 'responsible':
        {
          const scopedResponsibleOptions = catalogCollaborators.filter((collaborator) =>
            collaboratorCanReceiveAssignment(
              collaborator,
              record.unitId,
              record.businessId,
              headquarterUnitIds,
            ),
          );
          const responsibleOptions: Option<string>[] = [
            { value: UNASSIGNED_RESPONSIBLE_VALUE, label: processCopy.common.unassigned },
            ...scopedResponsibleOptions.map((collaborator) => ({
              value: collaborator.userCompanyId.toString(),
              label: collaborator.name,
            })),
          ];
          const responsibleValue =
            record.responsibleUserCompanyId != null
              ? record.responsibleUserCompanyId.toString()
              : UNASSIGNED_RESPONSIBLE_VALUE;

          return (
          <InlineSelectField
            value={responsibleValue}
            options={responsibleOptions}
            onChange={(nextValue) => {
              const selectedCollaborator =
                nextValue === UNASSIGNED_RESPONSIBLE_VALUE
                  ? null
                  : catalogCollaborators.find(
                      (collaborator) => collaborator.userCompanyId.toString() === nextValue,
                    ) ?? null;

              void persistRecordChange(record.id, (currentRecord) => ({
                ...currentRecord,
                responsibleUserCompanyId: selectedCollaborator?.userCompanyId ?? null,
                responsibleUserId: selectedCollaborator?.userId ?? null,
                responsible: selectedCollaborator?.name ?? '',
              }));
            }}
            renderValue={(value) => (
              <span className="truncate">{record.responsible || processCopy.common.unassigned}</span>
            )}
            disabled={isRecordPending(record.id)}
          />
          );
        }
      case 'priority':
        return (
          <InlineSelectField
            value={record.priority}
            options={processPriorityValues.map((value) => ({
              value,
              label: processCopy.priorities[value],
            }))}
            onChange={(nextValue) =>
              void persistRecordChange(record.id, (currentRecord) => ({ ...currentRecord, priority: nextValue }))
            }
            className={cn('min-w-[136px] border font-semibold', prioritySelectClasses[record.priority])}
            renderValue={(value) => <span className="font-semibold">{processCopy.priorities[value]}</span>}
            disabled={isRecordPending(record.id)}
          />
        );
      default:
        return null;
    }
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
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {headerCopy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[rgb(235,165,52)] shadow-none hover:bg-[rgb(235,165,52)] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onClick={() => setIsColumnsDialogOpen(true)}
              disabled={isLoadingProcesses}
            >
              <Columns3 className="h-4 w-4" />
              {headerCopy.actions.columns}
            </Button>
            <Button
              type="button"
              className={cn('h-11 gap-2 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
              onClick={openCreateDialog}
              disabled={isLoadingProcesses}
            >
              <Plus className="h-4 w-4" />
              {headerCopy.actions.create}
            </Button>
          </div>
        </div>
      </section>

      {processesError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{processesError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadProcesses();
              }}
            >
              {processCopy.common.retry}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-5 text-base font-bold text-slate-800 dark:text-white">{processCopy.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{processCopy.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={processCopy.filters.searchPlaceholder}
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <FilterSelect
            label={processCopy.filters.unit}
            value={unitFilter}
            onChange={(value) => setUnitFilter(value)}
            options={localizedUnitOptions}
          />
          <FilterSelect
            label={processCopy.filters.business}
            value={businessFilter}
            onChange={(value) => setBusinessFilter(value)}
            options={localizedBusinessOptions}
          />
          <FilterSelect
            label={processCopy.filters.collaborator}
            value={collaboratorFilter}
            onChange={(value) => setCollaboratorFilter(value)}
            options={localizedCollaboratorOptions}
          />
          <FilterSelect
            label={processCopy.filters.frequency}
            value={frequencyFilter}
            onChange={(value) => setFrequencyFilter(value)}
            options={localizedFrequencyOptions}
          />
        </div>
      </section>

      <ProcessKpiStrip copy={processCopy.kpis} isLoading={isLoadingProcesses} metrics={processKpiMetrics} />

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
        <Table className="min-w-[2300px]">
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              {visibleColumns.map((column) => {
                const isActiveSort = sortState.columnId === column.id;
                const SortIcon = isActiveSort ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                return (
                  <TableHead key={column.id} className="px-5 py-5">
                    <button
                      type="button"
                      onClick={() => handleSort(column.id)}
                      className="flex min-h-8 items-center gap-2 rounded-md text-left text-sm font-semibold tracking-tight text-slate-500 transition hover:text-[rgb(235,165,52)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(235,165,52)] focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-800"
                    >
                      <span>{column.label}</span>
                      <SortIcon
                        className={cn(
                          'h-4 w-4',
                          isActiveSort ? 'text-[rgb(235,165,52)]' : 'text-slate-400',
                        )}
                      />
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="px-5 py-6 text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
                {processCopy.common.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((record) => (
              <TableRow
                key={record.id}
                className={cn(
                  'border-slate-200 dark:border-slate-700',
                  !record.isActive && 'bg-slate-50/80 dark:bg-slate-900/40',
                )}
              >
                {visibleColumns.map((column) => (
                  <TableCell
                    key={`${record.id}-${column.id}`}
                    className={cn(
                      'px-5 py-6 align-middle',
                      column.id === 'description' || column.id === 'title' ? 'whitespace-normal' : '',
                    )}
                  >
                    {renderCell(record, column.id)}
                  </TableCell>
                ))}
                <TableCell className="px-5 py-6">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <ProcessActionButton
                      label={processCopy.actions.runEngine}
                      onClick={() => {
                        void handleMaterialize(record);
                      }}
                      disabled={isRecordPending(record.id)}
                      className="border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 text-[rgb(176,111,22)] hover:bg-[rgb(235,165,52)] hover:text-white dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15 dark:text-[rgb(245,196,112)] dark:hover:bg-[rgb(235,165,52)] dark:hover:text-white"
                      icon={<CalendarPlus className="h-4 w-4" />}
                    />
                    <ProcessActionButton
                      label={record.isActive ? processCopy.actions.pause : processCopy.actions.activate}
                      onClick={() => {
                        void handleToggleActive(record.id);
                      }}
                      disabled={isRecordPending(record.id)}
                      className={
                        record.isActive
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
                      }
                      icon={
                        record.isActive ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )
                      }
                    />
                    <ProcessActionButton
                      label={processCopy.actions.edit}
                      onClick={() => openEditDialog(record)}
                      disabled={isRecordPending(record.id)}
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      icon={<Pencil className="h-4 w-4" />}
                    />
                    <ProcessActionButton
                      label={processCopy.actions.copy}
                      onClick={() => {
                        void handleDuplicate(record);
                      }}
                      disabled={isRecordPending(record.id)}
                      className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                      icon={<Copy className="h-4 w-4" />}
                    />
                    <ProcessActionButton
                      label={processCopy.actions.delete}
                      onClick={() => {
                        handleDelete(record);
                      }}
                      disabled={isRecordPending(record.id)}
                      className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {isLoadingProcesses ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  {processCopy.table.loading}
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoadingProcesses && sortedRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  {processCopy.table.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </div>
      </section>

      <ProcessFormDialog
        copy={processCopy}
        open={processEditorOpen}
        onOpenChange={handleEditorOpenChange}
        mode={editorMode}
        onSubmit={handleSubmit}
        form={form}
        isSubmitting={isSubmittingProcess}
        setForm={setForm}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        collaboratorOptions={catalogCollaborators}
      />

      <ColumnasConfigModal
        isOpen={isColumnsDialogOpen}
        onClose={() => setIsColumnsDialogOpen(false)}
        columns={columns as ColumnConfig[]}
        fixedColumns={[
          {
            id: 'actions',
            label: processCopy.fixedColumns.actions.label,
            visible: true,
            locked: true,
            description: processCopy.fixedColumns.actions.description,
          },
        ]}
        onSave={(nextColumns) => setColumns(nextColumns as ProcessColumnConfig[])}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(confirmation)}
        title={processCopy.confirmation.deleteTitle}
        itemName={confirmation?.record.title}
        description={processCopy.confirmation.deleteDescription}
        confirmLabel={processCopy.confirmation.deleteConfirm}
        cancelLabel={processCopy.common.cancel}
        confirmDisabled={confirmation ? isRecordPending(confirmation.record.id) : false}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </>
  );
}
