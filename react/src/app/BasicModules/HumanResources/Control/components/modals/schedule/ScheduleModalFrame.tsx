import type { ReactNode } from 'react';
import { CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
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

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="my-8 flex max-h-[92vh] w-full max-w-[96rem] flex-col overflow-hidden rounded-[28px] border border-[#59C3A5]/30 bg-white text-gray-900 shadow-2xl dark:border-[#59C3A5]/25 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex shrink-0 items-start justify-between gap-4 bg-[#59C3A5] px-6 py-4 text-white">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-white">{copy.schedule.modalTitle}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                  {copy.schedule.modalDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={copy.schedule.closeModal}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-950/40">
            {errorMessage ? (
              <div className="shrink-0 px-5 pt-5">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                  {errorMessage}
                </div>
              </div>
            ) : null}

            {children}
          </div>

          <div className="flex shrink-0 flex-col gap-3 bg-[#59C3A5] px-6 py-3 text-white md:flex-row md:items-center md:justify-between">
            <ScheduleImpactSummary
              assignmentDateError={assignmentDateError}
              copy={copy}
              effectiveStartDate={effectiveStartDate}
              operationalSummary={operationalSummary}
              selectedEmployeeCount={selectedEmployeeCount}
              compact
            />
            <div className="flex shrink-0 items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {copy.schedule.cancel}
              </Button>
              <Button
                type="button"
                onClick={onApply}
                className="gap-2 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
                disabled={isApplyDisabled}
                title={applyTitle}
              >
                <CheckCircle2 className="h-4 w-4" />
                {copy.schedule.saveSchedule}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
