import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Copy,
  Columns3,
  Download,
  FileText,
  FileUp,
  FolderOpen,
  GripVertical,
  KanbanSquare,
  LayoutList,
  Paperclip,
  Pencil,
  Plus,
  PlusCircle,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  ProcessAgendaItem,
  ProcessTaskFile,
  ProcessTaskHistoryEntry,
  ProcessTaskPriority,
  ProcessTaskStatus,
  ProcessTaskType,
  processAgendaItems,
} from '../mockData';

type ViewMode = 'table' | 'kanban';
type PeriodFilter = 'all-time' | 'today-agenda' | 'this-week' | 'this-month' | 'overdue';
type SortDirection = 'asc' | 'desc';
type TaskEditorMode = 'create' | 'edit';
type ConfigurableColumnId =
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

interface AgendaFilters {
  period: PeriodFilter;
  unit: string;
  business: string;
  collaborator: string;
  status: 'all' | ProcessTaskStatus;
}

interface ColumnSetting {
  id: ConfigurableColumnId;
  visible: boolean;
  locked?: boolean;
}

interface TaskFormState {
  unit: string;
  business: string;
  title: string;
  description: string;
  createdAt: string;
  startDate: string;
  dueDate: string;
  status: ProcessTaskStatus;
  creator: string;
  responsible: string;
  priority: ProcessTaskPriority;
}

interface TaskEditorState {
  open: boolean;
  mode: TaskEditorMode;
  taskId: number | null;
}

interface FilesDialogState {
  open: boolean;
  taskId: number | null;
}

interface ReportDialogState {
  open: boolean;
  taskId: number | null;
}

interface AuditDialogState {
  open: boolean;
  taskId: number | null;
  comments: string;
  weighting: number;
}

interface TaskDetailsDialogState {
  open: boolean;
  taskId: number | null;
}

interface QuickCreateState {
  open: boolean;
  title: string;
}

interface AgendaProps {
  learningModeActive?: boolean;
}

interface AgendaCopy {
  sectionTitle: string;
  sectionDescription: string;
  learningModeTitle: string;
  learningModeDescription: string;
  learningModeAgendaTitle: string;
  learningModeAgendaDescription: string;
  learningModeCreateTaskTitle: string;
  learningModeCreateTaskDescription: string;
  configureColumnsTitle: string;
  configureColumnsDescription: string;
  configureColumnsDragHint: string;
  optionalColumn: string;
  columns: string;
  newTask: string;
  table: string;
  kanban: string;
  filters: string;
  period: string;
  unit: string;
  business: string;
  collaborator: string;
  status: string;
  creator: string;
  responsible: string;
  priority: string;
  title: string;
  description: string;
  creationDate: string;
  startDate: string;
  dueDate: string;
  type: string;
  folio: string;
  attachments: string;
  project: string;
  completion: string;
  notes: string;
  weighting: string;
  auditNotes: string;
  actions: string;
  all: string;
  emptyState: string;
  emptyKanban: string;
  totalTasks: string;
  pendingTasks: string;
  inProgressTasks: string;
  completedTasks: string;
  auditedTasks: string;
  completionRate: string;
  cancel: string;
  applyChanges: string;
  createTaskTitle: string;
  editTaskTitle: string;
  createTaskDescription: string;
  editTaskDescription: string;
  requiredFieldsHint: string;
  createTaskButton: string;
  saveChanges: string;
  currentUser: string;
  noProject: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  quickTaskTitle: string;
  quickTaskDescription: string;
  quickTaskPlaceholder: string;
  createQuickTask: string;
  filesModalTitle: string;
  filesModalDescription: string;
  addFiles: string;
  noFiles: string;
  openFile: string;
  filePreviewUnavailable: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  reportModalTitle: string;
  reportModalDescription: string;
  noTaskDescription: string;
  taskDetailsModalTitle: string;
  taskDetailsModalDescription: string;
  taskHistory: string;
  noHistory: string;
  downloadPdf: string;
  auditModalTitle: string;
  auditModalDescription: string;
  auditComments: string;
  auditCommentsPlaceholder: string;
  saveAudit: string;
  completeTaskLabel: string;
  editTaskLabel: string;
  reportTaskLabel: string;
  deleteTaskLabel: string;
  duplicateTaskLabel: string;
  auditTaskLabel: string;
  quickAddTask: string;
  createdEventTitle: string;
  updatedEventTitle: string;
  completedEventTitle: string;
  duplicateEventTitle: string;
  filesEventTitle: string;
  auditEventTitle: string;
  addNotesPlaceholder: string;
  addAuditNotesPlaceholder: string;
  noAuditNotes: string;
  quickTaskDefaultDescription: string;
  selectAll: string;
  clearAll: string;
  fixedColumn: string;
  visibleColumns: (visibleCount: number, totalCount: number) => string;
  historyTaskMovedFromKanban: (actorName: string, targetStatusLabel: string) => string;
  historyTaskUpdatedFromEditor: string;
  historyTaskCreatedFromForm: (actorName: string) => string;
  historyTaskCreatedFromQuickAction: (actorName: string) => string;
  historyTaskCompleted: (actorName: string) => string;
  deleteTaskConfirmation: (taskTitle: string) => string;
  duplicateTaskTitle: (taskTitle: string) => string;
  historyTaskDuplicatedFrom: (actorName: string, folio: string) => string;
  historyTaskDuplicateCreated: (actorName: string) => string;
  historyFilesAdded: (actorName: string, fileCount: number) => string;
  historyAuditRegistered: (weighting: number, comments: string) => string;
  columnDescriptions: Record<ConfigurableColumnId, string>;
  typeLabels: Record<ProcessTaskType, string>;
  statusLabels: Record<ProcessTaskStatus, string>;
  priorityLabels: Record<ProcessTaskPriority, string>;
  periodLabels: Record<PeriodFilter, string>;
}

type AgendaLanguageCode = 'es-MX' | 'es-CO' | 'en-US' | 'en-CA' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';

interface Option<T extends string> {
  value: T;
  label: string;
}

const accentButtonClass = 'bg-[rgb(235,165,52)] text-white hover:bg-[rgb(214,144,35)]';

const defaultFilters: AgendaFilters = {
  period: 'all-time',
  unit: 'all',
  business: 'all',
  collaborator: 'all',
  status: 'all',
};

const defaultColumnSettings: ColumnSetting[] = [
  { id: 'folio', visible: true, locked: true },
  { id: 'type', visible: true },
  { id: 'unit', visible: true },
  { id: 'business', visible: true },
  { id: 'title', visible: true },
  { id: 'description', visible: true },
  { id: 'createdAt', visible: true },
  { id: 'startDate', visible: true },
  { id: 'dueDate', visible: true },
  { id: 'status', visible: true },
  { id: 'creator', visible: true },
  { id: 'responsible', visible: true },
  { id: 'priority', visible: true },
  { id: 'attachments', visible: true },
  { id: 'project', visible: true },
  { id: 'completion', visible: true },
  { id: 'notes', visible: true },
  { id: 'weighting', visible: true },
  { id: 'auditNotes', visible: true },
];

