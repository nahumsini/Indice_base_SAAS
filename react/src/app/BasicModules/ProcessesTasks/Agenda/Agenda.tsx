import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Columns3,
  Copy,
  Download,
  FileText,
  FolderOpen,
  GripVertical,
  ListChecks,
  MonitorSmartphone,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { ColumnasConfigModal, type ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
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
import { authApi } from '../../../api/auth';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { accentButtonClass } from '../Processes/processesData';
import { listProcesses } from '../Processes/processesApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessRecord,
  ProcessUnitOption,
} from '../Processes/types';
import { listProjects, type ProjectRecord } from '../Projects/projectsApi';
import { TaskAuditDialog } from '../Tasks/components/TaskAuditDialog';
import { TaskFormDialog, type TaskFormValues } from '../Tasks/components/TaskFormDialog';
import { TaskCompletionDialog } from '../Tasks/components/TaskCompletionDialog';
import {
  auditProcessTask,
  completeProcessTask,
  createProcessTask,
  deleteProcessTask,
  updateProcessTask,
  type TaskPayload,
  type TaskPriority,
  type TaskStatus,
} from '../Tasks/tasksApi';
import { listAgendaTasks, type AgendaTaskItem } from './agendaApi';
import { AgendaKpiStrip, type AgendaKpiMetrics } from './components/AgendaKpiStrip';
import { TaskAttachmentsDialog } from './components/TaskAttachmentsDialog';
import { useAgendaTranslations, type AgendaTranslations } from './translations';
import { TaskKioskManagementModal } from '../Kiosk/TaskKioskManagementModal';
import {
  processTaskKioskApi,
  type ProcessTaskKiosk,
  type ProcessTaskKioskPayload,
} from '../Kiosk/processTaskKioskApi';
import { ProgressSlider } from '../shared/ProgressSlider';
import { useRowSelection } from '../shared/useRowSelection';
import {
  collaboratorCanReceiveAssignment,
  defaultTaskScopeForActor,
  filterBusinessesForActor,
  filterUnitsForActor,
  resolveCollaboratorAssignmentScope,
} from '../shared/assignmentScope';

type PeriodFilter = 'mine' | 'team' | 'week' | 'month' | 'overdue' | 'custom';
type DisplayTaskStatus = TaskStatus | 'overdue' | 'audited';
type OpenStatusFilter = 'open';
type AuditPendingStatusFilter = 'pending_audit';
type StatusFilter = 'all' | DisplayTaskStatus | OpenStatusFilter | AuditPendingStatusFilter;
type OptionFilter = 'all' | string;
type AgendaViewMode = 'table' | 'kanban' | 'diagram';
type AgendaScheduleViewMode = 'day' | 'week' | 'list';
type AgendaColumnId =
  | 'folio'
  | 'type'
  | 'unit'
  | 'business'
  | 'title'
  | 'description'
  | 'createdAt'
  | 'startDate'
  | 'dueDate'
  | 'status'
  | 'creator'
  | 'responsible'
  | 'priority'
  | 'attachments'
  | 'project'
  | 'completion'
  | 'notes'
  | 'weighting'
  | 'auditNotes';
type AgendaFixedColumnId = 'actions';
type AgendaTableColumnId = AgendaColumnId | AgendaFixedColumnId;
type AgendaSortDirection = 'asc' | 'desc';
type AgendaSortValue = string | number | null;
type AgendaSchedulePlacement = {
  date: string;
  hour: string | null;
};
type AgendaSchedulePlacements = Record<string, AgendaSchedulePlacement>;
type AgendaKanbanColumnId =
  | 'overdue'
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'audited'
  | 'cancelled';

interface AgendaSortState {
  columnId: AgendaColumnId;
  direction: AgendaSortDirection;
}

interface AgendaParticipantFilterOption {
  value: string;
  label: string;
  userId: number | null;
  userCompanyId: number | null;
  normalizedName: string;
}

interface AgendaProjectFilterOption {
  value: string;
  label: string;
}

const auditStatusClasses: Record<AgendaTaskItem['auditStatus'], string> = {
  not_ready:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200',
  pending:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  audited:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const agendaDisplayStatusClasses: Record<DisplayTaskStatus, string> = {
  pending:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200',
  in_progress:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  completed:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  cancelled:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
  overdue:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300',
  audited:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const agendaPeriodFilterValues: PeriodFilter[] = ['mine', 'team', 'week', 'month', 'overdue', 'custom'];
const agendaStatusFilterValues: Array<DisplayTaskStatus | OpenStatusFilter | AuditPendingStatusFilter> = [
  'open',
  'pending',
  'in_progress',
  'paused',
  'completed',
  'pending_audit',
  'audited',
  'overdue',
  'cancelled',
];

const allPastStartDate = '1970-01-01';
const NO_UNIT_VALUE = '__no_unit__';
const NO_BUSINESS_VALUE = '__no_business__';
const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';
const NO_PROJECT_VALUE = '__no_project__';
const agendaColumnsStorageKey = 'processes-tasks-agenda-columns-v2';
const agendaColumnWidthsStorageKey = 'processes-tasks-agenda-column-widths-v2';
const agendaScheduleStorageKey = 'processes-tasks-agenda-schedule-v1';
const agendaSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const maximumAuditWeighting = 5;

function isAgendaPeriodFilter(value: string | null): value is PeriodFilter {
  return agendaPeriodFilterValues.includes(value as PeriodFilter);
}

function isAgendaStatusFilter(value: string | null): value is StatusFilter {
  return value === 'all' || agendaStatusFilterValues.includes(value as DisplayTaskStatus | OpenStatusFilter | AuditPendingStatusFilter);
}

function isDateInputValue(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function agendaDeepLinkFilters(search: string) {
  const params = new URLSearchParams(search);
  const period = params.get('period');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');

  return {
    period: isAgendaPeriodFilter(period) ? period : null,
    status: isAgendaStatusFilter(status) ? status : null,
    unit: params.get('unit'),
    business: params.get('business'),
    collaborator: params.get('collaborator'),
    from: isDateInputValue(from) ? from : null,
    to: isDateInputValue(to) ? to : null,
  };
}
const selectionColumnWidth = 64;
const agendaPrioritySortRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const agendaScheduleHours = Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);
type AgendaKanbanColumn = {
  id: AgendaKanbanColumnId;
  label: string;
  description: string;
  accentClassName: string;
  dotClassName: string;
  acceptsDrop: boolean;
};

function createAgendaKanbanColumns(copy: AgendaTranslations): AgendaKanbanColumn[] {
  return [
  {
    id: 'overdue',
    label: copy.kanban.columns.overdue.label,
    description: copy.kanban.columns.overdue.description,
    accentClassName: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/35',
    dotClassName: 'bg-rose-500',
    acceptsDrop: false,
  },
  {
    id: 'pending',
    label: copy.kanban.columns.pending.label,
    description: copy.kanban.columns.pending.description,
    accentClassName: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/45',
    dotClassName: 'bg-slate-400',
    acceptsDrop: true,
  },
  {
    id: 'in_progress',
    label: copy.kanban.columns.in_progress.label,
    description: copy.kanban.columns.in_progress.description,
    accentClassName: 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35',
    dotClassName: 'bg-blue-500',
    acceptsDrop: true,
  },
  {
    id: 'paused',
    label: copy.kanban.columns.paused.label,
    description: copy.kanban.columns.paused.description,
    accentClassName: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35',
    dotClassName: 'bg-amber-500',
    acceptsDrop: true,
  },
  {
    id: 'completed',
    label: copy.kanban.columns.completed.label,
    description: copy.kanban.columns.completed.description,
    accentClassName: 'border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/35',
    dotClassName: 'bg-violet-500',
    acceptsDrop: true,
  },
  {
    id: 'audited',
    label: copy.kanban.columns.audited.label,
    description: copy.kanban.columns.audited.description,
    accentClassName: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35',
    dotClassName: 'bg-emerald-500',
    acceptsDrop: true,
  },
  {
    id: 'cancelled',
    label: copy.kanban.columns.cancelled.label,
    description: copy.kanban.columns.cancelled.description,
    accentClassName: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/70',
    dotClassName: 'bg-slate-500',
    acceptsDrop: true,
  },
  ];
}
const defaultAgendaColumnWidths: Record<AgendaTableColumnId, number> = {
  folio: 140,
  type: 170,
  unit: 220,
  business: 240,
  title: 280,
  description: 340,
  createdAt: 210,
  startDate: 180,
  dueDate: 190,
  status: 190,
  creator: 230,
  responsible: 280,
  priority: 170,
  attachments: 150,
  project: 280,
  completion: 190,
  notes: 340,
  weighting: 230,
  auditNotes: 360,
  actions: 350,
};
const minimumAgendaColumnWidths: Record<AgendaTableColumnId, number> = {
  folio: 110,
  type: 140,
  unit: 170,
  business: 180,
  title: 210,
  description: 240,
  createdAt: 170,
  startDate: 150,
  dueDate: 160,
  status: 160,
  creator: 180,
  responsible: 220,
  priority: 140,
  attachments: 120,
  project: 220,
  completion: 160,
  notes: 240,
  weighting: 210,
  auditNotes: 280,
  actions: 310,
};

function createDefaultAgendaColumns(copy: AgendaTranslations): ColumnConfig[] {
  return [
    { id: 'folio', label: copy.columns.folio.label, visible: true, description: copy.columns.folio.description },
    { id: 'type', label: copy.columns.type.label, visible: true, description: copy.columns.type.description },
    { id: 'unit', label: copy.columns.unit.label, visible: false, description: copy.columns.unit.description },
    { id: 'business', label: copy.columns.business.label, visible: false, description: copy.columns.business.description },
    { id: 'title', label: copy.columns.title.label, visible: true, description: copy.columns.title.description },
    { id: 'description', label: copy.columns.description.label, visible: false, description: copy.columns.description.description },
    { id: 'createdAt', label: copy.columns.createdAt.label, visible: false, description: copy.columns.createdAt.description },
    { id: 'startDate', label: copy.columns.startDate.label, visible: false, description: copy.columns.startDate.description },
    { id: 'dueDate', label: copy.columns.dueDate.label, visible: true, description: copy.columns.dueDate.description },
    { id: 'status', label: copy.columns.status.label, visible: true, description: copy.columns.status.description },
    { id: 'creator', label: copy.columns.creator.label, visible: false, description: copy.columns.creator.description },
    { id: 'responsible', label: copy.columns.responsible.label, visible: true, description: copy.columns.responsible.description },
    { id: 'priority', label: copy.columns.priority.label, visible: true, description: copy.columns.priority.description },
    { id: 'attachments', label: copy.columns.attachments.label, visible: true, description: copy.columns.attachments.description },
    { id: 'project', label: copy.columns.project.label, visible: false, description: copy.columns.project.description },
    { id: 'completion', label: copy.columns.completion.label, visible: true, description: copy.columns.completion.description },
    { id: 'notes', label: copy.columns.notes.label, visible: false, description: copy.columns.notes.description },
    { id: 'weighting', label: copy.columns.weighting.label, visible: true, description: copy.columns.weighting.description },
    { id: 'auditNotes', label: copy.columns.auditNotes.label, visible: false, description: copy.columns.auditNotes.description },
  ];
}

function getInitialAgendaColumns(defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(agendaColumnsStorageKey);
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

function getInitialAgendaColumnWidths() {
  if (typeof window === 'undefined') {
    return defaultAgendaColumnWidths;
  }

  try {
    const rawWidths = window.localStorage.getItem(agendaColumnWidthsStorageKey);
    if (!rawWidths) {
      return defaultAgendaColumnWidths;
    }

    const parsedWidths = JSON.parse(rawWidths) as Record<string, unknown>;
    const nextWidths = { ...defaultAgendaColumnWidths };

    Object.entries(parsedWidths).forEach(([columnId, width]) => {
      if (!(columnId in defaultAgendaColumnWidths) || typeof width !== 'number') {
        return;
      }

      const supportedColumnId = columnId as AgendaTableColumnId;
      nextWidths[supportedColumnId] = Math.max(minimumAgendaColumnWidths[supportedColumnId], width);
    });

    return nextWidths;
  } catch {
    return defaultAgendaColumnWidths;
  }
}

function getInitialAgendaSchedulePlacements(): AgendaSchedulePlacements {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawPlacements = window.localStorage.getItem(agendaScheduleStorageKey);
    if (!rawPlacements) {
      return {};
    }

    const parsedPlacements = JSON.parse(rawPlacements) as Record<string, Partial<AgendaSchedulePlacement>>;
    const restoredPlacements: AgendaSchedulePlacements = {};

    Object.entries(parsedPlacements).forEach(([taskId, placement]) => {
      if (!placement?.date || typeof placement.date !== 'string') {
        return;
      }

      restoredPlacements[taskId] = {
        date: placement.date,
        hour: typeof placement.hour === 'string' && agendaScheduleHours.includes(placement.hour)
          ? placement.hour
          : null,
      };
    });

    return restoredPlacements;
  } catch {
    return {};
  }
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) {
    return 'Sin fecha';
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeWeighting(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(maximumAuditWeighting, value));
}

function formatWeightingScore(value: number | null | undefined, emptyLabel: string) {
  const normalizedWeighting = normalizeWeighting(value);
  return normalizedWeighting == null ? emptyLabel : `${normalizedWeighting}/${maximumAuditWeighting}`;
}

function isPastDate(value: string | null) {
  if (!value) {
    return false;
  }

  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(`${value}T00:00:00`) < todayAtMidnight;
}

function isTaskOverdue(task: AgendaTaskItem) {
  return (
    (task.isOverdue || isPastDate(task.dueDate)) &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'
  );
}

function getTaskDisplayStatus(task: AgendaTaskItem): DisplayTaskStatus {
  if (task.status === 'completed' && task.audited) {
    return 'audited';
  }

  return isTaskOverdue(task) ? 'overdue' : task.status;
}

function taskMatchesStatusFilter(task: AgendaTaskItem, filter: StatusFilter) {
  if (filter === 'all') {
    return task.status !== 'cancelled';
  }

  if (filter === 'open') {
    return task.status === 'pending' || task.status === 'in_progress' || task.status === 'paused';
  }

  if (filter === 'pending_audit') {
    return task.status === 'completed' && !task.audited;
  }

  return getTaskDisplayStatus(task) === filter;
}

function getTaskKanbanColumnId(task: AgendaTaskItem): AgendaKanbanColumnId {
  if (task.status === 'cancelled') {
    return 'cancelled';
  }

  if (isTaskOverdue(task)) {
    return 'overdue';
  }

  if (task.status === 'completed') {
    return task.audited ? 'audited' : 'completed';
  }

  return task.status;
}

function taskDueDateValue(task: AgendaTaskItem) {
  return task.dueDate || task.agendaDate || null;
}

function isTaskInDailyAgenda(task: AgendaTaskItem, todayValue: string) {
  return taskDueDateValue(task) === todayValue || isTaskOverdue(task);
}

function isTaskInMyAgenda(task: AgendaTaskItem, currentUserId: number | null) {
  if (currentUserId == null) {
    return false;
  }

  const assignedToCurrentUser = task.assignedUserId === currentUserId;
  const createdByCurrentUser = task.createdBy === currentUserId;
  const delegatedToAnotherUser = task.assignedUserCompanyId != null && task.assignedUserId !== currentUserId;

  return assignedToCurrentUser || (createdByCurrentUser && !delegatedToAnotherUser);
}

function matchesAgendaPeriod(
  task: AgendaTaskItem,
  period: PeriodFilter,
  todayValue: string,
  currentUserId: number | null,
) {
  switch (period) {
    case 'mine':
      return isTaskInDailyAgenda(task, todayValue) && isTaskInMyAgenda(task, currentUserId);
    case 'team':
      return isTaskInDailyAgenda(task, todayValue);
    case 'overdue':
      return isTaskOverdue(task);
    case 'week':
    case 'month':
    case 'custom':
      return true;
  }
}

function sortableDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  const time = parsedDate.getTime();

  return Number.isNaN(time) ? null : time;
}

function getAgendaSortValue(
  task: AgendaTaskItem,
  columnId: AgendaColumnId,
  copy: AgendaTranslations,
): AgendaSortValue {
  switch (columnId) {
    case 'folio':
      return task.folio;
    case 'type':
      return copy.taskTypes[task.taskType];
    case 'unit':
      return task.unitName ?? task.unit ?? '';
    case 'business':
      return task.businessName ?? task.business ?? '';
    case 'title':
      return task.title;
    case 'description':
      return task.description ?? '';
    case 'createdAt':
      return sortableDateValue(task.createdAt);
    case 'startDate':
      return sortableDateValue(task.startDate);
    case 'dueDate':
      return sortableDateValue(task.dueDate);
    case 'status':
      return copy.statuses[getTaskDisplayStatus(task)];
    case 'creator':
      return task.createdByName ?? task.creator ?? '';
    case 'responsible':
      return task.assignedName ?? task.responsible ?? '';
    case 'priority':
      return agendaPrioritySortRank[task.priority] ?? 0;
    case 'attachments':
      return task.attachments;
    case 'project':
      return task.projectName ?? task.project ?? task.projectFolio ?? '';
    case 'completion':
      return clampPercent(task.completionPercent);
    case 'notes':
      return task.notes ?? '';
    case 'weighting':
      return task.weighting;
    case 'auditNotes':
      return task.audited ? task.auditNotes ?? '' : copy.auditStatuses[task.auditStatus];
  }
}

function compareAgendaSortValues(
  leftValue: AgendaSortValue,
  rightValue: AgendaSortValue,
  direction: AgendaSortDirection,
) {
  const leftIsEmpty = leftValue == null || leftValue === '';
  const rightIsEmpty = rightValue == null || rightValue === '';

  if (leftIsEmpty && rightIsEmpty) {
    return 0;
  }

  if (leftIsEmpty) {
    return 1;
  }

  if (rightIsEmpty) {
    return -1;
  }

  const result =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : agendaSortCollator.compare(String(leftValue), String(rightValue));

  return direction === 'asc' ? result : result * -1;
}

function periodRange(period: PeriodFilter, customFrom: string, customTo: string) {
  const today = new Date();

  switch (period) {
    case 'mine':
    case 'team':
      return {
        from: allPastStartDate,
        to: toDateInputValue(today),
      };
    case 'week':
      return {
        from: toDateInputValue(startOfWeek(today)),
        to: toDateInputValue(endOfWeek(today)),
      };
    case 'month':
      return {
        from: toDateInputValue(startOfMonth(today)),
        to: toDateInputValue(endOfMonth(today)),
      };
    case 'overdue':
      return {
        from: allPastStartDate,
        to: toDateInputValue(addDays(today, -1)),
      };
    case 'custom':
      return {
        from: customFrom,
        to: customTo,
      };
  }
}

function createDefaultTaskForm() {
  const today = toDateInputValue(new Date());

  return {
    title: '',
    description: '',
    processId: '',
    projectId: '',
    assignedUserCompanyId: '',
    assignedName: '',
    status: 'pending',
    priority: 'medium',
    startDate: today,
    dueDate: today,
    notes: '',
    completionPercent: '',
    weighting: '',
    audited: false,
    auditNotes: '',
    businessId: '',
    unitId: '',
  } satisfies TaskFormValues;
}

function toTaskFormValues(task: AgendaTaskItem): TaskFormValues {
  const normalizedWeighting = normalizeWeighting(task.weighting);

  return {
    title: task.title,
    description: task.description ?? '',
    processId: task.processId?.toString() ?? '',
    projectId: task.projectId?.toString() ?? '',
    assignedUserCompanyId: task.assignedUserCompanyId?.toString() ?? '',
    assignedName: task.assignedName ?? '',
    status: task.status,
    priority: task.priority,
    startDate: task.startDate ?? '',
    dueDate: task.dueDate ?? '',
    notes: task.notes ?? '',
    completionPercent: task.completionPercent ? task.completionPercent.toString() : '',
    weighting: normalizedWeighting?.toString() ?? '',
    audited: task.audited,
    auditNotes: task.auditNotes ?? '',
    businessId: task.businessId?.toString() ?? '',
    unitId: task.unitId?.toString() ?? '',
  };
}

function parseOptionalNumber(value: string, fieldLabel: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} must be a valid positive number.`);
  }

  return parsed;
}

function parseOptionalNumberInRange(value: string, fieldLabel: string, min: number, max: number) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${fieldLabel} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function compactText(value?: string | null) {
  return value?.trim() ?? '';
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
    unitName: compactText(user.unit_name),
    businessId: user.business_id ?? null,
    businessName: compactText(user.business_name),
  };
}

function buildTaskPayload(form: TaskFormValues, copy: AgendaTranslations): TaskPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    processId: parseOptionalNumber(form.processId, 'Process'),
    projectId: parseOptionalNumber(form.projectId, 'Project'),
    assignedUserCompanyId: parseOptionalNumber(form.assignedUserCompanyId, 'Assigned HR user ID'),
    assignedName: form.assignedName.trim() ? form.assignedName.trim() : null,
    status: form.status,
    priority: form.priority,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    notes: form.notes.trim() ? form.notes.trim() : null,
    completionPercent: parseOptionalNumberInRange(form.completionPercent, 'Completion %', 0, 100),
    weighting: parseOptionalNumberInRange(form.weighting, copy.report.fields.weighting, 0, maximumAuditWeighting),
    audited: form.audited,
    auditNotes: form.audited && form.auditNotes.trim() ? form.auditNotes.trim() : null,
    businessId: parseOptionalNumber(form.businessId, 'Business ID'),
    unitId: parseOptionalNumber(form.unitId, 'Unit ID'),
  };
}

function unitFilterValue(task: AgendaTaskItem, copy: AgendaTranslations) {
  return task.unitName ?? (task.unitId ? `${copy.form.labels.unit} #${task.unitId}` : '');
}

