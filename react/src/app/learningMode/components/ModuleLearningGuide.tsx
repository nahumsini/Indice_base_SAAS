import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { cn } from '../../components/ui/utils';
import { useMainDashboardTranslations } from '../../Dashboard/hooks/useMainDashboardTranslations';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { useLanguage } from '../../shared/context';
import {
  isLearningCharacterId,
  learningCharacterStorageKey,
  type LearningCharacterId,
} from '../characters';
import type {
  LearningModeControl,
  LearningModeGuideTheme,
  LearningModeJourneyStep,
} from '../types';
import { useModuleLearningProgress } from '../useModuleLearningProgress';
import { ModuleLearningJourneyNav } from './ModuleLearningJourneyNav';

interface ModuleLearningGuideProps {
  activeContextLabel: string;
  activeJourneyId?: string;
  appliedJourneyIds?: readonly string[];
  contextSignal?: string;
  controls: readonly LearningModeControl[];
  ctaLabel?: string;
  eyebrow: string;
  guideId: string;
  journey?: readonly LearningModeJourneyStep[];
  onJourneyChange?: (journeyId: string) => void;
  onPrimaryAction?: () => void;
  scopeId: string;
  stepIndicatorLabel: string;
  theme: LearningModeGuideTheme;
  title: string;
}

const characterEmojiMap: Record<LearningCharacterId, string> = {
  emily: '☕',
  juanito: '🛒',
  camila: '🔧',
};

