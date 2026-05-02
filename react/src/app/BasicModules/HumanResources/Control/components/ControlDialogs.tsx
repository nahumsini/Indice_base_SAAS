import { Copy, ExternalLink, MapPin, Pencil, Plus, QrCode, RotateCw } from 'lucide-react';
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

const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);
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
                onChange={(event) => onChange({ ...form, effective_start_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.effectiveEnd}</label>
              <input
                type="date"
                value={form.effective_end_date ?? ''}
                onChange={(event) => onChange({ ...form, effective_end_date: event.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

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
  const invalidTimeRange = Boolean(form.start_time && form.end_time && form.end_time === form.start_time);

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
	                onChange({
	                  ...form,
	                  location_id: locationId,
	                  location_ids: locationId > 0 ? Array.from(new Set([...form.location_ids, locationId])) : form.location_ids,
	                  start_time: timeToInput(selectedLocation?.required_start_time) || form.start_time,
	                  end_time: timeToInput(selectedLocation?.required_end_time) || form.end_time,
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
                No available contract sites for this date. Sites already assigned to another employee are hidden.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start date</label>
            <input
              type="date"
              value={form.effective_start_date}
              onChange={(event) => onChange({ ...form, effective_start_date: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End date</label>
            <input
              type="date"
              value={form.effective_end_date}
              onChange={(event) => onChange({ ...form, effective_end_date: event.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

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
            Empty end date keeps this assignment active until you remove or end the shift.
          </div>
          {invalidTimeRange ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
              End time cannot equal start time.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{copy.labels.cancel}</Button>
          <Button
            onClick={onSave}
            disabled={isSaving || form.location_id <= 0 || !form.effective_start_date || !form.start_time || !form.end_time || invalidTimeRange}
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
}) {
  const locationNameForDevice = (device: AttendanceKioskDevice) =>
    device.location_name
    || locations.find((location) => location.id === device.location_id)?.name
    || copy.labels.noLinkedLocation;

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
                      <p>{device.unit_name || copy.labels.noUnit}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{device.business_name || copy.labels.noBusiness}</p>
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
  assignments,
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
  const unitOptions = Array.from(new Map(
    assignments
      .filter((assignment) => assignment.unit_id)
      .map((assignment) => [assignment.unit_id!, assignment.unit_name || copy.labels.noUnit]),
  ).entries());
  const businessOptions = Array.from(new Map(
    assignments
      .filter((assignment) => assignment.business_id)
      .map((assignment) => [assignment.business_id!, assignment.business_name || copy.labels.noBusiness]),
  ).entries());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy.sections.kiosksHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.code}</label>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.unit}</label>
              <select
                value={form.unit_id ?? ''}
                onChange={(event) => onChange({ ...form, unit_id: event.target.value ? Number(event.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noUnit}</option>
                {unitOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.business}</label>
              <select
                value={form.business_id ?? ''}
                onChange={(event) => onChange({ ...form, business_id: event.target.value ? Number(event.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noBusiness}</option>
                {businessOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.linkedLocation}</label>
              <select
                value={form.location_id ?? ''}
                onChange={(event) => onChange({ ...form, location_id: event.target.value ? Number(event.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#143675] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{copy.labels.noLinkedLocation}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
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
          <Button onClick={onSave} disabled={isSaving}>{copy.labels.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
