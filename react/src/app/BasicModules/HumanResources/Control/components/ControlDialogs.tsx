import { Button } from '../../../../components/ui/button';
import { CalendarClock, MapPin, MapPinned, UsersRound } from 'lucide-react';
import { IndiceModalFrame } from '../../../../components/indice-modal';
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
import { CreateKioskModal, type KioskOption } from './kiosks/CreateKioskModal';
import type { ControlWorkSiteForm, KioskType } from '../types/controlTypes';
import {
  contractSiteAssignmentDates,
  dateInputValue,
  defaultKioskScopeCode,
  isActiveLocation,
  kioskTypeFromMetadata,
  laterDate,
  locationMatchesKioskType,
  timeToInput,
  withContractSiteTime,
  withKioskType,
} from '../utils/controlDialogUtils';

export type { ControlWorkSiteForm } from '../types/controlTypes';

const hasKioskLocationGeometry = (location: AttendanceControlLocation) => (
  Number.isFinite(Number(location.latitude))
  && Number.isFinite(Number(location.longitude))
  && Number.isFinite(Number(location.radius_meters))
  && Number(location.radius_meters) > 0
);

const isBusinessScopeKioskLocation = (location: AttendanceControlLocation) => (
  isActiveLocation(location)
  && Boolean(location.unit_id)
  && Boolean(location.business_id)
  && (location.managed_source ?? '').toLowerCase() !== 'contract_site'
  && hasKioskLocationGeometry(location)
);

const collectBusinessScopeKioskLocations = (
  locations: AttendanceControlLocation[],
  assignments: AttendanceControlAssignment[],
) => {
  const locationById = new Map<number, AttendanceControlLocation>();
  const addLocation = (location?: AttendanceControlLocation | null) => {
    if (location && isBusinessScopeKioskLocation(location)) {
      locationById.set(location.id, location);
    }
  };

  locations.forEach(addLocation);
  assignments.forEach((assignment) => {
    assignment.business_locations?.forEach(addLocation);
    assignment.allowed_locations?.forEach(addLocation);
  });

  return Array.from(locationById.values());
};

