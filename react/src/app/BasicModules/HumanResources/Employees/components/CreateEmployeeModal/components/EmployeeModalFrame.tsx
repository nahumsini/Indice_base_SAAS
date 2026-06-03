import type {
  FormEventHandler,
  ReactNode,
  RefObject,
} from 'react';
import { User, X } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import type { EmployeeModalTranslations } from '../../../translations/types';
import type { EmployeeModalProps } from '../types';
import {
  modalOutlineButtonClassName,
  modalPrimaryButtonClassName,
} from '../styles';
import { StepProgress, type WizardStep } from './StepProgress';

interface EmployeeModalFrameProps {
  children: ReactNode;
  copy: EmployeeModalTranslations;
  currentStep: number;
  currentStepValid: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  mode: EmployeeModalProps['mode'];
  onBack: () => void;
  onClose: () => void;
  onStepInvalid: () => void;
  onStepSelect: (stepId: number) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  primaryButtonLabel: string;
  progressPercentage: string;
  statusFeedback: string;
  steps: readonly WizardStep[];
}

export function EmployeeModalFrame({
  children,
  copy,
  currentStep,
  currentStepValid,
  formRef,
  mode,
  onBack,
  onClose,
  onStepInvalid,
  onStepSelect,
  onSubmit,
  primaryButtonLabel,
  progressPercentage,
  statusFeedback,
  steps,
}: EmployeeModalFrameProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4 bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-white/25 bg-white px-3 py-1 text-xs font-semibold text-[#59C3A5] shadow-sm">
                {copy.stepOf(currentStep, steps.length)}
              </div>
              <h2 className="text-xl font-semibold text-white">
                {mode === 'edit' ? copy.titleEdit : copy.titleCreate}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={copy.buttons.closeModal}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <StepProgress
          steps={steps}
          currentStep={currentStep}
          progressLabel={copy.stepOf(currentStep, steps.length)}
          progressPercentage={progressPercentage}
          onStepSelect={(stepId) => {
            if (stepId > currentStep && !currentStepValid) {
              onStepInvalid();
              return;
            }
            onStepSelect(stepId);
          }}
        />

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          {statusFeedback ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {statusFeedback}
            </div>
          ) : null}
          {children}
        </div>

        <div className="flex flex-col gap-3 bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5] sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={modalOutlineButtonClassName}
          >
            {copy.buttons.cancel}
          </Button>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={currentStep === 1}
              className={modalOutlineButtonClassName}
            >
              {copy.buttons.back}
            </Button>
            <Button type="submit" className={modalPrimaryButtonClassName}>
              {primaryButtonLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
