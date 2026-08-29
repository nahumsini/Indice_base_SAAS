import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleSlash, ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
} from '../../../components/frontend-os';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { authApi } from '../../../api/auth';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { useLanguage } from '../../../shared/context';
import { accentButtonClass, priorityClasses } from '../Processes/processesData';
import { listProcesses } from '../Processes/processesApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessRecord,
  ProcessUnitOption,
} from '../Processes/types';
import { listProjects, type ProjectRecord } from '../Projects/projectsApi';
import { TaskCompletionDialog } from './components/TaskCompletionDialog';
import { TaskFormDialog, type TaskFormValues } from './components/TaskFormDialog';
import { defaultTaskScopeForActor } from '../shared/assignmentScope';
import { listProcessTaskAssignmentOptions } from '../shared/assignmentCatalogApi';
import { useAgendaTranslations, type AgendaTranslations } from '../Agenda/translations';
import { useTaskQueueTranslations, type TaskQueueCopy } from './taskQueueTranslations';
import {
  cancelProcessTask,
  completeProcessTask,
  createProcessTask,
  deleteProcessTask,
  listProcessTasks,
  updateProcessTask,
  type TaskPayload,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
} from './tasksApi';

type StatusFilter = 'all' | TaskStatus;
type ConfirmationState = { type: 'cancel' | 'delete'; task: TaskRecord } | null;

interface TaskLoadOptions {
  background?: boolean;
}

const statusClasses: Record<TaskStatus, string> = {
  pending:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200',
  in_progress:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelled:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
};

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors';

function createDefaultTaskForm(): TaskFormValues {
  return {
    title: '',
    description: '',
    processId: '',
    projectId: '',
    assignedUserCompanyId: '',
    assigneeUserCompanyIds: [],
    assignedName: '',
    status: 'pending',
    priority: 'medium',
    startDate: '',
    dueDate: '',
    notes: '',
    completionPercent: '',
    weighting: '',
    audited: false,
    auditNotes: '',
    businessId: '',
    unitId: '',
  };
}

function toTaskFormValues(task: TaskRecord): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    processId: task.processId?.toString() ?? '',
    projectId: task.projectId?.toString() ?? '',
    assignedUserCompanyId: task.assignedUserCompanyId?.toString() ?? '',
    assigneeUserCompanyIds:
      task.assigneeUserCompanyIds.length > 0
        ? task.assigneeUserCompanyIds.map(String)
        : task.assignedUserCompanyId != null
          ? [String(task.assignedUserCompanyId)]
          : [],
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseOptionalNumber(value: string, invalidMessage: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(invalidMessage);
  }

  return parsed;
}

function parseOptionalNumberInRange(value: string, invalidMessage: string, min: number, max: number) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(invalidMessage);
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

function buildTaskPayload(form: TaskFormValues, agendaCopy: AgendaTranslations, pageCopy: TaskQueueCopy): TaskPayload {
  const positiveIntegerMessage = (label: string) => pageCopy.messages.positiveInteger(label.replace(' *', ''));
  const assignedUserCompanyId = parseOptionalNumber(
    form.assignedUserCompanyId,
    positiveIntegerMessage(agendaCopy.form.labels.responsible),
  );
  const assigneeUserCompanyIds = Array.from(
    new Set(
      [assignedUserCompanyId, ...form.assigneeUserCompanyIds.map(Number)].filter(
        (value): value is number => Number.isInteger(value) && Number(value) > 0,
      ),
    ),
  );

  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    processId: parseOptionalNumber(form.processId, positiveIntegerMessage(agendaCopy.form.labels.process)),
    projectId: parseOptionalNumber(form.projectId, positiveIntegerMessage(agendaCopy.form.labels.project)),
    assignedUserCompanyId,
    assigneeUserCompanyIds,
    assignedName: form.assignedName.trim() ? form.assignedName.trim() : null,
    status: form.status,
    priority: form.priority,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    notes: form.notes.trim() ? form.notes.trim() : null,
    completionPercent: parseOptionalNumberInRange(
      form.completionPercent,
      agendaCopy.messages.numberRange(agendaCopy.form.labels.completion, 0, 100),
      0,
      100,
    ),
    weighting: parseOptionalNumberInRange(
      form.weighting,
      agendaCopy.messages.weightingRange(5),
      0,
      5,
    ),
    audited: form.audited,
    auditNotes: form.audited && form.auditNotes.trim() ? form.auditNotes.trim() : null,
    businessId: parseOptionalNumber(form.businessId, positiveIntegerMessage(agendaCopy.form.labels.business)),
    unitId: parseOptionalNumber(form.unitId, positiveIntegerMessage(agendaCopy.form.labels.unit)),
  };
}

