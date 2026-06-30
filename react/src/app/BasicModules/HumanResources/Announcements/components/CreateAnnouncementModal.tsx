import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Calendar, Megaphone, Search, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type {
  AnnouncementDepartmentOption,
  AnnouncementEmployeeOption,
  AnnouncementUnitOption,
  CreateAnnouncementFormData,
} from '../announcementTypes';
import type { CreateAnnouncementModalCopy } from '../translations';

interface CreateAnnouncementModalProps {
  copy: CreateAnnouncementModalCopy;
  initialData?: CreateAnnouncementFormData | null;
  isEdit?: boolean;
  isSubmitting?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateAnnouncementFormData) => Promise<void> | void;
  departments?: AnnouncementDepartmentOption[];
  employees?: AnnouncementEmployeeOption[];
  units?: AnnouncementUnitOption[];
}

interface FormState {
  title: string;
  type: CreateAnnouncementFormData['type'];
  audienceType: CreateAnnouncementFormData['audienceType'];
  unitIds: string[];
  departmentNames: string[];
  employeeIds: number[];
  content: string;
  publishMode: 'now' | 'scheduled';
  scheduledDate: string;
  scheduledTime: string;
}

const initialState: FormState = {
  title: '',
  type: 'general',
  audienceType: 'all',
  unitIds: [],
  departmentNames: [],
  employeeIds: [],
  content: '',
  publishMode: 'now',
  scheduledDate: '',
  scheduledTime: '',
};

