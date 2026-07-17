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
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import type {
  DashboardModuleCard,
  DashboardModuleColor,
} from "../../config/moduleCatalog";
import type { PageId } from "../../config/navigation";
import type {
  OperationalJourneyStageId,
  OperationalJourneyStageStatus,
  OperationalJourneyStageView,
} from "../operationalJourney";
import type { MainDashboardTranslations } from "../translations";

interface OperationalJourneyProps {
  copy: MainDashboardTranslations["operationalJourney"];
  stages: OperationalJourneyStageView[];
  stageModules: Partial<
    Record<OperationalJourneyStageId, DashboardModuleCard[]>
  >;
  activeStageId?: OperationalJourneyStageId;
  onStageSelect: (stageId: OperationalJourneyStageId) => void;
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

const statusSurfaceClasses: Record<OperationalJourneyStageStatus, string> = {
  completed:
    "bg-white/95 dark:bg-slate-950/85",
  active: "",
  pending:
    "bg-white/95 dark:bg-slate-900/80",
  locked:
    "bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500",
};

const statusBadgeClasses: Record<OperationalJourneyStageStatus, string> = {
  completed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25",
  active: "",
  pending:
    "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  locked:
    "bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800",
};

const stageVisualClasses: Record<
  OperationalJourneyStageId,
  {
    border: string;
    stripe: string;
    icon: string;
    number: string;
    active: string;
    activeBadge: string;
    progress: string;
    progressActive: string;
    focus: string;
  }
> = {
  company_setup: {
    border:
      "border-[#2563EB]/50 hover:border-[#2563EB] dark:border-[#2563EB]/55 dark:hover:border-[#60A5FA]",
    stripe: "bg-[#2563EB]",
    icon: "border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB] dark:text-[#93C5FD]",
    number: "text-[#2563EB] dark:text-[#93C5FD]",
    active:
      "bg-[#2563EB]/[0.06] ring-2 ring-[#2563EB]/20 shadow-[0_18px_42px_rgba(37,99,235,0.18)] dark:bg-[#2563EB]/10",
    activeBadge:
      "bg-[#2563EB]/10 text-[#2563EB] ring-1 ring-[#2563EB]/25 dark:text-[#93C5FD]",
    progress: "bg-[#2563EB]",
    progressActive: "bg-[#2563EB]/30 ring-1 ring-[#2563EB]/50",
    focus: "focus-visible:ring-[#2563EB]",
  },
  human_resources: {
    border:
      "border-[#59C3A5]/60 hover:border-[#59C3A5] dark:border-[#59C3A5]/55 dark:hover:border-[#8FE0CA]",
    stripe: "bg-[#59C3A5]",
    icon: "border-[#59C3A5]/30 bg-[#59C3A5]/12 text-[#257B68] dark:text-[#8FE0CA]",
    number: "text-[#257B68] dark:text-[#8FE0CA]",
    active:
      "bg-[#59C3A5]/[0.08] ring-2 ring-[#59C3A5]/25 shadow-[0_18px_42px_rgba(89,195,165,0.20)] dark:bg-[#59C3A5]/10",
    activeBadge:
      "bg-[#59C3A5]/15 text-[#257B68] ring-1 ring-[#59C3A5]/35 dark:text-[#8FE0CA]",
    progress: "bg-[#59C3A5]",
    progressActive: "bg-[#59C3A5]/30 ring-1 ring-[#59C3A5]/55",
    focus: "focus-visible:ring-[#59C3A5]",
  },
  operations: {
    border:
      "border-[#F4C84A]/75 hover:border-[#E5B62F] dark:border-[#F4C84A]/55 dark:hover:border-[#FDE68A]",
    stripe: "bg-[#F4C84A]",
    icon: "border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#8A6208] dark:text-[#FEF3C7]",
    number: "text-[#9A6B05] dark:text-[#FEF3C7]",
    active:
      "bg-[#F4C84A]/[0.10] ring-2 ring-[#F4C84A]/30 shadow-[0_18px_42px_rgba(244,200,74,0.22)] dark:bg-[#F4C84A]/10",
    activeBadge:
      "bg-[#F4C84A]/20 text-[#815B08] ring-1 ring-[#F4C84A]/45 dark:text-[#FEF3C7]",
    progress: "bg-[#F4C84A]",
    progressActive: "bg-[#F4C84A]/35 ring-1 ring-[#E5B62F]/60",
    focus: "focus-visible:ring-[#E5B62F]",
  },
  finance: {
    border:
      "border-[#147514]/50 hover:border-[#147514] dark:border-emerald-500/55 dark:hover:border-emerald-300",
    stripe: "bg-[#147514]",
    icon: "border-[#147514]/25 bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300",
    number: "text-[#147514] dark:text-emerald-300",
    active:
      "bg-emerald-50/70 ring-2 ring-[#147514]/20 shadow-[0_18px_42px_rgba(20,117,20,0.18)] dark:bg-emerald-500/10",
    activeBadge:
      "bg-emerald-50 text-[#147514] ring-1 ring-[#147514]/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    progress: "bg-[#147514]",
    progressActive: "bg-[#147514]/25 ring-1 ring-[#147514]/50",
    focus: "focus-visible:ring-[#147514]",
  },
  commercial: {
    border:
      "border-[#FF6B5E]/55 hover:border-[#FF6B5E] dark:border-[#FF6B5E]/55 dark:hover:border-[#FFB0AA]",
    stripe: "bg-[#FF6B5E]",
    icon: "border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]",
    number: "text-[#C4493F] dark:text-[#FFB0AA]",
    active:
      "bg-[#FF6B5E]/[0.07] ring-2 ring-[#FF6B5E]/20 shadow-[0_18px_42px_rgba(255,107,94,0.18)] dark:bg-[#FF6B5E]/10",
    activeBadge:
      "bg-[#FF6B5E]/10 text-[#B63B32] ring-1 ring-[#FF6B5E]/30 dark:text-[#FFB0AA]",
    progress: "bg-[#FF6B5E]",
    progressActive: "bg-[#FF6B5E]/30 ring-1 ring-[#FF6B5E]/55",
    focus: "focus-visible:ring-[#FF6B5E]",
  },
  analytics: {
    border:
      "border-purple-500/50 hover:border-purple-600 dark:border-purple-500/55 dark:hover:border-purple-300",
    stripe: "bg-purple-600",
    icon: "border-purple-500/25 bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
    number: "text-purple-700 dark:text-purple-300",
    active:
      "bg-purple-50/70 ring-2 ring-purple-500/20 shadow-[0_18px_42px_rgba(147,51,234,0.18)] dark:bg-purple-500/10",
    activeBadge:
      "bg-purple-50 text-purple-700 ring-1 ring-purple-500/25 dark:bg-purple-500/10 dark:text-purple-300",
    progress: "bg-purple-600",
    progressActive: "bg-purple-500/30 ring-1 ring-purple-500/55",
    focus: "focus-visible:ring-purple-600",
  },
};

const moduleButtonClasses: Record<DashboardModuleColor, string> = {
  aqua: "border-[#59C3A5]/35 bg-[#59C3A5]/10 text-[#257B68] hover:border-[#59C3A5] hover:bg-[#59C3A5] hover:text-white dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]",
  blue: "border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white dark:border-[#2563EB]/35 dark:bg-[#2563EB]/10 dark:text-[#93C5FD]",
  coral:
    "border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] hover:border-[#FF6B5E] hover:bg-[#FF6B5E] hover:text-white dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]",
  yellow:
    "border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9A6B05] hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-[#222831] dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/10 dark:text-[#FEF3C7]",
  orange:
    "border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] hover:border-[#FF6B5E] hover:bg-[#FF6B5E] hover:text-white dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]",
  green:
    "border-[#147514]/25 bg-emerald-50 text-[#147514] hover:border-[#147514] hover:bg-[#147514] hover:text-white dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  gray: "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-500 hover:bg-slate-600 hover:text-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  purple:
    "border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-600 hover:bg-purple-600 hover:text-white dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
  red: "border-red-300 bg-red-50 text-red-700 hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  gold: "border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9A6B05] hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-[#222831] dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/10 dark:text-[#FEF3C7]",
};

export function OperationalJourney({
  copy,
  stages,
  stageModules,
  activeStageId,
  onStageSelect,
  onModuleClick,
  onDismiss,
}: OperationalJourneyProps) {
  const completedCount = stages.filter(
    (stage) => stage.status === "completed",
  ).length;
  const progressPercent = Math.round(
    (completedCount / Math.max(stages.length, 1)) * 100,
  );

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
              <h2
                id="operational-journey-title"
                className="text-2xl font-semibold text-slate-950 dark:text-white"
              >
                {copy.title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="min-w-[220px]">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{copy.progressLabel}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
                  {stages.map((stage) => {
                    const stageStyle = stageVisualClasses[stage.id];
                    const segmentClass =
                      stage.status === "completed"
                        ? stageStyle.progress
                        : stage.status === "active"
                          ? stageStyle.progressActive
                          : "bg-slate-200 dark:bg-slate-700";

                    return (
                      <span
                        key={stage.id}
                        className={`h-2 rounded-full transition-all duration-500 ${segmentClass}`}
                      />
                    );
                  })}
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
            {stages.map((stage, stageIndex) => {
              const labels = copy.stages[stage.id];
              const StageIcon = stageIcons[stage.id];
              const StatusIcon = statusIcons[stage.status];
              const isActive = activeStageId === stage.id;
              const modules = stageModules[stage.id] ?? [];
              const stageStyle = stageVisualClasses[stage.id];
              const badgeClass = isActive
                ? stageStyle.activeBadge
                : statusBadgeClasses[stage.status];

              return (
                <article
                  key={stage.id}
                  className={`relative flex min-h-[228px] flex-col justify-between overflow-hidden rounded-xl border-2 px-4 pb-4 pt-5 text-left transition-all duration-300 hover:-translate-y-1 ${stageStyle.border} ${statusSurfaceClasses[stage.status]} ${isActive ? stageStyle.active : "shadow-sm hover:shadow-lg"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-1 ${stageStyle.stripe}`}
                  />
                  <button
                    type="button"
                    onClick={() => onStageSelect(stage.id)}
                    className={`flex flex-1 flex-col rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${stageStyle.focus}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${stageStyle.icon}`}
                      >
                        <StageIcon className="h-5 w-5" />
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {copy.status[stage.status]}
                      </span>
                    </span>

                    <span className="mt-4 block">
                      <span
                        className={`mb-1 block text-2xl font-black leading-none tracking-tight ${stageStyle.number}`}
                      >
                        {String(stageIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-2 block text-[15px] font-semibold leading-snug text-slate-950 dark:text-white">
                        {labels.title}
                      </span>
                      <span className="mt-2 line-clamp-4 block text-xs leading-5 text-slate-600 dark:text-slate-300">
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
