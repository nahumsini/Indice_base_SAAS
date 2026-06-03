import { useCallback, useState } from 'react';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import {
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlTemplate,
} from '../../../../api/humanResources';
import {
  defaultScheduleTemplateName,
  permanentScheduleEndDate,
  scheduleSaveMinimumLoadingMs,
} from '../constants/scheduleConstants';
import type {
  HorarioDiaDraft,
  ScheduleAppliedResult,
  ScheduleCopy,
  ScheduleLocationRule,
} from '../types/scheduleTypes';
import { waitForNextPaint } from '../utils/scheduleDates';
import { formatPreviewList } from '../utils/scheduleFormatters';
import {
  buildScheduleTemplatePayload,
  normalizeTemplatePayload,
  payloadFromTemplate,
} from '../utils/schedulePayloads';

interface UseScheduleTemplateActionsInput {
  addCreatedTemplate: (template: AttendanceControlTemplate) => void;
  assignmentDateError: string;
  assignmentEffectiveStartDate: string;
  availableTemplates: AttendanceControlTemplate[];
  copy: ScheduleCopy;
  horarios: HorarioDiaDraft[];
  isOpenSchedule: boolean;
  locationRule: ScheduleLocationRule;
  markTemplateDeleted: (templateId: number) => void;
  onApplied?: (result: ScheduleAppliedResult) => Promise<void> | void;
  onClose: () => void;
  onErrorMessageChange: (message: string) => void;
  onFailureToastClear: () => void;
  onScrollReset: () => void;
  removeCreatedTemplate: (templateId: number) => void;
  resetSchedule: () => void;
  selectedEmployeeIds: number[];
  selectedLockedAssignments: AttendanceControlAssignment[];
  selectedTemplate: AttendanceControlTemplate | null;
  selectedTemplateName: string;
  setSelectedScheduleTemplateId: (templateId: number | null) => void;
  setSelectedTemplateName: (templateName: string) => void;
  showFailureToast: (message: string) => void;
  toleranciaIngreso: number;
  ubicacionSeleccionada: string;
}

