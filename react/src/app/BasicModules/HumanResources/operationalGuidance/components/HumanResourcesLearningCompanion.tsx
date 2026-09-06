import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../components/ui/collapsible';
import { cn } from '../../../../components/ui/utils';
import { useLocalStorageState } from '../../../../hooks/useLocalStorageState';
import {
  isLearningCharacterId,
  learningCharacterStorageKey,
  type LearningCharacterId,
} from '../../../../learningMode/characters';
import { humanResourcesCharacterExamples } from '../humanResourcesCharacterExamples';
import {
  getHumanResourcesLearningContextSignal,
  humanResourcesLearningAreaEmoji,
  humanResourcesLearningCharacterLabels,
  humanResourcesLearningToolNames,
} from '../humanResourcesLearningContent';
import {
  humanResourcesLearningJourneyOrder,
  type EmployeeLearningExemptibleRequirementId,
  type HumanResourcesLearningSignals,
} from '../humanResourcesLearningModel';
import type { HumanResourcesLearningProgress } from '../humanResourcesLearningProgress';
import type { HumanResourcesGuidanceTranslations } from '../translations';
import type { HumanResourcesGuidanceTabId } from '../types';
import { HumanResourcesCandidateMission } from './HumanResourcesCandidateMission';
import { HumanResourcesJourneyNav } from './HumanResourcesJourneyNav';
import { HumanResourcesLearningToolPreview } from './HumanResourcesLearningToolPreview';

interface HumanResourcesLearningCompanionProps {
  activeTabId: HumanResourcesGuidanceTabId;
  availableTabIds: readonly HumanResourcesGuidanceTabId[];
  copy: HumanResourcesGuidanceTranslations;
  onCreateEmployee?: () => void;
  onEditEmployee?: (employeeId: number) => void;
  onMarkUnderstood: (areaId: HumanResourcesGuidanceTabId) => void;
  onNavigateArea: (areaId: HumanResourcesGuidanceTabId) => void;
  onPrimaryAction?: () => void;
  onRemoveEmployeeException: (
    employeeId: number,
    requirementId: EmployeeLearningExemptibleRequirementId,
  ) => void;
  onRestartJourney: (areaId: HumanResourcesGuidanceTabId) => void;
  onSelectEmployee: (employeeId: number | null) => void;
  onSetEmployeeException: (
    employeeId: number,
    requirementId: EmployeeLearningExemptibleRequirementId,
    reason: string,
  ) => void;
  onSetExpanded: (expanded: boolean) => void;
  progress: HumanResourcesLearningProgress;
  signals: HumanResourcesLearningSignals;
}