function formatDate(value: string | null, locale: string, noDateLabel: string, includeTime = false) {
  if (!value) {
    return noDateLabel;
  }

  const date = includeTime ? new Date(value) : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(locale, {
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

function isTaskOverdue(task: TaskRecord) {
  if (!task.dueDate || ['completed', 'cancelled'].includes(task.status)) {
    return false;
  }

  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(`${task.dueDate}T00:00:00`) < todayAtMidnight;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function TaskActionButton({
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

export default function Tasks() {
  const agendaCopy = useAgendaTranslations();
  const pageCopy = useTaskQueueTranslations();
  const { currentLanguage } = useLanguage();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [catalogUnits, setCatalogUnits] = useState<ProcessUnitOption[]>([]);
  const [catalogBusinesses, setCatalogBusinesses] = useState<ProcessBusinessOption[]>([]);
  const [catalogCollaborators, setCatalogCollaborators] = useState<ProcessCollaboratorOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [form, setForm] = useState<TaskFormValues>(() => createDefaultTaskForm());
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([]);
  const [completionTask, setCompletionTask] = useState<TaskRecord | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPercent, setCompletionPercent] = useState('100');
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [paginationResetRevision, setPaginationResetRevision] = useState(0);
  const hasLoadedTasksRef = useRef(false);
  const backgroundRefreshPromiseRef = useRef<Promise<void> | null>(null);

  const loadTasks = useCallback(async ({ background = false }: TaskLoadOptions = {}) => {
    const showInitialLoading = !background && !hasLoadedTasksRef.current;
    if (showInitialLoading) {
      setIsLoadingTasks(true);
    }

    try {
      const items = await listProcessTasks();
      setTasks(items);
      setTasksError(null);
      hasLoadedTasksRef.current = true;
    } catch (error) {
      if (!hasLoadedTasksRef.current) {
        setTasks([]);
      }
      setTasksError(getErrorMessage(error, pageCopy.messages.load));
    } finally {
      if (showInitialLoading) {
        setIsLoadingTasks(false);
      }
    }
  }, [pageCopy.messages.load]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const refreshTasks = () => {
      if (document.visibilityState === 'hidden' || backgroundRefreshPromiseRef.current) {
        return;
      }

      const refreshPromise = loadTasks({ background: true });
      backgroundRefreshPromiseRef.current = refreshPromise;
      void refreshPromise.finally(() => {
        if (backgroundRefreshPromiseRef.current === refreshPromise) {
          backgroundRefreshPromiseRef.current = null;
        }
      });
    };
    const intervalId = window.setInterval(refreshTasks, 30_000);
    window.addEventListener('focus', refreshTasks);
    document.addEventListener('visibilitychange', refreshTasks);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshTasks);
      document.removeEventListener('visibilitychange', refreshTasks);
    };
  }, [loadTasks]);

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
    const loadRelationsForTaskForm = async () => {
      const [projectResult, processResult, unitResult, businessResult, assignmentResult] = await Promise.allSettled([
        listProjects(),
        listProcesses(),
        dashboardApi.listUnits(),
        dashboardApi.listBusinesses(),
        listProcessTaskAssignmentOptions(),
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
        assignmentResult.status === 'fulfilled'
          ? assignmentResult.value
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
    };

    void loadRelationsForTaskForm();
  }, []);

  const currentUserCollaborator = useMemo(
    () =>
      currentUserId == null
        ? null
        : catalogCollaborators.find((collaborator) => collaborator.userId === currentUserId) ?? null,
    [catalogCollaborators, currentUserId],
  );

  const createDefaultTaskFormForCurrentUser = () => {
    const defaultForm = createDefaultTaskForm();

    if (!currentUserCollaborator) {
      return defaultForm;
    }

    return {
      ...defaultForm,
      assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
      assigneeUserCompanyIds: [currentUserCollaborator.userCompanyId.toString()],
      assignedName: currentUserCollaborator.name,
      unitId: defaultTaskScopeForActor(currentUserCollaborator).unitId?.toString() ?? '',
      businessId: defaultTaskScopeForActor(currentUserCollaborator).businessId?.toString() ?? '',
    };
  };

  useEffect(() => {
    if (!isDialogOpen || dialogMode !== 'create' || !currentUserCollaborator) {
      return;
    }

    setForm((currentForm) => {
      if (currentForm.assignedUserCompanyId || currentForm.assignedName) {
        return currentForm;
      }

      return {
        ...currentForm,
        assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
        assigneeUserCompanyIds: [currentUserCollaborator.userCompanyId.toString()],
        assignedName: currentUserCollaborator.name,
        unitId: currentForm.unitId || defaultTaskScopeForActor(currentUserCollaborator).unitId?.toString() || '',
        businessId:
          currentForm.businessId || defaultTaskScopeForActor(currentUserCollaborator).businessId?.toString() || '',
      };
    });
  }, [currentUserCollaborator, dialogMode, isDialogOpen]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.folio.toLowerCase().includes(normalizedSearch) ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.assignedName ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.notes ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.businessName ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.unitName ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.projectName ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.projectFolio ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.processTitle ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.processFolio ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.createdByName ?? '').toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, tasks]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedTasks,
    totalCount: filteredTaskCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${searchQuery}:${statusFilter}:${paginationResetRevision}`,
    rows: filteredTasks,
  });

  const totalCount = tasks.length;
  const openCount = tasks.filter((task) => ['pending', 'in_progress', 'paused'].includes(task.status)).length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const auditedCount = tasks.filter((task) => task.audited).length;
  const overdueCount = tasks.filter(isTaskOverdue).length;
  const averageCompletion =
    totalCount > 0
      ? Math.round(tasks.reduce((sum, task) => sum + clampPercent(task.completionPercent), 0) / totalCount)
      : 0;

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

  const resetForm = () => {
    setForm(createDefaultTaskForm());
    setEditingTaskId(null);
  };

  const openCreateDialog = () => {
    setTasksError(null);
    setDialogMode('create');
    setEditingTaskId(null);
    setForm(createDefaultTaskFormForCurrentUser());
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: TaskRecord) => {
    setTasksError(null);
    setDialogMode('edit');
    setEditingTaskId(task.id);
    setForm(toTaskFormValues(task));
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }

    setIsDialogOpen(open);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmittingTask(true);
    setTasksError(null);

    try {
      const payload = buildTaskPayload(form, agendaCopy, pageCopy);

      if (dialogMode === 'edit' && editingTaskId !== null) {
        const updatedTask = await updateProcessTask(editingTaskId, payload);
        setTasks((currentTasks) =>
          currentTasks.map((task) => (task.id === editingTaskId ? updatedTask : task)),
        );
      } else {
        const createdTask = await createProcessTask(payload);
        setTasks((currentTasks) => [createdTask, ...currentTasks]);
        setSearchQuery('');
        setStatusFilter('all');
        setPaginationResetRevision((currentRevision) => currentRevision + 1);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setTasksError(getErrorMessage(error, pageCopy.messages.save));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleComplete = async (task: TaskRecord) => {
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
      setTasksError(pageCopy.messages.invalidCompletion);
      return;
    }

    setTaskPendingState(completionTask.id, true);
    setTasksError(null);

    try {
      const updatedTask = await completeProcessTask(completionTask.id, completionNotes, parsedCompletion);
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) => (currentTask.id === completionTask.id ? updatedTask : currentTask)),
      );
      handleCompletionDialogOpenChange(false);
    } catch (error) {
      setTasksError(getErrorMessage(error, pageCopy.messages.complete));
    } finally {
      setTaskPendingState(completionTask.id, false);
    }
  };

  const handleCancel = (task: TaskRecord) => {
    setConfirmation({ type: 'cancel', task });
  };

  const handleDelete = (task: TaskRecord) => {
    setConfirmation({ type: 'delete', task });
  };

  const handleConfirmAction = async () => {
    if (!confirmation) {
      return;
    }

    const { task, type } = confirmation;
    setTaskPendingState(task.id, true);
    setTasksError(null);

    try {
      if (type === 'cancel') {
        const updatedTask = await cancelProcessTask(task.id);
        setTasks((currentTasks) =>
          currentTasks.map((currentTask) => (currentTask.id === task.id ? updatedTask : currentTask)),
        );
      } else {
        await deleteProcessTask(task.id);
        setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id));
      }

      setConfirmation(null);
    } catch (error) {
      setTasksError(getErrorMessage(error, type === 'cancel' ? pageCopy.messages.cancel : pageCopy.messages.delete));
    } finally {
      setTaskPendingState(task.id, false);
    }
  };

  return (
    <>
      <IndiceTitleBar
        actions={<Button className={cn('h-11 gap-2 rounded-xl px-4', accentButtonClass)} onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            {pageCopy.add}
          </Button>}
        className="mb-5"
        icon={<ClipboardCheck className="h-5 w-5" />}
        subtitle={pageCopy.subtitle}
        title={pageCopy.title}
        tone="yellow"
      />

      {tasksError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
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
              {pageCopy.retry}
            </Button>
          </div>
        </section>
      ) : null}

      <IndiceFilterBar className="mb-6" gridClassName="lg:grid-cols-2" title={agendaCopy.filters.title}>
        <IndiceFilterSearch
          label={agendaCopy.filters.search}
          onValueChange={setSearchQuery}
          placeholder={agendaCopy.filters.searchPlaceholder}
          tone="yellow"
          value={searchQuery}
        />
        <IndiceFilterSelect
          label={agendaCopy.filters.status}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          options={[
            { value: 'all', label: agendaCopy.common.all },
            ...(['pending', 'in_progress', 'completed', 'cancelled', 'paused'] as TaskStatus[])
              .map((value) => ({ value, label: agendaCopy.statuses[value] })),
          ]}
          tone="yellow"
          value={statusFilter}
        />
      </IndiceFilterBar>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <span>
          <span className="font-medium text-slate-900 dark:text-white">{totalCount}</span> {pageCopy.metrics.total}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-blue-600">{openCount}</span> {pageCopy.metrics.open}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-emerald-600">{completedCount}</span> {pageCopy.metrics.completed}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-[#9A6B05]">{averageCompletion}%</span> {pageCopy.metrics.average}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-violet-600">{auditedCount}</span> {pageCopy.metrics.audited}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-red-600">{overdueCount}</span> {pageCopy.metrics.overdue}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-[#9A6B05]">{filteredTasks.length}</span> {pageCopy.metrics.visible}
        </span>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table className="min-w-[1540px]">
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead className="px-5 py-6">{agendaCopy.columns.folio.label}</TableHead>
                <TableHead className="px-5 py-6">{agendaCopy.columns.type.label}</TableHead>
                <TableHead className="px-5 py-6">{agendaCopy.columns.title.label}</TableHead>
                <TableHead className="px-5 py-6">{pageCopy.assigned}</TableHead>
                <TableHead className="px-5 py-6">{agendaCopy.columns.status.label}</TableHead>
                <TableHead className="px-5 py-6">{agendaCopy.columns.priority.label}</TableHead>
                <TableHead className="px-5 py-6">{agendaCopy.columns.completion.label}</TableHead>
                <TableHead className="px-5 py-6">{pageCopy.schedule}</TableHead>
                <TableHead className="px-5 py-6">{pageCopy.context}</TableHead>
                <TableHead className="px-5 py-6">{pageCopy.updated}</TableHead>
                <TableHead className="px-5 py-6">{agendaCopy.columns.actions.label}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.map((task) => (
                <TableRow key={task.id} className="border-slate-200 dark:border-slate-700">
                <TableCell className="px-5 py-5 text-sm font-medium text-slate-900 dark:text-white">
                  {task.folio}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {agendaCopy.taskTypes[task.taskType]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[300px] space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{task.title}</p>
                      {isTaskOverdue(task) ? (
                        <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                          Overdue
                        </Badge>
                      ) : null}
                    </div>
                    {task.description ? (
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">{agendaCopy.common.noDescription}</p>
                    )}
                    {task.notes ? (
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{agendaCopy.columns.notes.label}: {task.notes}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[180px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p className="font-medium text-slate-900 dark:text-white">{task.assignedName ?? 'Unassigned'}</p>
                    {task.assignedUserCompanyId ? <p>{pageCopy.hrUser} #{task.assignedUserCompanyId}</p> : null}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-medium', statusClasses[task.status])}>
                    {agendaCopy.statuses[task.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge
                    variant="outline"
                    className={cn('rounded-full px-3 py-1 font-medium capitalize', priorityClasses[task.priority])}
                  >
                    {agendaCopy.priorities[task.priority as TaskPriority]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[160px] space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {clampPercent(task.completionPercent)}%
                      </span>
                      {task.audited ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9A6B05]">
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Audited
                        </span>
                      ) : null}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-[#F4C84A]"
                        style={{ width: `${clampPercent(task.completionPercent)}%` }}
                      />
                    </div>
                    {task.weighting !== null ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Weighting: {Math.max(0, Math.min(5, task.weighting))}/5
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                  <div className="min-w-[150px] space-y-1">
                    <p>{pageCopy.start}: {formatDate(task.startDate, currentLanguage.code, agendaCopy.common.noDate)}</p>
                    <p>{pageCopy.due}: {formatDate(task.dueDate, currentLanguage.code, agendaCopy.common.noDate)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[180px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p>{pageCopy.project}: {task.projectName ?? task.projectFolio ?? pageCopy.none}</p>
                    <p>{pageCopy.process}: {task.processTitle ?? task.processFolio ?? pageCopy.none}</p>
                    <p>{pageCopy.unit}: {task.unitName ?? task.unitId ?? pageCopy.none}</p>
                    <p>{pageCopy.business}: {task.businessName ?? task.businessId ?? pageCopy.none}</p>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(task.updatedAt, currentLanguage.code, agendaCopy.common.noDate, true)}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <TaskActionButton
                      label={pageCopy.actions.edit}
                      onClick={() => openEditDialog(task)}
                      disabled={isTaskPending(task.id)}
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      icon={<Pencil className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label={pageCopy.actions.complete}
                      onClick={() => {
                        void handleComplete(task);
                      }}
                      disabled={isTaskPending(task.id) || task.status === 'completed'}
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label={pageCopy.actions.cancel}
                      onClick={() => {
                        handleCancel(task);
                      }}
                      disabled={isTaskPending(task.id) || task.status === 'cancelled'}
                      className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      icon={<CircleSlash className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label={pageCopy.actions.delete}
                      onClick={() => {
                        handleDelete(task);
                      }}
                      disabled={isTaskPending(task.id)}
                      className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </TableCell>
                </TableRow>
              ))}

              {isLoadingTasks ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                    {agendaCopy.table.loading}
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoadingTasks && filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                    {agendaCopy.table.empty}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        {!isLoadingTasks && filteredTaskCount > 0 ? (
          <DataTablePagination
            currentPage={currentPage}
            itemLabel={pageCopy.itemLabel}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageEnd={pageEnd}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageStart={pageStart}
            totalCount={filteredTaskCount}
            totalPages={totalPages}
          />
        ) : null}
      </section>

      <TaskFormDialog
        copy={agendaCopy}
        error={tasksError}
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        onSubmit={handleSubmit}
        form={form}
        isSubmitting={isSubmittingTask}
        processes={processes}
        projects={projects}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        collaboratorOptions={catalogCollaborators}
        currentUserCollaborator={currentUserCollaborator}
        setForm={setForm}
      />

      <TaskCompletionDialog
        copy={agendaCopy.completionDialog}
        error={tasksError}
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
        isSubmitting={completionTask ? isTaskPending(completionTask.id) : false}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(confirmation)}
        title={confirmation?.type === 'cancel' ? pageCopy.actions.cancel : pageCopy.actions.delete}
        itemName={confirmation?.task.title}
        description={
          confirmation?.type === 'cancel'
            ? pageCopy.confirmation.cancelDescription
            : pageCopy.confirmation.deleteDescription
        }
        cancelLabel={agendaCopy.common.cancel}
        confirmLabel={confirmation?.type === 'cancel' ? pageCopy.actions.cancel : pageCopy.actions.delete}
        confirmDisabled={confirmation ? isTaskPending(confirmation.task.id) : false}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          void handleConfirmAction();
        }}
      />
    </>
  );
}
