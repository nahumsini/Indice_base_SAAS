import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileSignature,
  Handshake,
  Lightbulb,
  PackageCheck,
  Quote,
  Target,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { useLocalStorageState } from '../../../../hooks/useLocalStorageState';
import { salesGuidanceTabs } from '../salesGuidance';
import type { SalesGuidanceIcon, SalesGuidanceTabId } from '../types';
import type { SalesGuidanceTranslations } from '../translations';

interface OperationalModuleGuideProps {
  activeTabId: SalesGuidanceTabId;
  copy: SalesGuidanceTranslations;
  onPrimaryAction?: () => void;
}

type ViewedStepsByTab = Record<SalesGuidanceTabId, number[]>;

const iconMap: Record<SalesGuidanceIcon, LucideIcon> = {
  leads: Target,
  contacts: UsersRound,
  quotes: Quote,
  sales: BriefcaseBusiness,
  products: PackageCheck,
  inventory: Warehouse,
  contracts: FileSignature,
  afterSales: Handshake,
  kpis: BarChart3,
};

const initialViewedStepsByTab: ViewedStepsByTab = {
  leads: [],
  contacts: [],
  quotes: [],
  sales: [],
  products: [],
  inventory: [],
  contracts: [],
  'after-sales': [],
  kpis: [],
};

export function OperationalModuleGuide({
  activeTabId,
  copy,
  onPrimaryAction,
}: OperationalModuleGuideProps) {
  const [stepState, setStepState] = useState<{ tabId: SalesGuidanceTabId; index: number }>(() => ({
    tabId: activeTabId,
    index: 0,
  }));
  const [viewedStepsByTab, setViewedStepsByTab] = useLocalStorageState<ViewedStepsByTab>(
    'indice.sales.learningGuide.viewedSteps',
    initialViewedStepsByTab,
  );
  const [isCollapsed, setIsCollapsed] = useLocalStorageState<boolean>(
    'indice.sales.learningGuide.collapsed',
    false,
  );
  const activeGuide = copy.tabs[activeTabId];
  const activeDefinition = salesGuidanceTabs.find((tab) => tab.id === activeTabId) ?? salesGuidanceTabs[0];
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
  const stepProgress = `${activeStepIndex + 1}/${activeGuide.steps.length}`;

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
    setStepState({ tabId: activeTabId, index });
  };

  return (
    <section
      aria-labelledby="sales-guidance-title"
      className="mt-5 overflow-hidden rounded-xl border border-[#FF6B5E]/20 bg-white/95 shadow-[0_18px_44px_-34px_rgba(255,107,94,0.65)] dark:border-[#FFB4AD]/20 dark:bg-slate-950/85"
    >
      <div className="border-b border-[#FF6B5E]/10 bg-[#FF6B5E]/[0.04] p-4 dark:border-[#FFB4AD]/10 dark:bg-[#FF6B5E]/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B63B32] shadow-sm dark:border-[#FFB4AD]/25 dark:bg-slate-950 dark:text-[#FFD8D4]">
              <Lightbulb className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>
            <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-4">
              <h2 id="sales-guidance-title" className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                {copy.title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((currentValue) => !currentValue)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#FF6B5E]/20 bg-white px-3 text-xs font-semibold text-[#B63B32] shadow-sm transition hover:border-[#FF6B5E]/40 hover:bg-[#FFF1EF] dark:border-[#FFB4AD]/20 dark:bg-slate-950 dark:text-[#FFD8D4] dark:hover:bg-slate-900"
          >
            {isCollapsed ? copy.expandLabel : copy.collapseLabel}
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {isCollapsed ? null : (
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          <article className="rounded-xl border border-[#FF6B5E]/15 bg-[linear-gradient(135deg,_#ffffff_0%,_#FFF1EF_100%)] p-3 dark:border-[#FFB4AD]/15 dark:bg-[linear-gradient(135deg,_#020617_0%,_#1E1B1B_100%)] sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF6B5E]/25 bg-white text-[#B63B32] shadow-sm dark:border-[#FFB4AD]/20 dark:bg-slate-950 dark:text-[#FFD8D4]">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B63B32] dark:text-[#FFD8D4]">
                  {copy.controlLabel}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                  {activeGuide.title}
                </h3>
                <div className="mt-2 grid gap-2">
                  <p className="rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    {activeGuide.summary}
                  </p>
                  <p className="rounded-lg border border-[#FF6B5E]/15 bg-white/85 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-[#FFB4AD]/15 dark:bg-slate-950/75 dark:text-slate-200">
                    {activeGuide.value}
                  </p>
                </div>
                {onPrimaryAction ? (
                  <button
                    type="button"
                    onClick={onPrimaryAction}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-white px-3 py-2 text-xs font-semibold text-[#B63B32] shadow-sm transition hover:border-[#FF6B5E]/40 hover:bg-[#FFF1EF] dark:border-[#FFB4AD]/20 dark:bg-slate-950 dark:text-[#FFD8D4] dark:hover:bg-slate-900"
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
                <p className="mt-1 text-xs font-semibold text-[#B63B32] dark:text-[#FFD8D4]">
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
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#FF6B5E]/35 hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[#FFB4AD]/30 dark:hover:text-[#FFD8D4]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      aria-label={copy.nextStepLabel}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#FF6B5E]/35 hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[#FFB4AD]/30 dark:hover:text-[#FFD8D4]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-[#FF6B5E] transition-all duration-300" style={{ width: `${guideProgress}%` }} />
            </div>

            <article className="mt-3 min-h-[104px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FFB4AD]/20 dark:bg-[#FFB4AD]/10 dark:text-[#FFD8D4]">
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
                        ? 'w-7 bg-[#FF6B5E]'
                        : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}
