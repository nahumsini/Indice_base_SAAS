import type { ReactNode } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../../../components/indice-modal';
import { FailureToast } from '../../../../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../../../../components/LoadingBarOverlay';
import type { ControlTranslations } from '../../../translations';
import type { OperationalScheduleSummary } from '../../../types/scheduleTypes';
import { SaveTemplateModal } from './SaveTemplateModal';
import { ScheduleImpactSummary } from './ScheduleImpactSummary';

interface ScheduleModalFrameProps {
  assignmentDateError: string;
  children: ReactNode;
  copy: ControlTranslations;
  effectiveStartDate: string;
  errorMessage: string;
  failureToastMessage: string;
  isSaveTemplateModalOpen: boolean;
  isSavingTemplate: boolean;
  isSubmitting: boolean;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeCount: number;
  templateNameDraft: string;
  templateNameError: string;
  onApply: () => void;
  onClose: () => void;
  onFailureToastClose: () => void;
  onSaveTemplate: () => void;
  onSaveTemplateClose: () => void;
  onTemplateNameChange: (value: string) => void;
}

export function ScheduleModalFrame({
  assignmentDateError,
  children,
  copy,
  effectiveStartDate,
  errorMessage,
  failureToastMessage,
  isSaveTemplateModalOpen,
  isSavingTemplate,
  isSubmitting,
  operationalSummary,
  selectedEmployeeCount,
  templateNameDraft,
  templateNameError,
  onApply,
  onClose,
  onFailureToastClose,
  onSaveTemplate,
  onSaveTemplateClose,
  onTemplateNameChange,
}: ScheduleModalFrameProps) {
  const isApplyDisabled = selectedEmployeeCount === 0 || isSubmitting || Boolean(assignmentDateError);
  const applyTitle = selectedEmployeeCount === 0
    ? copy.schedule.errors.selectedHrUserTitle
    : assignmentDateError || undefined;

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={copy.schedule.savingSchedule}
        description={copy.schedule.savingScheduleDescription}
        className="z-[95]"
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={onFailureToastClose}
        className="z-[100]"
      />
      <SaveTemplateModal
        copy={copy}
        errorMessage={templateNameError}
        isOpen={isSaveTemplateModalOpen}
        isSaving={isSavingTemplate}
        templateName={templateNameDraft}
        onClose={onSaveTemplateClose}
        onSave={onSaveTemplate}
        onTemplateNameChange={onTemplateNameChange}
      />

      {!isSaveTemplateModalOpen ? (
      <IndiceModalFrame
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-0 py-0"
        busy={isSubmitting}
        closeLabel={copy.schedule.closeModal}
        contentClassName="h-[92dvh]"
        description={copy.schedule.modalDescription}
        footer={(
          <Button
            type="button"
            onClick={onApply}
            disabled={isApplyDisabled}
            title={applyTitle}
          >
            <CheckCircle2 className="h-4 w-4" />
            {copy.schedule.saveSchedule}
          </Button>
        )}
        footerLeading={(
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
          >
            {copy.schedule.cancel}
          </Button>
        )}
        footerSummary={(
          <ScheduleImpactSummary
            assignmentDateError={assignmentDateError}
            copy={copy}
            effectiveStartDate={effectiveStartDate}
            operationalSummary={operationalSummary}
            selectedEmployeeCount={selectedEmployeeCount}
            compact
          />
        )}
        icon={<Clock className="h-5 w-5" />}
        modalType="operational-workspace"
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        open
        title={copy.schedule.modalTitle}
        tone="aqua"
      >
            {errorMessage ? (
              <div className="shrink-0 px-5 pt-5">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                  {errorMessage}
                </div>
              </div>
            ) : null}

            {children}
      </IndiceModalFrame>
      ) : null}
    </>
  );
}
