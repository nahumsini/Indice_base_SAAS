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
  density?: 'default' | 'compact';
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
    active: 'border-[var(--indice-brand-action)] bg-[var(--indice-brand-action)] text-[var(--indice-brand-shell-foreground)]',
    progress: 'bg-[var(--indice-brand-action)]',
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
  density = 'default',
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
        'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        density === 'compact' ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-4 py-3 shadow-sm',
        className,
      )}
    >
      <ol className={cn('grid', density === 'compact' ? 'gap-1.5' : 'gap-2')} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const isComplete = index < activeIndex;
          const isActive = index === activeIndex;
          const content = (
            <>
              <span className="flex min-w-0 items-center justify-center gap-2 sm:justify-start">
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full border font-medium transition-colors',
                    density === 'compact' ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-xs',
                    isComplete && 'border-emerald-500 bg-emerald-500 text-white',
                    isActive && accentStyle.active,
                    !isComplete && !isActive && 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn('hidden truncate font-medium sm:block', density === 'compact' ? 'text-xs' : 'text-sm', isActive ? 'text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                  {step.label}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'block rounded-full',
                  density === 'compact' ? 'mt-1.5 h-0.5' : 'mt-2 h-1',
                  index <= activeIndex ? accentStyle.progress : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            </>
          );

          return (
            <li key={step.id} aria-current={isActive ? 'step' : undefined} className="relative min-w-0">
              {onStepSelect ? (
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                  onClick={() => onStepSelect(step.id)}
                >
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
