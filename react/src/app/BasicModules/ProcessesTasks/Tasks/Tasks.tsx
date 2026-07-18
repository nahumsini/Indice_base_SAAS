import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleSlash, ClipboardCheck, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
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
import { cn } from '../../../components/ui/utils';
import { authApi } from '../../../api/auth';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { accentButtonClass, priorityClasses, priorityLabels } from '../Processes/processesData';
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

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  paused: 'Paused',
};

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

const taskTypeLabels = {
  task: 'Task',
  'project-task': 'Project task',
  process: 'Process task',
} as const;

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors';

function createDefaultTaskForm(): TaskFormValues {
  return {
    title: '',
    description: '',
    processId: '',
    projectId: '',
    assignedUserCompanyId: '',
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

function parseOptionalNumber(value: string, fieldLabel: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} must be a positive integer.`);
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

function buildTaskPayload(form: TaskFormValues): TaskPayload {
  const assignedUserCompanyId = parseOptionalNumber(form.assignedUserCompanyId, 'Assigned HR user ID');

  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    processId: parseOptionalNumber(form.processId, 'Process ID'),
    projectId: parseOptionalNumber(form.projectId, 'Project ID'),
    assignedUserCompanyId,
    assignedName: form.assignedName.trim() ? form.assignedName.trim() : null,
    status: form.status,
    priority: form.priority,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    notes: form.notes.trim() ? form.notes.trim() : null,
    completionPercent: parseOptionalNumberInRange(form.completionPercent, 'Completion %', 0, 100),
    weighting: parseOptionalNumberInRange(form.weighting, 'Weighting', 0, 5),
    audited: form.audited,
    auditNotes: form.audited && form.auditNotes.trim() ? form.auditNotes.trim() : null,
    businessId: parseOptionalNumber(form.businessId, 'Business ID'),
    unitId: parseOptionalNumber(form.unitId, 'Unit ID'),
  };
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) {
    return 'No date';
  }

  const date = includeTime ? new Date(value) : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat('en-US', {
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

  const loadTasks = async () => {
    setIsLoadingTasks(true);
    setTasksError(null);

    try {
      const items = await listProcessTasks();
      setTasks(items);
    } catch (error) {
      setTasks([]);
      setTasksError(getErrorMessage(error, 'Unable to load tasks.'));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

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
    resetKey: `${searchQuery}:${statusFilter}`,
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
      const payload = buildTaskPayload(form);

      if (dialogMode === 'edit' && editingTaskId !== null) {
        const updatedTask = await updateProcessTask(editingTaskId, payload);
        setTasks((currentTasks) =>
          currentTasks.map((task) => (task.id === editingTaskId ? updatedTask : task)),
        );
      } else {
        const createdTask = await createProcessTask(payload);
        setTasks((currentTasks) => [createdTask, ...currentTasks]);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setTasksError(getErrorMessage(error, 'Unable to save task.'));
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
      setTasksError('Completion % must be between 0 and 100.');
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
      setTasksError(getErrorMessage(error, 'Unable to complete task.'));
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
      setTasksError(getErrorMessage(error, type === 'cancel' ? 'Unable to cancel task.' : 'Unable to delete task.'));
    } finally {
      setTaskPendingState(task.id, false);
    }
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 p-6 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">Execution queue</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Tasks are the main executable work unit. They can stand alone or reference a process or project later.
            </p>
          </div>
          <Button className={cn('h-11 gap-2 rounded-xl px-4', accentButtonClass)} onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </div>
      </section>

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
              Retry
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">Filters</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Search task</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Folio, title, notes, assignee, unit, or business"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <span>
          <span className="font-medium text-slate-900 dark:text-white">{totalCount}</span> total tasks
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-blue-600">{openCount}</span> open
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-emerald-600">{completedCount}</span> completed
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-[#9A6B05]">{averageCompletion}%</span> avg completion
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-violet-600">{auditedCount}</span> audited
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-red-600">{overdueCount}</span> overdue
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-[#9A6B05]">{filteredTasks.length}</span> visible
        </span>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table className="min-w-[1540px]">
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead className="px-5 py-6">Folio</TableHead>
                <TableHead className="px-5 py-6">Type</TableHead>
                <TableHead className="px-5 py-6">Task</TableHead>
                <TableHead className="px-5 py-6">Assigned</TableHead>
                <TableHead className="px-5 py-6">Status</TableHead>
                <TableHead className="px-5 py-6">Priority</TableHead>
                <TableHead className="px-5 py-6">Progress</TableHead>
                <TableHead className="px-5 py-6">Schedule</TableHead>
                <TableHead className="px-5 py-6">Context</TableHead>
                <TableHead className="px-5 py-6">Updated</TableHead>
                <TableHead className="px-5 py-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.map((task) => (
                <TableRow key={task.id} className="border-slate-200 dark:border-slate-700">
                <TableCell className="px-5 py-5 text-sm font-semibold text-slate-900 dark:text-white">
                  {task.folio}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {taskTypeLabels[task.taskType]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[300px] space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                      {isTaskOverdue(task) ? (
                        <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                          Overdue
                        </Badge>
                      ) : null}
                    </div>
                    {task.description ? (
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">No description</p>
                    )}
                    {task.notes ? (
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">Notes: {task.notes}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[180px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p className="font-medium text-slate-900 dark:text-white">{task.assignedName ?? 'Unassigned'}</p>
                    {task.assignedUserCompanyId ? <p>HR user #{task.assignedUserCompanyId}</p> : null}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-semibold', statusClasses[task.status])}>
                    {statusLabels[task.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge
                    variant="outline"
                    className={cn('rounded-full px-3 py-1 font-semibold capitalize', priorityClasses[task.priority])}
                  >
                    {priorityLabels[task.priority as TaskPriority]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[160px] space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {clampPercent(task.completionPercent)}%
                      </span>
                      {task.audited ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A6B05]">
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
                    <p>Start: {task.startDate ? formatDate(task.startDate) : 'No date'}</p>
                    <p>Due: {task.dueDate ? formatDate(task.dueDate) : 'No date'}</p>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[180px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p>Project: {task.projectId ?? 'None'}</p>
                    <p>Process: {task.processId ?? 'None'}</p>
                    <p>Unit: {task.unitName ?? task.unitId ?? 'None'}</p>
                    <p>Business: {task.businessName ?? task.businessId ?? 'None'}</p>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(task.updatedAt, true)}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <TaskActionButton
                      label="Edit task"
                      onClick={() => openEditDialog(task)}
                      disabled={isTaskPending(task.id)}
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      icon={<Pencil className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label="Complete task"
                      onClick={() => {
                        void handleComplete(task);
                      }}
                      disabled={isTaskPending(task.id) || task.status === 'completed'}
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label="Cancel task"
                      onClick={() => {
                        handleCancel(task);
                      }}
                      disabled={isTaskPending(task.id) || task.status === 'cancelled'}
                      className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      icon={<CircleSlash className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label="Delete task"
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
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoadingTasks && filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                    No tasks match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        {!isLoadingTasks && filteredTaskCount > 0 ? (
          <DataTablePagination
            currentPage={currentPage}
            itemLabel="tareas"
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
        title={confirmation?.type === 'cancel' ? 'Cancel task' : 'Delete task'}
        itemName={confirmation?.task.title}
        description={
          confirmation?.type === 'cancel'
            ? 'This will move the task to cancelled and keep it available for audit history.'
            : 'This performs a soft delete and removes the task from the active queue.'
        }
        confirmLabel={confirmation?.type === 'cancel' ? 'Cancel task' : 'Delete task'}
        confirmDisabled={confirmation ? isTaskPending(confirmation.task.id) : false}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          void handleConfirmAction();
        }}
      />
    </>
  );
}
