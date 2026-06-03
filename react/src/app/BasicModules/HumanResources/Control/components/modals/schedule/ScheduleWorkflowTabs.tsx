import { useMemo } from 'react';
import type { ControlTranslations } from '../../../translations';
import type { ScheduleBuilderStep } from '../../../types/scheduleTypes';
import { getScheduleBuilderSteps } from '../../../utils/scheduleFormatters';

interface ScheduleWorkflowTabsProps {
  activeStep: ScheduleBuilderStep;
  copy: ControlTranslations;
  onStepChange: (step: ScheduleBuilderStep) => void;
}

export function ScheduleWorkflowTabs({
  activeStep,
  copy,
  onStepChange,
}: ScheduleWorkflowTabsProps) {
  const scheduleBuilderSteps = useMemo(() => getScheduleBuilderSteps(copy.schedule), [copy]);

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-4">
      {scheduleBuilderSteps.map((step, index) => {
        const isActive = activeStep === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              isActive
                ? 'border-[#59C3A5] bg-white text-[#59C3A5] shadow-sm dark:border-[#8FE0CA] dark:bg-slate-950 dark:text-[#8FE0CA]'
                : 'border-transparent bg-white/50 text-slate-600 hover:bg-white dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{copy.schedule.builder.stepLabel(index + 1)}</span>
            <span className="mt-1 block text-sm font-semibold">{step.label}</span>
            <span className="mt-0.5 block text-xs opacity-75">{step.description}</span>
          </button>
        );
      })}
    </div>
  );
}
