import { useEffect, useMemo, useState } from 'react';
import {
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
import { panelInicialGuidanceTabs } from '../panelInicialGuidance';
import type { PanelInicialGuidanceIcon, PanelInicialGuidanceTabId } from '../types';
import type { PanelInicialGuidanceTranslations } from '../translations';

interface OperationalModuleGuideProps {
  copy: PanelInicialGuidanceTranslations;
  activeTabId: PanelInicialGuidanceTabId;
  onTabSelect: (tabId: PanelInicialGuidanceTabId) => void;
}

const iconMap: Record<PanelInicialGuidanceIcon, LucideIcon> = {
  profile: UserCog,
  structure: Building2,
  maturity: BarChart3,
  performance: LineChart,
  users: Users,
};

export function OperationalModuleGuide({
  copy,
  activeTabId,
  onTabSelect,
}: OperationalModuleGuideProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeGuide = copy.tabs[activeTabId];
  const activeDefinition = panelInicialGuidanceTabs.find((tab) => tab.id === activeTabId) ?? panelInicialGuidanceTabs[0];
  const ActiveIcon = iconMap[activeDefinition.icon];
  const activeStep = activeGuide.steps[activeStepIndex] ?? activeGuide.steps[0];
  const hasMultipleSteps = activeGuide.steps.length > 1;
  const stepProgress = useMemo(
    () => `${activeStepIndex + 1}/${activeGuide.steps.length}`,
    [activeGuide.steps.length, activeStepIndex],
  );

  useEffect(() => {
    setActiveStepIndex(0);
  }, [activeTabId]);

  const handlePreviousStep = () => {
    setActiveStepIndex((currentIndex) => (
      currentIndex === 0 ? activeGuide.steps.length - 1 : currentIndex - 1
    ));
  };

  const handleNextStep = () => {
    setActiveStepIndex((currentIndex) => (
      currentIndex === activeGuide.steps.length - 1 ? 0 : currentIndex + 1
    ));
  };

  return (
    <section
      aria-labelledby="panel-inicial-guidance-title"
      className="overflow-hidden rounded-xl border border-[#2563EB]/15 bg-white/95 shadow-[0_14px_38px_-30px_rgba(37,99,235,0.42)] dark:border-[#60A5FA]/20 dark:bg-slate-950/80"
    >
      <div className="border-b border-slate-200/80 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:border-[#60A5FA]/25 dark:bg-[#60A5FA]/10 dark:text-[#BFDBFE]">
              <Lightbulb className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
              <h2 id="panel-inicial-guidance-title" className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                {copy.title}
              </h2>
              <p className="max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:max-w-[52%]">
            <div className="flex min-w-max items-center gap-2">
              {panelInicialGuidanceTabs.map((tab) => {
                const tabCopy = copy.tabs[tab.id];
                const TabIcon = iconMap[tab.icon];
                const isActive = tab.id === activeTabId;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabSelect(tab.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                      isActive
                        ? 'border-[#2563EB]/25 bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 hover:text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#60A5FA]/30 dark:hover:bg-[#60A5FA]/10 dark:hover:text-[#BFDBFE]'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tabCopy.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.48fr)]">
        <article className="rounded-xl border border-[#2563EB]/12 bg-[linear-gradient(135deg,_#ffffff_0%,_#EFF6FF_100%)] p-3 dark:border-[#60A5FA]/15 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0F172A_100%)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2563EB]/20 bg-white text-[#1D4ED8] shadow-sm dark:border-[#60A5FA]/20 dark:bg-slate-950 dark:text-[#BFDBFE]">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:text-[#BFDBFE]">
                {copy.focusLabel}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                {activeGuide.title}
              </h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <p className="rounded-lg border border-white/80 bg-white/70 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                  {activeGuide.summary}
                </p>
                <p className="rounded-lg border border-[#2563EB]/12 bg-white/85 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-[#60A5FA]/15 dark:bg-slate-950/75 dark:text-slate-200">
                  {activeGuide.value}
                </p>
              </div>
            </div>
          </div>
        </article>

        <aside className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {copy.actionsLabel}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#1D4ED8] dark:text-[#BFDBFE]">
                {stepProgress}
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
                  onClick={() => setActiveStepIndex(index)}
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