export function useScheduleTemplateActions({
  addCreatedTemplate,
  assignmentDateError,
  assignmentEffectiveStartDate,
  availableTemplates,
  copy,
  horarios,
  isOpenSchedule,
  locationRule,
  markTemplateDeleted,
  onApplied,
  onClose,
  onErrorMessageChange,
  onFailureToastClear,
  onScrollReset,
  removeCreatedTemplate,
  resetSchedule,
  selectedEmployeeIds,
  selectedLockedAssignments,
  selectedTemplate,
  selectedTemplateName,
  setSelectedScheduleTemplateId,
  setSelectedTemplateName,
  showFailureToast,
  toleranciaIngreso,
  ubicacionSeleccionada,
}: UseScheduleTemplateActionsInput) {
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [templateNameError, setTemplateNameError] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetTemplateActionState = useCallback(() => {
    setIsSaveTemplateModalOpen(false);
    setTemplateNameDraft('');
    setTemplateNameError('');
    setIsSavingTemplate(false);
    setIsDeletingTemplate(false);
  }, []);

  const buildTemplatePayload = useCallback((templateName = selectedTemplateName.trim() || defaultScheduleTemplateName) => {
    const payload = buildScheduleTemplatePayload({
      copy,
      horarios,
      isOpenSchedule,
      locationRule,
      templateName,
      toleranciaIngreso,
      ubicacionSeleccionada,
    });

    if (!payload) {
      const message = copy.errors.selectAllowedLocation;
      onErrorMessageChange(message);
      showFailureToast(message);
      return null;
    }

    return payload;
  }, [
    copy,
    horarios,
    isOpenSchedule,
    locationRule,
    onErrorMessageChange,
    selectedTemplateName,
    showFailureToast,
    toleranciaIngreso,
    ubicacionSeleccionada,
  ]);

  const applySchedule = useCallback(async () => {
    setIsSubmitting(true);
    onErrorMessageChange('');
    onFailureToastClear();
    await waitForNextPaint();

    try {
      const appliedResult = await runWithMinimumDuration((async () => {
        if (selectedEmployeeIds.length === 0) {
          const message = copy.errors.selectHrUser;
          onErrorMessageChange(message);
          showFailureToast(message);
          return null;
        }

        if (selectedLockedAssignments.length > 0) {
          const lockedNames = formatPreviewList(
            selectedLockedAssignments.map((assignment) => assignment.user_name),
            copy.selectedHrUsersFallback,
            copy,
          );
          const message = copy.errors.lockedAssignments(lockedNames);
          onErrorMessageChange(message);
          showFailureToast(message);
          return null;
        }

        const payload = buildTemplatePayload();
        if (!payload) {
          return null;
        }
        if (assignmentDateError) {
          const message = assignmentDateError;
          onErrorMessageChange(message);
          showFailureToast(message);
          return null;
        }

        const normalizedPayload = normalizeTemplatePayload(payload);
        const sameAsSelectedTemplate = selectedTemplate
          ? normalizedPayload === normalizeTemplatePayload(payloadFromTemplate(selectedTemplate))
          : false;
        const reusableTemplate = sameAsSelectedTemplate
          ? selectedTemplate
          : availableTemplates.find((template) =>
            template.status !== 'inactive' &&
              normalizedPayload === normalizeTemplatePayload(payloadFromTemplate(template)),
          ) ?? null;

        let templateId = reusableTemplate?.id ?? null;
        let appliedTemplateName = reusableTemplate?.name ?? payload.name;
        if (!templateId) {
          const templateName = availableTemplates.some((template) => template.name === payload.name)
            ? `${payload.name} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
            : payload.name;
          const response = await humanResourcesApi.createAttendanceControlTemplate({
            ...payload,
            name: templateName,
          });
          templateId = response.template.id;
          appliedTemplateName = response.template.name;
          addCreatedTemplate(response.template);
        }

        await humanResourcesApi.bulkAssignAttendanceSchedule({
          user_company_ids: selectedEmployeeIds,
          template_id: templateId,
          effective_start_date: assignmentEffectiveStartDate,
          effective_end_date: permanentScheduleEndDate,
        });

        return {
          employeeIds: selectedEmployeeIds,
          templateId,
          templateName: appliedTemplateName,
        };
      })(), scheduleSaveMinimumLoadingMs);

      if (!appliedResult) {
        return;
      }

      await Promise.resolve(onApplied?.(appliedResult));
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.errors.applyFailed;
      onErrorMessageChange(message);
      showFailureToast(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addCreatedTemplate,
    assignmentDateError,
    assignmentEffectiveStartDate,
    availableTemplates,
    buildTemplatePayload,
    copy,
    onApplied,
    onClose,
    onErrorMessageChange,
    onFailureToastClear,
    selectedEmployeeIds,
    selectedLockedAssignments,
    selectedTemplate,
    showFailureToast,
  ]);

  const openSaveTemplateModal = useCallback(() => {
    setTemplateNameDraft(selectedTemplateName && selectedTemplateName !== defaultScheduleTemplateName ? selectedTemplateName : '');
    setTemplateNameError('');
    setIsSaveTemplateModalOpen(true);
  }, [selectedTemplateName]);

  const closeSaveTemplateModal = useCallback(() => {
    if (isSavingTemplate) {
      return;
    }

    setIsSaveTemplateModalOpen(false);
    setTemplateNameError('');
  }, [isSavingTemplate]);

  const saveScheduleTemplate = useCallback(async () => {
    const templateName = templateNameDraft.trim();
    if (!templateName) {
      setTemplateNameError(copy.errors.templateNameRequired);
      return;
    }

    if (availableTemplates.some((template) => template.name.trim().toLowerCase() === templateName.toLowerCase())) {
      setTemplateNameError(copy.errors.templateExists);
      return;
    }

    setIsSavingTemplate(true);
    setTemplateNameError('');
    onErrorMessageChange('');
    onFailureToastClear();

    try {
      const payload = buildTemplatePayload(templateName);
      if (!payload) {
        setTemplateNameError(copy.errors.templateIncomplete);
        return;
      }

      const response = await humanResourcesApi.createAttendanceControlTemplate(payload);
      addCreatedTemplate(response.template);
      setSelectedScheduleTemplateId(response.template.id);
      setSelectedTemplateName(response.template.name);
      setIsSaveTemplateModalOpen(false);
      setTemplateNameDraft('');
      onScrollReset();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.errors.templateSaveFailed;
      setTemplateNameError(message);
      showFailureToast(message);
    } finally {
      setIsSavingTemplate(false);
    }
  }, [
    addCreatedTemplate,
    availableTemplates,
    buildTemplatePayload,
    copy,
    onErrorMessageChange,
    onFailureToastClear,
    onScrollReset,
    setSelectedScheduleTemplateId,
    setSelectedTemplateName,
    showFailureToast,
    templateNameDraft,
  ]);

  const deleteSelectedScheduleTemplate = useCallback(async () => {
    const template = selectedTemplate;
    if (!template) {
      const message = copy.errors.selectTemplateBeforeRemove;
      onErrorMessageChange(message);
      showFailureToast(message);
      return;
    }

    const confirmed = window.confirm(copy.errors.removeTemplateConfirm(template.name));
    if (!confirmed) {
      return;
    }

    setIsDeletingTemplate(true);
    onErrorMessageChange('');
    onFailureToastClear();

    try {
      await humanResourcesApi.updateAttendanceControlTemplate(template.id, {
        ...payloadFromTemplate(template),
        status: 'inactive',
      });
      markTemplateDeleted(template.id);
      removeCreatedTemplate(template.id);
      resetSchedule();
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.errors.removeTemplateFailed;
      onErrorMessageChange(message);
      showFailureToast(message);
    } finally {
      setIsDeletingTemplate(false);
    }
  }, [
    copy,
    markTemplateDeleted,
    onErrorMessageChange,
    onFailureToastClear,
    removeCreatedTemplate,
    resetSchedule,
    selectedTemplate,
    showFailureToast,
  ]);

  return {
    applySchedule,
    closeSaveTemplateModal,
    deleteSelectedScheduleTemplate,
    isDeletingTemplate,
    isSaveTemplateModalOpen,
    isSavingTemplate,
    isSubmitting,
    openSaveTemplateModal,
    resetTemplateActionState,
    saveScheduleTemplate,
    setTemplateNameDraft,
    templateNameDraft,
    templateNameError,
  };
}
