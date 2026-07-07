import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Columns3,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  ListChecks,
  Pencil,
  Plus,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { ColumnasConfigModal, type ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import { authApi } from '../../../../api/auth';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { accentButtonClass } from '../../Processes/processesData';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessRecord,
  ProcessUnitOption,
} from '../../Processes/types';
import type { AgendaTaskItem } from '../../Agenda/agendaApi';
import { useAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';
import { TaskAttachmentsDialog } from '../../Agenda/components/TaskAttachmentsDialog';
import { TaskAuditDialog } from '../../Tasks/components/TaskAuditDialog';
import { TaskCompletionDialog } from '../../Tasks/components/TaskCompletionDialog';
import { TaskFormDialog, type TaskFormValues } from '../../Tasks/components/TaskFormDialog';
import {
  auditProcessTask,
  completeProcessTask,
  createProcessTask,
  deleteProcessTask,
  updateProcessTask,
  updateProcessTaskDependencies,
  type TaskPayload,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
} from '../../Tasks/tasksApi';
import { ProgressSlider } from '../../shared/ProgressSlider';
import { useRowSelection } from '../../../shared/operational';
import {
  collaboratorCanReceiveAssignment,
  defaultTaskScopeForActor,
  filterBusinessesForActor,
  filterUnitsForActor,
  resolveCollaboratorAssignmentScope,
} from '../../shared/assignmentScope';
import { listProjectTasks, type ProjectRecord } from '../projectsApi';
import type { ProjectsTranslations } from '../translations';
import {
  InlineNumberInput,
  InlineTextArea,
  InlineTextInput,
  SortableHead,
  TableActionButton,
  tableInputClass,
  tableSelectTriggerClass,
} from './ProjectTaskTablePrimitives';

type DisplayTaskStatus = TaskStatus | 'overdue';
type AuditPendingStatusFilter = 'pending_audit';
type StatusFilter = 'all' | DisplayTaskStatus | AuditPendingStatusFilter;
type OptionFilter = 'all' | string;
type WorkspaceViewMode = 'table' | 'diagram';
type TaskGanttDragMode = 'move' | 'resize-start' | 'resize-end';
type ProjectTaskColumnId =
  | 'folio'
  | 'type'
  | 'unit'
  | 'business'
  | 'title'
  | 'description'
  | 'createdAt'
  | 'startDate'
  | 'dueDate'
  | 'predecessor'
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
type ProjectTaskSortDirection = 'asc' | 'desc';
type ProjectTaskSortValue = string | number | null;
type ProjectTaskFixedColumnId = 'actions';
type ProjectTaskTableColumnId = ProjectTaskColumnId | ProjectTaskFixedColumnId;

interface ProjectTaskSortState {
  columnId: ProjectTaskColumnId;
  direction: ProjectTaskSortDirection;
}

interface TaskGanttDragState {
  taskId: number;
  mode: TaskGanttDragMode;
  originClientX: number;
  dayWidth: number;
  originalStart: string;
  originalEnd: string;
  previewStart: string;
  previewEnd: string;
}

interface ProjectTasksWorkspaceProps {
  businessOptions: ProcessBusinessOption[];
  collaboratorOptions: ProcessCollaboratorOption[];
  copy: ProjectsTranslations['workspace'];
  onClose: () => void;
  onProjectChanged: () => Promise<void> | void;
  processes: ProcessRecord[];
  project: ProjectRecord;
  projects: ProjectRecord[];
  unitOptions: ProcessUnitOption[];
}

const auditStatusClasses: Record<AgendaTaskItem['auditStatus'], string> = {
  not_ready:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200',
  pending:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  audited:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const statusClasses: Record<DisplayTaskStatus, string> = {
  pending:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200',
  in_progress:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelled:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  overdue:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
};

const ganttBarClasses: Record<DisplayTaskStatus, string> = {
  pending:
    'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700/80 dark:text-slate-100',
  in_progress:
    'border-[#F4C84A]/60 bg-[#F4C84A]/25 text-slate-950 dark:border-[#F4C84A]/55 dark:bg-[#F4C84A]/25 dark:text-[#FEF3C7]',
  completed:
    'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100',
  cancelled:
    'border-red-300 bg-red-100 text-red-900 dark:border-red-900/70 dark:bg-red-950/70 dark:text-red-100',
  paused:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/70 dark:text-amber-100',
  overdue:
    'border-red-300 bg-red-100 text-red-900 ring-1 ring-red-200 dark:border-red-900/70 dark:bg-red-950/70 dark:text-red-100 dark:ring-red-900/50',
};

const ganttProgressClasses: Record<DisplayTaskStatus, string> = {
  pending: 'bg-slate-400 dark:bg-slate-300',
  in_progress: 'bg-[#F4C84A]',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  paused: 'bg-amber-500',
  overdue: 'bg-red-500',
};

const NO_UNIT_VALUE = '__no_unit__';
const NO_BUSINESS_VALUE = '__no_business__';
const NO_PREDECESSOR_VALUE = '__no_predecessor__';
const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';
const projectTaskColumnsStorageKey = 'processes-tasks-project-task-columns-v1';
const projectTaskSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const selectionColumnWidth = 64;
const projectTaskDefaultColumnWidths: Record<ProjectTaskTableColumnId, number> = {
  folio: 140,
  type: 150,
  unit: 220,
  business: 230,
  title: 240,
  description: 320,
  createdAt: 190,
  startDate: 180,
  dueDate: 180,
  predecessor: 250,
  status: 180,
  creator: 220,
  responsible: 260,
  priority: 160,
  attachments: 150,
  project: 220,
  completion: 200,
  notes: 280,
  weighting: 170,
  auditNotes: 280,
  actions: 260,
};
const prioritySortRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const taskPriorityValues: TaskPriority[] = ['low', 'medium', 'high'];
const editableStatusValues: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'paused'];
const projectTaskStatusFilterValues: Array<DisplayTaskStatus | AuditPendingStatusFilter> = [
  'pending',
  'in_progress',
  'paused',
  'completed',
  'pending_audit',
  'overdue',
  'cancelled',
];

function createDefaultProjectTaskColumns(columnCopy: AgendaTranslations['columns']): ColumnConfig[] {
  return [
    { id: 'folio', label: columnCopy.folio.label, visible: true, description: columnCopy.folio.description },
    { id: 'type', label: columnCopy.type.label, visible: true, description: columnCopy.type.description },
    { id: 'unit', label: columnCopy.unit.label, visible: true, description: columnCopy.unit.description },
    { id: 'business', label: columnCopy.business.label, visible: true, description: columnCopy.business.description },
    { id: 'title', label: columnCopy.title.label, visible: true, description: columnCopy.title.description },
    { id: 'description', label: columnCopy.description.label, visible: false, description: columnCopy.description.description },
    { id: 'createdAt', label: columnCopy.createdAt.label, visible: false, description: columnCopy.createdAt.description },
    { id: 'startDate', label: columnCopy.startDate.label, visible: false, description: columnCopy.startDate.description },
    { id: 'dueDate', label: columnCopy.dueDate.label, visible: true, description: columnCopy.dueDate.description },
    { id: 'predecessor', label: columnCopy.predecessor.label, visible: true, description: columnCopy.predecessor.description },
    { id: 'status', label: columnCopy.status.label, visible: true, description: columnCopy.status.description },
    { id: 'creator', label: columnCopy.creator.label, visible: false, description: columnCopy.creator.description },
    { id: 'responsible', label: columnCopy.responsible.label, visible: true, description: columnCopy.responsible.description },
    { id: 'priority', label: columnCopy.priority.label, visible: true, description: columnCopy.priority.description },
    { id: 'attachments', label: columnCopy.attachments.label, visible: true, description: columnCopy.attachments.description },
    { id: 'project', label: columnCopy.project.label, visible: false, description: columnCopy.project.description },
    { id: 'completion', label: columnCopy.completion.label, visible: true, description: columnCopy.completion.description },
    { id: 'notes', label: columnCopy.notes.label, visible: false, description: columnCopy.notes.description },
    { id: 'weighting', label: columnCopy.weighting.label, visible: true, description: columnCopy.weighting.description },
    { id: 'auditNotes', label: columnCopy.auditNotes.label, visible: false, description: columnCopy.auditNotes.description },
  ];
}

function getInitialColumns(defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(projectTaskColumnsStorageKey);
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function isTaskOverdue(task: AgendaTaskItem) {
  return (
    (task.isOverdue || isPastDate(task.dueDate)) &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'
  );
}

function getTaskDisplayStatus(task: AgendaTaskItem): DisplayTaskStatus {
  return isTaskOverdue(task) ? 'overdue' : task.status;
}

function taskMatchesStatusFilter(task: AgendaTaskItem, filter: StatusFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'pending_audit') {
    return task.status === 'completed' && !task.audited;
  }

  return getTaskDisplayStatus(task) === filter;
}

function sortableDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  const time = parsedDate.getTime();

  return Number.isNaN(time) ? null : time;
}

function dateFromTaskTimelineValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addTaskTimelineDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function shiftTaskTimelineValue(value: string, amount: number) {
  const date = dateFromTaskTimelineValue(value);

  return date ? toDateInputValue(addTaskTimelineDays(date, amount)) : value;
}

function taskTimelineDaysBetween(start: Date, end: Date) {
  const startAtMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endAtMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endAtMidnight.getTime() - startAtMidnight.getTime()) / (24 * 60 * 60 * 1000));
}

function compareTaskTimelineValues(left: string, right: string) {
  const leftDate = dateFromTaskTimelineValue(left);
  const rightDate = dateFromTaskTimelineValue(right);

  if (!leftDate || !rightDate) {
    return 0;
  }

  return taskTimelineDaysBetween(rightDate, leftDate);
}

function getTaskGanttDates(task: AgendaTaskItem) {
  const startDate = dateFromTaskTimelineValue(task.startDate ?? task.createdAt ?? task.agendaDate);
  const endDate = dateFromTaskTimelineValue(task.dueDate ?? task.agendaDate ?? task.startDate ?? task.createdAt);

  if (!startDate && !endDate) {
    return null;
  }

  const rawStart = startDate ?? endDate!;
  const rawEnd = endDate ?? startDate!;
  const normalizedStart = rawStart <= rawEnd ? rawStart : rawEnd;
  const normalizedEnd = rawEnd >= rawStart ? rawEnd : rawStart;

  return {
    start: toDateInputValue(normalizedStart),
    end: toDateInputValue(normalizedEnd),
  };
}