function businessFilterValue(task: AgendaTaskItem, copy: AgendaTranslations) {
  return task.businessName ?? (task.businessId ? `${copy.form.labels.business} #${task.businessId}` : '');
}

function participantFilterValue(userId: number | null, userCompanyId: number | null, name: string) {
  if (userId != null) {
    return `user:${userId}`;
  }

  if (userCompanyId != null) {
    return `user-company:${userCompanyId}`;
  }

  return `name:${name.toLowerCase()}`;
}

function addParticipantFilterOption(
  optionMap: Map<string, AgendaParticipantFilterOption>,
  candidate: {
    name?: string | null;
    userId?: number | null;
    userCompanyId?: number | null;
  },
) {
  const label = compactText(candidate.name);
  const userId = candidate.userId ?? null;
  const userCompanyId = candidate.userCompanyId ?? null;

  if (!label && userId == null && userCompanyId == null) {
    return;
  }

  const value = participantFilterValue(userId, userCompanyId, label);
  const existingOption = optionMap.get(value);

  optionMap.set(value, {
    value,
    label: existingOption?.label ?? (label || `User #${userId ?? userCompanyId}`),
    userId: existingOption?.userId ?? userId,
    userCompanyId: existingOption?.userCompanyId ?? userCompanyId,
    normalizedName: existingOption?.normalizedName ?? label.toLowerCase(),
  });
}

function agendaParticipantOptions(tasks: AgendaTaskItem[], unassignedLabel: string) {
  const optionMap = new Map<string, AgendaParticipantFilterOption>();
  let hasUnassignedResponsible = false;

  tasks.forEach((task) => {
    addParticipantFilterOption(optionMap, {
      name: task.createdByName ?? task.creator,
      userId: task.createdBy,
    });
    addParticipantFilterOption(optionMap, {
      name: task.assignedName ?? task.responsible,
      userId: task.assignedUserId,
      userCompanyId: task.assignedUserCompanyId,
    });

    if (task.assignedUserCompanyId == null) {
      hasUnassignedResponsible = true;
    }
  });

  if (hasUnassignedResponsible) {
    optionMap.set(UNASSIGNED_RESPONSIBLE_VALUE, {
      value: UNASSIGNED_RESPONSIBLE_VALUE,
      label: unassignedLabel,
      userId: null,
      userCompanyId: null,
      normalizedName: '',
    });
  }

  return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function taskMatchesParticipantFilter(task: AgendaTaskItem, option: AgendaParticipantFilterOption) {
  if (option.value === UNASSIGNED_RESPONSIBLE_VALUE) {
    return task.assignedUserCompanyId == null;
  }

  if (option.userId != null) {
    return task.createdBy === option.userId || task.assignedUserId === option.userId;
  }

  if (option.userCompanyId != null && task.assignedUserCompanyId === option.userCompanyId) {
    return true;
  }

  if (option.normalizedName) {
    const creatorName = compactText(task.createdByName ?? task.creator).toLowerCase();
    const assignedName = compactText(task.assignedName ?? task.responsible).toLowerCase();

    return creatorName === option.normalizedName || assignedName === option.normalizedName;
  }

  return false;
}

function uniqueSortedOptions(tasks: AgendaTaskItem[], getter: (task: AgendaTaskItem) => string) {
  return Array.from(new Set(tasks.map(getter).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

const tableInputClass =
  'h-10 min-w-0 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const tableTextareaClass =
  'min-h-[76px] rounded-xl border-slate-200 bg-white text-sm leading-5 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const tableSelectTriggerClass =
  'h-10 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50';

function TableActionButton({
  className,
  icon,
  label,
  onClick,
  disabled,
}: {
  className: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonBaseClass, className)}
    >
      {icon}
    </button>
  );
}

interface AgendaColumnResizeHandleProps {
  columnId: AgendaTableColumnId;
  onResizeStart: (event: ReactMouseEvent, columnId: AgendaTableColumnId) => void;
  resizeLabel: string;
  resizingColumn: AgendaTableColumnId | null;
}

function AgendaColumnResizeHandle({
  columnId,
  onResizeStart,
  resizeLabel,
  resizingColumn,
}: AgendaColumnResizeHandleProps) {
  return (
    <button
      type="button"
      title={resizeLabel}
      aria-label={resizeLabel}
      onMouseDown={(event) => onResizeStart(event, columnId)}
      className={cn(
        'absolute bottom-0 right-0 top-0 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:bg-[#F4C84A]/20 group-hover:opacity-100',
        resizingColumn === columnId && 'bg-[#F4C84A]/25 opacity-100',
      )}
    >
      <GripVertical className="h-4 w-4 text-[#9A6B05]" />
    </button>
  );
}

interface AgendaSortableTableHeadProps {
  column: ColumnConfig;
  onResizeStart: (event: ReactMouseEvent, columnId: AgendaTableColumnId) => void;
  resizeLabel: string;
  onSort: (columnId: AgendaColumnId) => void;
  resizingColumn: AgendaTableColumnId | null;
  sortState: AgendaSortState;
  width: number;
}

function AgendaSortableTableHead({
  column,
  onResizeStart,
  resizeLabel,
  onSort,
  resizingColumn,
  sortState,
  width,
}: AgendaSortableTableHeadProps) {
  const columnId = column.id as AgendaColumnId;
  const isActiveSort = sortState.columnId === columnId;
  const SortIcon = isActiveSort ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className="group relative px-5 py-5"
      style={{ width, minWidth: width }}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 pr-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:text-[#9A6B05] dark:text-slate-400"
          onClick={() => onSort(columnId)}
        >
          <span className="truncate">{column.label}</span>
          <SortIcon
            className={cn(
              'h-4 w-4 shrink-0',
              isActiveSort ? 'text-[#9A6B05]' : 'text-slate-400',
            )}
          />
        </button>
        <AgendaColumnResizeHandle
          columnId={columnId}
          resizeLabel={resizeLabel}
          resizingColumn={resizingColumn}
          onResizeStart={onResizeStart}
        />
      </div>
    </TableHead>
  );
}

interface AgendaStaticTableHeadProps {
  column: ColumnConfig;
  columnId: AgendaFixedColumnId;
  onResizeStart: (event: ReactMouseEvent, columnId: AgendaTableColumnId) => void;
  resizeLabel: string;
  resizingColumn: AgendaTableColumnId | null;
  width: number;
}

function AgendaStaticTableHead({
  column,
  columnId,
  onResizeStart,
  resizeLabel,
  resizingColumn,
  width,
}: AgendaStaticTableHeadProps) {
  return (
    <TableHead
      className="group relative px-5 py-5"
      style={{ width, minWidth: width }}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 pr-2">
        <span className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{column.label}</span>
        <AgendaColumnResizeHandle
          columnId={columnId}
          resizeLabel={resizeLabel}
          resizingColumn={resizingColumn}
          onResizeStart={onResizeStart}
        />
      </div>
    </TableHead>
  );
}

interface InlineTextInputProps {
  value: string | null | undefined;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string) => void | Promise<void>;
}

function InlineTextInput({ value, placeholder, disabled = false, className, onCommit }: InlineTextInputProps) {
  const normalizedValue = value ?? '';
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue === normalizedValue.trim()) {
      setDraft(normalizedValue);
      return;
    }

    void onCommit(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }

    if (event.key === 'Escape') {
      setDraft(normalizedValue);
    }
  };

  return (
    <Input
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(tableInputClass, className)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

interface InlineTextAreaProps {
  value: string | null | undefined;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string) => void | Promise<void>;
}

