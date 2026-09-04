import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListTodo,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../components/ui/collapsible';
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
  type IndiceModalWizardStep,
} from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Switch } from '../../../../components/ui/switch';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import { frequencyOptions, priorityOptions, weekdayOptions } from '../processesData';
import type { ProcessesTranslations } from '../translations';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessFormState,
  ProcessTaskTemplate,
  ProcessUnitOption,
  Weekday,
} from '../types';

interface ProcessFormDialogProps {
  businessOptions: ProcessBusinessOption[];
  collaboratorOptions: ProcessCollaboratorOption[];
  copy?: ProcessesTranslations;
  error?: string | null;
  form: ProcessFormState;
  isSubmitting?: boolean;
  locale?: string;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  setForm: Dispatch<SetStateAction<ProcessFormState>>;
  unitOptions: ProcessUnitOption[];
}

type Step = 'identity' | 'tasks' | 'organization' | 'schedule' | 'review';
const NONE = '__none__';

function labels(locale: string) {
  const es = locale.toLowerCase().startsWith('es');

  return es ? {
    identity: 'Definición',
    identityDescription: 'Dale un nombre claro y define si una o varias tareas formarán el proceso.',
    tasks: 'Tareas',
    tasksDescription: 'Diseña el trabajo, sus responsables y los requisitos de cada tarea.',
    organization: 'Orden y fechas',
    organizationDescription: 'Decide cómo se distribuye el trabajo desde la fecha de inicio.',
    schedule: 'Activación',
    scheduleDescription: 'Elige si el proceso se genera por calendario o se activa cuando lo necesites.',
    review: 'Revisión',
    reviewDescription: 'Comprueba la configuración completa antes de guardar el proceso.',
    processType: 'Tipo de proceso',
    individual: 'Individual',
    individualDescription: 'Una sola tarea con uno o varios responsables.',
    shared: 'Compartido',
    sharedDescription: 'Dos o más tareas que pueden asignarse a personas o equipos distintos.',
    activation: 'Forma de activación',
    recurring: 'Regular',
    recurringDescription: 'El sistema crea ejecuciones automáticamente según un calendario.',
    occasional: 'Ocasional',
    occasionalDescription: 'Se activa manualmente desde Agenda con una referencia y fecha de inicio.',
    coordinator: 'Coordinador general',
    organizationMode: 'Cómo se organizan las tareas',
    parallel: 'Al mismo tiempo',
    parallelDescription: 'Todas quedan programadas para el día de inicio.',
    sequential: 'Consecutivas',
    sequentialDescription: 'Cada tarea se propone un día después de la anterior.',
    staged: 'Por etapas',
    stagedDescription: 'Agrupa tareas por etapas y define el momento de cada una.',
    includeWeekends: 'Contemplar sábado y domingo',
    addTask: 'Agregar tarea',
    deleteTask: 'Eliminar tarea',
    task: 'Tarea',
    taskEditor: 'Configuración de la tarea',
    taskList: 'Tareas del proceso',
    instructions: 'Instrucciones',
    notes: 'Notas o lista',
    assignees: 'Responsables',
    searchAssignees: 'Buscar por nombre, correo, unidad o negocio',
    noAssignees: 'No encontramos responsables con esa búsqueda.',
    plannedDay: 'Se programa',
    deadline: 'Plazo para completarla',
    stage: 'Etapa',
    evidence: 'Exigir evidencia para completar',
    days: 'días',
    day: 'Día',
    dueDay: 'Vence día',
    inheritDefaults: 'Heredar del proceso',
    defaultsTitle: 'Valores predeterminados',
    defaultsDescription: 'Coordinación, prioridad y alcance que servirán como base para las tareas.',
    occasionalHelp: 'Después de guardarlo aparecerá en “Proceso ocasional” dentro de Agenda. Al activarlo se pedirá una referencia y fecha de inicio.',
    recurringHelp: 'El motor seguirá generando las ejecuciones dentro de la ventana actual de 45 días.',
    versionWarning: 'Los cambios crean una versión nueva. Las tareas ya generadas no se modifican.',
    nameRequired: 'Escribe el nombre del proceso.',
    descriptionRequired: 'Explica el objetivo del proceso.',
    coordinatorRequired: 'Selecciona un coordinador general.',
    taskRequired: 'Cada tarea necesita título y por lo menos un responsable.',
    sharedRequired: 'Un proceso compartido necesita por lo menos dos tareas.',
    weekendsHelp: 'Si se desactiva, los desplazamientos de fechas saltan sábados y domingos.',
    organizationHelp: 'Todas las tareas se crean desde el inicio. Las fechas organizan el trabajo, pero no impiden adelantarlo.',
    organizationProposal: 'Al elegir un modo se propone un orden inicial. Puedes ajustar cada día y plazo.',
    start: 'Inicio',
    end: 'Fin',
    frequency: 'Frecuencia',
    addDate: 'Agregar fecha',
    edit: 'Editar',
    step: 'Paso',
    continueTo: 'Continuar a',
    incomplete: 'Falta información',
    complete: 'Lista',
    of: 'de',
    changeToIndividualTitle: '¿Cambiar a proceso individual?',
    changeToIndividualDescription: 'Se conservará únicamente la primera tarea. Las demás tareas de esta plantilla se retirarán.',
    keepShared: 'Mantener compartido',
    keepFirstTask: 'Cambiar y conservar la tarea 1',
    discardTitle: '¿Descartar los cambios?',
    discardDescription: 'La información que agregaste en este proceso no se guardará.',
    keepEditing: 'Seguir editando',
    discard: 'Descartar cambios',
    unsavedChanges: 'Cambios sin guardar',
    generalInformation: 'Información general',
    taskPlan: 'Plan de tareas',
    automaticDates: 'Propuesta de fechas',
    noEndDate: 'Sin fecha final',
    yes: 'Sí',
    no: 'No',
  } : {
    identity: 'Definition',
    identityDescription: 'Give the process a clear name and define whether it contains one or several tasks.',
    tasks: 'Tasks',
    tasksDescription: 'Design the work, assignees, and requirements for each task.',
    organization: 'Order and dates',
    organizationDescription: 'Decide how work is distributed from the start date.',
    schedule: 'Activation',
    scheduleDescription: 'Choose whether the process runs on a calendar or only when needed.',
    review: 'Review',
    reviewDescription: 'Check the complete configuration before saving the process.',
    processType: 'Process type',
    individual: 'Individual',
    individualDescription: 'One task with one or more assignees.',
    shared: 'Shared',
    sharedDescription: 'Two or more tasks assigned to different people or teams.',
    activation: 'Activation method',
    recurring: 'Recurring',
    recurringDescription: 'The system creates runs automatically using a calendar.',
    occasional: 'Occasional',
    occasionalDescription: 'Started manually from Agenda with a reference and start date.',
    coordinator: 'General coordinator',
    organizationMode: 'How tasks are organized',
    parallel: 'At the same time',
    parallelDescription: 'Every task is scheduled for the start day.',
    sequential: 'Sequential',
    sequentialDescription: 'Each task is proposed one day after the previous one.',
    staged: 'By stages',
    stagedDescription: 'Group tasks into stages and define when each one begins.',
    includeWeekends: 'Include Saturday and Sunday',
    addTask: 'Add task',
    deleteTask: 'Delete task',
    task: 'Task',
    taskEditor: 'Task configuration',
    taskList: 'Process tasks',
    instructions: 'Instructions',
    notes: 'Notes or checklist',
    assignees: 'Assignees',
    searchAssignees: 'Search by name, email, unit, or business',
    noAssignees: 'No assignees match that search.',
    plannedDay: 'Scheduled',
    deadline: 'Time to complete',
    stage: 'Stage',
    evidence: 'Require evidence to complete',
    days: 'days',
    day: 'Day',
    dueDay: 'Due day',
    inheritDefaults: 'Inherit from process',
    defaultsTitle: 'Default values',
    defaultsDescription: 'Coordination, priority, and scope used as the starting point for tasks.',
    occasionalHelp: 'After saving, it will appear under “Occasional process” in Agenda. Starting it requires a reference and start date.',
    recurringHelp: 'The engine will keep generating runs inside the existing 45-day window.',
    versionWarning: 'Changes publish a new version. Already generated tasks are not modified.',
    nameRequired: 'Enter the process name.',
    descriptionRequired: 'Describe the purpose of the process.',
    coordinatorRequired: 'Select a general coordinator.',
    taskRequired: 'Every task needs a title and at least one assignee.',
    sharedRequired: 'A shared process requires at least two tasks.',
    weekendsHelp: 'When disabled, date offsets skip Saturdays and Sundays.',
    organizationHelp: 'Every task is created at the start. Dates organize the work but do not prevent completing it early.',
    organizationProposal: 'Choosing a mode proposes an initial order. You can adjust every day and deadline.',
    start: 'Start',
    end: 'End',
    frequency: 'Frequency',
    addDate: 'Add date',
    edit: 'Edit',
    step: 'Step',
    continueTo: 'Continue to',
    incomplete: 'Missing information',
    complete: 'Ready',
    of: 'of',
    changeToIndividualTitle: 'Change to an individual process?',
    changeToIndividualDescription: 'Only the first task will be kept. The remaining template tasks will be removed.',
    keepShared: 'Keep shared',
    keepFirstTask: 'Change and keep task 1',
    discardTitle: 'Discard changes?',
    discardDescription: 'The information added to this process will not be saved.',
    keepEditing: 'Keep editing',
    discard: 'Discard changes',
    unsavedChanges: 'Unsaved changes',
    generalInformation: 'General information',
    taskPlan: 'Task plan',
    automaticDates: 'Date proposal',
    noEndDate: 'No end date',
    yes: 'Yes',
    no: 'No',
  };
}

