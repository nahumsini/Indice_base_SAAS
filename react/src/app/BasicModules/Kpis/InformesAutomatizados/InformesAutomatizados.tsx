import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MailCheck,
  PauseCircle,
  PlayCircle,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import {
  automationRules,
  automationStatusClasses,
  automationStatusLabels,
  compositeKpis,
  financialStatements,
  reportPackages,
  type AutomationRule,
} from '../kpisExecutiveData';

const statusIcons: Record<AutomationRule['status'], LucideIcon> = {
  draft: Clock3,
  paused: PauseCircle,
  ready: CheckCircle2,
};

function AutomationStatusBadge({ status }: { status: AutomationRule['status'] }) {
  const Icon = statusIcons[status];

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', automationStatusClasses[status])}>
      <Icon className="h-3.5 w-3.5" />
      {automationStatusLabels[status]}
    </span>
  );
}

export default function InformesAutomatizados() {
  const readyCount = automationRules.filter((rule) => rule.status === 'ready').length;
  const draftCount = automationRules.filter((rule) => rule.status === 'draft').length;
  const pausedCount = automationRules.filter((rule) => rule.status === 'paused').length;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Reglas configuradas
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{automationRules.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Listas
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{readyCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Borradores
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{draftCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pausadas
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{pausedCount}</p>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700 dark:border-amber-900 dark:bg-slate-950 dark:text-amber-200">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-normal text-slate-950 dark:text-white">
                Automatizaciones preparadas para cierre ejecutivo
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Las reglas ya conectan KPIs compuestos, estados financieros y paquetes de reporte de forma visual.
                La salida queda orientada a correo, PDF y panel directivo.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-fit rounded-lg border-amber-300 bg-white text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-200 dark:hover:bg-amber-950/40"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Configurar motor
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {automationRules.map((rule) => (
          <article
            key={rule.id}
            className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Regla automatizada
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-normal text-slate-950 dark:text-white">
                    {rule.title}
                  </h3>
                </div>
                <AutomationStatusBadge status={rule.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{rule.description}</p>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <PlayCircle className="h-3.5 w-3.5" />
                  Disparador
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{rule.trigger}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  Audiencia
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{rule.audience}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Cadencia
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{rule.cadence}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  Proxima ejecucion
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{rule.nextRun}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-slate-300 text-sm font-semibold dark:border-slate-700"
              >
                Simular
              </Button>
              <Button
                type="button"
                className="h-9 rounded-lg bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Editar regla
              </Button>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h2 className="text-lg font-bold tracking-normal text-slate-950 dark:text-white">
              Flujo de automatizacion
            </h2>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-4">
            {[
              ['Captura', `${financialStatements.length} estados proforma`],
              ['Calcula', `${compositeKpis.length} KPIs compuestos`],
              ['Empaqueta', `${reportPackages.length} paquetes ejecutivos`],
              ['Notifica', `${readyCount} reglas listas`],
            ].map(([title, description], index) => (
              <div key={title} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  {index + 1}
                </span>
                <p className="mt-3 font-bold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <MailCheck className="h-4 w-4" />
            Salida esperada
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cada ejecucion debe entregar score ejecutivo, variaciones relevantes, estados proforma incluidos,
            responsables y acciones sugeridas. El modulo queda preparado para email, PDF o panel directivo.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3">
              <span>Formato ejecutivo</span>
              <span className="font-semibold">PDF / pantalla</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Audiencia</span>
              <span className="font-semibold">Direccion</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Programacion</span>
              <span className="font-semibold">Reglas activas</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
