import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../../../components/ui/utils';

export interface WizardStep {
  id: number;
  label: string;
  icon: LucideIcon;
}

interface StepProgressProps {
  steps: readonly WizardStep[];
  currentStep: number;
  progressLabel: string;
  onStepSelect: (stepId: number) => void;
  progressPercentage: string;
}

export function StepProgress({
  steps,
  currentStep,
  progressLabel,
  onStepSelect,
  progressPercentage,
}: StepProgressProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {progressLabel}
        </p>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-[#59C3A5] transition-all duration-300 ease-out dark:bg-blue-500"
          style={{ width: progressPercentage }}
        />
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[720px] grid-cols-4 gap-3">
          {steps.map((step) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepSelect(step.id)}
                className={cn(
                  'flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                  isActive
                    ? 'border-[#59C3A5]/40 bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#59C3A5]/25 hover:bg-white hover:text-[#59C3A5] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:text-blue-300',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isActive
                      ? 'bg-[#59C3A5] text-white dark:bg-blue-500'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : isActive ? '●' : '○'}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <StepIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{step.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
