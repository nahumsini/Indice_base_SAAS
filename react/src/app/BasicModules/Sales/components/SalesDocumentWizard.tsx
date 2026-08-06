import type { ReactNode } from 'react';
import { IndiceModalWizardStepper } from '../../../components/indice-modal';

export type SalesDocumentWizardStep<StepId extends string> = {
  id: StepId;
  label: string;
};

export function SalesDocumentWizard<StepId extends string>({
  activeStepId,
  progressLabel,
  steps,
  validation,
  children,
}: {
  activeStepId: StepId;
  progressLabel: string;
  steps: Array<SalesDocumentWizardStep<StepId>>;
  validation?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <IndiceModalWizardStepper
        accent="coral"
        activeStepId={activeStepId}
        progressLabel={progressLabel}
        steps={steps}
      />
      {validation}
      {children}
    </div>
  );
}
