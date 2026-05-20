import { Card } from './ui/card';
import {
  BarChart3,
  ClipboardCheck,
  DollarSign,
  FileText,
  Package,
  Receipt,
  ShoppingCart,
  Smile,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface KPICardProps {
  kpiId?: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
}

const kpiIcons: Record<string, LucideIcon> = {
  monthlyExpenses: Receipt,
  expensesByCategory: Receipt,
  pendingExpenses: Receipt,
  pettyCashBalance: Wallet,
  pettyCashExpenses: Wallet,
  weeklyRevenue: DollarSign,
  monthlyRevenue: DollarSign,
  netProfit: BarChart3,
  averageTicket: Receipt,
  salesConversion: BarChart3,
  dailySales: ShoppingCart,
  transactionsCount: ShoppingCart,
  activeEmployees: UserCheck,
  newHires: UserCheck,
  employeeTurnover: Users,
  absenteeismRate: Users,
  payrollCost: Wallet,
  activeClients: Users,
  newClients: Users,
  clientRetention: Users,
  customerLifetimeValue: DollarSign,
  pendingTasks: ClipboardCheck,
  completedTasks: ClipboardCheck,
  taskCompletionRate: ClipboardCheck,
  overdueTasks: ClipboardCheck,
  inventoryValue: Package,
  stockLevel: Package,
  lowStockItems: Package,
  inventoryTurnover: Package,
  pendingMaintenance: Wrench,
  maintenanceCost: Wrench,
  equipmentUptime: Wrench,
  invoicesIssued: FileText,
  pendingInvoices: FileText,
  collectionRate: FileText,
  employeeSatisfaction: Smile,
  engagementScore: Smile,
};

export function KPICard({ kpiId, title, value, change, isPositive }: KPICardProps) {
  const trendClasses = isPositive
    ? {
        icon: TrendingUp,
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
      }
    : {
        icon: TrendingDown,
        badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
      };
  const TrendIcon = trendClasses.icon;
  const KpiIcon = kpiId ? kpiIcons[kpiId] ?? BarChart3 : BarChart3;

  return (
    <Card className="group min-h-[118px] w-full snap-center rounded-[8px] border border-slate-200/80 bg-white/90 p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] dark:border-slate-700/70 dark:bg-slate-950/80 dark:shadow-[0_18px_42px_rgba(2,6,23,0.35)] dark:hover:border-slate-600 dark:hover:bg-slate-900">
      <div className="flex h-full items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-slate-200/80 bg-slate-50 text-slate-600 shadow-inner dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300">
          <KpiIcon className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-2 space-y-2">
            <p className="min-w-0 truncate text-2xl font-semibold leading-none text-slate-950 dark:text-white">
              {value}
            </p>
            <div className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5 ${trendClasses.badge}`}>
              <TrendIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{change}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
