import type { Dispatch, SetStateAction } from "react";
import type { AttendanceCorrectionStatus } from "../../../../api/humanResources";
import type { ControlDialogHostProps } from "../components/ControlDialogHost";
import type { ControlFeedbackProps } from "../components/ControlFeedback";
import type { ControlKpiStripLabels } from "../components/ControlKpiStrip";
import type { ControlOperationsWorkspaceProps } from "../components/ControlOperationsWorkspace";
import type { ControlTranslations } from "../translations";
import { allFilterValue } from "./control.utils";
import type { useCalendarDateSelection } from "../hooks/useCalendarDateSelection";
import type { useControlAttendanceFilters } from "../hooks/useControlAttendanceFilters";
import type { useControlCalendarActions } from "../hooks/useControlCalendarActions";
import type { useControlData } from "../hooks/useControlData";
import type { useControlDerivedState } from "../hooks/useControlDerivedState";
import type { useControlDialogState } from "../hooks/useControlDialogState";
import type { useControlKioskActions } from "../hooks/useControlKioskActions";
import type { useControlSaveActions } from "../hooks/useControlSaveActions";
import type { useControlToasts } from "../hooks/useControlToasts";

export interface ControlControllerResult {
  dialogHostProps: ControlDialogHostProps;
  feedbackProps: ControlFeedbackProps;
  workspaceProps: ControlOperationsWorkspaceProps;
}

interface BuildControlControllerPropsInput {
  bulkCalendarStatus: AttendanceCorrectionStatus | "";
  calendarActions: ReturnType<typeof useControlCalendarActions>;
  calendarSelection: ReturnType<typeof useCalendarDateSelection>;
  controlKpiLabels: ControlKpiStripLabels;
  copy: ControlTranslations;
  data: ReturnType<typeof useControlData>;
  derived: ReturnType<typeof useControlDerivedState>;
  dialogs: ReturnType<typeof useControlDialogState>;
  filters: ReturnType<typeof useControlAttendanceFilters>;
  headerActionButtonClassName: string;
  headerPrimaryActionButtonClassName: string;
  isSaving: boolean;
  isCalendarBulkSelectionMode: boolean;
  isKioskQrDialogOpen: boolean;
  isUpdatingCalendarDay: boolean;
  kioskActions: ReturnType<typeof useControlKioskActions>;
  locale: string;
  pendingCalendarStatus: AttendanceCorrectionStatus | "";
  saveActions: ReturnType<typeof useControlSaveActions>;
  onSaveRestPlan: ControlDialogHostProps["onSaveRestPlan"];
  setBulkCalendarStatus: Dispatch<
    SetStateAction<AttendanceCorrectionStatus | "">
  >;
  setIsCalendarBulkSelectionMode: Dispatch<SetStateAction<boolean>>;
  setIsKioskQrDialogOpen: Dispatch<SetStateAction<boolean>>;
  setPendingCalendarStatus: Dispatch<
    SetStateAction<AttendanceCorrectionStatus | "">
  >;
  toasts: ReturnType<typeof useControlToasts>;
}