export function CreateAnnouncementModal({
  copy,
  initialData,
  isEdit = false,
  isSubmitting = false,
  isOpen,
  onClose,
  onSave,
  departments = [],
  employees = [],
  units = [],
}: CreateAnnouncementModalProps) {
  const [formData, setFormData] = useState<FormState>(initialState);
  const [employeeSearch, setEmployeeSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFormData(initialData ? fromInitialData(initialData) : initialState);
    setEmployeeSearch('');
  }, [initialData, isOpen]);

  const unitOptions = useMemo(() => {
    const knownIds = new Set(units.map((unit) => unit.id));
    const missingSelected = formData.unitIds
      .filter((unitId) => !knownIds.has(unitId))
      .map((unitId) => ({
        id: unitId,
        name: copy.units.unitLabel(unitId),
        activeUserCount: 0,
        isAvailable: true,
      }));
    return [...units, ...missingSelected];
  }, [copy.units, formData.unitIds, units]);

  const departmentOptions = useMemo(() => {
    const knownNames = new Set(departments.map((department) => normalizeOptionName(department.name)));
    const missingSelected = formData.departmentNames
      .filter((department) => !knownNames.has(normalizeOptionName(department)))
      .map((department) => ({
        name: department,
        activeUserCount: 0,
        isAvailable: true,
      }));
    return [...departments, ...missingSelected];
  }, [departments, formData.departmentNames]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = employeeSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return employees;
    }

    return employees.filter((employee) =>
      `${employee.name} ${employee.position}`.toLowerCase().includes(normalizedSearch),
    );
  }, [employees, employeeSearch]);

  if (!isOpen) {
    return null;
  }

  const updateField = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetAndClose = () => {
    if (isSubmitting) {
      return;
    }
    setFormData(initialState);
    setEmployeeSearch('');
    onClose();
  };

  const submitAnnouncement = async (status: CreateAnnouncementFormData['status']) => {
    try {
      await onSave({
        title: formData.title.trim(),
        type: formData.type,
        audienceType: formData.audienceType,
        unitIds: formData.unitIds,
        departmentNames: formData.departmentNames,
        employeeIds: formData.employeeIds,
        content: formData.content.trim(),
        status,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
      });
      setFormData(initialState);
      setEmployeeSearch('');
    } catch {
      // The parent renders the API error. Keep the draft in place for correction.
    }
  };

  const toggleArrayValue = (field: 'unitIds' | 'departmentNames', value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const toggleEmployee = (employeeId: number) => {
    setFormData((current) => ({
      ...current,
      employeeIds: current.employeeIds.includes(employeeId)
        ? current.employeeIds.filter((id) => id !== employeeId)
        : [...current.employeeIds, employeeId],
    }));
  };

  const canSaveDraft = Boolean(formData.title.trim() && formData.content.trim());
  const hasAudience =
    formData.audienceType === 'all' ||
    (formData.audienceType === 'units' && formData.unitIds.length > 0) ||
    (formData.audienceType === 'departments' && formData.departmentNames.length > 0) ||
    (formData.audienceType === 'employees' && formData.employeeIds.length > 0);
  const canPublish =
    canSaveDraft &&
    hasAudience &&
    (formData.publishMode === 'now' || Boolean(formData.scheduledDate && formData.scheduledTime));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" aria-busy={isSubmitting}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#59C3A5]/20 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
        <div className="flex items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 text-white">{copy.title}</h2>
              <p className="mt-1 text-sm leading-5 text-blue-100">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label={copy.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5 dark:bg-gray-950">
          <div className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{copy.basicInformation.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {copy.basicInformation.helper}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.fields.title}</span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder={copy.placeholders.title}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.fields.type}</span>
                  <select
                    value={formData.type}
                    onChange={(event) => updateField('type', event.target.value as FormState['type'])}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="general">{copy.typeOptions.general}</option>
                    <option value="urgent">{copy.typeOptions.urgent}</option>
                    <option value="reminder">{copy.typeOptions.reminder}</option>
                    <option value="celebration">{copy.typeOptions.celebration}</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.fields.audience}</span>
                  <select
                    value={formData.audienceType}
                    onChange={(event) => updateField('audienceType', event.target.value as FormState['audienceType'])}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="all">{copy.audienceOptions.all}</option>
                    <option value="units">{copy.audienceOptions.units}</option>
                    <option value="departments">{copy.audienceOptions.departments}</option>
                    <option value="employees">{copy.audienceOptions.employees}</option>
                  </select>
                </label>
              </div>
            </section>

            {formData.audienceType === 'units' ? (
              <AudienceOptionSection title={copy.units.title} helperText={copy.units.helper}>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {unitOptions.map((unit) => {
                    const checked = formData.unitIds.includes(unit.id);
                    return (
                      <CheckboxPill
                        key={unit.id}
                        checked={checked}
                        disabled={!unit.isAvailable && !checked}
                        label={formatAudienceOptionLabel(unit.name, unit.activeUserCount)}
                        onChange={() => toggleArrayValue('unitIds', unit.id)}
                      />
                    );
                  })}
                </div>
              </AudienceOptionSection>
            ) : null}

            {formData.audienceType === 'departments' ? (
              <AudienceOptionSection title={copy.departments.title} helperText={copy.departments.helper}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {departmentOptions.map((department) => {
                    const checked = formData.departmentNames.includes(department.name);
                    return (
                      <CheckboxPill
                        key={department.name}
                        checked={checked}
                        disabled={!department.isAvailable && !checked}
                        label={formatAudienceOptionLabel(department.name, department.activeUserCount)}
                        onChange={() => toggleArrayValue('departmentNames', department.name)}
                      />
                    );
                  })}
                </div>
              </AudienceOptionSection>
            ) : null}

            {formData.audienceType === 'employees' ? (
              <AudienceOptionSection
                title={copy.employees.title(formData.employeeIds.length)}
                helperText={copy.employees.helper}
              >
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder={copy.placeholders.employeeSearch}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                  {filteredEmployees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={formData.employeeIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-white">{employee.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {copy.employees.meta(employee.position, employee.unit)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </AudienceOptionSection>
            ) : null}

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{copy.message.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {copy.message.helper}
                </p>
              </div>
              <textarea
                value={formData.content}
                onChange={(event) => updateField('content', event.target.value)}
                rows={7}
                placeholder={copy.placeholders.message}
                className="mt-4 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {copy.message.attachmentNote}
              </p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{copy.publishing.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {copy.publishing.helper}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <RadioCard
                  checked={formData.publishMode === 'now'}
                  label={copy.publishing.publishNow.label}
                  description={copy.publishing.publishNow.description}
                  onChange={() => updateField('publishMode', 'now')}
                />
                <RadioCard
                  checked={formData.publishMode === 'scheduled'}
                  label={copy.publishing.schedulePublication.label}
                  description={copy.publishing.schedulePublication.description}
                  onChange={() => updateField('publishMode', 'scheduled')}
                />
              </div>

              {formData.publishMode === 'scheduled' ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.fields.date}</span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(event) => updateField('scheduledDate', event.target.value)}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.fields.time}</span>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(event) => updateField('scheduledTime', event.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-[#59C3A5] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            className="rounded-lg border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={resetAndClose}
            disabled={isSubmitting}
          >
            {copy.buttons.cancel}
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              disabled={isSubmitting || !canSaveDraft}
              className="rounded-lg border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:border-white/15 disabled:text-white/50"
              onClick={() => void submitAnnouncement('draft')}
            >
              {copy.buttons.saveDraft}
            </Button>
            <Button
              disabled={isSubmitting || !canPublish}
              onClick={() => void submitAnnouncement(formData.publishMode === 'now' ? 'published' : 'scheduled')}
              className="rounded-lg bg-white text-[#59C3A5] hover:bg-blue-50 disabled:bg-white/50 disabled:text-[#59C3A5]/60"
            >
              {isEdit ? copy.buttons.saveChanges : formData.publishMode === 'now' ? copy.buttons.publishNow : copy.buttons.schedulePublication}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fromInitialData(data: CreateAnnouncementFormData): FormState {
  return {
    title: data.title,
    type: data.type,
    audienceType: data.audienceType,
    unitIds: data.unitIds,
    departmentNames: data.departmentNames,
    employeeIds: data.employeeIds,
    content: data.content,
    publishMode: data.status === 'scheduled' ? 'scheduled' : 'now',
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime,
  };
}

function AudienceOptionSection({
  title,
  helperText,
  children,
}: {
  title: string;
  helperText: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CheckboxPill({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
      disabled
        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500'
        : checked
        ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] dark:border-[#8FE0CA] dark:bg-[#59C3A5]/30 dark:text-white'
        : 'border-gray-300 bg-white text-gray-700 hover:border-[#59C3A5]/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
    }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
      />
      <span>{label}</span>
    </label>
  );
}

function formatAudienceOptionLabel(name: string, activeUserCount: number) {
  return `${name} (${activeUserCount})`;
}

function normalizeOptionName(value: string) {
  return value.trim().toLowerCase();
}

function RadioCard({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label className={`rounded-lg border p-4 transition ${
      checked
        ? 'border-[#59C3A5] bg-[#59C3A5]/10 shadow-[inset_0_0_0_1px_rgba(89,195,165,0.16)] dark:border-[#8FE0CA] dark:bg-[#59C3A5]/30'
        : 'border-gray-300 bg-white hover:border-[#59C3A5]/40 dark:border-gray-700 dark:bg-gray-950'
    }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4 border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
        />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </label>
  );
}
