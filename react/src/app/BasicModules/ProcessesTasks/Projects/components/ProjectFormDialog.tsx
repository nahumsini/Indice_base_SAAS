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
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessUnitOption,
} from '../../Processes/types';
import { collaboratorCanOwnScopedRecord } from '../../shared/assignmentScope';
import type { ProjectPriority, ProjectStatus } from '../projectsApi';
import { defaultProjectsTranslations, type ProjectsTranslations } from '../translations';

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority | 'none';
  ownerUserCompanyId: string;
  ownerName: string;
  businessId: string;
  unitId: string;
  startDate: string;
  dueDate: string;
}

interface ProjectFormDialogProps {
  businessOptions: ProcessBusinessOption[];
  collaboratorOptions: ProcessCollaboratorOption[];
  copy?: ProjectsTranslations;
  error?: string | null;
  form: ProjectFormValues;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  setForm: Dispatch<SetStateAction<ProjectFormValues>>;
  unitOptions: ProcessUnitOption[];
}

const statusOptionValues: ProjectStatus[] = ['active', 'paused', 'completed', 'cancelled'];
const priorityOptionValues: Array<ProjectPriority | 'none'> = ['none', 'low', 'medium', 'high'];

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

function isHeadquarterUnitName(name?: string | null) {
  const normalized = normalizeText(name).replace(/\s+/g, ' ');
  return normalized === 'headquarter' || normalized === 'headquarters' || normalized === 'headquater';
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

export function ProjectFormDialog({
  businessOptions,
  collaboratorOptions,
  copy = defaultProjectsTranslations,
  error,
  form,
  isSubmitting,
  mode,
  onOpenChange,
  onSubmit,
  open,
  setForm,
  unitOptions,
}: ProjectFormDialogProps) {
  const formCopy = copy.form;
  const title = formCopy.titles[mode];
  const submitLabel = formCopy.submit[mode];
  const statusOptions = statusOptionValues.map((value) => ({ value, label: copy.statuses[value] }));
  const priorityOptions = priorityOptionValues.map((value) => ({
    value,
    label: value === 'none' ? copy.priorities.none : copy.priorities[value],
  }));
  const hasValidDateRange = !form.startDate || !form.dueDate || form.startDate <= form.dueDate;
  const isFormValid = Boolean(form.name.trim()) && hasValidDateRange;
  const selectedUnitId = numericFormValue(form.unitId);
  const selectedBusinessId = numericFormValue(form.businessId);
  const selectedOwnerUserCompanyId = numericFormValue(form.ownerUserCompanyId);
  const headquarterUnitIds = new Set(
    unitOptions.filter((option) => isHeadquarterUnitName(option.name)).map((option) => option.id),
  );

  const selectedUnitValue = selectedUnitId != null ? entityValue('unit', selectedUnitId) : NONE_VALUE;
  const unitSelectOptions = [
    { value: NONE_VALUE, label: formCopy.empty.unit },
    ...unitOptions.map((option) => ({
      value: entityValue('unit', option.id),
      label: option.name,
    })),
  ];
  if (selectedUnitId != null && !unitOptions.some((option) => option.id === selectedUnitId)) {
    unitSelectOptions.push({
      value: entityValue('unit', selectedUnitId),
      label: `${formCopy.labels.unit} #${selectedUnitId} (${copy.common.legacy})`,
    });
  }

  const selectedBusinessValue =
    selectedBusinessId != null ? entityValue('business', selectedBusinessId) : NONE_VALUE;
  const filteredBusinessOptions =
    selectedUnitId != null
      ? businessOptions.filter((option) => option.unitId == null || option.unitId === selectedUnitId)
      : businessOptions;
  const businessSelectOptions = [
    { value: NONE_VALUE, label: formCopy.empty.business },
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

  const selectedOwnerValue =
    selectedOwnerUserCompanyId != null
      ? entityValue('user-company', selectedOwnerUserCompanyId)
      : form.ownerName
        ? legacyValue('owner', form.ownerName)
        : NONE_VALUE;
  const scopedCollaboratorOptions = collaboratorOptions.filter((option) =>
    collaboratorCanOwnScopedRecord(option, selectedUnitId, selectedBusinessId, headquarterUnitIds, businessOptions),
  );
  const ownerSelectOptions = [
    { value: NONE_VALUE, label: formCopy.empty.owner },
    ...scopedCollaboratorOptions.map((option) => ({
      value: entityValue('user-company', option.userCompanyId),
      label: option.email ? `${option.name} · ${option.email}` : option.name,
    })),
  ];
  if (
    selectedOwnerUserCompanyId != null &&
    !scopedCollaboratorOptions.some((option) => option.userCompanyId === selectedOwnerUserCompanyId)
  ) {
    ownerSelectOptions.push({
      value: entityValue('user-company', selectedOwnerUserCompanyId),
      label: `${form.ownerName || `${formCopy.labels.owner} #${selectedOwnerUserCompanyId}`} (${copy.common.legacy})`,
    });
  }
  if (
    form.ownerName &&
    selectedOwnerUserCompanyId == null &&
    !scopedCollaboratorOptions.some((option) => normalizeText(option.name) === normalizeText(form.ownerName))
  ) {
    ownerSelectOptions.push({
      value: legacyValue('owner', form.ownerName),
      label: `${form.ownerName} (${copy.common.legacy})`,
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
      const selectedUnit = unitOptions.find((option) => option.id === unitId);
      if (!selectedUnit) {
        return currentForm;
      }

      const currentBusinessId = numericFormValue(currentForm.businessId);
      const currentBusiness = businessOptions.find((option) => option.id === currentBusinessId);
      const businessBelongsToUnit =
        !currentBusiness || currentBusiness.unitId == null || currentBusiness.unitId === selectedUnit.id;
      const nextBusinessId = businessBelongsToUnit ? currentBusinessId : null;
      const currentOwnerUserCompanyId = numericFormValue(currentForm.ownerUserCompanyId);
      const currentOwner = collaboratorOptions.find((option) => option.userCompanyId === currentOwnerUserCompanyId);
      const ownerBelongsToScope =
        !currentOwner ||
        collaboratorCanOwnScopedRecord(
          currentOwner,
          selectedUnit.id,
          nextBusinessId,
          headquarterUnitIds,
          businessOptions,
        );

      return {
        ...currentForm,
        unitId: selectedUnit.id.toString(),
        businessId: businessBelongsToUnit ? currentForm.businessId : '',
        ownerUserCompanyId: ownerBelongsToScope ? currentForm.ownerUserCompanyId : '',
        ownerName: ownerBelongsToScope ? currentForm.ownerName : '',
      };
    });
  };

  const updateBusiness = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        const currentUnitId = numericFormValue(currentForm.unitId);
        const currentOwnerUserCompanyId = numericFormValue(currentForm.ownerUserCompanyId);
        const currentOwner = collaboratorOptions.find((option) => option.userCompanyId === currentOwnerUserCompanyId);
        const ownerBelongsToScope =
          !currentOwner ||
          collaboratorCanOwnScopedRecord(currentOwner, currentUnitId, null, headquarterUnitIds, businessOptions);

        return {
          ...currentForm,
          businessId: '',
          ownerUserCompanyId: ownerBelongsToScope ? currentForm.ownerUserCompanyId : '',
          ownerName: ownerBelongsToScope ? currentForm.ownerName : '',
        };
      }

      const businessId = Number(value.replace('business:', ''));
      const selectedBusiness = businessOptions.find((option) => option.id === businessId);
      if (!selectedBusiness) {
        return currentForm;
      }

      const nextUnitId = selectedBusiness.unitId ?? numericFormValue(currentForm.unitId);
      const currentOwnerUserCompanyId = numericFormValue(currentForm.ownerUserCompanyId);
      const currentOwner = collaboratorOptions.find((option) => option.userCompanyId === currentOwnerUserCompanyId);
      const ownerBelongsToScope =
        !currentOwner ||
        collaboratorCanOwnScopedRecord(
          currentOwner,
          nextUnitId,
          selectedBusiness.id,
          headquarterUnitIds,
          businessOptions,
        );

      return {
        ...currentForm,
        businessId: selectedBusiness.id.toString(),
        unitId: nextUnitId != null ? nextUnitId.toString() : currentForm.unitId,
        ownerUserCompanyId: ownerBelongsToScope ? currentForm.ownerUserCompanyId : '',
        ownerName: ownerBelongsToScope ? currentForm.ownerName : '',
      };
    });
  };

  const updateOwner = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        return {
          ...currentForm,
          ownerUserCompanyId: '',
          ownerName: '',
        };
      }

      const userCompanyId = Number(value.replace('user-company:', ''));
      const selectedCollaborator = collaboratorOptions.find((option) => option.userCompanyId === userCompanyId);
      if (!selectedCollaborator) {
        return currentForm;
      }

      return {
        ...currentForm,
        ownerUserCompanyId: selectedCollaborator.userCompanyId.toString(),
        ownerName: selectedCollaborator.name,
        unitId: currentForm.unitId || selectedCollaborator.unitId?.toString() || '',
        businessId: currentForm.businessId || selectedCollaborator.businessId?.toString() || '',
      };
    });
  };

  return (
    <IndiceModalFrame
      busy={isSubmitting}
      closeLabel={copy.common.close}
      description={formCopy.description}
      footer={(
        <>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {copy.common.cancel}
          </Button>
          <Button
            type="submit"
            form="process-project-form"
            disabled={!isFormValid || isSubmitting}
          >
            {mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSubmitting ? copy.common.saving : submitLabel}
          </Button>
        </>
      )}
      footerSummary={form.name.trim() || title}
      icon={mode === 'create' ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title={title}
      tone="yellow"
    >
      <form id="process-project-form" onSubmit={onSubmit} className="space-y-6">
            <IndiceModalValidation messages={error ? [error] : []} />
            {!hasValidDateRange ? (
              <IndiceModalValidation messages={[`${formCopy.labels.dueDate}: ${formCopy.labels.startDate}`]} />
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.name}</label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={formCopy.placeholders.name}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.description}</label>
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder={formCopy.placeholders.description}
                  className="min-h-[110px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <SelectField
                label={formCopy.labels.status}
                value={form.status}
                onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                options={statusOptions}
              />
              <SelectField
                label={formCopy.labels.priority}
                value={form.priority}
                onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
                options={priorityOptions}
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.startDate}</label>
                <Input
                  type="date"
                  max={form.dueDate || undefined}
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.dueDate}</label>
                <Input
                  type="date"
                  min={form.startDate || undefined}
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

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
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.owner}</label>
                <Select value={selectedOwnerValue} onValueChange={updateOwner}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={formCopy.placeholders.owner} />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
      </form>
    </IndiceModalFrame>
  );
}