export function buildControlControllerProps({
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
  isCalendarBulkSelectionMode,
  isKioskQrDialogOpen,
  isUpdatingCalendarDay,
  kioskActions,
  locale,
  pendingCalendarStatus,
  saveActions,
  onSaveRestPlan,
  setBulkCalendarStatus,
  setIsCalendarBulkSelectionMode,
  setIsKioskQrDialogOpen,
  setPendingCalendarStatus,
  toasts,
}: BuildControlControllerPropsInput): ControlControllerResult {
  const hasOpenControlDialog =
    isKioskQrDialogOpen ||
    dialogs.isKioskManagerOpen ||
    dialogs.isLocationDialogOpen ||
    dialogs.isTemplateDialogOpen ||
    dialogs.isAssignmentDialogOpen ||
    dialogs.isWorkSiteDialogOpen ||
    dialogs.isRestPlannerDialogOpen ||
    dialogs.isKioskDialogOpen ||
    dialogs.isContractSiteRegistrationModalOpen ||
    dialogs.isTimeTableModalOpen ||
    dialogs.isSchedulesModalOpen ||
    dialogs.pendingTimeTableRemoval !== null ||
    dialogs.pendingCalendarScheduleClear !== null ||
    dialogs.kioskDeviceToDelete !== null;

  return {
    feedbackProps: {
      errorMessage: toasts.errorMessage,
      failureToastMessage: toasts.failureToastMessage,
      isOverlayVisible: derived.isControlOverlayVisible,
      loadingOverlayDescription: derived.loadingOverlayDescription,
      loadingOverlayTitle: derived.loadingOverlayTitle,
      retryLabel: copy.retry,
      showErrorBanner: Boolean(toasts.errorMessage && !data.overview),
      successMessage: toasts.successMessage,
      onDismissFailure: toasts.dismissFailureToast,
      onDismissSuccess: toasts.dismissSuccessToast,
      onRetry: () => void data.loadControl(data.controlDate),
    },
    workspaceProps: {
      calendarBulkActions: {
        bulkCalendarStatus,
        isSelectionMode: isCalendarBulkSelectionMode,
        isUpdatingCalendarDay,
        selectedCount: calendarSelection.selectedCalendarDates.length,
        onBulkStatusChange: setBulkCalendarStatus,
        onBulkApply: () =>
          void calendarActions.handleBulkCalendarStatusUpdate(),
        onClearSelection: calendarSelection.clearCalendarDateSelection,
        onExitSelectionMode: () => {
          calendarSelection.clearCalendarDateSelection();
          setIsCalendarBulkSelectionMode(false);
        },
      },
      calendarPanel: {
        copy,
        locale,
        calendarMonthLabel: derived.calendarMonthLabel,
        selectedCalendarDateSet: calendarSelection.selectedCalendarDateSet,
        isLoadingCalendar: data.isLoadingCalendar,
        weekdayLabels: derived.weekdayLabels,
        calendarCells: derived.calendarCells,
        attendanceCalendarMap: derived.attendanceCalendarMap,
        controlDate: data.controlDate,
        calendarMonth: data.calendarMonth,
        onShiftMonth: calendarActions.shiftCalendarMonth,
        onDayPointerDown: calendarSelection.startCalendarDateSelection,
        onDayPointerEnter: calendarSelection.extendCalendarDateSelection,
        onDayPointerMove: calendarSelection.extendCalendarDateSelection,
        onDaySelect: calendarSelection.selectCalendarDay,
      },
      dailyBoard: {
        copy,
        locale,
        controlDateLabel: derived.controlDateLabel,
        visibleCount: filters.visibleAttendanceAssignments.length,
        filteredCount: filters.statusFilteredAssignments.length,
        assignments: filters.visibleAttendanceAssignments,
        currentPage: filters.currentAttendanceListPage,
        endRow: filters.attendanceListShowingEnd,
        pageCount: filters.attendanceListPageCount,
        selectedEmployeeId: data.selectedEmployeeId,
        startRow: filters.attendanceListShowingStart,
        onPageChange: filters.setAttendanceListPage,
        onSelectAssignment: (assignment) => {
          data.setSelectedEmployeeId(assignment.user_company_id);
          if (assignment.schedule_template_id) {
            data.setSelectedTemplateId(assignment.schedule_template_id);
          }
        },
      },
      filters: {
        allFilterValue,
        businessFilter: filters.businessFilter,
        businessFilterOptions: filters.businessFilterOptions,
        controlDate: data.controlDate,
        copy,
        onBusinessFilterChange: filters.setBusinessFilter,
        onDateChange: data.setControlDate,
        onSearchChange: filters.setSearchQuery,
        onStatusFilterChange: filters.setStatusFilter,
        onUnitFilterChange: (value) => {
          filters.setUnitFilter(value);
          filters.setBusinessFilter(allFilterValue);
        },
        searchQuery: filters.searchQuery,
        statusFilter: filters.statusFilter,
        statusFilterOptions: filters.statusFilterOptions,
        unitFilter: filters.unitFilter,
        unitFilterOptions: filters.unitFilterOptions,
      },
      detailPanel: {
        copy,
        selectedEmployee: derived.selectedEmployee,
        selectedAccessProfile: derived.selectedAccessProfile,
        faceEnrollment: derived.selectedFaceEnrollment,
        assignments: data.overview?.assignments ?? [],
        selectedEmployeeBusyReason: derived.selectedEmployeeBusyReason,
        isCalendarBulkSelectionMode,
        selectedCalendarDayCount:
          calendarSelection.selectedCalendarDates.length,
        onToggleCalendarBulkSelectionMode: () => {
          setIsCalendarBulkSelectionMode((current) => {
            if (current) {
              calendarSelection.clearCalendarDateSelection();
            }
            return !current;
          });
        },
        onAssignLocation: dialogs.openWorkSiteDialog,
        onOpenRestPlanner: () => dialogs.setIsRestPlannerDialogOpen(true),
        onFaceEnrollmentChange: data.setFaceEnrollment,
        onReload: () => data.loadControl(data.controlDate),
        onSuccess: toasts.showSuccessToast,
        onError: toasts.showFailureToast,
      },
      hasOverview: Boolean(data.overview),
      isLoading: data.isLoading,
      kpiStrip: {
        absencesCount: derived.controlOperationSummary.absencesCount,
        activeShiftCount: derived.controlOperationSummary.activeShiftCount,
        checkInsCount: derived.controlOperationSummary.checkInsCount,
        checkOutsCount: derived.controlOperationSummary.checkOutsCount,
        isLoading: data.isLoading,
        labels: controlKpiLabels,
        lateCount: derived.controlOperationSummary.lateCount,
        noRecordCount: derived.controlOperationSummary.noRecordCount,
        onTrackCount: derived.controlOperationSummary.onTrackCount,
        otherStatusCount: derived.controlOperationSummary.otherStatusCount,
        totalCount: derived.controlOperationSummary.totalCount,
      },
      loadingLabel: copy.loading,
      quickActions: {
        copy,
        day: derived.selectedCalendarDetailDay,
        employeeName: derived.selectedEmployee?.user_name || "—",
        pendingStatus: pendingCalendarStatus,
        isSaving: isUpdatingCalendarDay,
        onPendingStatusChange: setPendingCalendarStatus,
        onSave: calendarActions.handleCalendarStatusUpdate,
        onClearDaySchedule: calendarActions.handleClearCalendarDaySchedule,
        onManualPunch: calendarActions.handleManualCalendarPunch,
      },
      settingsActions: {
        copy,
        actionButtonClassName: headerActionButtonClassName,
        primaryActionButtonClassName: headerPrimaryActionButtonClassName,
        onOpenContractSites: () =>
          dialogs.setIsContractSiteRegistrationModalOpen(true),
        onOpenTimeTable: () => dialogs.setIsTimeTableModalOpen(true),
        onOpenSchedules: () => dialogs.setIsSchedulesModalOpen(true),
        onOpenKiosks: () => dialogs.setIsKioskManagerOpen(true),
      },
      showKpiStrip: Boolean(data.isLoading || data.overview),
    },
    dialogHostProps: {
      hasOpenControlDialog,
      copy,
      locale,
      controlDate: data.controlDate,
      isSaving,
      assignments: data.overview?.assignments ?? [],
      availableContractSiteLocations: derived.availableContractSiteLocations,
      locations: data.locations,
      templates: data.templates,
      kioskDevices: data.kioskDevices,
      selectedEmployeeName: derived.selectedEmployee?.user_name ?? "—",
      selectedTemplateId: data.selectedTemplateId,
      selectedKioskDeviceLink: kioskActions.selectedKioskDeviceLink,
      kioskQrDataUrl: kioskActions.kioskQrDataUrl,
      isKioskQrDialogOpen,
      onKioskQrDialogOpenChange: setIsKioskQrDialogOpen,
      onCopySelectedKioskLink: () =>
        void kioskActions.handleCopyKioskLink(derived.selectedKioskDevice),
      isKioskManagerOpen: dialogs.isKioskManagerOpen,
      onCloseKioskManager: () => dialogs.setIsKioskManagerOpen(false),
      onNewKiosk: dialogs.openNewKioskDialog,
      onEditKiosk: dialogs.openEditKioskDialog,
      onOpenKiosk: kioskActions.handleOpenKiosk,
      onCopyKioskLink: (device) =>
        void kioskActions.handleCopyKioskLink(device),
      onShowKioskQr: kioskActions.handleShowKioskQr,
      onRotateKioskLink: (device) =>
        void kioskActions.handleRotateKioskLink(device),
      onRequestDeleteKiosk: dialogs.setKioskDeviceToDelete,
      isLocationDialogOpen: dialogs.isLocationDialogOpen,
      editingLocationName: dialogs.editingLocation?.name ?? null,
      locationForm: dialogs.locationForm,
      onCloseLocationDialog: () => dialogs.setIsLocationDialogOpen(false),
      onLocationFormChange: dialogs.setLocationForm,
      onSaveLocation: () => void saveActions.handleSaveLocation(),
      isTemplateDialogOpen: dialogs.isTemplateDialogOpen,
      editingTemplateName: dialogs.editingTemplate?.name ?? null,
      templateForm: dialogs.templateForm,
      onCloseTemplateDialog: () => dialogs.setIsTemplateDialogOpen(false),
      onTemplateFormChange: dialogs.setTemplateForm,
      onSaveTemplate: () => void saveActions.handleSaveTemplate(),
      isAssignmentDialogOpen: dialogs.isAssignmentDialogOpen,
      assignmentForm: dialogs.assignmentForm,
      onCloseAssignmentDialog: () => dialogs.setIsAssignmentDialogOpen(false),
      onAssignmentFormChange: dialogs.setAssignmentForm,
      onSaveAssignment: () => void saveActions.handleBulkAssign(),
      isWorkSiteDialogOpen: dialogs.isWorkSiteDialogOpen,
      workSiteForm: dialogs.workSiteForm,
      onCloseWorkSiteDialog: () => dialogs.setIsWorkSiteDialogOpen(false),
      onWorkSiteFormChange: dialogs.setWorkSiteForm,
      onSaveWorkSite: () => void saveActions.handleSaveWorkSite(),
      isRestPlannerDialogOpen: dialogs.isRestPlannerDialogOpen,
      calendarMonth: data.calendarMonth,
      onCloseRestPlanner: () => dialogs.setIsRestPlannerDialogOpen(false),
      onSaveRestPlan,
      isKioskDialogOpen: dialogs.isKioskDialogOpen,
      editingKioskName: dialogs.editingKiosk?.name ?? null,
      kioskForm: dialogs.kioskForm,
      onCloseKioskDialog: () => dialogs.setIsKioskDialogOpen(false),
      onKioskFormChange: dialogs.setKioskForm,
      onSaveKiosk: () => void kioskActions.handleSaveKiosk(),
      isContractSiteRegistrationModalOpen:
        dialogs.isContractSiteRegistrationModalOpen,
      onCloseContractSiteRegistration: () =>
        dialogs.setIsContractSiteRegistrationModalOpen(false),
      onReloadContractSites: () => data.loadControl(data.controlDate),
      onContractSiteSaved: () => toasts.showSuccessToast(copy.locationSaved),
      isTimeTableModalOpen: dialogs.isTimeTableModalOpen,
      onCloseTimeTable: () => dialogs.setIsTimeTableModalOpen(false),
      onDateChange: data.setControlDate,
      onRemoveShift: (assignment, targetDate) =>
        saveActions.handleRequestClearEmployeeShift(assignment, targetDate),
      isSchedulesModalOpen: dialogs.isSchedulesModalOpen,
      onCloseSchedules: () => dialogs.setIsSchedulesModalOpen(false),
      onScheduleApplied: async (result) => {
        data.setSelectedEmployeeId((current) =>
          current && result.employeeIds.includes(current)
            ? current
            : (result.employeeIds[0] ?? current),
        );
        data.setSelectedTemplateId(result.templateId);
        await data.loadControl(data.controlDate);
        toasts.showSuccessToast(copy.bulkAssignSuccess);
      },
      pendingTimeTableRemoval: dialogs.pendingTimeTableRemoval,
      onConfirmTimeTableRemoval: () =>
        void saveActions.handleConfirmClearEmployeeShift(),
      onCancelTimeTableRemoval: () => dialogs.setPendingTimeTableRemoval(null),
      pendingCalendarScheduleClear: dialogs.pendingCalendarScheduleClear,
      onConfirmCalendarScheduleClear: () =>
        void calendarActions.handleConfirmClearCalendarDaySchedule(),
      onCancelCalendarScheduleClear: () =>
        dialogs.setPendingCalendarScheduleClear(null),
      kioskDeviceToDelete: dialogs.kioskDeviceToDelete,
      onConfirmDeleteKiosk: () => void kioskActions.handleDeleteKiosk(),
      onCancelDeleteKiosk: () => dialogs.setKioskDeviceToDelete(null),
    },
  };
}