function getTaskGanttPreview(dragState: TaskGanttDragState, dayDelta: number) {
  let previewStart = dragState.originalStart;
  let previewEnd = dragState.originalEnd;

  if (dragState.mode === 'move') {
    previewStart = shiftTaskTimelineValue(dragState.originalStart, dayDelta);
    previewEnd = shiftTaskTimelineValue(dragState.originalEnd, dayDelta);
  }

  if (dragState.mode === 'resize-start') {
    previewStart = shiftTaskTimelineValue(dragState.originalStart, dayDelta);

    if (compareTaskTimelineValues(previewStart, dragState.originalEnd) > 0) {
      previewStart = dragState.originalEnd;
    }
  }

  if (dragState.mode === 'resize-end') {
    previewEnd = shiftTaskTimelineValue(dragState.originalEnd, dayDelta);

    if (compareTaskTimelineValues(previewEnd, dragState.originalStart) < 0) {
      previewEnd = dragState.originalStart;
    }
  }

  return { previewStart, previewEnd };
}

function getTaskGanttDuration(start: string, end: string) {
  const startDate = dateFromTaskTimelineValue(start);
  const endDate = dateFromTaskTimelineValue(end);

  if (!startDate || !endDate) {
    return 1;
  }

  return Math.max(1, taskTimelineDaysBetween(startDate, endDate) + 1);
}

function buildTaskTimelineDays(start: Date, end: Date, maxDays = 31) {
  const span = Math.max(0, Math.min(maxDays - 1, taskTimelineDaysBetween(start, end)));
  return Array.from({ length: span + 1 }, (_, index) => addTaskTimelineDays(start, index));
}

function getTaskTimelineRange(task: AgendaTaskItem, timelineStart: Date, timelineEnd: Date, dayCount: number) {
  const startDate = dateFromTaskTimelineValue(task.startDate ?? task.createdAt ?? task.agendaDate);
  const endDate = dateFromTaskTimelineValue(task.dueDate ?? task.agendaDate ?? task.startDate);

  if (!startDate && !endDate) {
    return null;
  }

  const rawStart = startDate ?? endDate!;
  const rawEnd = endDate ?? startDate!;
  const normalizedStart = rawStart > timelineEnd ? timelineEnd : rawStart < timelineStart ? timelineStart : rawStart;
  const normalizedEnd = rawEnd < timelineStart ? timelineStart : rawEnd > timelineEnd ? timelineEnd : rawEnd;
  const startOffset = Math.max(0, taskTimelineDaysBetween(timelineStart, normalizedStart));
  const endOffset = Math.max(startOffset, taskTimelineDaysBetween(timelineStart, normalizedEnd));

  return {
    startOffset,
    span: Math.max(1, Math.min(dayCount - startOffset, endOffset - startOffset + 1)),
  };
}

function compareSortValues(
  leftValue: ProjectTaskSortValue,
  rightValue: ProjectTaskSortValue,
  direction: ProjectTaskSortDirection,
) {
  const leftIsEmpty = leftValue == null || leftValue === '';
  const rightIsEmpty = rightValue == null || rightValue === '';

  if (leftIsEmpty && rightIsEmpty) return 0;
  if (leftIsEmpty) return 1;
  if (rightIsEmpty) return -1;

  const result =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : projectTaskSortCollator.compare(String(leftValue), String(rightValue));

  return direction === 'asc' ? result : result * -1;
}

function getSortValue(task: AgendaTaskItem, columnId: ProjectTaskColumnId, copy: AgendaTranslations): ProjectTaskSortValue {
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
    case 'predecessor':
      return task.predecessorTaskFolio ?? task.predecessorTaskTitle ?? '';
    case 'status':
      return copy.statuses[getTaskDisplayStatus(task)];
    case 'creator':
      return task.createdByName ?? task.creator ?? '';
    case 'responsible':
      return task.assignedName ?? task.responsible ?? '';
    case 'priority':
      return prioritySortRank[task.priority] ?? 0;
    case 'attachments':
      return task.attachments;
    case 'project':
      return task.projectName ?? task.project ?? task.projectFolio ?? '';
    case 'completion':
      return task.completionPercent;
    case 'notes':
      return task.notes ?? '';
    case 'weighting':
      return task.weighting ?? null;
    case 'auditNotes':
      return task.auditNotes ?? copy.auditStatuses[task.auditStatus];
  }
}

function formatDate(value: string | null, includeTime: boolean, noDateLabel: string) {
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

function parseOptionalNumber(value: string, fieldLabel: string, rangeMessage: (field: string, min: number, max: number) => string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(rangeMessage(fieldLabel, 1, 999999));
  }

  return parsed;
}

function parseOptionalNumberInRange(
  value: string,
  fieldLabel: string,
  min: number,
  max: number,
  rangeMessage: (field: string, min: number, max: number) => string,
) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(rangeMessage(fieldLabel, min, max));
  }

  return parsed;
}

function createDefaultTaskForm(project: ProjectRecord) {
  const today = toDateInputValue(new Date());

  return {
    title: '',
    description: '',
    processId: '',
    projectId: project.id.toString(),
    assignedUserCompanyId: project.ownerUserCompanyId?.toString() ?? '',
    assignedName: project.ownerName ?? '',
    status: 'pending',
    priority: project.priority ?? 'medium',
    startDate: project.startDate ?? today,
    dueDate: project.dueDate ?? today,
    notes: '',
    completionPercent: '',
    weighting: '',
    audited: false,
    auditNotes: '',
    businessId: project.businessId?.toString() ?? '',
    unitId: project.unitId?.toString() ?? '',
  } satisfies TaskFormValues;
}

function toTaskFormValues(task: AgendaTaskItem): TaskFormValues {
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
    weighting: task.weighting == null ? '' : String(Math.max(0, Math.min(5, task.weighting))),
    audited: task.audited,
    auditNotes: task.auditNotes ?? '',
    businessId: task.businessId?.toString() ?? '',
    unitId: task.unitId?.toString() ?? '',
  };
}

function buildTaskPayload(form: TaskFormValues, copy: AgendaTranslations): TaskPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    processId: parseOptionalNumber(form.processId, copy.report.fields.process, copy.messages.numberRange),
    projectId: parseOptionalNumber(form.projectId, copy.report.fields.project, copy.messages.numberRange),
    assignedUserCompanyId: parseOptionalNumber(form.assignedUserCompanyId, copy.report.fields.responsible, copy.messages.numberRange),
    assignedName: form.assignedName.trim() ? form.assignedName.trim() : null,
    status: form.status,
    priority: form.priority,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    notes: form.notes.trim() ? form.notes.trim() : null,
    completionPercent: parseOptionalNumberInRange(
      form.completionPercent,
      copy.columns.completion.label,
      0,
      100,
      copy.messages.numberRange,
    ),
    weighting: parseOptionalNumberInRange(form.weighting, copy.columns.weighting.label, 0, 5, copy.messages.numberRange),
    audited: form.audited,
    auditNotes: form.audited && form.auditNotes.trim() ? form.auditNotes.trim() : null,
    businessId: parseOptionalNumber(form.businessId, copy.report.fields.business, copy.messages.numberRange),
    unitId: parseOptionalNumber(form.unitId, copy.report.fields.unit, copy.messages.numberRange),
  };
}

function buildTaskPayloadFromRecord(task: AgendaTaskItem, patch: Partial<TaskPayload> = {}): TaskPayload {
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
    dueDate: task.dueDate || null,
    notes: task.notes?.trim() ? task.notes.trim() : null,
    completionPercent: clampPercent(task.completionPercent),
    weighting: task.weighting == null ? null : Math.max(0, Math.min(5, task.weighting)),
    audited: task.audited,
    auditNotes: task.audited && task.auditNotes?.trim() ? task.auditNotes.trim() : null,
    businessId: task.businessId,
    unitId: task.unitId,
    ...patch,
  };
}

function businessMatchesUnit(business: ProcessBusinessOption, unitId: number | null) {
  return unitId == null || business.unitId == null || business.unitId === unitId;
}

function normalizeProjectTask(task: TaskRecord, project: ProjectRecord): AgendaTaskItem {
  const auditStatus = task.auditStatus ?? (task.audited ? 'audited' : task.status === 'completed' ? 'pending' : 'not_ready');

  return {
    id: task.id,
    taskId: task.id,
    taskType: task.taskType,
    type: task.taskType,
    folio: task.folio,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    agendaDate: task.agendaDate ?? task.dueDate ?? null,
    agendaStartTime: task.agendaStartTime ?? null,
    agendaEndTime: task.agendaEndTime ?? null,
    agendaTimeZone: task.agendaTimeZone ?? null,
    startDate: task.startDate,
    dueDate: task.dueDate ?? null,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    completedByUserCompanyId: task.completedByUserCompanyId,
    completedByUserId: task.completedByUserId,
    completedByName: task.completedByName,
    closedByName: task.closedByName,
    completionNotes: task.completionNotes,
    assignedUserCompanyId: task.assignedUserCompanyId,
    assignedUserId: task.assignedUserId,
    assignedName: task.assignedName,
    responsible: task.responsible,
    processId: task.processId,
    processFolio: null,
    processTitle: null,
    projectId: task.projectId ?? project.id,
    projectFolio: project.folio,
    projectName: project.name,
    project: project.name,
    businessId: task.businessId ?? project.businessId,
    businessName: task.businessName ?? project.businessName,
    business: task.business ?? task.businessName ?? project.businessName,
    unitId: task.unitId ?? project.unitId,
    unitName: task.unitName ?? project.unitName,
    unit: task.unit ?? task.unitName ?? project.unitName,
    notes: task.notes,
    completionPercent: task.completionPercent,
    completion: task.completionPercent,
    weighting: task.weighting == null ? null : Math.max(0, Math.min(5, task.weighting)),
    audited: task.audited,
    auditNotes: task.auditNotes,
    auditedAt: task.auditedAt,
    auditedByUserCompanyId: task.auditedByUserCompanyId,
    auditedByUserId: task.auditedByUserId,
    auditedByName: task.auditedByName,
    auditStatus,
    createdBy: task.createdBy,
    createdByName: task.createdByName,
    creator: task.creator,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    predecessorDependencyId: task.predecessorDependencyId,
    predecessorTaskId: task.predecessorTaskId,
    predecessorTaskFolio: task.predecessorTaskFolio,
    predecessorTaskTitle: task.predecessorTaskTitle,
    dependencyType: task.dependencyType,
    dependencyLagDays: task.dependencyLagDays,
    attachments: task.attachments,
    isOverdue: isPastDate(task.dueDate) && task.status !== 'completed' && task.status !== 'cancelled',
  };
}

