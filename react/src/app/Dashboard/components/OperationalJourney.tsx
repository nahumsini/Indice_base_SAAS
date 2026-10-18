import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { IndiceHorizontalScrollControls } from '../../components/ui/horizontal-scroll-controls';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
import type { OperationalJourneyStageId, OperationalJourneyStageView } from '../operationalJourney';
import type { MainDashboardTranslations } from '../translations';
import { learningStageArtwork } from '../learningStageArtwork';
import { DashboardSectionHeading } from './DashboardSectionHeading';

interface OperationalJourneyProps {
  copy: MainDashboardTranslations['operationalJourney'];
  presentation: MainDashboardTranslations['learningPresentation'];
  stages: OperationalJourneyStageView[];
  activeStageId?: OperationalJourneyStageId;
  onStageSelect: (stageId: OperationalJourneyStageId) => void;
  onDismiss?: () => void;
}

export function OperationalJourney({ copy, presentation, stages, activeStageId, onStageSelect, onDismiss }: OperationalJourneyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const revealSelected = () => {
      const selected = viewport.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (!selected) return;
      const item = selected.getBoundingClientRect();
      const frame = viewport.getBoundingClientRect();
      const delta = item.left < frame.left ? item.left - frame.left - 4
        : item.right > frame.right ? item.right - frame.right + 4 : 0;
      if (delta) viewport.scrollBy({ left: delta, behavior: 'auto' });
    };
    revealSelected();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(revealSelected);
    observer?.observe(viewport);
    return () => observer?.disconnect();
  }, [activeStageId]);
  return (
    <section>
      <div className="relative pr-10">
      <DashboardSectionHeading
        icon={<IndiceEmoji name="learning" className="size-8" />}
        title={presentation.journeyTitle}
        description={presentation.journeyDescription}
        count={stages.length}
      />
      {onDismiss && <Button type="button" variant="ghost" size="icon" onClick={onDismiss} aria-label={copy.dismissLabel} className="absolute right-0 top-0 size-11 rounded-full text-slate-500 sm:size-9 dark:text-slate-300"><X className="size-4" /></Button>}
      </div>
      <div className="relative -mx-1 -mb-4">
        <div ref={scrollRef} className="snap-x snap-proximity overflow-x-auto overscroll-x-contain px-1 pb-4 scrollbar-hide">
          <div className="flex w-max gap-3">
            {stages.map((stage, index) => {
              const labels = copy.stages[stage.id];
              const artwork = learningStageArtwork[stage.id];
              const selected = activeStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={(event) => {
                    onStageSelect(stage.id);
                    event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
                  }}
                  className={`flex min-h-[140px] w-[min(76vw,240px)] shrink-0 snap-start flex-col rounded-xl border border-t-[3px] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${artwork.accent} ${selected ? artwork.active : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <IndiceEmoji name={artwork.name} className="size-10" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{copy.sessionLabel} {index + 1}/{stages.length}</span>
                  </span>
                  <span className="mt-3 text-sm font-medium leading-5 text-slate-900 dark:text-white">{labels.shortTitle}</span>
                  <span className={`mt-1 text-xs leading-4 ${selected ? 'text-blue-700 dark:text-blue-300' : 'invisible'}`}>{presentation.exploring}</span>
                </button>
              );
            })}
          </div>
        </div>
        <IndiceHorizontalScrollControls scrollRef={scrollRef} className="bottom-4" buttonClassName="shadow-md" />
      </div>
    </section>
  );
}