function newTemplate(form: ProcessFormState): ProcessTaskTemplate {
  return {
    stage: form.organizationMode === 'staged' ? Math.min(20, form.taskTemplates.length + 1) : 1,
    title: '',
    description: '',
    notes: '',
    priority: form.priority,
    unitId: form.unitId ?? null,
    unitName: form.unit,
    businessId: form.businessId ?? null,
    businessName: form.business,
    scheduledOffsetDays: form.organizationMode === 'parallel' ? 0 : form.taskTemplates.length,
    deadlineOffsetDays: 0,
    evidenceRequired: false,
    assigneeUserCompanyIds: [],
    assignees: [],
  };
}

function applyOrganizationMode(
  tasks: ProcessTaskTemplate[],
  organizationMode: ProcessFormState['organizationMode'],
) {
  return tasks.map((task, index) => ({
    ...task,
    stage: organizationMode === 'staged' ? Math.min(20, index + 1) : 1,
    scheduledOffsetDays: organizationMode === 'parallel' ? 0 : index,
  }));
}

export function ProcessFormDialog({
  businessOptions,
  collaboratorOptions,
  copy,
  error,
  form,
  isSubmitting = false,
  locale = 'en-CA',
  mode,
  onOpenChange,
  onSubmit,
  open,
  setForm,
  unitOptions,
}: ProcessFormDialogProps) {
  const text = labels(locale);
  const [step, setStep] = useState<Step>('identity');
  const [specificDate, setSpecificDate] = useState('');
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [attemptedStep, setAttemptedStep] = useState<Step | null>(null);
  const [pendingIndividual, setPendingIndividual] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const initialSnapshotRef = useRef(JSON.stringify(form));
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      initialSnapshotRef.current = JSON.stringify(form);
      setStep('identity');
      setSpecificDate('');
      setDefaultsOpen(false);
      setActiveTaskIndex(0);
      setAssigneeSearch('');
      setAttemptedStep(null);
      setPendingIndividual(false);
      setDiscardPrompt(false);
    }
    wasOpenRef.current = open;
  }, [form, open]);

  useEffect(() => {
    setActiveTaskIndex((current) => Math.max(0, Math.min(current, form.taskTemplates.length - 1)));
  }, [form.taskTemplates.length]);

  useEffect(() => {
    if (!open || discardPrompt) return;
    const frame = window.requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      stepHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [discardPrompt, open, step]);

  const steps: readonly IndiceModalWizardStep<Step>[] = [
    { id: 'identity', label: text.identity },
    { id: 'tasks', label: text.tasks },
    { id: 'organization', label: text.organization },
    { id: 'schedule', label: text.schedule },
    { id: 'review', label: text.review },
  ];
  const stepDescriptions: Record<Step, string> = {
    identity: text.identityDescription,
    tasks: text.tasksDescription,
    organization: text.organizationDescription,
    schedule: text.scheduleDescription,
    review: text.reviewDescription,
  };
  const stepIndex = steps.findIndex((item) => item.id === step);
  const identityMessages = [
    ...(!form.title.trim() ? [text.nameRequired] : []),
    ...(!form.description.trim() ? [text.descriptionRequired] : []),
    ...(!form.coordinatorUserCompanyId ? [text.coordinatorRequired] : []),
  ];
  const tasksHaveRequiredFields = form.taskTemplates.every(
    (task) => task.title.trim() && task.assigneeUserCompanyIds.length > 0,
  );
  const taskCountValid = form.distributionMode === 'individual'
    ? form.taskTemplates.length === 1
    : form.taskTemplates.length >= 2;
  const tasksMessages = [
    ...(!taskCountValid ? [text.sharedRequired] : []),
    ...(!tasksHaveRequiredFields ? [text.taskRequired] : []),
  ];
  const dateValid = !form.startDate || !form.endDate || form.startDate <= form.endDate;
  const activationMessages = !dateValid ? [`${text.end}: ${text.start}`] : [];
  const stepMessages: Record<Step, string[]> = {
    identity: identityMessages,
    tasks: tasksMessages,
    organization: [],
    schedule: activationMessages,
    review: [...identityMessages, ...tasksMessages, ...activationMessages],
  };
  const formValid = identityMessages.length === 0 && tasksMessages.length === 0 && activationMessages.length === 0;
  const validation = [
    ...(error ? [error] : []),
    ...(attemptedStep === step ? stepMessages[step] : []),
  ];
  const hasUnsavedChanges = JSON.stringify(form) !== initialSnapshotRef.current;

  const syncLegacyTaskFields = (current: ProcessFormState, taskTemplates: ProcessTaskTemplate[]) => {
    const first = taskTemplates[0];
    const firstAssigneeId = first?.assigneeUserCompanyIds[0] ?? null;
    return {
      ...current,
      taskTemplates,
      taskTitleTemplate: first?.title ?? '',
      taskDescriptionTemplate: first?.description ?? '',
      taskNotesTemplate: first?.notes ?? '',
      evidenceRequired: Boolean(first?.evidenceRequired),
      responsibleUserCompanyId: firstAssigneeId,
      responsible: collaboratorOptions.find((item) => item.userCompanyId === firstAssigneeId)?.name ?? '',
    };
  };

  const updateTemplate = (index: number, update: Partial<ProcessTaskTemplate>) => {
    setForm((current) => syncLegacyTaskFields(
      current,
      current.taskTemplates.map((task, taskIndex) => taskIndex === index ? { ...task, ...update } : task),
    ));
  };

  const addTemplate = () => {
    const nextIndex = form.taskTemplates.length;
    setForm((current) => syncLegacyTaskFields(current, [...current.taskTemplates, newTemplate(current)]));
    setActiveTaskIndex(nextIndex);
    setAssigneeSearch('');
  };

  const removeTemplate = (index: number) => {
    setForm((current) => syncLegacyTaskFields(
      current,
      current.taskTemplates.filter((_, taskIndex) => taskIndex !== index),
    ));
    setActiveTaskIndex((current) => current > index ? current - 1 : Math.max(0, current - (current === index ? 1 : 0)));
  };

  const moveTemplate = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= form.taskTemplates.length) return;
    setForm((current) => {
      const taskTemplates = [...current.taskTemplates];
      [taskTemplates[index], taskTemplates[destination]] = [taskTemplates[destination], taskTemplates[index]];
      return syncLegacyTaskFields(current, taskTemplates);
    });
    setActiveTaskIndex(destination);
  };

  const selectStep = (nextStep: Step) => {
    setAttemptedStep(null);
    setStep(nextStep);
  };

  const continueToNextStep = () => {
    if (stepMessages[step].length > 0) {
      setAttemptedStep(step);
      window.requestAnimationFrame(() => {
        bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
      if (step === 'identity' && !form.coordinatorUserCompanyId) {
        setDefaultsOpen(true);
      }
      if (step === 'tasks') {
        const firstIncompleteTask = form.taskTemplates.findIndex(
          (task) => !task.title.trim() || task.assigneeUserCompanyIds.length === 0,
        );
        if (firstIncompleteTask >= 0) {
          setActiveTaskIndex(firstIncompleteTask);
        }
      }
      return;
    }
    selectStep(steps[stepIndex + 1].id);
  };

  const requestOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (discardPrompt) return;
    if (hasUnsavedChanges) {
      setDiscardPrompt(true);
      return;
    }
    onOpenChange(false);
  };

  const discardChanges = () => {
    initialSnapshotRef.current = JSON.stringify(form);
    setDiscardPrompt(false);
    onOpenChange(false);
  };

  const localizedFrequencies = frequencyOptions.map(
    (item) => [item.value, copy?.frequencies[item.value] ?? item.label],
  );
  const activeTask = form.taskTemplates[activeTaskIndex];
  const taskBusinesses = activeTask
    ? businessOptions.filter((item) => !activeTask.unitId || !item.unitId || item.unitId === activeTask.unitId)
    : [];
  const filteredCollaborators = useMemo(() => {
    const query = assigneeSearch.trim().toLocaleLowerCase(locale);
    if (!query) return collaboratorOptions;
    return collaboratorOptions.filter((person) => [
      person.name,
      person.email,
      person.unitName,
      person.businessName,
    ].some((value) => value?.toLocaleLowerCase(locale).includes(query)));
  }, [assigneeSearch, collaboratorOptions, locale]);

  const processTitle = copy?.form.titles[mode] ?? text.identity;
  const footerSummary = `${text.step} ${stepIndex + 1} ${text.of} ${steps.length} · ${steps[stepIndex].label}`;

  return <IndiceModalFrame
    bodyRef={bodyRef}
    busy={isSubmitting}
    closeLabel={copy?.common.close ?? 'Close'}
    description={discardPrompt
      ? text.discardDescription
      : mode === 'edit' && step === 'identity'
        ? text.versionWarning
        : stepDescriptions[step]}
    eyebrow={discardPrompt ? text.unsavedChanges : footerSummary}
    footer={discardPrompt ? <>
      <Button type="button" variant="outline" className="h-11" onClick={() => setDiscardPrompt(false)}>{text.keepEditing}</Button>
      <Button type="button" variant="destructive" className="h-11" onClick={discardChanges}>{text.discard}</Button>
    </> : <>
      <Button type="button" variant="outline" className="h-11" disabled={isSubmitting} onClick={() => requestOpenChange(false)}>
        {copy?.common.cancel ?? 'Cancel'}
      </Button>
      {stepIndex > 0 ? <Button type="button" variant="outline" className="h-11" disabled={isSubmitting} onClick={() => selectStep(steps[stepIndex - 1].id)}>
        <ChevronLeft className="h-4 w-4" />{copy?.common.previous ?? 'Previous'}
      </Button> : null}
      {step !== 'review'
        ? <Button type="button" className="h-11" disabled={isSubmitting} onClick={continueToNextStep}>
          {text.continueTo} {steps[stepIndex + 1].label}<ChevronRight className="h-4 w-4" />
        </Button>
        : <Button type="submit" form="shared-process-form" className="h-11" disabled={isSubmitting}>
          {mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isSubmitting
            ? (copy?.common.saving ?? 'Saving')
            : mode === 'create'
              ? (copy?.form.submit.create ?? 'Create')
              : (copy?.form.submit.edit ?? 'Save')}
        </Button>}
    </>}
    footerSummary={discardPrompt ? text.unsavedChanges : footerSummary}
    icon={discardPrompt ? <AlertTriangle className="h-5 w-5" /> : <Workflow className="h-5 w-5" />}
    modalType="wizard"
    onOpenChange={requestOpenChange}
    open={open}
    title={discardPrompt ? text.discardTitle : processTitle}
    tone="yellow"
  >
    {discardPrompt ? <DiscardChangesView text={text} /> : <form
      id="shared-process-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (step !== 'review') return;
        if (!formValid) {
          const firstInvalidStep: Step = identityMessages.length > 0
            ? 'identity'
            : tasksMessages.length > 0
              ? 'tasks'
              : 'schedule';
          setAttemptedStep(firstInvalidStep);
          setStep(firstInvalidStep);
          return;
        }
        onSubmit(event);
      }}
      className="space-y-5"
    >
      <IndiceModalWizardStepper accent="yellow" activeStepId={step} progressLabel={processTitle} steps={steps} />
      <IndiceModalValidation messages={validation} />

      {step === 'identity' ? <section aria-labelledby="process-definition-heading" className="space-y-5">
        <StepIntro ref={stepHeadingRef} id="process-definition-heading" title={text.identity} description={text.identityDescription} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field className="md:col-span-2" label={`${copy?.form.labels.title ?? 'Title'} *`}>
            <Input className="h-11" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </Field>
          <Field className="md:col-span-2" label={`${copy?.form.labels.description ?? 'Description'} *`}>
            <Textarea className="min-h-24" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
        </div>

        <DecisionCards
          label={text.processType}
          value={form.distributionMode}
          onChange={(value) => {
            if (value === 'individual' && form.taskTemplates.length > 1) {
              setPendingIndividual(true);
              return;
            }
            setForm((current) => ({ ...current, distributionMode: value as ProcessFormState['distributionMode'] }));
          }}
          options={[
            { value: 'individual', label: text.individual, description: text.individualDescription, icon: <UserRound className="h-5 w-5" /> },
            { value: 'shared', label: text.shared, description: text.sharedDescription, icon: <Users className="h-5 w-5" /> },
          ]}
        />

        {pendingIndividual ? <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{text.changeToIndividualTitle}</p>
              <p className="mt-1 text-sm opacity-80">{text.changeToIndividualDescription}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-10" onClick={() => setPendingIndividual(false)}>{text.keepShared}</Button>
                <Button type="button" className="h-10" onClick={() => {
                  setForm((current) => ({
                    ...syncLegacyTaskFields(current, current.taskTemplates.slice(0, 1)),
                    distributionMode: 'individual',
                  }));
                  setActiveTaskIndex(0);
                  setPendingIndividual(false);
                }}>{text.keepFirstTask}</Button>
              </div>
            </div>
          </div>
        </div> : null}

        <Collapsible open={defaultsOpen} onOpenChange={setDefaultsOpen} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <CollapsibleTrigger className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-slate-800/60">
            <span>
              <strong className="block text-sm text-slate-950 dark:text-white">{text.defaultsTitle}</strong>
              <small className="mt-0.5 block text-slate-500 dark:text-slate-400">{text.defaultsDescription}</small>
            </span>
            <ChevronDown className={cn('h-5 w-5 shrink-0 transition-transform', defaultsOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-200 p-4 dark:border-slate-700">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Choice
                label={`${text.coordinator} *`}
                value={form.coordinatorUserCompanyId?.toString() ?? NONE}
                onChange={(value) => {
                  const selected = collaboratorOptions.find((item) => item.userCompanyId === Number(value));
                  setForm((current) => ({
                    ...current,
                    coordinatorUserCompanyId: selected?.userCompanyId ?? null,
                    coordinator: selected?.name ?? '',
                  }));
                }}
                options={[[NONE, text.coordinator], ...collaboratorOptions.map((item) => [item.userCompanyId.toString(), item.name])]}
              />
              <Choice
                label={copy?.form.labels.priority ?? 'Priority'}
                value={form.priority}
                onChange={(value) => setForm((current) => ({ ...current, priority: value as ProcessFormState['priority'] }))}
                options={priorityOptions.map((item) => [item.value, copy?.priorities[item.value] ?? item.label])}
              />
              <Choice
                label={copy?.form.labels.unit ?? 'Unit'}
                value={form.unitId?.toString() ?? NONE}
                onChange={(value) => {
                  const unit = unitOptions.find((item) => item.id === Number(value));
                  setForm((current) => ({
                    ...current,
                    unitId: unit?.id ?? null,
                    unit: unit?.name ?? '',
                    businessId: null,
                    business: '',
                  }));
                }}
                options={[[NONE, copy?.common.noUnit ?? 'No unit'], ...unitOptions.map((item) => [item.id.toString(), item.name])]}
              />
              <Choice
                label={copy?.form.labels.business ?? 'Business'}
                value={form.businessId?.toString() ?? NONE}
                onChange={(value) => {
                  const business = businessOptions.find((item) => item.id === Number(value));
                  const unit = unitOptions.find((item) => item.id === business?.unitId);
                  setForm((current) => ({
                    ...current,
                    businessId: business?.id ?? null,
                    business: business?.name ?? '',
                    unitId: unit?.id ?? current.unitId,
                    unit: unit?.name ?? current.unit,
                  }));
                }}
                options={[
                  [NONE, copy?.common.noBusiness ?? 'No business'],
                  ...businessOptions
                    .filter((item) => !form.unitId || !item.unitId || item.unitId === form.unitId)
                    .map((item) => [item.id.toString(), item.name]),
                ]}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section> : null}

      {step === 'tasks' ? <section aria-labelledby="process-tasks-heading" className="space-y-4">
        <StepIntro ref={stepHeadingRef} id="process-tasks-heading" title={text.tasks} description={text.tasksDescription} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-white">{text.taskList}</p>
                <p className="text-xs text-slate-500">{form.taskTemplates.length} {text.tasks.toLowerCase()}</p>
              </div>
              <ListTodo className="h-5 w-5 text-amber-600" />
            </div>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {form.taskTemplates.map((task, index) => {
                const taskReady = Boolean(task.title.trim() && task.assigneeUserCompanyIds.length > 0);
                const selected = index === activeTaskIndex;
                return <div key={task.id ?? index} className={cn(
                  'rounded-xl border p-2 transition-colors',
                  selected ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60',
                )}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-start gap-2 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => { setActiveTaskIndex(index); setAssigneeSearch(''); }}
                  >
                    {taskReady
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{index + 1}. {task.title || text.task}</strong>
                      <small className="mt-0.5 block truncate text-slate-500">{task.assigneeUserCompanyIds.length} {text.assignees.toLowerCase()}</small>
                    </span>
                  </button>
                  {form.taskTemplates.length > 1 ? <div className="mt-1 flex justify-end gap-1 border-t border-current/10 pt-1">
                    <TaskIconButton label={`${text.task} ${index + 1} ↑`} disabled={index === 0} onClick={() => moveTemplate(index, -1)}><ArrowUp /></TaskIconButton>
                    <TaskIconButton label={`${text.task} ${index + 1} ↓`} disabled={index === form.taskTemplates.length - 1} onClick={() => moveTemplate(index, 1)}><ArrowDown /></TaskIconButton>
                    {form.distributionMode === 'shared' && form.taskTemplates.length > 2
                      ? <TaskIconButton label={`${text.deleteTask} ${index + 1}`} destructive onClick={() => removeTemplate(index)}><Trash2 /></TaskIconButton>
                      : null}
                  </div> : null}
                </div>;
              })}
            </div>
            {form.distributionMode === 'shared' && form.taskTemplates.length < 50 ? <Button type="button" variant="outline" className="h-11 w-full border-dashed" onClick={addTemplate}>
              <Plus className="h-4 w-4" />{text.addTask}
            </Button> : null}
          </aside>

          {activeTask ? <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <p className="text-xs font-medium text-slate-500">{text.taskEditor}</p>
                <h3 className="mt-1 font-medium text-slate-950 dark:text-white">{text.task} {activeTaskIndex + 1} {text.of} {form.taskTemplates.length}</h3>
              </div>
              <StatusPill ready={Boolean(activeTask.title.trim() && activeTask.assigneeUserCompanyIds.length > 0)} readyLabel={text.complete} pendingLabel={text.incomplete} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field className="md:col-span-2" label={`${copy?.form.labels.taskTitle ?? 'Task title'} *`}>
                <Input className="h-11" value={activeTask.title} onChange={(event) => updateTemplate(activeTaskIndex, { title: event.target.value })} />
              </Field>
              <Field className="md:col-span-2" label={text.instructions}>
                <Textarea className="min-h-20" value={activeTask.description} onChange={(event) => updateTemplate(activeTaskIndex, { description: event.target.value })} />
              </Field>
              <Field className="md:col-span-2" label={text.notes}>
                <Textarea className="min-h-20" value={activeTask.notes} onChange={(event) => updateTemplate(activeTaskIndex, { notes: event.target.value })} />
              </Field>
              <Choice
                label={copy?.form.labels.priority ?? 'Priority'}
                value={activeTask.priority}
                onChange={(value) => updateTemplate(activeTaskIndex, { priority: value as ProcessTaskTemplate['priority'] })}
                options={priorityOptions.map((item) => [item.value, copy?.priorities[item.value] ?? item.label])}
              />
              <Choice
                label={copy?.form.labels.unit ?? 'Unit'}
                value={activeTask.unitId?.toString() ?? NONE}
                onChange={(value) => {
                  const unit = unitOptions.find((item) => item.id === Number(value));
                  const currentBusiness = businessOptions.find((item) => item.id === activeTask.businessId);
                  const effectiveUnitId = unit?.id ?? form.unitId ?? null;
                  const businessMatchesUnit = currentBusiness
                    && (currentBusiness.unitId == null || effectiveUnitId == null || currentBusiness.unitId === effectiveUnitId);
                  updateTemplate(activeTaskIndex, {
                    unitId: unit?.id ?? null,
                    unitName: unit?.name ?? '',
                    businessId: businessMatchesUnit ? currentBusiness.id : null,
                    businessName: businessMatchesUnit ? currentBusiness.name : '',
                  });
                }}
                options={[[NONE, text.inheritDefaults], ...unitOptions.map((item) => [item.id.toString(), item.name])]}
              />
              <Choice
                label={copy?.form.labels.business ?? 'Business'}
                value={activeTask.businessId?.toString() ?? NONE}
                onChange={(value) => {
                  const business = taskBusinesses.find((item) => item.id === Number(value));
                  updateTemplate(activeTaskIndex, { businessId: business?.id ?? null, businessName: business?.name ?? '' });
                }}
                options={[[NONE, text.inheritDefaults], ...taskBusinesses.map((item) => [item.id.toString(), item.name])]}
              />
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{text.assignees} *</label>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="relative border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/70">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input className="h-10 bg-white pl-9 dark:bg-slate-900" value={assigneeSearch} placeholder={text.searchAssignees} onChange={(event) => setAssigneeSearch(event.target.value)} />
                  </div>
                  {activeTask.assigneeUserCompanyIds.length > 0 ? <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                    {activeTask.assigneeUserCompanyIds.map((assigneeId) => {
                      const person = collaboratorOptions.find((item) => item.userCompanyId === assigneeId);
                      return person ? <span key={assigneeId} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">{person.name}</span> : null;
                    })}
                  </div> : null}
                  <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                    {filteredCollaborators.length > 0 ? filteredCollaborators.map((person) => {
                      const checked = activeTask.assigneeUserCompanyIds.includes(person.userCompanyId);
                      return <label key={person.userCompanyId} className={cn(
                        'flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition-colors',
                        checked ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800',
                      )}>
                        <Checkbox
                          className="mt-0.5"
                          checked={checked}
                          onCheckedChange={(next) => updateTemplate(activeTaskIndex, {
                            assigneeUserCompanyIds: next === true
                              ? Array.from(new Set([...activeTask.assigneeUserCompanyIds, person.userCompanyId]))
                              : activeTask.assigneeUserCompanyIds.filter((id) => id !== person.userCompanyId),
                          })}
                        />
                        <span className="min-w-0">
                          <strong className="block truncate font-medium">{person.name}</strong>
                          <small className="block truncate text-slate-500">{person.businessName || person.unitName || person.email || '—'}</small>
                        </span>
                      </label>;
                    }) : <p className="col-span-full py-5 text-center text-sm text-slate-500">{text.noAssignees}</p>}
                  </div>
                </div>
              </div>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60 md:col-span-2">
                <span>
                  <strong className="block font-medium">{text.evidence}</strong>
                  <small className="mt-0.5 block text-slate-500">{activeTask.evidenceRequired ? text.yes : text.no}</small>
                </span>
                <Switch checked={activeTask.evidenceRequired} onCheckedChange={(checked) => updateTemplate(activeTaskIndex, { evidenceRequired: checked })} />
              </label>
            </div>
          </div> : null}
        </div>
      </section> : null}

      {step === 'organization' ? <section aria-labelledby="process-organization-heading" className="space-y-5">
        <StepIntro ref={stepHeadingRef} id="process-organization-heading" title={text.organization} description={text.organizationDescription} />
        <DecisionCards
          columns={3}
          label={text.organizationMode}
          value={form.organizationMode}
          onChange={(value) => setForm((current) => {
            const organizationMode = value as ProcessFormState['organizationMode'];
            return {
              ...current,
              organizationMode,
              taskTemplates: applyOrganizationMode(current.taskTemplates, organizationMode),
            };
          })}
          options={[
            { value: 'parallel', label: text.parallel, description: text.parallelDescription, icon: <Zap className="h-5 w-5" /> },
            { value: 'sequential', label: text.sequential, description: text.sequentialDescription, icon: <ArrowDown className="h-5 w-5" /> },
            { value: 'staged', label: text.staged, description: text.stagedDescription, icon: <Workflow className="h-5 w-5" /> },
          ]}
        />
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
          {text.organizationHelp} {text.organizationProposal}
        </p>

        <TimelinePreview form={form} text={text} />

        <label className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <span>
            <strong className="block text-sm">{text.includeWeekends}</strong>
            <small className="mt-0.5 block text-slate-500">{text.weekendsHelp}</small>
          </span>
          <Switch checked={form.includeWeekends} onCheckedChange={(checked) => setForm((current) => ({ ...current, includeWeekends: checked }))} />
        </label>

        <div className="space-y-3">
          {form.taskTemplates.map((task, index) => <div key={task.id ?? index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_repeat(2,minmax(8rem,0.55fr))]">
            <div className="min-w-0 self-center">
              <strong className="block truncate text-sm">{index + 1}. {task.title || text.task}</strong>
              <small className="mt-1 block text-slate-500">
                {form.organizationMode === 'staged' ? `${text.stage} ${task.stage} · ` : ''}{text.day} +{task.scheduledOffsetDays} · {text.dueDay} +{task.scheduledOffsetDays + task.deadlineOffsetDays}
              </small>
              {form.organizationMode === 'staged' ? <div className="mt-2 max-w-28"><NumberField label={text.stage} value={task.stage} min={1} max={20} onChange={(value) => updateTemplate(index, { stage: value })} /></div> : null}
            </div>
            <NumberField label={`${text.plannedDay} (+ ${text.days})`} value={task.scheduledOffsetDays} min={0} max={365} onChange={(value) => updateTemplate(index, { scheduledOffsetDays: value })} />
            <NumberField label={`${text.deadline} (${text.days})`} value={task.deadlineOffsetDays} min={0} max={365} onChange={(value) => updateTemplate(index, { deadlineOffsetDays: value })} />
          </div>)}
        </div>
      </section> : null}

      {step === 'schedule' ? <section aria-labelledby="process-activation-heading" className="space-y-5">
        <StepIntro ref={stepHeadingRef} id="process-activation-heading" title={text.schedule} description={text.scheduleDescription} />
        <DecisionCards
          label={text.activation}
          value={form.activationMode}
          onChange={(value) => setForm((current) => ({ ...current, activationMode: value as ProcessFormState['activationMode'] }))}
          options={[
            { value: 'recurring', label: text.recurring, description: text.recurringDescription, icon: <CalendarClock className="h-5 w-5" /> },
            { value: 'occasional', label: text.occasional, description: text.occasionalDescription, icon: <Zap className="h-5 w-5" /> },
          ]}
        />

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <CalendarDays className="mr-2 inline h-4 w-4" />
          {form.activationMode === 'recurring' ? text.recurringHelp : text.occasionalHelp}
        </div>

        {form.activationMode === 'recurring' ? <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Choice label={text.frequency} value={form.frequency} onChange={(value) => setForm((current) => ({ ...current, frequency: value as ProcessFormState['frequency'] }))} options={localizedFrequencies} />
            <DateField label={text.start} value={form.startDate} onChange={(value) => setForm((current) => ({ ...current, startDate: value }))} />
            <DateField label={text.end} value={form.endDate} onChange={(value) => setForm((current) => ({ ...current, endDate: value }))} />
          </div>
          {form.frequency === 'weekly' ? <Choice label={text.frequency} value={form.recurrence.weeklyDay} onChange={(value) => setForm((current) => ({ ...current, recurrence: { ...current.recurrence, weeklyDay: value as Weekday } }))} options={weekdayOptions.map((item) => [item.value, copy?.weekdays[item.value] ?? item.label])} /> : null}
          {form.frequency === 'bi-weekly' ? <div className="flex flex-wrap gap-2">{weekdayOptions.map((item) => <label key={item.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><Checkbox checked={form.recurrence.biWeeklyDays.includes(item.value)} onCheckedChange={(checked) => setForm((current) => ({ ...current, recurrence: { ...current.recurrence, biWeeklyDays: checked === true ? [...current.recurrence.biWeeklyDays, item.value] : current.recurrence.biWeeklyDays.filter((day) => day !== item.value) } }))} />{copy?.weekdays[item.value] ?? item.label}</label>)}</div> : null}
          {form.frequency === 'monthly' ? <Field label={copy?.form.recurrence.monthlyTitle ?? 'Days of month'}><Input className="h-11" value={form.recurrence.monthlyDays.join(', ')} onChange={(event) => {
            const monthlyDays = event.target.value.split(',').map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 31);
            setForm((current) => ({ ...current, recurrence: { ...current.recurrence, monthlyDays } }));
          }} /></Field> : null}
          {form.frequency === 'specific-dates' ? <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row"><Input className="h-11" type="date" value={specificDate} onChange={(event) => setSpecificDate(event.target.value)} /><Button type="button" variant="outline" className="h-11" disabled={!specificDate} onClick={() => {
              setForm((current) => ({ ...current, recurrence: { ...current.recurrence, specificDates: Array.from(new Set([...current.recurrence.specificDates, specificDate])).sort() } }));
              setSpecificDate('');
            }}>{text.addDate}</Button></div>
            <div className="flex flex-wrap gap-2">{form.recurrence.specificDates.map((date) => <button type="button" key={date} className="min-h-10 rounded-full border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => setForm((current) => ({ ...current, recurrence: { ...current.recurrence, specificDates: current.recurrence.specificDates.filter((item) => item !== date) } }))}>{date} ×</button>)}</div>
          </div> : null}
        </div> : null}
      </section> : null}

      {step === 'review' ? <section aria-labelledby="process-review-heading" className="space-y-4">
        <StepIntro ref={stepHeadingRef} id="process-review-heading" title={text.review} description={text.reviewDescription} />
        <ReviewSection title={text.generalInformation} editLabel={text.edit} onEdit={() => selectStep('identity')}>
          <IndiceModalSummary
            columns={2}
            title={form.title}
            description={form.description}
            variant="accent"
            items={[
              { label: text.processType, value: form.distributionMode === 'shared' ? text.shared : text.individual },
              { label: text.coordinator, value: form.coordinator },
              { label: copy?.form.labels.priority ?? 'Priority', value: copy?.priorities[form.priority] ?? form.priority },
              { label: `${copy?.form.labels.unit ?? 'Unit'} / ${copy?.form.labels.business ?? 'Business'}`, value: [form.unit, form.business].filter(Boolean).join(' · ') || '—' },
            ]}
          />
        </ReviewSection>
        <ReviewSection title={text.taskPlan} editLabel={text.edit} onEdit={() => selectStep('tasks')}>
          <div className="space-y-2">
            {form.taskTemplates.map((task, index) => <div key={task.id ?? index} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <strong className="block truncate text-sm">{index + 1}. {task.title || '—'}</strong>
                <small className="mt-1 block text-slate-500">{task.assigneeUserCompanyIds.map((id) => collaboratorOptions.find((person) => person.userCompanyId === id)?.name).filter(Boolean).join(', ') || '—'}</small>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                {form.organizationMode === 'staged' ? <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{text.stage} {task.stage}</span> : null}
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">{text.day} +{task.scheduledOffsetDays}</span>
                <span>{text.dueDay} +{task.scheduledOffsetDays + task.deadlineOffsetDays}</span>
              </div>
            </div>)}
          </div>
        </ReviewSection>
        <ReviewSection title={text.organization} editLabel={text.edit} onEdit={() => selectStep('organization')}>
          <IndiceModalSummary columns={2} items={[
            { label: text.organizationMode, value: text[form.organizationMode] },
            { label: text.includeWeekends, value: form.includeWeekends ? text.yes : text.no },
          ]} />
        </ReviewSection>
        <ReviewSection title={text.schedule} editLabel={text.edit} onEdit={() => selectStep('schedule')}>
          <IndiceModalSummary columns={2} items={form.activationMode === 'recurring' ? [
            { label: text.activation, value: text.recurring },
            { label: text.frequency, value: copy?.frequencies[form.frequency] ?? form.frequency },
            { label: text.start, value: form.startDate || '—' },
            { label: text.end, value: form.endDate || text.noEndDate },
          ] : [
            { label: text.activation, value: text.occasional },
            { label: text.start, value: text.occasionalHelp },
          ]} />
        </ReviewSection>
      </section> : null}
    </form>}
  </IndiceModalFrame>;
}

