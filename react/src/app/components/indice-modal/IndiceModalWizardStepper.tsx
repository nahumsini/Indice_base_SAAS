import { Check } from 'lucide-react';
import { cn } from '../ui/utils';

export type IndiceModalAccent = 'aqua' | 'blue' | 'coral' | 'green' | 'yellow';

export type IndiceModalWizardStep<StepId extends string> = {
  id: StepId;
  label: string;
};

export type IndiceModalWizardStepperProps<StepId extends string> = {
  accent?: IndiceModalAccent;
  activeStepId: StepId;
  className?: string;
  onStepSelect?: (stepId: StepId) => void;
  progressLabel: string;
  steps: readonly IndiceModalWizardStep<StepId>[];
};

const accentStyles: Record<IndiceModalAccent, { active: string; progress: string }> = {
  aqua: {
    active: 'border-[#59C3A5] bg-[#59C3A5] text-white',
    progress: 'bg-[#59C3A5]',
  },
  blue: {
    active: 'border-[#2563EB] bg-[#2563EB] text-white',
    progress: 'bg-[#2563EB]',
  },
  coral: {
    active: 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831]',
    progress: 'bg-[#FF6B5E]',
  },
  green: {
    active: 'border-[#107C10] bg-[#107C10] text-white',
    progress: 'bg-[#107C10]',
  },
  yellow: {
    active: 'border-[#F8C842] bg-[#F8C842] text-[#222831]',
    progress: 'bg-[#F8C842]',
  },
};

export function IndiceModalWizardStepper<StepId extends string>({
  accent = 'aqua',
  activeStepId,
  className,
  onStepSelect,
  progressLabel,
  steps,
}: IndiceModalWizardStepperProps<StepId>) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeStepId));
  const accentStyle = accentStyles[accent];

  return (
    <nav
      aria-label={progressLabel}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const isComplete = index < activeIndex;
          const isActive = index === activeIndex;
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                    isComplete && 'border-emerald-500 bg-emerald-500 text-white',
                    isActive && accentStyle.active,
                    !isComplete && !isActive && 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn('truncate text-sm font-medium', isActive ? 'text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                  {step.label}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-2 block h-1 rounded-full',
                  index <= activeIndex ? accentStyle.progress : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            </>
          );

          return (
            <li key={step.id} aria-current={isActive ? 'step' : undefined} className="relative min-w-0">
              {onStepSelect ? (
                <button type="button" className="w-full text-left" onClick={() => onStepSelect(step.id)}>
                  {content}
                </button>
              ) : content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
