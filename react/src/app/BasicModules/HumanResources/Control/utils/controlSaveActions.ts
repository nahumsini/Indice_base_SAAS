import type { Dispatch, SetStateAction } from 'react';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import {
  type AttendanceControlAssignment,
  type AttendanceControlAssignmentPayload,
  type AttendanceControlLocation,
  type AttendanceControlLocationPayload,
  type AttendanceControlOverviewResponse,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
  humanResourcesApi,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import type { ControlWorkSiteForm } from '../types/controlTypes';
import { getAssignmentBusyReason } from './attendanceWidgetUtils';
import {
  CONTROL_SAVE_MINIMUM_LOADING_MS,
  templateDayMatchesHours,
  toErrorMessage,
  todayIsoDate,
  waitForNextPaint,
  weekdayNumbers,
} from './control.utils';

export interface PendingTimeTableRemoval {
  assignment: AttendanceControlAssignment;
  targetDate: string;
}

export interface SaveActionContext {
  assignmentForm: AttendanceControlAssignmentPayload;
  clearControlMessages: () => void;
  controlDate: string;
  copy: ControlTranslations;
  editingLocation: AttendanceControlLocation | null;
  editingTemplate: AttendanceControlTemplate | null;
  isSaving: boolean;
  loadControl: (date: string) => Promise<void>;
  locationForm: AttendanceControlLocationPayload;
  locations: AttendanceControlLocation[];
  overview: AttendanceControlOverviewResponse | null;
  pendingTimeTableRemoval: PendingTimeTableRemoval | null;
  setIsAssignmentDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsLocationDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsRemovingTimeTableDay: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setIsTemplateDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsWorkSiteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setPendingTimeTableRemoval: Dispatch<SetStateAction<PendingTimeTableRemoval | null>>;
  showFailureToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  templateForm: AttendanceControlTemplatePayload;
  templates: AttendanceControlTemplate[];
  workSiteForm: ControlWorkSiteForm;
}

const runSavingAction = async (
  context: SaveActionContext,
  action: () => Promise<void>,
) => {
  context.setIsSaving(true);
  context.clearControlMessages();
  await waitForNextPaint();

  try {
    await runWithMinimumDuration(action(), CONTROL_SAVE_MINIMUM_LOADING_MS);
  } catch (error) {
    context.showFailureToast(toErrorMessage(error, context.copy) || context.copy.saveError);
  } finally {
    context.setIsSaving(false);
  }
};

const buildWorkSiteTemplateDays = (
  startTime: string,
  endTime: string,
): AttendanceControlTemplatePayload['days'] =>
  weekdayNumbers.map((dayOfWeek) => ({
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    meal_minutes: 0,
    rest_minutes: 0,
    late_after_minutes: 10,
    is_rest_day: false,
  }));

const findReusableWorkSiteTemplate = (
  templates: AttendanceControlTemplate[],
  names: string[],
  locationId: number,
  startTime: string,
  endTime: string,
) =>
  templates.find((template) =>
    template.status !== 'inactive' &&
      names.includes(template.name) &&
      template.location_id === locationId &&
      weekdayNumbers.every((dayOfWeek) =>
        templateDayMatchesHours(
          template.days.find((day) => day.day_of_week === dayOfWeek),
          dayOfWeek,
          startTime,
          endTime,
        ),
      ),
  ) ?? null;

const validateBulkAssignmentForm = (context: SaveActionContext) => {
  const today = todayIsoDate();
  if (!context.assignmentForm.effective_start_date || !context.assignmentForm.effective_end_date) {
    return context.copy.labels.startEndDateRequired;
  }
  if (context.assignmentForm.effective_start_date < today) {
    return context.copy.labels.startDatePast;
  }
  if (context.assignmentForm.effective_end_date < context.assignmentForm.effective_start_date) {
    return context.copy.labels.endDateBeforeStart;
  }
  return '';
};

const validateWorkSiteForm = (context: SaveActionContext) => {
  const employeeId = context.workSiteForm.user_company_ids[0];
  const today = todayIsoDate();
  if (
    !employeeId ||
    context.workSiteForm.location_id <= 0 ||
    !context.workSiteForm.effective_start_date ||
    !context.workSiteForm.effective_end_date ||
    !context.workSiteForm.start_time ||
    !context.workSiteForm.end_time ||
    context.workSiteForm.end_time === context.workSiteForm.start_time
  ) {
    return context.copy.saveError;
  }
  if (context.workSiteForm.effective_start_date < today) {
    return context.copy.labels.startDatePast;
  }
  if (context.workSiteForm.effective_end_date < context.workSiteForm.effective_start_date) {
    return context.copy.labels.endDateBeforeStart;
  }

  const selectedLocation = context.locations.find((location) => location.id === context.workSiteForm.location_id);
  if (!selectedLocation) {
    return context.copy.saveError;
  }
  if (selectedLocation.status === 'inactive') {
    return context.copy.labels.activeContractSiteRequired;
  }
  if (
    (selectedLocation.contract_start_date && context.workSiteForm.effective_start_date < selectedLocation.contract_start_date) ||
    (selectedLocation.contract_end_date && context.workSiteForm.effective_end_date > selectedLocation.contract_end_date)
  ) {
    return context.copy.labels.contractSiteWindow(
      selectedLocation.contract_start_date ?? context.copy.labels.firstConfiguredDay,
      selectedLocation.contract_end_date ?? context.copy.labels.lastConfiguredDay,
    );
  }

  const currentAssignment = context.overview?.assignments.find((assignment) => assignment.user_company_id === employeeId) ?? null;
  const busyReason = currentAssignment ? getAssignmentBusyReason(currentAssignment, context.copy) : '';
  if (busyReason) {
    return context.copy.labels.removeExistingShiftBeforeContractSite(busyReason);
  }

  return '';
};

const ensureWorkSiteTemplate = async (
  context: SaveActionContext,
  selectedLocation: AttendanceControlLocation,
) => {
  const baseTemplateName = `${selectedLocation.name} Contract Hours`;
  const timeTemplateName = `${baseTemplateName} ${context.workSiteForm.start_time}-${context.workSiteForm.end_time}`;
  const reusableTemplate = findReusableWorkSiteTemplate(
    context.templates,
    [baseTemplateName, timeTemplateName],
    selectedLocation.id,
    context.workSiteForm.start_time,
    context.workSiteForm.end_time,
  );
  if (reusableTemplate?.id) {
    return reusableTemplate.id;
  }

  const templateName = context.templates.some((template) => template.name === baseTemplateName)
    ? context.templates.some((template) => template.name === timeTemplateName)
      ? `${timeTemplateName} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
      : timeTemplateName
    : baseTemplateName;
  const templateResponse = await humanResourcesApi.createAttendanceControlTemplate({
    name: templateName,
    status: 'active',
    schedule_mode: 'strict',
    block_after_grace_period: false,
    enforce_location: true,
    location_id: selectedLocation.id,
    days: buildWorkSiteTemplateDays(context.workSiteForm.start_time, context.workSiteForm.end_time),
  });
  return templateResponse.template.id;
};

export const saveControlLocation = async (context: SaveActionContext) => {
  await runSavingAction(context, async () => {
    if (context.editingLocation) {
      await humanResourcesApi.updateAttendanceControlLocation(context.editingLocation.id, context.locationForm);
    } else {
      await humanResourcesApi.createAttendanceControlLocation(context.locationForm);
    }

    context.setIsLocationDialogOpen(false);
    context.showSuccessToast(context.copy.locationSaved);
    await context.loadControl(context.controlDate);
  });
};

export const saveControlTemplate = async (context: SaveActionContext) => {
  await runSavingAction(context, async () => {
    if (context.editingTemplate) {
      await humanResourcesApi.updateAttendanceControlTemplate(context.editingTemplate.id, context.templateForm);
    } else {
      await humanResourcesApi.createAttendanceControlTemplate(context.templateForm);
    }

    context.setIsTemplateDialogOpen(false);
    context.showSuccessToast(context.copy.templateSaved);
    await context.loadControl(context.controlDate);
  });
};

export const bulkAssignControlSchedule = async (context: SaveActionContext) => {
  const validationMessage = validateBulkAssignmentForm(context);
  if (validationMessage) {
    context.showFailureToast(validationMessage);
    return;
  }

  await runSavingAction(context, async () => {
    await humanResourcesApi.bulkAssignAttendanceSchedule({
      user_company_ids: context.assignmentForm.user_company_ids,
      template_id: Number(context.assignmentForm.template_id),
      effective_start_date: context.assignmentForm.effective_start_date,
      effective_end_date: context.assignmentForm.effective_end_date,
    });

    context.setIsAssignmentDialogOpen(false);
    context.showSuccessToast(context.copy.bulkAssignSuccess);
    await context.loadControl(context.controlDate);
  });
};

export const saveControlWorkSite = async (context: SaveActionContext) => {
  const validationMessage = validateWorkSiteForm(context);
  if (validationMessage) {
    context.showFailureToast(validationMessage);
    return;
  }

  const selectedLocation = context.locations.find((location) => location.id === context.workSiteForm.location_id);
  if (!selectedLocation) {
    context.showFailureToast(context.copy.saveError);
    return;
  }

  await runSavingAction(context, async () => {
    const templateId = await ensureWorkSiteTemplate(context, selectedLocation);
    const employeeId = context.workSiteForm.user_company_ids[0];

    await humanResourcesApi.replaceAttendanceHrUserAllowedLocations(employeeId, {
      location_ids: Array.from(new Set([...context.workSiteForm.location_ids, selectedLocation.id])),
    });
    await humanResourcesApi.bulkAssignAttendanceWorkSite({
      user_company_ids: context.workSiteForm.user_company_ids,
      location_id: context.workSiteForm.location_id,
      template_id: templateId,
      effective_start_date: context.workSiteForm.effective_start_date,
      effective_end_date: context.workSiteForm.effective_end_date,
    });

    context.setIsWorkSiteDialogOpen(false);
    context.showSuccessToast(context.copy.labels.workSiteAssignmentSaved);
    await context.loadControl(context.controlDate);
  });
};

export const requestClearEmployeeShift = (
  context: SaveActionContext,
  assignment: AttendanceControlAssignment,
  targetDate: string,
) => {
  if (context.isSaving || !assignment.user_company_id) {
    return;
  }

  context.setPendingTimeTableRemoval({ assignment, targetDate });
};

export const confirmClearEmployeeShift = async (context: SaveActionContext) => {
  if (!context.pendingTimeTableRemoval || context.isSaving) {
    return;
  }

  const { assignment, targetDate } = context.pendingTimeTableRemoval;
  context.setPendingTimeTableRemoval(null);
  context.setIsSaving(true);
  context.setIsRemovingTimeTableDay(true);
  context.clearControlMessages();
  await waitForNextPaint();

  try {
    await runWithMinimumDuration((async () => {
      await humanResourcesApi.clearAttendanceWorkAssignments({
        user_company_id: assignment.user_company_id,
        date: targetDate,
      });
      context.showSuccessToast(context.copy.labels.removeTimeTableDaySuccess);
      await context.loadControl(context.controlDate);
    })(), CONTROL_SAVE_MINIMUM_LOADING_MS);
  } catch (error) {
    context.showFailureToast(toErrorMessage(error, context.copy) || context.copy.saveError);
  } finally {
    context.setIsRemovingTimeTableDay(false);
    context.setIsSaving(false);
  }
};
