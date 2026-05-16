import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
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
import { ContractSiteRegistrationModal } from './ContractSiteRegistrationModal';
import { ControlKioskQrDialog } from './ControlCalendarDialogs';
import {
  ControlAssignmentDialog,
  ControlContractSiteDialog,
  ControlKioskDialog,
  ControlKioskManagerDialog,
  ControlTemplateDialog,
  ControlWorkSiteDialog,
  type ControlWorkSiteForm,
} from './ControlDialogs';
import { ScheduleModal } from './ScheduleModal';
import { TimeTableModal } from './TimeTableModal';
import { type AttendanceControlCopy } from './ControlAttendanceWidgets';

type PendingTimeTableRemoval = {
  assignment: AttendanceControlAssignment;
  targetDate: string;
};

type PendingCalendarScheduleClear = {
  employeeId: number;
  employeeName: string;
  targetDate: string;
};

type ScheduleAppliedResult = {
  employeeIds: number[];
  templateId: number;
  templateName: string;
};

interface AttendanceControlDialogsProps {
  copy: AttendanceControlCopy;
  locale: string;
  controlDate: string;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  availableContractSiteLocations: AttendanceControlLocation[];
  locations: AttendanceControlLocation[];
  templates: AttendanceControlTemplate[];
  kioskDevices: AttendanceKioskDevice[];
  selectedEmployeeName: string;
  selectedTemplateId: number | null;
  selectedKioskDeviceLink: string;
  kioskQrDataUrl: string;
  isKioskQrDialogOpen: boolean;
  onKioskQrDialogOpenChange: (open: boolean) => void;
  onCopySelectedKioskLink: () => void;
  isKioskManagerOpen: boolean;
  onCloseKioskManager: () => void;
  onNewKiosk: () => void;
  onEditKiosk: (device: AttendanceKioskDevice) => void;
  onOpenKiosk: (device: AttendanceKioskDevice) => void;
  onCopyKioskLink: (device: AttendanceKioskDevice) => void;
  onShowKioskQr: (device: AttendanceKioskDevice) => void;
  onRotateKioskLink: (device: AttendanceKioskDevice) => void;
  onRequestDeleteKiosk: (device: AttendanceKioskDevice) => void;
  isLocationDialogOpen: boolean;
  editingLocationName: string | null;
  locationForm: AttendanceControlLocationPayload;
  onCloseLocationDialog: () => void;
  onLocationFormChange: (payload: AttendanceControlLocationPayload) => void;
  onSaveLocation: () => void;
  isTemplateDialogOpen: boolean;
  editingTemplateName: string | null;
  templateForm: AttendanceControlTemplatePayload;
  onCloseTemplateDialog: () => void;
  onTemplateFormChange: (payload: AttendanceControlTemplatePayload) => void;
  onSaveTemplate: () => void;
  isAssignmentDialogOpen: boolean;
  assignmentForm: AttendanceControlAssignmentPayload;
  onCloseAssignmentDialog: () => void;
  onAssignmentFormChange: (payload: AttendanceControlAssignmentPayload) => void;
  onSaveAssignment: () => void;
  isWorkSiteDialogOpen: boolean;
  workSiteForm: ControlWorkSiteForm;
  onCloseWorkSiteDialog: () => void;
  onWorkSiteFormChange: (payload: ControlWorkSiteForm) => void;
  onSaveWorkSite: () => void;
  isKioskDialogOpen: boolean;
  editingKioskName: string | null;
  kioskForm: AttendanceKioskDevicePayload;
  onCloseKioskDialog: () => void;
  onKioskFormChange: (payload: AttendanceKioskDevicePayload) => void;
  onSaveKiosk: () => void;
  isContractSiteRegistrationModalOpen: boolean;
  onCloseContractSiteRegistration: () => void;
  onReloadContractSites: () => Promise<void> | void;
  onContractSiteSaved: () => void;
  isTimeTableModalOpen: boolean;
  onCloseTimeTable: () => void;
  onDateChange: (date: string) => void;
  onRemoveShift: (assignment: AttendanceControlAssignment, targetDate?: string) => Promise<void> | void;
  isSchedulesModalOpen: boolean;
  onCloseSchedules: () => void;
  onScheduleApplied: (result: ScheduleAppliedResult) => Promise<void> | void;
  pendingTimeTableRemoval: PendingTimeTableRemoval | null;
  onConfirmTimeTableRemoval: () => void;
  onCancelTimeTableRemoval: () => void;
  pendingCalendarScheduleClear: PendingCalendarScheduleClear | null;
  onConfirmCalendarScheduleClear: () => void;
  onCancelCalendarScheduleClear: () => void;
  kioskDeviceToDelete: AttendanceKioskDevice | null;
  onConfirmDeleteKiosk: () => void;
  onCancelDeleteKiosk: () => void;
}

