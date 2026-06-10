import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { formatCurrency } from '../utils/expenses.utils';
import { formatCompactCurrency, formatPercent } from './kpiUtils';
import {
  AlertItem,
  BreakdownRow,
  EmptyState,
  KPIStatCard,
  PanelCard,
  ProjectionMetric,
} from '../components/kpis/KpiPanelParts';
import { useGastosKPI } from './useGastosKPI';

interface GastosKPIPageProps {
  expenses: Expense[];
  providers: ProviderRecord[];
}

const chartColors = ['#147514', '#f59e0b', '#2563eb', '#dc2626', '#7c3aed', '#0891b2'];

export default function GastosKPIPage({ expenses, providers }: GastosKPIPageProps) {
  const {
    alerts,
    categorySpend,
    monthlyComparison,
    projection,
    providerSpend,
    summary,
  } = useGastosKPI({ expenses, providers });
  const isOverBudget = summary.budgetVariance > 0;

  return (
    <div className="space-y-6">
      <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-2xl shadow-sm dark:shadow-black/30 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-4xl">📊</span>
            <div>
              <h2 className="text-2xl font-bold text-white">KPIs de Gastos</h2>
              <p className="text-sm text-white/90 mt-1">
                Responde si estás gastando bien comparando gasto real, presupuesto y proveedores.
              </p>
            </div>
          </div>

          <span className="inline-flex h-11 w-fit items-center rounded-xl border border-white/20 bg-white/15 px-4 text-sm font-semibold text-white dark:bg-white/10">
            {alerts.length} alertas activas
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KPIStatCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="Total Gastado"
          helper="Mes actual"
          value={formatCurrency(summary.currentSpent)}
          tone="green"
        />
        <KPIStatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Total Presupuestado"
          helper="Mes actual"
          value={formatCurrency(summary.currentBudgeted)}
          tone="blue"
        />
        <KPIStatCard
          icon={isOverBudget ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          label="Diferencia"
          helper={formatPercent(summary.budgetDeviationPercent)}
          value={formatCurrency(summary.budgetVariance)}
          tone={isOverBudget ? 'red' : 'green'}
        />
        <KPIStatCard
          icon={<WalletCards className="h-5 w-5" />}
          label="Total Pagado"
          helper="Liquidado"
          value={formatCurrency(summary.totalPaid)}
          tone="green"
        />
        <KPIStatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Total Pendiente"
          helper="Por pagar"
          value={formatCurrency(summary.totalPending)}
          tone="amber"
        />
        <KPIStatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Total Vencido"
          helper={`${summary.overdueCount} registros`}
          value={formatCurrency(summary.totalOverdue)}
          tone="red"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PanelCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Presupuesto vs real"
            subtitle="Comparativo mensual con desviación incluida."
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} stroke="#64748b" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="budget" name="Presupuesto" fill="#93c5fd" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="real" name="Gasto real" fill="#147514" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>
        </div>

        <PanelCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Alertas"
          subtitle="Prioridades accionables para controlar el gasto."
        >
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <EmptyState message="No hay alertas críticas para el periodo actual." />
            ) : (
              alerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </PanelCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <PanelCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Gasto por categoría"
          subtitle="Agrupado por cuenta contable."
        >
          <div className="space-y-4">
            {categorySpend.length === 0 ? (
              <EmptyState message="Sin gasto real para categorizar este mes." />
            ) : (
              categorySpend.slice(0, 6).map(item => (
                <BreakdownRow
                  key={item.account}
                  label={item.account}
                  percentage={item.percentage}
                  value={item.total}
                />
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard
          icon={<Building2 className="h-5 w-5" />}
          title="Gasto por proveedor"
          subtitle="Top 5 por concentración de gasto."
        >
          <div className="space-y-4">
            {providerSpend.length === 0 ? (
              <EmptyState message="Sin gasto real asociado a proveedores este mes." />
            ) : (
              providerSpend.map(provider => (
                <BreakdownRow
                  key={provider.providerId ?? provider.providerName}
                  label={provider.providerName}
                  meta={provider.providerStatus === 'inactive' ? 'Inactivo' : undefined}
                  percentage={provider.percentage}
                  value={provider.total}
                />
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Proyección"
          subtitle="Flujo estimado usando presupuestos futuros."
        >
          <div className="space-y-4">
            <ProjectionMetric
              label="Gasto esperado próximo mes"
              value={formatCurrency(projection.expectedNextMonth)}
              helper={`${projection.nextMonthBudgetCount} presupuestos futuros`}
            />
            <ProjectionMetric
              label="Pendiente que se arrastra"
              value={formatCurrency(projection.pendingCarryOver)}
              helper="Gasto real pendiente del mes actual"
            />
            <div className="rounded-2xl border border-[#147514]/20 bg-[#147514]/10 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#147514] dark:text-emerald-300">
                Flujo estimado
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(projection.estimatedCashFlow)}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Presupuesto futuro + pendientes actuales.
              </p>
            </div>
          </div>
        </PanelCard>
      </section>

      <PanelCard
        icon={<BarChart3 className="h-5 w-5" />}
        title="Distribución por categoría"
        subtitle="Vista rápida del peso relativo de las cuentas contables."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72">
            {categorySpend.length === 0 ? (
              <EmptyState message="No hay datos suficientes para graficar categorías." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySpend}
                    dataKey="total"
                    innerRadius={64}
                    outerRadius={104}
                    nameKey="account"
                    paddingAngle={3}
                  >
                    {categorySpend.map((entry, index) => (
                      <Cell key={entry.account} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-3">
            {categorySpend.slice(0, 6).map((item, index) => (
              <div
                key={item.account}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/60"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {item.account}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
