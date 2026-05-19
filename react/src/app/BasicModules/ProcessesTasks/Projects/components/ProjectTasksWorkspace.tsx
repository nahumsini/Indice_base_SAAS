import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ClipboardCheck,
  Columns3,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { ColumnasConfigModal, type ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
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
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import { authApi } from '../../../../api/auth';
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
  type TaskPayload,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
} from '../../Tasks/tasksApi';
import { listProjectTasks, type ProjectRecord } from '../projectsApi';
import type { ProjectsTranslations } from '../translations';

type DisplayTaskStatus = TaskStatus | 'overdue';
type StatusFilter = 'all' | DisplayTaskStatus;
type OptionFilter = 'all' | string;
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

interface ProjectTaskSortState {
  columnId: ProjectTaskColumnId;
  direction: ProjectTaskSortDirection;
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

const NO_UNIT_VALUE = '__no_unit__';
const NO_BUSINESS_VALUE = '__no_business__';
const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';
const projectTaskColumnsStorageKey = 'processes-tasks-project-task-columns-v1';
const projectTaskSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const prioritySortRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const taskPriorityValues: TaskPriority[] = ['low', 'medium', 'high'];
const editableStatusValues: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'paused'];
const displayStatusValues: DisplayTaskStatus[] = [...editableStatusValues, 'overdue'];

const tableInputClass =
  'h-10 min-w-0 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const tableTextareaClass =
  'min-h-[76px] rounded-xl border-slate-200 bg-white text-sm leading-5 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const tableSelectTriggerClass =
  'h-10 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50';

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

function sortableDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  const time = parsedDate.getTime();

  return Number.isNaN(time) ? null : time;
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

function isHeadquarterUnitName(name: string) {
  const normalizedName = name.trim().toLowerCase();
  return (
    normalizedName === 'headquarter' ||
    normalizedName === 'headquarters' ||
    normalizedName === 'headquater' ||
    normalizedName.includes('headquarter')
  );
}

function businessMatchesUnit(business: ProcessBusinessOption, unitId: number | null) {
  return unitId == null || business.unitId == null || business.unitId === unitId;
}