export function HumanResourcesLearningCompanion({
  activeTabId,
  availableTabIds,
  copy,
  onCreateEmployee,
  onEditEmployee,
  onMarkUnderstood,
  onNavigateArea,
  onPrimaryAction,
  onRemoveEmployeeException,
  onRestartJourney,
  onSelectEmployee,
  onSetEmployeeException,
  onSetExpanded,
  progress,
  signals,
}: HumanResourcesLearningCompanionProps) {
  const [selectedCharacterId] = useLocalStorageState<LearningCharacterId | null>(
    learningCharacterStorageKey,
    null,
  );
  const journey = useMemo(() => humanResourcesLearningJourneyOrder.filter(
    (areaId) => availableTabIds.includes(areaId),
  ), [availableTabIds]);
  const understoodAreaIds = new Set(progress.understoodAreaIds);
  const appliedAreaIds = new Set(progress.appliedAreaIds);
  const reviewedAreaCount = journey.filter(
    (areaId) => understoodAreaIds.has(areaId) || appliedAreaIds.has(areaId),
  ).length;
  const activeGuide = copy.tabs[activeTabId];
  const safeCharacterId = isLearningCharacterId(selectedCharacterId) ? selectedCharacterId : null;
  const isApplied = appliedAreaIds.has(activeTabId);
  const isUnderstood = understoodAreaIds.has(activeTabId);
  const signal = getHumanResourcesLearningContextSignal(activeTabId, signals);
  const firstJourneyArea = journey[0] ?? activeTabId;
  const activeJourneyIndex = Math.max(0, journey.indexOf(activeTabId));

  return (
    <Collapsible onOpenChange={onSetExpanded} open={progress.expanded}>
      <section
        aria-labelledby="human-resources-learning-companion-title"
        className="rounded-xl border border-sky-200 bg-white shadow-sm dark:border-sky-900 dark:bg-slate-950"
      >
        <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
              <span aria-hidden="true" className="text-lg leading-none">💡</span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id="human-resources-learning-companion-title" className="text-sm font-medium text-slate-950 dark:text-white">
                  Modo Aprendiz
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <span aria-hidden="true">{humanResourcesLearningAreaEmoji[activeTabId]} </span>{activeGuide.label}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-600 sm:truncate dark:text-slate-300">{signal}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
              {reviewedAreaCount}/{journey.length} exploradas
            </span>
            <CollapsibleTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                {progress.expanded ? 'Ocultar guía' : 'Aprender más'}
                <ChevronDown className={cn(
                  'h-4 w-4 transition-transform motion-reduce:transition-none',
                  progress.expanded && 'rotate-180',
                )} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {!progress.expanded ? (
          <div className="flex min-w-0 items-center gap-2 border-t border-sky-100 px-2.5 py-1.5 dark:border-sky-950">
            <span className="shrink-0 text-[11px] font-medium text-sky-700 dark:text-sky-300">Tu flujo RH</span>
            <div className="min-w-0 flex-1">
              <HumanResourcesJourneyNav
                activeTabId={activeTabId}
                appliedAreaIds={appliedAreaIds}
                compact
                copy={copy}
                journey={journey}
                onNavigateArea={onNavigateArea}
                understoodAreaIds={understoodAreaIds}
              />
            </div>
          </div>
        ) : null}

        <CollapsibleContent>
          <div className="border-t border-slate-200 dark:border-slate-800">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-2.5 py-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
              <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                <p className="min-w-0 truncate text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-slate-100"><span aria-hidden="true">🗺️ </span>Ruta RH</span>
                  <span aria-hidden="true"> · </span>
                  Paso {activeJourneyIndex + 1} de {journey.length}
                </p>
                <Button
                  aria-label="Reiniciar vista del recorrido"
                  className="h-7 w-7"
                  onClick={() => onRestartJourney(firstJourneyArea)}
                  size="icon"
                  title="Reiniciar vista"
                  type="button"
                  variant="ghost"
                >
                  <span aria-hidden="true" className="text-sm leading-none">🔄</span>
                </Button>
              </div>

              <HumanResourcesJourneyNav
                activeTabId={activeTabId}
                appliedAreaIds={appliedAreaIds}
                copy={copy}
                journey={journey}
                onNavigateArea={onNavigateArea}
                understoodAreaIds={understoodAreaIds}
              />
            </div>

            <div className="grid gap-3 p-3 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] lg:items-start">
              <HumanResourcesCandidateMission
                onCreateEmployee={onCreateEmployee}
                onEditEmployee={onEditEmployee}
                onRemoveEmployeeException={onRemoveEmployeeException}
                onSelectEmployee={onSelectEmployee}
                onSetEmployeeException={onSetEmployeeException}
                progress={progress}
                signals={signals}
              />

              <article className="rounded-xl border border-sky-200 bg-sky-50/55 p-3 dark:border-sky-900 dark:bg-sky-950/20">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_164px] sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-sky-700 dark:text-sky-300"><span aria-hidden="true">🎯 </span>Objetivo de este paso</p>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px]',
                        isApplied
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                          : isUnderstood
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200'
                            : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300',
                      )}>
                        {isApplied ? 'Aplicado' : isUnderstood ? 'Entendido' : 'Por revisar'}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-medium text-slate-950 dark:text-white">{activeGuide.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">{activeGuide.summary}</p>
                    <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      <span aria-hidden="true" className="shrink-0">🧰</span>
                      <p><span className="font-medium text-slate-800 dark:text-slate-100">Aquí vas a usar:</span> {humanResourcesLearningToolNames[activeTabId]}</p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button onClick={onPrimaryAction} size="sm" type="button">
                        {activeGuide.ctaLabel}<span aria-hidden="true">👇</span>
                      </Button>
                      <Button disabled={isUnderstood} onClick={() => onMarkUnderstood(activeTabId)} size="sm" type="button" variant="outline">
                        <span aria-hidden="true">✅</span>
                        {isUnderstood ? 'Ya está entendido' : 'Ya entendí'}
                      </Button>
                    </div>
                  </div>
                  <div className="justify-self-center sm:justify-self-end">
                    <HumanResourcesLearningToolPreview areaId={activeTabId} />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <summary className="cursor-pointer rounded-sm text-xs font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-slate-200 dark:ring-offset-slate-950">
                      <span aria-hidden="true">🧭 </span>Cómo usar esta parte
                    </summary>
                    <ol className="mt-2 grid gap-2">
                      {activeGuide.steps.map((step, index) => (
                        <li className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300" key={step.title}>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-950 dark:text-sky-200">{index + 1}</span>
                          <span><span className="font-medium text-slate-800 dark:text-slate-100">{step.title}.</span> {step.description}</span>
                        </li>
                      ))}
                    </ol>
                  </details>

                  <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <summary className="cursor-pointer rounded-sm text-xs font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-slate-200 dark:ring-offset-slate-950">
                      <span aria-hidden="true">💬 </span>Ver caso real{safeCharacterId ? ` · ${humanResourcesLearningCharacterLabels[safeCharacterId]}` : ''}
                    </summary>
                    <div className="mt-2 flex gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                        <span aria-hidden="true" className="text-base leading-none">🧑‍💼</span>
                      </span>
                      <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {safeCharacterId
                          ? humanResourcesCharacterExamples[safeCharacterId][activeTabId]
                          : 'Selecciona un caso empresarial desde el Dashboard para ver ejemplos relacionados con tu operación.'}
                      </p>
                    </div>
                  </details>
                </div>
              </article>
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
