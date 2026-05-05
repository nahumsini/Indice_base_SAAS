import { Copy, ExternalLink, MapPin, Pencil, Plus, QrCode, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  type AttendanceControlAssignment,
  type AttendanceControlAssignmentPayload,
  type AttendanceControlLocation,
  type AttendanceControlLocationPayload,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
  type AttendanceKioskDevice,
  type AttendanceKioskDevicePayload,
} from '../../../../api/humanResources';
import {
  getAssignmentBusyReason,
  isAssignmentFreeForWork,
  type AttendanceControlCopy,
  statusClasses,
  weekdayLabel,
} from './ControlAttendanceWidgets';

export interface ControlWorkSiteForm {
  employee_ids: number[];
  location_ids: number[];
  location_id: number;
  effective_start_date: string;
  effective_end_date: string;
  start_time: string;
  end_time: string;
}

type KioskType = 'business_unit' | 'contract_site' | 'head_office';

const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);
const dateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const laterDate = (...dates: Array<string | null | undefined>) => {
  const values = dates.filter((date): date is string => Boolean(date));
  values.sort();
  return values.length > 0 ? values[values.length - 1] : '';
};
const contractSiteAssignmentDates = (
  location: AttendanceControlLocation | undefined,
  requestedStartDate: string,
  todayDate: string,
) => {
  if (!location) {
    const startDate = laterDate(todayDate, requestedStartDate) || todayDate;
    return { startDate, endDate: startDate };
  }

  const minimumStartDate = laterDate(todayDate, location.contract_start_date);
  const startCandidate = requestedStartDate && requestedStartDate >= minimumStartDate
    ? requestedStartDate
    : minimumStartDate;
  const startDate = location.contract_end_date && startCandidate > location.contract_end_date
    ? location.contract_end_date
    : startCandidate;
  const endDate = location.contract_end_date && location.contract_end_date >= startDate
    ? location.contract_end_date
    : startDate;
  return { startDate, endDate };
};
const withContractSiteTime = (
  payload: AttendanceControlLocationPayload,
  field: 'required_start_time' | 'required_end_time',
  value: string,
): AttendanceControlLocationPayload => {
  return {
    ...payload,
    [field]: value ? `${value}:00` : null,
  };
};

const kioskTypeOptions: KioskType[] = ['business_unit', 'contract_site', 'head_office'];

const kioskTypeFromMetadata = (metadata?: Record<string, unknown>): KioskType => {
  const value = typeof metadata?.kiosk_type === 'string' ? metadata.kiosk_type : '';
  return kioskTypeOptions.includes(value as KioskType) ? value as KioskType : 'business_unit';
};

const withKioskType = (metadata: Record<string, unknown> | undefined, kioskType: KioskType) => ({
  ...(metadata ?? {}),
  kiosk_type: kioskType,
});

const isContractSiteLocation = (location: AttendanceControlLocation) =>
  (location.managed_source ?? '').toLowerCase() === 'contract_site';

const isBusinessStructureLocation = (location: AttendanceControlLocation) =>
  (location.managed_source ?? '').toLowerCase() === 'business_structure';

const locationMatchesKioskType = (location: AttendanceControlLocation, kioskType: KioskType) => {
  if (kioskType === 'contract_site') {
    return isContractSiteLocation(location);
  }
  if (kioskType === 'head_office') {
    return isBusinessStructureLocation(location) && !location.business_id;
  }
  return isBusinessStructureLocation(location) && Boolean(location.business_id);
};

const isActiveLocation = (location: AttendanceControlLocation) => (location.status ?? 'active') !== 'inactive';

const slugifyKioskPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const defaultKioskCode = (location: AttendanceControlLocation, kioskType: KioskType) => {
  const prefix = kioskType === 'contract_site'
    ? 'site'
    : kioskType === 'head_office'
      ? 'hq'
      : 'business';
  const slug = slugifyKioskPart(location.name) || `${prefix}-${location.id}`;
  return `${slug}-kiosk`;
};

const defaultKioskScopeCode = (label: string, fallback: string) =>
  `${slugifyKioskPart(label) || fallback}-kiosk`;