const enAgendaCopy: AgendaCopy = {
    sectionTitle: 'Agenda',
    sectionDescription: 'Manage your task agenda',
    learningModeTitle: 'Learning mode',
    learningModeDescription: 'This guide explains what the Agenda tab is for and how to take action from it.',
    learningModeAgendaTitle: 'Work schedule',
    learningModeAgendaDescription:
      'The work schedule is made up of the tasks scheduled for you. It helps you understand what you need to start, follow up on, complete, or audit during your workday.',
    learningModeCreateTaskTitle: 'Create Task button',
    learningModeCreateTaskDescription:
      'Use Create Task to register a new task, assign dates and priority, and delegate it to the right collaborator without leaving the agenda.',
    configureColumnsTitle: 'Configure columns',
    configureColumnsDescription:
      'Select and order the columns you want to display in the table. Changes will only apply when you save them.',
    configureColumnsDragHint: 'Drag rows to reorder the table layout.',
    optionalColumn: 'Optional',
    columns: 'Columns',
    newTask: 'New task',
    table: 'Table',
    kanban: 'Kanban',
    filters: 'Filters',
    period: 'Period',
    unit: 'Unit',
    business: 'Business',
    collaborator: 'Collaborator',
    status: 'Status',
    creator: 'Creator',
    responsible: 'Responsible',
    priority: 'Priority',
    title: 'Task title',
    description: 'Description',
    creationDate: 'Creation date',
    startDate: 'Start date',
    dueDate: 'Due date',
    type: 'Type',
    folio: 'Folio',
    attachments: 'Files',
    project: 'Project',
    completion: '% Completed',
    notes: 'Notes',
    weighting: 'Weighting',
    auditNotes: 'Audit Notes',
    actions: 'Actions',
    all: 'All',
    emptyState: 'No tasks match the current filters.',
    emptyKanban: 'No tasks in this status.',
    totalTasks: 'tasks',
    pendingTasks: 'pending',
    inProgressTasks: 'in progress',
    completedTasks: 'completed',
    auditedTasks: 'audited',
    completionRate: 'completed',
    cancel: 'Cancel',
    applyChanges: 'Apply changes',
    createTaskTitle: 'Create new task',
    editTaskTitle: 'Edit task',
    createTaskDescription: 'Complete the following fields to create a new task in the system.',
    editTaskDescription: 'Update the selected task information.',
    requiredFieldsHint: 'Fields marked with * are required.',
    createTaskButton: 'Create task',
    saveChanges: 'Save changes',
    currentUser: 'Current user',
    noProject: 'No project',
    titlePlaceholder: 'Enter the task title',
    descriptionPlaceholder: 'Enter the task description',
    quickTaskTitle: 'Create task from table',
    quickTaskDescription: 'Add a quick task by entering only the task title. The system will register the creation event automatically.',
    quickTaskPlaceholder: 'Enter task title',
    createQuickTask: 'Create quick task',
    filesModalTitle: 'Task files',
    filesModalDescription: 'View the files attached to this task and add new ones when needed.',
    addFiles: 'Add files',
    noFiles: 'No files attached yet.',
    openFile: 'Open file',
    filePreviewUnavailable: 'Preview unavailable',
    uploadedBy: 'Uploaded by',
    uploadedAt: 'Uploaded at',
    fileSize: 'Size',
    reportModalTitle: 'Task report',
    reportModalDescription: 'Review the task timeline and download the PDF report with the full event history.',
    noTaskDescription: 'No description available for this task yet.',
    taskDetailsModalTitle: 'Task details',
    taskDetailsModalDescription: 'Review the task information, verify ownership, and trigger the next action directly from the Kanban board.',
    taskHistory: 'Task history',
    noHistory: 'No history available yet.',
    downloadPdf: 'Download PDF',
    auditModalTitle: 'Register audit',
    auditModalDescription: 'Add audit comments and assign the task weighting. This information will be stored in the task history.',
    auditComments: 'Audit comments',
    auditCommentsPlaceholder: 'Add the audit observations for this task',
    saveAudit: 'Save audit',
    completeTaskLabel: 'Complete task',
    editTaskLabel: 'Edit task',
    reportTaskLabel: 'Task report',
    deleteTaskLabel: 'Delete task',
    duplicateTaskLabel: 'Duplicate task',
    auditTaskLabel: 'Audit task',
    quickAddTask: 'Quick add task',
    createdEventTitle: 'Task created',
    updatedEventTitle: 'Task updated',
    completedEventTitle: 'Task completed',
    duplicateEventTitle: 'Task duplicated',
    filesEventTitle: 'Files added',
    auditEventTitle: 'Audit registered',
    addNotesPlaceholder: 'Add notes',
    addAuditNotesPlaceholder: 'Add audit notes',
    noAuditNotes: 'No audit notes have been registered yet.',
    quickTaskDefaultDescription: 'Quick task created directly from the agenda table.',
    selectAll: 'Select all',
    clearAll: 'Deselect all',
    fixedColumn: '(Fixed)',
    visibleColumns: (visibleCount, totalCount) => `${visibleCount} of ${totalCount} visible columns`,
    historyTaskMovedFromKanban: (actorName, targetStatusLabel) =>
      `${actorName} moved the task to ${targetStatusLabel.toLowerCase()} from Kanban.`,
    historyTaskUpdatedFromEditor: 'The task details were updated from the task editor.',
    historyTaskCreatedFromForm: (actorName) => `${actorName} created the task from the full task form.`,
    historyTaskCreatedFromQuickAction: (actorName) => `${actorName} created the task from the quick-create action.`,
    historyTaskCompleted: (actorName) => `${actorName} marked the task as completed.`,
    deleteTaskConfirmation: (taskTitle) => `Delete "${taskTitle}"?`,
    duplicateTaskTitle: (taskTitle) => `${taskTitle} copy`,
    historyTaskDuplicatedFrom: (actorName, folio) => `${actorName} duplicated the task from ${folio}.`,
    historyTaskDuplicateCreated: (actorName) => `${actorName} created a duplicate copy of this task.`,
    historyFilesAdded: (actorName, fileCount) => `${actorName} added ${fileCount} file(s) to the task.`,
    historyAuditRegistered: (weighting, comments) => `Weighting set to ${weighting}. Comment: ${comments}`,
    columnDescriptions: {
      folio: 'Unique task identifier used to track the record in the agenda.',
      type: 'Category that tells whether the record is a task or a process.',
      unit: 'Business unit responsible for carrying out the work.',
      business: 'Business area or line where the task belongs.',
      title: 'Main name used to identify the task in the workflow.',
      description: 'Summary of the task objective, scope, or context.',
      createdAt: 'Date when the task record was created in the system.',
      startDate: 'Scheduled date to begin the work.',
      dueDate: 'Committed deadline to complete the task.',
      status: 'Current progress stage of the task.',
      creator: 'Person who created the task record.',
      responsible: 'Collaborator assigned to lead or execute the task.',
      priority: 'Urgency level assigned to the task.',
      attachments: 'Files, evidence, or documents linked to the task.',
      project: 'Project or initiative associated with the task.',
      completion: 'Reported percentage of progress completed.',
      notes: 'Working notes, reminders, or follow-up context for the task.',
      weighting: 'Weight value used for evaluation or auditing.',
      auditNotes: 'Comments captured during the task audit process.',
    },
    typeLabels: {
      'project-task': 'Project task',
      task: 'Task',
      process: 'Process',
    },
    statusLabels: {
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
    periodLabels: {
      'all-time': 'All time',
      'today-agenda': 'Today agenda',
      'this-week': 'This week',
      'this-month': 'This month',
      overdue: 'Overdue',
    },
};

const esAgendaCopy: AgendaCopy = {
    sectionTitle: 'Agenda',
    sectionDescription: 'Gestiona tu agenda de tareas',
    learningModeTitle: 'Modo aprendiz',
    learningModeDescription: 'Esta guia explica para que sirve la pestana de Agenda y que puedes hacer desde aqui.',
    learningModeAgendaTitle: 'Agenda de trabajo',
    learningModeAgendaDescription:
      'La agenda de trabajo esta compuesta por las tareas programadas para el usuario. Te ayuda a identificar que debes iniciar, dar seguimiento, completar o auditar durante tu jornada.',
    learningModeCreateTaskTitle: 'Boton Crear tarea',
    learningModeCreateTaskDescription:
      'Usa Crear tarea para registrar una nueva tarea, asignar fechas y prioridad, y delegarla al colaborador correcto sin salir de la agenda.',
    configureColumnsTitle: 'Configurar columnas',
    configureColumnsDescription:
      'Selecciona y ordena las columnas que deseas mostrar en la tabla. Los cambios solo se aplicaran cuando los guardes.',
    configureColumnsDragHint: 'Arrastra las filas para reordenar la tabla.',
    optionalColumn: 'Opcional',
    columns: 'Columnas',
    newTask: 'Nueva tarea',
    table: 'Tabla',
    kanban: 'Kanban',
    filters: 'Filtros',
    period: 'Periodo',
    unit: 'Unidad',
    business: 'Negocio',
    collaborator: 'Colaborador',
    status: 'Estado',
    creator: 'Creador',
    responsible: 'Responsable',
    priority: 'Prioridad',
    title: 'Titulo de tarea',
    description: 'Descripcion',
    creationDate: 'Fecha de creacion',
    startDate: 'Fecha de inicio',
    dueDate: 'Fecha de vencimiento',
    type: 'Tipo',
    folio: 'Folio',
    attachments: 'Archivos',
    project: 'Proyecto',
    completion: '% Completado',
    notes: 'Notas',
    weighting: 'Ponderacion',
    auditNotes: 'Notas de auditoria',
    actions: 'Acciones',
    all: 'Todos',
    emptyState: 'No hay tareas que coincidan con los filtros actuales.',
    emptyKanban: 'No hay tareas en este estado.',
    totalTasks: 'tareas',
    pendingTasks: 'pendientes',
    inProgressTasks: 'en progreso',
    completedTasks: 'completadas',
    auditedTasks: 'auditadas',
    completionRate: 'completado',
    cancel: 'Cancelar',
    applyChanges: 'Aplicar cambios',
    createTaskTitle: 'Crear nueva tarea',
    editTaskTitle: 'Editar tarea',
    createTaskDescription: 'Completa los siguientes campos para crear una nueva tarea en el sistema.',
    editTaskDescription: 'Actualiza la informacion de la tarea seleccionada.',
    requiredFieldsHint: 'Los campos marcados con * son obligatorios.',
    createTaskButton: 'Crear tarea',
    saveChanges: 'Guardar cambios',
    currentUser: 'Usuario actual',
    noProject: 'Sin proyecto',
    titlePlaceholder: 'Ingresa el titulo de la tarea',
    descriptionPlaceholder: 'Ingresa la descripcion de la tarea',
    quickTaskTitle: 'Crear tarea desde la tabla',
    quickTaskDescription: 'Agrega una tarea rapida escribiendo solo el titulo. El sistema registrara automaticamente el evento de creacion.',
    quickTaskPlaceholder: 'Ingresa el titulo de la tarea',
    createQuickTask: 'Crear tarea rapida',
    filesModalTitle: 'Archivos de la tarea',
    filesModalDescription: 'Consulta los archivos adjuntos de la tarea y agrega nuevos cuando sea necesario.',
    addFiles: 'Agregar archivos',
    noFiles: 'Aun no hay archivos adjuntos.',
    openFile: 'Abrir archivo',
    filePreviewUnavailable: 'Vista previa no disponible',
    uploadedBy: 'Subido por',
    uploadedAt: 'Fecha de carga',
    fileSize: 'Tamano',
    reportModalTitle: 'Reporte de tarea',
    reportModalDescription: 'Consulta la linea de tiempo de la tarea y descarga el PDF con el historial completo de eventos.',
    noTaskDescription: 'Aun no hay una descripcion disponible para esta tarea.',
    taskDetailsModalTitle: 'Detalle de tarea',
    taskDetailsModalDescription: 'Consulta la informacion de la tarea, valida la responsabilidad y ejecuta la siguiente accion desde el tablero Kanban.',
    taskHistory: 'Historial de la tarea',
    noHistory: 'Aun no hay historial disponible.',
    downloadPdf: 'Descargar PDF',
    auditModalTitle: 'Registrar auditoria',
    auditModalDescription: 'Agrega comentarios de auditoria y asigna la ponderacion de la tarea. Esta informacion se guardara en el historial.',
    auditComments: 'Comentarios de auditoria',
    auditCommentsPlaceholder: 'Agrega las observaciones de auditoria para esta tarea',
    saveAudit: 'Guardar auditoria',
    completeTaskLabel: 'Completar tarea',
    editTaskLabel: 'Editar tarea',
    reportTaskLabel: 'Reporte de tarea',
    deleteTaskLabel: 'Eliminar tarea',
    duplicateTaskLabel: 'Duplicar tarea',
    auditTaskLabel: 'Auditar tarea',
    quickAddTask: 'Agregar tarea rapida',
    createdEventTitle: 'Tarea creada',
    updatedEventTitle: 'Tarea actualizada',
    completedEventTitle: 'Tarea completada',
    duplicateEventTitle: 'Tarea duplicada',
    filesEventTitle: 'Archivos agregados',
    auditEventTitle: 'Auditoria registrada',
    addNotesPlaceholder: 'Agregar notas',
    addAuditNotesPlaceholder: 'Agregar notas de auditoria',
    noAuditNotes: 'Aun no se han registrado notas de auditoria.',
    quickTaskDefaultDescription: 'Tarea rapida creada directamente desde la tabla de agenda.',
    selectAll: 'Seleccionar todas',
    clearAll: 'Deseleccionar todas',
    fixedColumn: '(Fija)',
    visibleColumns: (visibleCount, totalCount) => `${visibleCount} de ${totalCount} columnas visibles`,
    historyTaskMovedFromKanban: (actorName, targetStatusLabel) =>
      `${actorName} movio la tarea a ${targetStatusLabel.toLowerCase()} desde Kanban.`,
    historyTaskUpdatedFromEditor: 'Los detalles de la tarea fueron actualizados desde el editor de tareas.',
    historyTaskCreatedFromForm: (actorName) => `${actorName} creo la tarea desde el formulario completo.`,
    historyTaskCreatedFromQuickAction: (actorName) => `${actorName} creo la tarea desde la accion rapida de la tabla.`,
    historyTaskCompleted: (actorName) => `${actorName} marco la tarea como completada.`,
    deleteTaskConfirmation: (taskTitle) => `¿Eliminar "${taskTitle}"?`,
    duplicateTaskTitle: (taskTitle) => `${taskTitle} copia`,
    historyTaskDuplicatedFrom: (actorName, folio) => `${actorName} duplico la tarea desde ${folio}.`,
    historyTaskDuplicateCreated: (actorName) => `${actorName} creo una copia duplicada de esta tarea.`,
    historyFilesAdded: (actorName, fileCount) => `${actorName} agrego ${fileCount} archivo(s) a la tarea.`,
    historyAuditRegistered: (weighting, comments) => `Ponderacion asignada en ${weighting}. Comentario: ${comments}`,
    columnDescriptions: {
      folio: 'Codigo unico de la tarea usado para identificar el registro dentro de la agenda.',
      type: 'Categoria que indica si el registro corresponde a una tarea o a un proceso.',
      unit: 'Unidad del negocio responsable de ejecutar el trabajo.',
      business: 'Area o linea del negocio a la que pertenece la tarea.',
      title: 'Nombre principal con el que se identifica la tarea en el flujo.',
      description: 'Resumen del objetivo, alcance o contexto de la tarea.',
      createdAt: 'Fecha en la que se creo el registro de la tarea en el sistema.',
      startDate: 'Fecha programada para comenzar el trabajo.',
      dueDate: 'Fecha limite comprometida para completar la tarea.',
      status: 'Etapa actual de avance de la tarea.',
      creator: 'Persona que registro la tarea en el sistema.',
      responsible: 'Colaborador asignado para liderar o ejecutar la tarea.',
      priority: 'Nivel de urgencia asignado a la tarea.',
      attachments: 'Archivos, evidencias o documentos vinculados a la tarea.',
      project: 'Proyecto o iniciativa relacionada con la tarea.',
      completion: 'Porcentaje de avance reportado hasta el momento.',
      notes: 'Notas de trabajo, recordatorios o contexto de seguimiento para la tarea.',
      weighting: 'Valor de ponderacion usado para evaluacion o auditoria.',
      auditNotes: 'Comentarios registrados durante la auditoria de la tarea.',
    },
    typeLabels: {
      'project-task': 'Tarea de proyecto',
      task: 'Tarea',
      process: 'Proceso',
    },
    statusLabels: {
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
    periodLabels: {
      'all-time': 'Todos',
      'today-agenda': 'Agenda del dia',
      'this-week': 'Esta semana',
      'this-month': 'Este mes',
      overdue: 'Vencidas',
    },
};

const frAgendaCopy: AgendaCopy = {
  sectionTitle: 'Agenda',
  sectionDescription: 'Gerez votre agenda de taches',
  learningModeTitle: 'Mode apprentissage',
  learningModeDescription: "Ce guide explique a quoi sert l'onglet Agenda et comment agir depuis celui-ci.",
  learningModeAgendaTitle: 'Horaire de travail',
  learningModeAgendaDescription:
    "L'horaire de travail est compose des taches planifiees pour l'utilisateur. Il aide a voir ce qu'il faut commencer, suivre, terminer ou auditer pendant la journee.",
  learningModeCreateTaskTitle: 'Bouton Creer une tache',
  learningModeCreateTaskDescription:
    "Utilisez Creer une tache pour enregistrer une nouvelle tache, attribuer des dates et une priorite, puis la deleguer au bon collaborateur sans quitter l'agenda.",
  configureColumnsTitle: 'Configurer les colonnes',
  configureColumnsDescription:
    "Selectionnez et ordonnez les colonnes que vous souhaitez afficher dans le tableau. Les changements seront appliques seulement apres l'enregistrement.",
  configureColumnsDragHint: 'Faites glisser les lignes pour reordonner le tableau.',
  optionalColumn: 'Optionnelle',
  columns: 'Colonnes',
  newTask: 'Nouvelle tache',
  table: 'Tableau',
  kanban: 'Kanban',
  filters: 'Filtres',
  period: 'Periode',
  unit: 'Unite',
  business: 'Activite',
  collaborator: 'Collaborateur',
  status: 'Statut',
  creator: 'Createur',
  responsible: 'Responsable',
  priority: 'Priorite',
  title: 'Titre de la tache',
  description: 'Description',
  creationDate: 'Date de creation',
  startDate: 'Date de debut',
  dueDate: "Date d'echeance",
  type: 'Type',
  folio: 'Folio',
  attachments: 'Fichiers',
  project: 'Projet',
  completion: '% Complete',
  notes: 'Notes',
  weighting: 'Ponderation',
  auditNotes: "Notes d'audit",
  actions: 'Actions',
  all: 'Tous',
  emptyState: 'Aucune tache ne correspond aux filtres actuels.',
  emptyKanban: 'Aucune tache dans ce statut.',
  totalTasks: 'taches',
  pendingTasks: 'en attente',
  inProgressTasks: 'en cours',
  completedTasks: 'completees',
  auditedTasks: 'auditees',
  completionRate: 'complete',
  cancel: 'Annuler',
  applyChanges: 'Appliquer',
  createTaskTitle: 'Creer une nouvelle tache',
  editTaskTitle: 'Modifier la tache',
  createTaskDescription: 'Remplissez les champs suivants pour creer une nouvelle tache dans le systeme.',
  editTaskDescription: 'Mettez a jour les informations de la tache selectionnee.',
  requiredFieldsHint: 'Les champs marques avec * sont obligatoires.',
  createTaskButton: 'Creer la tache',
  saveChanges: 'Enregistrer',
  currentUser: 'Utilisateur actuel',
  noProject: 'Sans projet',
  titlePlaceholder: 'Saisissez le titre de la tache',
  descriptionPlaceholder: 'Saisissez la description de la tache',
  quickTaskTitle: 'Creer une tache depuis le tableau',
  quickTaskDescription: "Ajoutez une tache rapide en saisissant seulement le titre. Le systeme enregistrera automatiquement l'evenement de creation.",
  quickTaskPlaceholder: 'Saisissez le titre de la tache',
  createQuickTask: 'Creer une tache rapide',
  filesModalTitle: 'Fichiers de la tache',
  filesModalDescription: 'Consultez les fichiers joints a cette tache et ajoutez-en de nouveaux si necessaire.',
  addFiles: 'Ajouter des fichiers',
  noFiles: "Aucun fichier joint pour le moment.",
  openFile: 'Ouvrir le fichier',
  filePreviewUnavailable: 'Apercu indisponible',
  uploadedBy: 'Ajoute par',
  uploadedAt: "Date d'ajout",
  fileSize: 'Taille',
  reportModalTitle: 'Rapport de tache',
  reportModalDescription: "Consultez la chronologie de la tache et telechargez le PDF avec l'historique complet.",
  noTaskDescription: "Aucune description n'est disponible pour cette tache pour le moment.",
  taskDetailsModalTitle: 'Details de la tache',
  taskDetailsModalDescription: "Consultez les informations de la tache, verifiez la responsabilite et lancez l'action suivante depuis le Kanban.",
  taskHistory: 'Historique de la tache',
  noHistory: "Aucun historique disponible pour le moment.",
  downloadPdf: 'Telecharger le PDF',
  auditModalTitle: "Enregistrer l'audit",
  auditModalDescription: "Ajoutez des commentaires d'audit et attribuez la ponderation de la tache. Ces informations seront stockees dans l'historique.",
  auditComments: "Commentaires d'audit",
  auditCommentsPlaceholder: "Ajoutez les observations d'audit pour cette tache",
  saveAudit: "Enregistrer l'audit",
  completeTaskLabel: 'Terminer la tache',
  editTaskLabel: 'Modifier la tache',
  reportTaskLabel: 'Rapport de tache',
  deleteTaskLabel: 'Supprimer la tache',
  duplicateTaskLabel: 'Dupliquer la tache',
  auditTaskLabel: 'Auditer la tache',
  quickAddTask: 'Ajouter une tache rapide',
  createdEventTitle: 'Tache creee',
  updatedEventTitle: 'Tache mise a jour',
  completedEventTitle: 'Tache completee',
  duplicateEventTitle: 'Tache dupliquee',
  filesEventTitle: 'Fichiers ajoutes',
  auditEventTitle: 'Audit enregistre',
  addNotesPlaceholder: 'Ajouter des notes',
  addAuditNotesPlaceholder: "Ajouter des notes d'audit",
  noAuditNotes: "Aucune note d'audit n'a encore ete enregistree.",
  quickTaskDefaultDescription: "Tache rapide creee directement depuis le tableau de l'agenda.",
  selectAll: 'Tout selectionner',
  clearAll: 'Tout deselectionner',
  fixedColumn: '(Fixe)',
  visibleColumns: (visibleCount, totalCount) => `${visibleCount} sur ${totalCount} colonnes visibles`,
  historyTaskMovedFromKanban: (actorName, targetStatusLabel) =>
    `${actorName} a deplace la tache vers ${targetStatusLabel.toLowerCase()} depuis le Kanban.`,
  historyTaskUpdatedFromEditor: 'Les details de la tache ont ete mis a jour depuis le formulaire.',
  historyTaskCreatedFromForm: (actorName) => `${actorName} a cree la tache depuis le formulaire complet.`,
  historyTaskCreatedFromQuickAction: (actorName) => `${actorName} a cree la tache depuis l'action rapide du tableau.`,
  historyTaskCompleted: (actorName) => `${actorName} a marque la tache comme terminee.`,
  deleteTaskConfirmation: (taskTitle) => `Supprimer "${taskTitle}" ?`,
  duplicateTaskTitle: (taskTitle) => `${taskTitle} copie`,
  historyTaskDuplicatedFrom: (actorName, folio) => `${actorName} a duplique la tache depuis ${folio}.`,
  historyTaskDuplicateCreated: (actorName) => `${actorName} a cree une copie de cette tache.`,
  historyFilesAdded: (actorName, fileCount) => `${actorName} a ajoute ${fileCount} fichier(s) a la tache.`,
  historyAuditRegistered: (weighting, comments) => `Ponderation definie a ${weighting}. Commentaire : ${comments}`,
  columnDescriptions: {
    folio: "Identifiant unique utilise pour suivre l'enregistrement dans l'agenda.",
    type: 'Categorie qui indique si le registre correspond a une tache ou a un processus.',
    unit: "Unite de l'entreprise responsable d'executer le travail.",
    business: "Secteur ou ligne d'activite auquel la tache appartient.",
    title: 'Nom principal utilise pour identifier la tache dans le flux.',
    description: 'Resume de l’objectif, de la portee ou du contexte de la tache.',
    createdAt: 'Date de creation du registre de la tache dans le systeme.',
    startDate: 'Date prevue pour commencer le travail.',
    dueDate: 'Date limite convenue pour terminer la tache.',
    status: "Etape actuelle d'avancement de la tache.",
    creator: 'Personne qui a cree le registre de la tache.',
    responsible: 'Collaborateur responsable de diriger ou executer la tache.',
    priority: 'Niveau d’urgence assigne a la tache.',
    attachments: 'Fichiers, preuves ou documents lies a la tache.',
    project: 'Projet ou initiative associe a la tache.',
    completion: "Pourcentage d'avancement declare jusqu'a present.",
    notes: 'Notes de travail, rappels ou contexte de suivi.',
    weighting: "Valeur de ponderation utilisee pour l'evaluation ou l'audit.",
    auditNotes: "Commentaires enregistres pendant l'audit de la tache.",
  },
  typeLabels: {
    'project-task': 'Tache projet',
    task: 'Tache',
    process: 'Processus',
  },
  statusLabels: {
    pending: 'En attente',
    'in-progress': 'En cours',
    completed: 'Completee',
    audited: 'Auditee',
    overdue: 'En retard',
  },
  priorityLabels: {
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
  },
  periodLabels: {
    'all-time': 'Toute la periode',
    'today-agenda': "Agenda d'aujourd'hui",
    'this-week': 'Cette semaine',
    'this-month': 'Ce mois-ci',
    overdue: 'En retard',
  },
};

const ptAgendaCopy: AgendaCopy = {
  sectionTitle: 'Agenda',
  sectionDescription: 'Gerencie sua agenda de tarefas',
  learningModeTitle: 'Modo de aprendizagem',
  learningModeDescription: 'Este guia explica para que serve a aba Agenda e como agir a partir dela.',
  learningModeAgendaTitle: 'Agenda de trabalho',
  learningModeAgendaDescription:
    'A agenda de trabalho e composta pelas tarefas programadas para o usuario. Ela ajuda a entender o que voce precisa iniciar, acompanhar, concluir ou auditar ao longo do dia.',
  learningModeCreateTaskTitle: 'Botao Criar tarefa',
  learningModeCreateTaskDescription:
    'Use Criar tarefa para registrar uma nova tarefa, definir datas e prioridade e delega-la ao colaborador correto sem sair da agenda.',
  configureColumnsTitle: 'Configurar colunas',
  configureColumnsDescription:
    'Selecione e ordene as colunas que deseja exibir na tabela. As alteracoes serao aplicadas somente quando voce salvar.',
  configureColumnsDragHint: 'Arraste as linhas para reordenar a tabela.',
  optionalColumn: 'Opcional',
  columns: 'Colunas',
  newTask: 'Nova tarefa',
  table: 'Tabela',
  kanban: 'Kanban',
  filters: 'Filtros',
  period: 'Periodo',
  unit: 'Unidade',
  business: 'Negocio',
  collaborator: 'Colaborador',
  status: 'Status',
  creator: 'Criador',
  responsible: 'Responsavel',
  priority: 'Prioridade',
  title: 'Titulo da tarefa',
  description: 'Descricao',
  creationDate: 'Data de criacao',
  startDate: 'Data de inicio',
  dueDate: 'Data de vencimento',
  type: 'Tipo',
  folio: 'Folio',
  attachments: 'Arquivos',
  project: 'Projeto',
  completion: '% Concluido',
  notes: 'Notas',
  weighting: 'Ponderacao',
  auditNotes: 'Notas de auditoria',
  actions: 'Acoes',
  all: 'Todos',
  emptyState: 'Nenhuma tarefa corresponde aos filtros atuais.',
  emptyKanban: 'Nenhuma tarefa neste status.',
  totalTasks: 'tarefas',
  pendingTasks: 'pendentes',
  inProgressTasks: 'em andamento',
  completedTasks: 'concluidas',
  auditedTasks: 'auditadas',
  completionRate: 'concluido',
  cancel: 'Cancelar',
  applyChanges: 'Aplicar alteracoes',
  createTaskTitle: 'Criar nova tarefa',
  editTaskTitle: 'Editar tarefa',
  createTaskDescription: 'Preencha os campos a seguir para criar uma nova tarefa no sistema.',
  editTaskDescription: 'Atualize as informacoes da tarefa selecionada.',
  requiredFieldsHint: 'Os campos marcados com * sao obrigatorios.',
  createTaskButton: 'Criar tarefa',
  saveChanges: 'Salvar alteracoes',
  currentUser: 'Usuario atual',
  noProject: 'Sem projeto',
  titlePlaceholder: 'Digite o titulo da tarefa',
  descriptionPlaceholder: 'Digite a descricao da tarefa',
  quickTaskTitle: 'Criar tarefa pela tabela',
  quickTaskDescription: 'Adicione uma tarefa rapida digitando apenas o titulo. O sistema registrara automaticamente o evento de criacao.',
  quickTaskPlaceholder: 'Digite o titulo da tarefa',
  createQuickTask: 'Criar tarefa rapida',
  filesModalTitle: 'Arquivos da tarefa',
  filesModalDescription: 'Veja os arquivos anexados a esta tarefa e adicione novos quando necessario.',
  addFiles: 'Adicionar arquivos',
  noFiles: 'Ainda nao ha arquivos anexados.',
  openFile: 'Abrir arquivo',
  filePreviewUnavailable: 'Visualizacao indisponivel',
  uploadedBy: 'Enviado por',
  uploadedAt: 'Enviado em',
  fileSize: 'Tamanho',
  reportModalTitle: 'Relatorio da tarefa',
  reportModalDescription: 'Revise a linha do tempo da tarefa e baixe o PDF com o historico completo de eventos.',
  noTaskDescription: 'Ainda nao ha uma descricao disponivel para esta tarefa.',
  taskDetailsModalTitle: 'Detalhes da tarefa',
  taskDetailsModalDescription: 'Revise as informacoes da tarefa, valide a responsabilidade e execute a proxima acao diretamente do quadro Kanban.',
  taskHistory: 'Historico da tarefa',
  noHistory: 'Ainda nao ha historico disponivel.',
  downloadPdf: 'Baixar PDF',
  auditModalTitle: 'Registrar auditoria',
  auditModalDescription: 'Adicione comentarios de auditoria e atribua a ponderacao da tarefa. Essas informacoes serao salvas no historico.',
  auditComments: 'Comentarios de auditoria',
  auditCommentsPlaceholder: 'Adicione as observacoes de auditoria para esta tarefa',
  saveAudit: 'Salvar auditoria',
  completeTaskLabel: 'Concluir tarefa',
  editTaskLabel: 'Editar tarefa',
  reportTaskLabel: 'Relatorio da tarefa',
  deleteTaskLabel: 'Excluir tarefa',
  duplicateTaskLabel: 'Duplicar tarefa',
  auditTaskLabel: 'Auditar tarefa',
  quickAddTask: 'Adicionar tarefa rapida',
  createdEventTitle: 'Tarefa criada',
  updatedEventTitle: 'Tarefa atualizada',
  completedEventTitle: 'Tarefa concluida',
  duplicateEventTitle: 'Tarefa duplicada',
  filesEventTitle: 'Arquivos adicionados',
  auditEventTitle: 'Auditoria registrada',
  addNotesPlaceholder: 'Adicionar notas',
  addAuditNotesPlaceholder: 'Adicionar notas de auditoria',
  noAuditNotes: 'Ainda nao foram registradas notas de auditoria.',
  quickTaskDefaultDescription: 'Tarefa rapida criada diretamente na tabela da agenda.',
  selectAll: 'Selecionar todas',
  clearAll: 'Desmarcar todas',
  fixedColumn: '(Fixa)',
  visibleColumns: (visibleCount, totalCount) => `${visibleCount} de ${totalCount} colunas visiveis`,
  historyTaskMovedFromKanban: (actorName, targetStatusLabel) =>
    `${actorName} moveu a tarefa para ${targetStatusLabel.toLowerCase()} no Kanban.`,
  historyTaskUpdatedFromEditor: 'Os detalhes da tarefa foram atualizados no editor de tarefas.',
  historyTaskCreatedFromForm: (actorName) => `${actorName} criou a tarefa pelo formulario completo.`,
  historyTaskCreatedFromQuickAction: (actorName) => `${actorName} criou a tarefa pela acao rapida da tabela.`,
  historyTaskCompleted: (actorName) => `${actorName} marcou a tarefa como concluida.`,
  deleteTaskConfirmation: (taskTitle) => `Excluir "${taskTitle}"?`,
  duplicateTaskTitle: (taskTitle) => `${taskTitle} copia`,
  historyTaskDuplicatedFrom: (actorName, folio) => `${actorName} duplicou a tarefa a partir de ${folio}.`,
  historyTaskDuplicateCreated: (actorName) => `${actorName} criou uma copia duplicada desta tarefa.`,
  historyFilesAdded: (actorName, fileCount) => `${actorName} adicionou ${fileCount} arquivo(s) a tarefa.`,
  historyAuditRegistered: (weighting, comments) => `Ponderacao definida em ${weighting}. Comentario: ${comments}`,
  columnDescriptions: {
    folio: 'Identificador unico da tarefa usado para acompanhar o registro na agenda.',
    type: 'Categoria que indica se o registro corresponde a uma tarefa ou a um processo.',
    unit: 'Unidade de negocio responsavel por executar o trabalho.',
    business: 'Area ou linha do negocio a que a tarefa pertence.',
    title: 'Nome principal usado para identificar a tarefa no fluxo.',
    description: 'Resumo do objetivo, escopo ou contexto da tarefa.',
    createdAt: 'Data em que o registro da tarefa foi criado no sistema.',
    startDate: 'Data programada para iniciar o trabalho.',
    dueDate: 'Prazo assumido para concluir a tarefa.',
    status: 'Etapa atual de progresso da tarefa.',
    creator: 'Pessoa que registrou a tarefa no sistema.',
    responsible: 'Colaborador designado para liderar ou executar a tarefa.',
    priority: 'Nivel de urgencia atribuido a tarefa.',
    attachments: 'Arquivos, evidencias ou documentos vinculados a tarefa.',
    project: 'Projeto ou iniciativa associada a tarefa.',
    completion: 'Percentual de progresso informado ate o momento.',
    notes: 'Notas de trabalho, lembretes ou contexto de acompanhamento.',
    weighting: 'Valor de ponderacao usado para avaliacao ou auditoria.',
    auditNotes: 'Comentarios registrados durante a auditoria da tarefa.',
  },
  typeLabels: {
    'project-task': 'Tarefa de projeto',
    task: 'Tarefa',
    process: 'Processo',
  },
  statusLabels: {
    pending: 'Pendente',
    'in-progress': 'Em andamento',
    completed: 'Concluida',
    audited: 'Auditada',
    overdue: 'Vencida',
  },
  priorityLabels: {
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
  },
  periodLabels: {
    'all-time': 'Todo o periodo',
    'today-agenda': 'Agenda do dia',
    'this-week': 'Esta semana',
    'this-month': 'Este mes',
    overdue: 'Vencidas',
  },
};

const koAgendaCopy: AgendaCopy = {
  sectionTitle: '일정',
  sectionDescription: '작업 일정을 관리하세요',
  learningModeTitle: '학습 모드',
  learningModeDescription: '이 안내는 Agenda 탭의 목적과 여기서 할 수 있는 작업을 설명합니다.',
  learningModeAgendaTitle: '업무 일정',
  learningModeAgendaDescription:
    '업무 일정은 사용자에게 예정된 작업으로 구성됩니다. 하루 동안 시작, 추적, 완료 또는 감사해야 할 작업을 파악하는 데 도움이 됩니다.',
  learningModeCreateTaskTitle: '작업 생성 버튼',
  learningModeCreateTaskDescription:
    '작업 생성 버튼을 사용하면 일정을 벗어나지 않고 새 작업을 등록하고 날짜와 우선순위를 지정하며 적절한 담당자에게 위임할 수 있습니다.',
  configureColumnsTitle: '열 구성',
  configureColumnsDescription: '표에 표시할 열을 선택하고 순서를 정하세요. 저장할 때만 변경 사항이 적용됩니다.',
  configureColumnsDragHint: '행을 끌어 표 레이아웃 순서를 바꾸세요.',
  optionalColumn: '선택',
  columns: '열',
  newTask: '새 작업',
  table: '표',
  kanban: '칸반',
  filters: '필터',
  period: '기간',
  unit: '부서',
  business: '비즈니스',
  collaborator: '협업자',
  status: '상태',
  creator: '생성자',
  responsible: '담당자',
  priority: '우선순위',
  title: '작업 제목',
  description: '설명',
  creationDate: '생성일',
  startDate: '시작일',
  dueDate: '마감일',
  type: '유형',
  folio: '코드',
  attachments: '파일',
  project: '프로젝트',
  completion: '% 완료',
  notes: '메모',
  weighting: '가중치',
  auditNotes: '감사 메모',
  actions: '작업',
  all: '전체',
  emptyState: '현재 필터와 일치하는 작업이 없습니다.',
  emptyKanban: '이 상태의 작업이 없습니다.',
  totalTasks: '작업',
  pendingTasks: '대기 중',
  inProgressTasks: '진행 중',
  completedTasks: '완료됨',
  auditedTasks: '감사됨',
  completionRate: '완료',
  cancel: '취소',
  applyChanges: '변경 적용',
  createTaskTitle: '새 작업 만들기',
  editTaskTitle: '작업 수정',
  createTaskDescription: '시스템에 새 작업을 만들기 위해 다음 필드를 입력하세요.',
  editTaskDescription: '선택한 작업 정보를 업데이트하세요.',
  requiredFieldsHint: '* 표시된 필드는 필수입니다.',
  createTaskButton: '작업 만들기',
  saveChanges: '변경 저장',
  currentUser: '현재 사용자',
  noProject: '프로젝트 없음',
  titlePlaceholder: '작업 제목 입력',
  descriptionPlaceholder: '작업 설명 입력',
  quickTaskTitle: '표에서 작업 만들기',
  quickTaskDescription: '제목만 입력해 빠른 작업을 추가하세요. 시스템이 생성 이벤트를 자동으로 기록합니다.',
  quickTaskPlaceholder: '작업 제목 입력',
  createQuickTask: '빠른 작업 만들기',
  filesModalTitle: '작업 파일',
  filesModalDescription: '이 작업에 연결된 파일을 확인하고 필요할 때 새 파일을 추가하세요.',
  addFiles: '파일 추가',
  noFiles: '아직 첨부된 파일이 없습니다.',
  openFile: '파일 열기',
  filePreviewUnavailable: '미리 보기 불가',
  uploadedBy: '업로드한 사람',
  uploadedAt: '업로드 일시',
  fileSize: '크기',
  reportModalTitle: '작업 보고서',
  reportModalDescription: '작업 타임라인을 검토하고 전체 이벤트 기록이 포함된 PDF를 다운로드하세요.',
  noTaskDescription: '이 작업에 대한 설명이 아직 없습니다.',
  taskDetailsModalTitle: '작업 상세',
  taskDetailsModalDescription: '작업 정보를 확인하고 담당을 검토한 뒤 Kanban 보드에서 바로 다음 작업을 실행하세요.',
  taskHistory: '작업 이력',
  noHistory: '아직 이력이 없습니다.',
  downloadPdf: 'PDF 다운로드',
  auditModalTitle: '감사 등록',
  auditModalDescription: '감사 의견을 추가하고 작업 가중치를 지정하세요. 이 정보는 작업 이력에 저장됩니다.',
  auditComments: '감사 의견',
  auditCommentsPlaceholder: '이 작업에 대한 감사 의견을 입력하세요',
  saveAudit: '감사 저장',
  completeTaskLabel: '작업 완료',
  editTaskLabel: '작업 수정',
  reportTaskLabel: '작업 보고서',
  deleteTaskLabel: '작업 삭제',
  duplicateTaskLabel: '작업 복제',
  auditTaskLabel: '작업 감사',
  quickAddTask: '빠른 작업 추가',
  createdEventTitle: '작업 생성됨',
  updatedEventTitle: '작업 업데이트됨',
  completedEventTitle: '작업 완료됨',
  duplicateEventTitle: '작업 복제됨',
  filesEventTitle: '파일 추가됨',
  auditEventTitle: '감사 등록됨',
  addNotesPlaceholder: '메모 추가',
  addAuditNotesPlaceholder: '감사 메모 추가',
  noAuditNotes: '아직 감사 메모가 등록되지 않았습니다.',
  quickTaskDefaultDescription: '일정 표에서 직접 생성된 빠른 작업입니다.',
  selectAll: '전체 선택',
  clearAll: '전체 해제',
  fixedColumn: '(고정)',
  visibleColumns: (visibleCount, totalCount) => `${totalCount}개 중 ${visibleCount}개 열 표시`,
  historyTaskMovedFromKanban: (actorName, targetStatusLabel) =>
    `${actorName}님이 Kanban에서 작업 상태를 ${targetStatusLabel.toLowerCase()}(으)로 변경했습니다.`,
  historyTaskUpdatedFromEditor: '작업 편집기에서 작업 정보가 업데이트되었습니다.',
  historyTaskCreatedFromForm: (actorName) => `${actorName}님이 전체 양식에서 작업을 생성했습니다.`,
  historyTaskCreatedFromQuickAction: (actorName) => `${actorName}님이 표의 빠른 생성 기능으로 작업을 만들었습니다.`,
  historyTaskCompleted: (actorName) => `${actorName}님이 작업을 완료로 표시했습니다.`,
  deleteTaskConfirmation: (taskTitle) => `"${taskTitle}" 작업을 삭제하시겠습니까?`,
  duplicateTaskTitle: (taskTitle) => `${taskTitle} 복사본`,
  historyTaskDuplicatedFrom: (actorName, folio) => `${actorName}님이 ${folio}에서 작업을 복제했습니다.`,
  historyTaskDuplicateCreated: (actorName) => `${actorName}님이 이 작업의 복제본을 만들었습니다.`,
  historyFilesAdded: (actorName, fileCount) => `${actorName}님이 작업에 파일 ${fileCount}개를 추가했습니다.`,
  historyAuditRegistered: (weighting, comments) => `가중치 ${weighting}로 설정됨. 의견: ${comments}`,
  columnDescriptions: {
    folio: '일정에서 레코드를 추적하는 고유 작업 식별자입니다.',
    type: '레코드가 작업인지 프로세스인지 보여주는 분류입니다.',
    unit: '업무를 수행하는 비즈니스 단위입니다.',
    business: '작업이 속한 비즈니스 영역 또는 라인입니다.',
    title: '흐름 안에서 작업을 식별하는 기본 이름입니다.',
    description: '작업 목표, 범위 또는 맥락에 대한 요약입니다.',
    createdAt: '시스템에서 작업 레코드가 생성된 날짜입니다.',
    startDate: '작업 시작 예정일입니다.',
    dueDate: '작업 완료 목표일입니다.',
    status: '작업의 현재 진행 단계입니다.',
    creator: '작업 레코드를 등록한 사람입니다.',
    responsible: '작업을 이끌거나 수행하도록 배정된 담당자입니다.',
    priority: '작업에 지정된 긴급 수준입니다.',
    attachments: '작업에 연결된 파일, 증빙 또는 문서입니다.',
    project: '작업과 연결된 프로젝트 또는 이니셔티브입니다.',
    completion: '현재 보고된 진행률입니다.',
    notes: '작업 메모, 리마인더 또는 후속 맥락입니다.',
    weighting: '평가 또는 감사를 위한 가중치 값입니다.',
    auditNotes: '작업 감사 과정에서 기록된 의견입니다.',
  },
  typeLabels: {
    'project-task': '프로젝트 작업',
    task: '작업',
    process: '프로세스',
  },
  statusLabels: {
    pending: '대기',
    'in-progress': '진행 중',
    completed: '완료',
    audited: '감사 완료',
    overdue: '기한 초과',
  },
  priorityLabels: {
    high: '높음',
    medium: '보통',
    low: '낮음',
  },
  periodLabels: {
    'all-time': '전체 기간',
    'today-agenda': '오늘 일정',
    'this-week': '이번 주',
    'this-month': '이번 달',
    overdue: '기한 초과',
  },
};

const zhAgendaCopy: AgendaCopy = {
  sectionTitle: '日程',
  sectionDescription: '管理你的任务日程',
  learningModeTitle: '学习模式',
  learningModeDescription: '此说明会解释 Agenda 标签页的用途，以及你可以在这里执行的操作。',
  learningModeAgendaTitle: '工作日程',
  learningModeAgendaDescription:
    '工作日程由为用户安排的任务组成，帮助你了解当天需要开始、跟进、完成或审计的工作。',
  learningModeCreateTaskTitle: '创建任务按钮',
  learningModeCreateTaskDescription:
    '使用创建任务可以直接在日程中登记新任务、分配日期和优先级，并将其委派给合适的协作者。',
  configureColumnsTitle: '配置列',
  configureColumnsDescription: '选择并排序你希望在表格中显示的列。只有保存后更改才会生效。',
  configureColumnsDragHint: '拖动行以重新排列表格布局。',
  optionalColumn: '可选',
  columns: '列',
  newTask: '新任务',
  table: '表格',
  kanban: '看板',
  filters: '筛选',
  period: '期间',
  unit: '单位',
  business: '业务',
  collaborator: '协作者',
  status: '状态',
  creator: '创建人',
  responsible: '负责人',
  priority: '优先级',
  title: '任务标题',
  description: '描述',
  creationDate: '创建日期',
  startDate: '开始日期',
  dueDate: '截止日期',
  type: '类型',
  folio: '编号',
  attachments: '文件',
  project: '项目',
  completion: '% 完成',
  notes: '备注',
  weighting: '权重',
  auditNotes: '审计备注',
  actions: '操作',
  all: '全部',
  emptyState: '没有符合当前筛选条件的任务。',
  emptyKanban: '此状态下没有任务。',
  totalTasks: '任务',
  pendingTasks: '待处理',
  inProgressTasks: '进行中',
  completedTasks: '已完成',
  auditedTasks: '已审计',
  completionRate: '已完成',
  cancel: '取消',
  applyChanges: '应用更改',
  createTaskTitle: '创建新任务',
  editTaskTitle: '编辑任务',
  createTaskDescription: '请填写以下字段以在系统中创建新任务。',
  editTaskDescription: '更新所选任务的信息。',
  requiredFieldsHint: '带 * 的字段为必填项。',
  createTaskButton: '创建任务',
  saveChanges: '保存更改',
  currentUser: '当前用户',
  noProject: '无项目',
  titlePlaceholder: '输入任务标题',
  descriptionPlaceholder: '输入任务描述',
  quickTaskTitle: '从表格创建任务',
  quickTaskDescription: '只输入任务标题即可添加快速任务。系统会自动记录创建事件。',
  quickTaskPlaceholder: '输入任务标题',
  createQuickTask: '创建快速任务',
  filesModalTitle: '任务文件',
  filesModalDescription: '查看此任务关联的文件，并在需要时添加新文件。',
  addFiles: '添加文件',
  noFiles: '暂时没有附件。',
  openFile: '打开文件',
  filePreviewUnavailable: '无法预览',
  uploadedBy: '上传人',
  uploadedAt: '上传时间',
  fileSize: '大小',
  reportModalTitle: '任务报告',
  reportModalDescription: '查看任务时间线，并下载包含完整事件历史的 PDF 报告。',
  noTaskDescription: '此任务暂时没有描述。',
  taskDetailsModalTitle: '任务详情',
  taskDetailsModalDescription: '查看任务信息，确认负责人，并直接从看板执行下一步操作。',
  taskHistory: '任务历史',
  noHistory: '暂时没有历史记录。',
  downloadPdf: '下载 PDF',
  auditModalTitle: '登记审计',
  auditModalDescription: '添加审计评论并分配任务权重。此信息将保存到任务历史中。',
  auditComments: '审计评论',
  auditCommentsPlaceholder: '为此任务添加审计说明',
  saveAudit: '保存审计',
  completeTaskLabel: '完成任务',
  editTaskLabel: '编辑任务',
  reportTaskLabel: '任务报告',
  deleteTaskLabel: '删除任务',
  duplicateTaskLabel: '复制任务',
  auditTaskLabel: '审计任务',
  quickAddTask: '快速添加任务',
  createdEventTitle: '任务已创建',
  updatedEventTitle: '任务已更新',
  completedEventTitle: '任务已完成',
  duplicateEventTitle: '任务已复制',
  filesEventTitle: '文件已添加',
  auditEventTitle: '审计已登记',
  addNotesPlaceholder: '添加备注',
  addAuditNotesPlaceholder: '添加审计备注',
  noAuditNotes: '尚未登记审计备注。',
  quickTaskDefaultDescription: '直接从日程表创建的快速任务。',
  selectAll: '全选',
  clearAll: '全部取消',
  fixedColumn: '(固定)',
  visibleColumns: (visibleCount, totalCount) => `${totalCount} 列中已显示 ${visibleCount} 列`,
  historyTaskMovedFromKanban: (actorName, targetStatusLabel) =>
    `${actorName} 从看板中将任务移动到${targetStatusLabel}状态。`,
  historyTaskUpdatedFromEditor: '任务详情已在任务编辑器中更新。',
  historyTaskCreatedFromForm: (actorName) => `${actorName} 通过完整表单创建了该任务。`,
  historyTaskCreatedFromQuickAction: (actorName) => `${actorName} 通过表格快速创建操作创建了该任务。`,
  historyTaskCompleted: (actorName) => `${actorName} 将任务标记为已完成。`,
  deleteTaskConfirmation: (taskTitle) => `要删除“${taskTitle}”吗？`,
  duplicateTaskTitle: (taskTitle) => `${taskTitle} 副本`,
  historyTaskDuplicatedFrom: (actorName, folio) => `${actorName} 从 ${folio} 复制了该任务。`,
  historyTaskDuplicateCreated: (actorName) => `${actorName} 创建了此任务的副本。`,
  historyFilesAdded: (actorName, fileCount) => `${actorName} 向任务添加了 ${fileCount} 个文件。`,
  historyAuditRegistered: (weighting, comments) => `权重设置为 ${weighting}。评论：${comments}`,
  columnDescriptions: {
    folio: '用于在日程中跟踪记录的唯一任务标识。',
    type: '用于说明该记录是任务还是流程的分类。',
    unit: '负责执行工作的业务单位。',
    business: '任务所属的业务领域或业务线。',
    title: '在流程中识别任务的主要名称。',
    description: '任务目标、范围或背景的摘要。',
    createdAt: '任务记录在系统中创建的日期。',
    startDate: '计划开始工作的日期。',
    dueDate: '承诺完成任务的截止日期。',
    status: '任务当前的进度阶段。',
    creator: '在系统中登记任务的人。',
    responsible: '被分配领导或执行任务的协作者。',
    priority: '分配给任务的紧急程度。',
    attachments: '与任务关联的文件、证据或文档。',
    project: '与任务相关的项目或计划。',
    completion: '截至目前报告的完成百分比。',
    notes: '工作备注、提醒或跟进背景。',
    weighting: '用于评估或审计的权重值。',
    auditNotes: '在任务审计过程中记录的评论。',
  },
  typeLabels: {
    'project-task': '项目任务',
    task: '任务',
    process: '流程',
  },
  statusLabels: {
    pending: '待处理',
    'in-progress': '进行中',
    completed: '已完成',
    audited: '已审计',
    overdue: '已逾期',
  },
  priorityLabels: {
    high: '高',
    medium: '中',
    low: '低',
  },
  periodLabels: {
    'all-time': '全部时间',
    'today-agenda': '今日日程',
    'this-week': '本周',
    'this-month': '本月',
    overdue: '逾期',
  },
};

const agendaCopy: Record<AgendaLanguageCode, AgendaCopy> = {
  'es-MX': esAgendaCopy,
  'es-CO': esAgendaCopy,
  'en-US': enAgendaCopy,
  'en-CA': enAgendaCopy,
  'fr-CA': frAgendaCopy,
  'pt-BR': ptAgendaCopy,
  'ko-CA': koAgendaCopy,
  'zh-CA': zhAgendaCopy,
};

const unitLabels: Record<string, Record<AgendaLanguageCode, string>> = {
  Warehouse: {
    'es-MX': 'Almacen',
    'es-CO': 'Almacen',
    'en-US': 'Warehouse',
    'en-CA': 'Warehouse',
    'fr-CA': 'Entrepot',
    'pt-BR': 'Armazem',
    'ko-CA': '창고',
    'zh-CA': '仓库',
  },
  Finance: {
    'es-MX': 'Finanzas',
    'es-CO': 'Finanzas',
    'en-US': 'Finance',
    'en-CA': 'Finance',
    'fr-CA': 'Finances',
    'pt-BR': 'Financas',
    'ko-CA': '재무',
    'zh-CA': '财务',
  },
  Sales: {
    'es-MX': 'Ventas',
    'es-CO': 'Ventas',
    'en-US': 'Sales',
    'en-CA': 'Sales',
    'fr-CA': 'Ventes',
    'pt-BR': 'Vendas',
    'ko-CA': '영업',
    'zh-CA': '销售',
  },
  'Human Resources': {
    'es-MX': 'Recursos Humanos',
    'es-CO': 'Recursos Humanos',
    'en-US': 'Human Resources',
    'en-CA': 'Human Resources',
    'fr-CA': 'Ressources humaines',
    'pt-BR': 'Recursos Humanos',
    'ko-CA': '인사',
    'zh-CA': '人力资源',
  },
  Technology: {
    'es-MX': 'Tecnologia',
    'es-CO': 'Tecnologia',
    'en-US': 'Technology',
    'en-CA': 'Technology',
    'fr-CA': 'Technologie',
    'pt-BR': 'Tecnologia',
    'ko-CA': '기술',
    'zh-CA': '技术',
  },
};

const businessLabels: Record<string, Record<AgendaLanguageCode, string>> = {
  Operations: {
    'es-MX': 'Operaciones',
    'es-CO': 'Operaciones',
    'en-US': 'Operations',
    'en-CA': 'Operations',
    'fr-CA': 'Operations',
    'pt-BR': 'Operacoes',
    'ko-CA': '운영',
    'zh-CA': '运营',
  },
  Administration: {
    'es-MX': 'Administracion',
    'es-CO': 'Administracion',
    'en-US': 'Administration',
    'en-CA': 'Administration',
    'fr-CA': 'Administration',
    'pt-BR': 'Administracao',
    'ko-CA': '관리',
    'zh-CA': '行政',
  },
  Commercial: {
    'es-MX': 'Comercial',
    'es-CO': 'Comercial',
    'en-US': 'Commercial',
    'en-CA': 'Commercial',
    'fr-CA': 'Commercial',
    'pt-BR': 'Comercial',
    'ko-CA': '상업',
    'zh-CA': '商业',
  },
  People: {
    'es-MX': 'Personas',
    'es-CO': 'Personas',
    'en-US': 'People',
    'en-CA': 'People',
    'fr-CA': 'Personnes',
    'pt-BR': 'Pessoas',
    'ko-CA': '인사',
    'zh-CA': '人员',
  },
};

const statusStyles: Record<ProcessTaskStatus, string> = {
  pending: 'border-amber-200 bg-amber-100 text-amber-800',
  'in-progress': 'border-blue-200 bg-blue-100 text-blue-800',
  completed: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  audited: 'border-violet-200 bg-violet-100 text-violet-800',
  overdue: 'border-red-200 bg-red-100 text-red-800',
};

const statusDots: Record<ProcessTaskStatus, string> = {
  pending: 'bg-amber-400',
  'in-progress': 'bg-blue-500',
  completed: 'bg-emerald-500',
  audited: 'bg-violet-500',
  overdue: 'bg-red-500',
};

const priorityStyles: Record<ProcessTaskPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const typeStyles: Record<ProcessTaskType, string> = {
  'project-task': 'bg-orange-100 text-orange-700',
  task: 'bg-blue-100 text-blue-700',
  process: 'bg-violet-100 text-violet-700',
};

const statusOrder: Record<ProcessTaskStatus, number> = {
  pending: 1,
  'in-progress': 2,
  completed: 3,
  audited: 4,
  overdue: 5,
};

const priorityOrder: Record<ProcessTaskPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

const typeOrder: Record<ProcessTaskType, number> = {
  'project-task': 1,
  task: 2,
  process: 3,
};

const kanbanOrder: ProcessTaskStatus[] = ['pending', 'in-progress', 'completed', 'audited', 'overdue'];

const seedUnits = Array.from(new Set(processAgendaItems.map((task) => task.unit)));
const seedBusinesses = Array.from(new Set(processAgendaItems.map((task) => task.business)));
const seedCollaborators = Array.from(
  new Set(processAgendaItems.flatMap((task) => [task.creator, task.responsible])),
);

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

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

function buildDefaultTaskForm(
  copy: AgendaCopy,
  unitOptions: string[],
  businessOptions: string[],
  collaboratorOptions: string[],
): TaskFormState {
  const today = getTodayIsoDate();

  return {
    unit: unitOptions[0] ?? '',
    business: businessOptions[0] ?? '',
    title: '',
    description: '',
    createdAt: today,
    startDate: today,
    dueDate: today,
    status: 'pending',
    creator: copy.currentUser,
    responsible: collaboratorOptions[0] ?? copy.currentUser,
    priority: 'medium',
  };
}

function formatKanbanDate(date: string, locale: string) {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T00:00:00`));

  return formatted.replace('.', '').toLowerCase();
}

function moveColumn(settings: ColumnSetting[], draggedId: ConfigurableColumnId, targetId: ConfigurableColumnId) {
  const draggedIndex = settings.findIndex((setting) => setting.id === draggedId);
  const targetIndex = settings.findIndex((setting) => setting.id === targetId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return settings;
  }

  const nextSettings = [...settings];
  const [draggedItem] = nextSettings.splice(draggedIndex, 1);
  nextSettings.splice(targetIndex, 0, draggedItem);
  return nextSettings;
}

function cloneColumnSettings(settings: ColumnSetting[]) {
  return settings.map((setting) => ({ ...setting }));
}

function buildFolio(tasks: ProcessAgendaItem[]) {
  const currentYear = new Date().getFullYear();
  const nextSequence =
    tasks.reduce((maxValue, task) => {
      const parsedSequence = Number(task.folio.split('-').pop() ?? '0');
      return Number.isFinite(parsedSequence) ? Math.max(maxValue, parsedSequence) : maxValue;
    }, 0) + 1;

  return `T-${currentYear}-${String(nextSequence).padStart(3, '0')}`;
}

function buildHistoryEntry(
  kind: ProcessTaskHistoryEntry['kind'],
  title: string,
  description: string,
  createdBy: string,
  createdAt = new Date().toISOString(),
): ProcessTaskHistoryEntry {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    description,
    createdAt,
    createdBy,
  };
}

function formatReadableDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatReadableDateTime(dateTime: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildTaskFile(file: File, uploadedBy: string): ProcessTaskFile {
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    sizeLabel: formatFileSize(file.size),
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    url: URL.createObjectURL(file),
  };
}

function buildMockFilePreview(file: ProcessTaskFile) {
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${file.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; background: #f8fafc; }
          .card { max-width: 720px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; }
          h1 { margin: 0 0 12px; font-size: 24px; }
          p { margin: 8px 0; line-height: 1.6; }
          .meta { color: #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${file.name}</h1>
          <p class="meta"><strong>Type:</strong> ${file.type || 'File'}</p>
          <p class="meta"><strong>Size:</strong> ${file.sizeLabel}</p>
          <p class="meta"><strong>Uploaded by:</strong> ${file.uploadedBy}</p>
          <p class="meta"><strong>Uploaded at:</strong> ${file.uploadedAt}</p>
          <p>This is a mock preview generated from the current frontend dataset.</p>
        </div>
      </body>
    </html>
  `;

  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}

function sortHistoryEntries(history: ProcessTaskHistoryEntry[]) {
  return [...history].sort(
    (leftEntry, rightEntry) =>
      new Date(rightEntry.createdAt).getTime() - new Date(leftEntry.createdAt).getTime(),
  );
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
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/80',
        toneClassName,
      )}
    >
      {icon}
    </button>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
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

function TypeBadge({
  type,
  label,
}: {
  type: ProcessTaskType;
  label: string;
}) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-sm font-semibold', typeStyles[type])}>
      {label}
    </span>
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

export default function Agenda({ learningModeActive = false }: AgendaProps) {
  const { currentLanguage } = useLanguage();
  const languageKey = (currentLanguage.code in agendaCopy ? currentLanguage.code : 'en-US') as AgendaLanguageCode;
  const copy = agendaCopy[languageKey];
  const locale = currentLanguage.code;
  const currentActorName = copy.currentUser;

  const [tasks, setTasks] = useState<ProcessAgendaItem[]>(processAgendaItems);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<AgendaFilters>(defaultFilters);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>(defaultColumnSettings);
  const [draftColumnSettings, setDraftColumnSettings] = useState<ColumnSetting[]>(defaultColumnSettings);
  const [draggedColumnId, setDraggedColumnId] = useState<ConfigurableColumnId | null>(null);
  const [sortState, setSortState] = useState<{ columnId: ConfigurableColumnId; direction: SortDirection }>({
    columnId: 'folio',
    direction: 'asc',
  });
  const [taskEditor, setTaskEditor] = useState<TaskEditorState>({
    open: false,
    mode: 'create',
    taskId: null,
  });
  const [filesDialog, setFilesDialog] = useState<FilesDialogState>({
    open: false,
    taskId: null,
  });
  const [reportDialog, setReportDialog] = useState<ReportDialogState>({
    open: false,
    taskId: null,
  });
  const [taskDetailsDialog, setTaskDetailsDialog] = useState<TaskDetailsDialogState>({
    open: false,
    taskId: null,
  });
  const [auditDialog, setAuditDialog] = useState<AuditDialogState>({
    open: false,
    taskId: null,
    comments: '',
    weighting: 3,
  });
  const [quickCreate, setQuickCreate] = useState<QuickCreateState>({
    open: false,
    title: '',
  });
  const [draggedKanbanTaskId, setDraggedKanbanTaskId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProcessTaskStatus | null>(null);

  const unitOptions = Array.from(new Set([...seedUnits, ...tasks.map((task) => task.unit)]));
  const businessOptions = Array.from(new Set([...seedBusinesses, ...tasks.map((task) => task.business)]));
  const collaboratorOptions = Array.from(
    new Set([...seedCollaborators, ...tasks.flatMap((task) => [task.creator, task.responsible])]),
  );

  const [taskForm, setTaskForm] = useState<TaskFormState>(() =>
    buildDefaultTaskForm(copy, unitOptions, businessOptions, collaboratorOptions),
  );

  const periodOptions: Option<PeriodFilter>[] = [
    { value: 'all-time', label: copy.periodLabels['all-time'] },
    { value: 'today-agenda', label: copy.periodLabels['today-agenda'] },
    { value: 'this-week', label: copy.periodLabels['this-week'] },
    { value: 'this-month', label: copy.periodLabels['this-month'] },
    { value: 'overdue', label: copy.periodLabels.overdue },
  ];

  const localizedUnitOptions: Option<string>[] = [
    { value: 'all', label: copy.all },
    ...unitOptions.map((option) => ({
      value: option,
      label: unitLabels[option]?.[languageKey] ?? option,
    })),
  ];

  const localizedBusinessOptions: Option<string>[] = [
    { value: 'all', label: copy.all },
    ...businessOptions.map((option) => ({
      value: option,
      label: businessLabels[option]?.[languageKey] ?? option,
    })),
  ];

  const localizedCollaboratorOptions: Option<string>[] = [
    { value: 'all', label: copy.all },
    ...collaboratorOptions.map((option) => ({
      value: option,
      label: option,
    })),
  ];

  const localizedStatusOptions: Option<'all' | ProcessTaskStatus>[] = [
    { value: 'all', label: copy.all },
    ...kanbanOrder.map((status) => ({
      value: status,
      label: copy.statusLabels[status],
    })),
  ];

  const localizedPriorityOptions: Option<ProcessTaskPriority>[] = [
    { value: 'high', label: copy.priorityLabels.high },
    { value: 'medium', label: copy.priorityLabels.medium },
    { value: 'low', label: copy.priorityLabels.low },
  ];

  const localizedWeightingOptions: Option<string>[] = [1, 2, 3, 4, 5].map((value) => ({
    value: String(value),
    label: String(value),
  }));

  const localizedResponsibleOptions: Option<string>[] = collaboratorOptions.map((option) => ({
    value: option,
    label: option,
  }));

  const referenceDate =
    tasks.length > 0
      ? tasks.reduce((latestDate, task) => {
          const taskDate = new Date(`${task.dueDate}T00:00:00`);
          return taskDate > latestDate ? taskDate : latestDate;
        }, new Date(`${tasks[0].dueDate}T00:00:00`))
      : new Date();

  const matchesPeriod = (task: ProcessAgendaItem) => {
    if (filters.period === 'all-time') {
      return true;
    }

    const dueDate = new Date(`${task.dueDate}T00:00:00`);
    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    if (filters.period === 'today-agenda') {
      const sameAgendaDay =
        dueDate.getFullYear() === referenceDate.getFullYear() &&
        dueDate.getMonth() === referenceDate.getMonth() &&
        dueDate.getDate() === referenceDate.getDate();

      return sameAgendaDay || task.status === 'pending';
    }

    if (filters.period === 'overdue') {
      return task.status === 'overdue' || dueDate < referenceDate;
    }

    if (filters.period === 'this-week') {
      return dueDate >= startOfWeek && dueDate <= endOfWeek;
    }

    return (
      dueDate.getMonth() === referenceDate.getMonth() &&
      dueDate.getFullYear() === referenceDate.getFullYear()
    );
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesUnit = filters.unit === 'all' || task.unit === filters.unit;
    const matchesBusiness = filters.business === 'all' || task.business === filters.business;
    const matchesCollaborator =
      filters.collaborator === 'all' || task.responsible === filters.collaborator;
    const matchesStatus = filters.status === 'all' || task.status === filters.status;

    return matchesPeriod(task) && matchesUnit && matchesBusiness && matchesCollaborator && matchesStatus;
  });

  const getSortValue = (task: ProcessAgendaItem, columnId: ConfigurableColumnId) => {
    switch (columnId) {
      case 'folio':
        return task.folio;
      case 'type':
        return typeOrder[task.type];
      case 'unit':
        return task.unit;
      case 'business':
        return task.business;
      case 'title':
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
        return statusOrder[task.status];
      case 'creator':
        return task.creator;
      case 'responsible':
        return task.responsible;
      case 'priority':
        return priorityOrder[task.priority];
      case 'attachments':
        return task.files.length;
      case 'project':
        return task.project;
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

  const sortedTasks = [...filteredTasks].sort((leftTask, rightTask) => {
    const leftValue = getSortValue(leftTask, sortState.columnId);
    const rightValue = getSortValue(rightTask, sortState.columnId);

    if (leftValue === rightValue) {
      return 0;
    }

    const comparison = leftValue > rightValue ? 1 : -1;
    return sortState.direction === 'asc' ? comparison : comparison * -1;
  });

  const visibleColumns = columnSettings.filter((setting) => setting.visible);
  const agendaStats = {
    total: filteredTasks.length,
    pending: filteredTasks.filter((task) => task.status === 'pending').length,
    inProgress: filteredTasks.filter((task) => task.status === 'in-progress').length,
    completed: filteredTasks.filter((task) => task.status === 'completed').length,
    audited: filteredTasks.filter((task) => task.status === 'audited').length,
    completionRate:
      filteredTasks.length > 0
        ? Math.round(
            filteredTasks.reduce((totalCompletion, task) => totalCompletion + task.completion, 0) /
              filteredTasks.length,
          )
        : 0,
  };
  const selectedVisibleTaskIds = sortedTasks.map((task) => task.id);
  const areAllVisibleTasksSelected =
    selectedVisibleTaskIds.length > 0 &&
    selectedVisibleTaskIds.every((taskId) => selectedTaskIds.includes(taskId));
  const filesTask = tasks.find((task) => task.id === filesDialog.taskId) ?? null;
  const reportTask = tasks.find((task) => task.id === reportDialog.taskId) ?? null;
  const taskDetailsTask = tasks.find((task) => task.id === taskDetailsDialog.taskId) ?? null;
  const auditTask = tasks.find((task) => task.id === auditDialog.taskId) ?? null;

  const setFilter = <T extends keyof AgendaFilters>(key: T, value: AgendaFilters[T]) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const updateTask = (taskId: number, updater: (task: ProcessAgendaItem) => ProcessAgendaItem) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? updater(task) : task)),
    );
  };

  const appendTaskHistory = (
    taskId: number,
    historyEntry: ProcessTaskHistoryEntry,
    extraUpdater?: (task: ProcessAgendaItem) => ProcessAgendaItem,
  ) => {
    updateTask(taskId, (task) => {
      const nextTask = extraUpdater ? extraUpdater(task) : task;
      return {
        ...nextTask,
        history: [historyEntry, ...nextTask.history],
      };
    });
  };

  const toggleAllVisibleTasks = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds((currentIds) =>
        Array.from(new Set([...currentIds, ...selectedVisibleTaskIds])),
      );
      return;
    }

    setSelectedTaskIds((currentIds) =>
      currentIds.filter((taskId) => !selectedVisibleTaskIds.includes(taskId)),
    );
  };

  const openCreateDialog = () => {
    setTaskForm(buildDefaultTaskForm(copy, unitOptions, businessOptions, collaboratorOptions));
    setTaskEditor({
      open: true,
      mode: 'create',
      taskId: null,
    });
  };

  const openEditDialog = (task: ProcessAgendaItem) => {
    setTaskForm({
      unit: task.unit,
      business: task.business,
      title: task.title,
      description: task.description,
      createdAt: task.createdAt,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: task.status,
      creator: task.creator,
      responsible: task.responsible,
      priority: task.priority,
    });
    setTaskEditor({
      open: true,
      mode: 'edit',
      taskId: task.id,
    });
  };

  const openFilesDialog = (taskId: number) => {
    setFilesDialog({
      open: true,
      taskId,
    });
  };

  const openReportDialog = (taskId: number) => {
    setReportDialog({
      open: true,
      taskId,
    });
  };

  const openTaskDetailsDialog = (taskId: number) => {
    setTaskDetailsDialog({
      open: true,
      taskId,
    });
  };

  const closeTaskDetailsDialog = () => {
    setTaskDetailsDialog({
      open: false,
      taskId: null,
    });
  };

  const openAuditDialog = (task: ProcessAgendaItem) => {
    setAuditDialog({
      open: true,
      taskId: task.id,
      comments: task.auditNotes,
      weighting: task.weighting,
    });
  };

  const handleKanbanDragStart = (taskId: number) => {
    setDraggedKanbanTaskId(taskId);
  };

  const handleKanbanDragEnd = () => {
    setDraggedKanbanTaskId(null);
    setDragOverStatus(null);
  };

  const handleKanbanDrop = (targetStatus: ProcessTaskStatus) => {
    if (draggedKanbanTaskId === null) {
      return;
    }

    const draggedTask = tasks.find((task) => task.id === draggedKanbanTaskId);
    setDraggedKanbanTaskId(null);
    setDragOverStatus(null);

    if (!draggedTask || draggedTask.status === targetStatus) {
      return;
    }

    if (targetStatus === 'audited') {
      openAuditDialog(draggedTask);
      return;
    }

    appendTaskHistory(
      draggedTask.id,
      buildHistoryEntry(
        'updated',
        copy.updatedEventTitle,
        copy.historyTaskMovedFromKanban(currentActorName, copy.statusLabels[targetStatus]),
        currentActorName,
      ),
      (currentTask) => ({
        ...currentTask,
        status: targetStatus,
        completion: resolveCompletionFromStatus(currentTask, targetStatus),
      }),
    );
  };

  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);

  const updateTaskForm = <T extends keyof TaskFormState>(key: T, value: TaskFormState[T]) => {
    setTaskForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = taskForm.title.trim();

    if (!normalizedTitle) {
      return;
    }

    const normalizedCreatedAt = taskForm.createdAt || getTodayIsoDate();
    const normalizedStartDate = taskForm.startDate || normalizedCreatedAt;
    const normalizedDueDate = taskForm.dueDate || normalizedStartDate;
    const normalizedValues = {
      unit: taskForm.unit || unitOptions[0] || '',
      business: taskForm.business || businessOptions[0] || '',
      title: normalizedTitle,
      description: taskForm.description.trim(),
      createdAt: normalizedCreatedAt,
      startDate: normalizedStartDate,
      dueDate: normalizedDueDate,
      status: taskForm.status,
      creator: taskForm.creator || copy.currentUser,
      responsible: taskForm.responsible || collaboratorOptions[0] || copy.currentUser,
      priority: taskForm.priority,
    };

    if (taskEditor.mode === 'edit' && taskEditor.taskId !== null) {
      appendTaskHistory(
        taskEditor.taskId,
        buildHistoryEntry(
          'updated',
          copy.updatedEventTitle,
          copy.historyTaskUpdatedFromEditor,
          currentActorName,
        ),
        (task) => ({
          ...task,
          unit: normalizedValues.unit,
          business: normalizedValues.business,
          title: normalizedValues.title,
          description: normalizedValues.description,
          createdAt: normalizedValues.createdAt,
          startDate: normalizedValues.startDate,
          dueDate: normalizedValues.dueDate,
          status: normalizedValues.status,
          creator: normalizedValues.creator,
          responsible: normalizedValues.responsible,
          priority: normalizedValues.priority,
          completion: normalizedValues.status === 'completed' ? 100 : task.completion,
        }),
      );
    } else {
      const newTask: ProcessAgendaItem = {
        id: tasks.reduce((maxValue, task) => Math.max(maxValue, task.id), 0) + 1,
        folio: buildFolio(tasks),
        type: 'task',
        unit: normalizedValues.unit,
        business: normalizedValues.business,
        title: normalizedValues.title,
        description: normalizedValues.description,
        createdAt: normalizedValues.createdAt,
        startDate: normalizedValues.startDate,
        dueDate: normalizedValues.dueDate,
        status: normalizedValues.status,
        creator: normalizedValues.creator,
        responsible: normalizedValues.responsible,
        priority: normalizedValues.priority,
        attachments: 0,
        projectId: null,
        project: copy.noProject,
        completion: normalizedValues.status === 'completed' ? 100 : 0,
        notes: '',
        weighting: 3,
        audited: false,
        auditNotes: '',
        files: [],
        history: [
          buildHistoryEntry(
            'created',
            copy.createdEventTitle,
            copy.historyTaskCreatedFromForm(currentActorName),
            currentActorName,
            `${normalizedValues.createdAt}T09:00:00`,
          ),
        ],
      };

      setTasks((currentTasks) => [newTask, ...currentTasks]);
    }

    setTaskEditor({
      open: false,
      mode: 'create',
      taskId: null,
    });
  };

  const handleQuickTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!quickCreate.title.trim()) {
      return;
    }

    const now = new Date();
    const createdAt = now.toISOString().slice(0, 10);
    const newTask: ProcessAgendaItem = {
      id: tasks.reduce((maxValue, task) => Math.max(maxValue, task.id), 0) + 1,
      folio: buildFolio(tasks),
      type: 'task',
      unit: unitOptions[0] ?? '',
      business: businessOptions[0] ?? '',
      title: quickCreate.title.trim(),
      description: copy.quickTaskDefaultDescription,
      createdAt,
      startDate: createdAt,
      dueDate: createdAt,
      status: 'pending',
      creator: currentActorName,
      responsible: collaboratorOptions[0] ?? currentActorName,
      priority: 'medium',
      attachments: 0,
      projectId: null,
      project: copy.noProject,
      completion: 0,
      notes: '',
      weighting: 3,
      audited: false,
      auditNotes: '',
      files: [],
      history: [
        buildHistoryEntry(
          'created',
          copy.createdEventTitle,
          copy.historyTaskCreatedFromQuickAction(currentActorName),
          currentActorName,
          now.toISOString(),
        ),
      ],
    };

    setTasks((currentTasks) => [newTask, ...currentTasks]);
    setQuickCreate({
      open: false,
      title: '',
    });
  };

  const handleColumnVisibility = (columnId: ConfigurableColumnId, visible: boolean) => {
    setDraftColumnSettings((currentSettings) =>
      currentSettings.map((setting) =>
        setting.id === columnId && !setting.locked ? { ...setting, visible } : setting,
      ),
    );
  };

  const handleSelectAllColumns = () => {
    setDraftColumnSettings((currentSettings) =>
      currentSettings.map((setting) => ({
        ...setting,
        visible: true,
      })),
    );
  };

  const handleClearColumns = () => {
    setDraftColumnSettings((currentSettings) =>
      currentSettings.map((setting) =>
        setting.locked ? setting : { ...setting, visible: false },
      ),
    );
  };

  const handleColumnDrop = (targetColumnId: ConfigurableColumnId) => {
    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      return;
    }

    setDraftColumnSettings((currentSettings) => moveColumn(currentSettings, draggedColumnId, targetColumnId));
    setDraggedColumnId(null);
  };

  const openColumnsDialog = () => {
    setDraftColumnSettings(cloneColumnSettings(columnSettings));
    setDraggedColumnId(null);
    setIsColumnsDialogOpen(true);
  };

  const handleColumnsDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDraggedColumnId(null);
      setDraftColumnSettings(cloneColumnSettings(columnSettings));
    }

    setIsColumnsDialogOpen(open);
  };

  const applyColumnSettings = () => {
    setColumnSettings(cloneColumnSettings(draftColumnSettings));
    setDraggedColumnId(null);
    setIsColumnsDialogOpen(false);
  };

  const columnLabels: Record<ConfigurableColumnId, string> = {
    folio: copy.folio,
    type: copy.type,
    unit: copy.unit,
    business: copy.business,
    title: copy.title,
    description: copy.description,
    createdAt: copy.creationDate,
    startDate: copy.startDate,
    dueDate: copy.dueDate,
    status: copy.status,
    creator: copy.creator,
    responsible: copy.responsible,
    priority: copy.priority,
    attachments: copy.attachments,
        project: copy.project,
        completion: copy.completion,
        notes: copy.notes,
        weighting: copy.weighting,
        auditNotes: copy.auditNotes,
  };

  const columnDescriptions = copy.columnDescriptions;

  const handleSort = (columnId: ConfigurableColumnId) => {
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

  const handleCompleteTask = (task: ProcessAgendaItem) => {
    if (task.status === 'completed' && task.completion === 100) {
      return;
    }

    appendTaskHistory(
      task.id,
      buildHistoryEntry(
        'completed',
        copy.completedEventTitle,
        copy.historyTaskCompleted(currentActorName),
        currentActorName,
      ),
      (currentTask) => ({
        ...currentTask,
        status: 'completed',
        completion: 100,
      }),
    );
  };

  const handleDeleteTask = (task: ProcessAgendaItem) => {
    const confirmed = window.confirm(copy.deleteTaskConfirmation(task.title));

    if (!confirmed) {
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id));
    setSelectedTaskIds((currentIds) => currentIds.filter((taskId) => taskId !== task.id));
    if (filesDialog.taskId === task.id) {
      setFilesDialog({ open: false, taskId: null });
    }
    if (reportDialog.taskId === task.id) {
      setReportDialog({ open: false, taskId: null });
    }
    if (auditDialog.taskId === task.id) {
      setAuditDialog({ open: false, taskId: null, comments: '', weighting: 3 });
    }
  };

  const handleDuplicateTask = (task: ProcessAgendaItem) => {
    const now = new Date().toISOString();
    const duplicatedTask: ProcessAgendaItem = {
      ...task,
      id: tasks.reduce((maxValue, currentTask) => Math.max(maxValue, currentTask.id), 0) + 1,
      folio: buildFolio(tasks),
      title: copy.duplicateTaskTitle(task.title),
      createdAt: now.slice(0, 10),
      startDate: now.slice(0, 10),
      dueDate: task.dueDate,
      status: 'pending',
      completion: 0,
      notes: '',
      audited: false,
      auditNotes: '',
      history: [
        buildHistoryEntry(
          'duplicated',
          copy.duplicateEventTitle,
          copy.historyTaskDuplicatedFrom(currentActorName, task.folio),
          currentActorName,
          now,
        ),
      ],
      files: task.files.map((file) => ({
        ...file,
        id: `${file.id}-copy-${Date.now()}`,
      })),
      attachments: task.files.length,
    };

    setTasks((currentTasks) => [duplicatedTask, ...currentTasks]);
    appendTaskHistory(
      task.id,
      buildHistoryEntry(
        'duplicated',
        copy.duplicateEventTitle,
        copy.historyTaskDuplicateCreated(currentActorName),
        currentActorName,
        now,
      ),
    );
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>, task: ProcessAgendaItem | null) => {
    const fileList = event.target.files;

    if (!task || !fileList || fileList.length === 0) {
      return;
    }

    const nextFiles = Array.from(fileList).map((file) => buildTaskFile(file, currentActorName));
    appendTaskHistory(
      task.id,
      buildHistoryEntry(
        'file-added',
        copy.filesEventTitle,
        copy.historyFilesAdded(currentActorName, nextFiles.length),
        currentActorName,
      ),
      (currentTask) => {
        const files = [...currentTask.files, ...nextFiles];
        return {
          ...currentTask,
          files,
          attachments: files.length,
        };
      },
    );

    event.target.value = '';
  };

  const handleOpenTaskFile = (file: ProcessTaskFile) => {
    const targetUrl = file.url ?? buildMockFilePreview(file);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAuditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auditTask || !auditDialog.comments.trim()) {
      return;
    }

    appendTaskHistory(
      auditTask.id,
      buildHistoryEntry(
        'audit',
        copy.auditEventTitle,
        copy.historyAuditRegistered(auditDialog.weighting, auditDialog.comments.trim()),
        currentActorName,
      ),
      (currentTask) => ({
        ...currentTask,
        status: 'audited',
        weighting: auditDialog.weighting,
        audited: true,
        auditNotes: auditDialog.comments.trim(),
      }),
    );

    setAuditDialog({
      open: false,
      taskId: null,
      comments: '',
      weighting: 3,
    });
  };

  const handleDownloadTaskReport = (task: ProcessAgendaItem) => {
    const doc = new jsPDF();
    const sortedHistory = sortHistoryEntries(task.history).reverse();

    doc.setFontSize(18);
    doc.text(`${copy.reportModalTitle} - ${task.folio}`, 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(90, 98, 112);
    doc.text(task.title, 14, 26);
    doc.text(`${copy.creationDate}: ${formatReadableDate(task.createdAt, locale)}`, 14, 33);

    autoTable(doc, {
      startY: 40,
      theme: 'grid',
      head: [[copy.folio, copy.status, copy.responsible, copy.priority, copy.project, copy.completion]],
      body: [[
        task.folio,
        copy.statusLabels[task.status],
        task.responsible,
        copy.priorityLabels[task.priority],
        task.project,
        `${task.completion}%`,
      ]],
      styles: {
        fontSize: 10,
      },
      headStyles: {
        fillColor: [235, 165, 52],
      },
    });

    autoTable(doc, {
      startY: ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40) + 10,
      theme: 'striped',
      head: [[copy.taskHistory, copy.description, copy.uploadedBy, copy.uploadedAt]],
      body: sortedHistory.map((entry) => [
        entry.title,
        entry.description,
        entry.createdBy,
        formatReadableDateTime(entry.createdAt, locale),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [30, 41, 59],
      },
    });

    autoTable(doc, {
      startY: ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40) + 10,
      theme: 'plain',
      head: [[copy.attachments, copy.fileSize, copy.uploadedBy, copy.uploadedAt]],
      body: task.files.map((file) => [
        file.name,
        file.sizeLabel,
        file.uploadedBy,
        formatReadableDateTime(file.uploadedAt, locale),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [235, 165, 52],
      },
    });

    doc.save(`${task.folio.toLowerCase()}-task-report.pdf`);
  };

  const isTaskFormValid = Boolean(taskForm.title.trim());

  const renderKanbanActionButtons = (
    task: ProcessAgendaItem,
    options?: {
      compact?: boolean;
      stopPropagation?: boolean;
      onAfterAction?: () => void;
    },
  ) => {
    const compact = options?.compact ?? false;

    const wrapAction =
      (action: () => void) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (options?.stopPropagation) {
          event.stopPropagation();
        }

        options?.onAfterAction?.();
        action();
      };

    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          compact ? '' : 'rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3',
        )}
      >
        <TableActionButton
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label={copy.completeTaskLabel}
          onClick={wrapAction(() => handleCompleteTask(task))}
          toneClassName="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        />
        <TableActionButton
          icon={<FileText className="h-4 w-4 text-slate-700" />}
          label={copy.reportTaskLabel}
          onClick={wrapAction(() => openReportDialog(task.id))}
          toneClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        />
        <TableActionButton
          icon={<ShieldCheck className="h-4 w-4 text-violet-600" />}
          label={copy.auditTaskLabel}
          onClick={wrapAction(() => openAuditDialog(task))}
          toneClassName="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
        />
        <TableActionButton
          icon={<Pencil className="h-4 w-4 text-amber-600" />}
          label={copy.editTaskLabel}
          onClick={wrapAction(() => openEditDialog(task))}
          toneClassName="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
        />
        <TableActionButton
          icon={<Copy className="h-4 w-4 text-blue-600" />}
          label={copy.duplicateTaskLabel}
          onClick={wrapAction(() => handleDuplicateTask(task))}
          toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
        />
        <TableActionButton
          icon={<Trash2 className="h-4 w-4 text-red-600" />}
          label={copy.deleteTaskLabel}
          onClick={wrapAction(() => handleDeleteTask(task))}
          toneClassName="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
        />
      </div>
    );
  };

  const renderCell = (task: ProcessAgendaItem, columnId: ConfigurableColumnId) => {
    switch (columnId) {
      case 'folio':
        return <span className="text-base font-semibold text-slate-900 dark:text-white">{task.folio}</span>;
      case 'type':
        return <TypeBadge type={task.type} label={copy.typeLabels[task.type]} />;
      case 'unit':
        return (
          <InlineSelectField
            value={task.unit}
            options={unitOptions.map((option) => ({
              value: option,
              label: unitLabels[option]?.[languageKey] ?? option,
            }))}
            onChange={(nextValue) => updateTask(task.id, (currentTask) => ({ ...currentTask, unit: nextValue }))}
          />
        );
      case 'business':
        return (
          <InlineSelectField
            value={task.business}
            options={businessOptions.map((option) => ({
              value: option,
              label: businessLabels[option]?.[languageKey] ?? option,
            }))}
            onChange={(nextValue) =>
              updateTask(task.id, (currentTask) => ({ ...currentTask, business: nextValue }))
            }
          />
        );
      case 'title':
        return (
          <InlineTextCell
            value={task.title}
            onChange={(nextValue) =>
              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                title: nextValue,
              }))
            }
            placeholder={copy.titlePlaceholder}
            className="font-semibold text-slate-900 dark:text-white"
          />
        );
      case 'description':
        return (
          <Textarea
            value={task.description}
            onChange={(event) =>
              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                description: event.target.value,
              }))
            }
            placeholder={copy.descriptionPlaceholder}
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
              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                startDate: nextValue,
              }))
            }
          />
        );
      case 'dueDate':
        return (
          <InlineDateCell
            value={task.dueDate}
            onChange={(nextValue) =>
              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                dueDate: nextValue,
              }))
            }
          />
        );
      case 'status':
        return (
          <InlineSelectField
            value={task.status}
            options={kanbanOrder.map((option) => ({
              value: option,
              label: copy.statusLabels[option],
            }))}
            onChange={(nextValue) => {
              if (nextValue === 'audited') {
                openAuditDialog(task);
                return;
              }

              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                status: nextValue,
                completion: nextValue === 'completed' ? 100 : currentTask.completion,
              }));
            }}
            className={cn('min-w-[136px] border', statusStyles[task.status])}
            renderValue={(value) => <span className="font-semibold">{copy.statusLabels[value]}</span>}
          />
        );
      case 'creator':
        return (
          <div className="min-w-[170px] whitespace-normal text-base leading-snug text-slate-900 dark:text-white">
            {task.creator}
          </div>
        );
      case 'responsible':
        return (
          <InlineSelectField
            value={task.responsible}
            options={localizedResponsibleOptions}
            onChange={(nextValue) =>
              updateTask(task.id, (currentTask) => ({ ...currentTask, responsible: nextValue }))
            }
          />
        );
      case 'priority':
        return (
          <InlineSelectField
            value={task.priority}
            options={localizedPriorityOptions}
            onChange={(nextValue) =>
              updateTask(task.id, (currentTask) => ({ ...currentTask, priority: nextValue }))
            }
            className={cn('min-w-[136px] border', priorityStyles[task.priority])}
            renderValue={(value) => <span className="font-semibold">{copy.priorityLabels[value]}</span>}
          />
        );
      case 'attachments':
        return (
          <button
            type="button"
            onClick={() => openFilesDialog(task.id)}
            className="inline-flex min-w-[112px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            <FolderOpen className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <span>{task.files.length}</span>
          </button>
        );
      case 'project':
        return (
          <InlineTextCell
            value={task.project}
            onChange={(nextValue) =>
              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                project: nextValue,
              }))
            }
            placeholder={copy.noProject}
          />
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
                updateTask(task.id, (currentTask) => ({
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
                updateTask(task.id, (currentTask) => ({
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
              updateTask(task.id, (currentTask) => ({
                ...currentTask,
                notes: event.target.value,
              }))
            }
            placeholder={copy.addNotesPlaceholder}
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
            onClick={() => openAuditDialog(task)}
            className="min-w-[260px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm leading-relaxed text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            {task.auditNotes || copy.addAuditNotesPlaceholder}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {learningModeActive && (
        <section className="mb-5 rounded-[24px] border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50/80 p-5 shadow-sm dark:border-blue-900/60 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                {copy.learningModeTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.learningModeDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {copy.learningModeAgendaTitle}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {copy.learningModeAgendaDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {copy.learningModeCreateTaskTitle}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {copy.learningModeCreateTaskDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <CalendarDays className="h-6 w-6 text-[rgb(235,165,52)]" />
              {copy.sectionTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{copy.sectionDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onClick={openColumnsDialog}
            >
              <Columns3 className="h-4 w-4" />
              {copy.columns}
            </Button>
            <Button className={cn('h-11 gap-2 rounded-xl px-4', accentButtonClass)} onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              {copy.newTask}
            </Button>
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
            viewMode === 'table'
              ? 'border-slate-800 bg-[rgb(235,165,52)] text-white shadow-sm dark:border-[rgb(235,165,52)]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
          )}
        >
          <LayoutList className="h-4 w-4" />
          {copy.table}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('kanban')}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
            viewMode === 'kanban'
              ? 'border-slate-800 bg-[rgb(235,165,52)] text-white shadow-sm dark:border-[rgb(235,165,52)]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
          )}
        >
          <KanbanSquare className="h-4 w-4" />
          {copy.kanban}
        </button>
      </div>

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{copy.filters}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label={copy.period}
            value={filters.period}
            onChange={(value) => setFilter('period', value)}
            options={periodOptions}
          />
          <FilterSelect
            label={copy.unit}
            value={filters.unit}
            onChange={(value) => setFilter('unit', value)}
            options={localizedUnitOptions}
          />
          <FilterSelect
            label={copy.business}
            value={filters.business}
            onChange={(value) => setFilter('business', value)}
            options={localizedBusinessOptions}
          />
          <FilterSelect
            label={copy.collaborator}
            value={filters.collaborator}
            onChange={(value) => setFilter('collaborator', value)}
            options={localizedCollaboratorOptions}
          />
          <FilterSelect
            label={copy.status}
            value={filters.status}
            onChange={(value) => setFilter('status', value)}
            options={localizedStatusOptions}
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          📋 <span className="font-medium text-slate-900 dark:text-white">{agendaStats.total}</span> {copy.totalTasks}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ⏳ <span className="font-medium text-amber-600">{agendaStats.pending}</span> {copy.pendingTasks}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ↻ <span className="font-medium text-blue-600">{agendaStats.inProgress}</span> {copy.inProgressTasks}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ✓ <span className="font-medium text-emerald-600">{agendaStats.completed}</span> {copy.completedTasks}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          🔍 <span className="font-medium text-violet-600">{agendaStats.audited}</span> {copy.auditedTasks}
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          📈 <span className="font-medium text-[rgb(235,165,52)]">{agendaStats.completionRate}%</span> {copy.completionRate}
        </span>
      </div>

      {viewMode === 'table' ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setQuickCreate({ open: true, title: '' })}
            className="absolute right-4 top-4 z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgb(235,165,52)] bg-white text-[rgb(235,165,52)] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 xl:-right-6 xl:top-1/2 xl:-translate-y-1/2"
            title={copy.quickAddTask}
            aria-label={copy.quickAddTask}
          >
            <PlusCircle className="h-5 w-5" />
          </button>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Table className="min-w-[1800px]">
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead className="w-14 px-5 py-6">
                  <Checkbox
                    checked={areAllVisibleTasksSelected}
                    onCheckedChange={(checked) => toggleAllVisibleTasks(Boolean(checked))}
                  />
                </TableHead>
                {visibleColumns.map((column) => (
                  <TableHead key={column.id} className="px-5 py-6">
                    <button
                      type="button"
                      onClick={() => handleSort(column.id)}
                    className="flex items-center gap-2 text-left text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400"
                  >
                      <span>{columnLabels[column.id]}</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="px-5 py-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {copy.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow
                  key={task.id}
                  data-state={selectedTaskIds.includes(task.id) ? 'selected' : undefined}
                  className="border-slate-200 dark:border-slate-700"
                >
                  <TableCell className="px-5 py-6">
                    <Checkbox
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={(checked) =>
                        setSelectedTaskIds((currentIds) =>
                          checked
                            ? Array.from(new Set([...currentIds, task.id]))
                            : currentIds.filter((taskId) => taskId !== task.id),
                        )
                      }
                    />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={`${task.id}-${column.id}`}
                      className={cn(
                        'px-5 py-6 align-middle',
                        column.id === 'description' || column.id === 'title' || column.id === 'project'
                          ? 'whitespace-normal'
                          : '',
                      )}
                    >
                      {renderCell(task, column.id)}
                    </TableCell>
                  ))}
                  <TableCell className="px-5 py-6">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                      <TableActionButton
                        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        label={copy.completeTaskLabel}
                        onClick={() => handleCompleteTask(task)}
                        toneClassName="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      />
                      <TableActionButton
                        icon={<FileText className="h-4 w-4 text-slate-700" />}
                        label={copy.reportTaskLabel}
                        onClick={() => openReportDialog(task.id)}
                        toneClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      />
                      <TableActionButton
                        icon={<ShieldCheck className="h-4 w-4 text-violet-600" />}
                        label={copy.auditTaskLabel}
                        onClick={() => openAuditDialog(task)}
                        toneClassName="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      />
                      <TableActionButton
                        icon={<Pencil className="h-4 w-4 text-amber-600" />}
                        label={copy.editTaskLabel}
                        onClick={() => openEditDialog(task)}
                        toneClassName="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      />
                      <TableActionButton
                        icon={<Copy className="h-4 w-4 text-blue-600" />}
                        label={copy.duplicateTaskLabel}
                        onClick={() => handleDuplicateTask(task)}
                        toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      />
                      <TableActionButton
                        icon={<Trash2 className="h-4 w-4 text-red-600" />}
                        label={copy.deleteTaskLabel}
                        onClick={() => handleDeleteTask(task)}
                        toneClassName="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 2} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                    {copy.emptyState}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          {kanbanOrder.map((status) => {
            const tasksByStatus = sortedTasks.filter((task) => task.status === status);

            return (
              <div
                key={status}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggedKanbanTaskId !== null) {
                    setDragOverStatus(status);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleKanbanDrop(status);
                }}
                className={cn(
                  'rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800',
                  draggedKanbanTaskId !== null && dragOverStatus === status && 'border-[rgb(235,165,52)] bg-amber-50/40 dark:bg-amber-500/10',
                )}
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className={cn('h-4 w-4 rounded-full', statusDots[status])} />
                  <h3 className="text-[1.35rem] font-bold text-slate-900 dark:text-white">{copy.statusLabels[status]}</h3>
                  <span className="text-sm text-slate-400 dark:text-slate-500">({tasksByStatus.length})</span>
                </div>

                <div className="space-y-4">
                  {tasksByStatus.map((task) => (
                    <article
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        handleKanbanDragStart(task.id);
                      }}
                      onDragEnd={handleKanbanDragEnd}
                      onClick={() => openTaskDetailsDialog(task.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openTaskDetailsDialog(task.id);
                        }
                      }}
                      className="cursor-grab rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-600"
                    >
                      <div className="mb-3">
                        <h4 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">{task.title}</h4>
                      </div>

                      <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <UserRound className="h-4 w-4" />
                        <span>{task.responsible}</span>
                      </div>

                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className={cn('inline-flex rounded-full border px-3 py-1 text-sm font-semibold', priorityStyles[task.priority])}>
                          {copy.priorityLabels[task.priority]}
                        </span>
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatKanbanDate(task.dueDate, locale)}
                        </span>
                      </div>

                      {renderKanbanActionButtons(task, {
                        compact: true,
                        stopPropagation: true,
                      })}
                    </article>
                  ))}

                  {tasksByStatus.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                      {copy.emptyKanban}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Dialog
        open={taskDetailsDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            closeTaskDetailsDialog();
            return;
          }

          setTaskDetailsDialog((currentState) => ({ ...currentState, open }));
        }}
      >
        <DialogContent className="!flex h-[min(88vh,880px)] max-h-[calc(100vh-3rem)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {copy.taskDetailsModalTitle}
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

          {taskDetailsTask && (
            <>
              <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col gap-3">
                  <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {copy.taskDetailsModalDescription}
                  </DialogDescription>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {taskDetailsTask.folio}
                    </span>
                    <span className={cn('inline-flex items-center rounded-full border px-3.5 py-1.5 font-semibold', statusStyles[taskDetailsTask.status])}>
                      {copy.statusLabels[taskDetailsTask.status]}
                    </span>
                    <span className={cn('inline-flex items-center rounded-full border px-3.5 py-1.5 font-semibold', priorityStyles[taskDetailsTask.priority])}>
                      {copy.priorityLabels[taskDetailsTask.priority]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
                <ScrollArea className="h-full">
                  <div className="space-y-6 pr-2 pb-2 sm:pr-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{taskDetailsTask.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {taskDetailsTask.description || copy.noTaskDescription}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.responsible}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{taskDetailsTask.responsible}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.unit}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                          {unitLabels[taskDetailsTask.unit]?.[languageKey] ?? taskDetailsTask.unit}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.business}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                          {businessLabels[taskDetailsTask.business]?.[languageKey] ?? taskDetailsTask.business}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.startDate}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                          {formatReadableDate(taskDetailsTask.startDate, locale)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.dueDate}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                          {formatReadableDate(taskDetailsTask.dueDate, locale)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.completion}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{taskDetailsTask.completion}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.weighting}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <StarRating value={taskDetailsTask.weighting} />
                          <span className="text-base font-semibold text-slate-900 dark:text-white">{taskDetailsTask.weighting}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.attachments}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{taskDetailsTask.files.length}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.auditNotes}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {taskDetailsTask.auditNotes || copy.noAuditNotes}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.actions}</p>
                      {renderKanbanActionButtons(taskDetailsTask, {
                        onAfterAction: closeTaskDetailsDialog,
                      })}
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
                  type="button"
                  className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
                  onClick={() => {
                    closeTaskDetailsDialog();
                    openReportDialog(taskDetailsTask.id);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {copy.reportTaskLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={quickCreate.open} onOpenChange={(open) => setQuickCreate((currentState) => ({ ...currentState, open }))}>
        <DialogContent className="!flex h-[min(60vh,400px)] max-h-[calc(100vh-3rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {copy.quickTaskTitle}
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

          <form onSubmit={handleQuickTaskSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3">
                <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {copy.quickTaskDescription}
                </DialogDescription>
                <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  {copy.requiredFieldsHint}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-2 pb-2 sm:pr-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {copy.title}
                        <span className="ml-1 text-amber-600">*</span>
                      </label>
                      <Input
                        value={quickCreate.title}
                        onChange={(event) => setQuickCreate((currentState) => ({ ...currentState, title: event.target.value }))}
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
                disabled={!quickCreate.title.trim()}
              >
                {copy.createQuickTask}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={filesDialog.open}
        onOpenChange={(open) => setFilesDialog((currentState) => ({ ...currentState, open }))}
      >
        <DialogContent className="max-w-3xl overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="flex items-start justify-between bg-[rgb(235,165,52)] px-8 py-6">
            <div>
              <DialogTitle className="text-3xl font-bold text-white">{copy.filesModalTitle}</DialogTitle>
              {filesTask && (
                <p className="mt-1 text-sm text-white/85">
                  {filesTask.folio} · {filesTask.title}
                </p>
              )}
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-900/75 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </button>
            </DialogClose>
          </div>

          <div className="space-y-6 px-8 py-7">
            <DialogDescription className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              {copy.filesModalDescription}
            </DialogDescription>

            <div className="flex flex-wrap items-center gap-3">
              <label className={cn('inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl px-5 text-sm font-semibold', accentButtonClass)}>
                <FileUp className="h-4 w-4" />
                {copy.addFiles}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFilesSelected(event, filesTask)}
                />
              </label>
            </div>

            <div className="space-y-3">
              {filesTask && filesTask.files.length > 0 ? (
                filesTask.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{file.name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span>{copy.fileSize}: {file.sizeLabel}</span>
                        <span>{copy.uploadedBy}: {file.uploadedBy}</span>
                        <span>{copy.uploadedAt}: {formatReadableDateTime(file.uploadedAt, locale)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl border-slate-200 bg-white px-4 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      onClick={() => handleOpenTaskFile(file)}
                    >
                      {copy.openFile}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                  {copy.noFiles}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-8 py-5 dark:border-slate-700 dark:bg-slate-900/80">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-8 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                {copy.cancel}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportDialog.open}
        onOpenChange={(open) => setReportDialog((currentState) => ({ ...currentState, open }))}
      >
        <DialogContent className="!flex h-[min(88vh,920px)] max-h-[calc(100vh-3rem)] max-w-[920px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {copy.reportModalTitle}
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

          {reportTask && (
            <>
              <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col gap-3">
                  <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {copy.reportModalDescription}
                  </DialogDescription>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {reportTask.folio}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {copy.statusLabels[reportTask.status]}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {reportTask.title}
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
                <ScrollArea className="h-full">
                  <div className="space-y-6 pr-2 pb-2 sm:pr-3">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.creationDate}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                          {formatReadableDate(reportTask.createdAt, locale)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.status}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                          {copy.statusLabels[reportTask.status]}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.weighting}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <StarRating value={reportTask.weighting} />
                          <span className="text-base font-semibold text-slate-900 dark:text-white">{reportTask.weighting}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{copy.taskHistory}</h3>
                      <div className="space-y-4">
                        {sortHistoryEntries(reportTask.history).length > 0 ? (
                          sortHistoryEntries(reportTask.history).map((entry) => (
                            <article key={entry.id} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">{entry.title}</h4>
                                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{entry.description}</p>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 md:text-right">
                                  <p>{entry.createdBy}</p>
                                  <p>{formatReadableDateTime(entry.createdAt, locale)}</p>
                                </div>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                            {copy.noHistory}
                          </div>
                        )}
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
                  type="button"
                  className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
                  onClick={() => handleDownloadTaskReport(reportTask)}
                >
                  <Download className="h-4 w-4" />
                  {copy.downloadPdf}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={auditDialog.open}
        onOpenChange={(open) =>
          setAuditDialog((currentState) => ({
            ...currentState,
            open,
          }))
        }
      >
        <DialogContent className="!flex h-[min(76vh,680px)] max-h-[calc(100vh-3rem)] max-w-[760px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {copy.auditModalTitle}
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

          <form onSubmit={handleAuditSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3">
                <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {copy.auditModalDescription}
                </DialogDescription>
                {auditTask && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {auditTask.folio}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {auditTask.title}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-2 pb-2 sm:pr-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <FilterSelect
                      label={copy.weighting}
                      value={String(auditDialog.weighting)}
                      onChange={(value) =>
                        setAuditDialog((currentState) => ({
                          ...currentState,
                          weighting: Number(value),
                        }))
                      }
                      options={localizedWeightingOptions}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {copy.auditComments}
                        <span className="ml-1 text-amber-600">*</span>
                      </label>
                      <Textarea
                        value={auditDialog.comments}
                        onChange={(event) =>
                          setAuditDialog((currentState) => ({
                            ...currentState,
                            comments: event.target.value,
                          }))
                        }
                        placeholder={copy.auditCommentsPlaceholder}
                        className="min-h-[180px] rounded-xl border-slate-200 px-4 py-3 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
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
                disabled={!auditDialog.comments.trim()}
              >
                {copy.saveAudit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={taskEditor.open} onOpenChange={(open) => setTaskEditor((currentState) => ({ ...currentState, open }))}>
        <DialogContent className="!flex h-[min(88vh,940px)] max-h-[calc(100vh-3rem)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {taskEditor.mode === 'edit' ? copy.editTaskTitle : copy.createTaskTitle}
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

          <form onSubmit={handleTaskSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3">
                <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {taskEditor.mode === 'edit' ? copy.editTaskDescription : copy.createTaskDescription}
                </DialogDescription>
                <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  {copy.requiredFieldsHint}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/70 px-4 py-4 sm:px-5 dark:bg-slate-900/60">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-2 pb-2 sm:pr-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <FilterSelect
                        label={copy.unit}
                        value={taskForm.unit}
                        onChange={(value) => updateTaskForm('unit', value)}
                        options={unitOptions.map((option) => ({
                          value: option,
                          label: unitLabels[option]?.[languageKey] ?? option,
                        }))}
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <FilterSelect
                        label={copy.business}
                        value={taskForm.business}
                        onChange={(value) => updateTaskForm('business', value)}
                        options={businessOptions.map((option) => ({
                          value: option,
                          label: businessLabels[option]?.[languageKey] ?? option,
                        }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {copy.title}
                        <span className="ml-1 text-amber-600">*</span>
                      </label>
                      <Input
                        value={taskForm.title}
                        onChange={(event) => updateTaskForm('title', event.target.value)}
                        placeholder={copy.titlePlaceholder}
                        className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.description}</label>
                      <Textarea
                        value={taskForm.description}
                        onChange={(event) => updateTaskForm('description', event.target.value)}
                        placeholder={copy.descriptionPlaceholder}
                        className="min-h-[150px] rounded-xl border-slate-200 px-4 py-3 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.startDate}</label>
                        <Input
                          type="date"
                          value={taskForm.startDate}
                          onChange={(event) => updateTaskForm('startDate', event.target.value)}
                          className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.dueDate}</label>
                        <Input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(event) => updateTaskForm('dueDate', event.target.value)}
                          className="h-12 rounded-xl border-slate-200 px-4 text-base shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <FilterSelect
                        label={copy.responsible}
                        value={taskForm.responsible}
                        onChange={(value) => updateTaskForm('responsible', value)}
                        options={localizedResponsibleOptions}
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
                      <FilterSelect
                        label={copy.priority}
                        value={taskForm.priority}
                        onChange={(value) => updateTaskForm('priority', value)}
                        options={localizedPriorityOptions}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-3.5 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  {copy.cancel}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
                disabled={!isTaskFormValid}
              >
                {taskEditor.mode === 'edit' ? copy.saveChanges : copy.createTaskButton}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isColumnsDialogOpen} onOpenChange={handleColumnsDialogOpenChange}>
        <DialogContent className="!flex h-[min(88vh,960px)] max-h-[calc(100vh-3rem)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
          <div className="shrink-0 bg-[rgb(235,165,52)] px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                  {copy.configureColumnsTitle}
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-900/60">
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2.5">
                  <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {copy.configureColumnsDescription}
                  </DialogDescription>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {copy.visibleColumns(
                        draftColumnSettings.filter((setting) => setting.visible).length,
                        draftColumnSettings.length,
                      )}
                    </span>
                    <span className="font-medium">
                      {copy.configureColumnsDragHint}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    onClick={handleSelectAllColumns}
                  >
                    {copy.selectAll}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    onClick={handleClearColumns}
                  >
                    {copy.clearAll}
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-5">
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-2 pb-2 sm:pr-3">
                  {draftColumnSettings.map((setting) => (
                    <div
                      key={setting.id}
                      draggable={!setting.locked}
                      onDragStart={() => setDraggedColumnId(setting.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleColumnDrop(setting.id)}
                      className={cn(
                        'flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all dark:border-slate-700 dark:bg-slate-800',
                        !setting.locked && 'cursor-grab hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]',
                      )}
                    >
                      <GripVertical className="h-5 w-5 shrink-0 text-[rgb(235,165,52)]" />
                      <Checkbox
                        checked={setting.visible}
                        disabled={setting.locked}
                        onCheckedChange={(checked) => handleColumnVisibility(setting.id, Boolean(checked))}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-slate-800 dark:text-white sm:text-[1.05rem]">
                          {columnLabels[setting.id]}
                        </div>
                        <div className="mt-0.5 text-[0.95rem] leading-6 text-slate-600 dark:text-slate-400 sm:text-[1rem]">
                          {columnDescriptions[setting.id]}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'hidden rounded-full px-3 py-1 text-xs font-semibold md:inline-flex',
                          setting.locked ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                        )}
                      >
                        {setting.locked
                          ? copy.fixedColumn
                          : copy.optionalColumn}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-3.5 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="button"
              className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClass)}
              onClick={applyColumnSettings}
            >
              {copy.applyChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