function collaboratorCanReceiveAssignment(
  collaborator: ProcessCollaboratorOption,
  unitId: number | null,
  businessId: number | null,
  headquarterUnitIds: Set<number>,
) {
  if (collaborator.unitId != null && headquarterUnitIds.has(collaborator.unitId)) {
    return true;
  }

  if (unitId == null && businessId == null) {
    return true;
  }

  if (businessId != null && collaborator.businessId != null) {
    return collaborator.businessId === businessId;
  }

  if (unitId != null && collaborator.unitId != null) {
    return collaborator.unitId === unitId;
  }

  return false;
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
    agendaDate: task.dueDate ?? '',
    startDate: task.startDate,
    dueDate: task.dueDate ?? '',
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

function TableActionButton({
  className,
  disabled,
  icon,
  label,
  onClick,
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

function SortableHead({
  column,
  onSort,
  sortState,
}: {
  column: ColumnConfig;
  onSort: (columnId: ProjectTaskColumnId) => void;
  sortState: ProjectTaskSortState;
}) {
  const columnId = column.id as ProjectTaskColumnId;
  const isActiveSort = sortState.columnId === columnId;
  const SortIcon = isActiveSort ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className="px-5 py-5">
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:text-[rgb(235,165,52)] dark:text-slate-400"
        onClick={() => onSort(columnId)}
      >
        <span className="truncate">{column.label}</span>
        <SortIcon
          className={cn('h-4 w-4 shrink-0', isActiveSort ? 'text-[rgb(235,165,52)]' : 'text-slate-400')}
        />
      </button>
    </TableHead>
  );
}

function InlineTextInput({
  disabled = false,
  onCommit,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onCommit: (value: string) => void | Promise<void>;
  placeholder: string;
  value: string | null | undefined;
}) {
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
      className={tableInputClass}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

function InlineTextArea({
  disabled = false,
  onCommit,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onCommit: (value: string) => void | Promise<void>;
  placeholder: string;
  value: string | null | undefined;
}) {
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
      className={tableTextareaClass}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

function InlineNumberInput({
  disabled = false,
  max = 100,
  min = 0,
  onCommit,
  onInvalid,
  placeholder,
  rangeMessage,
  value,
}: {
  disabled?: boolean;
  max?: number;
  min?: number;
  onCommit: (value: number | null) => void | Promise<void>;
  onInvalid?: (message: string) => void;
  placeholder: string;
  rangeMessage: (field: string, min: number, max: number) => string;
  value: number | null | undefined;
}) {
  const normalizedValue = value == null ? '' : String(value);
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const commit = () => {
    const normalizedDraft = draft.trim();
    if (!normalizedDraft) {
      if (value != null) {
        void onCommit(null);
      }
      return;
    }

    const parsedValue = Number(normalizedDraft);
    if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
      onInvalid?.(rangeMessage(placeholder, min, max));
      setDraft(normalizedValue);
      return;
    }

    if (parsedValue === value) {
      setDraft(normalizedValue);
      return;
    }

    void onCommit(parsedValue);
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
      type="number"
      min={min}
      max={max}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={tableInputClass}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<OptionFilter>('all');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => getInitialColumns(defaultColumns));
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [sortState, setSortState] = useState<ProjectTaskSortState>({ columnId: 'dueDate', direction: 'asc' });
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
    setTaskForm(createDefaultTaskForm(project));
    setEditingTaskId(null);
    setReportTask(null);
    setAttachmentsTask(null);
    setDeleteTask(null);
    void loadTasks();
  }, [loadTasks, project]);

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

  const headquarterUnitIds = useMemo(
    () => new Set(unitOptions.filter((unit) => isHeadquarterUnitName(unit.name)).map((unit) => unit.id)),
    [unitOptions],
  );

  const businessOptionsForUnit = useCallback(
    (unitId: number | null) => businessOptions.filter((business) => businessMatchesUnit(business, unitId)),
    [businessOptions],
  );

  const collaboratorOptionsForScope = useCallback(
    (unitId: number | null, businessId: number | null) =>
      collaboratorOptions.filter((collaborator) =>
        collaboratorCanReceiveAssignment(collaborator, unitId, businessId, headquarterUnitIds),
      ),
    [collaboratorOptions, headquarterUnitIds],
  );

  const currentUserCollaborator = useMemo(
    () =>
      currentUserId == null
        ? null
        : collaboratorOptions.find((collaborator) => collaborator.userId === currentUserId) ?? null,
    [collaboratorOptions, currentUserId],
  );

  const createDefaultTaskFormForCurrentUser = () => {
    const defaultForm = {
      ...createDefaultTaskForm(project),
      assignedUserCompanyId: '',
      assignedName: '',
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
      const matchesStatus = statusFilter === 'all' || getTaskDisplayStatus(task) === statusFilter;
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

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const tableColumnCount = visibleColumns.length + fixedColumns.length;
  const tableMinWidth = Math.max(1280, visibleColumns.length * 180 + 360);

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

  const isTaskPending = (taskId: number) => pendingTaskIds.includes(taskId);

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

  const persistTaskChange = async (task: AgendaTaskItem, patch: Partial<TaskPayload>) => {
    const nextTitle = 'title' in patch ? patch.title : task.title;
    if (!nextTitle?.trim()) {
      setTasksError(copy.messages.titleRequired);
      return;
    }

    setTaskPendingState(task.taskId, true);
    setTasksError(null);

    try {
      await updateProcessTask(task.taskId, buildTaskPayloadFromRecord(task, patch));
      await reloadEverything();
    } catch (error) {
      setTasksError(getErrorMessage(error, copy.messages.updateTask));
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

    const currentCollaborator = collaboratorOptions.find(
      (collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId,
    );

    if (
      !currentCollaborator ||
      collaboratorCanReceiveAssignment(currentCollaborator, unitId, businessId, headquarterUnitIds)
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
      task.businessId != null ? businessOptions.find((business) => business.id === task.businessId) : undefined;
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
        : businessOptions.find((business) => business.id === Number(value)) ?? null;
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
        const currentUnitMissing = task.unitId != null && !unitOptions.some((unit) => unit.id === task.unitId);

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
              {unitOptions.map((unit) => (
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgb(235,165,52)]/35 bg-[rgb(235,165,52)]/10 px-3 py-2 text-sm font-semibold text-[rgb(176,111,22)] transition-colors hover:border-[rgb(235,165,52)] hover:bg-[rgb(235,165,52)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15 dark:text-[rgb(245,196,112)] dark:hover:bg-[rgb(235,165,52)] dark:hover:text-white"
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
          <div className="min-w-[150px] space-y-2">
            <InlineNumberInput
              value={clampPercent(task.completionPercent)}
              placeholder={taskCopy.columns.completion.label}
              rangeMessage={taskCopy.messages.numberRange}
              disabled={pending}
              onInvalid={setTasksError}
              onCommit={(completionPercent) => persistTaskChange(task, { completionPercent: completionPercent ?? 0 })}
            />
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className="h-full rounded-full bg-[rgb(235,165,52)]" style={{ width: `${clampPercent(task.completionPercent)}%` }} />
            </div>
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

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full border-[rgb(235,165,52)]/40 bg-[rgb(235,165,52)]/10 px-3 py-1 font-semibold text-[rgb(176,111,22)]">
                {project.folio}
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {copy.header.tasksCount(metrics.total)}
              </Badge>
            </div>
            <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{copy.header.title(project.name)}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {copy.header.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[rgb(235,165,52)] shadow-none hover:bg-[rgb(235,165,52)] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
                {displayStatusValues.map((value) => (
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
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{copy.metrics.open}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metrics.open}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{copy.metrics.productivity}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metrics.averageCompletion}%</p>
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

      <div className="overflow-x-auto">
        <Table style={{ minWidth: tableMinWidth }}>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              {visibleColumns.map((column) => (
                <SortableHead key={column.id} column={column} sortState={sortState} onSort={handleSort} />
              ))}
              <TableHead className="px-5 py-5">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{taskCopy.columns.actions.label}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => (
              <TableRow key={task.taskId} className="border-slate-200 dark:border-slate-700">
                {visibleColumns.map((column) => {
                  const columnId = column.id as ProjectTaskColumnId;

                  return (
                    <TableCell key={`${task.taskId}-${column.id}`} className="px-5 py-5 align-middle">
                      {renderTaskCell(task, columnId)}
                    </TableCell>
                  );
                })}
                <TableCell className="px-5 py-5 align-middle">{renderTaskActions(task)}</TableCell>
              </TableRow>
            ))}

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

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        fixedColumns={fixedColumns}
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
          <div className="shrink-0 bg-[rgb(235,165,52)] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                <FileText className="h-5 w-5" />
                {copy.report.title}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-2xl border-white/70 bg-white/10 px-3 text-white hover:bg-white/20 hover:text-white"
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
