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
import type {
  OperationalJourneyStageId,
  OperationalJourneyStageStatus,
  OperationalJourneyStageView,
} from '../operationalJourney';
import type { MainDashboardTranslations } from '../translations';

interface OperationalJourneyProps {
  copy: MainDashboardTranslations['operationalJourney'];
  stages: OperationalJourneyStageView[];
  activeStageId?: OperationalJourneyStageId;
  onStageSelect: (stageId: OperationalJourneyStageId) => void;
  onStageAction: (stageId: OperationalJourneyStageId) => void;
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
  active: 'border-[#558DBD]/50 bg-[#558DBD]/10 text-[#143675] ring-2 ring-[#558DBD]/10 dark:border-[#558DBD]/45 dark:bg-[#558DBD]/15 dark:text-[#b7d6ed]',
  pending: 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
  locked: 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500',
};

export function OperationalJourney({
  copy,
  stages,
  activeStageId,
  onStageSelect,
  onStageAction,
  onDismiss,
}: OperationalJourneyProps) {
  const completedCount = stages.filter((stage) => stage.status === 'completed').length;
  const progressPercent = Math.round((completedCount / Math.max(stages.length, 1)) * 100);

  return (
    <section aria-labelledby="operational-journey-title">
      <Card className="overflow-hidden rounded-xl border border-[#558DBD]/25 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-[#558DBD]/25 dark:bg-slate-950/85">
        <div className="flex flex-col gap-5 p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#558DBD]/25 bg-[#558DBD]/5 px-3 py-1 text-xs font-semibold text-[#143675] dark:border-[#558DBD]/30 dark:bg-[#558DBD]/10 dark:text-[#b7d6ed]">
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
                    className="h-full rounded-full bg-[#558DBD] transition-all duration-500"
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

              return (
                <article
                  key={stage.id}
                  className={`flex min-h-[168px] flex-col justify-between rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${statusClasses[stage.status]} ${isActive ? 'shadow-[0_14px_36px_rgba(85,141,189,0.16)]' : 'shadow-sm'}`}
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

                  <button
                    type="button"
                    onClick={() => onStageAction(stage.id)}
                    className="mt-4 inline-flex w-fit rounded-full border border-current/15 bg-white/70 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    {labels.cta}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}
