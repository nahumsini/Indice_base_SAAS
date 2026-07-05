import { useState } from "react";
import type {
  AttendanceControlAssignment,
  AttendanceControlAssignmentPayload,
  AttendanceControlLocation,
  AttendanceControlLocationPayload,
  AttendanceControlTemplate,
  AttendanceControlTemplatePayload,
  AttendanceKioskDevice,
  AttendanceKioskDevicePayload,
} from "../../../../api/humanResources";
import { getAssignmentBusyReason } from "../components/ControlAttendanceWidgets";
import type { ControlWorkSiteForm } from "../components/ControlDialogs";
import type { ControlTranslations } from "../translations";
import {
  contractSiteAssignmentDates,
  defaultAssignmentForm,
  defaultKioskForm,
  defaultLocationForm,
  defaultTemplateForm,
  defaultWorkSiteForm,
  timeInputValue,
  todayInputValue,
  todayIsoDate,
} from "../utils/control.utils";

interface UseControlDialogStateInput {
  availableContractSiteLocations: AttendanceControlLocation[];
  controlDate: string;
  copy: ControlTranslations;
  locations: AttendanceControlLocation[];
  onKioskSelected: (id: number) => void;
  onTemplateSelected: (id: number) => void;
  selectedEmployee: AttendanceControlAssignment | null;
  selectedRuleForDate: AttendanceControlTemplate["days"][number] | undefined;
  selectedTemplate: AttendanceControlTemplate | null;
  showFailureToast: (message: string) => void;
  templates: AttendanceControlTemplate[];
}

