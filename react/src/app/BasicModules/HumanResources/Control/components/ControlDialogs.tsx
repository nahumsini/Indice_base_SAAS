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
  type AttendanceKioskDevicePayload,
} from '../../../../api/humanResources';
import {
  getAssignmentBusyReason,
  isAssignmentFreeForWork,
  type AttendanceControlCopy,
  weekdayLabel,
} from './ControlAttendanceWidgets';
import {
  KioskManagementModal,
  type KioskManagementModalProps,
} from './kiosks/KioskManagementModal';
import { CreateKioskModal } from './kiosks/CreateKioskModal';

export interface ControlWorkSiteForm {
  user_company_ids: number[];
  location_ids: number[];
  location_id: number;
  effective_start_date: string;
  effective_end_date: string;
  start_time: string;
  end_time: string;
}

type KioskType = 'business_unit' | 'contract_site' | 'head_office' | 'open_attendance';

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

const kioskTypeOptions: KioskType[] = ['business_unit', 'contract_site', 'head_office', 'open_attendance'];

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

const normalizeLocationLabel = (value?: string | null) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const headOfficeExactKeys = new Set([
  'corporateoffice',
  'oficinacorporativa',
  'sedecorporativa',
  'headquarter',
  'headquarters',
  'headoffice',
  'mainoffice',
  'oficinacentral',
]);

const headOfficeContainsKeys = [
  'corporateoffice',
  'oficinacorporativa',
  'sedecorporativa',
  'headoffice',
  'mainoffice',
  'oficinacentral',
];

const isHeadOfficeLocation = (location: AttendanceControlLocation) => {
  if (!isBusinessStructureLocation(location)) {
    return false;
  }
  if (!location.business_id) {
    return true;
  }

  const labels = [location.name, location.unit_name, location.business_name]
    .map(normalizeLocationLabel)
    .filter(Boolean);

  return labels.some((label) =>
    headOfficeExactKeys.has(label) || headOfficeContainsKeys.some((key) => label.includes(key))
  );
};

const locationMatchesKioskType = (location: AttendanceControlLocation, kioskType: KioskType) => {
  if (kioskType === 'contract_site') {
    return isContractSiteLocation(location);
  }
  if (kioskType === 'open_attendance') {
    return false;
  }
  if (kioskType === 'head_office') {
    return isHeadOfficeLocation(location);
  }
  return isBusinessStructureLocation(location) && Boolean(location.business_id) && !isHeadOfficeLocation(location);
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
  return `${slug}-point`;
};

