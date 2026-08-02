import { IndiceModalWizardStepper } from '../../../../../../components/indice-modal';
import type {
  ContractSiteCopy,
  ContractSiteWizardStep,
} from '../../../types/contractSiteTypes';

interface ContractSiteWizardStepperProps {
  copy: ContractSiteCopy;
  currentWizardStepIndex: number;
  steps: Array<{ id: ContractSiteWizardStep; title: string; description: string }>;
  title: string;
  wizardStep: ContractSiteWizardStep;
  onStepChange: (step: ContractSiteWizardStep) => void;
}

export function ContractSiteWizardStepper({
  copy,
  currentWizardStepIndex,
  steps,
  title,
  wizardStep,
  onStepChange,
}: ContractSiteWizardStepperProps) {
  return (
    <>
      <div>
        <div>
          <p className="text-base font-medium text-slate-950 dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.form.description}
          </p>
        </div>
      </div>

      <IndiceModalWizardStepper
        accent="aqua"
        activeStepId={wizardStep}
        className="mt-4"
        onStepSelect={onStepChange}
        progressLabel={copy.wizard.stepCounter(currentWizardStepIndex + 1, steps.length)}
        steps={steps.map((step) => ({ id: step.id, label: step.title }))}
      />
    </>
  );
}