const formatKioskRadiusSummary = (
  locations: AttendanceControlLocation[],
  copy: AttendanceControlCopy,
) => {
  const radii = Array.from(new Set(
    locations
      .map((location) => Math.round(Number(location.radius_meters)))
      .filter((radius) => Number.isFinite(radius) && radius > 0),
  )).sort((left, right) => left - right);

  if (radii.length === 0) {
    return copy.kiosk.form.noActiveLocations;
  }

  if (radii.length === 1) {
    return `${radii[0] * 2} m`;
  }

  return `${radii[0] * 2}-${radii[radii.length - 1] * 2} m`;
};

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
    <IndiceModalFrame
      busy={isSaving}
      contentClassName="sm:max-w-4xl"
      description={copy.sections.locationsHint}
      footer={<Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>}
      footerLeading={<Button variant="outline" onClick={onClose} disabled={isSaving}>{copy.labels.cancel}</Button>}
      icon={<MapPinned className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={title}
      tone="aqua"
    >
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
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.basic.contractStart}</label>
              <input
                type="date"
                value={form.contract_start_date}
                onChange={(event) => onChange({ ...form, contract_start_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.basic.contractEnd}</label>
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
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.scheduleStep.hoursPerDay}</label>
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
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.scheduleStep.startTime}</label>
	              <input
	                type="time"
	                value={timeToInput(form.required_start_time) || '08:00'}
	                onChange={(event) => onChange(withContractSiteTime(form, 'required_start_time', event.target.value))}
	                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
	              />
	            </div>
	            <div>
	              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.scheduleStep.endTime}</label>
	              <input
	                type="time"
	                value={timeToInput(form.required_end_time) || '16:00'}
	                onChange={(event) => onChange(withContractSiteTime(form, 'required_end_time', event.target.value))}
	                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
	              />
	            </div>
          </div>
        </div>
    </IndiceModalFrame>
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
    <IndiceModalFrame
      busy={isSaving}
      contentClassName="sm:max-w-4xl"
      description={copy.sections.templatesHint}
      footer={<Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>}
      footerLeading={<Button variant="outline" onClick={onClose} disabled={isSaving}>{copy.labels.cancel}</Button>}
      icon={<CalendarClock className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={title}
      tone="aqua"
    >
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
    </IndiceModalFrame>
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
  const cannotSaveAssignment =
    isSaving ||
    form.user_company_ids.length === 0 ||
    form.template_id <= 0 ||
    Boolean(dateValidationMessage) ||
    form.user_company_ids.some((employeeId) => {
      const assignment = assignments.find((item) => item.user_company_id === employeeId);
      return assignment ? Boolean(getAssignmentBusyReason(assignment)) : false;
    });

  return (
    <IndiceModalFrame
      busy={isSaving}
      contentClassName="sm:max-w-4xl"
      description={copy.labels.assignmentHint}
      footer={<Button onClick={onSave} disabled={cannotSaveAssignment}>{copy.labels.save}</Button>}
      footerLeading={<Button variant="outline" onClick={onClose} disabled={isSaving}>{copy.labels.cancel}</Button>}
      footerSummary={`${form.user_company_ids.length} ${copy.labels.employeesToAssign}`}
      icon={<UsersRound className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={copy.labels.bulkAssign}
      tone="aqua"
    >
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
                  {copy.labels.noFreeHrUsersForDate}
                </div>
              )}
            </div>
            {assignments.length > availableAssignments.length ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {copy.labels.busyHrUsersHidden}
              </p>
            ) : null}
          </div>
        </div>
    </IndiceModalFrame>
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
  const cannotSaveWorkSite = isSaving
    || form.location_id <= 0
    || !form.effective_start_date
    || Boolean(dateValidationMessage)
    || !form.start_time
    || !form.end_time
    || invalidTimeRange;

  return (
    <IndiceModalFrame
      busy={isSaving}
      description={copy.labels.assignContractSiteDescription}
      footer={<Button onClick={onSave} disabled={cannotSaveWorkSite}>{copy.labels.save}</Button>}
      footerLeading={<Button variant="outline" onClick={onClose} disabled={isSaving}>{copy.labels.cancel}</Button>}
      icon={<MapPin className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={copy.labels.assignContractSiteTitle(employeeName)}
      tone="aqua"
    >
        <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{copy.labels.contractSiteLabel}</p>
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveStart}</label>
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveEnd}</label>
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
            <p className="text-sm font-medium text-gray-900 dark:text-white">{copy.labels.assignedHours}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.scheduleStep.startTime}</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(event) => onChange({ ...form, start_time: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.contractSites.scheduleStep.endTime}</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(event) => onChange({ ...form, end_time: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="rounded-lg bg-[#59C3A5]/5 px-3 py-2 text-xs text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA] sm:col-span-2">
            {copy.labels.workSiteDateHint}
          </div>
          {invalidTimeRange ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
              {copy.labels.endTimeCannotEqualStartTime}
            </div>
          ) : null}
          {isOvernightShift ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200 sm:col-span-2">
              {copy.labels.overnightShiftHint}
            </div>
          ) : null}
        </div>
    </IndiceModalFrame>
  );
}

export function ControlKioskManagerDialog(props: KioskManagementModalProps) {
  return <KioskManagementModal {...props} />;
}