function InlineTextArea({ value, placeholder, disabled = false, className, onCommit }: InlineTextAreaProps) {
  const normalizedValue = value ?? '';
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue === normalizedValue.trim()) {
      setDraft(normalizedValue);
      return;
    }

    void onCommit(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      commit();
    }

    if (event.key === 'Escape') {
      setDraft(normalizedValue);
    }
  };

  return (
    <Textarea
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(tableTextareaClass, className)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

function buildAgendaTaskPayload(task: AgendaTaskItem, patch: Partial<TaskPayload> = {}): TaskPayload {
  return {
    title: task.title.trim(),
    description: task.description?.trim() ? task.description.trim() : null,
    processId: task.processId,
    projectId: task.projectId,
    assignedUserCompanyId: task.assignedUserCompanyId,
    assignedName: task.assignedName?.trim() ? task.assignedName.trim() : null,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate || task.agendaDate || null,
    notes: task.notes?.trim() ? task.notes.trim() : null,
    completionPercent: clampPercent(task.completionPercent),
    weighting: normalizeWeighting(task.weighting),
    audited: task.audited,
    auditNotes: task.audited && task.auditNotes?.trim() ? task.auditNotes.trim() : null,
    businessId: task.businessId,
    unitId: task.unitId,
    ...patch,
  };
}

function buildAgendaOptimisticPatch(
  payload: TaskPayload,
  unitOptions: ProcessUnitOption[],
  businessOptions: ProcessBusinessOption[],
  projectOptions: ProjectRecord[],
): Partial<AgendaTaskItem> {
  const selectedUnit = payload.unitId != null ? unitOptions.find((unit) => unit.id === payload.unitId) : null;
  const selectedBusiness =
    payload.businessId != null ? businessOptions.find((business) => business.id === payload.businessId) : null;
  const selectedProject =
    payload.projectId != null ? projectOptions.find((project) => project.id === payload.projectId) : null;

  return {
    assignedName: payload.assignedName,
    assignedUserCompanyId: payload.assignedUserCompanyId,
    auditNotes: payload.auditNotes,
    audited: payload.audited,
    business: selectedBusiness?.name ?? null,
    businessId: payload.businessId,
    businessName: selectedBusiness?.name ?? null,
    completion: clampPercent(payload.completionPercent ?? 0),
    completionPercent: clampPercent(payload.completionPercent ?? 0),
    description: payload.description,
    dueDate: payload.dueDate ?? '',
    notes: payload.notes,
    priority: payload.priority,
    processId: payload.processId,
    project: selectedProject?.name ?? null,
    projectFolio: selectedProject?.folio ?? null,
    projectId: payload.projectId,
    projectName: selectedProject?.name ?? null,
    startDate: payload.startDate,
    status: payload.status,
    title: payload.title,
    unit: selectedUnit?.name ?? null,
    unitId: payload.unitId,
    unitName: selectedUnit?.name ?? null,
    weighting: payload.weighting,
  };
}

function businessMatchesUnit(business: ProcessBusinessOption, unitId: number | null) {
  return unitId == null || business.unitId == null || business.unitId === unitId;
}

function projectLabel(project: ProjectRecord) {
  return `${project.folio ? `${project.folio} - ` : ''}${project.name}`;
}

function agendaProjectFilterValue(task: AgendaTaskItem) {
  if (task.projectId != null) {
    return `project:${task.projectId}`;
  }

  const fallbackLabel = compactText(task.projectName ?? task.project ?? task.projectFolio);
  return fallbackLabel ? `project-legacy:${fallbackLabel.toLowerCase()}` : NO_PROJECT_VALUE;
}

function agendaProjectFilterLabel(task: AgendaTaskItem, copy: AgendaTranslations) {
  if (task.projectId != null) {
    const label = compactText(task.projectName ?? task.project);
    const folio = compactText(task.projectFolio);
    return label ? `${folio ? `${folio} - ` : ''}${label}` : `${copy.form.labels.project} #${task.projectId}`;
  }

  const fallbackLabel = compactText(task.projectName ?? task.project ?? task.projectFolio);
  return fallbackLabel || copy.form.empty.project;
}

function agendaProjectOptions(tasks: AgendaTaskItem[], copy: AgendaTranslations) {
  const optionMap = new Map<string, AgendaProjectFilterOption>();

  tasks.forEach((task) => {
    const value = agendaProjectFilterValue(task);
    if (!optionMap.has(value)) {
      optionMap.set(value, {
        value,
        label: agendaProjectFilterLabel(task, copy),
      });
    }
  });

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.value === NO_PROJECT_VALUE) {
      return -1;
    }

    if (right.value === NO_PROJECT_VALUE) {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });
}

function dateFromTimelineValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleDateKeyFromValue(value: string | null | undefined) {
  const date = dateFromTimelineValue(value);
  return date ? toDateInputValue(date) : null;
}

function getTaskScheduleDateKey(task: AgendaTaskItem) {
  return scheduleDateKeyFromValue(task.dueDate ?? task.agendaDate ?? task.startDate ?? task.createdAt);
}

function scheduleCellKey(dateKey: string, hour: string) {
  return `${dateKey}-${hour}`;
}

function dateInputValueToDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getWeekDateKeys(dateKey: string) {
  const weekStart = startOfWeek(dateInputValueToDate(dateKey));
  return Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(weekStart, index)));
}

function formatScheduleDayLabel(dateKey: string, format: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: format === 'short' ? 'short' : 'long',
    day: 'numeric',
    month: 'short',
  }).format(dateInputValueToDate(dateKey));
}

function formatScheduleWeekRange(dateKeys: string[]) {
  const firstDate = dateKeys[0];
  const lastDate = dateKeys[dateKeys.length - 1];

  if (!firstDate || !lastDate) {
    return '';
  }

  return `${formatScheduleDayLabel(firstDate)} - ${formatScheduleDayLabel(lastDate)}`;
}

function normalizeScheduleHourInput(value: string) {
  if (!value) {
    return null;
  }

  const [rawHour] = value.split(':');
  const hour = Number(rawHour);

  if (!Number.isFinite(hour)) {
    return null;
  }

  return `${String(Math.max(0, Math.min(23, hour))).padStart(2, '0')}:00`;
}

function reportValue(value: string | number | null | undefined, fallback: string) {
  if (value == null || value === '') {
    return fallback;
  }

  return String(value);
}

function taskReportRows(task: AgendaTaskItem, copy: AgendaTranslations) {
  const fields = copy.report.fields;

  return [
    [fields.folio, task.folio],
    [fields.type, copy.taskTypes[task.taskType]],
    [fields.title, task.title],
    [fields.description, task.description ?? copy.common.noDescription],
    [fields.unit, task.unitName ?? (task.unitId ? `${fields.unit} #${task.unitId}` : copy.form.empty.unit)],
    [fields.business, task.businessName ?? (task.businessId ? `${fields.business} #${task.businessId}` : copy.form.empty.business)],
    [fields.project, task.projectName ?? (task.projectId ? `${fields.project} #${task.projectId}` : copy.form.empty.project)],
    [fields.process, task.processTitle ?? (task.processId ? `${fields.process} #${task.processId}` : copy.form.empty.process)],
    [fields.status, copy.statuses[getTaskDisplayStatus(task)]],
    [fields.priority, copy.priorities[task.priority]],
    [fields.creator, task.createdByName ?? task.creator ?? copy.common.noRecord],
    [fields.responsible, task.assignedName ?? copy.common.unassigned],
    [fields.createdAt, task.createdAt ? formatDate(task.createdAt, true) : copy.common.noDate],
    [fields.startDate, task.startDate ? formatDate(task.startDate) : copy.common.noDate],
    [fields.dueDate, task.dueDate ? formatDate(task.dueDate) : copy.common.noDate],
    [fields.closedAt, task.completedAt ? formatDate(task.completedAt, true) : copy.common.pending],
    [fields.completion, `${clampPercent(task.completionPercent)}%`],
    [fields.weighting, formatWeightingScore(task.weighting, copy.table.noWeighting)],
    [fields.notes, task.notes ?? copy.common.noNotes],
    [fields.auditNotes, task.auditNotes ?? copy.common.noAuditNotes],
  ];
}