function StepIntro({
  id,
  title,
  description,
  ref,
}: {
  id: string;
  title: string;
  description: string;
  ref: React.Ref<HTMLHeadingElement>;
}) {
  return <div>
    <h2 ref={ref} id={id} tabIndex={-1} className="text-lg font-medium text-slate-950 outline-none dark:text-white">{title}</h2>
    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
  </div>;
}

function Field({ className, label, children }: { className?: string; label: string; children: ReactNode }) {
  return <div className={cn('space-y-2', className)}><label className="text-sm font-medium">{label}</label>{children}</div>;
}

function DecisionCards({
  columns = 2,
  label,
  value,
  onChange,
  options,
}: {
  columns?: 2 | 3;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description: string; icon: ReactNode }>;
}) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium">{label}</legend>
    <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-1 gap-3', columns === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2')}>
      {options.map((option) => {
        const selected = option.value === value;
        return <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          className={cn(
            'relative min-h-24 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
            selected
              ? 'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-700 dark:bg-amber-950/30'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
          )}
          onClick={() => onChange(option.value)}
        >
          <span className="flex items-start gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{option.icon}</span>
            <span className="min-w-0 flex-1 pr-5">
              <strong className="block text-sm text-slate-950 dark:text-white">{option.label}</strong>
              <small className="mt-1 block leading-5 text-slate-500 dark:text-slate-400">{option.description}</small>
            </span>
            <span className={cn('absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border', selected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600')}>
              {selected ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
          </span>
        </button>;
      })}
    </div>
  </fieldset>;
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <Field label={label}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent>
    </Select>
  </Field>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <Field label={label}><Input className="h-11" type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} /></Field>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><Input className="h-11" type="date" value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function TaskIconButton({ label, disabled, destructive = false, onClick, children }: { label: string; disabled?: boolean; destructive?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} className={cn(
    'flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-900 dark:hover:text-white [&_svg]:h-4 [&_svg]:w-4',
    destructive && 'hover:text-red-600 dark:hover:text-red-400',
  )} onClick={onClick}>{children}</button>;
}

function StatusPill({ ready, readyLabel, pendingLabel }: { ready: boolean; readyLabel: string; pendingLabel: string }) {
  return <span className={cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
    ready ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  )}>
    {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
    {ready ? readyLabel : pendingLabel}
  </span>;
}

function TimelinePreview({ form, text }: { form: ProcessFormState; text: ReturnType<typeof labels> }) {
  const sortedTasks = [...form.taskTemplates].sort((left, right) => left.scheduledOffsetDays - right.scheduledOffsetDays);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-950 dark:text-white">{text.automaticDates}</p>
      <span className="text-xs text-slate-500">{form.includeWeekends ? text.includeWeekends : text.weekendsHelp}</span>
    </div>
    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
      {sortedTasks.map((task, index) => <div key={task.id ?? index} className="min-w-44 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{text.day} +{task.scheduledOffsetDays}</span>
        <strong className="mt-1 block truncate text-sm">{task.title || `${text.task} ${index + 1}`}</strong>
        <small className="mt-2 block text-slate-500">{text.dueDay} +{task.scheduledOffsetDays + task.deadlineOffsetDays}</small>
      </div>)}
    </div>
  </div>;
}

function ReviewSection({ title, editLabel, onEdit, children }: { title: string; editLabel: string; onEdit: () => void; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
      <h3 className="text-sm font-medium text-slate-950 dark:text-white">{title}</h3>
      <Button type="button" variant="ghost" className="h-10" onClick={onEdit}>{editLabel}</Button>
    </div>
    <div className="p-3">{children}</div>
  </section>;
}

function DiscardChangesView({ text }: { text: ReturnType<typeof labels> }) {
  return <div className="flex min-h-72 items-center justify-center py-6">
    <div className="max-w-md text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300"><AlertTriangle className="h-8 w-8" /></span>
      <h2 className="mt-5 text-xl font-medium text-slate-950 dark:text-white">{text.discardTitle}</h2>
      <p className="mt-2 leading-6 text-slate-500 dark:text-slate-400">{text.discardDescription}</p>
    </div>
  </div>;
}
