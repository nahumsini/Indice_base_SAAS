import { Fragment, useEffect, useRef } from 'react';
import { IndiceHorizontalScrollControls } from '../../../../components/ui/horizontal-scroll-controls';
import { cn } from '../../../../components/ui/utils';
import { humanResourcesLearningAreaEmoji } from '../humanResourcesLearningContent';
import type { HumanResourcesGuidanceTranslations } from '../translations';
import type { HumanResourcesGuidanceTabId } from '../types';

interface HumanResourcesJourneyNavProps {
  activeTabId: HumanResourcesGuidanceTabId;
  appliedAreaIds: Set<HumanResourcesGuidanceTabId>;
  copy: HumanResourcesGuidanceTranslations;
  compact?: boolean;
  journey: readonly HumanResourcesGuidanceTabId[];
  onNavigateArea: (areaId: HumanResourcesGuidanceTabId) => void;
  understoodAreaIds: Set<HumanResourcesGuidanceTabId>;
}

export function HumanResourcesJourneyNav({
  activeTabId,
  appliedAreaIds,
  compact = false,
  copy,
  journey,
  onNavigateArea,
  understoodAreaIds,
}: HumanResourcesJourneyNavProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    activeStepRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeTabId]);

  return (
    <div className="relative min-w-0">
      <div
        className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        <nav
          aria-label={compact ? 'Flujo de Recursos Humanos' : 'Recorrido lógico de Recursos Humanos'}
          className={cn('flex min-w-max items-center p-0.5', compact ? 'gap-1' : 'gap-1.5')}
        >
          {journey.map((areaId, index) => {
            const areaCopy = copy.tabs[areaId];
            const isApplied = appliedAreaIds.has(areaId);
            const isUnderstood = understoodAreaIds.has(areaId);
            const isActive = areaId === activeTabId;
            const stateLabel = isApplied ? 'Aplicado' : isUnderstood ? 'Entendido' : 'Por revisar';
            return (
              <Fragment key={areaId}>
                <button
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Paso ${index + 1}, ${areaCopy.label}: ${stateLabel}`}
                  className={cn(
                    'flex shrink-0 items-center border text-left transition-colors motion-reduce:transition-none',
                    compact
                      ? 'h-8 max-w-[154px] gap-1.5 rounded-full px-2'
                      : 'h-11 w-[138px] gap-2 rounded-lg px-2 sm:w-[148px]',
                    isActive
                      ? 'border-sky-400 bg-sky-50 text-sky-950 shadow-sm dark:border-sky-700 dark:bg-sky-950/45 dark:text-sky-100'
                      : 'border-transparent bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/60 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-900 dark:hover:bg-sky-950/25',
                  )}
                  onClick={() => onNavigateArea(areaId)}
                  ref={isActive ? activeStepRef : undefined}
                  type="button"
                >
                  <span aria-hidden="true" className={cn('shrink-0 leading-none', compact ? 'text-sm' : 'text-lg')}>
                    {humanResourcesLearningAreaEmoji[areaId]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-medium', compact ? 'text-[11px]' : 'text-xs')}>
                      {areaCopy.label}
                    </span>
                    {!compact ? (
                      <span className={cn(
                        'block truncate text-[10px]',
                        isApplied
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : isUnderstood
                            ? 'text-sky-600 dark:text-sky-300'
                            : 'text-slate-400',
                      )}>
                        Paso {index + 1} · {stateLabel}
                      </span>
                    ) : null}
                  </span>
                  {compact && isApplied ? <span aria-hidden="true" className="text-[11px]">✅</span> : null}
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