export default function Agenda() {
  const location = useLocation();
  const initialDeepLinkFilters = agendaDeepLinkFilters(location.search);
  const agendaCopy = useAgendaTranslations();
  const headerCopy = agendaCopy.header;
  const periodLabels = agendaCopy.periods;
  const defaultAgendaColumns = useMemo(() => createDefaultAgendaColumns(agendaCopy), [agendaCopy]);
  const fixedAgendaColumns = useMemo<ColumnConfig[]>(
    () => [
      {
        id: 'actions',
        label: agendaCopy.columns.actions.label,
        visible: true,
        locked: true,
        description: agendaCopy.columns.actions.description,
      },
    ],
    [agendaCopy],
  );
  const agendaKanbanColumns = useMemo(() => createAgendaKanbanColumns(agendaCopy), [agendaCopy]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(initialDeepLinkFilters.period ?? 'mine');
  const [viewMode, setViewMode] = useState<AgendaViewMode>('table');
  const [scheduleViewMode, setScheduleViewMode] = useState<AgendaScheduleViewMode>('day');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => toDateInputValue(new Date()));
  const [customDateFrom, setCustomDateFrom] = useState(() => initialDeepLinkFilters.from ?? toDateInputValue(new Date()));
  const [customDateTo, setCustomDateTo] = useState(() => initialDeepLinkFilters.to ?? toDateInputValue(new Date()));
  const [tasks, setTasks] = useState<AgendaTaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [agendaNotice, setAgendaNotice] = useState<string | null>(null);
  const [agendaColumns, setAgendaColumns] = useState<ColumnConfig[]>(() =>
    getInitialAgendaColumns(defaultAgendaColumns),
  );
  const [agendaColumnWidths, setAgendaColumnWidths] = useState<Record<AgendaTableColumnId, number>>(() =>
    getInitialAgendaColumnWidths(),
  );
  const [sortState, setSortState] = useState<AgendaSortState>({
    columnId: 'dueDate',
    direction: 'asc',
  });
  const [resizingColumn, setResizingColumn] = useState<AgendaTableColumnId | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [scheduleDraggingTaskId, setScheduleDraggingTaskId] = useState<number | null>(null);
  const [agendaSchedulePlacements, setAgendaSchedulePlacements] = useState<AgendaSchedulePlacements>(() =>
    getInitialAgendaSchedulePlacements(),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialDeepLinkFilters.status ?? 'all');
  const [unitFilter, setUnitFilter] = useState<OptionFilter>(initialDeepLinkFilters.unit ?? 'all');
  const [businessFilter, setBusinessFilter] = useState<OptionFilter>(initialDeepLinkFilters.business ?? 'all');
  const [projectFilter, setProjectFilter] = useState<OptionFilter>('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<OptionFilter>(initialDeepLinkFilters.collaborator ?? 'all');
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [catalogUnits, setCatalogUnits] = useState<ProcessUnitOption[]>([]);
  const [catalogBusinesses, setCatalogBusinesses] = useState<ProcessBusinessOption[]>([]);
  const [catalogCollaborators, setCatalogCollaborators] = useState<ProcessCollaboratorOption[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDialogMode, setTaskDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(() => createDefaultTaskForm());
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([]);
  const [completionTask, setCompletionTask] = useState<AgendaTaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPercent, setCompletionPercent] = useState('100');
  const [auditTask, setAuditTask] = useState<AgendaTaskItem | null>(null);
  const [auditWeighting, setAuditWeighting] = useState(String(maximumAuditWeighting));
  const [auditNotes, setAuditNotes] = useState('');
  const [attachmentsTask, setAttachmentsTask] = useState<AgendaTaskItem | null>(null);
  const [reportTask, setReportTask] = useState<AgendaTaskItem | null>(null);
  const [deleteTask, setDeleteTask] = useState<AgendaTaskItem | null>(null);
  const [isTaskKioskModalOpen, setIsTaskKioskModalOpen] = useState(false);
  const [isTaskKioskSaving, setIsTaskKioskSaving] = useState(false);
  const [taskKiosks, setTaskKiosks] = useState<ProcessTaskKiosk[]>([]);
  const rowSelection = useRowSelection<number>();
  const [bulkConfirmation, setBulkConfirmation] = useState<'delete' | 'complete' | null>(null);
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkResponsibleValue, setBulkResponsibleValue] = useState(UNASSIGNED_RESPONSIBLE_VALUE);

  const activeRange = useMemo(
    () => periodRange(periodFilter, customDateFrom, customDateTo),
    [customDateFrom, customDateTo, periodFilter],
  );

  useEffect(() => {
    const filters = agendaDeepLinkFilters(location.search);

    if (filters.period) {
      setPeriodFilter(filters.period);
    }
    if (filters.from) {
      setCustomDateFrom(filters.from);
    }
    if (filters.to) {
      setCustomDateTo(filters.to);
    }
    if (filters.status) {
      setStatusFilter(filters.status);
    }
    if (filters.unit) {
      setUnitFilter(filters.unit);
    }
    if (filters.business) {
      setBusinessFilter(filters.business);
    }
    if (filters.collaborator) {
      setCollaboratorFilter(filters.collaborator);
    }
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      setIsLoadingCurrentUser(true);

      try {
        const session = await authApi.getSessionOrNull();
        if (isMounted) {
          setCurrentUserId(session?.user.id ?? null);
        }
      } catch {
        if (isMounted) {
          setCurrentUserId(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCurrentUser(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAgenda = useCallback(async () => {
    setIsLoadingTasks(true);
    setAgendaError(null);

    try {
      const response = await listAgendaTasks(activeRange.from, activeRange.to);
      setTasks(response.items);
    } catch (error) {
      setTasks([]);
      setAgendaError(getErrorMessage(error, agendaCopy.messages.loadTasks));
    } finally {
      setIsLoadingTasks(false);
    }
  }, [activeRange.from, activeRange.to, agendaCopy.messages.loadTasks]);

  const publicTaskKioskUrl = useCallback((kiosk: ProcessTaskKiosk) => {
    if (typeof window === 'undefined') {
      return `/task-kiosk/${kiosk.public_access_token}`;
    }
    return `${window.location.origin}/task-kiosk/${kiosk.public_access_token}`;
  }, []);

  const loadTaskKiosks = useCallback(async () => {
    try {
      const response = await processTaskKioskApi.listKiosks();
      setTaskKiosks(response.items);
    } catch (error) {
      setAgendaError(getErrorMessage(error, 'Could not load task access points.'));
    }
  }, []);

  const handleOpenTaskKiosks = () => {
    setIsTaskKioskModalOpen(true);
    void loadTaskKiosks();
  };

  const handleSaveTaskKiosk = async (payload: ProcessTaskKioskPayload, kioskId?: number) => {
    setIsTaskKioskSaving(true);
    setAgendaError(null);
    try {
      if (kioskId) {
        await processTaskKioskApi.updateKiosk(kioskId, payload);
      } else {
        await processTaskKioskApi.createKiosk(payload);
      }
      await loadTaskKiosks();
    } catch (error) {
      setAgendaError(getErrorMessage(error, 'Could not save task access point.'));
      throw error;
    } finally {
      setIsTaskKioskSaving(false);
    }
  };

  const handleDeleteTaskKiosk = async (kiosk: ProcessTaskKiosk) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete ${kiosk.name}?`)) {
      return;
    }
    setIsTaskKioskSaving(true);
    setAgendaError(null);
    try {
      await processTaskKioskApi.deleteKiosk(kiosk.id);
      await loadTaskKiosks();
    } catch (error) {
      setAgendaError(getErrorMessage(error, 'Could not delete task access point.'));
    } finally {
      setIsTaskKioskSaving(false);
    }
  };

  const handleCopyTaskKiosk = (kiosk: ProcessTaskKiosk) => {
    const url = publicTaskKioskUrl(kiosk);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      return;
    }
    setAgendaError(url);
  };

  const handleOpenTaskKiosk = (kiosk: ProcessTaskKiosk) => {
    if (typeof window !== 'undefined') {
      window.open(publicTaskKioskUrl(kiosk), '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(agendaColumnsStorageKey, JSON.stringify(agendaColumns));
  }, [agendaColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(agendaColumnWidthsStorageKey, JSON.stringify(agendaColumnWidths));
  }, [agendaColumnWidths]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(agendaScheduleStorageKey, JSON.stringify(agendaSchedulePlacements));
  }, [agendaSchedulePlacements]);

  useEffect(() => {
    if (!resizingColumn) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.max(
        minimumAgendaColumnWidths[resizingColumn],
        resizeStartWidth + event.clientX - resizeStartX,
      );

      setAgendaColumnWidths((currentWidths) => ({
        ...currentWidths,
        [resizingColumn]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  useEffect(() => {
    const loadRelationsForTaskForm = async () => {
      const [projectResult, processResult, unitResult, businessResult, hrUserResult] = await Promise.allSettled([
        listProjects(),
        listProcesses(),
        dashboardApi.listUnits(),
        dashboardApi.listBusinesses(),
        humanResourcesApi.listHrUsers(),
      ]);

      setProjects(projectResult.status === 'fulfilled' ? projectResult.value : []);
      setProcesses(processResult.status === 'fulfilled' ? processResult.value : []);
      setCatalogUnits(
        unitResult.status === 'fulfilled'
          ? unitResult.value
              .map(normalizeUnitOption)
              .filter((option) => option.name.length > 0)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
      setCatalogBusinesses(
        businessResult.status === 'fulfilled'
          ? businessResult.value
              .map(normalizeBusinessOption)
              .filter((option) => option.name.length > 0)
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

    void loadRelationsForTaskForm();
  }, []);

  const todayAgendaValue = useMemo(() => toDateInputValue(new Date()), []);
  const periodFilteredTasks = useMemo(
    () => tasks.filter((task) => matchesAgendaPeriod(task, periodFilter, todayAgendaValue, currentUserId)),
    [currentUserId, periodFilter, tasks, todayAgendaValue],
  );
  const isAgendaViewLoading = isLoadingTasks || (periodFilter === 'mine' && isLoadingCurrentUser);
  const unitOptions = useMemo(
    () => uniqueSortedOptions(periodFilteredTasks, (task) => unitFilterValue(task, agendaCopy)),
    [agendaCopy, periodFilteredTasks],
  );
  const tasksMatchingSelectedUnit = useMemo(
    () =>
      unitFilter === 'all'
        ? periodFilteredTasks
        : periodFilteredTasks.filter((task) => unitFilterValue(task, agendaCopy) === unitFilter),
    [agendaCopy, periodFilteredTasks, unitFilter],
  );
  const businessOptions = useMemo(
    () => uniqueSortedOptions(tasksMatchingSelectedUnit, (task) => businessFilterValue(task, agendaCopy)),
    [agendaCopy, tasksMatchingSelectedUnit],
  );
  const tasksMatchingSelectedBusiness = useMemo(
    () =>
      businessFilter === 'all'
        ? tasksMatchingSelectedUnit
        : tasksMatchingSelectedUnit.filter((task) => businessFilterValue(task, agendaCopy) === businessFilter),
    [agendaCopy, businessFilter, tasksMatchingSelectedUnit],
  );
  const projectOptions = useMemo(
    () => agendaProjectOptions(tasksMatchingSelectedBusiness, agendaCopy),
    [agendaCopy, tasksMatchingSelectedBusiness],
  );
  const projectOptionMap = useMemo(
    () => new Map(projectOptions.map((option) => [option.value, option])),
    [projectOptions],
  );
  const tasksMatchingSelectedProject = useMemo(
    () =>
      projectFilter === 'all'
        ? tasksMatchingSelectedBusiness
        : tasksMatchingSelectedBusiness.filter((task) => agendaProjectFilterValue(task) === projectFilter),
    [projectFilter, tasksMatchingSelectedBusiness],
  );
  const collaboratorOptions = useMemo(
    () => agendaParticipantOptions(tasksMatchingSelectedProject, agendaCopy.common.unassigned),
    [agendaCopy.common.unassigned, tasksMatchingSelectedProject],
  );
  const collaboratorOptionMap = useMemo(
    () => new Map(collaboratorOptions.map((option) => [option.value, option])),
    [collaboratorOptions],
  );
  const currentUserCollaborator = useMemo(
    () =>
      currentUserId == null
        ? null
        : catalogCollaborators.find((collaborator) => collaborator.userId === currentUserId) ?? null,
    [catalogCollaborators, currentUserId],
  );
  const currentAssignmentScope = useMemo(
    () => resolveCollaboratorAssignmentScope(currentUserCollaborator),
    [currentUserCollaborator],
  );
  const scopedCatalogUnits = useMemo(
    () => filterUnitsForActor(catalogUnits, catalogBusinesses, currentAssignmentScope),
    [catalogBusinesses, catalogUnits, currentAssignmentScope],
  );
  const scopedCatalogBusinesses = useMemo(
    () => filterBusinessesForActor(catalogBusinesses, currentAssignmentScope),
    [catalogBusinesses, currentAssignmentScope],
  );
  const businessOptionsForUnit = useCallback(
    (unitId: number | null) => scopedCatalogBusinesses.filter((business) => businessMatchesUnit(business, unitId)),
    [scopedCatalogBusinesses],
  );

  const collaboratorOptionsForScope = useCallback(
    (unitId: number | null, businessId: number | null) =>
      catalogCollaborators.filter((collaborator) =>
        collaboratorCanReceiveAssignment(collaborator, unitId, businessId, catalogBusinesses),
      ),
    [catalogBusinesses, catalogCollaborators],
  );

  const createDefaultTaskFormForCurrentUser = () => {
    const defaultForm = createDefaultTaskForm();
    const defaultScope = defaultTaskScopeForActor(currentUserCollaborator);

    if (!currentUserCollaborator) {
      return defaultForm;
    }

    return {
      ...defaultForm,
      assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
      assignedName: currentUserCollaborator.name,
      unitId: defaultScope.unitId?.toString() ?? '',
      businessId: defaultScope.businessId?.toString() ?? '',
    };
  };

  useEffect(() => {
    if (!isTaskDialogOpen || taskDialogMode !== 'create' || !currentUserCollaborator) {
      return;
    }

    setTaskForm((currentForm) => {
      if (currentForm.assignedUserCompanyId || currentForm.assignedName) {
        return currentForm;
      }

      return {
        ...currentForm,
        assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
        assignedName: currentUserCollaborator.name,
        unitId: currentForm.unitId || defaultTaskScopeForActor(currentUserCollaborator).unitId?.toString() || '',
        businessId:
          currentForm.businessId || defaultTaskScopeForActor(currentUserCollaborator).businessId?.toString() || '',
      };
    });
  }, [currentUserCollaborator, isTaskDialogOpen, taskDialogMode]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (unitFilter !== 'all' && !unitOptions.includes(unitFilter)) {
      setUnitFilter('all');
    }
  }, [isLoadingTasks, unitFilter, unitOptions]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (businessFilter !== 'all' && !businessOptions.includes(businessFilter)) {
      setBusinessFilter('all');
    }
  }, [businessFilter, businessOptions, isLoadingTasks]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (collaboratorFilter !== 'all' && !collaboratorOptionMap.has(collaboratorFilter)) {
      setCollaboratorFilter('all');
    }
  }, [collaboratorFilter, collaboratorOptionMap, isLoadingTasks]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (projectFilter !== 'all' && !projectOptionMap.has(projectFilter)) {
      setProjectFilter('all');
    }
  }, [isLoadingTasks, projectFilter, projectOptionMap]);

  const resetTaskForm = () => {
    setTaskForm(createDefaultTaskForm());
    setEditingTaskId(null);
  };

  const handleCreateTaskClick = () => {
    setTaskDialogMode('create');
    setEditingTaskId(null);
    setTaskForm(createDefaultTaskFormForCurrentUser());
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: AgendaTaskItem) => {
    setTaskDialogMode('edit');
    setEditingTaskId(task.taskId);
    setTaskForm(toTaskFormValues(task));
    setIsTaskDialogOpen(true);
  };

  const handleTaskDialogOpenChange = (open: boolean) => {
    setIsTaskDialogOpen(open);

    if (!open) {
      resetTaskForm();
    }
  };

  const handleSubmitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingTask(true);
    setAgendaError(null);

    try {
      const payload = buildTaskPayload(taskForm, agendaCopy);

      if (taskDialogMode === 'edit' && editingTaskId != null) {
        await updateProcessTask(editingTaskId, payload);
      } else {
        await createProcessTask(payload);
      }

      setIsTaskDialogOpen(false);
      resetTaskForm();
      await loadAgenda();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Agenda task modal save failed.', { error, taskId: editingTaskId });
      }
      setAgendaError(getErrorMessage(error, agendaCopy.messages.saveTask));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const setTaskPendingState = (taskId: number, isPending: boolean) => {
    setPendingTaskIds((currentIds) =>
      isPending
        ? currentIds.includes(taskId)
          ? currentIds
          : [...currentIds, taskId]
        : currentIds.filter((currentId) => currentId !== taskId),
    );
  };

  const setManyTasksPendingState = (taskIds: number[], isPending: boolean) => {
    setPendingTaskIds((currentIds) => {
      if (isPending) {
        const nextIds = new Set(currentIds);
        taskIds.forEach((taskId) => nextIds.add(taskId));
        return Array.from(nextIds);
      }

      const taskIdSet = new Set(taskIds);
      return currentIds.filter((currentId) => !taskIdSet.has(currentId));
    });
  };

  const isTaskPending = (taskId: number) => pendingTaskIds.includes(taskId);

  const patchTaskInAgenda = (taskId: number, patch: Partial<AgendaTaskItem>) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.taskId === taskId || task.id === taskId
          ? {
              ...task,
              ...patch,
            }
          : task,
      ),
    );
  };

  const handleSort = (columnId: AgendaColumnId) => {
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

  const handleResizeStart = (event: ReactMouseEvent, columnId: AgendaTableColumnId) => {
    event.preventDefault();
    event.stopPropagation();
    setResizingColumn(columnId);
    setResizeStartX(event.clientX);
    setResizeStartWidth(agendaColumnWidths[columnId]);
  };

  const handleCustomDateFromChange = (value: string) => {
    if (!value) {
      return;
    }

    setCustomDateFrom(value);
    if (value > customDateTo) {
      setCustomDateTo(value);
    }
  };

  const handleCustomDateToChange = (value: string) => {
    if (!value) {
      return;
    }

    setCustomDateTo(value);
    if (value < customDateFrom) {
      setCustomDateFrom(value);
    }
  };

  const persistTaskChange = async (task: AgendaTaskItem, patch: Partial<TaskPayload>) => {
    const latestTask = tasks.find((currentTask) => currentTask.taskId === task.taskId) ?? task;
    const nextTitle = 'title' in patch ? patch.title : latestTask.title;
    if (!nextTitle?.trim()) {
      setAgendaError(agendaCopy.messages.titleRequired);
      return;
    }

    setTaskPendingState(task.taskId, true);
    setAgendaError(null);

    try {
      const payload = buildAgendaTaskPayload(latestTask, patch);
      patchTaskInAgenda(
        task.taskId,
        buildAgendaOptimisticPatch(payload, catalogUnits, catalogBusinesses, projects),
      );
      await updateProcessTask(task.taskId, payload);
      await loadAgenda();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Agenda task inline save failed.', { error, patch, taskId: task.taskId });
      }
      setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
      await loadAgenda();
    } finally {
      setTaskPendingState(task.taskId, false);
    }
  };

  const scopeResponsiblePatch = (
    task: AgendaTaskItem,
    unitId: number | null,
    businessId: number | null,
  ): Partial<TaskPayload> => {
    if (task.assignedUserCompanyId == null) {
      return {};
    }

    const currentCollaborator = catalogCollaborators.find(
      (collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId,
    );

    if (
      !currentCollaborator ||
      collaboratorCanReceiveAssignment(currentCollaborator, unitId, businessId, catalogBusinesses)
    ) {
      return {};
    }

    return {
      assignedUserCompanyId: null,
      assignedName: null,
    };
  };

  const handleUnitCellChange = (task: AgendaTaskItem, value: string) => {
    const parsedUnitId = value === NO_UNIT_VALUE ? null : Number(value);
    const nextUnitId =
      typeof parsedUnitId === 'number' && Number.isFinite(parsedUnitId) ? parsedUnitId : null;
    const currentBusiness =
      task.businessId != null
        ? scopedCatalogBusinesses.find((business) => business.id === task.businessId)
        : undefined;
    const nextBusinessId =
      currentBusiness && businessMatchesUnit(currentBusiness, nextUnitId) ? task.businessId : null;

    void persistTaskChange(task, {
      unitId: nextUnitId,
      businessId: nextBusinessId,
      ...scopeResponsiblePatch(task, nextUnitId, nextBusinessId),
    });
  };

  const handleBusinessCellChange = (task: AgendaTaskItem, value: string) => {
    const selectedBusiness =
      value === NO_BUSINESS_VALUE
        ? null
        : scopedCatalogBusinesses.find((business) => business.id === Number(value)) ?? null;
    const nextBusinessId = selectedBusiness?.id ?? null;
    const nextUnitId = selectedBusiness?.unitId ?? task.unitId ?? null;

    void persistTaskChange(task, {
      businessId: nextBusinessId,
      unitId: nextUnitId,
      ...scopeResponsiblePatch(task, nextUnitId, nextBusinessId),
    });
  };

  const handleResponsibleCellChange = (task: AgendaTaskItem, value: string) => {
    if (value === UNASSIGNED_RESPONSIBLE_VALUE) {
      void persistTaskChange(task, {
        assignedUserCompanyId: null,
        assignedName: null,
      });
      return;
    }

    const selectedCollaborator = catalogCollaborators.find(
      (collaborator) => collaborator.userCompanyId === Number(value),
    );

    if (!selectedCollaborator) {
      return;
    }

    void persistTaskChange(task, {
      assignedUserCompanyId: selectedCollaborator.userCompanyId,
      assignedName: selectedCollaborator.name,
      unitId: task.unitId ?? selectedCollaborator.unitId ?? null,
      businessId: task.businessId ?? selectedCollaborator.businessId ?? null,
    });
  };

  const handleProjectCellChange = (task: AgendaTaskItem, value: string) => {
    if (value === NO_PROJECT_VALUE) {
      void persistTaskChange(task, {
        projectId: null,
      });
      return;
    }

    const selectedProject = projects.find((project) => project.id === Number(value));

    if (!selectedProject) {
      return;
    }

    void persistTaskChange(task, {
      projectId: selectedProject.id,
      unitId: task.unitId ?? selectedProject.unitId ?? null,
      businessId: task.businessId ?? selectedProject.businessId ?? null,
    });
  };

  const handleDuplicateTask = async (task: AgendaTaskItem) => {
    setTaskPendingState(task.taskId, true);
    setAgendaError(null);

    try {
      await createProcessTask(
        buildAgendaTaskPayload(task, {
          title: `Copia de ${task.title}`,
          status: 'pending',
          completionPercent: 0,
          audited: false,
          auditNotes: null,
        }),
      );
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.duplicateTask));
    } finally {
      setTaskPendingState(task.taskId, false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteTask) {
      return;
    }

    setTaskPendingState(deleteTask.taskId, true);
    setAgendaError(null);

    try {
      await deleteProcessTask(deleteTask.taskId);
      setDeleteTask(null);
      if (reportTask?.taskId === deleteTask.taskId) {
        setReportTask(null);
      }
      if (attachmentsTask?.taskId === deleteTask.taskId) {
        setAttachmentsTask(null);
      }
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.deleteTask));
    } finally {
      setTaskPendingState(deleteTask.taskId, false);
    }
  };

  const runBulkTaskAction = async (
    action: 'delete' | 'duplicate' | 'complete' | 'priority' | 'assign',
    payload?: { collaborator?: ProcessCollaboratorOption | null; priority?: TaskPriority },
  ) => {
    if (selectedTasks.length === 0) {
      return;
    }

    const selectedTaskIds = selectedTasks.map((task) => task.taskId);

    setIsBulkActionRunning(true);
    setManyTasksPendingState(selectedTaskIds, true);
    setAgendaError(null);
    setAgendaNotice(null);

    try {
      if (action === 'delete') {
        await Promise.all(selectedTasks.map((task) => deleteProcessTask(task.taskId)));
      }

      if (action === 'duplicate') {
        await Promise.all(
          selectedTasks.map((task) =>
            createProcessTask(
              buildAgendaTaskPayload(task, {
                title: `Copia de ${task.title}`,
                status: 'pending',
                completionPercent: 0,
                audited: false,
                auditNotes: null,
              }),
            ),
          ),
        );
      }

      if (action === 'complete') {
        const completableTasks = selectedTasks.filter(
          (task) => task.status !== 'completed' && task.status !== 'cancelled',
        );
        await Promise.all(
          completableTasks.map((task) =>
            completeProcessTask(
              task.taskId,
              task.completionNotes ?? null,
              task.completionPercent > 0 ? clampPercent(task.completionPercent) : 100,
            ),
          ),
        );
      }

      if (action === 'priority' && payload?.priority) {
        await Promise.all(
          selectedTasks.map((task) =>
            updateProcessTask(task.taskId, buildAgendaTaskPayload(task, { priority: payload.priority })),
          ),
        );
      }

      if (action === 'assign') {
        const collaborator = payload?.collaborator ?? null;
        await Promise.all(
          selectedTasks.map((task) =>
            updateProcessTask(
              task.taskId,
              buildAgendaTaskPayload(task, {
                assignedUserCompanyId: collaborator?.userCompanyId ?? null,
                assignedName: collaborator?.name ?? null,
                unitId: task.unitId ?? collaborator?.unitId ?? null,
                businessId: task.businessId ?? collaborator?.businessId ?? null,
              }),
            ),
          ),
        );
      }

      if (reportTask && selectedTaskIds.includes(reportTask.taskId)) {
        setReportTask(null);
      }
      if (attachmentsTask && selectedTaskIds.includes(attachmentsTask.taskId)) {
        setAttachmentsTask(null);
      }

      rowSelection.clearSelection();
      setBulkConfirmation(null);
      setIsBulkAssignOpen(false);
      setBulkResponsibleValue(UNASSIGNED_RESPONSIBLE_VALUE);
      setAgendaNotice(`Accion masiva aplicada a ${selectedTasks.length} tarea${selectedTasks.length === 1 ? '' : 's'}.`);
      await loadAgenda();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Agenda bulk task action failed.', { action, error, selectedTaskIds });
      }
      setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
      await loadAgenda();
    } finally {
      setManyTasksPendingState(selectedTaskIds, false);
      setIsBulkActionRunning(false);
    }
  };

  const handleBulkAssign = () => {
    const collaborator =
      bulkResponsibleValue === UNASSIGNED_RESPONSIBLE_VALUE
        ? null
        : catalogCollaborators.find(
            (currentCollaborator) => currentCollaborator.userCompanyId === Number(bulkResponsibleValue),
          ) ?? null;

    void runBulkTaskAction('assign', { collaborator });
  };

  const handleDownloadTaskReport = (task: AgendaTaskItem) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`${agendaCopy.report.title} - ${task.folio}`, 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(90, 98, 112);
    doc.text(task.title, 14, 27);

    autoTable(doc, {
      startY: 36,
      theme: 'grid',
      head: [[agendaCopy.report.pdf.headField, agendaCopy.report.pdf.headValue]],
      body: taskReportRows(task, agendaCopy),
      styles: {
        cellPadding: 3,
        fontSize: 9,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [235, 165, 52],
      },
      columnStyles: {
        0: { cellWidth: 54, fontStyle: 'bold' },
        1: { cellWidth: 126 },
      },
    });

    doc.save(`${task.folio}-${agendaCopy.report.pdf.filePrefix}.pdf`);
  };

  const handleCloseTask = (task: AgendaTaskItem) => {
    setCompletionTask(task);
    setCompletionNotes(task.completionNotes ?? '');
    setCompletionPercent(String(task.completionPercent > 0 ? task.completionPercent : 100));
  };

  const handleCompletionDialogOpenChange = (open: boolean) => {
    if (!open) {
      setCompletionTask(null);
      setCompletionNotes('');
      setCompletionPercent('100');
    }
  };

  const handleConfirmComplete = async () => {
    if (!completionTask) {
      return;
    }

    const parsedCompletion = Number(completionPercent || 100);
    if (!Number.isInteger(parsedCompletion) || parsedCompletion < 0 || parsedCompletion > 100) {
      setAgendaError(agendaCopy.messages.invalidCompletion);
      return;
    }

    setTaskPendingState(completionTask.taskId, true);
    setAgendaError(null);

    try {
      await completeProcessTask(completionTask.taskId, completionNotes, parsedCompletion);
      patchTaskInAgenda(completionTask.taskId, {
        status: 'completed',
        completionPercent: parsedCompletion,
        completion: parsedCompletion,
        completionNotes: completionNotes.trim() ? completionNotes.trim() : null,
        audited: false,
        auditNotes: null,
        auditStatus: 'pending',
        isOverdue: false,
      });
      handleCompletionDialogOpenChange(false);
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.closeTask));
    } finally {
      setTaskPendingState(completionTask.taskId, false);
    }
  };

  const handleAuditTask = (task: AgendaTaskItem) => {
    const normalizedWeighting = normalizeWeighting(task.weighting);

    setAuditTask(task);
    setAuditWeighting(normalizedWeighting != null ? String(normalizedWeighting) : String(maximumAuditWeighting));
    setAuditNotes(task.auditNotes ?? '');
  };

  const handleAuditDialogOpenChange = (open: boolean) => {
    if (!open) {
      setAuditTask(null);
      setAuditWeighting(String(maximumAuditWeighting));
      setAuditNotes('');
    }
  };

  const handleConfirmAudit = async () => {
    if (!auditTask) {
      return;
    }

    const parsedWeighting = Number(auditWeighting);
    if (!Number.isInteger(parsedWeighting) || parsedWeighting < 0 || parsedWeighting > maximumAuditWeighting) {
      setAgendaError(agendaCopy.messages.weightingRange(maximumAuditWeighting));
      return;
    }

    setTaskPendingState(auditTask.taskId, true);
    setAgendaError(null);

    try {
      await auditProcessTask(auditTask.taskId, parsedWeighting, auditNotes);
      patchTaskInAgenda(auditTask.taskId, {
        status: 'completed',
        audited: true,
        auditStatus: 'audited',
        auditNotes: auditNotes.trim() ? auditNotes.trim() : null,
        weighting: parsedWeighting,
        isOverdue: false,
      });
      handleAuditDialogOpenChange(false);
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.auditTask));
    } finally {
      setTaskPendingState(auditTask.taskId, false);
    }
  };

  const filteredTasks = useMemo(() => {
    const selectedCollaborator =
      collaboratorFilter === 'all' ? null : collaboratorOptionMap.get(collaboratorFilter) ?? null;

    return tasksMatchingSelectedProject.filter((task) => {
      const matchesCollaborator =
        selectedCollaborator == null || taskMatchesParticipantFilter(task, selectedCollaborator);
      const matchesStatus = taskMatchesStatusFilter(task, statusFilter);

      return matchesCollaborator && matchesStatus;
    });
  }, [collaboratorFilter, collaboratorOptionMap, statusFilter, tasksMatchingSelectedProject]);

  const sortedTasks = useMemo(() => {
    return filteredTasks
      .map((task, index) => ({ index, task }))
      .sort((left, right) => {
        const comparison = compareAgendaSortValues(
          getAgendaSortValue(left.task, sortState.columnId, agendaCopy),
          getAgendaSortValue(right.task, sortState.columnId, agendaCopy),
          sortState.direction,
        );

        return comparison === 0 ? left.index - right.index : comparison;
      })
      .map(({ task }) => task);
  }, [agendaCopy, filteredTasks, sortState.columnId, sortState.direction]);
  const sortedTaskMap = useMemo(
    () => new Map(sortedTasks.map((task) => [task.taskId, task])),
    [sortedTasks],
  );
  const visibleTaskIds = useMemo(() => sortedTasks.map((task) => task.taskId), [sortedTasks]);
  const visibleTaskSelection = rowSelection.visibleSelectionState(visibleTaskIds);
  const selectedTasks = useMemo(
    () => tasks.filter((task) => rowSelection.selectedIds.has(task.taskId)),
    [rowSelection.selectedIds, tasks],
  );
  const scheduleTaskPlacement = useCallback(
    (dateKey: string, hour: string | null) => {
      if (scheduleDraggingTaskId == null) {
        return;
      }

      setAgendaSchedulePlacements((currentPlacements) => ({
        ...currentPlacements,
        [String(scheduleDraggingTaskId)]: { date: dateKey, hour },
      }));
      setScheduleDraggingTaskId(null);
    },
    [scheduleDraggingTaskId],
  );

  const scheduleTaskDatePlacement = useCallback(
    (dateKey: string) => {
      if (scheduleDraggingTaskId == null) {
        return;
      }

      const currentPlacement = agendaSchedulePlacements[String(scheduleDraggingTaskId)];

      setAgendaSchedulePlacements((currentPlacements) => ({
        ...currentPlacements,
        [String(scheduleDraggingTaskId)]: { date: dateKey, hour: currentPlacement?.hour ?? null },
      }));
      setScheduleDraggingTaskId(null);
    },
    [agendaSchedulePlacements, scheduleDraggingTaskId],
  );

  const updateTaskSchedulePlacement = useCallback((taskId: number, dateKey: string, hour: string | null) => {
    setAgendaSchedulePlacements((currentPlacements) => ({
      ...currentPlacements,
      [String(taskId)]: { date: dateKey, hour },
    }));
  }, []);

  const unscheduleDraggedTask = useCallback((dateKeyOverride?: string) => {
    if (scheduleDraggingTaskId == null) {
      return;
    }

    const draggedTask = sortedTaskMap.get(scheduleDraggingTaskId);
    const currentPlacement = agendaSchedulePlacements[String(scheduleDraggingTaskId)];
    const dateKey =
      dateKeyOverride ??
      currentPlacement?.date ??
      (draggedTask ? getTaskScheduleDateKey(draggedTask) : null) ??
      todayAgendaValue;

    setAgendaSchedulePlacements((currentPlacements) => ({
      ...currentPlacements,
      [String(scheduleDraggingTaskId)]: { date: dateKey, hour: null },
    }));
    setScheduleDraggingTaskId(null);
  }, [agendaSchedulePlacements, scheduleDraggingTaskId, sortedTaskMap, todayAgendaValue]);

  useEffect(() => {
    rowSelection.pruneSelection(tasks.map((task) => task.taskId));
  }, [rowSelection.pruneSelection, tasks]);

  const kanbanTasksByColumn = useMemo(() => {
    const groupedTasks = new Map<AgendaKanbanColumnId, AgendaTaskItem[]>();
    agendaKanbanColumns.forEach((column) => groupedTasks.set(column.id, []));

    sortedTasks.forEach((task) => {
      groupedTasks.get(getTaskKanbanColumnId(task))?.push(task);
    });

    return groupedTasks;
  }, [agendaKanbanColumns, sortedTasks]);

  const handleKanbanDrop = (columnId: AgendaKanbanColumnId) => {
    const draggedTask = sortedTasks.find((task) => task.taskId === draggingTaskId);

    setDraggingTaskId(null);

    if (!draggedTask) {
      return;
    }

    if (columnId === getTaskKanbanColumnId(draggedTask)) {
      return;
    }

    if (columnId === 'overdue') {
      setAgendaError(agendaCopy.messages.overdueDragBlocked);
      return;
    }

    if (columnId === 'completed') {
      if (draggedTask.status !== 'completed') {
        handleCloseTask(draggedTask);
      }
      return;
    }

    if (columnId === 'audited') {
      if (draggedTask.status !== 'completed') {
        setAgendaError(agendaCopy.messages.closeBeforeAudit);
        return;
      }

      handleAuditTask(draggedTask);
      return;
    }

    void persistTaskChange(draggedTask, {
      status: columnId,
      audited: false,
      auditNotes: null,
      weighting: null,
      completionPercent: columnId === 'pending' ? 0 : draggedTask.completionPercent,
    });
  };

  const agendaKpiMetrics = useMemo<AgendaKpiMetrics>(() => {
    const totalCount = filteredTasks.length;
    const actionableTasks = filteredTasks.filter((task) => task.status !== 'cancelled');
    const actionableCount = actionableTasks.length;
    const overdueCount = filteredTasks.filter(isTaskOverdue).length;
    const completedTasks = filteredTasks.filter((task) => task.status === 'completed');
    const completedCount = completedTasks.length;
    const auditedCount = filteredTasks.filter((task) => task.audited).length;
    const pendingAuditCount = completedTasks.filter((task) => !task.audited).length;
    const cancelledCount = filteredTasks.filter((task) => task.status === 'cancelled').length;
    const openCount = filteredTasks.filter((task) =>
      ['pending', 'in_progress', 'paused'].includes(task.status),
    ).length;
    const activeOnTrackCount = Math.max(0, openCount - overdueCount);
    const averageCompletion =
      actionableCount > 0
        ? Math.round(
            actionableTasks.reduce((sum, task) => sum + clampPercent(task.completionPercent), 0) /
              actionableCount,
          )
        : 0;
    const auditedTasksWithWeighting = filteredTasks.filter(
      (task) => task.audited && typeof task.weighting === 'number',
    );
    const averageWeighting =
      auditedTasksWithWeighting.length > 0
        ? Math.round(
            auditedTasksWithWeighting.reduce((sum, task) => sum + (normalizeWeighting(task.weighting) ?? 0), 0) /
              auditedTasksWithWeighting.length,
          )
        : null;
    const completionRate = actionableCount > 0 ? (completedCount / actionableCount) * 100 : 0;
    const timelinessRate = actionableCount > 0 ? ((actionableCount - overdueCount) / actionableCount) * 100 : 0;
    const auditRate = completedCount > 0 ? (auditedCount / completedCount) * 100 : 0;
    const qualityScore = averageWeighting != null ? averageWeighting * 20 : auditRate;
    const productivityScore =
      actionableCount > 0
        ? Math.round(
            averageCompletion * 0.35 +
              completionRate * 0.25 +
              Math.max(0, timelinessRate) * 0.2 +
              auditRate * 0.1 +
              qualityScore * 0.1,
          )
        : 0;

    return {
      activeOnTrackCount,
      auditedCount,
      averageCompletion,
      averageWeighting,
      cancelledCount,
      completedCount,
      openCount,
      overdueCount,
      pendingAuditCount,
      productivityScore: clampPercent(productivityScore),
      totalCount,
    };
  }, [filteredTasks]);
  const translatedAgendaColumns = useMemo(
    () => {
      const defaultColumnMap = new Map(defaultAgendaColumns.map((column) => [column.id, column]));

      return agendaColumns
        .map((column) => {
          const defaultColumn = defaultColumnMap.get(column.id);
          return defaultColumn ? { ...column, label: defaultColumn.label, description: defaultColumn.description } : column;
        });
    },
    [agendaColumns, defaultAgendaColumns],
  );
  const visibleAgendaColumns = useMemo(
    () => translatedAgendaColumns.filter((column) => column.visible),
    [translatedAgendaColumns],
  );
  const agendaTableColumnCount = visibleAgendaColumns.length + fixedAgendaColumns.length + 1;
  const agendaTableMinWidth = useMemo(
    () =>
      Math.max(
        1120,
        selectionColumnWidth +
        visibleAgendaColumns.reduce(
          (totalWidth, column) => totalWidth + agendaColumnWidths[column.id as AgendaColumnId],
          0,
        ) +
          fixedAgendaColumns.reduce(
            (totalWidth, column) => totalWidth + agendaColumnWidths[column.id as AgendaFixedColumnId],
            0,
          ),
      ),
    [agendaColumnWidths, fixedAgendaColumns, visibleAgendaColumns],
  );

  const renderTaskActions = (task: AgendaTaskItem) => {
    const pending = isTaskPending(task.taskId);

    return (
      <div className="flex w-full min-w-[310px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
        <TableActionButton
          label={agendaCopy.actions.closeTask}
          onClick={() => handleCloseTask(task)}
          disabled={pending || task.status === 'completed' || task.status === 'cancelled'}
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <TableActionButton
          label={agendaCopy.actions.taskReport}
          onClick={() => setReportTask(task)}
          disabled={pending}
          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          icon={<FileText className="h-4 w-4" />}
        />
        <TableActionButton
          label={task.audited ? agendaCopy.actions.correctAudit : agendaCopy.actions.auditTask}
          onClick={() => handleAuditTask(task)}
          disabled={pending || task.status !== 'completed'}
          className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <TableActionButton
          label={agendaCopy.actions.editTask}
          onClick={() => handleEditTask(task)}
          disabled={pending}
          className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
          icon={<Pencil className="h-4 w-4" />}
        />
        <TableActionButton
          label={agendaCopy.actions.copyTask}
          onClick={() => {
            void handleDuplicateTask(task);
          }}
          disabled={pending}
          className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
          icon={<Copy className="h-4 w-4" />}
        />
        <TableActionButton
          label={agendaCopy.actions.deleteTask}
          onClick={() => setDeleteTask(task)}
          disabled={pending}
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>
    );
  };

  const renderAgendaTaskCell = (task: AgendaTaskItem, columnId: AgendaColumnId): ReactNode => {
    const pending = isTaskPending(task.taskId);

    switch (columnId) {
      case 'folio':
        return <div className="w-full text-sm font-semibold text-slate-900 dark:text-white">{task.folio}</div>;
      case 'type':
        return (
          <Badge variant="outline" className="w-full rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-center font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            {agendaCopy.taskTypes[task.taskType]}
          </Badge>
        );
      case 'unit': {
        const unitSelectValue = task.unitId != null ? String(task.unitId) : NO_UNIT_VALUE;
        const currentUnitMissing = task.unitId != null && !scopedCatalogUnits.some((unit) => unit.id === task.unitId);

        return (
          <Select
            value={unitSelectValue}
            disabled={pending}
            onValueChange={(value) => handleUnitCellChange(task, value)}
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_UNIT_VALUE}>{agendaCopy.form.empty.unit}</SelectItem>
              {currentUnitMissing ? (
                <SelectItem value={String(task.unitId)}>
                  {task.unitName ?? `${agendaCopy.form.labels.unit} #${task.unitId}`}
                </SelectItem>
              ) : null}
              {scopedCatalogUnits.map((unit) => (
                <SelectItem key={unit.id} value={String(unit.id)}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'business': {
        const businessSelectValue = task.businessId != null ? String(task.businessId) : NO_BUSINESS_VALUE;
        const rowBusinessOptions = businessOptionsForUnit(task.unitId);
        const currentBusinessMissing =
          task.businessId != null && !rowBusinessOptions.some((business) => business.id === task.businessId);

        return (
          <Select
            value={businessSelectValue}
            disabled={pending}
            onValueChange={(value) => handleBusinessCellChange(task, value)}
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_BUSINESS_VALUE}>{agendaCopy.form.empty.business}</SelectItem>
              {currentBusinessMissing ? (
                <SelectItem value={String(task.businessId)}>
                  {task.businessName ?? `${agendaCopy.form.labels.business} #${task.businessId}`}
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
      case 'title':
        return (
          <InlineTextInput
            value={task.title}
            placeholder={agendaCopy.report.fields.title}
            disabled={pending}
            className="w-full"
            onCommit={(title) => persistTaskChange(task, { title })}
          />
        );
      case 'description':
        return (
          <InlineTextArea
            value={task.description}
            placeholder={agendaCopy.common.noDescription}
            disabled={pending}
            className="w-full"
            onCommit={(description) => persistTaskChange(task, { description: description || null })}
          />
        );
      case 'createdAt':
        return (
          <div className="w-full text-sm font-medium text-slate-900 dark:text-white">
            {task.createdAt ? formatDate(task.createdAt, true) : agendaCopy.common.noDate}
          </div>
        );
      case 'startDate':
        return (
          <Input
            type="date"
            value={task.startDate ?? ''}
            disabled={pending}
            className={cn(tableInputClass, 'w-full')}
            onChange={(event) => void persistTaskChange(task, { startDate: event.target.value || null })}
          />
        );
      case 'dueDate':
        return (
          <Input
            type="date"
            value={task.dueDate ?? ''}
            disabled={pending}
            className={cn(tableInputClass, 'w-full')}
            onChange={(event) => void persistTaskChange(task, { dueDate: event.target.value || null })}
          />
        );
      case 'status': {
        const displayStatus = getTaskDisplayStatus(task);

        return (
          <Select
            value={displayStatus}
            disabled={pending}
            onValueChange={(value) => {
              if (value === 'overdue' || value === 'audited') {
                return;
              }

              const nextStatus = value as TaskStatus;
              void persistTaskChange(task, {
                status: nextStatus,
                completionPercent: nextStatus === 'completed' ? 100 : task.completionPercent,
                ...(nextStatus === 'completed'
                  ? {}
                  : {
                      audited: false,
                      auditNotes: null,
                      weighting: null,
                    }),
              });
            }}
          >
            <SelectTrigger
              className={cn(
                tableSelectTriggerClass,
                'w-full',
                displayStatus === 'overdue' &&
                  'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayStatus === 'overdue' ? (
                <SelectItem value="overdue" disabled>
                  {agendaCopy.statuses.overdue}
                </SelectItem>
              ) : null}
              {displayStatus === 'audited' ? (
                <SelectItem value="audited" disabled>
                  {agendaCopy.statuses.audited}
                </SelectItem>
              ) : null}
              {(['pending', 'in_progress', 'paused', 'completed', 'cancelled'] as TaskStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {agendaCopy.statuses[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'creator':
        return (
          <div className="w-full space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-medium text-slate-900 dark:text-white">
              {task.createdByName ?? task.creator ?? agendaCopy.common.noRecord}
            </p>
            {task.createdBy ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Usuario #{task.createdBy}</p>
            ) : null}
          </div>
        );
      case 'responsible': {
        const responsibleSelectValue =
          task.assignedUserCompanyId != null ? String(task.assignedUserCompanyId) : UNASSIGNED_RESPONSIBLE_VALUE;
        const rowCollaboratorOptions = collaboratorOptionsForScope(task.unitId, task.businessId);
        const currentCollaboratorMissing =
          task.assignedUserCompanyId != null &&
          !rowCollaboratorOptions.some((collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId);

        return (
          <Select
            value={responsibleSelectValue}
            disabled={pending}
            onValueChange={(value) => handleResponsibleCellChange(task, value)}
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_RESPONSIBLE_VALUE}>{agendaCopy.common.unassigned}</SelectItem>
              {currentCollaboratorMissing ? (
                <SelectItem value={String(task.assignedUserCompanyId)}>
                  {task.assignedName ?? `User #${task.assignedUserCompanyId}`}
                </SelectItem>
              ) : null}
              {rowCollaboratorOptions.map((collaborator) => (
                <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>
                  {collaborator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'priority':
        return (
          <Select
            value={task.priority}
            disabled={pending}
            onValueChange={(value) => void persistTaskChange(task, { priority: value as TaskPriority })}
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['low', 'medium', 'high'] as TaskPriority[]).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {agendaCopy.priorities[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'attachments':
        return (
          <button
            type="button"
            title={agendaCopy.actions.files}
            disabled={pending}
            onClick={() => setAttachmentsTask(task)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-3 py-2 text-sm font-semibold text-[#9A6B05] transition-colors hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
          >
            <FolderOpen className="h-4 w-4" />
            {task.attachments}
          </button>
        );
      case 'project': {
        const projectSelectValue = task.projectId != null ? String(task.projectId) : NO_PROJECT_VALUE;
        const currentProjectMissing = task.projectId != null && !projects.some((project) => project.id === task.projectId);

        return (
          <Select
            value={projectSelectValue}
            disabled={pending}
            onValueChange={(value) => handleProjectCellChange(task, value)}
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT_VALUE}>{agendaCopy.form.empty.project}</SelectItem>
              {currentProjectMissing ? (
                <SelectItem value={String(task.projectId)}>
                  {task.projectFolio ? `${task.projectFolio} - ` : ''}
                  {task.projectName ?? `${agendaCopy.form.labels.project} #${task.projectId}`}
                </SelectItem>
              ) : null}
              {projects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {projectLabel(project)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'completion':
        return (
          <div className="w-full min-w-[170px]">
            <ProgressSlider
              value={clampPercent(task.completionPercent)}
              label={agendaCopy.form.labels.completion}
              disabled={pending}
              onCommit={(completionPercent) => persistTaskChange(task, { completionPercent })}
            />
          </div>
        );
      case 'notes':
        return (
          <div className="w-full space-y-2">
            <p className={cn(
              'line-clamp-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 dark:border-slate-700 dark:bg-slate-900/70',
              task.notes ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500',
            )}>
              {task.notes || agendaCopy.common.noNotes}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="h-8 rounded-xl border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 shadow-none hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
              onClick={() => handleEditTask(task)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {agendaCopy.actions.editTask}
            </Button>
          </div>
        );
      case 'weighting':
        return (
          <div className="flex w-full flex-col items-start gap-2">
            <Badge
              variant="outline"
              className={cn(
                'w-fit rounded-full px-3 py-1 font-semibold',
                task.audited
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
              )}
            >
              {formatWeightingScore(task.weighting, agendaCopy.table.noWeighting)}
            </Badge>
            {task.status === 'completed' ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="h-8 rounded-xl border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 shadow-none hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
                onClick={() => handleAuditTask(task)}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                {task.audited ? agendaCopy.actions.correctAudit : agendaCopy.actions.auditTask}
              </Button>
            ) : (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{agendaCopy.auditStatuses.not_ready}</p>
            )}
          </div>
        );
      case 'auditNotes':
        return (
          <div className="flex w-full flex-col items-start gap-2">
            <Badge
              variant="outline"
              className={cn('rounded-full px-3 py-1 font-semibold', auditStatusClasses[task.auditStatus])}
            >
              {agendaCopy.auditStatuses[task.auditStatus]}
            </Badge>
            {task.audited ? (
              <p className={cn(
                'line-clamp-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 dark:border-slate-700 dark:bg-slate-900/70',
                task.auditNotes ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500',
              )}>
                {task.auditNotes || agendaCopy.common.noAuditNotes}
              </p>
            ) : null}
            {task.status === 'completed' ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="h-9 rounded-xl border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 shadow-none hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
                onClick={() => handleAuditTask(task)}
              >
                <ClipboardCheck className="h-4 w-4" />
                {task.audited ? agendaCopy.actions.correctAudit : agendaCopy.actions.auditTask}
              </Button>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{agendaCopy.auditStatuses.not_ready}</p>
            )}
          </div>
        );
    }
  };

  const renderKanbanBoard = () => (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{agendaCopy.kanban.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {agendaCopy.kanban.visibleTasks(sortedTasks.length)}
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit rounded-full border-[#F4C84A]/30 bg-[#F4C84A]/10 px-3 py-1 font-semibold text-[#9A6B05]"
          >
            {agendaCopy.kanban.filteredBadge}
          </Badge>
        </div>
      </div>

      {isAgendaViewLoading ? (
        <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
          {agendaCopy.kanban.loading}
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
          {agendaCopy.table.empty}
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-50/70 p-4 dark:bg-slate-900/40">
          <div className="grid min-w-[1820px] grid-cols-7 gap-4">
            {agendaKanbanColumns.map((column) => {
              const columnTasks = kanbanTasksByColumn.get(column.id) ?? [];
              const draggedTaskIsActive = draggingTaskId != null && column.acceptsDrop;

              return (
                <section
                  key={column.id}
                  className={cn(
                    'flex min-h-[520px] flex-col rounded-2xl border p-3 transition-colors',
                    column.accentClassName,
                    draggedTaskIsActive && 'ring-2 ring-[#F4C84A]/25',
                  )}
                  onDragOver={(event) => {
                    if (column.acceptsDrop) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => {
                    if (column.acceptsDrop) {
                      handleKanbanDrop(column.id);
                    }
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', column.dotClassName)} />
                        <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {column.label}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {column.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    {columnTasks.length === 0 ? (
                      <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 text-center text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
                        {agendaCopy.kanban.emptyColumn}
                      </div>
                    ) : null}

                    {columnTasks.map((task) => {
                      const pending = isTaskPending(task.taskId);
                      const taskColumnId = getTaskKanbanColumnId(task);
                      const taskIsDragging = draggingTaskId === task.taskId;
                      const displayStatus = getTaskDisplayStatus(task);

                      return (
                        <article
                          key={task.taskId}
                          draggable={!pending}
                          onDragStart={() => setDraggingTaskId(task.taskId)}
                          onDragEnd={() => setDraggingTaskId(null)}
                          className={cn(
                            'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800',
                            !pending && 'cursor-grab active:cursor-grabbing',
                            taskIsDragging && 'opacity-50',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                            >
                              {task.folio}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                auditStatusClasses[task.auditStatus],
                              )}
                            >
                              {taskColumnId === 'overdue' ? agendaCopy.statuses.overdue : agendaCopy.auditStatuses[task.auditStatus]}
                            </Badge>
                          </div>

                          <h4 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-900 dark:text-white">
                            {task.title}
                          </h4>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {task.description || agendaCopy.common.noDescription}
                          </p>

                          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            <p className="truncate">
                              {agendaCopy.kanban.responsible}: <span className="font-semibold">{task.assignedName ?? agendaCopy.common.unassigned}</span>
                            </p>
                            <p className={cn('truncate', displayStatus === 'overdue' && 'font-semibold text-rose-600 dark:text-rose-300')}>
                              {agendaCopy.kanban.due}: {task.dueDate ? formatDate(task.dueDate) : agendaCopy.common.noDate}
                            </p>
                            <p className="truncate">
                              {agendaCopy.kanban.priority}: <span className="font-semibold">{agendaCopy.priorities[task.priority]}</span>
                            </p>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span>{agendaCopy.kanban.progress}</span>
                              <span>{clampPercent(task.completionPercent)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-[#F4C84A]"
                                style={{ width: `${clampPercent(task.completionPercent)}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                            >
                              {task.attachments} {agendaCopy.columns.attachments.label.toLowerCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                            >
                              {formatWeightingScore(task.weighting, agendaCopy.table.noWeighting)}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-4 gap-2">
                            <TableActionButton
                              label={agendaCopy.actions.editTask}
                              onClick={() => handleEditTask(task)}
                              disabled={pending}
                              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                              icon={<Pencil className="h-4 w-4" />}
                            />
                            <TableActionButton
                              label={agendaCopy.actions.files}
                              onClick={() => setAttachmentsTask(task)}
                              disabled={pending}
                              className="border-[#F4C84A]/30 bg-[#F4C84A]/10 text-[#9A6B05] hover:bg-[#F4C84A] hover:text-slate-950"
                              icon={<FolderOpen className="h-4 w-4" />}
                            />
                            <TableActionButton
                              label={agendaCopy.actions.closeTask}
                              onClick={() => handleCloseTask(task)}
                              disabled={pending || task.status === 'completed' || task.status === 'cancelled'}
                              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                              icon={<CheckCircle2 className="h-4 w-4" />}
                            />
                            <TableActionButton
                              label={task.audited ? agendaCopy.actions.correctAudit : agendaCopy.actions.auditTask}
                              onClick={() => handleAuditTask(task)}
                              disabled={pending || task.status !== 'completed'}
                              className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
                              icon={<ClipboardCheck className="h-4 w-4" />}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );

  const renderAgendaDiagram = () => {
    const scheduleCopy = agendaCopy.schedule;
    const weekDateKeys = getWeekDateKeys(selectedScheduleDate);
    const scheduleDateKeys = scheduleViewMode === 'day' ? [selectedScheduleDate] : weekDateKeys;
    const scheduleDayKeySet = new Set(scheduleDateKeys);
    const todayDateKey = todayAgendaValue;
    const weekRangeLabel = formatScheduleWeekRange(weekDateKeys);
    const taskScheduleMap = new Map<number, AgendaSchedulePlacement>();
    const scheduledTasksByCell = new Map<string, AgendaTaskItem[]>();
    const visibleScheduleTasks: AgendaTaskItem[] = [];

    sortedTasks.forEach((task) => {
      const storedPlacement = agendaSchedulePlacements[String(task.taskId)];
      const dateKey = storedPlacement?.date ?? getTaskScheduleDateKey(task) ?? selectedScheduleDate;
      const hour = storedPlacement?.hour && agendaScheduleHours.includes(storedPlacement.hour)
        ? storedPlacement.hour
        : null;

      taskScheduleMap.set(task.taskId, { date: dateKey, hour });

      if (!scheduleDayKeySet.has(dateKey)) {
        return;
      }

      visibleScheduleTasks.push(task);

      if (hour) {
        const cellKey = scheduleCellKey(dateKey, hour);
        const cellTasks = scheduledTasksByCell.get(cellKey) ?? [];
        cellTasks.push(task);
        scheduledTasksByCell.set(cellKey, cellTasks);
      }
    });

    const dayTasks = visibleScheduleTasks.filter((task) => taskScheduleMap.get(task.taskId)?.date === selectedScheduleDate);
    const dayUnscheduledTasks = dayTasks.filter((task) => !taskScheduleMap.get(task.taskId)?.hour);
    const visibleScheduledCount = visibleScheduleTasks.filter((task) => Boolean(taskScheduleMap.get(task.taskId)?.hour)).length;
    const visibleCount = scheduleViewMode === 'day' ? dayTasks.length : visibleScheduleTasks.length;

    const moveScheduleWindow = (direction: -1 | 1) => {
      setSelectedScheduleDate((currentDate) => {
        const offset = scheduleViewMode === 'day' ? direction : direction * 7;
        return toDateInputValue(addDays(dateInputValueToDate(currentDate), offset));
      });
    };

    const tasksForDate = (dateKey: string) =>
      visibleScheduleTasks
        .filter((task) => taskScheduleMap.get(task.taskId)?.date === dateKey)
        .sort((left, right) => agendaSortCollator.compare(taskScheduleMap.get(left.taskId)?.hour ?? '99:99', taskScheduleMap.get(right.taskId)?.hour ?? '99:99'));

    const tasksForDateAndHour = (dateKey: string, hour: string) =>
      scheduledTasksByCell.get(scheduleCellKey(dateKey, hour)) ?? [];

    const renderScheduleTaskCard = (
      task: AgendaTaskItem,
      options: { compact?: boolean; dateKey?: string } = {},
    ) => {
      const displayStatus = getTaskDisplayStatus(task);
      const schedule = taskScheduleMap.get(task.taskId) ?? {
        date: options.dateKey ?? selectedScheduleDate,
        hour: null,
      };
      const dueLabel = schedule.date ? formatDate(schedule.date) : task.dueDate ? formatDate(task.dueDate) : agendaCopy.common.noDate;
      const pending = isTaskPending(task.taskId);

      return (
        <article
          key={task.taskId}
          draggable
          onDragStart={() => setScheduleDraggingTaskId(task.taskId)}
          onDragEnd={() => setScheduleDraggingTaskId(null)}
          className={cn(
            'cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#F4C84A]/60 hover:shadow-md active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800',
            scheduleDraggingTaskId === task.taskId && 'opacity-50',
            options.compact ? 'space-y-2' : 'space-y-3',
          )}
        >
          <div className={cn('flex gap-3', options.compact ? 'flex-col' : 'flex-col xl:flex-row xl:items-start xl:justify-between')}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={cn('font-bold leading-5 text-slate-900 dark:text-white', options.compact ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm')}>
                  {task.title}
                </h4>
                {options.compact ? null : (
                  <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', agendaDisplayStatusClasses[displayStatus])}>
                    {agendaCopy.statuses[displayStatus]}
                  </Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                {task.assignedName ?? agendaCopy.common.unassigned}
              </p>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {task.projectName ?? task.businessName ?? task.unitName ?? agendaCopy.common.noRecord}
              </p>
            </div>

            {!options.compact ? (
              <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:w-[260px]">
                <Input
                  type="date"
                  value={schedule.date}
                  onChange={(event) => updateTaskSchedulePlacement(task.taskId, event.target.value || selectedScheduleDate, schedule.hour)}
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-xs font-semibold shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-900"
                />
                <Input
                  type="time"
                  step={3600}
                  value={schedule.hour ?? ''}
                  onChange={(event) => updateTaskSchedulePlacement(task.taskId, schedule.date || selectedScheduleDate, normalizeScheduleHourInput(event.target.value))}
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-xs font-semibold shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{dueLabel}</span>
            <span>{clampPercent(task.completionPercent)}%</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
            <Select
              value={task.status}
              disabled={pending}
              onValueChange={(value) => void persistTaskChange(task, { status: value as TaskStatus })}
            >
              <SelectTrigger
                className={cn(
                  'h-8 w-[126px] shrink-0 rounded-full px-3 text-xs font-semibold shadow-none',
                  agendaDisplayStatusClasses[displayStatus],
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['pending', 'in_progress', 'paused', 'completed', 'cancelled'] as TaskStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {agendaCopy.statuses[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TableActionButton
              label={agendaCopy.actions.closeTask}
              onClick={() => handleCloseTask(task)}
              disabled={pending || task.status === 'completed' || task.status === 'cancelled'}
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <TableActionButton
              label={agendaCopy.actions.files}
              onClick={() => setAttachmentsTask(task)}
              disabled={pending}
              className="border-[#F4C84A]/30 bg-[#F4C84A]/10 text-[#9A6B05] hover:bg-[#F4C84A] hover:text-slate-950 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
              icon={<FolderOpen className="h-4 w-4" />}
            />
            <TableActionButton
              label={agendaCopy.actions.editTask}
              onClick={() => handleEditTask(task)}
              disabled={pending}
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
              icon={<Pencil className="h-4 w-4" />}
            />
            <TableActionButton
              label={agendaCopy.actions.deleteTask}
              onClick={() => setDeleteTask(task)}
              disabled={pending}
              className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
              icon={<Trash2 className="h-4 w-4" />}
            />
          </div>
        </article>
      );
    };

    const renderDayView = () => (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400" style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}>
            <div className="px-4 py-3">{scheduleCopy.hourColumn}</div>
            <div className="px-4 py-3">{scheduleCopy.planColumn}</div>
          </div>

          {agendaScheduleHours.map((hour) => {
            const hourTasks = tasksForDateAndHour(selectedScheduleDate, hour);

            return (
              <div
                key={hour}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  scheduleTaskPlacement(selectedScheduleDate, hour);
                }}
                className="grid min-h-[104px] border-b border-slate-100 transition-colors last:border-b-0 hover:bg-[#F4C84A]/5 dark:border-slate-700 dark:hover:bg-[#F4C84A]/10"
                style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}
              >
                <div className="border-r border-slate-100 bg-slate-50/60 px-4 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">{hour}</div>
                <div className="space-y-3 px-4 py-4">
                  {hourTasks.length > 0 ? hourTasks.map((task) => renderScheduleTaskCard(task, { dateKey: selectedScheduleDate })) : (
                    <div className="flex h-full min-h-[72px] items-center rounded-lg border border-dashed border-slate-200 px-4 text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      {scheduleCopy.dayDropPlaceholder}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <aside
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            unscheduleDraggedTask(selectedScheduleDate);
          }}
        >
          <div className="mb-4">
            <h4 className="text-base font-bold text-slate-950 dark:text-white">{scheduleCopy.unscheduledTitle}</h4>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{scheduleCopy.unscheduledDescription}</p>
          </div>

          <div className="space-y-3">
            {dayUnscheduledTasks.length > 0 ? (
              dayUnscheduledTasks.map((task) => renderScheduleTaskCard(task, { dateKey: selectedScheduleDate }))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
                {scheduleCopy.emptyUnscheduled}
              </div>
            )}
          </div>
        </aside>
      </div>
    );

    const renderWeekView = () => (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div
          className="grid min-w-[1120px] border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400"
          style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
        >
          <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-700">{scheduleCopy.hourColumn}</div>
          {weekDateKeys.map((dateKey) => {
            const dateTasks = tasksForDate(dateKey);
            const isToday = dateKey === todayDateKey;

            return (
              <div
                key={dateKey}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  scheduleTaskDatePlacement(dateKey);
                }}
                className={cn(
                  'border-r border-slate-200 px-3 py-3 last:border-r-0 dark:border-slate-700',
                  isToday && 'bg-[#2563EB]/[0.06]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold capitalize tracking-normal text-slate-950 dark:text-white">{formatScheduleDayLabel(dateKey)}</p>
                    <p className="mt-1 text-[11px] font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">{scheduleCopy.tasksCount(dateTasks.length)}</p>
                  </div>
                  {isToday ? (
                    <span className="shrink-0 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-[#2563EB]">{scheduleCopy.today}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-h-[68vh] min-w-[1120px] overflow-auto">
          {agendaScheduleHours.map((hour) => (
            <div
              key={hour}
              className="grid min-h-[118px] border-b border-slate-100 last:border-b-0 dark:border-slate-700"
              style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
            >
              <div className="border-r border-slate-100 bg-slate-50/70 px-3 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">{hour}</div>
              {weekDateKeys.map((dateKey) => {
                const cellTasks = tasksForDateAndHour(dateKey, hour);

                return (
                  <div
                    key={`${dateKey}-${hour}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      scheduleTaskPlacement(dateKey, hour);
                    }}
                    className="min-h-[118px] space-y-2 border-r border-slate-100 bg-white p-2 transition-colors last:border-r-0 hover:bg-[#F4C84A]/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-[#F4C84A]/10"
                  >
                    {cellTasks.length > 0 ? cellTasks.map((task) => renderScheduleTaskCard(task, { compact: true, dateKey })) : (
                      <div className="flex h-full min-h-[82px] items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 text-center text-[11px] font-semibold text-slate-300 dark:border-slate-700 dark:text-slate-600">
                        {scheduleCopy.emptySlot}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {visibleScheduleTasks.some((task) => !taskScheduleMap.get(task.taskId)?.hour) ? (
            <div
              className="grid min-h-[118px]"
              style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
            >
              <div className="border-r border-slate-100 bg-slate-50/70 px-3 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">{scheduleCopy.noHourLabel}</div>
              {weekDateKeys.map((dateKey) => {
                const dateTasksWithoutTime = tasksForDate(dateKey).filter((task) => !taskScheduleMap.get(task.taskId)?.hour);

                return (
                  <div
                    key={`${dateKey}-unscheduled-time`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      scheduleTaskPlacement(dateKey, null);
                    }}
                    className="min-h-[118px] space-y-2 border-r border-slate-100 bg-white p-2 transition-colors last:border-r-0 hover:bg-[#F4C84A]/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-[#F4C84A]/10"
                  >
                    {dateTasksWithoutTime.length > 0 ? dateTasksWithoutTime.map((task) => renderScheduleTaskCard(task, { compact: true, dateKey })) : (
                      <div className="flex h-full min-h-[82px] items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 text-center text-[11px] font-semibold text-slate-300 dark:border-slate-700 dark:text-slate-600">
                        {scheduleCopy.noHourLabel}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    );

    const renderListView = () => (
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {weekDateKeys.map((dateKey) => {
          const dateTasks = tasksForDate(dateKey);

          return (
            <div
              key={dateKey}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                scheduleTaskDatePlacement(dateKey);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/45"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold capitalize text-slate-950 dark:text-white">{formatScheduleDayLabel(dateKey, 'long')}</p>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {scheduleCopy.tasksCount(dateTasks.length)}
                </Badge>
              </div>
              <div className="space-y-2">
                {dateTasks.length > 0 ? dateTasks.map((task) => renderScheduleTaskCard(task, { dateKey })) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                    {scheduleCopy.emptyListDay}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    );

    return (
      <section className="space-y-5">
        <div className="rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 p-5 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">
                {scheduleViewMode === 'day' ? scheduleCopy.dayTitle : scheduleViewMode === 'week' ? scheduleCopy.weekTitle : scheduleCopy.listTitle}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                {scheduleViewMode === 'day' ? scheduleCopy.daySubtitle : scheduleCopy.weekSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {([
                  { value: 'day', label: scheduleCopy.viewDay },
                  { value: 'week', label: scheduleCopy.viewWeek },
                  { value: 'list', label: scheduleCopy.viewList },
                ] as Array<{ value: AgendaScheduleViewMode; label: string }>).map((viewOption) => (
                  <button
                    key={viewOption.value}
                    type="button"
                    className={cn(
                      'h-8 rounded-md px-3 text-sm font-bold transition-colors',
                      scheduleViewMode === viewOption.value
                        ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white',
                    )}
                    onClick={() => setScheduleViewMode(viewOption.value)}
                  >
                    {viewOption.label}
                  </button>
                ))}
              </div>
              <Input
                type="date"
                value={selectedScheduleDate}
                onChange={(event) => setSelectedScheduleDate(event.target.value || todayAgendaValue)}
                className="h-10 w-[168px] rounded-lg border-slate-200 bg-white font-bold shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-800"
              />
              <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-3 font-bold shadow-none dark:border-slate-700 dark:bg-slate-800" onClick={() => moveScheduleWindow(-1)}>
                <ArrowUp className="h-4 w-4 -rotate-90" />
              </Button>
              <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-4 font-bold shadow-none dark:border-slate-700 dark:bg-slate-800" onClick={() => setSelectedScheduleDate(todayAgendaValue)}>
                {scheduleCopy.today}
              </Button>
              <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-3 font-bold shadow-none dark:border-slate-700 dark:bg-slate-800" onClick={() => moveScheduleWindow(1)}>
                <ArrowUp className="h-4 w-4 rotate-90" />
              </Button>
              <Badge variant="outline" className="rounded-full border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-sm font-bold text-[#2563EB]">
                {scheduleViewMode === 'day' ? scheduleCopy.dayBadge(visibleCount) : scheduleCopy.weekBadge(visibleCount)}
              </Badge>
              <Badge variant="outline" className="rounded-full border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-2 text-sm font-bold text-[#177d66]">
                {scheduleCopy.plannedBadge(visibleScheduledCount)}
              </Badge>
              {scheduleViewMode !== 'day' ? (
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {weekRangeLabel}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {isAgendaViewLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {agendaCopy.kanban.loading}
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {agendaCopy.table.empty}
          </div>
        ) : scheduleViewMode === 'day' ? renderDayView() : scheduleViewMode === 'week' ? renderWeekView() : renderListView()}
      </section>
    );
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 p-6 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
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
              className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:bg-[#F4C84A] hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onClick={() => setIsColumnsModalOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              {headerCopy.actions.columns}
            </Button>
            <Button
              type="button"
              className="h-11 gap-2 rounded-xl border border-[#F4C84A]/50 bg-[#F4C84A] px-5 text-sm font-bold text-slate-950 shadow-sm shadow-[#F4C84A]/20 hover:bg-[#E5B835]"
              onClick={handleOpenTaskKiosks}
            >
              <MonitorSmartphone className="h-5 w-5" />
              {headerCopy.actions.kiosk}
            </Button>
            <Button
              type="button"
              className={cn('h-10 gap-2 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
              onClick={handleCreateTaskClick}
            >
              <Plus className="h-4 w-4" />
              {headerCopy.actions.create}
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-5 flex items-center">
        <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:w-auto">
          <button
            type="button"
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none',
              viewMode === 'table'
                ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
            onClick={() => setViewMode('table')}
          >
            <ListChecks className="h-4 w-4" />
            {headerCopy.actions.table}
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none',
              viewMode === 'kanban'
                ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
            onClick={() => setViewMode('kanban')}
          >
            <Columns3 className="h-4 w-4" />
            {headerCopy.actions.kanban}
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none',
              viewMode === 'diagram'
                ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
            onClick={() => setViewMode('diagram')}
          >
            <CalendarRange className="h-4 w-4" />
            {headerCopy.actions.diagram}
          </button>
        </div>
      </section>

      {agendaError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{agendaError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadAgenda();
              }}
            >
              {agendaCopy.common.retry}
            </Button>
          </div>
        </section>
      ) : null}

      {agendaNotice ? (
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{agendaNotice}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-slate-800 dark:text-emerald-200"
              onClick={() => setAgendaNotice(null)}
            >
              {agendaCopy.common.close}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-5 text-base font-bold text-slate-800 dark:text-white">{agendaCopy.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.period}</label>
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {periodFilter === 'custom' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.from}</label>
                <Input
                  type="date"
                  value={customDateFrom}
                  max={customDateTo}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onChange={(event) => handleCustomDateFromChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.to}</label>
                <Input
                  type="date"
                  value={customDateTo}
                  min={customDateFrom}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onChange={(event) => handleCustomDateToChange(event.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.unit}</label>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{agendaCopy.common.all}</SelectItem>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.business}</label>
            <Select value={businessFilter} onValueChange={setBusinessFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{agendaCopy.common.all}</SelectItem>
                {businessOptions.map((business) => (
                  <SelectItem key={business} value={business}>
                    {business}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.form.labels.project}</label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{agendaCopy.common.all}</SelectItem>
                {projectOptions.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.collaborator}</label>
            <Select value={collaboratorFilter} onValueChange={setCollaboratorFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{agendaCopy.common.all}</SelectItem>
                {collaboratorOptions.map((collaborator) => (
                  <SelectItem key={collaborator.value} value={collaborator.value}>
                    {collaborator.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{agendaCopy.filters.status}</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{agendaCopy.common.all}</SelectItem>
                {agendaStatusFilterValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {agendaCopy.statuses[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <AgendaKpiStrip copy={agendaCopy.kpiStrip} isLoading={isAgendaViewLoading} metrics={agendaKpiMetrics} />

      {viewMode === 'table' && rowSelection.selectedCount > 0 ? (
        <section className="mb-4 rounded-2xl border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 py-3 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Badge variant="outline" className="rounded-full border-[#F4C84A]/40 bg-white px-3 py-1 text-[#9A6B05] dark:bg-slate-800 dark:text-[#FEF3C7]">
                {rowSelection.selectedCount} seleccionadas
              </Badge>
              <span className="text-slate-500 dark:text-slate-400">Acciones masivas</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={isBulkActionRunning}
                onClick={() => {
                  void runBulkTaskAction('duplicate');
                }}
              >
                <Copy className="h-4 w-4" />
                {agendaCopy.actions.copyTask}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={isBulkActionRunning}
                onClick={() => setIsBulkAssignOpen(true)}
              >
                {agendaCopy.form.labels.responsible}
              </Button>
              <Select
                disabled={isBulkActionRunning}
                onValueChange={(value) => {
                  void runBulkTaskAction('priority', { priority: value as TaskPriority });
                }}
              >
                <SelectTrigger className="h-9 w-[160px] rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <SelectValue placeholder={agendaCopy.form.labels.priority} />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high'] as TaskPriority[]).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {agendaCopy.priorities[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
                disabled={isBulkActionRunning}
                onClick={() => setBulkConfirmation('complete')}
              >
                <CheckCircle2 className="h-4 w-4" />
                {agendaCopy.actions.closeTask}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-none hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
                disabled={isBulkActionRunning}
                onClick={() => setBulkConfirmation('delete')}
              >
                <Trash2 className="h-4 w-4" />
                {agendaCopy.actions.deleteTask}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                disabled={isBulkActionRunning}
                onClick={rowSelection.clearSelection}
              >
                {agendaCopy.common.cancel}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {viewMode === 'table' ? (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table style={{ minWidth: agendaTableMinWidth, tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead
                  className="px-5 py-5"
                  style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
                >
                  <Checkbox
                    aria-label="Seleccionar tareas visibles"
                    checked={
                      visibleTaskSelection.allVisibleSelected
                        ? true
                        : visibleTaskSelection.someVisibleSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) => rowSelection.toggleAllVisible(visibleTaskIds, checked === true)}
                    className="border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                  />
                </TableHead>
                {visibleAgendaColumns.map((column) => (
                  <AgendaSortableTableHead
                    key={column.id}
                    column={column}
                    width={agendaColumnWidths[column.id as AgendaColumnId]}
                    sortState={sortState}
                    resizingColumn={resizingColumn}
                    onSort={handleSort}
                    resizeLabel={agendaCopy.table.resizeColumn}
                    onResizeStart={handleResizeStart}
                  />
                ))}
                {fixedAgendaColumns.map((column) => {
                  const columnId = column.id as AgendaFixedColumnId;

                  return (
                    <AgendaStaticTableHead
                      key={column.id}
                      column={column}
                      columnId={columnId}
                      width={agendaColumnWidths[columnId]}
                      resizingColumn={resizingColumn}
                      resizeLabel={agendaCopy.table.resizeColumn}
                      onResizeStart={handleResizeStart}
                    />
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => {
                const selected = rowSelection.isSelected(task.taskId);

                return (
                <TableRow
                  key={task.taskId}
                  className={cn(
                    'border-slate-200 dark:border-slate-700',
                    selected && 'bg-[#F4C84A]/10 dark:bg-[#F4C84A]/15',
                  )}
                >
                  <TableCell
                    className="px-5 py-5 align-middle"
                    style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}
                  >
                    <Checkbox
                      aria-label={`Seleccionar ${task.folio}`}
                      checked={selected}
                      disabled={isTaskPending(task.taskId)}
                      onCheckedChange={(checked) => rowSelection.toggleSelection(task.taskId, checked === true)}
                      className="border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                    />
                  </TableCell>
                  {visibleAgendaColumns.map((column) => {
                    const columnId = column.id as AgendaColumnId;

                    return (
                      <TableCell
                        key={`${task.taskId}-${column.id}`}
                        className="px-5 py-5 align-middle"
                        style={{
                          width: agendaColumnWidths[columnId],
                          minWidth: agendaColumnWidths[columnId],
                        }}
                      >
                        {renderAgendaTaskCell(task, columnId)}
                      </TableCell>
                    );
                  })}
                  {fixedAgendaColumns.map((column) => {
                    const columnId = column.id as AgendaFixedColumnId;

                    return (
                      <TableCell
                        key={`${task.taskId}-${column.id}`}
                        className="px-5 py-5 align-middle"
                        style={{
                          width: agendaColumnWidths[columnId],
                          minWidth: agendaColumnWidths[columnId],
                        }}
                      >
                        {renderTaskActions(task)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
              })}

              {isAgendaViewLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={agendaTableColumnCount}
                    className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                  >
                    {agendaCopy.kanban.loading}
                  </TableCell>
                </TableRow>
              ) : null}

              {!isAgendaViewLoading && filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={agendaTableColumnCount}
                    className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                  >
                    {agendaCopy.table.empty}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        </section>
      ) : viewMode === 'kanban' ? (
        renderKanbanBoard()
      ) : (
        renderAgendaDiagram()
      )}

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={translatedAgendaColumns}
        defaultColumns={defaultAgendaColumns}
        fixedColumns={fixedAgendaColumns}
        theme="processes"
        onSave={setAgendaColumns}
      />

      <TaskKioskManagementModal
        isOpen={isTaskKioskModalOpen}
        isSaving={isTaskKioskSaving}
        kiosks={taskKiosks}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        onClose={() => setIsTaskKioskModalOpen(false)}
        onSave={handleSaveTaskKiosk}
        onDelete={handleDeleteTaskKiosk}
        onCopy={handleCopyTaskKiosk}
        onOpen={handleOpenTaskKiosk}
      />

      <TaskFormDialog
        copy={agendaCopy}
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogOpenChange}
        mode={taskDialogMode}
        layout={taskDialogMode === 'create' ? 'quickCreate' : 'full'}
        onSubmit={handleSubmitTask}
        form={taskForm}
        isSubmitting={isSubmittingTask}
        processes={processes}
        projects={projects}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        collaboratorOptions={catalogCollaborators}
        currentUserCollaborator={currentUserCollaborator}
        setForm={setTaskForm}
      />

      <TaskCompletionDialog
        copy={agendaCopy.completionDialog}
        open={Boolean(completionTask)}
        onOpenChange={handleCompletionDialogOpenChange}
        task={completionTask}
        completionNotes={completionNotes}
        completionPercent={completionPercent}
        onCompletionNotesChange={setCompletionNotes}
        onCompletionPercentChange={setCompletionPercent}
        onConfirm={() => {
          void handleConfirmComplete();
        }}
        isSubmitting={completionTask ? isTaskPending(completionTask.taskId) : false}
      />

      <TaskAuditDialog
        copy={agendaCopy.auditDialog}
        open={Boolean(auditTask)}
        onOpenChange={handleAuditDialogOpenChange}
        task={auditTask}
        weighting={auditWeighting}
        auditNotes={auditNotes}
        onWeightingChange={setAuditWeighting}
        onAuditNotesChange={setAuditNotes}
        onConfirm={() => {
          void handleConfirmAudit();
        }}
        isSubmitting={auditTask ? isTaskPending(auditTask.taskId) : false}
      />

      <TaskAttachmentsDialog
        commonCopy={agendaCopy.common}
        copy={agendaCopy.attachmentsDialog}
        open={Boolean(attachmentsTask)}
        task={attachmentsTask}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentsTask(null);
          }
        }}
        onChanged={loadAgenda}
      />

      <Dialog
        open={Boolean(reportTask)}
        onOpenChange={(open) => {
          if (!open) {
            setReportTask(null);
          }
        }}
      >
        <DialogContent
          hideCloseButton
          className="!flex h-[min(88vh,860px)] w-[calc(100vw-2rem)] !max-w-[920px] max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:!max-w-[920px] dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="shrink-0 bg-[#F4C84A] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950 sm:text-[1.4rem]">
                  <FileText className="h-5 w-5" />
                  {agendaCopy.report.title}
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-2xl border-[#9A6B05]/25 bg-white/35 px-3 text-slate-950 hover:bg-white/60 hover:text-slate-950"
                >
                  {agendaCopy.common.close}
                </Button>
              </DialogClose>
            </div>
          </div>

          {reportTask ? (
            <>
              <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {agendaCopy.report.description}
                </DialogDescription>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {reportTask.folio}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {agendaCopy.taskTypes[reportTask.taskType]}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {agendaCopy.statuses[getTaskDisplayStatus(reportTask)]}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {agendaCopy.priorities[reportTask.priority]}
                  </Badge>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-900/60">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{reportTask.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {reportTask.description ?? agendaCopy.common.noDescription}
                    </p>
                  </section>

                  <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.progress}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {clampPercent(reportTask.completionPercent)}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.weighting}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {reportTask.weighting == null ? '-' : formatWeightingScore(reportTask.weighting, agendaCopy.table.noWeighting)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.audit}</p>
                      <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                        {agendaCopy.auditStatuses[reportTask.auditStatus]}
                      </p>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.context}</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <p>{agendaCopy.report.fields.unit}: {reportValue(reportTask.unitName ?? reportTask.unitId, agendaCopy.common.noRecord)}</p>
                        <p>{agendaCopy.report.fields.business}: {reportValue(reportTask.businessName ?? reportTask.businessId, agendaCopy.common.noRecord)}</p>
                        <p>{agendaCopy.report.fields.project}: {reportValue(reportTask.projectName ?? reportTask.projectId, agendaCopy.common.noRecord)}</p>
                        <p>{agendaCopy.report.fields.process}: {reportValue(reportTask.processTitle ?? reportTask.processId, agendaCopy.common.noRecord)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.people}</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <p>{agendaCopy.report.fields.creator}: {reportValue(reportTask.createdByName ?? reportTask.creator, agendaCopy.common.noRecord)}</p>
                        <p>{agendaCopy.report.fields.responsible}: {reportValue(reportTask.assignedName, agendaCopy.common.unassigned)}</p>
                        <p>{agendaCopy.report.fields.completedBy}: {reportValue(reportTask.closedByName ?? reportTask.completedByName, agendaCopy.common.noRecord)}</p>
                        <p>{agendaCopy.report.fields.auditedBy}: {reportValue(reportTask.auditedByName, agendaCopy.common.noRecord)}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.dates}</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 dark:text-slate-200 md:grid-cols-2">
                      <p>{agendaCopy.report.fields.createdAt}: {reportTask.createdAt ? formatDate(reportTask.createdAt, true) : agendaCopy.common.noDate}</p>
                      <p>{agendaCopy.report.fields.startDate}: {reportTask.startDate ? formatDate(reportTask.startDate) : agendaCopy.common.noDate}</p>
                      <p>{agendaCopy.report.fields.dueDate}: {reportTask.dueDate ? formatDate(reportTask.dueDate) : agendaCopy.common.noDate}</p>
                      <p>{agendaCopy.report.fields.closedAt}: {reportTask.completedAt ? formatDate(reportTask.completedAt, true) : agendaCopy.common.pending}</p>
                      <p>{agendaCopy.report.fields.auditedAt}: {reportTask.auditedAt ? formatDate(reportTask.auditedAt, true) : agendaCopy.common.pending}</p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{agendaCopy.report.sections.notes}</p>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      <p>{reportTask.notes ?? agendaCopy.common.noNotes}</p>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="font-semibold text-slate-900 dark:text-white">{agendaCopy.report.sections.auditNotes}</p>
                        <p className="mt-1">{reportTask.auditNotes ?? agendaCopy.common.noAuditNotes}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    {agendaCopy.common.close}
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
                  onClick={() => handleDownloadTaskReport(reportTask)}
                >
                  <Download className="h-4 w-4" />
                  {agendaCopy.report.downloadPdf}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent
          hideCloseButton
          className="max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="bg-[#F4C84A] px-5 py-4">
            <DialogTitle className="text-lg font-bold text-slate-950">{agendaCopy.form.labels.responsible}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-800/85">
              Aplicar responsable a {rowSelection.selectedCount} tarea{rowSelection.selectedCount === 1 ? '' : 's'} seleccionada{rowSelection.selectedCount === 1 ? '' : 's'}.
            </DialogDescription>
          </div>
          <div className="space-y-3 px-5 py-5">
            <Select value={bulkResponsibleValue} onValueChange={setBulkResponsibleValue}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_RESPONSIBLE_VALUE}>{agendaCopy.common.unassigned}</SelectItem>
                {catalogCollaborators.map((collaborator) => (
                  <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>
                    {collaborator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              disabled={isBulkActionRunning}
              onClick={() => setIsBulkAssignOpen(false)}
            >
              {agendaCopy.common.cancel}
            </Button>
            <Button
              type="button"
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
              disabled={isBulkActionRunning}
              onClick={handleBulkAssign}
            >
              {isBulkActionRunning ? agendaCopy.common.saving : agendaCopy.form.submit.edit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isVisible={bulkConfirmation === 'delete'}
        title={agendaCopy.deleteDialog.title}
        itemName={`${rowSelection.selectedCount} tarea${rowSelection.selectedCount === 1 ? '' : 's'}`}
        description={agendaCopy.deleteDialog.description}
        confirmLabel={agendaCopy.deleteDialog.confirm}
        cancelLabel={agendaCopy.common.cancel}
        confirmDisabled={isBulkActionRunning}
        onCancel={() => setBulkConfirmation(null)}
        onConfirm={() => {
          void runBulkTaskAction('delete');
        }}
      />

      <ConfirmDeleteDialog
        isVisible={bulkConfirmation === 'complete'}
        title={agendaCopy.actions.closeTask}
        itemName={`${rowSelection.selectedCount} tarea${rowSelection.selectedCount === 1 ? '' : 's'}`}
        description="Cierra las tareas seleccionadas usando el flujo existente de cierre."
        confirmLabel={agendaCopy.actions.closeTask}
        cancelLabel={agendaCopy.common.cancel}
        confirmDisabled={isBulkActionRunning}
        onCancel={() => setBulkConfirmation(null)}
        onConfirm={() => {
          void runBulkTaskAction('complete');
        }}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(deleteTask)}
        title={agendaCopy.deleteDialog.title}
        itemName={deleteTask?.title}
        description={agendaCopy.deleteDialog.description}
        confirmLabel={agendaCopy.deleteDialog.confirm}
        cancelLabel={agendaCopy.common.cancel}
        confirmDisabled={deleteTask ? isTaskPending(deleteTask.taskId) : false}
        onCancel={() => setDeleteTask(null)}
        onConfirm={() => {
          void handleConfirmDeleteTask();
        }}
      />
    </>
  );
}