function reportValue(value: string | number | null | undefined, fallback: string) {
  if (value == null || value === '') {
    return fallback;
  }

  return String(value);
}

function taskReportRows(task: AgendaTaskItem, copy: AgendaTranslations) {
  return [
    [copy.report.fields.folio, task.folio],
    [copy.report.fields.type, copy.taskTypes[task.taskType]],
    [copy.report.fields.title, task.title],
    [copy.report.fields.description, task.description ?? copy.common.noDescription],
    [copy.report.fields.unit, task.unitName ?? (task.unitId ? `${copy.report.fields.unit} #${task.unitId}` : copy.form.empty.unit)],
    [
      copy.report.fields.business,
      task.businessName ?? (task.businessId ? `${copy.report.fields.business} #${task.businessId}` : copy.form.empty.business),
    ],
    [copy.report.fields.project, task.projectName ?? (task.projectId ? `${copy.report.fields.project} #${task.projectId}` : copy.form.empty.project)],
    [copy.report.fields.status, copy.statuses[getTaskDisplayStatus(task)]],
    [copy.report.fields.priority, copy.priorities[task.priority]],
    [copy.report.fields.creator, task.createdByName ?? task.creator ?? copy.common.noRecord],
    [copy.report.fields.responsible, task.assignedName ?? copy.common.unassigned],
    [copy.report.fields.createdAt, task.createdAt ? formatDate(task.createdAt, true, copy.common.noDate) : copy.common.noDate],
    [copy.report.fields.startDate, task.startDate ? formatDate(task.startDate, false, copy.common.noDate) : copy.common.noDate],
    [copy.report.fields.dueDate, task.dueDate ? formatDate(task.dueDate, false, copy.common.noDate) : copy.common.noDate],
    [copy.report.fields.closedAt, task.completedAt ? formatDate(task.completedAt, true, copy.common.noDate) : copy.common.pending],
    [copy.report.fields.completion, `${clampPercent(task.completionPercent)}%`],
    [copy.report.fields.weighting, task.weighting != null ? `${Math.max(0, Math.min(5, task.weighting))}/5` : copy.table.noWeighting],
    [copy.report.fields.notes, task.notes ?? copy.common.noNotes],
    [copy.report.fields.auditNotes, task.auditNotes ?? copy.common.noAuditNotes],
  ];
}

