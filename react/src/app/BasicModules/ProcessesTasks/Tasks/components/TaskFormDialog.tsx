import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Pencil, Plus, Save } from 'lucide-react';
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
import { defaultAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';
import { ProgressSlider } from '../../shared/ProgressSlider';
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

function legacyValue(prefix: string, label: string) {
  return `${prefix}:legacy:${label}`;
}

function numericFormValue(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="space-y-2">
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
  const formCopy = copy.form;
  const title = formCopy.titles[mode];
  const description = formCopy.descriptions[mode];
  const submitLabel = formCopy.submit[mode];
  const statusOptions = statusOptionValues
    .filter((value) => !['completed', 'cancelled'].includes(value) || value === form.status)
    .map((value) => ({ value, label: copy.statuses[value] }));
  const priorityOptions = priorityOptionValues.map((value) => ({ value, label: copy.priorities[value] }));
  const hasValidDateRange = !form.startDate || !form.dueDate || form.startDate <= form.dueDate;
  const isFormValid = Boolean(form.title.trim()) && hasValidDateRange;
  const isQuickCreate = layout === 'quickCreate' && mode === 'create';
  const selectedUnitId = numericFormValue(form.unitId);
  const selectedBusinessId = numericFormValue(form.businessId);
  const selectedAssignedUserCompanyId = numericFormValue(form.assignedUserCompanyId);
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

  const selectedAssignedValue =
    selectedAssignedUserCompanyId != null
      ? entityValue('user-company', selectedAssignedUserCompanyId)
      : form.assignedName
        ? legacyValue('assigned', form.assignedName)
        : NONE_VALUE;
  const scopedCollaboratorOptions = collaboratorOptions.filter((option) =>
    collaboratorCanReceiveAssignment(option, selectedUnitId, selectedBusinessId, businessOptions),
  );
  const collaboratorSelectOptions = [
    { value: NONE_VALUE, label: formCopy.empty.responsible },
    ...scopedCollaboratorOptions.map((option) => ({
      value: entityValue('user-company', option.userCompanyId),
      label: option.email ? `${option.name} · ${option.email}` : option.name,
    })),
  ];
  if (
    selectedAssignedUserCompanyId != null &&
    !scopedCollaboratorOptions.some((option) => option.userCompanyId === selectedAssignedUserCompanyId)
  ) {
    collaboratorSelectOptions.push({
      value: entityValue('user-company', selectedAssignedUserCompanyId),
      label: `${form.assignedName || `User #${selectedAssignedUserCompanyId}`} (${copy.common.legacy})`,
    });
  }
  if (
    form.assignedName &&
    selectedAssignedUserCompanyId == null &&
    !scopedCollaboratorOptions.some((option) => normalizeText(option.name) === normalizeText(form.assignedName))
  ) {
    collaboratorSelectOptions.push({
      value: legacyValue('assigned', form.assignedName),
      label: `${form.assignedName} (${copy.common.legacy})`,
    });
  }

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

      return {
        ...currentForm,
        unitId: selectedUnit.id.toString(),
        businessId: businessBelongsToUnit ? currentForm.businessId : '',
        assignedUserCompanyId: assignedBelongsToScope ? currentForm.assignedUserCompanyId : '',
        assignedName: assignedBelongsToScope ? currentForm.assignedName : '',
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

        return {
          ...currentForm,
          businessId: '',
          assignedUserCompanyId: assignedBelongsToScope ? currentForm.assignedUserCompanyId : '',
          assignedName: assignedBelongsToScope ? currentForm.assignedName : '',
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

      return {
        ...currentForm,
        businessId: selectedBusiness.id.toString(),
        unitId: nextUnitId != null ? nextUnitId.toString() : currentForm.unitId,
        assignedUserCompanyId: assignedBelongsToScope ? currentForm.assignedUserCompanyId : '',
        assignedName: assignedBelongsToScope ? currentForm.assignedName : '',
      };
    });
  };

  const updateAssignedUser = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        return {
          ...currentForm,
          assignedUserCompanyId: '',
          assignedName: '',
        };
      }

      const userCompanyId = Number(value.replace('user-company:', ''));
      const selectedCollaborator = collaboratorOptions.find(
        (option) => option.userCompanyId === userCompanyId,
      );
      if (!selectedCollaborator) {
        return currentForm;
      }

      return {
        ...currentForm,
        assignedUserCompanyId: selectedCollaborator.userCompanyId.toString(),
        assignedName: selectedCollaborator.name,
      };
    });
  };

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
      contentClassName={isQuickCreate ? 'h-[min(82vh,720px)]' : 'h-[min(88vh,820px)]'}
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
        <form id="process-task-form" onSubmit={onSubmit} className="space-y-6">
          <IndiceModalValidation
            messages={[
              ...(error ? [error] : []),
              ...(!hasValidDateRange
                ? [`${formCopy.labels.dueDate}: ${formCopy.labels.startDate}`]
                : []),
            ]}
          />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.title}</label>
                <Input
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
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{formCopy.labels.description}</label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder={formCopy.placeholders.description}
                  className={`${isQuickCreate ? 'min-h-[96px]' : 'min-h-[120px]'} rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100`}
                />
              </div>

              {!isQuickCreate ? (
                <SelectField
                  label={formCopy.labels.status}
                  value={form.status}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, status: value }))}
                  options={statusOptions}
                />
              ) : null}
              <SelectField
                label={formCopy.labels.priority}
                value={form.priority}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, priority: value }))}
                options={priorityOptions}
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.startDate}</label>
                <Input
                  type="date"
                  value={form.startDate}
                  max={form.dueDate || undefined}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.dueDate}</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  min={form.startDate || undefined}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

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
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.process}</label>
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
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.project}</label>
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.unit}</label>
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
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.business}</label>
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
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.responsible}</label>
                <Select value={selectedAssignedValue} onValueChange={updateAssignedUser}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={formCopy.placeholders.responsible} />
                  </SelectTrigger>
                  <SelectContent>
                    {collaboratorSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isQuickCreate ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.notes}</label>
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
