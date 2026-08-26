import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { CalendarDays, ClipboardList, Pencil, Plus, Save, UserRound } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { useLanguage } from '../../../../shared/context';
import { defaultAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';
import { ProgressSlider } from '../../shared/ProgressSlider';
import {
  TaskAssigneeSelector,
  type TaskAssigneeSelection,
  type TaskAssigneeSelectorOption,
} from '../../shared/TaskAssigneeSelector';
import {
  collaboratorCanReceiveAssignment,
  filterBusinessesForActor,
  filterUnitsForActor,
  resolveCollaboratorAssignmentScope,
} from '../../shared/assignmentScope';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessRecord,
  ProcessUnitOption,
} from '../../Processes/types';
import type { ProjectRecord } from '../../Projects/projectsApi';
import type { TaskPriority, TaskStatus } from '../tasksApi';

export interface TaskFormValues {
  title: string;
  description: string;
  processId: string;
  projectId: string;
  assignedUserCompanyId: string;
  assigneeUserCompanyIds: string[];
  assignedName: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  notes: string;
  completionPercent: string;
  weighting: string;
  audited: boolean;
  auditNotes: string;
  businessId: string;
  unitId: string;
}

interface TaskFormDialogProps {
  copy?: AgendaTranslations;
  form: TaskFormValues;
  isSubmitting: boolean;
  layout?: 'full' | 'quickCreate';
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  businessOptions: ProcessBusinessOption[];
  collaboratorOptions: ProcessCollaboratorOption[];
  processes: ProcessRecord[];
  projects: ProjectRecord[];
  setForm: Dispatch<SetStateAction<TaskFormValues>>;
  unitOptions: ProcessUnitOption[];
  currentUserCollaborator?: ProcessCollaboratorOption | null;
  error?: string | null;
}

const statusOptionValues: TaskStatus[] = ['pending', 'in_progress', 'paused', 'completed', 'cancelled'];
const priorityOptionValues: TaskPriority[] = ['low', 'medium', 'high'];

const NONE_VALUE = '__none__';

function entityValue(prefix: string, id: number) {
  return `${prefix}:${id}`;
}

function numericFormValue(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatFormDate(value: string, locale: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day));
}