export function ProjectTasksWorkspace({
  businessOptions,
  collaboratorOptions,
  copy,
  onClose,
  onProjectChanged,
  processes,
  project,
  projects,
  unitOptions,
}: ProjectTasksWorkspaceProps) {
  const taskCopy = useAgendaTranslations();
  const defaultColumns = useMemo(() => createDefaultProjectTaskColumns(taskCopy.columns), [taskCopy.columns]);
  const fixedColumns = useMemo<ColumnConfig[]>(
    () => [
      {
        id: 'actions',
        label: taskCopy.columns.actions.label,
        visible: true,
        locked: true,
        description: taskCopy.columns.actions.description,
      },
    ],
    [taskCopy.columns.actions.description, taskCopy.columns.actions.label],
  );
  const [tasks, setTasks] = useState<AgendaTaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [workspaceViewMode, setWorkspaceViewMode] = useState<WorkspaceViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<OptionFilter>('all');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => getInitialColumns(defaultColumns));
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [sortState, setSortState] = useState<ProjectTaskSortState>({ columnId: 'dueDate', direction: 'asc' });
  const [columnWidths, setColumnWidths] = useState<Record<ProjectTaskTableColumnId, number>>(projectTaskDefaultColumnWidths);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<ProjectTaskTableColumnId | null>(null);
  const [taskGanttDrag, setTaskGanttDrag] = useState<TaskGanttDragState | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDialogMode, setTaskDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(() => createDefaultTaskForm(project));
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([]);
  const [completionTask, setCompletionTask] = useState<AgendaTaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPercent, setCompletionPercent] = useState('100');
  const [auditTask, setAuditTask] = useState<AgendaTaskItem | null>(null);
  const [auditWeighting, setAuditWeighting] = useState('5');
  const [auditNotes, setAuditNotes] = useState('');
  const [attachmentsTask, setAttachmentsTask] = useState<AgendaTaskItem | null>(null);
  const [reportTask, setReportTask] = useState<AgendaTaskItem | null>(null);
  const [deleteTask, setDeleteTask] = useState<AgendaTaskItem | null>(null);
  const [tasksNotice, setTasksNotice] = useState<string | null>(null);
  const rowSelection = useRowSelection<number>();
  const [bulkConfirmation, setBulkConfirmation] = useState<'delete' | 'complete' | null>(null);
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkResponsibleValue, setBulkResponsibleValue] = useState(UNASSIGNED_RESPONSIBLE_VALUE);

  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setTasksError(null);

    try {
      const items = await listProjectTasks(project.id);
      setTasks(items.map((task) => normalizeProjectTask(task, project)));
    } catch (error) {
      setTasks([]);
      setTasksError(getErrorMessage(error, copy.messages.loadTasks));
    } finally {
      setIsLoadingTasks(false);
    }
  }, [copy.messages.loadTasks, project]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const session = await authApi.getSessionOrNull();
        if (isMounted) {
          setCurrentUserId(session?.user.id ?? null);
        }
      } catch {
        if (isMounted) {
          setCurrentUserId(null);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setWorkspaceViewMode('table');
    setTaskForm(createDefaultTaskForm(project));
    setEditingTaskId(null);
    setReportTask(null);
    setAttachmentsTask(null);
    setDeleteTask(null);
    rowSelection.clearSelection();
    void loadTasks();
  }, [loadTasks, project, rowSelection.clearSelection]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(projectTaskColumnsStorageKey, JSON.stringify(columns));
  }, [columns]);

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
    if (!resizingColumn) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const diff = event.clientX - resizeStartX;
      setColumnWidths((currentWidths) => ({
        ...currentWidths,
        [resizingColumn]: Math.max(96, resizeStartWidth + diff),
      }));
    };

    const handleMouseUp = () => setResizingColumn(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  const currentUserCollaborator = useMemo(
    () =>
      currentUserId == null
        ? null
        : collaboratorOptions.find((collaborator) => collaborator.userId === currentUserId) ?? null,
    [collaboratorOptions, currentUserId],
  );
  const currentAssignmentScope = useMemo(
    () => resolveCollaboratorAssignmentScope(currentUserCollaborator),
    [currentUserCollaborator],
  );
  const scopedUnitOptions = useMemo(
    () => filterUnitsForActor(unitOptions, businessOptions, currentAssignmentScope),
    [businessOptions, currentAssignmentScope, unitOptions],
  );
  const scopedBusinessOptions = useMemo(
    () => filterBusinessesForActor(businessOptions, currentAssignmentScope),
    [businessOptions, currentAssignmentScope],
  );

  const businessOptionsForUnit = useCallback(
    (unitId: number | null) => scopedBusinessOptions.filter((business) => businessMatchesUnit(business, unitId)),
    [scopedBusinessOptions],
  );

  const collaboratorOptionsForScope = useCallback(
    (unitId: number | null, businessId: number | null) =>
      collaboratorOptions.filter((collaborator) =>
        collaboratorCanReceiveAssignment(collaborator, unitId, businessId, businessOptions),
      ),
    [businessOptions, collaboratorOptions],
  );

  const createDefaultTaskFormForCurrentUser = () => {
    const defaultScope = defaultTaskScopeForActor(currentUserCollaborator);
    const defaultForm = {
      ...createDefaultTaskForm(project),
      assignedUserCompanyId: '',
      assignedName: '',
      unitId: defaultScope.unitId?.toString() ?? project.unitId?.toString() ?? '',
      businessId: defaultScope.businessId?.toString() ?? project.businessId?.toString() ?? '',
    };

    if (!currentUserCollaborator) {
      return defaultForm;
    }

    return {
      ...defaultForm,
      assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
      assignedName: currentUserCollaborator.name,
    };
  };

  useEffect(() => {
    if (!isTaskDialogOpen || taskDialogMode !== 'create' || !currentUserCollaborator) {
      return;
    }

    setTaskForm((currentForm) => {
      const projectOwnerUserCompanyId = project.ownerUserCompanyId?.toString() ?? '';
      const projectOwnerName = project.ownerName ?? '';
      const stillUsingProjectOwnerDefault =
        currentForm.assignedUserCompanyId === projectOwnerUserCompanyId &&
        currentForm.assignedName === projectOwnerName;

      if (currentForm.assignedUserCompanyId && !stillUsingProjectOwnerDefault) {
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
  }, [currentUserCollaborator, isTaskDialogOpen, project.ownerName, project.ownerUserCompanyId, taskDialogMode]);

  const responsibleOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => task.assignedName ?? '').filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [tasks],
  );
  const predecessorOptions = useMemo(
    () =>
      tasks
        .slice()
        .sort((left, right) => projectTaskSortCollator.compare(left.folio || left.title, right.folio || right.title)),
    [tasks],
  );

  useEffect(() => {
    if (responsibleFilter !== 'all' && !responsibleOptions.includes(responsibleFilter)) {
      setResponsibleFilter('all');
    }
  }, [responsibleFilter, responsibleOptions]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.folio.toLowerCase().includes(normalizedSearch) ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.assignedName ?? '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = taskMatchesStatusFilter(task, statusFilter);
      const matchesResponsible = responsibleFilter === 'all' || task.assignedName === responsibleFilter;

      return matchesSearch && matchesStatus && matchesResponsible;
    });
  }, [responsibleFilter, searchQuery, statusFilter, tasks]);

  const sortedTasks = useMemo(() => {
    return filteredTasks
      .map((task, index) => ({ index, task }))
      .sort((left, right) => {
        const comparison = compareSortValues(
          getSortValue(left.task, sortState.columnId, taskCopy),
          getSortValue(right.task, sortState.columnId, taskCopy),
          sortState.direction,
        );

        return comparison === 0 ? left.index - right.index : comparison;
      })
      .map(({ task }) => task);
  }, [filteredTasks, sortState, taskCopy]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedTasks,
    totalCount: paginatedTaskCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${project.id}:${searchQuery}:${statusFilter}:${responsibleFilter}:${sortState.columnId}:${sortState.direction}`,
    rows: sortedTasks,
  });
  const taskTimeline = useMemo(() => {
    const taskDates = sortedTasks.flatMap((task) => [
      dateFromTaskTimelineValue(task.startDate ?? task.createdAt ?? task.agendaDate),
      dateFromTaskTimelineValue(task.dueDate ?? task.agendaDate ?? task.startDate),
    ]).filter((date): date is Date => date !== null);
    const today = new Date();
    const fallbackStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const earliestDate = taskDates.length > 0
      ? new Date(Math.min(...taskDates.map((date) => date.getTime())))
      : fallbackStart;
    const latestDate = taskDates.length > 0
      ? new Date(Math.max(...taskDates.map((date) => date.getTime())))
      : addTaskTimelineDays(fallbackStart, 13);
    const timelineEnd = taskTimelineDaysBetween(earliestDate, latestDate) > 89
      ? addTaskTimelineDays(earliestDate, 89)
      : latestDate;

    return {
      days: buildTaskTimelineDays(earliestDate, timelineEnd, 90),
      start: earliestDate,
      end: timelineEnd,
    };
  }, [sortedTasks]);

  const pageTaskIds = useMemo(() => paginatedTasks.map((task) => task.taskId), [paginatedTasks]);
  const pageTaskSelection = rowSelection.visibleSelectionState(pageTaskIds);
  const selectedTasks = useMemo(
    () => tasks.filter((task) => rowSelection.selectedIds.has(task.taskId)),
    [rowSelection.selectedIds, tasks],
  );
  const bulkAssignableCollaborators = useMemo(() => {
    if (selectedTasks.length === 0) {
      return collaboratorOptions;
    }

    return collaboratorOptions.filter((collaborator) =>
      selectedTasks.every((task) =>
        collaboratorCanReceiveAssignment(collaborator, task.unitId, task.businessId, businessOptions),
      ),
    );
  }, [businessOptions, collaboratorOptions, selectedTasks]);

  useEffect(() => {
    rowSelection.pruneSelection(tasks.map((task) => task.taskId));
  }, [rowSelection.pruneSelection, tasks]);

  useEffect(() => {
    if (bulkResponsibleValue === UNASSIGNED_RESPONSIBLE_VALUE) {
      return;
    }

    const selectedUserCompanyId = Number(bulkResponsibleValue);
    const optionIsAvailable = bulkAssignableCollaborators.some(
      (collaborator) => collaborator.userCompanyId === selectedUserCompanyId,
    );

    if (!optionIsAvailable) {
      setBulkResponsibleValue(UNASSIGNED_RESPONSIBLE_VALUE);
    }
  }, [bulkAssignableCollaborators, bulkResponsibleValue]);

  const metrics = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((task) => task.status === 'completed').length;
    const overdue = filteredTasks.filter(isTaskOverdue).length;
    const audited = filteredTasks.filter((task) => task.audited).length;
    const open = filteredTasks.filter((task) => ['pending', 'in_progress', 'paused'].includes(task.status)).length;
    const averageCompletion =
      total > 0
        ? Math.round(filteredTasks.reduce((sum, task) => sum + clampPercent(task.completionPercent), 0) / total)
        : 0;

    return { audited, averageCompletion, completed, open, overdue, total };
  }, [filteredTasks]);

  const projectContextItems = useMemo(
    () => [
      { label: copy.header.context.folio, value: project.folio },
      { label: copy.header.context.status, value: copy.projectStatuses[project.status] },
      {
        label: copy.header.context.priority,
        value: project.priority ? copy.projectPriorities[project.priority] : copy.emptyContext.noPriority,
      },
      { label: copy.header.context.responsible, value: project.ownerName ?? copy.emptyContext.noResponsible },
      {
        label: copy.header.context.scope,
        value: [project.unitName, project.businessName].filter(Boolean).join(' / ') || copy.emptyContext.noScope,
      },
      {
        label: copy.header.context.dueDate,
        value: project.dueDate ? formatDate(project.dueDate, false, copy.emptyContext.noDate) : copy.emptyContext.noDate,
      },
    ],
    [copy, project],
  );

  const projectInsight = useMemo(() => {
    if (metrics.total === 0) {
      return copy.header.insights.empty(project.name);
    }

    if (metrics.overdue > 0) {
      return copy.header.insights.overdue(project.name, metrics.open, metrics.overdue, metrics.averageCompletion);
    }

    if (metrics.open > 0) {
      return copy.header.insights.active(project.name, metrics.open, metrics.completed, metrics.averageCompletion);
    }

    return copy.header.insights.complete(project.name, metrics.completed, metrics.audited);
  }, [copy.header.insights, metrics, project.name]);

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const tableColumnCount = visibleColumns.length + fixedColumns.length + 1;
  const tableMinWidth = useMemo(
    () =>
      Math.max(
        1280,
        selectionColumnWidth +
          columnWidths.actions +
          visibleColumns.reduce(
            (totalWidth, column) => totalWidth + columnWidths[column.id as ProjectTaskColumnId],
            0,
          ),
      ),
    [columnWidths, visibleColumns],
  );

  const reloadEverything = async () => {
    await loadTasks();
    await onProjectChanged();
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

  const handleColumnResizeStart = (event: ReactMouseEvent, columnId: ProjectTaskTableColumnId) => {
    event.preventDefault();
    setResizingColumn(columnId);
    setResizeStartX(event.clientX);
    setResizeStartWidth(columnWidths[columnId]);
  };

  const handleTaskGanttDragStart = (
    event: ReactMouseEvent<HTMLElement>,
    task: AgendaTaskItem,
    mode: TaskGanttDragMode,
    dayCount: number,
  ) => {
    if (isTaskPending(task.taskId)) {
      return;
    }

    const ganttDates = getTaskGanttDates(task);

    if (!ganttDates) {
      return;
    }

    const trackElement = event.currentTarget.closest('[data-task-gantt-track="true"]') as HTMLElement | null;
    const trackWidth = trackElement?.getBoundingClientRect().width ?? dayCount * 56;

    event.preventDefault();
    event.stopPropagation();
    setTaskGanttDrag({
      taskId: task.taskId,
      mode,
      originClientX: event.clientX,
      dayWidth: Math.max(24, trackWidth / Math.max(dayCount, 1)),
      originalStart: ganttDates.start,
      originalEnd: ganttDates.end,
      previewStart: ganttDates.start,
      previewEnd: ganttDates.end,
    });
  };

  const handleSort = (columnId: ProjectTaskColumnId) => {
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

  const resetTaskForm = () => {
    setTaskForm(createDefaultTaskForm(project));
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
    setTasksError(null);

    try {
      const payload = buildTaskPayload(taskForm, taskCopy);

      if (taskDialogMode === 'edit' && editingTaskId != null) {
        await updateProcessTask(editingTaskId, payload);
      } else {
        await createProcessTask({ ...payload, projectId: payload.projectId ?? project.id });
      }

      setIsTaskDialogOpen(false);
      resetTaskForm();
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.saveTask));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const buildValidatedTaskPayloadFromRecord = (
    task: AgendaTaskItem,
    patch: Partial<TaskPayload> = {},
  ): TaskPayload => {
    const payload = buildTaskPayloadFromRecord(task, patch);
    const unitExists = payload.unitId == null || unitOptions.some((unit) => unit.id === payload.unitId);
    const selectedBusiness =
      payload.businessId == null
        ? null
        : businessOptions.find((business) => business.id === payload.businessId) ?? null;
    const selectedCollaborator =
      payload.assignedUserCompanyId == null
        ? null
        : collaboratorOptions.find(
            (collaborator) => collaborator.userCompanyId === payload.assignedUserCompanyId,
          ) ?? null;

    let unitId = unitExists ? payload.unitId : null;
    let businessId = selectedBusiness ? payload.businessId : null;

    if (selectedBusiness?.unitId != null) {
      const businessUnitExists = unitOptions.some((unit) => unit.id === selectedBusiness.unitId);
      unitId = businessUnitExists ? selectedBusiness.unitId : unitId;
    }

    if (selectedBusiness && unitId != null && !businessMatchesUnit(selectedBusiness, unitId)) {
      businessId = null;
    }

    return {
      ...payload,
      unitId,
      businessId,
      assignedUserCompanyId: payload.assignedUserCompanyId == null || selectedCollaborator ? payload.assignedUserCompanyId : null,
      assignedName: payload.assignedUserCompanyId == null || selectedCollaborator ? payload.assignedName : null,
    };
  };

  const persistTaskChange = async (task: AgendaTaskItem, patch: Partial<TaskPayload>) => {
    const nextTitle = 'title' in patch ? patch.title : task.title;
    if (!nextTitle?.trim()) {
      setTasksError(copy.messages.titleRequired);
      return;
    }

    setTaskPendingState(task.taskId, true);
    setTasksError(null);

    try {
      await updateProcessTask(task.taskId, buildValidatedTaskPayloadFromRecord(task, patch));
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.updateTask));
    } finally {
      setTaskPendingState(task.taskId, false);
    }
  };

  const handleTaskPredecessorChange = async (task: AgendaTaskItem, value: string) => {
    const predecessorTaskId = value === NO_PREDECESSOR_VALUE ? null : Number(value);
    if (predecessorTaskId != null && (!Number.isFinite(predecessorTaskId) || predecessorTaskId === task.taskId)) {
      setTasksError(copy.messages.updateTask);
      return;
    }

    setTaskPendingState(task.taskId, true);
    setTasksError(null);

    try {
      await updateProcessTaskDependencies(task.taskId, {
        predecessorTaskId,
        dependencyType: 'finish_to_start',
        lagDays: 0,
      });
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.updateTask));
    } finally {
      setTaskPendingState(task.taskId, false);
    }
  };

  const handleTaskGanttDateInputChange = (
    task: AgendaTaskItem,
    field: 'startDate' | 'dueDate',
    value: string,
  ) => {
    if (!value) {
      void persistTaskChange(task, { [field]: null });
      return;
    }

    const ganttDates = getTaskGanttDates(task) ?? { start: value, end: value };
    const currentStart = task.startDate ?? ganttDates.start;
    const currentEnd = task.dueDate ?? ganttDates.end;

    if (field === 'startDate') {
      void persistTaskChange(task, {
        startDate: value,
        dueDate: compareTaskTimelineValues(value, currentEnd) > 0 ? value : currentEnd,
      });
      return;
    }

    void persistTaskChange(task, {
      startDate: compareTaskTimelineValues(value, currentStart) < 0 ? value : currentStart,
      dueDate: value,
    });
  };

  useEffect(() => {
    if (!taskGanttDrag) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const dayDelta = Math.round((event.clientX - taskGanttDrag.originClientX) / taskGanttDrag.dayWidth);
      const preview = getTaskGanttPreview(taskGanttDrag, dayDelta);

      setTaskGanttDrag((currentDrag) =>
        currentDrag && currentDrag.taskId === taskGanttDrag.taskId
          ? {
              ...currentDrag,
              ...preview,
            }
          : currentDrag,
      );
    };

    const handleMouseUp = (event: MouseEvent) => {
      event.preventDefault();
      const dayDelta = Math.round((event.clientX - taskGanttDrag.originClientX) / taskGanttDrag.dayWidth);
      const finalPreview = getTaskGanttPreview(taskGanttDrag, dayDelta);
      const task = tasks.find((currentTask) => currentTask.taskId === taskGanttDrag.taskId);
      const hasChanged =
        finalPreview.previewStart !== taskGanttDrag.originalStart ||
        finalPreview.previewEnd !== taskGanttDrag.originalEnd;

      setTaskGanttDrag(null);

      if (task && hasChanged) {
        void persistTaskChange(task, {
          startDate: finalPreview.previewStart,
          dueDate: finalPreview.previewEnd,
        });
      }
    };

    document.body.classList.add('select-none');
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.body.classList.remove('select-none');
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [taskGanttDrag, tasks]);

  const scopeResponsiblePatch = (
    task: AgendaTaskItem,
    unitId: number | null,
    businessId: number | null,
  ): Partial<TaskPayload> => {
    if (task.assignedUserCompanyId == null) {
      return {};
    }

    const currentCollaborator = collaboratorOptions.find(
      (collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId,
    );

    if (
      !currentCollaborator ||
      collaboratorCanReceiveAssignment(currentCollaborator, unitId, businessId, businessOptions)
    ) {
      return {};
    }

    return {
      assignedUserCompanyId: null,
      assignedName: null,
    };
  };

  const handleUnitCellChange = (task: AgendaTaskItem, value: string) => {
    const nextUnitId = value === NO_UNIT_VALUE ? null : Number(value);
    const currentBusiness =
      task.businessId != null ? scopedBusinessOptions.find((business) => business.id === task.businessId) : undefined;
    const nextBusinessId =
      currentBusiness && businessMatchesUnit(currentBusiness, nextUnitId) ? task.businessId : null;

    void persistTaskChange(task, {
      unitId: Number.isFinite(nextUnitId) ? nextUnitId : null,
      businessId: nextBusinessId,
      ...scopeResponsiblePatch(task, Number.isFinite(nextUnitId) ? nextUnitId : null, nextBusinessId),
    });
  };

  const handleBusinessCellChange = (task: AgendaTaskItem, value: string) => {
    const selectedBusiness =
      value === NO_BUSINESS_VALUE
        ? null
        : scopedBusinessOptions.find((business) => business.id === Number(value)) ?? null;
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

    const selectedCollaborator = collaboratorOptions.find(
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

  const handleDuplicateTask = async (task: AgendaTaskItem) => {
    setTaskPendingState(task.taskId, true);
    setTasksError(null);

    try {
      await createProcessTask(
        buildTaskPayloadFromRecord(task, {
          title: copy.messages.copyPrefix(task.title),
          status: 'pending',
          completionPercent: 0,
          audited: false,
          auditNotes: null,
          projectId: project.id,
        }),
      );
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.duplicateTask));
    } finally {
      setTaskPendingState(task.taskId, false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteTask) {
      return;
    }

    setTaskPendingState(deleteTask.taskId, true);
    setTasksError(null);

    try {
      await deleteProcessTask(deleteTask.taskId);
      setDeleteTask(null);
      if (reportTask?.taskId === deleteTask.taskId) {
        setReportTask(null);
      }
      if (attachmentsTask?.taskId === deleteTask.taskId) {
        setAttachmentsTask(null);
      }
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.deleteTask));
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
    setTasksError(null);
    setTasksNotice(null);

    try {
      if (action === 'delete') {
        await Promise.all(selectedTasks.map((task) => deleteProcessTask(task.taskId)));
      }

      if (action === 'duplicate') {
        await Promise.all(
          selectedTasks.map((task) =>
            createProcessTask(
              buildTaskPayloadFromRecord(task, {
                title: copy.messages.copyPrefix(task.title),
                status: 'pending',
                completionPercent: 0,
                audited: false,
                auditNotes: null,
                projectId: project.id,
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
            updateProcessTask(task.taskId, buildTaskPayloadFromRecord(task, { priority: payload.priority })),
          ),
        );
      }

      if (action === 'assign') {
        const collaborator = payload?.collaborator ?? null;
        await Promise.all(
          selectedTasks.map((task) =>
            updateProcessTask(
              task.taskId,
              buildTaskPayloadFromRecord(task, {
                assignedUserCompanyId: collaborator?.userCompanyId ?? null,
                assignedName: collaborator?.name ?? null,
                unitId: task.unitId ?? collaborator?.unitId ?? project.unitId ?? null,
                businessId: task.businessId ?? collaborator?.businessId ?? project.businessId ?? null,
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
      setTasksNotice(copy.bulk.applied(selectedTasks.length));
      await reloadEverything();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Project task bulk action failed.', { action, error, selectedTaskIds });
      }
      setTasksError(getErrorMessage(error, copy.messages.updateTask));
      await loadTasks();
    } finally {
      setManyTasksPendingState(selectedTaskIds, false);
      setIsBulkActionRunning(false);
    }
  };

  const handleBulkAssign = () => {
    const collaborator =
      bulkResponsibleValue === UNASSIGNED_RESPONSIBLE_VALUE
        ? null
        : collaboratorOptions.find(
            (currentCollaborator) => currentCollaborator.userCompanyId === Number(bulkResponsibleValue),
          ) ?? null;

    void runBulkTaskAction('assign', { collaborator });
  };

  const handleDownloadTaskReport = (task: AgendaTaskItem) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`${copy.report.title} - ${task.folio}`, 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(90, 98, 112);
    doc.text(task.title, 14, 27);

    autoTable(doc, {
      startY: 36,
      theme: 'grid',
      head: [[taskCopy.report.pdf.headField, taskCopy.report.pdf.headValue]],
      body: taskReportRows(task, taskCopy),
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

    doc.save(`${task.folio}-${copy.report.filePrefix}.pdf`);
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
      setTasksError(copy.messages.invalidCompletion);
      return;
    }

    setTaskPendingState(completionTask.taskId, true);
    setTasksError(null);

    try {
      await completeProcessTask(completionTask.taskId, completionNotes, parsedCompletion);
      handleCompletionDialogOpenChange(false);
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.closeTask));
    } finally {
      setTaskPendingState(completionTask.taskId, false);
    }
  };

  const handleAuditTask = (task: AgendaTaskItem) => {
    setAuditTask(task);
    setAuditWeighting(task.weighting != null ? String(Math.max(0, Math.min(5, task.weighting))) : '5');
    setAuditNotes(task.auditNotes ?? '');
  };

  const handleAuditDialogOpenChange = (open: boolean) => {
    if (!open) {
      setAuditTask(null);
      setAuditWeighting('5');
      setAuditNotes('');
    }
  };

  const handleConfirmAudit = async () => {
    if (!auditTask) {
      return;
    }

    const parsedWeighting = Number(auditWeighting);
    if (!Number.isInteger(parsedWeighting) || parsedWeighting < 0 || parsedWeighting > 5) {
      setTasksError(copy.messages.invalidWeighting);
      return;
    }

    setTaskPendingState(auditTask.taskId, true);
    setTasksError(null);

    try {
      await auditProcessTask(auditTask.taskId, parsedWeighting, auditNotes);
      handleAuditDialogOpenChange(false);
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.auditTask));
    } finally {
      setTaskPendingState(auditTask.taskId, false);
    }
  };

  const renderTaskActions = (task: AgendaTaskItem) => {
    const pending = isTaskPending(task.taskId);

    return (
      <div className="flex w-full min-w-[310px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
        <TableActionButton
          label={taskCopy.actions.closeTask}
          onClick={() => handleCloseTask(task)}
          disabled={pending || task.status === 'completed' || task.status === 'cancelled'}
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <TableActionButton
          label={taskCopy.actions.taskReport}
          onClick={() => setReportTask(task)}
          disabled={pending}
          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          icon={<FileText className="h-4 w-4" />}
        />
        <TableActionButton
          label={task.audited ? taskCopy.actions.correctAudit : taskCopy.actions.auditTask}
          onClick={() => handleAuditTask(task)}
          disabled={pending || task.status !== 'completed'}
          className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <TableActionButton
          label={taskCopy.actions.editTask}
          onClick={() => handleEditTask(task)}
          disabled={pending}
          className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
          icon={<Pencil className="h-4 w-4" />}
        />
        <TableActionButton
          label={taskCopy.actions.copyTask}
          onClick={() => {
            void handleDuplicateTask(task);
          }}
          disabled={pending}
          className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
          icon={<Copy className="h-4 w-4" />}
        />
        <TableActionButton
          label={taskCopy.actions.deleteTask}
          onClick={() => setDeleteTask(task)}
          disabled={pending}
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>
    );
  };

  const renderTaskCell = (task: AgendaTaskItem, columnId: ProjectTaskColumnId): ReactNode => {
    const pending = isTaskPending(task.taskId);

    switch (columnId) {
      case 'folio':
        return <div className="text-sm font-semibold text-slate-900 dark:text-white">{task.folio}</div>;
      case 'type':
        return (
          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            {taskCopy.taskTypes[task.taskType]}
          </Badge>
        );
      case 'unit': {
        const unitSelectValue = task.unitId != null ? String(task.unitId) : NO_UNIT_VALUE;
        const currentUnitMissing = task.unitId != null && !scopedUnitOptions.some((unit) => unit.id === task.unitId);

        return (
          <Select value={unitSelectValue} disabled={pending} onValueChange={(value) => handleUnitCellChange(task, value)}>
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full min-w-[180px]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_UNIT_VALUE}>{taskCopy.form.empty.unit}</SelectItem>
              {currentUnitMissing ? (
                <SelectItem value={String(task.unitId)}>{task.unitName ?? `${taskCopy.form.labels.unit} #${task.unitId}`}</SelectItem>
              ) : null}
              {scopedUnitOptions.map((unit) => (
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
          <Select value={businessSelectValue} disabled={pending} onValueChange={(value) => handleBusinessCellChange(task, value)}>
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full min-w-[190px]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_BUSINESS_VALUE}>{taskCopy.form.empty.business}</SelectItem>
              {currentBusinessMissing ? (
                <SelectItem value={String(task.businessId)}>
                  {task.businessName ?? `${taskCopy.form.labels.business} #${task.businessId}`}
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
            placeholder={taskCopy.report.fields.title}
            disabled={pending}
            onCommit={(title) => persistTaskChange(task, { title })}
          />
        );
      case 'description':
        return (
          <InlineTextArea
            value={task.description}
            placeholder={taskCopy.common.noDescription}
            disabled={pending}
            onCommit={(description) => persistTaskChange(task, { description: description || null })}
          />
        );
      case 'createdAt':
        return <div className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(task.createdAt, true, taskCopy.common.noDate)}</div>;
      case 'startDate':
        return (
          <Input
            type="date"
            value={task.startDate ?? ''}
            disabled={pending}
            className={tableInputClass}
            onChange={(event) => void persistTaskChange(task, { startDate: event.target.value || null })}
          />
        );
      case 'dueDate':
        return (
          <Input
            type="date"
            value={task.dueDate ?? ''}
            disabled={pending}
            className={tableInputClass}
            onChange={(event) => void persistTaskChange(task, { dueDate: event.target.value || null })}
          />
        );
      case 'predecessor': {
        const predecessorSelectValue =
          task.predecessorTaskId != null ? String(task.predecessorTaskId) : NO_PREDECESSOR_VALUE;
        const availablePredecessors = predecessorOptions.filter((option) => option.taskId !== task.taskId);

        return (
          <Select
            value={predecessorSelectValue}
            disabled={pending || availablePredecessors.length === 0}
            onValueChange={(value) => {
              void handleTaskPredecessorChange(task, value);
            }}
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full min-w-[220px]')}>
              <SelectValue placeholder={taskCopy.columns.predecessor.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PREDECESSOR_VALUE}>{copy.gantt.noPredecessor}</SelectItem>
              {availablePredecessors.map((option) => (
                <SelectItem key={option.taskId} value={String(option.taskId)}>
                  {option.folio} · {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'status': {
        const displayStatus = getTaskDisplayStatus(task);

        return (
          <Select
            value={displayStatus}
            disabled={pending}
            onValueChange={(value) =>
              value === 'overdue'
                ? undefined
                : void persistTaskChange(task, {
                    status: value as TaskStatus,
                    completionPercent: value === 'completed' ? 100 : task.completionPercent,
                  })
            }
          >
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full min-w-[160px]', statusClasses[displayStatus])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayStatus === 'overdue' ? (
                <SelectItem value="overdue" disabled>
                  {taskCopy.statuses.overdue}
                </SelectItem>
              ) : null}
              {editableStatusValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {taskCopy.statuses[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'creator':
        return (
          <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-medium text-slate-900 dark:text-white">{task.createdByName ?? task.creator ?? taskCopy.common.noRecord}</p>
            {task.createdBy ? <p className="text-xs text-slate-500 dark:text-slate-400">{taskCopy.report.fields.creator} #{task.createdBy}</p> : null}
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
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full min-w-[220px]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_RESPONSIBLE_VALUE}>{taskCopy.common.unassigned}</SelectItem>
              {currentCollaboratorMissing ? (
                <SelectItem value={String(task.assignedUserCompanyId)}>
                  {task.assignedName ?? `${taskCopy.form.labels.responsible} #${task.assignedUserCompanyId}`}
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
          <Select value={task.priority} disabled={pending} onValueChange={(value) => void persistTaskChange(task, { priority: value as TaskPriority })}>
            <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full min-w-[140px]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskPriorityValues.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {taskCopy.priorities[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'attachments':
        return (
          <button
            type="button"
            title={taskCopy.actions.files}
            disabled={pending}
            onClick={() => setAttachmentsTask(task)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-3 py-2 text-sm font-semibold text-[#9A6B05] transition-colors hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
          >
            <FolderOpen className="h-4 w-4" />
            {task.attachments}
          </button>
        );
      case 'project':
        return (
          <div className="min-w-[220px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-white">{task.projectName ?? project.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{task.projectFolio ?? project.folio}</p>
          </div>
        );
      case 'completion':
        return (
          <div className="min-w-[170px]">
            <ProgressSlider
              value={clampPercent(task.completionPercent)}
              label={taskCopy.columns.completion.label}
              disabled={pending}
              onCommit={(completionPercent) => persistTaskChange(task, { completionPercent })}
            />
          </div>
        );
      case 'notes':
        return (
          <InlineTextArea
            value={task.notes}
            placeholder={taskCopy.common.noNotes}
            disabled={pending}
            onCommit={(notes) => persistTaskChange(task, { notes: notes || null })}
          />
        );
      case 'weighting':
        return (
          <InlineNumberInput
            value={task.weighting}
            placeholder={taskCopy.columns.weighting.label}
            rangeMessage={taskCopy.messages.numberRange}
            disabled={pending}
            max={5}
            onInvalid={setTasksError}
            onCommit={(weighting) => persistTaskChange(task, { weighting })}
          />
        );
      case 'auditNotes':
        return task.audited ? (
          <InlineTextArea
            value={task.auditNotes}
            placeholder={taskCopy.common.noAuditNotes}
            disabled={pending}
            onCommit={(auditNotes) => persistTaskChange(task, { audited: true, auditNotes: auditNotes || null })}
          />
        ) : (
          <div className="space-y-2">
            <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-semibold', auditStatusClasses[task.auditStatus])}>
              {taskCopy.auditStatuses[task.auditStatus]}
            </Badge>
            {task.status === 'completed' ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="h-9 rounded-xl border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 shadow-none hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
                onClick={() => handleAuditTask(task)}
              >
                <ClipboardCheck className="h-4 w-4" />
                {taskCopy.actions.auditTask}
              </Button>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{taskCopy.messages.closeBeforeAudit}</p>
            )}
          </div>
        );
    }
  };

  const renderTaskDiagram = () => {
    const dayCount = Math.max(taskTimeline.days.length, 1);
    const ganttDateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' });
    const todayKey = toDateInputValue(new Date());
    const todayIndex = taskTimeline.days.findIndex((day) => toDateInputValue(day) === todayKey);

    if (isLoadingTasks) {
      return (
        <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
          {copy.table.loading}
        </div>
      );
    }

    if (sortedTasks.length === 0) {
      return (
        <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
          {copy.table.empty}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className="grid border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ gridTemplateColumns: 'minmax(340px, 400px) 1fr' }}>
            <div className="border-r border-slate-200 px-5 py-3 dark:border-slate-700">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {copy.gantt.taskColumn}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.gantt.timelineRange}</p>
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(56px, 1fr))` }}>
              {taskTimeline.days.map((day) => {
                const isToday = toDateInputValue(day) === todayKey;

                return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r border-slate-200 px-2 py-3 text-center last:border-r-0 dark:border-slate-700',
                    isToday && 'bg-[#F4C84A]/20 dark:bg-[#F4C84A]/15',
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                    {new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(day)}
                  </p>
                  <p className={cn('mt-1 text-sm font-semibold text-slate-700 dark:text-slate-100', isToday && 'text-[#9A6B05] dark:text-[#FEF3C7]')}>
                    {day.getDate()}
                  </p>
                  {isToday ? (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A6B05] dark:text-[#FEF3C7]">
                      {copy.gantt.today}
                    </p>
                  ) : null}
                </div>
              );
              })}
            </div>
          </div>

          {sortedTasks.map((task) => {
            const activeDrag = taskGanttDrag?.taskId === task.taskId ? taskGanttDrag : null;
            const ganttDates = activeDrag
              ? { start: activeDrag.previewStart, end: activeDrag.previewEnd }
              : getTaskGanttDates(task);
            const taskForRange = ganttDates ? { ...task, startDate: ganttDates.start, dueDate: ganttDates.end } : task;
            const range = getTaskTimelineRange(taskForRange, taskTimeline.start, taskTimeline.end, dayCount);
            const displayStatus = getTaskDisplayStatus(task);
            const isDragging = taskGanttDrag?.taskId === task.taskId;
            const isPending = isTaskPending(task.taskId);
            const duration = ganttDates ? getTaskGanttDuration(ganttDates.start, ganttDates.end) : 0;
            const predecessorSelectValue =
              task.predecessorTaskId != null ? String(task.predecessorTaskId) : NO_PREDECESSOR_VALUE;
            const availablePredecessors = predecessorOptions.filter((option) => option.taskId !== task.taskId);

            return (
              <div
                key={task.taskId}
                className={cn(
                  'grid min-h-[118px] border-b border-slate-200 last:border-b-0 dark:border-slate-700',
                  rowSelection.isSelected(task.taskId) && 'bg-[#F4C84A]/10 dark:bg-[#F4C84A]/15',
                )}
                style={{ gridTemplateColumns: 'minmax(340px, 400px) 1fr' }}
              >
                <div className="border-r border-slate-200 px-5 py-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                      {task.folio}
                    </Badge>
                    <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', statusClasses[displayStatus])}>
                      {taskCopy.statuses[displayStatus]}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{task.title}</p>
                  <div className="mt-2 grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{task.assignedName ?? taskCopy.common.unassigned}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {ganttDates
                          ? `${ganttDateFormatter.format(dateFromTaskTimelineValue(ganttDates.start)!)} - ${ganttDateFormatter.format(dateFromTaskTimelineValue(ganttDates.end)!)}`
                          : taskCopy.common.noDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-[#9A6B05] dark:text-[#FEF3C7]">
                      <Gauge className="h-3.5 w-3.5" />
                      <span>{clampPercent(task.completionPercent)}%</span>
                      {ganttDates ? <span>- {copy.gantt.duration(duration)}</span> : null}
                    </div>
                  </div>
                  {ganttDates ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          {taskCopy.columns.startDate.label}
                        </span>
                        <Input
                          type="date"
                          value={ganttDates.start}
                          disabled={isPending}
                          className="h-8 rounded-lg border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          onChange={(event) => handleTaskGanttDateInputChange(task, 'startDate', event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          {taskCopy.columns.dueDate.label}
                        </span>
                        <Input
                          type="date"
                          value={ganttDates.end}
                          disabled={isPending}
                          className="h-8 rounded-lg border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          onChange={(event) => handleTaskGanttDateInputChange(task, 'dueDate', event.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                  <Select
                    value={predecessorSelectValue}
                    disabled={isPending || availablePredecessors.length === 0}
                    onValueChange={(value) => {
                      void handleTaskPredecessorChange(task, value);
                    }}
                  >
                    <SelectTrigger className="mt-3 h-9 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                      <SelectValue placeholder={taskCopy.columns.predecessor.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PREDECESSOR_VALUE}>{copy.gantt.noPredecessor}</SelectItem>
                      {availablePredecessors.map((option) => (
                        <SelectItem key={option.taskId} value={String(option.taskId)}>
                          {option.folio} · {option.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  className="relative grid"
                  data-task-gantt-track="true"
                  style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(56px, 1fr))` }}
                >
                  {taskTimeline.days.map((day) => {
                    const isToday = toDateInputValue(day) === todayKey;

                    return (
                      <div
                        key={`${task.taskId}-${day.toISOString()}`}
                        className={cn(
                          'border-r border-slate-200 last:border-r-0 dark:border-slate-700',
                          isToday && 'bg-[#F4C84A]/10 dark:bg-[#F4C84A]/10',
                        )}
                      />
                    );
                  })}
                  {todayIndex >= 0 ? (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-[#F4C84A]"
                      style={{ left: `calc(${((todayIndex + 0.5) / dayCount) * 100}%)` }}
                    />
                  ) : null}
                  {range ? (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={task.title}
                      className={cn(
                        'absolute inset-y-5 rounded-xl border px-4 py-2 shadow-sm outline-none transition-shadow',
                        ganttBarClasses[displayStatus],
                        isDragging ? 'z-20 cursor-grabbing shadow-lg ring-2 ring-[#F4C84A]/35' : 'cursor-grab hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#F4C84A]/35',
                        isPending && 'cursor-not-allowed opacity-60',
                      )}
                      onMouseDown={(event) => handleTaskGanttDragStart(event, task, 'move', dayCount)}
                      style={{
                        left: `calc(${(range.startOffset / dayCount) * 100}% + 6px)`,
                        width: `calc(${(range.span / dayCount) * 100}% - 12px)`,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Adjust start date"
                        title="Ajustar fecha de inicio"
                        disabled={isPending}
                        className="absolute bottom-1 left-1 top-1 flex w-6 cursor-ew-resize items-center justify-center rounded-full bg-transparent transition-colors hover:bg-white/45 disabled:cursor-not-allowed dark:hover:bg-slate-900/35"
                        onMouseDown={(event) => handleTaskGanttDragStart(event, task, 'resize-start', dayCount)}
                      >
                        <span className="h-full w-2 rounded-full bg-[#9A6B05]/35 transition-colors hover:bg-[#9A6B05]/70 dark:bg-[#FEF3C7]/35 dark:hover:bg-[#FEF3C7]/70" />
                      </button>
                      <div className="flex h-full items-center justify-between gap-3">
                        <div className="min-w-0 pl-6">
                          <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{task.title}</span>
                          {task.predecessorTaskFolio ? (
                            <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold text-[#9A6B05] dark:bg-slate-900/45 dark:text-[#FEF3C7]">
                              {copy.gantt.dependsOn(task.predecessorTaskFolio)}
                            </span>
                          ) : null}
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-slate-900/40">
                            <span className={cn('block h-full rounded-full', ganttProgressClasses[displayStatus])} style={{ width: `${clampPercent(task.completionPercent)}%` }} />
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{clampPercent(task.completionPercent)}%</span>
                      </div>
                      <button
                        type="button"
                        aria-label="Adjust due date"
                        title="Ajustar fecha de vencimiento"
                        disabled={isPending}
                        className="absolute bottom-1 right-1 top-1 flex w-6 cursor-ew-resize items-center justify-center rounded-full bg-transparent transition-colors hover:bg-white/45 disabled:cursor-not-allowed dark:hover:bg-slate-900/35"
                        onMouseDown={(event) => handleTaskGanttDragStart(event, task, 'resize-end', dayCount)}
                      >
                        <span className="h-full w-2 rounded-full bg-[#9A6B05]/35 transition-colors hover:bg-[#9A6B05]/70 dark:bg-[#FEF3C7]/35 dark:hover:bg-[#FEF3C7]/70" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute inset-y-0 left-4 flex items-center text-xs font-medium text-slate-400 dark:text-slate-500">
                      {taskCopy.common.noDate}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-[#F4C84A]/35 bg-gradient-to-r from-[#FFF8DF] via-white to-[#F8FAFC] px-5 py-5 dark:border-[#F4C84A]/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4C84A] text-slate-950 shadow-sm">
                <FolderOpen className="h-5 w-5" />
              </span>
              <Badge variant="outline" className="rounded-full border-[#F4C84A]/45 bg-white/80 px-3 py-1 font-semibold text-[#9A6B05] dark:bg-slate-800/80 dark:text-[#FEF3C7]">
                {copy.header.eyebrow}
              </Badge>
              <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-semibold', project.status === 'cancelled' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300' : project.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300' : 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9A6B05] dark:text-[#FEF3C7]')}>
                {copy.projectStatuses[project.status]}
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white/80 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                {copy.header.tasksCount(metrics.total)}
              </Badge>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A6B05] dark:text-[#FEF3C7]">
                  {project.folio}
                </p>
                <h3 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {project.name}
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {copy.header.subtitle}
                </p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-2 rounded-2xl border border-[#F4C84A]/35 bg-white/80 p-3 dark:border-[#F4C84A]/25 dark:bg-slate-800/80">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.metrics.productivity}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{metrics.averageCompletion}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.metrics.open}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{metrics.open}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="inline-flex h-10 rounded-xl border border-slate-200 bg-white p-1 shadow-none dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
                  workspaceViewMode === 'table'
                    ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
                onClick={() => setWorkspaceViewMode('table')}
              >
                <ListChecks className="h-4 w-4" />
                {taskCopy.header.actions.table}
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
                  workspaceViewMode === 'diagram'
                    ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
                onClick={() => setWorkspaceViewMode('diagram')}
              >
                <CalendarRange className="h-4 w-4" />
                Gantt
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              onClick={onClose}
            >
              {copy.header.closePanel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:bg-[#F4C84A] hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onClick={() => setIsColumnsModalOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              {copy.header.columns}
            </Button>
            <Button type="button" className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClass)} onClick={handleCreateTaskClick}>
              <Plus className="h-4 w-4" />
              {copy.header.createTask}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {projectContextItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white" title={item.value}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-4 py-3 text-sm font-medium text-[#7A5404] dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]">
          <Target className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{projectInsight}</span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.search}</label>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.status}</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{taskCopy.common.all}</SelectItem>
                {projectTaskStatusFilterValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {taskCopy.statuses[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.responsible}</label>
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{taskCopy.common.all}</SelectItem>
                {responsibleOptions.map((responsible) => (
                  <SelectItem key={responsible} value={responsible}>
                    {responsible}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Badge variant="outline" className="justify-center rounded-2xl border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
            {copy.metrics.completed(metrics.completed)}
          </Badge>
          <Badge variant="outline" className="justify-center rounded-2xl border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
            {copy.metrics.overdue(metrics.overdue)}
          </Badge>
          <Badge variant="outline" className="justify-center rounded-2xl border-violet-200 bg-violet-50 px-3 py-2 font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300">
            {copy.metrics.audited(metrics.audited)}
          </Badge>
          <Badge variant="outline" className="justify-center rounded-2xl border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {copy.metrics.total(metrics.total)}
          </Badge>
        </div>
      </div>

      {tasksError ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{tasksError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadTasks();
              }}
            >
              {taskCopy.common.retry}
            </Button>
          </div>
        </div>
      ) : null}

      {tasksNotice ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{tasksNotice}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-slate-800 dark:text-emerald-200"
              onClick={() => setTasksNotice(null)}
            >
              {taskCopy.common.close}
            </Button>
          </div>
        </div>
      ) : null}

      {rowSelection.selectedCount > 0 ? (
        <div className="border-b border-[#F4C84A]/25 bg-[#F4C84A]/10 px-5 py-3 dark:bg-[#F4C84A]/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Badge variant="outline" className="rounded-full border-[#F4C84A]/40 bg-white px-3 py-1 text-[#9A6B05] dark:bg-slate-800 dark:text-[#FEF3C7]">
                {copy.bulk.selectedLabel(rowSelection.selectedCount)}
              </Badge>
              <span className="text-slate-500 dark:text-slate-400">{copy.bulk.actionsLabel}</span>
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
                {taskCopy.actions.copyTask}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={isBulkActionRunning}
                onClick={() => setIsBulkAssignOpen(true)}
              >
                {taskCopy.form.labels.responsible}
              </Button>
              <Select
                disabled={isBulkActionRunning}
                onValueChange={(value) => {
                  void runBulkTaskAction('priority', { priority: value as TaskPriority });
                }}
              >
                <SelectTrigger className="h-9 w-[160px] rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <SelectValue placeholder={taskCopy.form.labels.priority} />
                </SelectTrigger>
                <SelectContent>
                  {taskPriorityValues.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {taskCopy.priorities[priority]}
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
                {taskCopy.actions.closeTask}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-none hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
                disabled={isBulkActionRunning}
                onClick={() => setBulkConfirmation('delete')}
              >
                <Trash2 className="h-4 w-4" />
                {taskCopy.actions.deleteTask}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                disabled={isBulkActionRunning}
                onClick={rowSelection.clearSelection}
              >
                {taskCopy.common.cancel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {workspaceViewMode === 'table' ? (
        <>
        <div className="overflow-x-auto">
          <Table style={{ minWidth: tableMinWidth }}>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="px-5 py-5" style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}>
                <Checkbox
                  aria-label={copy.bulk.selectAllVisibleLabel}
                  checked={
                    pageTaskSelection.allVisibleSelected
                      ? true
                      : pageTaskSelection.someVisibleSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) => rowSelection.toggleAllVisible(pageTaskIds, checked === true)}
                  className="border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                />
              </TableHead>
              {visibleColumns.map((column) => {
                const columnId = column.id as ProjectTaskColumnId;

                return (
                  <SortableHead
                    key={column.id}
                    column={column}
                    resizeLabel={taskCopy.table.resizeColumn}
                    resizingColumn={resizingColumn}
                    sortState={sortState}
                    width={columnWidths[columnId]}
                    onResizeStart={handleColumnResizeStart}
                    onSort={handleSort}
                  />
                );
              })}
              <TableHead
                className="group relative px-5 py-5"
                style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
              >
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.columns.actions.label}</span>
                <div
                  role="separator"
                  aria-label={taskCopy.table.resizeColumn}
                  aria-orientation="vertical"
                  onMouseDown={(event) => handleColumnResizeStart(event, 'actions')}
                  className="absolute bottom-0 right-0 top-0 w-1 cursor-col-resize bg-transparent transition-colors hover:bg-[#F4C84A] group-hover:bg-[#F4C84A]/30"
                  style={{ background: resizingColumn === 'actions' ? '#F4C84A' : undefined }}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.map((task) => {
              const selected = rowSelection.isSelected(task.taskId);

              return (
              <TableRow
                key={task.taskId}
                className={cn(
                  'border-slate-200 dark:border-slate-700',
                  selected && 'bg-[#F4C84A]/10 dark:bg-[#F4C84A]/15',
                )}
              >
                <TableCell className="px-5 py-5 align-middle" style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth }}>
                  <Checkbox
                    aria-label={copy.bulk.selectTaskLabel(task.folio)}
                    checked={selected}
                    disabled={isTaskPending(task.taskId)}
                    onCheckedChange={(checked) => rowSelection.toggleSelection(task.taskId, checked === true)}
                    className="border-slate-300 data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A]"
                  />
                </TableCell>
                {visibleColumns.map((column) => {
                  const columnId = column.id as ProjectTaskColumnId;

                  return (
                    <TableCell
                      key={`${task.taskId}-${column.id}`}
                      className="px-5 py-5 align-middle"
                      style={{ width: columnWidths[columnId], minWidth: columnWidths[columnId] }}
                    >
                      {renderTaskCell(task, columnId)}
                    </TableCell>
                  );
                })}
                <TableCell
                  className="px-5 py-5 align-middle"
                  style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
                >
                  {renderTaskActions(task)}
                </TableCell>
              </TableRow>
              );
            })}

            {isLoadingTasks ? (
              <TableRow>
                <TableCell colSpan={tableColumnCount} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                  {copy.table.loading}
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoadingTasks && sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColumnCount} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                  {copy.table.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
          </Table>
        </div>
        {!isLoadingTasks && paginatedTaskCount > 0 ? (
          <DataTablePagination
            attached={false}
            className="mt-4"
            currentPage={currentPage}
            itemLabel="tareas"
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageEnd={pageEnd}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageStart={pageStart}
            totalCount={paginatedTaskCount}
            totalPages={totalPages}
          />
        ) : null}
        </>
      ) : (
        renderTaskDiagram()
      )}

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        defaultColumns={defaultColumns}
        fixedColumns={fixedColumns}
        theme="processes"
        onSave={setColumns}
      />

      <TaskFormDialog
        copy={taskCopy}
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogOpenChange}
        mode={taskDialogMode}
        onSubmit={handleSubmitTask}
        form={taskForm}
        isSubmitting={isSubmittingTask}
        processes={processes}
        projects={projects}
        unitOptions={unitOptions}
        businessOptions={businessOptions}
        collaboratorOptions={collaboratorOptions}
        currentUserCollaborator={currentUserCollaborator}
        setForm={setTaskForm}
      />

      <TaskCompletionDialog
        copy={taskCopy.completionDialog}
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
        copy={taskCopy.auditDialog}
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
        commonCopy={taskCopy.common}
        copy={taskCopy.attachmentsDialog}
        open={Boolean(attachmentsTask)}
        task={attachmentsTask}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentsTask(null);
          }
        }}
        onChanged={reloadEverything}
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
          className="!flex h-[min(88vh,760px)] w-[calc(100vw-2rem)] !max-w-[900px] max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:!max-w-[900px] dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="shrink-0 bg-[#F4C84A] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950 sm:text-[1.4rem]">
                <FileText className="h-5 w-5" />
                {copy.report.title}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-2xl border-[#9A6B05]/25 bg-white/35 px-3 text-slate-950 hover:bg-white/60 hover:text-slate-950"
                >
                  {taskCopy.common.close}
                </Button>
              </DialogClose>
            </div>
          </div>

          {reportTask ? (
            <>
              <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {copy.report.description}
                </DialogDescription>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {reportTask.folio}
                  </Badge>
                  <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-semibold', statusClasses[getTaskDisplayStatus(reportTask)])}>
                    {taskCopy.statuses[getTaskDisplayStatus(reportTask)]}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {taskCopy.priorities[reportTask.priority]}
                  </Badge>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-900/60">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{reportTask.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {reportTask.description ?? taskCopy.common.noDescription}
                    </p>
                  </section>
                  <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.report.sections.progress}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {clampPercent(reportTask.completionPercent)}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.report.sections.weighting}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {reportTask.weighting == null ? '-' : `${Math.max(0, Math.min(5, reportTask.weighting))}/5`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.report.sections.audit}</p>
                      <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                        {taskCopy.auditStatuses[reportTask.auditStatus]}
                      </p>
                    </div>
                  </section>
                  <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.report.sections.context}</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <p>{taskCopy.report.fields.unit}: {reportValue(reportTask.unitName ?? reportTask.unitId, taskCopy.common.noRecord)}</p>
                        <p>{taskCopy.report.fields.business}: {reportValue(reportTask.businessName ?? reportTask.businessId, taskCopy.common.noRecord)}</p>
                        <p>{taskCopy.report.fields.project}: {reportValue(reportTask.projectName ?? reportTask.projectId, taskCopy.common.noRecord)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.report.sections.people}</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <p>{taskCopy.report.fields.creator}: {reportValue(reportTask.createdByName ?? reportTask.creator, taskCopy.common.noRecord)}</p>
                        <p>{taskCopy.report.fields.responsible}: {reportValue(reportTask.assignedName, taskCopy.common.noRecord)}</p>
                        <p>{taskCopy.report.fields.completedBy}: {reportValue(reportTask.closedByName ?? reportTask.completedByName, taskCopy.common.noRecord)}</p>
                        <p>{taskCopy.report.fields.auditedBy}: {reportValue(reportTask.auditedByName, taskCopy.common.noRecord)}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                <Button
                  type="button"
                  className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
                  onClick={() => handleDownloadTaskReport(reportTask)}
                >
                  <Download className="h-4 w-4" />
                  {copy.report.downloadPdf}
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
            <DialogTitle className="text-lg font-bold text-slate-950">{taskCopy.form.labels.responsible}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-800/85">
              {copy.bulk.assignDescription(rowSelection.selectedCount)}
            </DialogDescription>
          </div>
          <div className="space-y-3 px-5 py-5">
            <Select value={bulkResponsibleValue} onValueChange={setBulkResponsibleValue}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_RESPONSIBLE_VALUE}>{taskCopy.common.unassigned}</SelectItem>
                {bulkAssignableCollaborators.map((collaborator) => (
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
              {taskCopy.common.cancel}
            </Button>
            <Button
              type="button"
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
              disabled={isBulkActionRunning}
              onClick={handleBulkAssign}
            >
              {isBulkActionRunning ? taskCopy.common.saving : taskCopy.form.submit.edit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isVisible={bulkConfirmation === 'delete'}
        title={copy.deleteTask.title}
        itemName={copy.bulk.selectedItemName(rowSelection.selectedCount)}
        description={copy.deleteTask.description}
        confirmLabel={copy.deleteTask.confirm}
        cancelLabel={taskCopy.common.cancel}
        confirmDisabled={isBulkActionRunning}
        onCancel={() => setBulkConfirmation(null)}
        onConfirm={() => {
          void runBulkTaskAction('delete');
        }}
      />

      <ConfirmDeleteDialog
        isVisible={bulkConfirmation === 'complete'}
        title={taskCopy.actions.closeTask}
        itemName={copy.bulk.selectedItemName(rowSelection.selectedCount)}
        description={copy.bulk.completeDescription}
        confirmLabel={taskCopy.actions.closeTask}
        cancelLabel={taskCopy.common.cancel}
        confirmDisabled={isBulkActionRunning}
        onCancel={() => setBulkConfirmation(null)}
        onConfirm={() => {
          void runBulkTaskAction('complete');
        }}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(deleteTask)}
        title={copy.deleteTask.title}
        itemName={deleteTask?.title}
        description={copy.deleteTask.description}
        confirmLabel={copy.deleteTask.confirm}
        cancelLabel={taskCopy.common.cancel}
        confirmDisabled={deleteTask ? isTaskPending(deleteTask.taskId) : false}
        onCancel={() => setDeleteTask(null)}
        onConfirm={() => {
          void handleConfirmDeleteTask();
        }}
      />
    </section>
  );
}