export function ModuleLearningGuide({
  activeContextLabel,
  activeJourneyId: requestedJourneyId,
  appliedJourneyIds = [],
  contextSignal,
  controls,
  ctaLabel,
  eyebrow,
  guideId,
  journey,
  onJourneyChange,
  onPrimaryAction,
  scopeId,
  stepIndicatorLabel,
  theme,
  title,
}: ModuleLearningGuideProps) {
  const { currentLanguage } = useLanguage();
  const dashboardCopy = useMainDashboardTranslations();
  const [selectedCharacterId] = useLocalStorageState<LearningCharacterId | null>(
    learningCharacterStorageKey,
    null,
  );
  const {
    markUnderstood,
    progress,
    setExpanded,
  } = useModuleLearningProgress(guideId);
  const [slideState, setSlideState] = useState({ scopeId, index: 0 });
  const slideCount = controls.length;
  const requestedSlideIndex = slideState.scopeId === scopeId ? slideState.index : 0;
  const activeSlideIndex = Math.min(requestedSlideIndex, Math.max(slideCount - 1, 0));
  const activeControl = controls[activeSlideIndex] ?? controls[0];
  const safeCharacterId = isLearningCharacterId(selectedCharacterId) ? selectedCharacterId : null;
  const selectedCharacterCopy = safeCharacterId
    ? dashboardCopy.operationalJourney.characters.items[safeCharacterId]
    : null;
  const isSpanish = currentLanguage.code.toLowerCase().startsWith('es');
  const journeySteps = useMemo<readonly LearningModeJourneyStep[]>(() => {
    if (journey?.length) {
      return journey;
    }

    return [{
      emoji: activeControl?.emoji ?? '🧭',
      id: requestedJourneyId ?? scopeId,
      label: activeContextLabel,
    }];
  }, [activeContextLabel, activeControl?.emoji, journey, requestedJourneyId, scopeId]);
  const activeJourneyId = requestedJourneyId
    && journeySteps.some((step) => step.id === requestedJourneyId)
    ? requestedJourneyId
    : (journeySteps[0]?.id ?? scopeId);
  const understoodJourneyIds = new Set(
    progress.understoodJourneyIds.filter((id) => journeySteps.some((step) => step.id === id)),
  );
  const appliedJourneyIdSet = new Set(appliedJourneyIds);
  const reviewedJourneyCount = journeySteps.filter(
    (step) => understoodJourneyIds.has(step.id) || appliedJourneyIdSet.has(step.id),
  ).length;
  const activeJourneyIndex = Math.max(0, journeySteps.findIndex((step) => step.id === activeJourneyId));
  const isApplied = appliedJourneyIdSet.has(activeJourneyId);
  const isUnderstood = understoodJourneyIds.has(activeJourneyId);
  const firstJourneyId = journeySteps[0]?.id;
  const labels = isSpanish
    ? {
        businessExample: 'Ver caso real',
        chooseCase: 'Elige un caso empresarial en el Panel Inicial para relacionar este paso con una operación real.',
        contextualSignal: contextSignal ?? `Descubre para qué sirve ${activeContextLabel} y úsalo con confianza en tu operación.`,
        currentTool: 'Herramienta actual',
        explored: 'exploradas',
        flow: `Tu flujo de ${title}`,
        hideGuide: 'Ocultar guía',
        howTo: 'Cómo usar esta parte',
        learnMore: 'Aprender más',
        next: 'Siguiente herramienta',
        objective: 'Objetivo de este paso',
        previous: 'Herramienta anterior',
        reset: 'Reiniciar vista del recorrido',
        resetTitle: 'Reiniciar vista',
        route: `Ruta de ${title}`,
        statusApplied: 'Aplicado',
        statusPending: 'Por revisar',
        statusUnderstood: 'Entendido',
        understood: 'Ya entendí',
        understoodDone: 'Ya está entendido',
        useNow: 'Aquí vas a usar',
        whatHappens: 'Qué sucede al usarla',
        whenToUse: 'Cuándo conviene usarla',
      }
    : {
        businessExample: 'See a real example',
        chooseCase: 'Choose a business case on the Dashboard to connect this step to a real operation.',
        contextualSignal: contextSignal ?? `Learn what ${activeContextLabel} is for and use it confidently in your operation.`,
        currentTool: 'Current tool',
        explored: 'explored',
        flow: `Your ${title} flow`,
        hideGuide: 'Hide guide',
        howTo: 'How to use this section',
        learnMore: 'Learn more',
        next: 'Next tool',
        objective: 'Goal for this step',
        previous: 'Previous tool',
        reset: 'Restart journey view',
        resetTitle: 'Restart view',
        route: `${title} journey`,
        statusApplied: 'Applied',
        statusPending: 'To review',
        statusUnderstood: 'Understood',
        understood: 'I understand',
        understoodDone: 'Already understood',
        useNow: 'Here you will use',
        whatHappens: 'What happens when you use it',
        whenToUse: 'When to use it',
      };

  if (!activeControl) {
    return null;
  }

  const personalizedTip = safeCharacterId
    ? activeControl.tipByCharacter[safeCharacterId]
    : labels.chooseCase;
  const appliedExample = safeCharacterId
    ? activeControl.storyByCharacter[safeCharacterId]
    : null;
  const statusLabel = isApplied
    ? labels.statusApplied
    : isUnderstood
      ? labels.statusUnderstood
      : labels.statusPending;

  const showPreviousSlide = () => {
    setSlideState({
      scopeId,
      index: activeSlideIndex === 0 ? slideCount - 1 : activeSlideIndex - 1,
    });
  };

  const showNextSlide = () => {
    setSlideState({
      scopeId,
      index: activeSlideIndex === slideCount - 1 ? 0 : activeSlideIndex + 1,
    });
  };

  const handleExpandedChange = (expanded: boolean) => {
    setExpanded(expanded);
  };

  const restartJourneyView = () => {
    setExpanded(true);
    if (firstJourneyId) {
      onJourneyChange?.(firstJourneyId);
    }
  };

  return (
    <Collapsible onOpenChange={handleExpandedChange} open={progress.expanded}>
      <section
        aria-labelledby={`${guideId}-title`}
        className={cn('rounded-xl border bg-white shadow-sm dark:bg-slate-950', theme.outerClass)}
      >
        <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', theme.tipClass)}>
              <span aria-hidden="true" className="text-lg leading-none">💡</span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id={`${guideId}-title`} className="text-sm font-medium text-slate-950 dark:text-white">
                  {eyebrow}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <span aria-hidden="true">{journeySteps[activeJourneyIndex]?.emoji ?? activeControl.emoji} </span>
                  {activeContextLabel}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-600 sm:truncate dark:text-slate-300">
                {labels.contextualSignal}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
              {reviewedJourneyCount}/{journeySteps.length} {labels.explored}
            </span>
            <CollapsibleTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                {progress.expanded ? labels.hideGuide : labels.learnMore}
                <ChevronDown className={cn(
                  'h-4 w-4 transition-transform motion-reduce:transition-none',
                  progress.expanded && 'rotate-180',
                )} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {!progress.expanded ? (
          <div className="flex min-w-0 items-center gap-2 border-t border-slate-200 px-2.5 py-1.5 dark:border-slate-800">
            <span className={cn('shrink-0 text-[11px] font-medium', theme.eyebrowClass)}>{labels.flow}</span>
            <div className="min-w-0 flex-1">
              <ModuleLearningJourneyNav
                activeJourneyId={activeJourneyId}
                appliedJourneyIds={appliedJourneyIdSet}
                compact
                journey={journeySteps}
                onJourneyChange={onJourneyChange}
                theme={theme}
                understoodJourneyIds={understoodJourneyIds}
              />
            </div>
          </div>
        ) : null}

        <CollapsibleContent>
          <div className="border-t border-slate-200 dark:border-slate-800">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-2.5 py-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
              <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                <p className="min-w-0 truncate text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-slate-100"><span aria-hidden="true">🗺️ </span>{labels.route}</span>
                  <span aria-hidden="true"> · </span>
                  {isSpanish ? 'Paso' : 'Step'} {activeJourneyIndex + 1} {isSpanish ? 'de' : 'of'} {journeySteps.length}
                </p>
                <Button
                  aria-label={labels.reset}
                  className="h-7 w-7"
                  onClick={restartJourneyView}
                  size="icon"
                  title={labels.resetTitle}
                  type="button"
                  variant="ghost"
                >
                  <span aria-hidden="true" className="text-sm leading-none">🔄</span>
                </Button>
              </div>

              <ModuleLearningJourneyNav
                activeJourneyId={activeJourneyId}
                appliedJourneyIds={appliedJourneyIdSet}
                journey={journeySteps}
                onJourneyChange={onJourneyChange}
                theme={theme}
                understoodJourneyIds={understoodJourneyIds}
              />
            </div>

            <div className="p-3">
              {controls.length > 1 ? (
                <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span aria-hidden="true">🧰 </span>{isSpanish ? 'Herramientas' : 'Tools'}
                  </span>
                  {controls.map((control, index) => (
                    <button
                      aria-current={index === activeSlideIndex ? 'true' : undefined}
                      className={cn(
                        'flex h-8 max-w-[190px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors motion-reduce:transition-none',
                        index === activeSlideIndex
                          ? cn('font-medium', theme.leftCardClass, theme.eyebrowClass)
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900',
                      )}
                      key={`${scopeId}-${control.id}`}
                      onClick={() => setSlideState({ scopeId, index })}
                      type="button"
                    >
                      <span aria-hidden="true">{control.emoji}</span>
                      <span className="truncate">{control.title}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <article className={cn('rounded-xl border p-3', theme.leftCardClass)}>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px] sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('text-xs font-medium', theme.eyebrowClass)}><span aria-hidden="true">🎯 </span>{labels.objective}</p>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px]',
                        isApplied
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                          : isUnderstood
                            ? theme.tipClass
                            : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300',
                      )}>
                        {statusLabel}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-medium text-slate-950 dark:text-white">{activeControl.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">{activeControl.purpose}</p>
                    <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      <span aria-hidden="true" className="shrink-0">🧰</span>
                      <p><span className="font-medium text-slate-800 dark:text-slate-100">{labels.useNow}:</span> {activeControl.kind} · {activeControl.title}</p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      {onPrimaryAction && ctaLabel ? (
                        <Button className={theme.ctaClass} onClick={onPrimaryAction} size="sm" type="button" variant="outline">
                          {ctaLabel}<span aria-hidden="true">👇</span>
                        </Button>
                      ) : null}
                      <Button disabled={isUnderstood} onClick={() => markUnderstood(activeJourneyId)} size="sm" type="button" variant="outline">
                        <span aria-hidden="true">✅</span>
                        {isUnderstood ? labels.understoodDone : labels.understood}
                      </Button>
                    </div>
                  </div>

                  <div aria-label={`${labels.currentTool}: ${activeControl.title}`} className="justify-self-center sm:justify-self-end">
                    <div className="w-[148px] rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 dark:border-slate-900">
                        <span className="text-[9px] font-medium text-slate-500">Índice</span>
                        <span aria-hidden="true" className="text-base leading-none">{activeControl.emoji}</span>
                      </div>
                      <div className="mt-2 h-3 rounded bg-slate-100 dark:bg-slate-900" />
                      <div className="mt-1.5 grid grid-cols-[34px_1fr] gap-1.5">
                        <div className={cn('h-14 rounded', theme.tipClass)} />
                        <div className="space-y-1.5">
                          <div className="h-2 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="h-2 rounded bg-slate-100 dark:bg-slate-900" />
                          <div className="h-2 w-3/4 rounded bg-slate-100 dark:bg-slate-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <summary className={cn('cursor-pointer rounded-sm text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:ring-offset-slate-950', theme.eyebrowClass)}>
                      <span aria-hidden="true">🧭 </span>{labels.howTo}
                    </summary>
                    <div className="mt-2 grid gap-2">
                      <div className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]', theme.tipClass, theme.tipLabelClass)}>1</span>
                        <p><span className="font-medium text-slate-800 dark:text-slate-100">{labels.whatHappens}.</span> {activeControl.behavior}</p>
                      </div>
                      <div className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]', theme.tipClass, theme.tipLabelClass)}>2</span>
                        <p><span className="font-medium text-slate-800 dark:text-slate-100">{labels.whenToUse}.</span> {activeControl.whenToUse}</p>
                      </div>
                      <div className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        <span aria-hidden="true" className="shrink-0">💡</span>
                        <p>{personalizedTip}</p>
                      </div>
                    </div>
                  </details>

                  <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <summary className={cn('cursor-pointer rounded-sm text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:ring-offset-slate-950', theme.eyebrowClass)}>
                      <span aria-hidden="true">💬 </span>{labels.businessExample}{selectedCharacterCopy ? ` · ${selectedCharacterCopy.name}` : ''}
                    </summary>
                    <div className="mt-2 flex gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
                        <span aria-hidden="true" className="text-base leading-none">{safeCharacterId ? characterEmojiMap[safeCharacterId] : '🧑‍💼'}</span>
                      </span>
                      <div className="min-w-0 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        <p>{appliedExample ?? labels.chooseCase}</p>
                        {appliedExample ? (
                          <p className="mt-1.5"><span className="font-medium text-slate-800 dark:text-slate-100">{isSpanish ? 'Resultado' : 'Result'}:</span> {activeControl.result ?? activeControl.purpose}</p>
                        ) : null}
                      </div>
                    </div>
                  </details>
                </div>

                {controls.length > 1 ? (
                  <div className="mt-2.5 flex items-center justify-center gap-2 border-t border-slate-200/70 pt-2.5 dark:border-slate-800">
                    <button
                      aria-label={labels.previous}
                      className={cn('flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300', theme.navigationButtonClass)}
                      onClick={showPreviousSlide}
                      type="button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[72px] text-center text-[10px] text-slate-500 dark:text-slate-400">
                      {stepIndicatorLabel} {activeSlideIndex + 1}/{slideCount}
                    </span>
                    <button
                      aria-label={labels.next}
                      className={cn('flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300', theme.navigationButtonClass)}
                      onClick={showNextSlide}
                      type="button"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