function QuickCreateSectionHeader({
  icon,
  separated = false,
  title,
}: {
  icon: ReactNode;
  separated?: boolean;
  title: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 md:col-span-6 ${
        separated ? 'mt-1 border-t border-slate-200 pt-5 dark:border-slate-700' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F8C842]/20 text-[#8A6200] dark:bg-[#F8C842]/15 dark:text-[#F8C842]"
      >
        {icon}
      </span>
      <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">{title}</h3>
    </div>
  );
}

function SelectField<T extends string>({
  className,
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
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

export function TaskFormDialog({
  businessOptions,
  collaboratorOptions,
  copy = defaultAgendaTranslations,
  form,
  isSubmitting,
  layout = 'full',
  mode,
  onOpenChange,
  onSubmit,
  open,
  projects,
  setForm,
  unitOptions,
  currentUserCollaborator = null,
  error = null,
  processes,
}: TaskFormDialogProps) {
  const { currentLanguage } = useLanguage();
  const formCopy = copy.form;
  const isQuickCreate = layout === 'quickCreate' && mode === 'create';
  const title = formCopy.titles[mode];
  const description = isQuickCreate ? formCopy.quickCreate.description : formCopy.descriptions[mode];
  const submitLabel = formCopy.submit[mode];
  const statusOptions = statusOptionValues
    .filter((value) => !['completed', 'cancelled'].includes(value) || value === form.status)
    .map((value) => ({ value, label: copy.statuses[value] }));
  const priorityOptions = priorityOptionValues.map((value) => ({ value, label: copy.priorities[value] }));
  const hasValidDateRange = !form.startDate || !form.dueDate || form.startDate <= form.dueDate;
  const selectedUnitId = numericFormValue(form.unitId);
  const selectedBusinessId = numericFormValue(form.businessId);
  const selectedAssignedUserCompanyId = numericFormValue(form.assignedUserCompanyId);
  const hasResponsible = selectedAssignedUserCompanyId != null;
  const isFormValid = Boolean(form.title.trim()) && hasValidDateRange && hasResponsible;
  const selectedProjectId = numericFormValue(form.projectId);
  const selectedProcessId = numericFormValue(form.processId);
  const selectedProjectValue =
    selectedProjectId != null && projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId.toString()
      : NONE_VALUE;
  const selectedProcessValue =
    selectedProcessId != null && processes.some((process) => process.id === selectedProcessId)
      ? selectedProcessId.toString()
      : NONE_VALUE;
  const actorScope = resolveCollaboratorAssignmentScope(currentUserCollaborator);
  const scopedUnitOptions = filterUnitsForActor(unitOptions, businessOptions, actorScope);
  const actorBusinessOptions = filterBusinessesForActor(businessOptions, actorScope);
  const canUseCompanyWideScope = !actorScope || actorScope.level === 'corporate';
  const canUseUnitOnlyScope = !actorScope || actorScope.level !== 'business';

  const selectedUnitValue = selectedUnitId != null ? entityValue('unit', selectedUnitId) : NONE_VALUE;
  const unitSelectOptions = [
    ...(canUseCompanyWideScope ? [{ value: NONE_VALUE, label: formCopy.empty.unit }] : []),
    ...scopedUnitOptions.map((option) => ({
      value: entityValue('unit', option.id),
      label: option.name,
    })),
  ];
  if (selectedUnitId != null && !scopedUnitOptions.some((option) => option.id === selectedUnitId)) {
    unitSelectOptions.push({
      value: entityValue('unit', selectedUnitId),
      label: `${formCopy.labels.unit} #${selectedUnitId} (${copy.common.legacy})`,
    });
  }

  const selectedBusinessValue =
    selectedBusinessId != null ? entityValue('business', selectedBusinessId) : NONE_VALUE;
  const filteredBusinessOptions =
    selectedUnitId != null
      ? actorBusinessOptions.filter((option) => option.unitId == null || option.unitId === selectedUnitId)
      : actorBusinessOptions;
  const businessSelectOptions = [
    ...(canUseUnitOnlyScope ? [{ value: NONE_VALUE, label: formCopy.empty.business }] : []),
    ...filteredBusinessOptions.map((option) => ({
      value: entityValue('business', option.id),
      label: option.name,
    })),
  ];
  if (
    selectedBusinessId != null &&
    !filteredBusinessOptions.some((option) => option.id === selectedBusinessId)
  ) {
    businessSelectOptions.push({
      value: entityValue('business', selectedBusinessId),
      label: `${formCopy.labels.business} #${selectedBusinessId} (${copy.common.legacy})`,
    });
  }

  const scopedCollaboratorOptions = collaboratorOptions.filter((option) =>
    collaboratorCanReceiveAssignment(option, selectedUnitId, selectedBusinessId, businessOptions),
  );
  const currentUserCompanyId = currentUserCollaborator?.userCompanyId ?? null;
  const selectedAssigneeIds = Array.from(new Set([
    ...(selectedAssignedUserCompanyId != null ? [selectedAssignedUserCompanyId] : []),
    ...form.assigneeUserCompanyIds.map(Number).filter((value) => Number.isInteger(value) && value > 0),
  ]));
  const isSpanish = currentLanguage.code.startsWith('es');
  const teamCopy = isSpanish
    ? {
        title: '¿Quién realizará la tarea?',
        hint: 'Elige una o dos personas. También puedes seleccionarte a ti; si no lo haces, la tarea quedará solo en Delegadas por mí.',
        selected: (count: number, max: number) => `${count} de ${max} seleccionados`,
        lead: 'Responsable principal',
        makeLead: 'Hacer responsable principal',
        limit: (max: number) => `Máximo ${max} personas`,
        you: 'Tú',
        responsibleRequired: 'Selecciona a la persona responsable principal para continuar.',
      }
    : {
        title: 'Who will perform the task?',
        hint: 'Choose one or two people. You can also select yourself; otherwise the task remains only under Delegated by me.',
        selected: (count: number, max: number) => `${count} of ${max} selected`,
        lead: 'Primary responsible person',
        makeLead: 'Make primary responsible',
        limit: (max: number) => `Maximum ${max} people`,
        you: 'You',
        responsibleRequired: 'Select the primary responsible person to continue.',
      };
  const assigneeSelectorOptions: TaskAssigneeSelectorOption[] = scopedCollaboratorOptions.map((option) => ({
    email: option.email,
    name: option.name,
    userCompanyId: option.userCompanyId,
  }));
  selectedAssigneeIds.forEach((userCompanyId) => {
    if (assigneeSelectorOptions.some((option) => option.userCompanyId === userCompanyId)) return;
    const collaborator = collaboratorOptions.find((option) => option.userCompanyId === userCompanyId);
    assigneeSelectorOptions.push({
      email: collaborator?.email ?? null,
      name: collaborator?.name ?? (userCompanyId === selectedAssignedUserCompanyId && form.assignedName
        ? form.assignedName
        : `User #${userCompanyId}`),
      userCompanyId,
    });
  });
  assigneeSelectorOptions.sort((left, right) => {
    if (left.userCompanyId === currentUserCompanyId) return -1;
    if (right.userCompanyId === currentUserCompanyId) return 1;
    return left.name.localeCompare(right.name, currentLanguage.code);
  });

  const updateUnit = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        return {
          ...currentForm,
          unitId: '',
          businessId: '',
        };
      }

      const unitId = Number(value.replace('unit:', ''));
      const selectedUnit = scopedUnitOptions.find((option) => option.id === unitId);
      if (!selectedUnit) {
        return currentForm;
      }

      const currentBusinessId = numericFormValue(currentForm.businessId);
      const currentBusiness = actorBusinessOptions.find((option) => option.id === currentBusinessId);
      const businessBelongsToUnit =
        !currentBusiness || currentBusiness.unitId == null || currentBusiness.unitId === selectedUnit.id;
      const nextBusinessId = businessBelongsToUnit ? currentBusinessId : null;
      const currentAssignedUserCompanyId = numericFormValue(currentForm.assignedUserCompanyId);
      const currentAssignedUser = collaboratorOptions.find(
        (option) => option.userCompanyId === currentAssignedUserCompanyId,
      );
      const assignedBelongsToScope =
        !currentAssignedUser ||
        collaboratorCanReceiveAssignment(currentAssignedUser, selectedUnit.id, nextBusinessId, businessOptions);
      const scopedAssigneeIds = currentForm.assigneeUserCompanyIds.filter((candidateId) => {
        const candidate = collaboratorOptions.find((option) => option.userCompanyId === Number(candidateId));
        return Boolean(
          candidate && collaboratorCanReceiveAssignment(candidate, selectedUnit.id, nextBusinessId, businessOptions),
        );
      });

      return {
        ...currentForm,
        unitId: selectedUnit.id.toString(),
        businessId: businessBelongsToUnit ? currentForm.businessId : '',
        assignedUserCompanyId: assignedBelongsToScope ? currentForm.assignedUserCompanyId : '',
        assignedName: assignedBelongsToScope ? currentForm.assignedName : '',
        assigneeUserCompanyIds: assignedBelongsToScope
          ? Array.from(new Set([currentForm.assignedUserCompanyId, ...scopedAssigneeIds].filter(Boolean)))
          : scopedAssigneeIds,
      };
    });
  };

  const updateBusiness = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        const currentUnitId = numericFormValue(currentForm.unitId);
        const currentAssignedUserCompanyId = numericFormValue(currentForm.assignedUserCompanyId);
        const currentAssignedUser = collaboratorOptions.find(
          (option) => option.userCompanyId === currentAssignedUserCompanyId,
        );
        const assignedBelongsToScope =
          !currentAssignedUser ||
          collaboratorCanReceiveAssignment(currentAssignedUser, currentUnitId, null, businessOptions);
        const scopedAssigneeIds = currentForm.assigneeUserCompanyIds.filter((candidateId) => {
          const candidate = collaboratorOptions.find((option) => option.userCompanyId === Number(candidateId));
          return Boolean(candidate && collaboratorCanReceiveAssignment(candidate, currentUnitId, null, businessOptions));
        });

        return {
          ...currentForm,
          businessId: '',
          assignedUserCompanyId: assignedBelongsToScope ? currentForm.assignedUserCompanyId : '',
          assignedName: assignedBelongsToScope ? currentForm.assignedName : '',
          assigneeUserCompanyIds: assignedBelongsToScope
            ? Array.from(new Set([currentForm.assignedUserCompanyId, ...scopedAssigneeIds].filter(Boolean)))
            : scopedAssigneeIds,
        };
      }

      const businessId = Number(value.replace('business:', ''));
      const selectedBusiness = actorBusinessOptions.find((option) => option.id === businessId);
      if (!selectedBusiness) {
        return currentForm;
      }

      const owningUnit = selectedBusiness.unitId
        ? scopedUnitOptions.find((option) => option.id === selectedBusiness.unitId)
        : null;
      const nextUnitId = owningUnit?.id ?? numericFormValue(currentForm.unitId);
      const currentAssignedUserCompanyId = numericFormValue(currentForm.assignedUserCompanyId);
      const currentAssignedUser = collaboratorOptions.find(
        (option) => option.userCompanyId === currentAssignedUserCompanyId,
      );
      const assignedBelongsToScope =
        !currentAssignedUser ||
        collaboratorCanReceiveAssignment(currentAssignedUser, nextUnitId, selectedBusiness.id, businessOptions);
      const scopedAssigneeIds = currentForm.assigneeUserCompanyIds.filter((candidateId) => {
        const candidate = collaboratorOptions.find((option) => option.userCompanyId === Number(candidateId));
        return Boolean(
          candidate && collaboratorCanReceiveAssignment(candidate, nextUnitId, selectedBusiness.id, businessOptions),
        );
      });

      return {
        ...currentForm,
        businessId: selectedBusiness.id.toString(),
        unitId: nextUnitId != null ? nextUnitId.toString() : currentForm.unitId,
        assignedUserCompanyId: assignedBelongsToScope ? currentForm.assignedUserCompanyId : '',
        assignedName: assignedBelongsToScope ? currentForm.assignedName : '',
        assigneeUserCompanyIds: assignedBelongsToScope
          ? Array.from(new Set([currentForm.assignedUserCompanyId, ...scopedAssigneeIds].filter(Boolean)))
          : scopedAssigneeIds,
      };
    });
  };

  const updateAssigneeSelection = ({
    leadUserCompanyId,
    userCompanyIds,
  }: TaskAssigneeSelection) => {
    const lead = leadUserCompanyId == null
      ? null
      : assigneeSelectorOptions.find((option) => option.userCompanyId === leadUserCompanyId) ?? null;

    setForm((currentForm) => ({
      ...currentForm,
      assignedUserCompanyId: leadUserCompanyId?.toString() ?? '',
      assignedName: lead?.name ?? '',
      assigneeUserCompanyIds: userCompanyIds.map(String),
    }));
  };

  const quickCreateSummary = !form.title.trim()
    ? formCopy.quickCreate.hints.titleRequired
    : !hasValidDateRange
      ? formCopy.quickCreate.hints.invalidDateRange
      : [
          form.assigneeUserCompanyIds.length > 1
            ? `${form.assignedName} + ${form.assigneeUserCompanyIds.length - 1}`
            : form.assignedName || formCopy.quickCreate.summary.unassigned,
          form.dueDate
            ? formCopy.quickCreate.summary.due(
                formatFormDate(form.dueDate, currentLanguage.code),
              )
            : formCopy.quickCreate.summary.noDueDate,
          copy.priorities[form.priority],
        ].join(' · ');

  return (
    <IndiceModalFrame
      open={open}
      onOpenChange={onOpenChange}
      busy={isSubmitting}
      closeLabel={copy.common.close}
      modalType="standard-form"
      tone="yellow"
      icon={mode === 'create' ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
      title={title}
      description={description}
      eyebrow={isQuickCreate ? formCopy.quickCreate.eyebrow : undefined}
      contentClassName={isQuickCreate ? 'h-[min(88vh,800px)]' : 'h-[min(88vh,820px)]'}
      bodyClassName={isQuickCreate ? 'py-4' : undefined}
      footerSummary={isQuickCreate ? quickCreateSummary : undefined}
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            {copy.common.cancel}
          </Button>
          <Button
            type="submit"
            form="process-task-form"
            className="w-full sm:w-auto"
            disabled={!isFormValid || isSubmitting}
          >
            {mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSubmitting ? copy.common.saving : submitLabel}
          </Button>
        </>
      )}
    >
        <form id="process-task-form" onSubmit={onSubmit} className={isQuickCreate ? 'space-y-4' : 'space-y-6'}>
          <IndiceModalValidation
            messages={[
              ...(error ? [error] : []),
              ...(!hasValidDateRange
                ? [formCopy.quickCreate.hints.invalidDateRange]
                : []),
              ...(!hasResponsible ? [teamCopy.responsibleRequired] : []),
            ]}
          />
            <div className={`grid grid-cols-1 gap-4 ${isQuickCreate ? 'md:grid-cols-6' : 'md:grid-cols-2'}`}>
              {isQuickCreate ? (
                <QuickCreateSectionHeader
                  icon={<ClipboardList className="h-4 w-4" />}
                  title={formCopy.quickCreate.sections.work}
                />
              ) : null}

              <div className={`space-y-2 ${isQuickCreate ? 'md:col-span-6' : 'md:col-span-2'}`}>
                <label htmlFor="task-form-title" className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.title}</label>
                <Input
                  id="task-form-title"
                  autoFocus={isQuickCreate}
                  required
                  aria-describedby={isQuickCreate ? 'task-form-title-hint' : undefined}
                  value={form.title}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder={formCopy.placeholders.title}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
                {isQuickCreate ? (
                  <p id="task-form-title-hint" className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {formCopy.quickCreate.hints.title}
                  </p>
                ) : null}
              </div>

              <div className={`space-y-2 ${isQuickCreate ? 'md:col-span-6' : 'md:col-span-2'}`}>
                <label htmlFor="task-form-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.description}</label>
                <Textarea
                  id="task-form-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder={formCopy.placeholders.description}
                  className={`${isQuickCreate ? 'min-h-[84px]' : 'min-h-[120px]'} rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100`}
                />
              </div>

              {isQuickCreate ? (
                <QuickCreateSectionHeader
                  separated
                  icon={<CalendarDays className="h-4 w-4" />}
                  title={formCopy.quickCreate.sections.planning}
                />
              ) : null}

              {!isQuickCreate ? (
                <SelectField
                  label={formCopy.labels.status}
                  value={form.status}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, status: value }))}
                  options={statusOptions}
                />
              ) : null}
              <SelectField
                className={isQuickCreate ? 'md:col-span-2' : undefined}
                label={formCopy.labels.priority}
                value={form.priority}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, priority: value }))}
                options={priorityOptions}
              />

              <div className={isQuickCreate ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
                <label htmlFor="task-form-start-date" className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.startDate}</label>
                <Input
                  id="task-form-start-date"
                  type="date"
                  value={form.startDate}
                  max={form.dueDate || undefined}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className={isQuickCreate ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
                <label htmlFor="task-form-due-date" className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.dueDate}</label>
                <Input
                  id="task-form-due-date"
                  type="date"
                  value={form.dueDate}
                  min={form.startDate || undefined}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              {isQuickCreate ? (
                <p className="-mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 md:col-span-6">
                  {formCopy.quickCreate.hints.dates}
                </p>
              ) : null}

              {!isQuickCreate ? (
                <div className="space-y-2">
                  <ProgressSlider
                    value={Number(form.completionPercent || 0)}
                    label={formCopy.labels.completion}
                    onChange={(completionPercent) =>
                      setForm((currentForm) => ({ ...currentForm, completionPercent: String(completionPercent) }))
                    }
                  />
                </div>
              ) : null}

              {!isQuickCreate ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.process}</label>
                    <Select
                      value={selectedProcessValue}
                      onValueChange={(value) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          processId: value === NONE_VALUE ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                        <SelectValue placeholder={formCopy.placeholders.process} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{formCopy.empty.process}</SelectItem>
                        {processes.map((process) => (
                          <SelectItem key={process.id} value={process.id.toString()}>
                            {process.folio} - {process.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.project}</label>
                    <Select
                      value={selectedProjectValue}
                      onValueChange={(value) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          projectId: value === NONE_VALUE ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                        <SelectValue placeholder={formCopy.placeholders.project} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{formCopy.empty.project}</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.folio} - {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}

              {isQuickCreate ? (
                <QuickCreateSectionHeader
                  separated
                  icon={<UserRound className="h-4 w-4" />}
                  title={formCopy.quickCreate.sections.assignment}
                />
              ) : null}

              <div className={isQuickCreate ? 'space-y-2 md:col-span-3' : 'space-y-2'}>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.unit}</label>
                <Select value={selectedUnitValue} onValueChange={updateUnit}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={formCopy.placeholders.unit} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={isQuickCreate ? 'space-y-2 md:col-span-3' : 'space-y-2'}>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.business}</label>
                <Select value={selectedBusinessValue} onValueChange={updateBusiness}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={formCopy.placeholders.business} />
                  </SelectTrigger>
                  <SelectContent>
                    {businessSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={`space-y-3 ${isQuickCreate ? 'md:col-span-6' : 'md:col-span-2'}`}>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{teamCopy.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{teamCopy.hint}</p>
                </div>
                <TaskAssigneeSelector
                  copy={teamCopy}
                  currentUserCompanyId={currentUserCompanyId}
                  disabled={isSubmitting}
                  leadUserCompanyId={selectedAssignedUserCompanyId}
                  maxSelections={2}
                  onChange={updateAssigneeSelection}
                  options={assigneeSelectorOptions}
                  selectedUserCompanyIds={selectedAssigneeIds}
                />
              </div>

              {!isQuickCreate ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.notes}</label>
                  <Textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        notes: event.target.value,
                      }))
                    }
                    placeholder={formCopy.placeholders.notes}
                    className="min-h-[96px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              ) : null}

            </div>
        </form>
    </IndiceModalFrame>
  );
}