const defaultKioskScopeCode = (label: string, fallback: string) =>
  `${slugifyKioskPart(label) || fallback}-point`;

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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
            <select
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.longitude}</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(event) => onChange({ ...form, longitude: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contract end date</label>
              <input
                type="date"
                value={form.contract_end_date}
                min={form.contract_start_date}
                onChange={(event) => onChange({ ...form, contract_end_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
	            </div>
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred start</label>
	              <input
	                type="time"
	                value={timeToInput(form.required_start_time) || '08:00'}
	                onChange={(event) => onChange(withContractSiteTime(form, 'required_start_time', event.target.value))}
	                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
	              />
	            </div>
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred end</label>
	              <input
	                type="time"
	                value={timeToInput(form.required_end_time) || '16:00'}
	                onChange={(event) => onChange(withContractSiteTime(form, 'required_end_time', event.target.value))}
	                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.status}</label>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
    ? copy.labels.startDateRequired
    : hasPastStartDate
      ? copy.labels.startDatePast
      : hasMissingEndDate
        ? copy.labels.endDateRequired
        : hasInvalidDateRange
          ? copy.labels.endDateBeforeStart
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveEnd}</label>
              <input
                type="date"
                value={form.effective_end_date ?? ''}
                min={form.effective_start_date || todayDate}
                onChange={(event) => onChange({ ...form, effective_end_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                const isChecked = form.user_company_ids.includes(assignment.user_company_id);
                return (
                  <label key={assignment.user_company_id} className="flex items-start gap-3 rounded-lg bg-white px-3 py-3 text-sm dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => {
                        const nextEmployeeIds = event.target.checked
                          ? [...form.user_company_ids, assignment.user_company_id]
                          : form.user_company_ids.filter((employeeId) => employeeId !== assignment.user_company_id);
                        onChange({ ...form, user_company_ids: nextEmployeeIds });
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{assignment.user_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {assignment.position_title || '—'} · {assignment.schedule_template_name || copy.labels.noSchedule}
                      </p>
                    </div>
                  </label>
                );
              }) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  No free HR users available for this date. Remove an existing shift before assigning new work.
                </div>
              )}
            </div>
            {assignments.length > availableAssignments.length ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Busy HR users are hidden from this list.
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
              form.user_company_ids.length === 0 ||
              form.template_id <= 0 ||
              Boolean(dateValidationMessage) ||
              form.user_company_ids.some((employeeId) => {
                const assignment = assignments.find((item) => item.user_company_id === employeeId);
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
    ? copy.labels.startDateRequired
    : hasPastStartDate
      ? copy.labels.startDatePast
      : hasMissingEndDate
        ? copy.labels.endDateRequired
        : hasInvalidDateRange
          ? copy.labels.endDateBeforeStart
          : hasStartBeforeSiteWindow || hasEndAfterSiteWindow
            ? copy.labels.contractSiteWindow(
              selectedLocation?.contract_start_date ?? copy.labels.firstConfiguredDay,
              selectedLocation?.contract_end_date ?? copy.labels.lastConfiguredDay,
            )
          : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.labels.assignContractSiteTitle(employeeName)}</DialogTitle>
          <DialogDescription>
            {copy.labels.assignContractSiteDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.contractSiteLabel}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {copy.labels.contractSiteHint}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.attendanceLocation}</label>
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{copy.labels.selectContractSite}</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} - {location.unit_name || copy.labels.noUnit} / {location.business_name || copy.labels.noBusiness}
                </option>
              ))}
            </select>
            {activeLocations.length === 0 ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                {copy.labels.noAvailableContractSites}
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(event) => onChange({ ...form, end_time: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="rounded-lg bg-[#59C3A5]/5 px-3 py-2 text-xs text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA] sm:col-span-2">
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

export function ControlKioskManagerDialog(props: KioskManagementModalProps) {
  return <KioskManagementModal {...props} />;
}

export function ControlKioskDialog({
  copy,
  isOpen,
  isSaving,
  form,
  locations,
  title,
  isEditing = false,
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
  isEditing?: boolean;
  onClose: () => void;
  onChange: (value: AttendanceKioskDevicePayload) => void;
  onSave: () => void;
}) {
  const kioskType = kioskTypeFromMetadata(form.metadata);
  const activeLocations = locations.filter(isActiveLocation);
  const businessStructureLocations = activeLocations.filter((location) => locationMatchesKioskType(location, 'business_unit'));
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
  const selectedScopeLabel = (() => {
    if (kioskType === 'open_attendance') {
      return 'All employees / location not enforced';
    }
    if (kioskType === 'business_unit') {
      if (form.business_id) {
        return [
          selectedBusiness?.unitName || selectedUnit?.name || copy.labels.allUnits,
          selectedBusiness?.name || copy.labels.noBusiness,
        ].join(' / ');
      }
      if (form.unit_id) {
        return [selectedUnit?.name || copy.labels.noUnit, copy.labels.allBusinesses].join(' / ');
      }
      return [copy.labels.allUnits, copy.labels.allBusinesses].join(' / ');
    }
    return selectedLocation
      ? [selectedLocation.unit_name || copy.labels.noUnit, selectedLocation.business_name || copy.labels.noBusiness].join(' / ')
      : copy.labels.noLinkedLocation;
  })();
  const isBusinessUnitKiosk = kioskType === 'business_unit';
  const isOpenAttendanceKiosk = kioskType === 'open_attendance';
  const requiresLocation = kioskType !== 'business_unit' && kioskType !== 'open_attendance';
  const canSave = !isSaving && form.code.trim().length > 0 && form.name.trim().length > 0 && (!requiresLocation || Boolean(form.location_id));
  const updateKioskType = (nextType: KioskType) => {
    const currentLocation = locations.find((location) => location.id === form.location_id);
    if (nextType === 'open_attendance') {
      onChange({
        ...form,
        unit_id: null,
        business_id: null,
        location_id: null,
        name: form.name || 'Open Attendance Point',
        code: form.code || defaultKioskScopeCode('Open Attendance', `open-attendance-${Date.now().toString(36).slice(-5)}`),
        metadata: withKioskType(form.metadata, nextType),
      });
      return;
    }

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
      name: form.name || `${label} Attendance Point`,
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
      name: form.name || `${nextBusiness?.name || copy.labels.allBusinesses} Attendance Point`,
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
      name: form.name || (nextLocation ? `${nextLocation.name} Attendance Point` : form.name),
      code: form.code || (nextLocation ? defaultKioskCode(nextLocation, kioskType) : form.code),
    });
  };

  return (
    <CreateKioskModal
      canSave={canSave}
      form={form}
      isBusinessUnitKiosk={isBusinessUnitKiosk}
      isOpenAttendanceKiosk={isOpenAttendanceKiosk}
      isEditing={isEditing}
      isOpen={isOpen}
      isSaving={isSaving}
      kioskType={kioskType}
      title={title}
      availableLocations={availableLocations}
      businessOptions={businessOptions}
      hasBusinessStructureLocations={businessStructureLocations.length > 0}
      selectedScopeLabel={selectedScopeLabel}
      unitOptions={unitOptions}
      onChange={onChange}
      onClose={onClose}
      onKioskTypeChange={updateKioskType}
      onLocationChange={updateKioskLocation}
      onBusinessChange={updateKioskBusiness}
      onSave={onSave}
      onUnitChange={updateKioskUnit}
    />
  );
}
