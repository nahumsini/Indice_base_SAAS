import { type ReactNode, useMemo, useState } from 'react';
import { Calendar, Megaphone, Search, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface AnnouncementEmployee {
  id: number;
  name: string;
  position: string;
  unit: number;
  department?: string;
}

export interface CreateAnnouncementFormData {
  title: string;
  type: 'general' | 'urgent' | 'reminder' | 'celebration';
  audienceType: 'all' | 'units' | 'departments' | 'employees';
  unitIds: string[];
  departmentNames: string[];
  employeeIds: number[];
  content: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate: string;
  scheduledTime: string;
}

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateAnnouncementFormData) => void;
  employees?: AnnouncementEmployee[];
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
  isOpen,
  onClose,
  onSave,
  employees = [],
}: CreateAnnouncementModalProps) {
  const [formData, setFormData] = useState<FormState>(initialState);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const unitOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => String(employee.unit)))).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      ),
    [employees],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean) as string[]))
        .sort((left, right) => left.localeCompare(right)),
    [employees],
  );

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
    setFormData(initialState);
    setEmployeeSearch('');
    onClose();
  };

  const submitAnnouncement = (status: CreateAnnouncementFormData['status']) => {
    onSave({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#143675]/20 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
        <div className="flex items-start justify-between gap-4 bg-[#143675] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 text-white">New announcement</h2>
              <p className="mt-1 text-sm leading-5 text-blue-100">
                Create, target, and schedule internal HR communications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5 dark:bg-gray-950">
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Basic information</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Start with the message identity and communication type.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder="Example: Schedule change, monthly meeting..."
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                  <select
                    value={formData.type}
                    onChange={(event) => updateField('type', event.target.value as FormState['type'])}
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="reminder">Reminder</option>
                    <option value="celebration">Celebration</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Audience</span>
                  <select
                    value={formData.audienceType}
                    onChange={(event) => updateField('audienceType', event.target.value as FormState['audienceType'])}
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="all">All employees</option>
                    <option value="units">By unit</option>
                    <option value="departments">By department</option>
                    <option value="employees">Specific employees</option>
                  </select>
                </label>
              </div>
            </section>

            {formData.audienceType === 'units' ? (
              <AudienceOptionSection title="Select units" helperText="Choose at least one unit to publish this announcement.">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {unitOptions.map((unit) => (
                    <CheckboxPill
                      key={unit}
                      checked={formData.unitIds.includes(unit)}
                      label={`Unit ${unit}`}
                      onChange={() => toggleArrayValue('unitIds', unit)}
                    />
                  ))}
                </div>
              </AudienceOptionSection>
            ) : null}

            {formData.audienceType === 'departments' ? (
              <AudienceOptionSection title="Select departments" helperText="Choose at least one department to publish this announcement.">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {departmentOptions.map((department) => (
                    <CheckboxPill
                      key={department}
                      checked={formData.departmentNames.includes(department)}
                      label={department}
                      onChange={() => toggleArrayValue('departmentNames', department)}
                    />
                  ))}
                </div>
              </AudienceOptionSection>
            ) : null}

            {formData.audienceType === 'employees' ? (
              <AudienceOptionSection
                title={`Select employees (${formData.employeeIds.length})`}
                helperText="Search and choose the employees who should receive this announcement."
              >
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Search by name or position"
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                  {filteredEmployees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={formData.employeeIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#143675] focus:ring-[#143675]"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-white">{employee.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {employee.position} · Unit {employee.unit}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </AudienceOptionSection>
            ) : null}

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Message</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Keep the message short, direct, and easy to scan.
                </p>
              </div>
              <textarea
                value={formData.content}
                onChange={(event) => updateField('content', event.target.value)}
                rows={7}
                placeholder="Write the announcement content..."
                className="mt-4 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Attachments will be added in a later frontend pass.
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Publishing</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Publish now or schedule the announcement for later.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <RadioCard
                  checked={formData.publishMode === 'now'}
                  label="Publish now"
                  description="Make this announcement visible immediately."
                  onChange={() => updateField('publishMode', 'now')}
                />
                <RadioCard
                  checked={formData.publishMode === 'scheduled'}
                  label="Schedule publication"
                  description="Choose a specific date and time."
                  onChange={() => updateField('publishMode', 'scheduled')}
                />
              </div>

              {formData.publishMode === 'scheduled' ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(event) => updateField('scheduledDate', event.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Time</span>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(event) => updateField('scheduledTime', event.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-[#143675] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={resetAndClose}
          >
            Cancel
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              disabled={!canSaveDraft}
              className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:border-white/15 disabled:text-white/50"
              onClick={() => submitAnnouncement('draft')}
            >
              Save draft
            </Button>
            <Button
              disabled={!canPublish}
              onClick={() => submitAnnouncement(formData.publishMode === 'now' ? 'published' : 'scheduled')}
              className="rounded-xl bg-white text-[#143675] hover:bg-blue-50 disabled:bg-white/50 disabled:text-[#143675]/60"
            >
              {formData.publishMode === 'now' ? 'Publish now' : 'Schedule publication'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
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
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CheckboxPill({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
      checked
        ? 'border-[#143675] bg-[#143675]/10 text-[#143675] dark:border-[#8bb3ff] dark:bg-[#143675]/30 dark:text-white'
        : 'border-gray-300 bg-white text-gray-700 hover:border-[#143675]/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
    }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-[#143675] focus:ring-[#143675]"
      />
      <span>{label}</span>
    </label>
  );
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
    <label className={`rounded-2xl border p-4 transition ${
      checked
        ? 'border-[#143675] bg-[#143675]/10 shadow-[inset_0_0_0_1px_rgba(20,54,117,0.16)] dark:border-[#8bb3ff] dark:bg-[#143675]/30'
        : 'border-gray-300 bg-white hover:border-[#143675]/40 dark:border-gray-700 dark:bg-gray-950'
    }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4 border-gray-300 text-[#143675] focus:ring-[#143675]"
        />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </label>
  );
}
