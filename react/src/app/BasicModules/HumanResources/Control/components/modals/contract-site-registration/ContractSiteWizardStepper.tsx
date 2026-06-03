import { Check } from 'lucide-react';
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-950 dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.form.description}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
          {copy.wizard.stepCounter(currentWizardStepIndex + 1, steps.length)}
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = step.id === wizardStep;
          const isCompleted = index < currentWizardStepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(step.id)}
              className={`flex min-h-[76px] items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                isCurrent
                  ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-blue-400/50 dark:bg-blue-400/10 dark:text-blue-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5]/30 hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isCurrent
                    ? 'bg-[#59C3A5] text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{step.title}</span>
                <span className="mt-0.5 block text-xs opacity-75">{step.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
