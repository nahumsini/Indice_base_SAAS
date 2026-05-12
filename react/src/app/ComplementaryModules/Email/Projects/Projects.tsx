import { Fragment, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  FileText,
  FolderOpen,
  LayoutList,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { ScrollArea } from '../../../components/ui/scroll-area';
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
import { useLanguage } from '../../../shared/context';
import {
  type ProcessAgendaItem,
  type ProcessProject,
  type ProcessTaskFile,
  type ProcessTaskPriority,
  type ProcessTaskStatus,
  type ProjectStatus,
  processAgendaItems,
  processProjects,
} from '../mockData';

type ProjectsViewMode = 'tasks' | 'diagram';
type CopyLanguage = 'en' | 'es';

interface ProjectsCopy {
  sectionTitle: string;
  sectionDescription: string;
  addProject: string;
  addTask: string;
  tasksView: string;
  diagramView: string;
  filters: string;
  search: string;
  searchPlaceholder: string;
  unit: string;
  business: string;
  status: string;
  owner: string;
  creator: string;
  responsible: string;
  assistant: string;
  priority: string;
  budget: string;
  projectName: string;
  projectDescription: string;
  taskTitle: string;
  description: string;
  creationDate: string;
  summary: string;
  startDate: string;
  dueDate: string;
  progress: string;
  percentComplete: string;
  weighting: string;
  files: string;
  notes: string;
  auditNotes: string;
  tasks: string;
  actions: string;
  openTasks: string;
  hideTasks: string;
  columns: string;
  all: string;
  totalProjects: string;
  activeProjects: string;
  atRiskProjects: string;
  linkedTasks: string;
  emptyState: string;
  emptyProjectTasks: string;
  tasksModalTitle: string;
  tasksModalDescription: string;
  addProjectTitle: string;
  addProjectDescription: string;
  requiredFieldsHint: string;
  createProject: string;
  cancel: string;
  close: string;
  noSummary: string;
  projectOverview: string;
  projectTasksLabel: string;
  tasksWorkspaceDescription: string;
  workspaceHint: string;
  manageColumnsTitle: string;
  manageColumnsDescription: string;
  selectAllColumns: string;
  deselectAllColumns: string;
  openTask: string;
  taskDetailsTitle: string;
  createProjectTaskTitle: string;
  createProjectTaskDescription: string;
  quickTaskPlaceholder: string;
  createQuickTask: string;
  editTaskTitle: string;
  saveTask: string;
  noAuditNotes: string;
  addAuditNotesPlaceholder: string;
  diagramProjectsTitle: string;
  diagramTasksTitle: string;
  diagramCalendarTitle: string;
  diagramListDescription: string;
  openDiagram: string;
  backToProjectsList: string;
  previousMonth: string;
  nextMonth: string;
  noDates: string;
  projectStatusLabels: Record<ProjectStatus, string>;
  taskStatusLabels: Record<ProcessTaskStatus, string>;
  priorityLabels: Record<ProcessTaskPriority, string>;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

interface ProjectFormState {
  name: string;
  unit: string;
  business: string;
  owner: string;
  status: ProjectStatus;
  priority: ProcessTaskPriority;
  startDate: string;
  dueDate: string;
  budget: string;
  summary: string;
}

type ProjectTaskColumnId =
  | 'unit'
  | 'business'
  | 'taskTitle'
  | 'description'
  | 'createdAt'
  | 'startDate'
  | 'dueDate'
  | 'status'
  | 'assistant'
  | 'priority'
  | 'files'
  | 'completion'
  | 'notes'
  | 'weighting'
  | 'auditNotes'
  | 'actions';

type ProjectTaskSortId = Exclude<ProjectTaskColumnId, 'actions'>;
type SortDirection = 'asc' | 'desc';

const accentButtonClass = 'bg-[rgb(235,165,52)] text-white hover:bg-[rgb(214,144,35)]';
const dayMilliseconds = 1000 * 60 * 60 * 24;
const projectStatusOrder: ProjectStatus[] = ['active', 'at-risk', 'planning', 'closed'];

const projectCopy: Record<CopyLanguage, ProjectsCopy> = {
  en: {
    sectionTitle: 'Project portfolio',
    sectionDescription: 'View every project in one workspace and open its tasks without leaving the module.',
    addProject: 'Add project',
    addTask: 'Add task',
    tasksView: 'Tasks',
    diagramView: 'Diagram',
    filters: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Project, owner, unit, or folio',
    unit: 'Unit',
    business: 'Business',
    status: 'Status',
    owner: 'Owner',
    creator: 'Creator',
    responsible: 'Responsible',
    assistant: 'Assistant',
    priority: 'Priority',
    budget: 'Budget',
    projectName: 'Project',
    projectDescription: 'Project description',
    taskTitle: 'Task title',
    description: 'Description',
    creationDate: 'Creation date',
    summary: 'Summary',
    startDate: 'Start date',
    dueDate: 'Due date',
    progress: 'Progress',
    percentComplete: '% Complete',
    weighting: 'Weighting',
    files: 'Files',
    notes: 'Notes',
    auditNotes: 'Audit notes',
    tasks: 'Tasks',
    actions: 'Actions',
    openTasks: 'Open tasks',
    hideTasks: 'Hide tasks',
    columns: 'Columns',
    all: 'All',
    totalProjects: 'projects',
    activeProjects: 'active',
    atRiskProjects: 'at risk',
    linkedTasks: 'linked tasks',
    emptyState: 'No projects match the current filters.',
    emptyProjectTasks: 'This project does not have linked tasks yet.',
    tasksModalTitle: 'Project tasks',
    tasksModalDescription: 'Project tasks reuse the same task record model as the Agenda tab.',
    addProjectTitle: 'Add new project',
    addProjectDescription: 'Create a project workspace with ownership, dates, priority, and budget.',
    requiredFieldsHint: 'Fields marked with * are required.',
    createProject: 'Create project',
    cancel: 'Cancel',
    close: 'Close',
    noSummary: 'No summary available yet.',
    projectOverview: 'Project overview',
    projectTasksLabel: 'Project task list',
    tasksWorkspaceDescription: 'Review every task linked to the selected project in a table based on the Agenda workspace.',
    workspaceHint: 'Select a project to review its linked tasks.',
    manageColumnsTitle: 'Manage columns',
    manageColumnsDescription: 'Choose which task columns appear in the expanded project table.',
    selectAllColumns: 'Select all',
    deselectAllColumns: 'Deselect all',
    openTask: 'Open',
    taskDetailsTitle: 'Task details',
    createProjectTaskTitle: 'Create project task',
    createProjectTaskDescription: 'Add a quick task for this project by entering only the task title.',
    quickTaskPlaceholder: 'Enter the task title',
    createQuickTask: 'Create quick task',
    editTaskTitle: 'Edit project task',
    saveTask: 'Save task',
    noAuditNotes: 'No audit notes have been registered yet.',
    addAuditNotesPlaceholder: 'Add audit notes',
    diagramProjectsTitle: 'Projects list',
    diagramTasksTitle: 'Project tasks',
    diagramCalendarTitle: 'Project calendar',
    diagramListDescription: 'Select a project to open its task diagram and calendar timeline.',
    openDiagram: 'Open diagram',
    backToProjectsList: 'Projects list',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    noDates: 'No schedule defined',
    projectStatusLabels: {
      active: 'Active',
      'at-risk': 'At risk',
      planning: 'Planning',
      closed: 'Closed',
    },
    taskStatusLabels: {
      pending: 'Pending',
      'in-progress': 'In progress',
      completed: 'Completed',
      audited: 'Audited',
      overdue: 'Overdue',
    },
    priorityLabels: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
  },
  es: {
    sectionTitle: 'Portafolio de proyectos',
    sectionDescription: 'Consulta todos los proyectos en un mismo espacio y abre sus tareas sin salir del modulo.',
    addProject: 'Nuevo proyecto',
    addTask: 'Agregar tarea',
    tasksView: 'Tareas',
    diagramView: 'Diagrama',
    filters: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Proyecto, responsable, unidad o folio',
    unit: 'Unidad',
    business: 'Negocio',
    status: 'Estado',
    owner: 'Responsable',
    creator: 'Creador',
    responsible: 'Responsable',
    assistant: 'Asistente',
    priority: 'Prioridad',
    budget: 'Presupuesto',
    projectName: 'Proyecto',
    projectDescription: 'Descripcion del proyecto',
    taskTitle: 'Titulo de tarea',
    description: 'Descripcion',
    creationDate: 'Fecha de creacion',
    summary: 'Resumen',
    startDate: 'Fecha de inicio',
    dueDate: 'Fecha de vencimiento',
    progress: 'Avance',
    percentComplete: '% Completado',
    weighting: 'Ponderacion',
    files: 'Archivos',
    notes: 'Notas',
    auditNotes: 'Notas de auditoria',
    tasks: 'Tareas',
    actions: 'Acciones',
    openTasks: 'Abrir tareas',
    hideTasks: 'Ocultar tareas',
    columns: 'Columnas',
    all: 'Todos',
    totalProjects: 'proyectos',
    activeProjects: 'en ejecucion',
    atRiskProjects: 'en riesgo',
    linkedTasks: 'tareas vinculadas',
    emptyState: 'No hay proyectos que coincidan con los filtros actuales.',
    emptyProjectTasks: 'Este proyecto aun no tiene tareas vinculadas.',
    tasksModalTitle: 'Tareas del proyecto',
    tasksModalDescription: 'Las tareas del proyecto reutilizan el mismo modelo de registros de la pestana Agenda.',
    addProjectTitle: 'Agregar nuevo proyecto',
    addProjectDescription: 'Crea un espacio de proyecto con responsable, fechas, prioridad y presupuesto.',
    requiredFieldsHint: 'Los campos marcados con * son obligatorios.',
    createProject: 'Crear proyecto',
    cancel: 'Cancelar',
    close: 'Cerrar',
    noSummary: 'Aun no hay un resumen disponible.',
    projectOverview: 'Resumen del proyecto',
    projectTasksLabel: 'Lista de tareas del proyecto',
    tasksWorkspaceDescription: 'Revisa todas las tareas vinculadas al proyecto seleccionado en una tabla basada en el espacio de Agenda.',
    workspaceHint: 'Selecciona un proyecto para revisar sus tareas vinculadas.',
    manageColumnsTitle: 'Gestionar columnas',
    manageColumnsDescription: 'Elige las columnas de tareas que se muestran en la tabla expandida del proyecto.',
    selectAllColumns: 'Seleccionar todas',
    deselectAllColumns: 'Deseleccionar todas',
    openTask: 'Abrir',
    taskDetailsTitle: 'Detalle de tarea',
    createProjectTaskTitle: 'Crear tarea del proyecto',
    createProjectTaskDescription: 'Agrega una tarea rapida para este proyecto escribiendo solo el titulo.',
    quickTaskPlaceholder: 'Ingresa el titulo de la tarea',
    createQuickTask: 'Crear tarea rapida',
    editTaskTitle: 'Editar tarea del proyecto',
    saveTask: 'Guardar tarea',
    noAuditNotes: 'Aun no se han registrado notas de auditoria.',
    addAuditNotesPlaceholder: 'Agregar notas de auditoria',
    diagramProjectsTitle: 'Lista de proyectos',
    diagramTasksTitle: 'Tareas del proyecto',
    diagramCalendarTitle: 'Calendario del proyecto',
    diagramListDescription: 'Selecciona un proyecto para abrir su diagrama de tareas y calendario.',
    openDiagram: 'Abrir diagrama',
    backToProjectsList: 'Lista de proyectos',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    noDates: 'Sin calendario definido',
    projectStatusLabels: {
      active: 'En ejecucion',
      'at-risk': 'En riesgo',
      planning: 'Planeacion',
      closed: 'Cerrado',
    },
    taskStatusLabels: {
      pending: 'Pendiente',
      'in-progress': 'En proceso',
      completed: 'Completada',
      audited: 'Auditada',
      overdue: 'Vencida',
    },
    priorityLabels: {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    },
  },
};

const unitLabels: Record<string, Record<CopyLanguage, string>> = {
  Warehouse: { en: 'Warehouse', es: 'Almacen' },
  Finance: { en: 'Finance', es: 'Finanzas' },
  Sales: { en: 'Sales', es: 'Ventas' },
  'Human Resources': { en: 'Human Resources', es: 'Recursos Humanos' },
  Technology: { en: 'Technology', es: 'Tecnologia' },
};

const businessLabels: Record<string, Record<CopyLanguage, string>> = {
  Operations: { en: 'Operations', es: 'Operaciones' },
  Administration: { en: 'Administration', es: 'Administracion' },
  Commercial: { en: 'Commercial', es: 'Comercial' },
  People: { en: 'People', es: 'Personas' },
};

const projectStatusClasses: Record<ProjectStatus, string> = {
  active: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  'at-risk': 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  planning: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  closed: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const taskStatusClasses: Record<ProcessTaskStatus, string> = {
  pending: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  'in-progress': 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  completed: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  audited: 'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  overdue: 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
};

const priorityClasses: Record<ProcessTaskPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale.startsWith('es') ? 'MXN' : 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthDays(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return Array.from({ length: monthEnd.getDate() }, (_, index) => {
    const day = new Date(monthStart);
    day.setDate(index + 1);
    return day;
  });
}

function getTaskRangeInMonth(task: ProcessAgendaItem, monthStart: Date, monthEnd: Date) {
  const taskStart = new Date(`${task.startDate}T00:00:00`);
  const taskEnd = new Date(`${task.dueDate}T00:00:00`);

  if (Number.isNaN(taskStart.getTime()) || Number.isNaN(taskEnd.getTime())) {
    return null;
  }

  if (taskEnd < monthStart || taskStart > monthEnd) {
    return null;
  }

  const clampedStart = taskStart < monthStart ? monthStart : taskStart;
  const clampedEnd = taskEnd > monthEnd ? monthEnd : taskEnd;
  const startOffset = Math.max(0, Math.round((clampedStart.getTime() - monthStart.getTime()) / dayMilliseconds));
  const span = Math.max(1, Math.round((clampedEnd.getTime() - clampedStart.getTime()) / dayMilliseconds) + 1);

  return {
    startOffset,
    span,
  };
}

function buildProjectFolio(projects: ProcessProject[]) {
  const currentYear = new Date().getFullYear();
  const nextSequence =
    projects.reduce((maxValue, project) => {
      const parsedSequence = Number(project.folio.split('-').pop() ?? '0');
      return Number.isFinite(parsedSequence) ? Math.max(maxValue, parsedSequence) : maxValue;
    }, 0) + 1;

  return `P-${currentYear}-${String(nextSequence).padStart(3, '0')}`;
}

function buildDefaultProjectForm(
  unitOptions: string[],
  businessOptions: string[],
  ownerOptions: string[],
): ProjectFormState {
  const today = new Date().toISOString().slice(0, 10);

  return {
    name: '',
    unit: unitOptions[0] ?? '',
    business: businessOptions[0] ?? '',
    owner: ownerOptions[0] ?? '',
    status: 'planning',
    priority: 'medium',
    startDate: today,
    dueDate: today,
    budget: '',
    summary: '',
  };
}

function ProjectStatusBadge({
  status,
  label,
}: {
  status: ProjectStatus;
  label: string;
}) {
  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', projectStatusClasses[status])}>{label}</span>;
}

function TaskStatusBadge({
  status,
  label,
}: {
  status: ProcessTaskStatus;
  label: string;
}) {
  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', taskStatusClasses[status])}>{label}</span>;
}

function PriorityBadge({
  priority,
  label,
}: {
  priority: ProcessTaskPriority;
  label: string;
}) {
  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', priorityClasses[priority])}>{label}</span>;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
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

const taskStatusOrder: Record<ProcessTaskStatus, number> = {
  pending: 1,
  'in-progress': 2,
  completed: 3,
  audited: 4,
  overdue: 5,
};

const taskPriorityOrder: Record<ProcessTaskPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

const taskStatusStyles: Record<ProcessTaskStatus, string> = {
  pending: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  'in-progress': 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  completed: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  audited: 'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  overdue: 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
};

const taskPriorityStyles: Record<ProcessTaskPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const taskStatusOptions: ProcessTaskStatus[] = ['pending', 'in-progress', 'completed', 'audited', 'overdue'];

function clampCompletion(value: number) {
  return Math.max(0, Math.min(100, value));
}

function resolveCompletionFromStatus(task: ProcessAgendaItem, targetStatus: ProcessTaskStatus) {
  if (targetStatus === 'completed') {
    return 100;
  }

  if (targetStatus === 'pending') {
    return task.completion === 100 ? 0 : task.completion;
  }

  if (targetStatus === 'in-progress') {
    if (task.completion === 0) {
      return 50;
    }

    return task.completion === 100 ? 80 : task.completion;
  }

  if (targetStatus === 'overdue') {
    return task.completion === 100 ? 90 : task.completion;
  }

  return task.completion;
}

function buildTaskFolio(tasks: ProcessAgendaItem[]) {
  const currentYear = new Date().getFullYear();
  const nextSequence =
    tasks.reduce((maxValue, task) => {
      const parsedSequence = Number(task.folio.split('-').pop() ?? '0');
      return Number.isFinite(parsedSequence) ? Math.max(maxValue, parsedSequence) : maxValue;
    }, 0) + 1;

  return `T-${currentYear}-${String(nextSequence).padStart(3, '0')}`;
}

function cloneTaskFiles(files: ProcessTaskFile[]) {
  return files.map((file) => ({
    ...file,
    id: `${file.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  }));
}

function TableActionButton({
  icon,
  label,
  onClick,
  toneClassName,
}: {
  icon: ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  toneClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm',
        toneClassName,
      )}
    >
      {icon}
    </button>
  );
}

function InlineSelectField<T extends string>({
  value,
  options,
  onChange,
  className,
  renderValue,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
  renderValue?: (value: T) => ReactNode;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
      <SelectTrigger
        className={cn(
          'h-10 min-w-[140px] rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
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
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-10 min-w-[220px] rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400',
        className,
      )}
    />
  );
}

function InlineDateCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-[170px] rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
    />
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={cn('text-lg leading-none', index < value ? 'opacity-100' : 'opacity-25')}>
          ★
        </span>
      ))}
    </div>
  );
}

function InlineProjectTasksWorkspace({
  project,
  tasks,
  copy,
  locale,
  languageKey,
  unitOptions,
  businessOptions,
  collaboratorOptions,
  onUpdateTask,
  onCreateTask,
  onDuplicateTask,
  onDeleteTask,
  onClose,
  embedded = false,
}: {
  project: ProcessProject | null;
  tasks: ProcessAgendaItem[];
  copy: ProjectsCopy;
  locale: string;
  languageKey: CopyLanguage;
  unitOptions: string[];
  businessOptions: string[];
  collaboratorOptions: string[];
  onUpdateTask: (taskId: number, updater: (task: ProcessAgendaItem) => ProcessAgendaItem) => void;
  onCreateTask: (project: ProcessProject, title: string) => void;
  onDuplicateTask: (task: ProcessAgendaItem) => void;
  onDeleteTask: (taskId: number) => void;
  onClose: () => void;
  embedded?: boolean;
}) {
  const allColumnIds: ProjectTaskColumnId[] = [
    'unit',
    'business',
    'taskTitle',
    'description',
    'createdAt',
    'startDate',
    'dueDate',
    'status',
    'assistant',
    'priority',
    'files',
    'completion',
    'notes',
    'weighting',
    'auditNotes',
    'actions',
  ];

  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [visibleColumnIds, setVisibleColumnIds] = useState<ProjectTaskColumnId[]>(allColumnIds);
  const [sortConfig, setSortConfig] = useState<{ columnId: ProjectTaskSortId; direction: SortDirection }>({
    columnId: 'dueDate',
    direction: 'asc',
  });
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [taskComposer, setTaskComposer] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    taskId: number | null;
    title: string;
  }>({
    open: false,
    mode: 'create',
    taskId: null,
    title: '',
  });
  const [auditDialog, setAuditDialog] = useState<{
    open: boolean;
    taskId: number | null;
    comments: string;
    weighting: number;
  }>({
    open: false,
    taskId: null,
    comments: '',
    weighting: 3,
  });

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const auditTask = tasks.find((task) => task.id === auditDialog.taskId) ?? null;
  const localizedUnitOptions: Option<string>[] = unitOptions.map((option) => ({
    value: option,
    label: unitLabels[option]?.[languageKey] ?? option,
  }));
  const localizedBusinessOptions: Option<string>[] = businessOptions.map((option) => ({
    value: option,
    label: businessLabels[option]?.[languageKey] ?? option,
  }));
  const localizedCollaboratorOptions: Option<string>[] = collaboratorOptions.map((option) => ({
    value: option,
    label: option,
  }));
  const localizedPriorityOptions: Option<ProcessTaskPriority>[] = [
    { value: 'high', label: copy.priorityLabels.high },
    { value: 'medium', label: copy.priorityLabels.medium },
    { value: 'low', label: copy.priorityLabels.low },
  ];
  const localizedStatusOptions: Option<ProcessTaskStatus>[] = taskStatusOptions.map((status) => ({
    value: status,
    label: copy.taskStatusLabels[status],
  }));

  const columnLabels: Record<ProjectTaskColumnId, string> = {
    unit: copy.unit,
    business: copy.business,
    taskTitle: copy.taskTitle,
    description: copy.description,
    createdAt: copy.creationDate,
    startDate: copy.startDate,
    dueDate: copy.dueDate,
    status: copy.status,
    assistant: copy.assistant,
    priority: copy.priority,
    files: copy.files,
    completion: copy.percentComplete,
    notes: copy.notes,
    weighting: copy.weighting,
    auditNotes: copy.auditNotes,
    actions: copy.actions,
  };

  const getSortValue = (task: ProcessAgendaItem, columnId: ProjectTaskSortId) => {
    switch (columnId) {
      case 'unit':
        return unitLabels[task.unit]?.[languageKey] ?? task.unit;
      case 'business':
        return businessLabels[task.business]?.[languageKey] ?? task.business;
      case 'taskTitle':
        return task.title;
      case 'description':
        return task.description;
      case 'createdAt':
        return task.createdAt;
      case 'startDate':
        return task.startDate;
      case 'dueDate':
        return task.dueDate;
      case 'status':
        return taskStatusOrder[task.status];
      case 'assistant':
        return task.responsible;
      case 'priority':
        return taskPriorityOrder[task.priority];
      case 'files':
        return task.files.length;
      case 'completion':
        return task.completion;
      case 'notes':
        return task.notes;
      case 'weighting':
        return task.weighting;
      case 'auditNotes':
        return task.auditNotes;
      default:
        return '';
    }
  };

  const orderedTasks = [...tasks].sort((taskA, taskB) => {
    const valueA = getSortValue(taskA, sortConfig.columnId);
    const valueB = getSortValue(taskB, sortConfig.columnId);

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
    }

    const normalizedA = String(valueA).toLowerCase();
    const normalizedB = String(valueB).toLowerCase();

    return sortConfig.direction === 'asc'
      ? normalizedA.localeCompare(normalizedB)
      : normalizedB.localeCompare(normalizedA);
  });

  const toggleSort = (columnId: ProjectTaskSortId) => {
    setSortConfig((currentSort) =>
      currentSort.columnId === columnId
        ? {
            columnId,
            direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            columnId,
            direction: 'asc',
          },
    );
  };

  const toggleColumnVisibility = (columnId: ProjectTaskColumnId) => {
    setVisibleColumnIds((currentColumnIds) => {
      if (currentColumnIds.includes(columnId)) {
        if (currentColumnIds.length === 1) {
          return currentColumnIds;
        }

        return currentColumnIds.filter((currentColumnId) => currentColumnId !== columnId);
      }

      return allColumnIds.filter(
        (currentColumnId) => currentColumnId === columnId || currentColumnIds.includes(currentColumnId),
      );
    });
  };

  const showAllColumns = () => {
    setVisibleColumnIds(allColumnIds);
  };

  const showMinimumColumns = () => {
    setVisibleColumnIds(['taskTitle', 'status', 'assistant', 'dueDate', 'actions']);
  };

  const openCreateTaskDialog = () => {
    setTaskComposer({
      open: true,
      mode: 'create',
      taskId: null,
      title: '',
    });
  };

  const openEditTaskDialog = (task: ProcessAgendaItem) => {
    setTaskComposer({
      open: true,
      mode: 'edit',
      taskId: task.id,
      title: task.title,
    });
  };

  const closeTaskComposer = () => {
    setTaskComposer({
      open: false,
      mode: 'create',
      taskId: null,
      title: '',
    });
  };

  const openAuditTaskDialog = (task: ProcessAgendaItem) => {
    setAuditDialog({
      open: true,
      taskId: task.id,
      comments: task.auditNotes,
      weighting: task.weighting,
    });
  };

  const closeAuditTaskDialog = () => {
    setAuditDialog({
      open: false,
      taskId: null,
      comments: '',
      weighting: 3,
    });
  };

  const handleTaskComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!project || !taskComposer.title.trim()) {
      return;
    }

    if (taskComposer.mode === 'edit' && taskComposer.taskId !== null) {
      onUpdateTask(taskComposer.taskId, (currentTask) => ({
        ...currentTask,
        title: taskComposer.title.trim(),
      }));
    } else {
      onCreateTask(project, taskComposer.title);
    }

    closeTaskComposer();
  };

  const handleAuditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (auditDialog.taskId === null) {
      return;
    }

    onUpdateTask(auditDialog.taskId, (currentTask) => ({
      ...currentTask,
      status: 'audited',
      audited: true,
      auditNotes: auditDialog.comments.trim(),
      weighting: auditDialog.weighting,
    }));

    closeAuditTaskDialog();
  };

  const handleCompleteTask = (task: ProcessAgendaItem) => {
    onUpdateTask(task.id, (currentTask) => ({
      ...currentTask,
      status: 'completed',
      completion: 100,
    }));
  };

  const renderActionButtons = (task: ProcessAgendaItem) => (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      <TableActionButton
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        label={languageKey === 'es' ? 'Completar tarea' : 'Complete task'}
        onClick={() => handleCompleteTask(task)}
        toneClassName="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
      />
      <TableActionButton
        icon={<FileText className="h-4 w-4 text-slate-700 dark:text-slate-200" />}
        label={languageKey === 'es' ? 'Reporte de tarea' : 'Task report'}
        onClick={() => setActiveTaskId(task.id)}
        toneClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      />
      <TableActionButton
        icon={<ShieldCheck className="h-4 w-4 text-violet-600" />}
        label={languageKey === 'es' ? 'Auditar tarea' : 'Audit task'}
        onClick={() => openAuditTaskDialog(task)}
        toneClassName="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
      />
      <TableActionButton
        icon={<Pencil className="h-4 w-4 text-amber-600" />}
        label={languageKey === 'es' ? 'Editar tarea' : 'Edit task'}
        onClick={() => openEditTaskDialog(task)}
        toneClassName="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
      />
      <TableActionButton
        icon={<Copy className="h-4 w-4 text-blue-600" />}
        label={languageKey === 'es' ? 'Duplicar tarea' : 'Duplicate task'}
        onClick={() => onDuplicateTask(task)}
        toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
      />
      <TableActionButton
        icon={<Trash2 className="h-4 w-4 text-red-600" />}
        label={languageKey === 'es' ? 'Eliminar tarea' : 'Delete task'}
        onClick={() => onDeleteTask(task.id)}
        toneClassName="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
      />
    </div>
  );

  const renderTaskCell = (task: ProcessAgendaItem, columnId: ProjectTaskColumnId) => {
    switch (columnId) {
      case 'unit':
        return (
          <InlineSelectField
            value={task.unit}
            options={localizedUnitOptions}
            onChange={(nextValue) => onUpdateTask(task.id, (currentTask) => ({ ...currentTask, unit: nextValue }))}
          />
        );
      case 'business':
        return (
          <InlineSelectField
            value={task.business}
            options={localizedBusinessOptions}
            onChange={(nextValue) =>
              onUpdateTask(task.id, (currentTask) => ({ ...currentTask, business: nextValue }))
            }
          />
        );
      case 'taskTitle':
        return (
          <InlineTextCell
            value={task.title}
            onChange={(nextValue) => onUpdateTask(task.id, (currentTask) => ({ ...currentTask, title: nextValue }))}
            placeholder={copy.quickTaskPlaceholder}
            className="font-semibold text-slate-900 dark:text-white"
          />
        );
      case 'description':
        return (
          <Textarea
            value={task.description}
            onChange={(event) =>
              onUpdateTask(task.id, (currentTask) => ({
                ...currentTask,
                description: event.target.value,
              }))
            }
            placeholder={copy.description}
            className="min-h-[96px] min-w-[320px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-600 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        );
      case 'createdAt':
        return <span className="text-base text-slate-900 dark:text-white">{task.createdAt}</span>;
      case 'startDate':
        return (
          <InlineDateCell
            value={task.startDate}
            onChange={(nextValue) =>
              onUpdateTask(task.id, (currentTask) => ({ ...currentTask, startDate: nextValue }))
            }
          />
        );
      case 'dueDate':
        return (
          <InlineDateCell
            value={task.dueDate}
            onChange={(nextValue) =>
              onUpdateTask(task.id, (currentTask) => ({ ...currentTask, dueDate: nextValue }))
            }
          />
        );
      case 'status':
        return (
          <InlineSelectField
            value={task.status}
            options={localizedStatusOptions}
            onChange={(nextValue) => {
              if (nextValue === 'audited') {
                openAuditTaskDialog(task);
                return;
              }

              onUpdateTask(task.id, (currentTask) => ({
                ...currentTask,
                status: nextValue,
                completion: resolveCompletionFromStatus(currentTask, nextValue),
              }));
            }}
            className={cn('min-w-[136px] border', taskStatusStyles[task.status])}
            renderValue={(value) => <span className="font-semibold">{copy.taskStatusLabels[value]}</span>}
          />
        );
      case 'assistant':
        return (
          <InlineSelectField
            value={task.responsible}
            options={localizedCollaboratorOptions}
            onChange={(nextValue) =>
              onUpdateTask(task.id, (currentTask) => ({ ...currentTask, responsible: nextValue }))
            }
          />
        );
      case 'priority':
        return (
          <InlineSelectField
            value={task.priority}
            options={localizedPriorityOptions}
            onChange={(nextValue) =>
              onUpdateTask(task.id, (currentTask) => ({ ...currentTask, priority: nextValue }))
            }
            className={cn('min-w-[136px] border', taskPriorityStyles[task.priority])}
            renderValue={(value) => <span className="font-semibold">{copy.priorityLabels[value]}</span>}
          />
        );
      case 'files':
        return (
          <button
            type="button"
            onClick={() => setActiveTaskId(task.id)}
            className="inline-flex min-w-[112px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            <FolderOpen className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <span>{task.files.length}</span>
          </button>
        );
      case 'completion':
        return (
          <div className="flex min-w-[320px] items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={task.completion}
              onChange={(event) => {
                const nextCompletion = clampCompletion(Number(event.target.value));
                onUpdateTask(task.id, (currentTask) => ({
                  ...currentTask,
                  completion: nextCompletion,
                  status:
                    nextCompletion === 100
                      ? 'completed'
                      : currentTask.status === 'completed'
                        ? 'in-progress'
                        : currentTask.status,
                }));
              }}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[rgb(235,165,52)]"
            />
            <Input
              value={String(task.completion)}
              onChange={(event) => {
                const nextCompletion = clampCompletion(Number(event.target.value || 0));
                onUpdateTask(task.id, (currentTask) => ({
                  ...currentTask,
                  completion: nextCompletion,
                  status:
                    nextCompletion === 100
                      ? 'completed'
                      : currentTask.status === 'completed'
                        ? 'in-progress'
                        : currentTask.status,
                }));
              }}
              className="h-10 w-20 rounded-xl border-slate-200 bg-white text-center text-base dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
            <span className="text-base font-semibold text-slate-500 dark:text-slate-400">%</span>
          </div>
        );
      case 'notes':
        return (
          <Textarea
            value={task.notes}
            onChange={(event) =>
              onUpdateTask(task.id, (currentTask) => ({
                ...currentTask,
                notes: event.target.value,
              }))
            }
            placeholder={copy.notes}
            className="min-h-[96px] min-w-[300px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-600 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        );
      case 'weighting':
        return (
          <div className="flex min-w-[170px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
            <StarRating value={task.weighting} />
            <span className="text-base font-semibold text-slate-700 dark:text-slate-100">{task.weighting}</span>
          </div>
        );
      case 'auditNotes':
        return (
          <button
            type="button"
            onClick={() => openAuditTaskDialog(task)}
            className="min-w-[260px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm leading-relaxed text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            {task.auditNotes || copy.addAuditNotesPlaceholder}
          </button>
        );
      case 'actions':
        return renderActionButtons(task);
      default:
        return null;
    }
  };

  return (
    <>
      <section
        className={cn(
          'overflow-hidden',
          embedded
            ? 'bg-slate-50/80 dark:bg-slate-900/60'
            : 'rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800',
        )}
      >
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{copy.projectTasksLabel}</h3>
                {project ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {project.folio}
                    </span>
                    <ProjectStatusBadge status={project.status} label={copy.projectStatusLabels[project.status]} />
                    <PriorityBadge priority={project.priority} label={copy.priorityLabels[project.priority]} />
                  </>
                ) : null}
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {project ? copy.tasksWorkspaceDescription : copy.workspaceHint}
              </p>
            </div>

            {project ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={openCreateTaskDialog}
                  className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {copy.addTask}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsColumnsOpen(true)}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <Columns3 className="mr-2 h-4 w-4" />
                  {copy.columns}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  {copy.hideTasks}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {project ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1860px]">
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-700">
                  {visibleColumnIds.map((columnId) => (
                    <TableHead key={columnId} className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {columnId === 'actions' ? (
                        columnLabels[columnId]
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSort(columnId)}
                          className="inline-flex items-center gap-2 whitespace-nowrap"
                        >
                          <span>{columnLabels[columnId]}</span>
                          <ArrowUpDown
                            className={cn(
                              'h-4 w-4',
                              sortConfig.columnId === columnId ? 'text-[rgb(235,165,52)]' : 'text-slate-400',
                            )}
                          />
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedTasks.map((task) => (
                  <TableRow key={task.id} className="border-slate-200 dark:border-slate-700">
                    {visibleColumnIds.map((columnId) => (
                      <TableCell
                        key={`${task.id}-${columnId}`}
                        className={cn(
                          'px-5 py-6 align-middle',
                          columnId === 'description' || columnId === 'taskTitle' || columnId === 'notes' || columnId === 'auditNotes'
                            ? 'whitespace-normal'
                            : '',
                        )}
                      >
                        {renderTaskCell(task, columnId)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {orderedTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleColumnIds.length} className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                      {copy.emptyProjectTasks}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center text-sm text-slate-500 dark:text-slate-400">{copy.workspaceHint}</div>
        )}
      </section>

      <Dialog open={isColumnsOpen} onOpenChange={setIsColumnsOpen}>
        <DialogContent className="max-w-[560px] rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white">{copy.manageColumnsTitle}</DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-700">
            <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              {copy.manageColumnsDescription}
            </DialogDescription>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={showAllColumns}
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                {copy.selectAllColumns}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={showMinimumColumns}
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                {copy.deselectAllColumns}
              </Button>
            </div>
          </div>

          <div className="px-6 py-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-3">
                {allColumnIds.map((columnId) => (
                  <label
                    key={columnId}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5 dark:border-slate-700 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={visibleColumnIds.includes(columnId)}
                        onCheckedChange={() => toggleColumnVisibility(columnId)}
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{columnLabels[columnId]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="border-t border-slate-200/80 bg-white px-6 py-3.5 dark:border-slate-700 dark:bg-slate-800">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                {copy.close}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeTask !== null} onOpenChange={(open) => !open && setActiveTaskId(null)}>
        <DialogContent className="max-w-[720px] rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white">{copy.taskDetailsTitle}</DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          {activeTask ? (
            <>
              <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-700">
                <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {activeTask.title}
                </DialogDescription>
              </div>

              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.description}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{activeTask.description}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.assistant}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{activeTask.responsible}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.creationDate}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(activeTask.createdAt, locale)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.dueDate}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(activeTask.dueDate, locale)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.notes}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{activeTask.notes || '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.auditNotes}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{activeTask.auditNotes || copy.noAuditNotes}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.files}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{activeTask.files.length}</p>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200/80 bg-white px-6 py-3.5 dark:border-slate-700 dark:bg-slate-800">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    {copy.close}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={taskComposer.open} onOpenChange={(open) => !open && closeTaskComposer()}>
        <DialogContent className="!flex h-[min(60vh,400px)] max-h-[calc(100vh-3rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {taskComposer.mode === 'edit' ? copy.editTaskTitle : copy.createProjectTaskTitle}
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          <form onSubmit={handleTaskComposerSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3">
                <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {copy.createProjectTaskDescription}
                </DialogDescription>
                <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  {copy.requiredFieldsHint}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
              <ScrollArea className="h-full">
                <div className="space-y-6 pb-2 pr-2 sm:pr-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {copy.taskTitle}
                        <span className="ml-1 text-amber-600">*</span>
                      </label>
                      <Input
                        value={taskComposer.title}
                        onChange={(event) =>
                          setTaskComposer((currentState) => ({
                            ...currentState,
                            title: event.target.value,
                          }))
                        }
                        placeholder={copy.quickTaskPlaceholder}
                        className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-3.5 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  {copy.cancel}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
                disabled={!taskComposer.title.trim()}
              >
                {taskComposer.mode === 'edit' ? copy.saveTask : copy.createQuickTask}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={auditDialog.open} onOpenChange={(open) => !open && closeAuditTaskDialog()}>
        <DialogContent className="max-w-[720px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white">{languageKey === 'es' ? 'Auditar tarea' : 'Audit task'}</DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          <form onSubmit={handleAuditSubmit}>
            <div className="space-y-5 px-6 py-5">
              {auditTask ? (
                <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {auditTask.folio} · {auditTask.title}
                </DialogDescription>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.auditNotes}</label>
                <Textarea
                  value={auditDialog.comments}
                  onChange={(event) =>
                    setAuditDialog((currentState) => ({
                      ...currentState,
                      comments: event.target.value,
                    }))
                  }
                  placeholder={copy.addAuditNotesPlaceholder}
                  className="min-h-[140px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-600 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.weighting}</label>
                <Select
                  value={String(auditDialog.weighting)}
                  onValueChange={(nextValue) =>
                    setAuditDialog((currentState) => ({
                      ...currentState,
                      weighting: Number(nextValue),
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-200/80 bg-white px-6 py-3.5 dark:border-slate-700 dark:bg-slate-800">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  {copy.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}>
                {languageKey === 'es' ? 'Guardar auditoria' : 'Save audit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectTasksModal({
  open,
  onOpenChange,
  project,
  tasks,
  copy,
  locale,
  languageKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProcessProject | null;
  tasks: ProcessAgendaItem[];
  copy: ProjectsCopy;
  locale: string;
  languageKey: CopyLanguage;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(88vh,920px)] max-h-[calc(100vh-3rem)] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                {copy.tasksModalTitle}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        {project && (
          <>
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3">
                <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {copy.tasksModalDescription}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {project.folio}
                  </span>
                  <ProjectStatusBadge status={project.status} label={copy.projectStatusLabels[project.status]} />
                  <PriorityBadge priority={project.priority} label={copy.priorityLabels[project.priority]} />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 gap-6 pb-2 pr-2 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
                  <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.projectTasksLabel}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[760px]">
                        <TableHeader>
                          <TableRow className="border-slate-200 dark:border-slate-700">
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Folio</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.projectName}</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.owner}</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.status}</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.priority}</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.startDate}</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.dueDate}</TableHead>
                            <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.progress}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map((task) => (
                            <TableRow key={task.id} className="border-slate-200 dark:border-slate-700">
                              <TableCell className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">{task.folio}</TableCell>
                              <TableCell className="px-5 py-4">
                                <div className="min-w-[220px]">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    {task.description}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{task.responsible}</TableCell>
                              <TableCell className="px-5 py-4">
                                <TaskStatusBadge status={task.status} label={copy.taskStatusLabels[task.status]} />
                              </TableCell>
                              <TableCell className="px-5 py-4">
                                <PriorityBadge priority={task.priority} label={copy.priorityLabels[task.priority]} />
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{formatDate(task.startDate, locale)}</TableCell>
                              <TableCell className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{formatDate(task.dueDate, locale)}</TableCell>
                              <TableCell className="px-5 py-4">
                                <div className="flex min-w-[160px] items-center gap-3">
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                      className="h-full rounded-full bg-[rgb(235,165,52)]"
                                      style={{ width: `${task.completion}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{task.completion}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {tasks.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                                {copy.emptyProjectTasks}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </section>

                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.projectOverview}</h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.projectName}</p>
                          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{project.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.unit}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                              {unitLabels[project.unit]?.[languageKey] ?? project.unit}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.business}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                              {businessLabels[project.business]?.[languageKey] ?? project.business}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.owner}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{project.owner}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.tasks}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{tasks.length}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.startDate}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(project.startDate, locale)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.dueDate}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(project.dueDate, locale)}</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.budget}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(project.budget, locale)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.summary}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{project.summary || copy.noSummary}</p>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-3.5 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  {copy.cancel}
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddProjectModal({
  open,
  onOpenChange,
  onSubmit,
  form,
  setForm,
  copy,
  languageKey,
  unitOptions,
  businessOptions,
  ownerOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  form: ProjectFormState;
  setForm: Dispatch<SetStateAction<ProjectFormState>>;
  copy: ProjectsCopy;
  languageKey: CopyLanguage;
  unitOptions: string[];
  businessOptions: string[];
  ownerOptions: string[];
}) {
  const updateForm = <T extends keyof ProjectFormState>(key: T, value: ProjectFormState[T]) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(88vh,860px)] max-h-[calc(100vh-3rem)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                {copy.addProjectTitle}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-3">
              <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {copy.addProjectDescription}
              </DialogDescription>
              <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {copy.requiredFieldsHint}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
            <ScrollArea className="h-full">
              <div className="space-y-6 pb-2 pr-2 sm:pr-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {copy.projectName}
                      <span className="ml-1 text-amber-600">*</span>
                    </label>
                    <Input
                      value={form.name}
                      onChange={(event) => updateForm('name', event.target.value)}
                      placeholder={copy.projectName}
                      className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <FilterSelect
                      label={copy.unit}
                      value={form.unit}
                      options={unitOptions.map((option) => ({
                        value: option,
                        label: unitLabels[option]?.[languageKey] ?? option,
                      }))}
                      onChange={(value) => updateForm('unit', value)}
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <FilterSelect
                      label={copy.business}
                      value={form.business}
                      options={businessOptions.map((option) => ({
                        value: option,
                        label: businessLabels[option]?.[languageKey] ?? option,
                      }))}
                      onChange={(value) => updateForm('business', value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <FilterSelect
                      label={copy.owner}
                      value={form.owner}
                      options={ownerOptions.map((option) => ({ value: option, label: option }))}
                      onChange={(value) => updateForm('owner', value)}
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <FilterSelect
                      label={copy.status}
                      value={form.status}
                      options={projectStatusOrder.map((option) => ({
                        value: option,
                        label: copy.projectStatusLabels[option],
                      }))}
                      onChange={(value) => updateForm('status', value)}
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <FilterSelect
                      label={copy.priority}
                      value={form.priority}
                      options={[
                        { value: 'high', label: copy.priorityLabels.high },
                        { value: 'medium', label: copy.priorityLabels.medium },
                        { value: 'low', label: copy.priorityLabels.low },
                      ]}
                      onChange={(value) => updateForm('priority', value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {copy.startDate}
                        <span className="ml-1 text-amber-600">*</span>
                      </label>
                      <Input
                        type="date"
                        value={form.startDate}
                        onChange={(event) => updateForm('startDate', event.target.value)}
                        className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {copy.dueDate}
                        <span className="ml-1 text-amber-600">*</span>
                      </label>
                      <Input
                        type="date"
                        value={form.dueDate}
                        onChange={(event) => updateForm('dueDate', event.target.value)}
                        className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.budget}</label>
                      <Input
                        type="number"
                        min={0}
                        value={form.budget}
                        onChange={(event) => updateForm('budget', event.target.value)}
                        placeholder="0"
                        className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.summary}</label>
                    <Textarea
                      value={form.summary}
                      onChange={(event) => updateForm('summary', event.target.value)}
                      placeholder={copy.summary}
                      className="min-h-[150px] rounded-xl border-slate-200 px-4 py-3 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-3.5 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
              disabled={!form.name.trim() || !form.startDate || !form.dueDate}
            >
              {copy.createProject}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const { currentLanguage } = useLanguage();
  const languageKey: CopyLanguage = currentLanguage.code.startsWith('en') ? 'en' : 'es';
  const copy = projectCopy[languageKey];
  const locale = currentLanguage.code.startsWith('en') ? 'en-US' : 'es-MX';

  const [projects, setProjects] = useState<ProcessProject[]>(processProjects);
  const [projectTasks, setProjectTasks] = useState<ProcessAgendaItem[]>(processAgendaItems);
  const [viewMode, setViewMode] = useState<ProjectsViewMode>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [unitFilter, setUnitFilter] = useState<'all' | string>('all');
  const [businessFilter, setBusinessFilter] = useState<'all' | string>('all');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [diagramMonth, setDiagramMonth] = useState<Date>(() => startOfMonth(new Date()));

  const unitOptions = Array.from(new Set(projects.map((project) => project.unit)));
  const businessOptions = Array.from(new Set(projects.map((project) => project.business)));
  const ownerOptions = Array.from(
    new Set([
      ...projects.map((project) => project.owner),
      ...projectTasks.flatMap((task) => [task.creator, task.responsible]),
    ]),
  );
  const projectTaskUnitOptions = Array.from(new Set([...projects.map((project) => project.unit), ...projectTasks.map((task) => task.unit)]));
  const projectTaskBusinessOptions = Array.from(
    new Set([...projects.map((project) => project.business), ...projectTasks.map((task) => task.business)]),
  );
  const projectTaskCollaboratorOptions = Array.from(
    new Set([...projects.map((project) => project.owner), ...projectTasks.flatMap((task) => [task.creator, task.responsible])]),
  );

  const [projectForm, setProjectForm] = useState<ProjectFormState>(() =>
    buildDefaultProjectForm(unitOptions, businessOptions, ownerOptions),
  );

  const filteredProjects = projects.filter((project) => {
    const localizedUnit = unitLabels[project.unit]?.[languageKey] ?? project.unit;
    const localizedBusiness = businessLabels[project.business]?.[languageKey] ?? project.business;
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.folio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      localizedUnit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      localizedBusiness.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesUnit = unitFilter === 'all' || project.unit === unitFilter;
    const matchesBusiness = businessFilter === 'all' || project.business === businessFilter;

    return matchesSearch && matchesStatus && matchesUnit && matchesBusiness;
  });

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedProjectTasks = selectedProject
    ? projectTasks
        .filter((task) => task.projectId === selectedProject.id)
        .sort((taskA, taskB) => taskA.startDate.localeCompare(taskB.startDate))
    : [];

  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter((project) => project.status === 'active').length;
  const atRiskProjects = filteredProjects.filter((project) => project.status === 'at-risk').length;
  const linkedTasks = filteredProjects.reduce(
    (currentTotal, project) =>
      currentTotal + projectTasks.filter((task) => task.projectId === project.id).length,
    0,
  );
  const diagramMonthStart = startOfMonth(diagramMonth);
  const diagramMonthEnd = new Date(diagramMonth.getFullYear(), diagramMonth.getMonth() + 1, 0);
  const diagramMonthDays = buildMonthDays(diagramMonth);
  const diagramMonthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(diagramMonth);

  const statusOptions: Option<'all' | ProjectStatus>[] = [
    { value: 'all', label: copy.all },
    ...projectStatusOrder.map((status) => ({
      value: status,
      label: copy.projectStatusLabels[status],
    })),
  ];

  const localizedUnitOptions: Option<'all' | string>[] = [
    { value: 'all', label: copy.all },
    ...unitOptions.map((unit) => ({
      value: unit,
      label: unitLabels[unit]?.[languageKey] ?? unit,
    })),
  ];

  const localizedBusinessOptions: Option<'all' | string>[] = [
    { value: 'all', label: copy.all },
    ...businessOptions.map((business) => ({
      value: business,
      label: businessLabels[business]?.[languageKey] ?? business,
    })),
  ];
  const visibleProjectsInTasksView =
    selectedProjectId === null
      ? filteredProjects
      : filteredProjects.filter((project) => project.id === selectedProjectId);

  const focusProject = (project: ProcessProject) => {
    setSelectedProjectId(project.id);
    setDiagramMonth(startOfMonth(new Date(`${project.startDate}T00:00:00`)));
  };

  const toggleSelectedProjectTasks = (project: ProcessProject) => {
    if (selectedProjectId === project.id) {
      setSelectedProjectId(null);
      return;
    }

    focusProject(project);
  };

  const updateProjectTask = (
    taskId: number,
    updater: (task: ProcessAgendaItem) => ProcessAgendaItem,
  ) => {
    setProjectTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? updater(task) : task)),
    );
  };

  const handleCreateProjectTask = (project: ProcessProject, title: string) => {
    const createdAt = new Date().toISOString().slice(0, 10);

    const newTask: ProcessAgendaItem = {
      id: projectTasks.reduce((maxValue, task) => Math.max(maxValue, task.id), 0) + 1,
      folio: buildTaskFolio(projectTasks),
      type: 'project-task',
      unit: project.unit,
      business: project.business,
      title: title.trim(),
      description: '',
      createdAt,
      startDate: createdAt,
      dueDate: createdAt,
      status: 'pending',
      creator: project.owner,
      responsible: project.owner,
      priority: 'medium',
      attachments: 0,
      projectId: project.id,
      project: project.name,
      completion: 0,
      notes: '',
      weighting: 3,
      audited: false,
      auditNotes: '',
      files: [],
      history: [
        {
          id: `created-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'created',
          title: languageKey === 'es' ? 'Tarea creada' : 'Task created',
          description:
            languageKey === 'es'
              ? `${project.owner} creo una tarea rapida para el proyecto ${project.name}.`
              : `${project.owner} created a quick task for the project ${project.name}.`,
          createdAt: `${createdAt}T09:00:00`,
          createdBy: project.owner,
        },
      ],
    };

    setProjectTasks((currentTasks) => [newTask, ...currentTasks]);
  };

  const handleDuplicateProjectTask = (task: ProcessAgendaItem) => {
    const now = new Date().toISOString();
    const duplicatedTask: ProcessAgendaItem = {
      ...task,
      id: projectTasks.reduce((maxValue, currentTask) => Math.max(maxValue, currentTask.id), 0) + 1,
      folio: buildTaskFolio(projectTasks),
      title: languageKey === 'es' ? `${task.title} copia` : `${task.title} copy`,
      createdAt: now.slice(0, 10),
      startDate: now.slice(0, 10),
      status: 'pending',
      completion: 0,
      notes: '',
      audited: false,
      auditNotes: '',
      files: cloneTaskFiles(task.files),
      attachments: task.files.length,
      history: [
        {
          id: `duplicated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'duplicated',
          title: languageKey === 'es' ? 'Tarea duplicada' : 'Task duplicated',
          description:
            languageKey === 'es'
              ? `${task.creator} creo una copia desde ${task.folio}.`
              : `${task.creator} created a copy from ${task.folio}.`,
          createdAt: now,
          createdBy: task.creator,
        },
      ],
    };

    setProjectTasks((currentTasks) => [duplicatedTask, ...currentTasks]);
  };

  const handleDeleteProjectTask = (taskId: number) => {
    setProjectTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  };

  const handleAddProjectSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectForm.name.trim() || !projectForm.startDate || !projectForm.dueDate) {
      return;
    }

    const newProject: ProcessProject = {
      id: projects.reduce((maxValue, project) => Math.max(maxValue, project.id), 0) + 1,
      folio: buildProjectFolio(projects),
      name: projectForm.name.trim(),
      unit: projectForm.unit,
      business: projectForm.business,
      owner: projectForm.owner,
      createdAt: new Date().toISOString().slice(0, 10),
      startDate: projectForm.startDate,
      dueDate: projectForm.dueDate,
      progress: 0,
      status: projectForm.status,
      budget: Number(projectForm.budget || 0),
      priority: projectForm.priority,
      summary: projectForm.summary.trim(),
    };

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    setProjectForm(buildDefaultProjectForm(unitOptions, businessOptions, ownerOptions));
    setIsAddProjectOpen(false);
  };

  const handleAddProjectOpenChange = (open: boolean) => {
    if (!open) {
      setProjectForm(buildDefaultProjectForm(unitOptions, businessOptions, ownerOptions));
    }

    setIsAddProjectOpen(open);
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <span className="text-2xl">🎯</span>
              {copy.sectionTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{copy.sectionDescription}</p>
          </div>
          <Button className={cn('h-11 gap-2 rounded-xl px-4', accentButtonClass)} onClick={() => setIsAddProjectOpen(true)}>
            <Plus className="h-4 w-4" />
            {copy.addProject}
          </Button>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setViewMode('tasks')}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
            viewMode === 'tasks'
              ? 'border-slate-800 bg-[rgb(235,165,52)] text-white shadow-sm dark:border-[rgb(235,165,52)]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
          )}
        >
          <LayoutList className="h-4 w-4" />
          {copy.tasksView}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('diagram')}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
            viewMode === 'diagram'
              ? 'border-slate-800 bg-[rgb(235,165,52)] text-white shadow-sm dark:border-[rgb(235,165,52)]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
          )}
        >
          <CalendarDays className="h-4 w-4" />
          {copy.diagramView}
        </button>
      </div>

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.filters}</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <FilterSelect
            label={copy.unit}
            value={unitFilter}
            options={localizedUnitOptions}
            onChange={(value) => setUnitFilter(value)}
          />
          <FilterSelect
            label={copy.business}
            value={businessFilter}
            options={localizedBusinessOptions}
            onChange={(value) => setBusinessFilter(value)}
          />
          <FilterSelect
            label={copy.status}
            value={statusFilter}
            options={statusOptions}
            onChange={(value) => setStatusFilter(value)}
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          📁 <span className="font-medium text-slate-900 dark:text-white">{totalProjects}</span> {copy.totalProjects}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ✅ <span className="font-medium text-blue-600">{activeProjects}</span> {copy.activeProjects}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ⚠️ <span className="font-medium text-red-600">{atRiskProjects}</span> {copy.atRiskProjects}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          📋 <span className="font-medium text-[rgb(235,165,52)]">{linkedTasks}</span> {copy.linkedTasks}
        </span>
      </div>

      {viewMode === 'tasks' ? (
        <>
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Table className="min-w-[1380px]">
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-700">
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">Folio</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.projectName}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.projectDescription}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.unit}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.business}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.owner}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.status}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.priority}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.startDate}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.dueDate}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.progress}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.tasks}</TableHead>
                  <TableHead className="px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjectsInTasksView.map((project) => {
                  const projectLinkedTasks = projectTasks.filter((task) => task.projectId === project.id);
                  const isExpanded = selectedProjectId === project.id;

                  return (
                    <Fragment key={project.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40',
                          isExpanded && 'bg-[rgb(235,165,52)]/8 dark:bg-[rgb(235,165,52)]/10',
                        )}
                        onClick={() => toggleSelectedProjectTasks(project)}
                      >
                        <TableCell className="px-5 py-5 text-sm font-semibold text-slate-900 dark:text-white">{project.folio}</TableCell>
                        <TableCell className="px-5 py-5">
                          <div className="min-w-[220px]">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{project.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5">
                          <div className="min-w-[320px]">
                            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{project.summary || copy.noSummary}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                          {unitLabels[project.unit]?.[languageKey] ?? project.unit}
                        </TableCell>
                        <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                          {businessLabels[project.business]?.[languageKey] ?? project.business}
                        </TableCell>
                        <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">{project.owner}</TableCell>
                        <TableCell className="px-5 py-5">
                          <ProjectStatusBadge status={project.status} label={copy.projectStatusLabels[project.status]} />
                        </TableCell>
                        <TableCell className="px-5 py-5">
                          <PriorityBadge priority={project.priority} label={copy.priorityLabels[project.priority]} />
                        </TableCell>
                        <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">{formatDate(project.startDate, locale)}</TableCell>
                        <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">{formatDate(project.dueDate, locale)}</TableCell>
                        <TableCell className="px-5 py-5">
                          <div className="flex min-w-[170px] items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-[rgb(235,165,52)]" style={{ width: `${project.progress}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{project.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5 text-sm font-semibold text-slate-700 dark:text-slate-100">{projectLinkedTasks.length}</TableCell>
                        <TableCell className="px-5 py-5">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelectedProjectTasks(project);
                            }}
                          >
                            <FolderOpen className="mr-2 h-4 w-4" />
                            {isExpanded ? copy.hideTasks : copy.openTasks}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded ? (
                        <TableRow className="border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/50">
                          <TableCell colSpan={13} className="p-0">
                            <InlineProjectTasksWorkspace
                              project={project}
                              tasks={projectLinkedTasks}
                              copy={copy}
                              locale={locale}
                              languageKey={languageKey}
                              unitOptions={projectTaskUnitOptions}
                              businessOptions={projectTaskBusinessOptions}
                              collaboratorOptions={projectTaskCollaboratorOptions}
                              onUpdateTask={updateProjectTask}
                              onCreateTask={handleCreateProjectTask}
                              onDuplicateTask={handleDuplicateProjectTask}
                              onDeleteTask={handleDeleteProjectTask}
                              onClose={() => setSelectedProjectId(null)}
                              embedded
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
                {visibleProjectsInTasksView.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                      {copy.emptyState}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

        </>
      ) : selectedProject ? (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedProject.name}</h3>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {selectedProject.folio}
                  </span>
                  <ProjectStatusBadge
                    status={selectedProject.status}
                    label={copy.projectStatusLabels[selectedProject.status]}
                  />
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {selectedProject.summary || copy.noSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProjectId(null)}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {copy.backToProjectsList}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDiagramMonth((currentMonth) => addMonths(currentMonth, -1))}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {copy.previousMonth}
                </Button>
                <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  {diagramMonthLabel}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDiagramMonth((currentMonth) => addMonths(currentMonth, 1))}
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  {copy.nextMonth}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(280px,1fr)_minmax(0,4fr)]">
            <aside className="border-b border-slate-200 dark:border-slate-700 xl:border-b-0 xl:border-r">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">{copy.diagramTasksTitle}</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {selectedProjectTasks.length} {copy.tasks.toLowerCase()}
                </p>
              </div>

              {selectedProjectTasks.length > 0 ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {selectedProjectTasks.map((task) => (
                    <div key={task.id} className="min-h-[88px] px-5 py-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.folio}</p>
                          </div>
                          <TaskStatusBadge status={task.status} label={copy.taskStatusLabels[task.status]} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{task.responsible}</span>
                          <span>•</span>
                          <span>{formatDate(task.dueDate, locale)}</span>
                          <span>•</span>
                          <PriorityBadge priority={task.priority} label={copy.priorityLabels[task.priority]} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.emptyProjectTasks}
                </div>
              )}
            </aside>

            <section className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60">
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${diagramMonthDays.length}, minmax(42px, 1fr))` }}
                  >
                    {diagramMonthDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="border-l border-slate-200 px-2 py-3 text-center first:border-l-0 dark:border-slate-700"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                          {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-100">{day.getDate()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedProjectTasks.length > 0 ? (
                  selectedProjectTasks.map((task) => {
                    const taskRange = getTaskRangeInMonth(task, diagramMonthStart, diagramMonthEnd);

                    return (
                      <div
                        key={task.id}
                        className="relative grid min-h-[88px] border-b border-slate-200 dark:border-slate-700"
                        style={{ gridTemplateColumns: `repeat(${diagramMonthDays.length}, minmax(42px, 1fr))` }}
                      >
                        {diagramMonthDays.map((day) => (
                          <div
                            key={`${task.id}-${day.toISOString()}`}
                            className="border-l border-slate-200 first:border-l-0 dark:border-slate-700"
                          />
                        ))}

                        {taskRange ? (
                          <div
                            className="pointer-events-none absolute inset-y-4 rounded-xl border border-[rgb(235,165,52)]/40 bg-[rgb(235,165,52)]/20 px-3 py-2 dark:border-[rgb(235,165,52)]/30 dark:bg-[rgb(235,165,52)]/25"
                            style={{
                              left: `calc(${(taskRange.startOffset / diagramMonthDays.length) * 100}% + 6px)`,
                              width: `calc(${(taskRange.span / diagramMonthDays.length) * 100}% - 12px)`,
                            }}
                          >
                            <div className="flex h-full items-center justify-between gap-3">
                              <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-950">
                                {task.title}
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-slate-900/80 dark:text-slate-950/80">
                                {task.completion}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xs font-medium text-slate-400 dark:text-slate-500">
                            {copy.noDates}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.emptyProjectTasks}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.diagramProjectsTitle}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {copy.diagramListDescription}
            </p>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredProjects.map((project) => {
                const projectLinkedTasks = projectTasks.filter((task) => task.projectId === project.id);

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => focusProject(project)}
                    className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{project.name}</p>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                          {project.folio}
                        </span>
                        <ProjectStatusBadge status={project.status} label={copy.projectStatusLabels[project.status]} />
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {project.summary || copy.noSummary}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{unitLabels[project.unit]?.[languageKey] ?? project.unit}</span>
                        <span>•</span>
                        <span>{businessLabels[project.business]?.[languageKey] ?? project.business}</span>
                        <span>•</span>
                        <span>{projectLinkedTasks.length} {copy.tasks.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden min-w-[220px] items-center gap-3 lg:flex">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-[rgb(235,165,52)]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{project.progress}%</span>
                      </div>

                      <span className={cn('inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold', accentButtonClass)}>
                        {copy.openDiagram}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400">{copy.emptyState}</div>
          )}
        </section>
      )}

      <AddProjectModal
        open={isAddProjectOpen}
        onOpenChange={handleAddProjectOpenChange}
        onSubmit={handleAddProjectSubmit}
        form={projectForm}
        setForm={setProjectForm}
        copy={copy}
        languageKey={languageKey}
        unitOptions={unitOptions}
        businessOptions={businessOptions}
        ownerOptions={ownerOptions}
      />
    </>
  );
}