export function useControlDialogState({
  availableContractSiteLocations,
  controlDate,
  copy,
  locations,
  onKioskSelected,
  onTemplateSelected,
  selectedEmployee,
  selectedRuleForDate,
  selectedTemplate,
  showFailureToast,
  templates,
}: UseControlDialogStateInput) {
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [
    isContractSiteRegistrationModalOpen,
    setIsContractSiteRegistrationModalOpen,
  ] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<AttendanceControlLocation | null>(null);
  const [locationForm, setLocationForm] =
    useState<AttendanceControlLocationPayload>(defaultLocationForm());

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false);
  const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);
  const [pendingTimeTableRemoval, setPendingTimeTableRemoval] = useState<{
    assignment: AttendanceControlAssignment;
    targetDate: string;
  } | null>(null);
  const [pendingCalendarScheduleClear, setPendingCalendarScheduleClear] =
    useState<{
      employeeId: number;
      employeeName: string;
      targetDate: string;
    } | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<AttendanceControlTemplate | null>(null);
  const [templateForm, setTemplateForm] =
    useState<AttendanceControlTemplatePayload>(defaultTemplateForm());

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] =
    useState<AttendanceControlAssignmentPayload>(defaultAssignmentForm());
  const [isWorkSiteDialogOpen, setIsWorkSiteDialogOpen] = useState(false);
  const [isRestPlannerDialogOpen, setIsRestPlannerDialogOpen] = useState(false);
  const [workSiteForm, setWorkSiteForm] = useState<ControlWorkSiteForm>(
    defaultWorkSiteForm(),
  );
  const [isKioskManagerOpen, setIsKioskManagerOpen] = useState(false);
  const [isKioskDialogOpen, setIsKioskDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] =
    useState<AttendanceKioskDevice | null>(null);
  const [kioskForm, setKioskForm] =
    useState<AttendanceKioskDevicePayload>(defaultKioskForm());
  const [kioskDeviceToDelete, setKioskDeviceToDelete] =
    useState<AttendanceKioskDevice | null>(null);

  const openNewLocationDialog = () => {
    setEditingLocation(null);
    setLocationForm(defaultLocationForm());
    setIsLocationDialogOpen(true);
  };

  const openEditLocationDialog = (location: AttendanceControlLocation) => {
    setEditingLocation(location);
    setLocationForm({
      unit_id: location.unit_id ?? null,
      business_id: location.business_id ?? null,
      contract_start_date: location.contract_start_date ?? todayInputValue(),
      contract_end_date:
        location.contract_end_date ??
        location.contract_start_date ??
        todayInputValue(),
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
      required_hours_per_day: location.required_hours_per_day ?? 8,
      required_start_time: location.required_start_time ?? "08:00:00",
      required_end_time: location.required_end_time ?? "16:00:00",
      status: location.status === "inactive" ? "inactive" : "active",
    });
    setIsLocationDialogOpen(true);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm());
    setIsTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: AttendanceControlTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      status: template.status === "inactive" ? "inactive" : "active",
      schedule_mode: template.schedule_mode === "open" ? "open" : "strict",
      block_after_grace_period: false,
      enforce_location: Boolean(template.enforce_location),
      location_id: template.location_id ?? null,
      days: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
        const rule = template.days.find((day) => day.day_of_week === dayOfWeek);
        const isRestDay = rule?.is_rest_day ?? false;
        return {
          day_of_week: dayOfWeek,
          start_time: isRestDay ? null : (rule?.start_time ?? "08:00:00"),
          end_time: isRestDay ? null : (rule?.end_time ?? "16:00:00"),
          meal_minutes: rule?.meal_minutes ?? 0,
          rest_minutes: rule?.rest_minutes ?? 0,
          late_after_minutes: rule?.late_after_minutes ?? 10,
          is_rest_day: isRestDay,
        };
      }),
    });
    onTemplateSelected(template.id);
    setIsTemplateDialogOpen(true);
  };

  const openAssignmentDialog = () => {
    const today = todayIsoDate();
    const effectiveStartDate = controlDate < today ? today : controlDate;
    setAssignmentForm({
      user_company_ids:
        selectedEmployee && !getAssignmentBusyReason(selectedEmployee, copy)
          ? [selectedEmployee.user_company_id]
          : [],
      template_id:
        selectedEmployee?.schedule_template_id ??
        selectedTemplate?.id ??
        templates[0]?.id ??
        0,
      effective_start_date: effectiveStartDate,
      effective_end_date: effectiveStartDate,
    });
    setIsAssignmentDialogOpen(true);
  };

  const openWorkSiteDialog = () => {
    if (!selectedEmployee) {
      return;
    }
    if (controlDate < todayIsoDate()) {
      showFailureToast(copy.labels.chooseFutureShiftDate);
      return;
    }
    const busyReason = getAssignmentBusyReason(selectedEmployee, copy);
    if (busyReason) {
      showFailureToast(
        copy.labels.removeExistingShiftBeforeContractSite(busyReason),
      );
      return;
    }

    if (availableContractSiteLocations.length === 0) {
      showFailureToast(copy.labels.noAvailableContractSites);
    }

    const availableLocationIds = new Set(
      availableContractSiteLocations.map((location) => location.id),
    );
    const allowedLocationIds =
      selectedEmployee.allowed_locations?.map((location) => location.id) ?? [];
    const firstAvailableLocationId = availableContractSiteLocations[0]?.id ?? 0;
    const activeLocationId =
      allowedLocationIds.find((locationId) =>
        availableLocationIds.has(locationId),
      ) ?? firstAvailableLocationId;
    const activeLocation = locations.find(
      (location) => location.id === activeLocationId,
    );
    const assignmentDates = contractSiteAssignmentDates(
      activeLocation,
      controlDate,
    );
    const nextAllowedLocationIds = Array.from(
      new Set([
        ...allowedLocationIds,
        ...(activeLocationId > 0 ? [activeLocationId] : []),
      ]),
    );

    setWorkSiteForm({
      user_company_ids: [selectedEmployee.user_company_id],
      location_ids: nextAllowedLocationIds,
      location_id: activeLocationId,
      effective_start_date: assignmentDates.startDate,
      effective_end_date: assignmentDates.endDate,
      start_time:
        timeInputValue(activeLocation?.required_start_time) ||
        timeInputValue(selectedRuleForDate?.start_time) ||
        "08:00",
      end_time:
        timeInputValue(activeLocation?.required_end_time) ||
        timeInputValue(selectedRuleForDate?.end_time) ||
        "16:00",
    });
    setIsWorkSiteDialogOpen(true);
  };

  const openNewKioskDialog = () => {
    setEditingKiosk(null);
    setKioskForm(defaultKioskForm());
    setIsKioskDialogOpen(true);
  };

  const openEditKioskDialog = (device: AttendanceKioskDevice) => {
    setEditingKiosk(device);
    setKioskForm({
      code: device.code,
      name: device.name,
      unit_id: device.unit_id ?? null,
      business_id: device.business_id ?? null,
      location_id: device.location_id ?? null,
      status: device.status,
      metadata: {
        supports_face_recognition: false,
        kiosk_type: "business_unit",
        ...(device.metadata ?? {}),
      },
    });
    onKioskSelected(device.id);
    setIsKioskDialogOpen(true);
  };

  return {
    assignmentForm,
    editingKiosk,
    editingLocation,
    editingTemplate,
    isAssignmentDialogOpen,
    isContractSiteRegistrationModalOpen,
    isKioskDialogOpen,
    isKioskManagerOpen,
    isLocationDialogOpen,
    isSchedulesModalOpen,
    isRestPlannerDialogOpen,
    isTemplateDialogOpen,
    isTimeTableModalOpen,
    isWorkSiteDialogOpen,
    kioskDeviceToDelete,
    kioskForm,
    locationForm,
    openAssignmentDialog,
    openEditKioskDialog,
    openEditLocationDialog,
    openEditTemplateDialog,
    openNewKioskDialog,
    openNewLocationDialog,
    openNewTemplateDialog,
    openWorkSiteDialog,
    pendingCalendarScheduleClear,
    pendingTimeTableRemoval,
    setAssignmentForm,
    setEditingKiosk,
    setIsAssignmentDialogOpen,
    setIsContractSiteRegistrationModalOpen,
    setIsKioskDialogOpen,
    setIsKioskManagerOpen,
    setIsLocationDialogOpen,
    setIsSchedulesModalOpen,
    setIsRestPlannerDialogOpen,
    setIsTemplateDialogOpen,
    setIsTimeTableModalOpen,
    setIsWorkSiteDialogOpen,
    setKioskDeviceToDelete,
    setKioskForm,
    setLocationForm,
    setPendingCalendarScheduleClear,
    setPendingTimeTableRemoval,
    setTemplateForm,
    setWorkSiteForm,
    templateForm,
    workSiteForm,
  };
}
