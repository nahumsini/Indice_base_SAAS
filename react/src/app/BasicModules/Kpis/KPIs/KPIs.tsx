import { ArrowDownRight, ArrowUpRight, Database, Gauge, Target, TrendingUp } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import {
  KPI_ACCENT,
  compositeKpis,
  executiveMetrics,
  scoreBarClasses,
  statusClasses,
  statusLabels,
  type KpiStatus,
} from '../kpisExecutiveData';

function StatusBadge({ status }: { status: KpiStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', statusClasses[status])}>
      {statusLabels[status]}
    </span>
  );
}

function ScoreBar({ score, status }: { score: number; status: KpiStatus }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={cn('h-full rounded-full', scoreBarClasses[status])} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function KPIs() {
  const averageScore = Math.round(
    compositeKpis.reduce((total, kpi) => total + kpi.score, 0) / compositeKpis.length,
  );
  const watchCount = compositeKpis.filter((kpi) => kpi.status !== 'healthy').length;
  const weakestComponent = compositeKpis
    .flatMap((kpi) => kpi.components.map((component) => ({ ...component, kpi: kpi.title })))
    .sort((a, b) => a.score - b.score)[0];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {executiveMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <Icon className="h-4 w-4" />
                </span>
                <StatusBadge status={metric.status} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {metric.title}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">
                {metric.value}
              </p>
              <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-600 dark:text-slate-300">
                {metric.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Database className="h-3.5 w-3.5" />
                {metric.source}
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                <Gauge className="h-4 w-4" />
                Lectura ejecutiva
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-slate-950 dark:text-white">
                Score compuesto {averageScore}/100 con {watchCount} frentes en atencion
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                El modulo combina salud financiera, operativa y comercial para que direccion vea
                prioridad, origen y accion sin depender de metricas aisladas.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Promedio</p>
                <p className="text-xl font-bold text-slate-950 dark:text-white">{averageScore}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Atencion</p>
                <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{watchCount}</p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/30">
                <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Punto bajo</p>
                <p className="text-xl font-bold text-rose-800 dark:text-rose-200">{weakestComponent.score}</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Target className="h-4 w-4" />
            Prioridad del dia
          </div>
          <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{weakestComponent.label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {weakestComponent.kpi} cae por {weakestComponent.source}. Abrir origen: {weakestComponent.drilldown}.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-9 rounded-lg border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
          >
            Ver origen
          </Button>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {compositeKpis.map((kpi) => {
          const trendIsPositive = kpi.trend >= 0;

          return (
            <article
              key={kpi.id}
              className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      KPI compuesto
                    </p>
                    <h3 className="mt-1 text-lg font-bold tracking-normal text-slate-950 dark:text-white">
                      {kpi.title}
                    </h3>
                  </div>
                  <StatusBadge status={kpi.status} />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold text-slate-950 dark:text-white">{kpi.score}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Meta {kpi.target}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                      trendIsPositive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
                    )}
                  >
                    {trendIsPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {Math.abs(kpi.trend)} pts
                  </span>
                </div>
                <div className="mt-3">
                  <ScoreBar score={kpi.score} status={kpi.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{kpi.insight}</p>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Formula
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">{kpi.formula}</p>
                </div>

                <div className="space-y-3">
                  {kpi.components.map((component) => (
                    <div key={component.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{component.label}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{component.source}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-950 dark:text-white">{component.score}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{component.weight}%</p>
                        </div>
                      </div>
                      <ScoreBar score={component.score} status={component.score >= 85 ? 'healthy' : component.score >= 70 ? 'watch' : 'critical'} />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Responsable: {kpi.owner}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-normal text-slate-950 dark:text-white">
              Biblioteca de metricas base
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Indicadores simples que alimentan los compuestos y sus decisiones.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-fit rounded-lg border-slate-300 text-sm font-semibold dark:border-slate-700"
          >
            Configurar pesos
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Indicador</th>
                <th className="px-5 py-3 font-semibold">Valor</th>
                <th className="px-5 py-3 font-semibold">Origen</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Lectura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {executiveMetrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <tr key={metric.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: KPI_ACCENT }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">{metric.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-950 dark:text-white">{metric.value}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{metric.source}</td>
                    <td className="px-5 py-4"><StatusBadge status={metric.status} /></td>
                    <td className="max-w-md px-5 py-4 text-slate-600 dark:text-slate-300">{metric.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
