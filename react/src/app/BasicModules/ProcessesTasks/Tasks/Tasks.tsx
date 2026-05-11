import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleSlash, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
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
import { accentButtonClass, priorityClasses, priorityLabels } from '../Processes/processesData';
import { listProjects, type ProjectRecord } from '../Projects/projectsApi';
import { TaskFormDialog, type TaskFormValues } from './components/TaskFormDialog';
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
    dueDate: '',
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
    dueDate: task.dueDate ?? '',
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
    dueDate: form.dueDate || null,
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
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [form, setForm] = useState<TaskFormValues>(() => createDefaultTaskForm());
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([]);

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
    const loadProjectsForTaskForm = async () => {
      try {
        const items = await listProjects();
        setProjects(items);
      } catch {
        setProjects([]);
      }
    };

    void loadProjectsForTaskForm();
  }, []);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.folio.toLowerCase().includes(normalizedSearch) ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.assignedName ?? '').toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, tasks]);

  const totalCount = tasks.length;
  const openCount = tasks.filter((task) => ['pending', 'in_progress', 'paused'].includes(task.status)).length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;

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
    setDialogMode('create');
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: TaskRecord) => {
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
    const completionNotes = window.prompt(
      'Completion notes (optional). Leave empty to complete without notes.',
      task.completionNotes ?? '',
    );

    if (completionNotes === null) {
      return;
    }

    setTaskPendingState(task.id, true);
    setTasksError(null);

    try {
      const updatedTask = await completeProcessTask(task.id, completionNotes);
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) => (currentTask.id === task.id ? updatedTask : currentTask)),
      );
    } catch (error) {
      setTasksError(getErrorMessage(error, 'Unable to complete task.'));
    } finally {
      setTaskPendingState(task.id, false);
    }
  };

  const handleCancel = async (taskId: number) => {
    if (!window.confirm('Cancel this task?')) {
      return;
    }

    setTaskPendingState(taskId, true);
    setTasksError(null);

    try {
      const updatedTask = await cancelProcessTask(taskId);
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
    } catch (error) {
      setTasksError(getErrorMessage(error, 'Unable to cancel task.'));
    } finally {
      setTaskPendingState(taskId, false);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!window.confirm('Delete this task? This performs a soft delete.')) {
      return;
    }

    setTaskPendingState(taskId, true);
    setTasksError(null);

    try {
      await deleteProcessTask(taskId);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      setTasksError(getErrorMessage(error, 'Unable to delete task.'));
    } finally {
      setTaskPendingState(taskId, false);
    }
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
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
                placeholder="Folio, title, description, or assignee"
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
          <span className="font-medium text-[rgb(235,165,52)]">{filteredTasks.length}</span> visible
        </span>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Table className="min-w-[1280px]">
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="px-5 py-6">Folio</TableHead>
              <TableHead className="px-5 py-6">Task</TableHead>
              <TableHead className="px-5 py-6">Assigned</TableHead>
              <TableHead className="px-5 py-6">Status</TableHead>
              <TableHead className="px-5 py-6">Priority</TableHead>
              <TableHead className="px-5 py-6">Due date</TableHead>
              <TableHead className="px-5 py-6">Updated</TableHead>
              <TableHead className="px-5 py-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id} className="border-slate-200 dark:border-slate-700">
                <TableCell className="px-5 py-5 text-sm font-semibold text-slate-900 dark:text-white">
                  {task.folio}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[300px] space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    {task.description ? (
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">No description</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Process: {task.processId ?? 'None'}</span>
                      <span>Project: {task.projectId ?? 'None'}</span>
                    </div>
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
                <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                  {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
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
                        void handleCancel(task.id);
                      }}
                      disabled={isTaskPending(task.id) || task.status === 'cancelled'}
                      className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      icon={<CircleSlash className="h-4 w-4" />}
                    />
                    <TaskActionButton
                      label="Delete task"
                      onClick={() => {
                        void handleDelete(task.id);
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
                <TableCell colSpan={8} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                  Loading tasks...
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoadingTasks && filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                  No tasks match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <TaskFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        onSubmit={handleSubmit}
        form={form}
        isSubmitting={isSubmittingTask}
        projects={projects}
        setForm={setForm}
      />
    </>
  );
}
