import type {
  FormEventHandler,
  ReactNode,
  RefObject,
} from 'react';
import { User } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import {
  IndiceModalFrame,
  IndiceModalWizardStepper,
} from '../../../../../../components/indice-modal';
import type { EmployeeModalTranslations } from '../../../translations/types';
import type { EmployeeModalProps } from '../types';
import type { WizardStep } from './StepProgress';

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
  statusFeedback,
  steps,
}: EmployeeModalFrameProps) {
  return (
    <IndiceModalFrame
      bodyClassName="space-y-5"
      closeLabel={copy.buttons.closeModal}
      description={copy.subtitle}
      eyebrow={copy.stepOf(currentStep, steps.length)}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onBack} disabled={currentStep === 1}>
            {copy.buttons.back}
          </Button>
          <Button type="submit" form="hr-employee-wizard-form">
            {primaryButtonLabel}
          </Button>
        </>
      )}
      footerLeading={(
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
        >
          {copy.buttons.cancel}
        </Button>
      )}
      footerSummary={steps.find((step) => step.id === currentStep)?.label}
      icon={<User className="h-5 w-5" />}
      modalType="wizard"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
      title={mode === 'edit' ? copy.titleEdit : copy.titleCreate}
      tone="aqua"
    >
      <IndiceModalWizardStepper
        accent="aqua"
        activeStepId={String(currentStep)}
        progressLabel={copy.stepOf(currentStep, steps.length)}
        steps={steps.map((step) => ({ id: String(step.id), label: step.label }))}
        onStepSelect={(stepId) => {
          const numericStepId = Number(stepId);
          if (numericStepId > currentStep && !currentStepValid) {
            onStepInvalid();
            return;
          }
          onStepSelect(numericStepId);
        }}
      />
      <form ref={formRef} id="hr-employee-wizard-form" onSubmit={onSubmit}>
          {statusFeedback ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {statusFeedback}
            </div>
          ) : null}
          {children}
      </form>
    </IndiceModalFrame>
  );
}
