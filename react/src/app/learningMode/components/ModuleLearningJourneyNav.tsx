import { Fragment, useEffect, useRef } from 'react';
import { IndiceHorizontalScrollControls } from '../../components/ui/horizontal-scroll-controls';
import { cn } from '../../components/ui/utils';
import type { LearningModeGuideTheme, LearningModeJourneyStep } from '../types';

interface ModuleLearningJourneyNavProps {
  activeJourneyId: string;
  appliedJourneyIds: Set<string>;
  compact?: boolean;
  journey: readonly LearningModeJourneyStep[];
  onJourneyChange?: (journeyId: string) => void;
  theme: LearningModeGuideTheme;
  understoodJourneyIds: Set<string>;
}

export function ModuleLearningJourneyNav({
  activeJourneyId,
  appliedJourneyIds,
  compact = false,
  journey,
  onJourneyChange,
  theme,
  understoodJourneyIds,
}: ModuleLearningJourneyNavProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    activeStepRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeJourneyId]);

  return (
    <div className="relative min-w-0">
      <div
        className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        <nav
          aria-label={compact ? 'Flujo del módulo' : 'Recorrido lógico del módulo'}
          className={cn('flex min-w-max items-center p-0.5', compact ? 'gap-1' : 'gap-1.5')}
        >
          {journey.map((step, index) => {
            const isApplied = appliedJourneyIds.has(step.id);
            const isUnderstood = understoodJourneyIds.has(step.id);
            const isActive = step.id === activeJourneyId;
            const stateLabel = isApplied ? 'Aplicado' : isUnderstood ? 'Entendido' : 'Por revisar';

            return (
              <Fragment key={step.id}>
                <button
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Paso ${index + 1}, ${step.label}: ${stateLabel}`}
                  className={cn(
                    'flex shrink-0 items-center border text-left transition-colors motion-reduce:transition-none disabled:cursor-default',
                    compact
                      ? 'h-8 max-w-[154px] gap-1.5 rounded-full px-2'
                      : 'h-11 w-[138px] gap-2 rounded-lg px-2 sm:w-[148px]',
                    isActive
                      ? cn('bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white', theme.outerClass)
                      : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900/70',
                  )}
                  disabled={!onJourneyChange}
                  onClick={() => onJourneyChange?.(step.id)}
                  ref={isActive ? activeStepRef : undefined}
                  type="button"
                >
                  <span aria-hidden="true" className={cn('shrink-0 leading-none', compact ? 'text-sm' : 'text-lg')}>
                    {step.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-medium', compact ? 'text-[11px]' : 'text-xs')}>
                      {step.label}
                    </span>
                    {!compact ? (
                      <span className={cn(
                        'block truncate text-[10px]',
                        isApplied
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : isUnderstood
                            ? theme.eyebrowClass
                            : 'text-slate-400',
                      )}>
                        Paso {index + 1} · {stateLabel}
                      </span>
                    ) : null}
                  </span>
                  {compact && (isApplied || isUnderstood) ? (
                    <span aria-hidden="true" className="text-[11px]">✅</span>
                  ) : null}
                </button>
                {compact && index < journey.length - 1 ? (
                  <span aria-hidden="true" className="shrink-0 text-xs text-slate-300 dark:text-slate-700">→</span>
                ) : null}
              </Fragment>
            );
          })}
        </nav>
      </div>
      <IndiceHorizontalScrollControls
        buttonClassName="h-8 w-8"
        scrollAmount={420}
        scrollRef={scrollRef}
      />
    </div>
  );
}