export function ControlKioskDialog({
  assignments,
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
  const kioskType = typeof form.metadata?.kiosk_type === 'string'
    ? kioskTypeFromMetadata(form.metadata)
    : form.unit_id || form.business_id || form.location_id
      ? 'business_unit'
      : 'open_attendance';
  const businessScopeLocations = collectBusinessScopeKioskLocations(locations, assignments);
  const unitOptions = Array.from(
    new Map(
      businessScopeLocations
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
  const businessOptions: KioskOption[] = businessScopeLocations
    .filter((location) => form.unit_id && location.unit_id === form.unit_id)
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
  const selectedScopeLocations = businessScopeLocations.filter((location) => (
    Boolean(form.unit_id)
    && location.unit_id === form.unit_id
    && (!form.business_id || location.business_id === form.business_id)
  ));
  const selectedScopeLabel = kioskType === 'business_unit'
    ? form.business_id
      ? [
          selectedBusiness?.unitName || selectedUnit?.name || copy.labels.noUnit,
          selectedBusiness?.name || copy.labels.noBusiness,
        ].join(' / ')
      : form.unit_id
        ? [selectedUnit?.name || copy.labels.noUnit, copy.labels.allBusinesses].join(' / ')
        : copy.contractSites.basic.selectUnit
    : copy.kiosk.form.allEmployeesNoLocationScope;
  const selectedRadiusLabel = kioskType === 'business_unit'
    ? formatKioskRadiusSummary(selectedScopeLocations, copy)
    : copy.kiosk.form.allEmployeesNoLocationScope;
  const hasBusinessScopeLocations = businessScopeLocations.length > 0;
  const allowedKioskTypes: readonly KioskType[] = isEditing
    ? [kioskType]
    : ['business_unit', 'open_attendance'];
  const hasValidBusinessScope = kioskType !== 'business_unit' || (
    Boolean(form.unit_id)
    && Boolean(form.business_id)
    && selectedScopeLocations.length > 0
  );
  const requiresLocation = kioskType !== 'business_unit' && kioskType !== 'open_attendance';
  const canSave = !isSaving
    && form.code.trim().length > 0
    && form.name.trim().length > 0
    && hasValidBusinessScope
    && (!requiresLocation || Boolean(form.location_id));
  const updateKioskType = (nextType: KioskType) => {
    const currentLocation = locations.find((location) => location.id === form.location_id);
    if (nextType === 'open_attendance') {
      onChange({
        ...form,
        unit_id: null,
        business_id: null,
        location_id: null,
        name: form.name || copy.kiosk.form.defaultOpenAttendanceName,
        code: form.code || defaultKioskScopeCode(copy.kiosk.form.defaultOpenAttendanceCodeLabel, `open-attendance-${Date.now().toString(36).slice(-5)}`),
        metadata: withKioskType(form.metadata, nextType),
      });
      return;
    }

    if (nextType === 'business_unit') {
      const currentLocationCanScope = currentLocation ? isBusinessScopeKioskLocation(currentLocation) : false;
      const currentLocationUnitId = currentLocationCanScope ? currentLocation?.unit_id ?? null : null;
      const fallbackUnit = unitOptions.find((unit) => unit.id === (currentLocationUnitId ?? form.unit_id))
        ?? unitOptions[0]
        ?? null;
      const nextUnitId = currentLocationUnitId ?? fallbackUnit?.id ?? null;
      const availableBusinessesForUnit = businessScopeLocations
        .filter((location) => nextUnitId && location.unit_id === nextUnitId && location.business_id)
        .map((location) => location.business_id as number);
      const nextBusinessId = currentLocationCanScope && currentLocation?.business_id
        ? currentLocation.business_id
        : form.business_id && availableBusinessesForUnit.includes(form.business_id)
          ? form.business_id
          : null;
      const scopeLabel = fallbackUnit?.name || copy.labels.unit;
      onChange({
        ...form,
        unit_id: nextUnitId,
        business_id: nextBusinessId,
        location_id: null,
        name: form.name || copy.kiosk.form.defaultAttendancePointName(scopeLabel),
        code: form.code || defaultKioskScopeCode(scopeLabel, nextUnitId ? `unit-${nextUnitId}` : 'business-unit'),
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
    const currentBusiness = businessOptions.find((business) => business.id === form.business_id) ?? null;
    const shouldKeepBusiness = Boolean(unitId && currentBusiness?.unitId === unitId);
    const label = nextUnit?.name || copy.labels.unit;
    onChange({
      ...form,
      unit_id: unitId,
      business_id: shouldKeepBusiness ? form.business_id ?? null : null,
      location_id: null,
      name: form.name || copy.kiosk.form.defaultAttendancePointName(label),
      code: form.code || defaultKioskScopeCode(label, unitId ? `unit-${unitId}` : 'business-unit'),
      metadata: withKioskType(form.metadata, 'business_unit'),
    });
  };
  const updateKioskBusiness = (businessId: number | null) => {
    const nextBusiness = businessOptions.find((business) => business.id === businessId) ?? null;
    const label = nextBusiness?.name || selectedUnit?.name || copy.labels.business;
    onChange({
      ...form,
      unit_id: nextBusiness?.unitId ?? form.unit_id ?? null,
      business_id: businessId,
      location_id: null,
      name: form.name || copy.kiosk.form.defaultAttendancePointName(label),
      code: form.code || defaultKioskScopeCode(label, businessId ? `business-${businessId}` : `unit-${form.unit_id ?? 'business-unit'}`),
      metadata: withKioskType(form.metadata, 'business_unit'),
    });
  };

  return (
    <CreateKioskModal
      allowedKioskTypes={allowedKioskTypes}
      businessOptions={businessOptions}
      canSave={canSave}
      copy={copy}
      form={form}
      hasScopedLocations={hasBusinessScopeLocations}
      isEditing={isEditing}
      isOpen={isOpen}
      isSaving={isSaving}
      kioskType={kioskType}
      selectedRadiusLabel={selectedRadiusLabel}
      selectedScopeLabel={selectedScopeLabel}
      title={title}
      unitOptions={unitOptions}
      onBusinessChange={updateKioskBusiness}
      onChange={onChange}
      onClose={onClose}
      onKioskTypeChange={updateKioskType}
      onSave={onSave}
      onUnitChange={updateKioskUnit}
    />
  );
}