export function ControlContractSiteDialog({
  copy,
  isOpen,
  isSaving,
  form,
  title,
  onClose,
  onChange,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  form: AttendanceControlLocationPayload;
  title: string;
  onClose: () => void;
  onChange: (payload: AttendanceControlLocationPayload) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.locationsHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.locationName}</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
            <select
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="active">{copy.statuses.active}</option>
              <option value="inactive">{copy.statuses.inactive}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.latitude}</label>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(event) => onChange({ ...form, latitude: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.longitude}</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(event) => onChange({ ...form, longitude: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contract start date</label>
              <input
                type="date"
                value={form.contract_start_date}
                onChange={(event) => onChange({ ...form, contract_start_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contract end date</label>
              <input
                type="date"
                value={form.contract_end_date}
                min={form.contract_start_date}
                onChange={(event) => onChange({ ...form, contract_end_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

	          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 lg:col-span-2">
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.radius}</label>
	              <input
                type="number"
                min="1"
                value={form.radius_meters}
                onChange={(event) => onChange({ ...form, radius_meters: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
	            </div>
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Working hours</label>
	              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={form.required_hours_per_day}
                onChange={(event) => onChange({ ...form, required_hours_per_day: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
	            </div>
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred start</label>
	              <input
	                type="time"
	                value={timeToInput(form.required_start_time) || '08:00'}
	                onChange={(event) => onChange(withContractSiteTime(form, 'required_start_time', event.target.value))}
	                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
	              />
	            </div>
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred end</label>
	              <input
	                type="time"
	                value={timeToInput(form.required_end_time) || '16:00'}
	                onChange={(event) => onChange(withContractSiteTime(form, 'required_end_time', event.target.value))}
	                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
	              />
	            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControlTemplateDialog({
  copy,
  isOpen,
  isSaving,
  form,
  title,
  locale,
  onClose,
  onChange,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  form: AttendanceControlTemplatePayload;
  title: string;
  locale: string;
  onClose: () => void;
  onChange: (payload: AttendanceControlTemplatePayload) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.templatesHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.templateName}</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">{copy.statuses.active}</option>
                <option value="inactive">{copy.statuses.inactive}</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {form.days.map((day, index) => (
              <div key={day.day_of_week} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{weekdayLabel(day.day_of_week, locale)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{copy.labels.dayLabel} {day.day_of_week}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={!day.is_rest_day}
                      onChange={(event) => {
                        const isWorkingDay = event.target.checked;
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...item,
                                is_rest_day: !isWorkingDay,
                                start_time: isWorkingDay ? item.start_time || '08:00:00' : null,
                                end_time: isWorkingDay ? item.end_time || '16:00:00' : null,
                              }
                            : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                    />
                    {copy.labels.workingDay}
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{copy.labels.start}</label>
                    <input
                      type="time"
                      disabled={day.is_rest_day}
                      value={(day.start_time ?? '').slice(0, 5)}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, start_time: `${event.target.value}:00` } : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{copy.labels.end}</label>
                    <input
                      type="time"
                      disabled={day.is_rest_day}
                      value={(day.end_time ?? '').slice(0, 5)}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, end_time: `${event.target.value}:00` } : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{copy.labels.tolerance}</label>
                    <input
                      type="number"
                      min="0"
                      value={day.late_after_minutes}
                      onChange={(event) => {
                        const nextDays = form.days.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, late_after_minutes: Number(event.target.value) } : item,
                        );
                        onChange({ ...form, days: nextDays });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControlAssignmentDialog({
  copy,
  isOpen,
  isSaving,
  assignments,
  templates,
  form,
  onClose,
  onChange,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  templates: AttendanceControlTemplate[];
  form: AttendanceControlAssignmentPayload;
  onClose: () => void;
  onChange: (payload: AttendanceControlAssignmentPayload) => void;
  onSave: () => void;
}) {
  const availableAssignments = assignments.filter(isAssignmentFreeForWork);
  const todayDate = dateInputValue();
  const hasMissingStartDate = !form.effective_start_date;
  const hasPastStartDate = Boolean(form.effective_start_date && form.effective_start_date < todayDate);
  const hasMissingEndDate = !form.effective_end_date;
  const hasInvalidDateRange = Boolean(form.effective_end_date && form.effective_end_date < form.effective_start_date);
  const dateValidationMessage = hasMissingStartDate
    ? 'Start date is required.'
    : hasPastStartDate
      ? 'Start date cannot be in the past.'
      : hasMissingEndDate
        ? 'End date is required.'
        : hasInvalidDateRange
          ? 'End date must be on or after start date.'
          : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.labels.bulkAssign}</DialogTitle>
          <DialogDescription>{copy.labels.assignmentHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.chooseTemplate}</label>
            <select
              value={form.template_id}
              onChange={(event) => onChange({ ...form, template_id: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="0">--</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveStart}</label>
              <input
                type="date"
                value={form.effective_start_date}
                min={todayDate}
                onChange={(event) => {
                  const nextStartDate = event.target.value;
                  onChange({
                    ...form,
                    effective_start_date: nextStartDate,
                    effective_end_date: form.effective_end_date && form.effective_end_date >= nextStartDate
                      ? form.effective_end_date
                      : nextStartDate,
                  });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveEnd}</label>
              <input
                type="date"
                value={form.effective_end_date ?? ''}
                min={form.effective_start_date || todayDate}
                onChange={(event) => onChange({ ...form, effective_end_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          {dateValidationMessage ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
              {dateValidationMessage}
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.employeesToAssign}</label>
            <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
              {availableAssignments.length > 0 ? availableAssignments.map((assignment) => {
                const isChecked = form.employee_ids.includes(assignment.employee_id);
                return (
                  <label key={assignment.employee_id} className="flex items-start gap-3 rounded-lg bg-white px-3 py-3 text-sm dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => {
                        const nextEmployeeIds = event.target.checked
                          ? [...form.employee_ids, assignment.employee_id]
                          : form.employee_ids.filter((employeeId) => employeeId !== assignment.employee_id);
                        onChange({ ...form, employee_ids: nextEmployeeIds });
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{assignment.employee_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {assignment.position_title || '—'} · {assignment.schedule_template_name || copy.labels.noSchedule}
                      </p>
                    </div>
                  </label>
                );
              }) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  No free employees available for this date. Remove an existing shift before assigning new work.
                </div>
              )}
            </div>
            {assignments.length > availableAssignments.length ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Busy employees are hidden from this list.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button
            onClick={onSave}
            disabled={
              isSaving ||
              form.employee_ids.length === 0 ||
              form.template_id <= 0 ||
              Boolean(dateValidationMessage) ||
              form.employee_ids.some((employeeId) => {
                const assignment = assignments.find((item) => item.employee_id === employeeId);
                return assignment ? Boolean(getAssignmentBusyReason(assignment)) : false;
              })
            }
          >
            {copy.labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControlWorkSiteDialog({
  copy,
  isOpen,
  isSaving,
  employeeName,
  locations,
  form,
  onClose,
  onChange,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  employeeName: string;
  locations: AttendanceControlLocation[];
  form: ControlWorkSiteForm;
  onClose: () => void;
  onChange: (payload: ControlWorkSiteForm) => void;
  onSave: () => void;
}) {
  const activeLocations = locations.filter((location) => location.status !== 'inactive');
  const selectedLocation = activeLocations.find((location) => location.id === form.location_id);
  const invalidTimeRange = Boolean(form.start_time && form.end_time && form.end_time === form.start_time);
  const isOvernightShift = Boolean(form.start_time && form.end_time && form.end_time < form.start_time);
  const todayDate = dateInputValue();
  const minimumStartDate = laterDate(todayDate, selectedLocation?.contract_start_date) || todayDate;
  const maximumEndDate = selectedLocation?.contract_end_date || undefined;
  const hasMissingStartDate = !form.effective_start_date;
  const hasPastStartDate = Boolean(form.effective_start_date && form.effective_start_date < todayDate);
  const hasMissingEndDate = !form.effective_end_date;
  const hasInvalidDateRange = Boolean(form.effective_end_date && form.effective_end_date < form.effective_start_date);
  const hasStartBeforeSiteWindow = Boolean(selectedLocation?.contract_start_date && form.effective_start_date < selectedLocation.contract_start_date);
  const hasEndAfterSiteWindow = Boolean(selectedLocation?.contract_end_date && form.effective_end_date > selectedLocation.contract_end_date);
  const dateValidationMessage = hasMissingStartDate
    ? 'Start date is required.'
    : hasPastStartDate
      ? 'Start date cannot be in the past.'
      : hasMissingEndDate
        ? 'End date is required.'
        : hasInvalidDateRange
          ? 'End date must be on or after start date.'
          : hasStartBeforeSiteWindow || hasEndAfterSiteWindow
            ? `Contract site is only open from ${selectedLocation?.contract_start_date ?? 'the first configured day'} to ${selectedLocation?.contract_end_date ?? 'the last configured day'}.`
          : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign contract site and hours for {employeeName}</DialogTitle>
          <DialogDescription>
            Choose the external or contract location where this employee must check in for the selected dates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Contract site</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Attendance will only be accepted from this contract site for the selected dates.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Attendance location</label>
            <select
              value={form.location_id || ''}
              onChange={(event) => {
                const locationId = event.target.value ? Number(event.target.value) : 0;
                const selectedLocation = activeLocations.find((location) => location.id === locationId);
                const nextDates = contractSiteAssignmentDates(selectedLocation, form.effective_start_date, todayDate);
                onChange({
                  ...form,
                  location_id: locationId,
                  location_ids: locationId > 0 ? Array.from(new Set([...form.location_ids, locationId])) : form.location_ids,
                  start_time: timeToInput(selectedLocation?.required_start_time) || form.start_time,
                  end_time: timeToInput(selectedLocation?.required_end_time) || form.end_time,
                  effective_start_date: nextDates.startDate,
                  effective_end_date: nextDates.endDate,
                });
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select contract site</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} - {location.unit_name || copy.labels.noUnit} / {location.business_name || copy.labels.noBusiness}
                </option>
              ))}
            </select>
            {activeLocations.length === 0 ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                No available contract sites for this date. Sites outside their contract window or already assigned to another employee are hidden.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start date</label>
            <input
              type="date"
              value={form.effective_start_date}
              min={minimumStartDate}
              max={maximumEndDate}
              onChange={(event) => {
                const nextStartDate = event.target.value;
                const nextEndDate = form.effective_end_date && form.effective_end_date >= nextStartDate
                  ? form.effective_end_date
                  : nextStartDate;
                onChange({
                  ...form,
                  effective_start_date: nextStartDate,
                  effective_end_date: maximumEndDate && nextEndDate > maximumEndDate ? maximumEndDate : nextEndDate,
                });
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End date</label>
            <input
              type="date"
              value={form.effective_end_date}
              min={form.effective_start_date || minimumStartDate}
              max={maximumEndDate}
              onChange={(event) => onChange({ ...form, effective_end_date: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {dateValidationMessage ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
              {dateValidationMessage}
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Assigned hours</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start time</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(event) => onChange({ ...form, start_time: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(event) => onChange({ ...form, end_time: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="rounded-lg bg-[#143675]/5 px-3 py-2 text-xs text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff] sm:col-span-2">
            End date is the last day this shift starts. Use the same start and end date for a one-day shift.
          </div>
          {invalidTimeRange ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
              End time cannot equal start time.
            </div>
          ) : null}
          {isOvernightShift ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200 sm:col-span-2">
              Overnight shift: the shift starts on the selected date and ends the next day.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button
            onClick={onSave}
            disabled={isSaving || form.location_id <= 0 || !form.effective_start_date || Boolean(dateValidationMessage) || !form.start_time || !form.end_time || invalidTimeRange}
          >
            {copy.labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControlKioskManagerDialog({
  copy,
  isOpen,
  isSaving,
  kioskDevices,
  locations,
  onClose,
  onNew,
  onEdit,
  onOpen,
  onCopy,
  onQr,
  onRotate,
  onDelete,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  kioskDevices: AttendanceKioskDevice[];
  locations: AttendanceControlLocation[];
  onClose: () => void;
  onNew: () => void;
  onEdit: (device: AttendanceKioskDevice) => void;
  onOpen: (device: AttendanceKioskDevice) => void;
  onCopy: (device: AttendanceKioskDevice) => void;
  onQr: (device: AttendanceKioskDevice) => void;
  onRotate: (device: AttendanceKioskDevice) => void;
  onDelete: (device: AttendanceKioskDevice) => void;
}) {
  const locationNameForDevice = (device: AttendanceKioskDevice) => {
    const kioskType = kioskTypeFromMetadata(device.metadata);
    if (kioskType === 'business_unit' && !device.location_id) {
      return copy.labels.kioskLocationResolvedByScope;
    }
    return device.location_name
      || locations.find((location) => location.id === device.location_id)?.name
      || copy.labels.noLinkedLocation;
  };
  const scopeNameForDevice = (device: AttendanceKioskDevice) => {
    const kioskType = kioskTypeFromMetadata(device.metadata);
    if (kioskType !== 'business_unit') {
      return [device.unit_name || copy.labels.noUnit, device.business_name || copy.labels.noBusiness].join(' / ');
    }
    if (device.business_id) {
      return [device.unit_name || copy.labels.allUnits, device.business_name || copy.labels.noBusiness].join(' / ');
    }
    if (device.unit_id) {
      return [device.unit_name || copy.labels.noUnit, copy.labels.allBusinesses].join(' / ');
    }
    return [copy.labels.allUnits, copy.labels.allBusinesses].join(' / ');
  };
  const kioskTypeLabel = (device: AttendanceKioskDevice) => {
    const kioskType = kioskTypeFromMetadata(device.metadata);
    if (kioskType === 'contract_site') {
      return copy.labels.kioskTypeContractSite;
    }
    if (kioskType === 'head_office') {
      return copy.labels.kioskTypeHeadOffice;
    }
    return copy.labels.kioskTypeBusinessUnit;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{copy.labels.manageKiosks}</DialogTitle>
          <DialogDescription>{copy.sections.kiosksHint}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button type="button" className="gap-2 bg-[#143675] text-white hover:bg-[#0f2855]" onClick={onNew}>
            <Plus className="h-4 w-4" />
            {copy.labels.newKiosk}
          </Button>
        </div>

        {kioskDevices.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="hidden grid-cols-[1.25fr_1fr_1fr_auto] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400 md:grid">
              <span>{copy.labels.kioskDevice}</span>
              <span>{copy.labels.kioskScope}</span>
              <span>{copy.labels.linkedLocation}</span>
              <span className="text-right">{copy.labels.status}</span>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {kioskDevices.map((device) => {
                const hasPublicLink = Boolean(device.public_access_token);

                return (
                  <div key={device.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1.25fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{device.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[device.status]}`}>
                          {copy.statuses[device.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {copy.labels.code}: {device.code || '—'}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {hasPublicLink ? copy.labels.kioskPublicLink : copy.labels.kioskTokenUnavailable}
                      </p>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <p>{kioskTypeLabel(device)}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {scopeNameForDevice(device)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <span>{locationNameForDevice(device)}</span>
                    </div>

                    <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                      <Button type="button" variant="outline" size="sm" className="gap-2" disabled={!hasPublicLink} onClick={() => onOpen(device)}>
                        <ExternalLink className="h-4 w-4" />
                        {copy.labels.openKiosk}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={copy.labels.copyKioskLink}
                        title={copy.labels.copyKioskLink}
                        disabled={!hasPublicLink}
                        onClick={() => onCopy(device)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={copy.labels.showKioskQr}
                        title={copy.labels.showKioskQr}
                        disabled={!hasPublicLink}
                        onClick={() => onQr(device)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={copy.labels.rotateKioskLink}
                        title={copy.labels.rotateKioskLink}
                        disabled={isSaving}
                        onClick={() => onRotate(device)}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={copy.labels.editKiosk}
                        title={copy.labels.editKiosk}
                        onClick={() => onEdit(device)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                        aria-label={copy.labels.deleteKiosk}
                        title={copy.labels.deleteKiosk}
                        disabled={isSaving}
                        onClick={() => onDelete(device)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            {copy.labels.noKiosks}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControlKioskDialog({
  copy,
  isOpen,
  isSaving,
  form,
  locations,
  title,
  onClose,
  onChange,
  onSave,
}: {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  form: AttendanceKioskDevicePayload;
  assignments: AttendanceControlAssignment[];
  locations: AttendanceControlLocation[];
  title: string;
  onClose: () => void;
  onChange: (value: AttendanceKioskDevicePayload) => void;
  onSave: () => void;
}) {
  const kioskType = kioskTypeFromMetadata(form.metadata);
  const activeLocations = locations.filter(isActiveLocation);
  const businessStructureLocations = activeLocations.filter((location) =>
    isBusinessStructureLocation(location) && Boolean(location.business_id)
  );
  const availableLocations = activeLocations.filter((location) => locationMatchesKioskType(location, kioskType));
  const selectedLocation = locations.find((location) => location.id === form.location_id) ?? null;
  const unitOptions = Array.from(
    new Map(
      businessStructureLocations
        .filter((location) => location.unit_id)
        .map((location) => [
          location.unit_id as number,
          {
            id: location.unit_id as number,
            name: location.unit_name || `${copy.labels.unit} ${location.unit_id}`,
          },
        ]),
    ).values(),
  ).sort((first, second) => first.name.localeCompare(second.name));
  const businessOptions = businessStructureLocations
    .filter((location) => !form.unit_id || location.unit_id === form.unit_id)
    .filter((location) => location.business_id)
    .map((location) => ({
      id: location.business_id as number,
      unitId: location.unit_id ?? null,
      unitName: location.unit_name || copy.labels.noUnit,
      name: location.business_name || location.name,
    }))
    .filter((business, index, options) => options.findIndex((item) => item.id === business.id) === index)
    .sort((first, second) => first.name.localeCompare(second.name));
  const selectedUnit = unitOptions.find((unit) => unit.id === form.unit_id) ?? null;
  const selectedBusiness = businessOptions.find((business) => business.id === form.business_id) ?? null;
  const selectedScopeLabel = kioskType === 'business_unit'
    ? form.business_id
      ? [selectedBusiness?.unitName || selectedUnit?.name || copy.labels.allUnits, selectedBusiness?.name || copy.labels.noBusiness].join(' / ')
      : form.unit_id
        ? [selectedUnit?.name || copy.labels.noUnit, copy.labels.allBusinesses].join(' / ')
        : [copy.labels.allUnits, copy.labels.allBusinesses].join(' / ')
    : selectedLocation
      ? [selectedLocation.unit_name || copy.labels.noUnit, selectedLocation.business_name || copy.labels.noBusiness].join(' / ')
      : copy.labels.noLinkedLocation;
  const isBusinessUnitKiosk = kioskType === 'business_unit';
  const requiresLocation = kioskType !== 'business_unit';
  const canSave = !isSaving && form.code.trim().length > 0 && form.name.trim().length > 0 && (!requiresLocation || Boolean(form.location_id));
  const updateKioskType = (nextType: KioskType) => {
    const currentLocation = locations.find((location) => location.id === form.location_id);
    if (nextType === 'business_unit') {
      const nextUnitId = currentLocation && isBusinessStructureLocation(currentLocation)
        ? currentLocation.unit_id ?? null
        : form.unit_id ?? null;
      const nextBusinessId = currentLocation && locationMatchesKioskType(currentLocation, 'business_unit')
        ? currentLocation.business_id ?? null
        : form.business_id ?? null;
      onChange({
        ...form,
        unit_id: nextUnitId,
        business_id: nextBusinessId,
        location_id: null,
        metadata: withKioskType(form.metadata, nextType),
      });
      return;
    }

    const nextLocation = currentLocation && locationMatchesKioskType(currentLocation, nextType) ? currentLocation : null;
    onChange({
      ...form,
      unit_id: nextLocation?.unit_id ?? null,
      business_id: nextLocation?.business_id ?? null,
      location_id: nextLocation?.id ?? null,
      metadata: withKioskType(form.metadata, nextType),
    });
  };
  const updateKioskUnit = (unitId: number | null) => {
    const nextUnit = unitOptions.find((unit) => unit.id === unitId) ?? null;
    const currentBusiness = businessStructureLocations.find((location) => location.business_id === form.business_id);
    const shouldKeepBusiness = Boolean(unitId && currentBusiness?.unit_id === unitId);
    const label = nextUnit?.name || copy.labels.allUnits;
    onChange({
      ...form,
      unit_id: unitId,
      business_id: shouldKeepBusiness ? form.business_id ?? null : null,
      location_id: null,
      name: form.name || `${label} Kiosk`,
      code: form.code || defaultKioskScopeCode(label, unitId ? `unit-${unitId}` : 'all-business'),
    });
  };
  const updateKioskBusiness = (businessId: number | null) => {
    const nextBusiness = businessOptions.find((business) => business.id === businessId) ?? null;
    onChange({
      ...form,
      unit_id: nextBusiness?.unitId ?? form.unit_id ?? null,
      business_id: businessId,
      location_id: null,
      name: form.name || `${nextBusiness?.name || copy.labels.allBusinesses} Kiosk`,
      code: form.code || defaultKioskScopeCode(nextBusiness?.name || copy.labels.allBusinesses, businessId ? `business-${businessId}` : 'all-business'),
    });
  };
  const updateKioskLocation = (locationId: number | null) => {
    const nextLocation = locations.find((location) => location.id === locationId) ?? null;
    onChange({
      ...form,
      unit_id: nextLocation?.unit_id ?? null,
      business_id: nextLocation?.business_id ?? null,
      location_id: nextLocation?.id ?? null,
      name: form.name || (nextLocation ? `${nextLocation.name} Kiosk` : form.name),
      code: form.code || (nextLocation ? defaultKioskCode(nextLocation, kioskType) : form.code),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.kiosksHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskType}</label>
            <select
              value={kioskType}
              onChange={(event) => updateKioskType(event.target.value as KioskType)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="business_unit">{copy.labels.kioskTypeBusinessUnit}</option>
              <option value="contract_site">{copy.labels.kioskTypeContractSite}</option>
              <option value="head_office">{copy.labels.kioskTypeHeadOffice}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.deviceCode}</label>
              <input
                type="text"
                value={form.code}
                onChange={(event) => onChange({ ...form, code: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskDevice}</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {isBusinessUnitKiosk ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskUnitScope}</label>
                <select
                  value={form.unit_id ?? ''}
                  onChange={(event) => updateKioskUnit(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{copy.labels.allUnits}</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskBusinessScope}</label>
                <select
                  value={form.business_id ?? ''}
                  disabled={!form.unit_id}
                  onChange={(event) => updateKioskBusiness(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{copy.labels.allBusinesses}</option>
                  {form.unit_id ? businessOptions.map((business) => (
                    <option key={business.id} value={business.id}>{business.name}</option>
                  )) : null}
                </select>
              </div>

              {businessStructureLocations.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
                  {copy.labels.noKioskLocationsForType}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-2">{copy.labels.kioskScopeHint}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.kioskCheckInLocation}</label>
              <select
                value={form.location_id ?? ''}
                onChange={(event) => updateKioskLocation(event.target.value ? Number(event.target.value) : null)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noLinkedLocation}</option>
                {availableLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              {availableLocations.length === 0 ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                  {copy.labels.noKioskLocationsForType}
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{copy.labels.kioskCheckInLocationHint}</p>
              )}
            </div>
          )}

          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
            {copy.labels.kioskScope}: {selectedScopeLabel}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
            <select
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="active">{copy.statuses.active}</option>
              <option value="inactive">{copy.statuses.inactive}</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button onClick={onSave} disabled={!canSave}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
