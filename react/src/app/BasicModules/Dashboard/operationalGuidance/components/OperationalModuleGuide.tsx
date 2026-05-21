import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
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
  const activeGuide = copy.tabs[activeTabId];
  const activeDefinition = panelInicialGuidanceTabs.find((tab) => tab.id === activeTabId) ?? panelInicialGuidanceTabs[0];
  const ActiveIcon = iconMap[activeDefinition.icon];

  return (
    <section
      aria-labelledby="panel-inicial-guidance-title"
      className="overflow-hidden rounded-2xl border border-[#2563EB]/15 bg-white/95 shadow-[0_18px_50px_-34px_rgba(37,99,235,0.45)] dark:border-[#60A5FA]/20 dark:bg-slate-950/80"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.68fr)]">
        <div className="border-b border-slate-200/80 p-4 dark:border-slate-800 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:border-[#60A5FA]/25 dark:bg-[#60A5FA]/10 dark:text-[#BFDBFE]">
                <Lightbulb className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </div>
              <h2 id="panel-inicial-guidance-title" className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {copy.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {copy.tabsLabel}
            </p>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
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
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                        isActive
                          ? 'border-[#2563EB]/25 bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 hover:text-[#1D4ED8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#60A5FA]/30 dark:hover:bg-[#60A5FA]/10 dark:hover:text-[#BFDBFE]'
                      }`}
                    >
                      <TabIcon className="h-4 w-4" />
                      {tabCopy.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <article className="mt-5 rounded-2xl border border-[#2563EB]/12 bg-[linear-gradient(135deg,_#ffffff_0%,_#EFF6FF_100%)] p-4 dark:border-[#60A5FA]/15 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0F172A_100%)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2563EB]/20 bg-white text-[#1D4ED8] shadow-sm dark:border-[#60A5FA]/20 dark:bg-slate-950 dark:text-[#BFDBFE]">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1D4ED8] dark:text-[#BFDBFE]">
                  {copy.focusLabel}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                  {activeGuide.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {activeGuide.summary}
                </p>
                <p className="mt-3 rounded-xl border border-[#2563EB]/12 bg-white/80 px-3 py-2 text-sm leading-6 text-slate-700 dark:border-[#60A5FA]/15 dark:bg-slate-950/75 dark:text-slate-200">
                  {activeGuide.value}
                </p>
              </div>
            </div>
          </article>
        </div>

        <div className="bg-slate-50/80 p-4 dark:bg-slate-900/50 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {copy.actionsLabel}
          </p>
          <div className="mt-3 grid gap-3">
            {activeGuide.steps.map((step, index) => (
              <article
                key={`${activeTabId}-${step.title}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#2563EB]/15 bg-[#2563EB]/6 text-[#1D4ED8] dark:border-[#60A5FA]/20 dark:bg-[#60A5FA]/10 dark:text-[#BFDBFE]">
                    {index === 0 ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                      {step.title}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
