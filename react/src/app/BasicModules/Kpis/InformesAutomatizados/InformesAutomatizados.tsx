import { useMemo, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  MailCheck,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
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
import { LearningModeTitleBarBridge } from '../../../learningMode';

const statusIcons: Record<AutomationRule['status'], LucideIcon> = {
  draft: Clock3,
  paused: PauseCircle,
  ready: CheckCircle2,
};

const statusOptions: Array<{ id: 'all' | AutomationRule['status']; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'ready', label: 'Listas' },
  { id: 'draft', label: 'Borradores' },
  { id: 'paused', label: 'Pausadas' },
];

const cadenceOptions = ['Todas', 'Diaria', 'Semanal', 'Mensual', 'Evento'];

function AutomationStatusBadge({ status }: { status: AutomationRule['status'] }) {
  const Icon = statusIcons[status];

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', automationStatusClasses[status])}>
      <Icon className="h-3.5 w-3.5" />
      {automationStatusLabels[status]}
    </span>
  );
}

function inputClassName(extra?: string) {
  return cn(
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950',
    extra,
  );
}

function exportAutomationCsv(rules: AutomationRule[]) {
  const rows = [
    ['Regla', 'Estado', 'Disparador', 'Audiencia', 'Cadencia', 'Proxima ejecucion', 'Descripcion'],
    ...rules.map((rule) => [
      rule.title,
      automationStatusLabels[rule.status],
      rule.trigger,
      rule.audience,
      rule.cadence,
      rule.nextRun,
      rule.description,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'automatizaciones-kpis.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function InformesAutomatizados() {
  const [statusFilter, setStatusFilter] = useState<'all' | AutomationRule['status']>('all');
  const [cadenceFilter, setCadenceFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  const readyCount = automationRules.filter((rule) => rule.status === 'ready').length;
  const draftCount = automationRules.filter((rule) => rule.status === 'draft').length;
  const pausedCount = automationRules.filter((rule) => rule.status === 'paused').length;

  const filteredRules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return automationRules.filter((rule) => {
      const matchesStatus = statusFilter === 'all' || rule.status === statusFilter;
      const matchesCadence = cadenceFilter === 'Todas' || rule.cadence === cadenceFilter;
      const matchesSearch = !normalizedSearch
        || `${rule.title} ${rule.description} ${rule.trigger} ${rule.audience}`.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesCadence && matchesSearch;
    });
  }, [cadenceFilter, search, statusFilter]);

  const resetFilters = () => {
    setStatusFilter('all');
    setCadenceFilter('Todas');
    setSearch('');
  };
  const titleActions = (
    <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
      <Button type="button" variant="outline" onClick={() => exportAutomationCsv(filteredRules)} className="h-10 rounded-xl border-blue-300 bg-white text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950/40"><Download className="mr-2 h-4 w-4" />Exportar</Button>
      <Button type="button" className="h-10 rounded-xl bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"><Settings2 className="mr-2 h-4 w-4" />Nueva regla</Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <LearningModeTitleBarBridge actions={titleActions}>
      <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm dark:border-blue-900 dark:bg-slate-950 dark:text-blue-200">
              <BellRing className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Automatizaciones
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950 dark:text-white">
                Motor de reportes programados
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Programa envios ejecutivos con KPIs compuestos, estados financieros y alertas por excepcion.
              </p>
            </div>
          </div>
          {titleActions}
        </div>
      </section>
      </LearningModeTitleBarBridge>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
              <SlidersHorizontal className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              Filtros de automatizacion
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Revisa que reglas estan listas, pausadas o en diseno antes de activar envios.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="h-10 w-fit rounded-xl border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Buscar
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={inputClassName('pl-10')}
                placeholder="Regla, audiencia o disparador"
              />
            </span>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Estado
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AutomationRule['status'])}
              className={inputClassName('mt-1')}
            >
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Cadencia
            <select
              value={cadenceFilter}
              onChange={(event) => setCadenceFilter(event.target.value)}
              className={inputClassName('mt-1')}
            >
              {cadenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          ['Reglas configuradas', automationRules.length, 'border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-white'],
          ['Listas', readyCount, 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'],
          ['Borradores', draftCount, 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'],
          ['Pausadas', pausedCount, 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-white'],
        ].map(([label, value, className]) => (
          <div key={label} className={cn('rounded-xl border p-4 shadow-sm', className as string)}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredRules.map((rule) => (
          <article
            key={rule.id}
            className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
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
              <RuleDetail icon={PlayCircle} label="Disparador" value={rule.trigger} />
              <RuleDetail icon={Users} label="Audiencia" value={rule.audience} />
              <RuleDetail icon={CalendarClock} label="Cadencia" value={rule.cadence} />
              <RuleDetail icon={Clock3} label="Proxima ejecucion" value={rule.nextRun} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-300 text-sm font-semibold dark:border-slate-700"
              >
                Simular
              </Button>
              <Button
                type="button"
                className="h-9 rounded-xl bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Editar regla
              </Button>
            </div>
          </article>
        ))}
      </section>

      {filteredRules.length === 0 && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">No hay reglas con estos filtros.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Limpia la busqueda o cambia el estado para ver mas automatizaciones.</p>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
              <div key={title} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                  {index + 1}
                </span>
                <p className="mt-3 font-bold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <MailCheck className="h-4 w-4 text-blue-700 dark:text-blue-300" />
            Salida esperada
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cada ejecucion entrega score ejecutivo, variaciones relevantes, estados proforma incluidos,
            responsables y acciones sugeridas para direccion.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <OutputRow label="Formato ejecutivo" value="PDF / pantalla" />
            <OutputRow label="Audiencia" value="Direccion" />
            <OutputRow label="Canal" value="Correo / panel" />
            <OutputRow label="Programacion" value="Reglas activas" />
          </div>
          <Button
            type="button"
            className="mt-5 h-10 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Send className="mr-2 h-4 w-4" />
            Probar envio
          </Button>
        </aside>
      </section>
    </div>
  );
}

function RuleDetail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
