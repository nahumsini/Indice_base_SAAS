import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Lightbulb,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useLocalStorageState } from '../../../../hooks/useLocalStorageState';
import { panelInicialGuidanceTabs } from '../panelInicialGuidance';
import type { PanelInicialGuidanceIcon, PanelInicialGuidanceTabId } from '../types';
import type { PanelInicialGuidanceTranslations } from '../translations';

interface OperationalModuleGuideProps {
  copy: PanelInicialGuidanceTranslations;
  activeTabId: PanelInicialGuidanceTabId;
  onPrimaryAction?: () => void;
}

type ViewedStepsByTab = Record<PanelInicialGuidanceTabId, number[]>;

const iconMap: Record<PanelInicialGuidanceIcon, LucideIcon> = {
  profile: UserCog,
  structure: Building2,
  maturity: BarChart3,
  performance: LineChart,
  users: Users,
};

const initialViewedStepsByTab: ViewedStepsByTab = {
  profile: [],
  'business-structure': [],
  'business-profile': [],
  'personal-performance': [],
  users: [],
};

export function OperationalModuleGuide({
  copy,
  activeTabId,
  onPrimaryAction,
}: OperationalModuleGuideProps) {
  const [stepState, setStepState] = useState<{ tabId: PanelInicialGuidanceTabId; index: number }>(() => ({
    tabId: activeTabId,
    index: 0,
  }));
  const [viewedStepsByTab, setViewedStepsByTab] = useLocalStorageState<ViewedStepsByTab>(
    'indice.homePanel.learningGuide.viewedSteps',
    initialViewedStepsByTab,
  );
  const activeGuide = copy.tabs[activeTabId];
  const activeDefinition = panelInicialGuidanceTabs.find((tab) => tab.id === activeTabId) ?? panelInicialGuidanceTabs[0];
  const ActiveIcon = iconMap[activeDefinition.icon];
  const activeStepIndex = stepState.tabId === activeTabId ? stepState.index : 0;
  const activeStep = activeGuide.steps[activeStepIndex] ?? activeGuide.steps[0];
  const hasMultipleSteps = activeGuide.steps.length > 1;
  const validViewedSteps = useMemo(
    () => (viewedStepsByTab[activeTabId] ?? []).filter((index) => index >= 0 && index < activeGuide.steps.length),
    [activeGuide.steps.length, activeTabId, viewedStepsByTab],
  );
  const guideProgress = activeGuide.steps.length > 0
    ? Math.round((validViewedSteps.length / activeGuide.steps.length) * 100)
    : 0;
  const stepProgress = useMemo(
    () => `${activeStepIndex + 1}/${activeGuide.steps.length}`,
    [activeGuide.steps.length, activeStepIndex],
  );

  useEffect(() => {
    setViewedStepsByTab((currentViewedSteps) => {
      const currentSteps = currentViewedSteps[activeTabId] ?? [];

      if (currentSteps.includes(activeStepIndex)) {
        return currentViewedSteps;
      }

      return {
        ...initialViewedStepsByTab,
        ...currentViewedSteps,
        [activeTabId]: [...currentSteps, activeStepIndex].sort((firstIndex, secondIndex) => firstIndex - secondIndex),
      };
    });
  }, [activeStepIndex, activeTabId, setViewedStepsByTab]);

  const handlePreviousStep = () => {
    setStepState((currentState) => {
      const currentIndex = currentState.tabId === activeTabId ? currentState.index : 0;

      return {
        tabId: activeTabId,
        index: currentIndex === 0 ? activeGuide.steps.length - 1 : currentIndex - 1,
      };
    });
  };

  const handleNextStep = () => {
    setStepState((currentState) => {
      const currentIndex = currentState.tabId === activeTabId ? currentState.index : 0;

      return {
        tabId: activeTabId,
        index: currentIndex === activeGuide.steps.length - 1 ? 0 : currentIndex + 1,
      };
    });
  };

  const handleStepIndicatorClick = (index: number) => {
    setStepState({
      tabId: activeTabId,
      index,
    });
  };

  return (
    <section
      aria-labelledby="panel-inicial-guidance-title"
      className="overflow-hidden rounded-xl border border-[#2563EB]/15 bg-white/95 shadow-[0_14px_38px_-30px_rgba(37,99,235,0.42)] dark:border-[#60A5FA]/20 dark:bg-slate-950/80"
    >
      <div className="border-b border-slate-200/80 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:border-[#60A5FA]/25 dark:bg-[#60A5FA]/10 dark:text-[#BFDBFE]">
              <Lightbulb className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>
            <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-4">
              <h2 id="panel-inicial-guidance-title" className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                {copy.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[#2563EB]/12 bg-[linear-gradient(135deg,_#ffffff_0%,_#EFF6FF_100%)] p-3 dark:border-[#60A5FA]/15 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0F172A_100%)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2563EB]/20 bg-white text-[#1D4ED8] shadow-sm dark:border-[#60A5FA]/20 dark:bg-slate-950 dark:text-[#BFDBFE]">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:text-[#BFDBFE]">
                {copy.controlLabel}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                {activeGuide.title}
              </h3>
              <div className="mt-2 grid gap-2">
                <p className="rounded-lg border border-white/80 bg-white/70 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                  {activeGuide.summary}
                </p>
                <p className="rounded-lg border border-[#2563EB]/12 bg-white/85 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-[#60A5FA]/15 dark:bg-slate-950/75 dark:text-slate-200">
                  {activeGuide.value}
                </p>
              </div>
              {onPrimaryAction ? (
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1D4ED8] shadow-sm transition hover:border-[#2563EB]/35 hover:bg-[#EFF6FF] dark:border-[#60A5FA]/20 dark:bg-slate-950 dark:text-[#BFDBFE] dark:hover:border-[#60A5FA]/35 dark:hover:bg-slate-900"
                >
                  {activeGuide.ctaLabel}
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </article>

        <aside className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {copy.functionsLabel}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#1D4ED8] dark:text-[#BFDBFE]">
                {stepProgress}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="min-w-[108px] sm:text-right">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {copy.guideProgressLabel}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {guideProgress}% {copy.guideProgressCompleteLabel}
                </p>
              </div>

              {hasMultipleSteps ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    aria-label={copy.previousStepLabel}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#2563EB]/30 hover:text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[#60A5FA]/30 dark:hover:text-[#BFDBFE]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    aria-label={copy.nextStepLabel}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#2563EB]/30 hover:text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[#60A5FA]/30 dark:hover:text-[#BFDBFE]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-300 dark:bg-[#60A5FA]"
              style={{ width: `${guideProgress}%` }}
            />
          </div>

          <article className="mt-3 min-h-[104px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#2563EB]/15 bg-[#2563EB]/6 text-[#1D4ED8] dark:border-[#60A5FA]/20 dark:bg-[#60A5FA]/10 dark:text-[#BFDBFE]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                  {activeStep.title}
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {activeStep.description}
                </p>
              </div>
            </div>
          </article>

          {hasMultipleSteps ? (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {activeGuide.steps.map((step, index) => (
                <button
                  key={`${activeTabId}-${step.title}-indicator`}
                  type="button"
                  onClick={() => handleStepIndicatorClick(index)}
                  aria-label={`${copy.stepIndicatorLabel} ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeStepIndex
                      ? 'w-7 bg-[#2563EB] dark:bg-[#60A5FA]'
                      : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
