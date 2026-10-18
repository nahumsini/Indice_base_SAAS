import { Card } from './ui/card';
import { OriginalModuleEmoji } from './icons/OriginalModuleEmoji';
import {
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface KPICardProps {
  kpiId?: string;
  presentation?: 'compact' | 'portrait';
  moduleLabel?: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  tone?: 'positive' | 'negative' | 'neutral';
  trend?: 'up' | 'down' | 'flat';
}

interface KpiModuleIdentity {
  emoji: string;
  moduleId?: string;
  iconClasses: string;
}

const moduleIdentities = {
  expenses: { moduleId: 'expenses', emoji: '💸', iconClasses: 'border-green-200 bg-green-50 dark:border-green-700/60 dark:bg-green-900/25' },
  pettyCash: { moduleId: 'petty-cash', emoji: '💰', iconClasses: 'border-green-200 bg-green-50 dark:border-green-700/60 dark:bg-green-900/25' },
  sales: { moduleId: 'sales', emoji: '💼', iconClasses: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15' },
  pointOfSale: { moduleId: 'point-of-sale', emoji: '🛒', iconClasses: 'border-orange-200 bg-orange-50 dark:border-orange-700/60 dark:bg-orange-900/25' },
  humanResources: { moduleId: 'human-resources', emoji: '👥', iconClasses: 'border-[#59C3A5]/35 bg-[#E7F3F2] dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/15' },
  processes: { moduleId: 'processes-tasks', emoji: '✅', iconClasses: 'border-[#F4C84A]/40 bg-[#F4C84A]/15 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15' },
  inventory: { moduleId: 'inventory', emoji: '📦', iconClasses: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15' },
  maintenance: { moduleId: 'maintenance', emoji: '🔧', iconClasses: 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800' },
  invoicing: { emoji: '🧾', iconClasses: 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800' },
  workClimate: { emoji: '🌡️', iconClasses: 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800' },
  system: { moduleId: 'kpis', emoji: '💱', iconClasses: 'border-[var(--indice-brand-primary)]/30 bg-[var(--indice-brand-soft)] dark:border-[var(--indice-brand-primary)]/35 dark:bg-[var(--indice-brand-primary)]/15' },
} satisfies Record<string, KpiModuleIdentity>;

const kpiModuleIdentity: Record<string, KpiModuleIdentity> = {
  monthlyExpenses: moduleIdentities.expenses, expensesByCategory: moduleIdentities.expenses, pendingExpenses: moduleIdentities.expenses,
  overdueExpenses: moduleIdentities.expenses, budgetAvailable: moduleIdentities.expenses, budgetUtilization: moduleIdentities.expenses,
  cashDue7Days: moduleIdentities.expenses, pettyCashBalance: moduleIdentities.pettyCash, pettyCashExpenses: moduleIdentities.pettyCash,
  weeklyRevenue: moduleIdentities.sales, monthlyRevenue: moduleIdentities.sales, netProfit: moduleIdentities.sales,
  averageTicket: moduleIdentities.sales, salesConversion: moduleIdentities.sales, activeClients: moduleIdentities.sales,
  newClients: moduleIdentities.sales, clientRetention: moduleIdentities.sales, customerLifetimeValue: moduleIdentities.sales,
  dailySales: moduleIdentities.pointOfSale, transactionsCount: moduleIdentities.pointOfSale,
  activeEmployees: moduleIdentities.humanResources, newHires: moduleIdentities.humanResources,
  employeeTurnover: moduleIdentities.humanResources, absenteeismRate: moduleIdentities.humanResources, payrollCost: moduleIdentities.humanResources,
  pendingTasks: moduleIdentities.processes, completedTasks: moduleIdentities.processes,
  taskCompletionRate: moduleIdentities.processes, overdueTasks: moduleIdentities.processes,
  inventoryValue: moduleIdentities.inventory, stockLevel: moduleIdentities.inventory,
  lowStockItems: moduleIdentities.inventory, inventoryTurnover: moduleIdentities.inventory,
  pendingMaintenance: moduleIdentities.maintenance, maintenanceCost: moduleIdentities.maintenance, equipmentUptime: moduleIdentities.maintenance,
  invoicesIssued: moduleIdentities.invoicing, pendingInvoices: moduleIdentities.invoicing, collectionRate: moduleIdentities.invoicing,
  employeeSatisfaction: moduleIdentities.workClimate, engagementScore: moduleIdentities.workClimate,
  dailyExchangeRate: moduleIdentities.system,
};

export function KPICard({ presentation = 'compact', moduleLabel, kpiId, title, value, change, isPositive, tone, trend }: KPICardProps) {
  const resolvedTone = tone ?? (isPositive ? 'positive' : 'negative');
  const badgeClasses = resolvedTone === 'neutral'
    ? 'border-[var(--indice-brand-primary)]/30 bg-[var(--indice-brand-soft)] text-[var(--indice-brand-text)] dark:border-[var(--indice-brand-primary)]/35 dark:bg-[var(--indice-brand-primary)]/10 dark:text-[var(--indice-brand-text-dark)]'
    : resolvedTone === 'positive'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
      : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';
  const resolvedTrend = trend ?? (isPositive ? 'up' : 'down');
  const TrendIcon = resolvedTrend === 'up' ? TrendingUp : resolvedTrend === 'down' ? TrendingDown : ArrowRightLeft;
  const identity = kpiId ? kpiModuleIdentity[kpiId] ?? moduleIdentities.system : moduleIdentities.system;

  if (presentation === 'portrait') {
    const accent = identity.moduleId === 'sales' || identity.moduleId === 'point-of-sale' || identity.moduleId === 'inventory'
      ? { wash: 'from-[#FFF0EE] dark:from-[#FF6B5E]/10', orb: 'bg-[#FF6B5E]/[0.07]', label: 'text-[#B63B32] dark:text-[#FF9B91]' }
      : identity.moduleId === 'expenses' || identity.moduleId === 'petty-cash' || identity.moduleId === 'receivables' || identity.moduleId === 'human-resources'
        ? { wash: 'from-[#ECFAF4] dark:from-emerald-500/10', orb: 'bg-emerald-500/[0.06]', label: 'text-emerald-700 dark:text-emerald-300' }
        : identity.moduleId === 'processes-tasks'
          ? { wash: 'from-[#FFF9E7] dark:from-amber-400/10', orb: 'bg-amber-400/[0.08]', label: 'text-amber-700 dark:text-amber-300' }
          : { wash: 'from-[#EFF5FF] dark:from-blue-500/10', orb: 'bg-blue-500/[0.06]', label: 'text-blue-700 dark:text-blue-300' };
    const statusClasses = resolvedTone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-300'
      : resolvedTone === 'negative' ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300';
    const valueSize = String(value).length > 12 ? 'text-xl' : String(value).length > 8 ? 'text-2xl' : 'text-[34px]';

    return (
      <Card className="group relative isolate aspect-[11/12] w-full snap-center gap-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.045)] transition-shadow hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)] dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-none">
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-1 top-1 -z-10 h-[62%] rounded-t-[16px] bg-gradient-to-b to-transparent ${accent.wash}`} />
        <div aria-hidden="true" className={`pointer-events-none absolute -right-5 -top-5 -z-10 size-24 rounded-full ${accent.orb}`} />
        <div className="relative flex h-11 shrink-0 items-end pb-2">
          {moduleLabel && <p className={`max-w-[calc(100%-52px)] text-[10px] font-medium uppercase leading-3 tracking-wide ${accent.label}`}>{moduleLabel}</p>}
          <div aria-hidden="true" className="absolute -right-1 -top-1 flex size-12 items-center justify-center text-5xl transition-transform motion-safe:group-hover:-translate-y-0.5">
            {identity.moduleId ? <OriginalModuleEmoji id={identity.moduleId} className="size-12" /> : identity.emoji}
          </div>
        </div>
        <p title={title} className="line-clamp-2 min-h-9 shrink-0 text-sm font-medium leading-[18px] text-slate-900 dark:text-slate-100">{title}</p>
        <div className="flex min-h-11 min-w-0 flex-1 items-end pb-2">
          <p title={String(value)} className={`${valueSize} min-w-0 break-words font-semibold leading-none tracking-tight tabular-nums text-slate-950 dark:text-white`}>{value}</p>
        </div>
        <div className="flex min-h-10 shrink-0 items-start gap-2 border-t border-slate-200/80 pt-2 dark:border-slate-700/80">
          <TrendIcon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${statusClasses}`} />
          <p className="text-xs leading-4 text-slate-600 dark:text-slate-300 sm:text-[11px] sm:leading-[14px]">{change}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group min-h-[118px] w-full snap-center rounded-xl border border-[#2563EB]/30 bg-white/90 p-3.5 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/50 hover:bg-white hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] dark:border-[#2563EB]/35 dark:bg-slate-950/80 dark:shadow-[0_18px_42px_rgba(2,6,23,0.35)] dark:hover:border-[#2563EB]/55 dark:hover:bg-slate-900 sm:min-h-[108px]">
      <div className="flex h-full flex-col items-center justify-center gap-2 ">
        <div className="flex max-w-full items-center justify-center gap-2 ">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-lg shadow-inner ${identity.iconClasses}`}>
            {identity.moduleId ? (
              <OriginalModuleEmoji id={identity.moduleId} className="size-7" />
            ) : (
              <span aria-hidden="true">{identity.emoji}</span>
            )}
          </div>
          <p className="min-w-0 text-left text-xs font-semibold leading-snug text-slate-500 dark:text-slate-400 sm:truncate sm:text-center ">
            {title}
          </p>
        </div>

        <div className="min-w-0 max-w-full">
          <div className="mt-2 space-y-2 ">
            <p className="min-w-0 truncate text-2xl font-semibold leading-none text-slate-950 dark:text-white ">
              {value}
            </p>
            <div className={`mx-auto inline-flex max-w-full items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5 ${badgeClasses}`}>
              <TrendIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2 text-center">{change}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
