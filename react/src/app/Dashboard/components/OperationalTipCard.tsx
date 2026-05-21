import {
  BarChart3,
  Bell,
  Building2,
  CheckSquare,
  Clock3,
  Globe2,
  Moon,
  Route,
  ShoppingCart,
  Star,
  UserCog,
  Users,
  WalletCards,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { OperationalTipCategory, OperationalTipDefinition, OperationalTipIcon } from '../operationalTips';
import type { MainDashboardTranslations } from '../translations';

type OperationalTipCopy = MainDashboardTranslations['operationalJourney']['tips']['items'][keyof MainDashboardTranslations['operationalJourney']['tips']['items']];

interface OperationalTipCardProps {
  tip: OperationalTipDefinition;
  item: OperationalTipCopy;
  categoryLabel: string;
}

const tipIcons: Record<OperationalTipIcon, LucideIcon> = {
  analytics: BarChart3,
  attendance: Clock3,
  bell: Bell,
  building: Building2,
  checklist: CheckSquare,
  commerce: ShoppingCart,
  finance: WalletCards,
  globe: Globe2,
  moon: Moon,
  profile: UserCog,
  route: Route,
  star: Star,
  team: Users,
  wallet: WalletCards,
  chart: BarChart3,
  workflow: Workflow,
};

const categoryClasses: Record<OperationalTipCategory, string> = {
  header: 'border-[#558DBD]/25 bg-[#558DBD]/5 text-[#143675] dark:border-[#558DBD]/30 dark:bg-[#558DBD]/10 dark:text-[#b7d6ed]',
  stage: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  module: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
  workflow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
};

export function OperationalTipCard({ tip, item, categoryLabel }: OperationalTipCardProps) {
  const TipIcon = tipIcons[tip.icon];

  return (
    <article className="min-h-[132px] rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <TipIcon className="h-4 w-4" />
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryClasses[tip.category]}`}>
          {categoryLabel}
        </span>
      </div>

      <h3 className="text-sm font-semibold leading-snug text-slate-950 dark:text-white">
        {item.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {item.description}
      </p>
    </article>
  );
}