export function AttendanceControlDialogs({
  copy,
  locale,
  controlDate,
  isSaving,
  assignments,
  availableContractSiteLocations,
  locations,
  templates,
  kioskDevices,
  selectedEmployeeName,
  selectedTemplateId,
  selectedKioskDeviceLink,
  kioskQrDataUrl,
  isKioskQrDialogOpen,
  onKioskQrDialogOpenChange,
  onCopySelectedKioskLink,
  isKioskManagerOpen,
  onCloseKioskManager,
  onNewKiosk,
  onEditKiosk,
  onOpenKiosk,
  onCopyKioskLink,
  onShowKioskQr,
  onRotateKioskLink,
  onRequestDeleteKiosk,
  isLocationDialogOpen,
  editingLocationName,
  locationForm,
  onCloseLocationDialog,
  onLocationFormChange,
  onSaveLocation,
  isTemplateDialogOpen,
  editingTemplateName,
  templateForm,
  onCloseTemplateDialog,
  onTemplateFormChange,
  onSaveTemplate,
  isAssignmentDialogOpen,
  assignmentForm,
  onCloseAssignmentDialog,
  onAssignmentFormChange,
  onSaveAssignment,
  isWorkSiteDialogOpen,
  workSiteForm,
  onCloseWorkSiteDialog,
  onWorkSiteFormChange,
  onSaveWorkSite,
  isKioskDialogOpen,
  editingKioskName,
  kioskForm,
  onCloseKioskDialog,
  onKioskFormChange,
  onSaveKiosk,
  isContractSiteRegistrationModalOpen,
  onCloseContractSiteRegistration,
  onReloadContractSites,
  onContractSiteSaved,
  isTimeTableModalOpen,
  onCloseTimeTable,
  onDateChange,
  onRemoveShift,
  isSchedulesModalOpen,
  onCloseSchedules,
  onScheduleApplied,
  pendingTimeTableRemoval,
  onConfirmTimeTableRemoval,
  onCancelTimeTableRemoval,
  pendingCalendarScheduleClear,
  onConfirmCalendarScheduleClear,
  onCancelCalendarScheduleClear,
  kioskDeviceToDelete,
  onConfirmDeleteKiosk,
  onCancelDeleteKiosk,
}: AttendanceControlDialogsProps) {
  return (
    <>
      <ControlKioskQrDialog
        copy={copy}
        isOpen={isKioskQrDialogOpen}
        kioskLink={selectedKioskDeviceLink}
        qrDataUrl={kioskQrDataUrl}
        onOpenChange={onKioskQrDialogOpenChange}
        onCopy={onCopySelectedKioskLink}
      />

      <ControlKioskManagerDialog
        copy={copy}
        isOpen={isKioskManagerOpen}
        isSaving={isSaving}
        kioskDevices={kioskDevices}
        locations={locations}
        onClose={onCloseKioskManager}
        onNew={onNewKiosk}
        onEdit={onEditKiosk}
        onOpen={onOpenKiosk}
        onCopy={onCopyKioskLink}
        onQr={onShowKioskQr}
        onRotate={onRotateKioskLink}
        onDelete={onRequestDeleteKiosk}
      />

      <ControlContractSiteDialog
        copy={copy}
        isOpen={isLocationDialogOpen}
        isSaving={isSaving}
        form={locationForm}
        onClose={onCloseLocationDialog}
        onChange={onLocationFormChange}
        onSave={onSaveLocation}
        title={editingLocationName ? `${copy.labels.addLocation}: ${editingLocationName}` : copy.labels.addLocation}
      />

      <ControlTemplateDialog
        copy={copy}
        isOpen={isTemplateDialogOpen}
        isSaving={isSaving}
        form={templateForm}
        onClose={onCloseTemplateDialog}
        onChange={onTemplateFormChange}
        onSave={onSaveTemplate}
        title={editingTemplateName ? `${copy.labels.addTemplate}: ${editingTemplateName}` : copy.labels.addTemplate}
        locale={locale}
      />

      <ControlAssignmentDialog
        copy={copy}
        isOpen={isAssignmentDialogOpen}
        isSaving={isSaving}
        assignments={assignments}
        templates={templates}
        form={assignmentForm}
        onClose={onCloseAssignmentDialog}
        onChange={onAssignmentFormChange}
        onSave={onSaveAssignment}
      />

      <ControlWorkSiteDialog
        copy={copy}
        isOpen={isWorkSiteDialogOpen}
        isSaving={isSaving}
        employeeName={selectedEmployeeName}
        locations={availableContractSiteLocations}
        form={workSiteForm}
        onClose={onCloseWorkSiteDialog}
        onChange={onWorkSiteFormChange}
        onSave={onSaveWorkSite}
      />

      <ControlKioskDialog
        copy={copy}
        isOpen={isKioskDialogOpen}
        isSaving={isSaving}
        form={kioskForm}
        assignments={assignments}
        locations={locations}
        onClose={onCloseKioskDialog}
        onChange={onKioskFormChange}
        onSave={onSaveKiosk}
        title={editingKioskName ? `Edit attendance point: ${editingKioskName}` : 'New attendance point'}
        isEditing={Boolean(editingKioskName)}
      />

      <ContractSiteRegistrationModal
        isOpen={isContractSiteRegistrationModalOpen}
        onClose={onCloseContractSiteRegistration}
        locations={locations}
        assignments={assignments}
        controlDate={controlDate}
        onReload={onReloadContractSites}
        onSaved={onContractSiteSaved}
      />

      <TimeTableModal
        isOpen={isTimeTableModalOpen}
        onClose={onCloseTimeTable}
        assignments={assignments}
        date={controlDate}
        locale={locale}
        isSaving={isSaving}
        onDateChange={onDateChange}
        onRemoveShift={onRemoveShift}
      />

      <ScheduleModal
        isOpen={isSchedulesModalOpen}
        onClose={onCloseSchedules}
        templates={templates}
        locations={locations.filter((location) => location.status !== 'inactive')}
        selectedTemplateId={selectedTemplateId}
        effectiveStartDate={controlDate}
        onApplied={onScheduleApplied}
      />

      <ConfirmDeleteDialog
        isVisible={pendingTimeTableRemoval !== null}
        title={copy.labels.removeTimeTableDayTitle}
        description={copy.labels.removeTimeTableDayDescription}
        itemName={pendingTimeTableRemoval
          ? `${pendingTimeTableRemoval.assignment.user_name} - ${pendingTimeTableRemoval.targetDate}`
          : undefined}
        confirmLabel={copy.labels.removeTimeTableDayConfirm}
        cancelLabel={copy.labels.cancel}
        onConfirm={onConfirmTimeTableRemoval}
        onCancel={onCancelTimeTableRemoval}
      />

      <ConfirmDeleteDialog
        isVisible={pendingCalendarScheduleClear !== null}
        title={copy.labels.clearDayScheduleTitle}
        description={copy.labels.clearDayScheduleDescription}
        itemName={pendingCalendarScheduleClear
          ? `${pendingCalendarScheduleClear.employeeName} - ${pendingCalendarScheduleClear.targetDate}`
          : undefined}
        confirmLabel={copy.labels.clearDayScheduleConfirm}
        cancelLabel={copy.labels.cancel}
        onConfirm={onConfirmCalendarScheduleClear}
        onCancel={onCancelCalendarScheduleClear}
      />

      <ConfirmDeleteDialog
        isVisible={kioskDeviceToDelete !== null}
        title="Delete attendance point?"
        description="The attendance screen and QR will stop working. Existing attendance history will stay saved."
        itemName={kioskDeviceToDelete?.name}
        confirmLabel="Delete attendance point"
        cancelLabel={copy.labels.cancel}
        onConfirm={onConfirmDeleteKiosk}
        onCancel={onCancelDeleteKiosk}
      />
    </>
  );
}
