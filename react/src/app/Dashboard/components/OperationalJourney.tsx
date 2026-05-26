import {
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  LockKeyhole,
  ShoppingCart,
  Users,
  WalletCards,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import type { DashboardModuleCard, DashboardModuleColor } from '../../config/moduleCatalog';
import type { PageId } from '../../config/navigation';
import type {
  OperationalJourneyStageId,
  OperationalJourneyStageStatus,
  OperationalJourneyStageView,
} from '../operationalJourney';
import type { MainDashboardTranslations } from '../translations';

interface OperationalJourneyProps {
  copy: MainDashboardTranslations['operationalJourney'];
  stages: OperationalJourneyStageView[];
  stageModules: Partial<Record<OperationalJourneyStageId, DashboardModuleCard[]>>;
  activeStageId?: OperationalJourneyStageId;
  onStageSelect: (stageId: OperationalJourneyStageId) => void;
  onStagePreview: (stageId: OperationalJourneyStageId) => void;
  onModuleClick: (moduleRoute: PageId) => void;
  onDismiss?: () => void;
}

const stageIcons: Record<OperationalJourneyStageId, LucideIcon> = {
  company_setup: Building2,
  human_resources: Users,
  operations: Workflow,
  finance: WalletCards,
  commercial: ShoppingCart,
  analytics: BarChart3,
};

const statusIcons: Record<OperationalJourneyStageStatus, LucideIcon> = {
  completed: CheckCircle2,
  active: Circle,
  pending: Circle,
  locked: LockKeyhole,
};

const statusClasses: Record<OperationalJourneyStageStatus, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  active: 'border-[#2563EB]/50 bg-[#2563EB]/10 text-[#2563EB] ring-2 ring-[#2563EB]/10 dark:border-[#2563EB]/45 dark:bg-[#2563EB]/15 dark:text-[#93C5FD]',
  pending: 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
  locked: 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500',
};

const moduleButtonClasses: Record<DashboardModuleColor, string> = {
  aqua: 'border-[#59C3A5]/35 bg-[#59C3A5]/10 text-[#257B68] hover:border-[#59C3A5] hover:bg-[#59C3A5] hover:text-white dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]',
  blue: 'border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white dark:border-[#2563EB]/35 dark:bg-[#2563EB]/10 dark:text-[#93C5FD]',
  coral: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] hover:border-[#FF6B5E] hover:bg-[#FF6B5E] hover:text-white dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]',
  yellow: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9A6B05] hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-[#222831] dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/10 dark:text-[#FEF3C7]',
  orange: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] hover:border-[#FF6B5E] hover:bg-[#FF6B5E] hover:text-white dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]',
  green: 'border-[#147514]/25 bg-emerald-50 text-[#147514] hover:border-[#147514] hover:bg-[#147514] hover:text-white dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  gray: 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-500 hover:bg-slate-600 hover:text-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  purple: 'border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-600 hover:bg-purple-600 hover:text-white dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300',
  red: 'border-red-300 bg-red-50 text-red-700 hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  gold: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9A6B05] hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-[#222831] dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/10 dark:text-[#FEF3C7]',
};

export function OperationalJourney({
  copy,
  stages,
  stageModules,
  activeStageId,
  onStageSelect,
  onStagePreview,
  onModuleClick,
  onDismiss,
}: OperationalJourneyProps) {
  const completedCount = stages.filter((stage) => stage.status === 'completed').length;
  const progressPercent = Math.round((completedCount / Math.max(stages.length, 1)) * 100);

  return (
    <section aria-labelledby="operational-journey-title">
      <Card className="overflow-hidden rounded-xl border border-[#2563EB]/25 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-[#2563EB]/25 dark:bg-slate-950/85">
        <div className="flex flex-col gap-5 p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/25 bg-[#2563EB]/5 px-3 py-1 text-xs font-semibold text-[#2563EB] dark:border-[#2563EB]/30 dark:bg-[#2563EB]/10 dark:text-[#93C5FD]">
                <Check className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </div>
              <h2 id="operational-journey-title" className="text-2xl font-semibold text-slate-950 dark:text-white">
                {copy.title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="min-w-[150px]">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{copy.progressLabel}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              {onDismiss && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onDismiss}
                  aria-label={copy.dismissLabel}
                  className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {stages.map((stage) => {
              const labels = copy.stages[stage.id];
              const StageIcon = stageIcons[stage.id];
              const StatusIcon = statusIcons[stage.status];
              const isActive = activeStageId === stage.id;
              const modules = stageModules[stage.id] ?? [];

              return (
                <article
                  key={stage.id}
                  onMouseEnter={() => onStagePreview(stage.id)}
                  onFocusCapture={() => onStagePreview(stage.id)}
                  className={`flex min-h-[168px] flex-col justify-between rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${statusClasses[stage.status]} ${isActive ? 'shadow-[0_14px_36px_rgba(37,99,235,0.16)]' : 'shadow-sm'}`}
                >
                  <button
                    type="button"
                    onClick={() => onStageSelect(stage.id)}
                    className="flex flex-1 flex-col text-left focus:outline-none"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-current/15 bg-white/70 dark:bg-white/5">
                        <StageIcon className="h-5 w-5" />
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold dark:bg-white/5">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {copy.status[stage.status]}
                      </span>
                    </span>

                    <span className="mt-4 block">
                      <span className="block text-sm font-semibold leading-snug text-slate-950 dark:text-white">
                        {labels.title}
                      </span>
                      <span className="mt-2 line-clamp-3 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {labels.description}
                      </span>
                    </span>
                  </button>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {modules.length > 0 ? (
                      modules.map((module) => (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => onModuleClick(module.route)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${moduleButtonClasses[module.color]}`}
                        >
                          <span aria-hidden="true">{module.emoji}</span>
                          {module.title}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => onModuleClick(stage.primaryRoute)}
                        className="inline-flex w-fit rounded-full border border-current/15 bg-white/70 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        {labels.cta}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}
