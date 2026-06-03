import { useEffect, useMemo, useState } from 'react';
import type { AttendanceCorrectionStatus } from '../../../../api/humanResources';
import { useLanguage } from '../../../../shared/context';
import type { ControlKpiStripLabels } from '../components/ControlKpiStrip';
import {
  buildControlControllerProps,
  type ControlControllerResult,
} from '../utils/controlControllerProps';
import { useCalendarDateSelection } from './useCalendarDateSelection';
import { useControlAttendanceFilters } from './useControlAttendanceFilters';
import { useControlCalendarActions } from './useControlCalendarActions';
import { useControlData } from './useControlData';
import { useControlDerivedState } from './useControlDerivedState';
import { useControlDialogState } from './useControlDialogState';
import { useControlKioskActions } from './useControlKioskActions';
import { useControlSaveActions } from './useControlSaveActions';
import { useControlToasts } from './useControlToasts';
import { useControlTranslations } from './useControlTranslations';

export function useControlController(): ControlControllerResult {
  const { currentLanguage } = useLanguage();
  const copy = useControlTranslations();
  const controlKpiLabels = useMemo(
    () => copy.kpi satisfies ControlKpiStripLabels,
    [copy.kpi],
  );
  const headerActionButtonClassName = 'h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#59C3A5] shadow-none hover:bg-[#59C3A5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto';
  const headerPrimaryActionButtonClassName = 'h-11 w-full justify-center gap-2 whitespace-nowrap rounded-xl bg-[#59C3A5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3AAE90] sm:w-auto';
  const [pendingCalendarStatus, setPendingCalendarStatus] = useState<AttendanceCorrectionStatus | ''>('');
  const [bulkCalendarStatus, setBulkCalendarStatus] = useState<AttendanceCorrectionStatus | ''>('on_time');
  const [isUpdatingCalendarDay, setIsUpdatingCalendarDay] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingTimeTableDay, setIsRemovingTimeTableDay] = useState(false);
  const [isClearingCalendarDaySchedule, setIsClearingCalendarDaySchedule] = useState(false);
  const toasts = useControlToasts();
  const {
    successMessage,
    showSuccessToast,
    showFailureToast,
    clearControlMessages,
  } = toasts;
  const data = useControlData({
    clearControlMessages,
    copy,
    showFailureToast,
    successMessage,
  });
  const {
    accessProfiles,
    attendanceCalendarDays,
    calendarMonth,
    controlDate,
    faceEnrollment,
    isLoading,
    isLoadingCalendar,
    kioskDevices,
    loadControl,
    locations,
    overview,
    selectedCalendarDay,
    selectedEmployeeId,
    selectedKioskDeviceId,
    selectedTemplateId,
    setAttendanceCalendarDays,
    setCalendarMonth,
    setControlDate,
    setKioskDevices,
    setOverview,
    setSelectedCalendarDay,
    setSelectedEmployeeId,
    setSelectedKioskDeviceId,
    setSelectedTemplateId,
    templates,
  } = data;
  const filters = useControlAttendanceFilters({
    controlDate,
    copy,
    overview,
  });
  const [isKioskQrDialogOpen, setIsKioskQrDialogOpen] = useState(false);
  const calendarSelection = useCalendarDateSelection({
    setControlDate,
    setSelectedCalendarDay,
  });
  const {
    selectedCalendarDates,
    clearCalendarDateSelection,
  } = calendarSelection;

  const derived = useControlDerivedState({
    accessProfiles,
    attendanceCalendarDays,
    calendarMonth,
    controlDate,
    copy,
    faceEnrollment,
    isClearingCalendarDaySchedule,
    isLoading,
    isLoadingCalendar,
    isRemovingTimeTableDay,
    isSaving,
    isUpdatingCalendarDay,
    kioskDevices,
    languageCode: currentLanguage.code,
    locations,
    overview,
    selectedCalendarDay,
    selectedEmployeeId,
    selectedKioskDeviceId,
    selectedTemplateId,
    templates,
  });
  const {
    availableContractSiteLocations,
    selectedCalendarDetailDay,
    selectedEmployee,
    selectedKioskDevice,
    selectedRuleForDate,
    selectedTemplate,
  } = derived;

  useEffect(() => {
    if (!selectedCalendarDetailDay) {
      setPendingCalendarStatus('');
      return;
    }

    setPendingCalendarStatus(selectedCalendarDetailDay.corrected_status ?? '');
  }, [selectedCalendarDetailDay]);

  const dialogs = useControlDialogState({
    availableContractSiteLocations,
    controlDate,
    copy,
    locations,
    onKioskSelected: setSelectedKioskDeviceId,
    onTemplateSelected: setSelectedTemplateId,
    selectedEmployee,
    selectedRuleForDate,
    selectedTemplate,
    showFailureToast,
    templates,
  });
  const {
    assignmentForm,
    editingKiosk,
    editingLocation,
    editingTemplate,
    isKioskDialogOpen,
    kioskDeviceToDelete,
    kioskForm,
    locationForm,
    pendingCalendarScheduleClear,
    pendingTimeTableRemoval,
    setAssignmentForm,
    setIsAssignmentDialogOpen,
    setIsKioskDialogOpen,
    setIsLocationDialogOpen,
    setIsTemplateDialogOpen,
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
  } = dialogs;
  const calendarActions = useControlCalendarActions({
    attendanceCalendarDays,
    bulkCalendarStatus,
    calendarMonth,
    clearCalendarDateSelection,
    clearControlMessages,
    controlDate,
    copy,
    isSaving,
    isUpdatingCalendarDay,
    loadControl,
    pendingCalendarScheduleClear,
    selectedCalendarDates,
    selectedCalendarDay,
    selectedEmployee,
    selectedEmployeeId,
    setAttendanceCalendarDays,
    setCalendarMonth,
    setControlDate,
    setIsClearingCalendarDaySchedule,
    setIsUpdatingCalendarDay,
    setOverview,
    setPendingCalendarScheduleClear,
    setSelectedCalendarDay,
    showFailureToast,
    showSuccessToast,
  });

  const kioskActions = useControlKioskActions({
    clearControlMessages,
    controlDate,
    copy,
    editingKiosk,
    isKioskQrDialogOpen,
    kioskDeviceToDelete,
    kioskForm,
    selectedKioskDevice,
    loadControl,
    setIsKioskDialogOpen,
    setIsKioskQrDialogOpen,
    setIsSaving,
    setKioskDeviceToDelete,
    setKioskDevices,
    setSelectedKioskDeviceId,
    showFailureToast,
    showSuccessToast,
  });
  const saveActions = useControlSaveActions({
    assignmentForm,
    clearControlMessages,
    controlDate,
    copy,
    editingLocation,
    editingTemplate,
    isSaving,
    loadControl,
    locationForm,
    locations,
    overview,
    pendingTimeTableRemoval,
    setIsAssignmentDialogOpen,
    setIsLocationDialogOpen,
    setIsRemovingTimeTableDay,
    setIsSaving,
    setIsTemplateDialogOpen,
    setIsWorkSiteDialogOpen,
    setPendingTimeTableRemoval,
    showFailureToast,
    showSuccessToast,
    templateForm,
    templates,
    workSiteForm,
  });
  return buildControlControllerProps({
    bulkCalendarStatus,
    calendarActions,
    calendarSelection,
    controlKpiLabels,
    copy,
    data,
    derived,
    dialogs,
    filters,
    headerActionButtonClassName,
    headerPrimaryActionButtonClassName,
    isSaving,
    isKioskQrDialogOpen,
    isUpdatingCalendarDay,
    kioskActions,
    locale: currentLanguage.code,
    pendingCalendarStatus,
    saveActions,
    setBulkCalendarStatus,
    setIsKioskQrDialogOpen,
    setPendingCalendarStatus,
    toasts,
  });
}
