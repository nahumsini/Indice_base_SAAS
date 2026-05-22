import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Pencil, Plus, Save } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { accentButtonClass } from '../../Processes/processesData';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessUnitOption,
} from '../../Processes/types';
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

function collaboratorMatchesScope(
  collaborator: ProcessCollaboratorOption,
  unitId?: number | null,
  businessId?: number | null,
) {
  if (businessId != null) {
    return collaborator.businessId === businessId;
  }

  if (unitId != null) {
    return collaborator.unitId === unitId;
  }

  return true;
}

function collaboratorCanOwnProject(
  collaborator: ProcessCollaboratorOption,
  unitId: number | null | undefined,
  businessId: number | null | undefined,
  headquarterUnitIds: ReadonlySet<number>,
) {
  if (collaborator.unitId != null && headquarterUnitIds.has(collaborator.unitId)) {
    return true;
  }

  return collaboratorMatchesScope(collaborator, unitId, businessId);
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
  const isFormValid = Boolean(form.name.trim());
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
    collaboratorCanOwnProject(option, selectedUnitId, selectedBusinessId, headquarterUnitIds),
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
        !currentOwner || collaboratorCanOwnProject(currentOwner, selectedUnit.id, nextBusinessId, headquarterUnitIds);

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
          !currentOwner || collaboratorCanOwnProject(currentOwner, currentUnitId, null, headquarterUnitIds);

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
        !currentOwner || collaboratorCanOwnProject(currentOwner, nextUnitId, selectedBusiness.id, headquarterUnitIds);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!flex h-[min(88vh,780px)] w-[calc(100vw-2rem)] !max-w-[820px] max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:!max-w-[820px] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="shrink-0 bg-[rgb(250,204,21)] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950 sm:text-[1.4rem]">
              {mode === 'create' ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
              {title}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl border-[rgb(113,63,18)]/25 bg-white/35 px-3 text-slate-950 hover:bg-white/60 hover:text-slate-950"
                disabled={isSubmitting}
              >
                {copy.common.close}
              </Button>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {formCopy.description}
            </DialogDescription>

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
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formCopy.labels.dueDate}</label>
                <Input
                  type="date"
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
          </div>

          <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                disabled={isSubmitting}
              >
                {copy.common.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className={`h-10 rounded-xl px-4 text-sm font-semibold ${accentButtonClass}`}
              disabled={!isFormValid || isSubmitting}
            >
              {mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? copy.common.saving : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
