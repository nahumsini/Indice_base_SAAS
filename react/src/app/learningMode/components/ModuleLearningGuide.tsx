import { useState } from 'react';
import { ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { useMainDashboardTranslations } from '../../Dashboard/hooks/useMainDashboardTranslations';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { useLanguage } from '../../shared/context';
import {
  isLearningCharacterId,
  learningCharacterStorageKey,
  type LearningCharacterId,
} from '../characters';
import type { LearningModeControl, LearningModeGuideTheme } from '../types';
import { LearningModeHeaderActionHost } from './LearningModeHeaderActions';

interface ModuleLearningGuideProps {
  activeContextLabel: string;
  controls: readonly LearningModeControl[];
  ctaLabel?: string;
  eyebrow: string;
  guideId: string;
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
  controls,
  ctaLabel,
  eyebrow,
  guideId,
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
  const labels = isSpanish
    ? {
        learningFunction: 'Aprende esta función',
        businessExample: 'Así lo usa en su empresa',
        whatItDoes: 'Qué sucede al usarla',
        whenToUse: 'Cuándo usarla',
        personalizedTip: selectedCharacterCopy
          ? `Consejo para ${selectedCharacterCopy.name}`
          : 'Consejo práctico',
        chooseCase: 'Elige un caso empresarial en el Panel Inicial para personalizar esta guía.',
        result: 'Problema que ayuda a resolver',
        previous: 'Función anterior',
        next: 'Siguiente función',
      }
    : {
        learningFunction: 'Learn this function',
        businessExample: 'How it is used in the business',
        whatItDoes: 'What happens when you use it',
        whenToUse: 'When to use it',
        personalizedTip: selectedCharacterCopy
          ? `Tip for ${selectedCharacterCopy.name}`
          : 'Practical tip',
        chooseCase: 'Choose a business case on the Dashboard to personalize this guide.',
        result: 'Problem it helps solve',
        previous: 'Previous function',
        next: 'Next function',
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

  const carouselControls = (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={showPreviousSlide}
        aria-label={labels.previous}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
          theme.navigationButtonClass,
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex max-w-[176px] items-center justify-center gap-1 overflow-hidden">
        {controls.map((control, index) => (
          <button
            key={`${scopeId}-${control.id}`}
            type="button"
            onClick={() => setSlideState({ scopeId, index })}
            aria-label={`${stepIndicatorLabel} ${index + 1}`}
            className={cn(
              'h-1.5 shrink-0 rounded-full transition-all',
              index === activeSlideIndex
                ? cn('w-6', theme.activeDotClass)
                : 'w-1.5 bg-slate-300 dark:bg-slate-700',
            )}
          />
        ))}
      </div>
      <span className="min-w-[38px] text-center text-[10px] font-semibold text-slate-400">
        {activeSlideIndex + 1}/{slideCount}
      </span>
      <button
        type="button"
        onClick={showNextSlide}
        aria-label={labels.next}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
          theme.navigationButtonClass,
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <section
      aria-labelledby={`${guideId}-title`}
      className={cn(
        'overflow-hidden rounded-xl border bg-white/95 dark:bg-slate-950/80',
        theme.outerClass,
      )}
    >
      <div className="grid items-center gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="hidden sm:block" aria-hidden="true" />
        <div className="min-w-0 text-center">
          <div className={cn('inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]', theme.eyebrowClass)}>
            <span className="text-base" aria-hidden="true">💡</span>
            {eyebrow}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            <h2 id={`${guideId}-title`} className="text-base font-semibold text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activeContextLabel}</p>
          </div>
        </div>
        <div className="flex justify-center sm:justify-end">
          <LearningModeHeaderActionHost />
        </div>
      </div>

      <div className="grid items-stretch gap-3 p-3 lg:grid-cols-2 lg:p-4">
        <article className={cn('flex h-full min-h-[360px] flex-col rounded-xl border p-4 text-center', theme.leftCardClass)}>
          <div className="flex flex-col items-center">
            <span className="text-3xl leading-none" aria-hidden="true">{activeControl.emoji}</span>
            <p className={cn('mt-2 text-[10px] font-semibold uppercase tracking-[0.14em]', theme.eyebrowClass)}>
              {labels.learningFunction} · {activeControl.kind}
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">{activeControl.title}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700 dark:text-slate-200">
              {activeControl.purpose}
            </p>
          </div>

          <div className="mx-auto mt-3 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
            <div className={cn('rounded-lg border px-3 py-2.5', theme.leftPanelClass)}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{labels.whatItDoes}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{activeControl.behavior}</p>
            </div>
            <div className={cn('rounded-lg border px-3 py-2.5', theme.leftPanelClass)}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{labels.whenToUse}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{activeControl.whenToUse}</p>
            </div>
          </div>

          <div className={cn('mx-auto mt-2 w-full max-w-2xl rounded-lg px-3 py-2.5', theme.tipClass)}>
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.12em]', theme.tipLabelClass)}>
              {labels.personalizedTip}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-200">{personalizedTip}</p>
          </div>

          <div className={cn('mt-auto flex flex-col items-center gap-2 border-t pt-3', theme.leftFooterClass)}>
            {carouselControls}
            {onPrimaryAction && ctaLabel ? (
              <button type="button" onClick={onPrimaryAction} className={cn('inline-flex items-center gap-1.5 text-xs font-semibold transition', theme.ctaClass)}>
                {ctaLabel}
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </article>

        <aside className="flex h-full min-h-[360px] flex-col rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900/45">
          <div className="flex flex-col items-center">
            <span className="text-3xl leading-none" aria-hidden="true">
              {safeCharacterId ? characterEmojiMap[safeCharacterId] : '🧑‍💼'}
            </span>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#123A68] dark:text-[#93C5FD]">
              {labels.businessExample}
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
              {selectedCharacterCopy
                ? `${selectedCharacterCopy.name} · ${selectedCharacterCopy.business}`
                : labels.chooseCase}
            </h3>
          </div>

          {appliedExample ? (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-4">
              <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{appliedExample}</p>
              <div className="mt-4 rounded-lg border border-[#123A68]/10 bg-[#123A68]/5 px-3 py-2.5 dark:border-[#93C5FD]/10 dark:bg-[#93C5FD]/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#123A68]/65 dark:text-[#93C5FD]">
                  {labels.result}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {activeControl.result ?? activeControl.purpose}
                </p>
              </div>
            </div>
          ) : (
            <p className="mx-auto my-auto max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {labels.chooseCase}
            </p>
          )}

          <div className="mt-auto border-t border-slate-200 pt-3 dark:border-slate-800">
            {carouselControls}
          </div>
        </aside>
      </div>
    </section>
  );
}
