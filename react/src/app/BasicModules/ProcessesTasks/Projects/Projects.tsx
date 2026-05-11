import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleSlash, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { ProjectFormDialog, type ProjectFormValues } from './components/ProjectFormDialog';
import {
  cancelProject,
  completeProject,
  createProject,
  deleteProject,
  listProjectTasks,
  listProjects,
  updateProject,
  type ProjectPayload,
  type ProjectPriority,
  type ProjectRecord,
  type ProjectStatus,
} from './projectsApi';

type StatusFilter = 'all' | ProjectStatus;

const statusLabels: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusClasses: Record<ProjectStatus, string> = {
  active:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelled:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
};

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors';

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

function buildProjectPayload(form: ProjectFormValues): ProjectPayload {
  const ownerUserCompanyId = parseOptionalNumber(form.ownerUserCompanyId, 'Owner HR user ID');

  return {
    name: form.name.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    status: form.status,
    priority: form.priority === 'none' ? null : form.priority,
    ownerUserCompanyId,
    ownerName: form.ownerName.trim() ? form.ownerName.trim() : null,
    businessId: parseOptionalNumber(form.businessId, 'Business ID'),
    unitId: parseOptionalNumber(form.unitId, 'Unit ID'),
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
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

function ProjectActionButton({
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
      className={cn(actionButtonBaseClass, className, disabled && 'cursor-not-allowed opacity-60')}
    >
      {icon}
    </button>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<number, number>>({});
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectFormValues>(() => createDefaultProjectForm());
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [pendingProjectIds, setPendingProjectIds] = useState<number[]>([]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    setProjectsError(null);

    try {
      const items = await listProjects();
      setProjects(items);

      const counts = await Promise.all(
        items.map(async (project) => {
          try {
            const tasks = await listProjectTasks(project.id);
            return [project.id, tasks.length] as const;
          } catch {
            return [project.id, 0] as const;
          }
        }),
      );
      setProjectTaskCounts(Object.fromEntries(counts));
    } catch (error) {
      setProjects([]);
      setProjectTaskCounts({});
      setProjectsError(getErrorMessage(error, 'Unable to load projects.'));
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.folio.toLowerCase().includes(normalizedSearch) ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        (project.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (project.ownerName ?? '').toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const totalCount = projects.length;
  const activeCount = projects.filter((project) => project.status === 'active').length;
  const completedCount = projects.filter((project) => project.status === 'completed').length;
  const linkedTaskCount = Object.values(projectTaskCounts).reduce((sum, count) => sum + count, 0);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingProject(true);
    setProjectsError(null);

    try {
      const payload = buildProjectPayload(form);

      if (dialogMode === 'edit' && editingProjectId !== null) {
        const updatedProject = await updateProject(editingProjectId, payload);
        setProjects((currentProjects) =>
          currentProjects.map((project) => (project.id === editingProjectId ? updatedProject : project)),
        );
      } else {
        const createdProject = await createProject(payload);
        setProjects((currentProjects) => [createdProject, ...currentProjects]);
        setProjectTaskCounts((currentCounts) => ({ ...currentCounts, [createdProject.id]: 0 }));
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setProjectsError(getErrorMessage(error, 'Unable to save project.'));
    } finally {
      setIsSubmittingProject(false);
    }
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
      setProjectsError(getErrorMessage(error, 'Unable to complete project.'));
    } finally {
      setProjectPendingState(project.id, false);
    }
  };

  const handleCancel = async (projectId: number) => {
    if (!window.confirm('Cancel this project?')) {
      return;
    }

    setProjectPendingState(projectId, true);
    setProjectsError(null);

    try {
      const updatedProject = await cancelProject(projectId);
      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === projectId ? updatedProject : project)),
      );
    } catch (error) {
      setProjectsError(getErrorMessage(error, 'Unable to cancel project.'));
    } finally {
      setProjectPendingState(projectId, false);
    }
  };

  const handleDelete = async (projectId: number) => {
    if (!window.confirm('Delete this project? This performs a soft delete.')) {
      return;
    }

    setProjectPendingState(projectId, true);
    setProjectsError(null);

    try {
      await deleteProject(projectId);
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
      setProjectTaskCounts((currentCounts) => {
        const nextCounts = { ...currentCounts };
        delete nextCounts[projectId];
        return nextCounts;
      });
    } catch (error) {
      setProjectsError(getErrorMessage(error, 'Unable to delete project.'));
    } finally {
      setProjectPendingState(projectId, false);
    }
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">Project portfolio</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Projects are company-scoped containers for organizing tasks without adding project management overhead.
            </p>
          </div>
          <Button className={cn('h-11 gap-2 rounded-xl px-4', accentButtonClass)} onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add project
          </Button>
        </div>
      </section>

      {projectsError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{projectsError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadProjects();
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
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Search project</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Folio, name, description, or owner"
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
          <span className="font-medium text-slate-900 dark:text-white">{totalCount}</span> total projects
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-blue-600">{activeCount}</span> active
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-emerald-600">{completedCount}</span> completed
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-[rgb(235,165,52)]">{linkedTaskCount}</span> linked tasks
        </span>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Table className="min-w-[1320px]">
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="px-5 py-6">Folio</TableHead>
              <TableHead className="px-5 py-6">Project</TableHead>
              <TableHead className="px-5 py-6">Owner</TableHead>
              <TableHead className="px-5 py-6">Status</TableHead>
              <TableHead className="px-5 py-6">Priority</TableHead>
              <TableHead className="px-5 py-6">Dates</TableHead>
              <TableHead className="px-5 py-6">Tasks</TableHead>
              <TableHead className="px-5 py-6">Updated</TableHead>
              <TableHead className="px-5 py-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id} className="border-slate-200 dark:border-slate-700">
                <TableCell className="px-5 py-5 text-sm font-semibold text-slate-900 dark:text-white">
                  {project.folio}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[320px] space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{project.name}</p>
                    {project.description ? (
                      <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">No description</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="min-w-[180px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p className="font-medium text-slate-900 dark:text-white">{project.ownerName ?? 'Unassigned'}</p>
                    {project.ownerUserCompanyId ? <p>HR user #{project.ownerUserCompanyId}</p> : null}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-semibold', statusClasses[project.status])}>
                    {statusLabels[project.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-5">
                  {project.priority ? (
                    <Badge
                      variant="outline"
                      className={cn('rounded-full px-3 py-1 font-semibold capitalize', priorityClasses[project.priority])}
                    >
                      {priorityLabels[project.priority as ProjectPriority]}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">None</span>
                  )}
                </TableCell>
                <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                  <div className="min-w-[190px] space-y-1">
                    <p>Start: {formatDate(project.startDate)}</p>
                    <p>Due: {formatDate(project.dueDate)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    <ListChecks className="h-4 w-4" />
                    {projectTaskCounts[project.id] ?? 0}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(project.updatedAt, true)}
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <ProjectActionButton
                      label="Edit project"
                      onClick={() => openEditDialog(project)}
                      disabled={isProjectPending(project.id)}
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      icon={<Pencil className="h-4 w-4" />}
                    />
                    <ProjectActionButton
                      label="Complete project"
                      onClick={() => {
                        void handleComplete(project);
                      }}
                      disabled={isProjectPending(project.id) || project.status === 'completed'}
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                    <ProjectActionButton
                      label="Cancel project"
                      onClick={() => {
                        void handleCancel(project.id);
                      }}
                      disabled={isProjectPending(project.id) || project.status === 'cancelled'}
                      className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      icon={<CircleSlash className="h-4 w-4" />}
                    />
                    <ProjectActionButton
                      label="Delete project"
                      onClick={() => {
                        void handleDelete(project.id);
                      }}
                      disabled={isProjectPending(project.id)}
                      className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {isLoadingProjects ? (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoadingProjects && filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                  No projects match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <ProjectFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        onSubmit={handleSubmit}
        form={form}
        isSubmitting={isSubmittingProject}
        setForm={setForm}
      />
    </>
  );
}
