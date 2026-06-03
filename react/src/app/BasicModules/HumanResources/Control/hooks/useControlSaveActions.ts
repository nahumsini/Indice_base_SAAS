import type { Dispatch, SetStateAction } from 'react';
import {
  type AttendanceControlAssignment,
  type AttendanceControlAssignmentPayload,
  type AttendanceControlLocation,
  type AttendanceControlLocationPayload,
  type AttendanceControlOverviewResponse,
  type AttendanceControlTemplate,
  type AttendanceControlTemplatePayload,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import type { ControlWorkSiteForm } from '../types/controlTypes';
import {
  bulkAssignControlSchedule,
  confirmClearEmployeeShift,
  type PendingTimeTableRemoval,
  requestClearEmployeeShift,
  saveControlLocation,
  saveControlTemplate,
  saveControlWorkSite,
  type SaveActionContext,
} from '../utils/controlSaveActions';

interface UseControlSaveActionsInput {
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

export function useControlSaveActions({
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
}: UseControlSaveActionsInput) {
  const actionContext: SaveActionContext = {
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
  };

  const handleSaveLocation = async () => saveControlLocation(actionContext);

  const handleSaveTemplate = async () => saveControlTemplate(actionContext);

  const handleBulkAssign = async () => bulkAssignControlSchedule(actionContext);

  const handleSaveWorkSite = async () => saveControlWorkSite(actionContext);

  const handleRequestClearEmployeeShift = (assignment: AttendanceControlAssignment, targetDate = controlDate) => {
    requestClearEmployeeShift(actionContext, assignment, targetDate);
  };

  const handleConfirmClearEmployeeShift = async () => confirmClearEmployeeShift(actionContext);

  return {
    handleBulkAssign,
    handleConfirmClearEmployeeShift,
    handleRequestClearEmployeeShift,
    handleSaveLocation,
    handleSaveTemplate,
    handleSaveWorkSite,
  };
}
