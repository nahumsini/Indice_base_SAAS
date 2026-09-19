import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
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
import { IndiceTitleBar } from '../../../components/frontend-os';
import { cn } from '../../../components/ui/utils';
import { automatedReportsApi, type ReportRule, type ReportRun } from './automatedReportsApi';
import { ReportRuleModal } from './ReportRuleModal';
import { ReportRunModal } from './ReportRunModal';
import { ApiClientError } from '../../../lib/apiClient';

type AutomationRuleView = {
  id: string;
  title: string;
  description: string;
  status: ReportRule['status'];
  audience: string;
  cadence: string;
  trigger: string;
  nextRun: string;
};

const automationStatusClasses: Record<ReportRule['status'], string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  draft: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  paused: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
};

const automationStatusLabels: Record<ReportRule['status'], string> = {
  ready: 'Lista',
  draft: 'Borrador',
  paused: 'Pausada',
};

const statusIcons: Record<ReportRule['status'], LucideIcon> = {
  draft: Clock3,
  paused: PauseCircle,
  ready: CheckCircle2,
};

const statusOptions: Array<{ id: 'all' | ReportRule['status']; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'ready', label: 'Listas' },
  { id: 'draft', label: 'Borradores' },
  { id: 'paused', label: 'Pausadas' },
];

const cadenceOptions = ['Todas', 'Manual', 'Diaria', 'Semanal', 'Mensual'];

function AutomationStatusBadge({ status }: { status: ReportRule['status'] }) {
  const Icon = statusIcons[status];

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium', automationStatusClasses[status])}>
      <Icon className="h-3.5 w-3.5" />
      {automationStatusLabels[status]}
    </span>
  );
}

function inputClassName(extra?: string) {
  return cn(
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950',
    extra,
  );
}

function exportAutomationCsv(rules: AutomationRuleView[]) {
  const rows = [
    ['Regla', 'Estado', 'Disparador', 'Audiencia', 'Cadencia', 'Próxima ejecución', 'Descripción'],
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
  const [statusFilter, setStatusFilter] = useState<'all' | ReportRule['status']>('all');
  const [cadenceFilter, setCadenceFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  const [savedRules, setSavedRules] = useState<ReportRule[]>([]);
  const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState(''); const [editor, setEditor] = useState<ReportRule | 'new' | null>(null);
  const [run, setRun] = useState<ReportRun | null>(null);
  const load = useCallback(async () => { setLoading(true); try { setSavedRules((await automatedReportsApi.list()).items); setError(''); } catch (error) { setError(error instanceof ApiClientError ? error.message : 'No se pudieron cargar las reglas.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const automationRules = useMemo(() => savedRules.map(rule => ({ id: String(rule.id), title: rule.title, description: rule.description,
    status: rule.status, audience: 'Mi usuario y alcance autorizado', cadence: ({ DAILY: 'Diaria', WEEKLY: 'Semanal', MONTHLY: 'Mensual', MANUAL: 'Manual' })[rule.cadence],
    trigger: rule.reportType === 'ACCOUNTING' ? 'Estados financieros' : 'KPIs y matrices', nextRun: rule.lastErrorCode ? 'Requiere revisión de fuentes o permisos' : rule.nextRun ? new Date(rule.nextRun).toLocaleString() : 'Sin programación activa' })), [savedRules]);
  const generate = async (id: number, latest = false) => { setBusyId(id); setError(''); try { const rule = savedRules.find(item => item.id === id); const result = latest && rule?.latestRunId ? await automatedReportsApi.run(id, rule.latestRunId) : await automatedReportsApi.generate(id, crypto.randomUUID()); setRun(result); await load(); } catch (error) { setError(error instanceof ApiClientError ? error.message : 'No se pudo generar el informe.'); } finally { setBusyId(null); } };

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
  }, [automationRules, cadenceFilter, search, statusFilter]);

  const resetFilters = () => {
    setStatusFilter('all');
    setCadenceFilter('Todas');
    setSearch('');
  };
  const titleActions = (
    <>
      <Button type="button" variant="outline" onClick={() => exportAutomationCsv(filteredRules)} className="h-11 rounded-xl border-blue-300 bg-white text-sm font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950/40"><Download className="mr-2 h-4 w-4" />Exportar</Button>
      <Button type="button" onClick={() => setEditor('new')} className="h-11 rounded-xl bg-blue-700 text-sm font-medium text-white hover:bg-blue-800"><Settings2 className="mr-2 h-4 w-4" />Nueva regla</Button>
    </>
  );

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon="⚙️"
        title="Motor de reportes programados"
        subtitle="Genera y conserva informes de KPIs, matrices y estados financieros con tu alcance autorizado."
        actions={titleActions}
      />

      {error && <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}<Button variant="outline" className="ml-3" onClick={() => void load()}>Reintentar</Button></section>}
      {loading && <p role="status">Cargando reglas…</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white">
              <SlidersHorizontal className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              Filtros de automatización
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Revisa qué reglas están listas, pausadas o en diseño antes de activar la programación.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="h-10 w-fit rounded-xl border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">
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
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Estado
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ReportRule['status'])}
              className={inputClassName('mt-1')}
            >
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
            <p className="text-xs font-medium opacity-75">{label}</p>
            <p className="mt-2 text-2xl font-medium">{value}</p>
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
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Regla automatizada
                  </p>
                  <h3 className="mt-1 text-lg font-medium tracking-normal text-slate-950 dark:text-white">
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
              <RuleDetail icon={Clock3} label="Próxima ejecución" value={rule.nextRun} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-300 text-sm font-medium dark:border-slate-700"
                disabled={busyId !== null}
                onClick={() => void generate(Number(rule.id))}
              >
                Generar ahora
              </Button>
              {savedRules.find(item => String(item.id) === rule.id)?.latestRunId ? <Button variant="outline" disabled={busyId !== null} onClick={() => void generate(Number(rule.id), true)}>Último informe</Button> : null}
              <Button
                type="button"
                className="h-9 rounded-xl bg-blue-700 text-sm font-medium text-white hover:bg-blue-800"
                disabled={busyId !== null}
                onClick={() => setEditor(savedRules.find(item => String(item.id) === rule.id) ?? 'new')}
              >
                Editar regla
              </Button>
            </div>
          </article>
        ))}
      </section>

      {!loading && !error && filteredRules.length === 0 && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-950 dark:text-white">No hay reglas con estos filtros.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Limpia la búsqueda o cambia el estado para ver más automatizaciones.</p>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h2 className="text-lg font-medium tracking-normal text-slate-950 dark:text-white">
              Flujo de automatización
            </h2>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-4">
            {[
              ['Captura', 'KPIs ejecutivos o estados contables'],
              ['Calcula', 'Instantánea validada por alcance y moneda'],
              ['Programa', 'Ejecución manual, diaria, semanal o mensual'],
              ['Conserva', `${readyCount} reglas listas`],
            ].map(([title, description], index) => (
              <div key={title} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                  {index + 1}
                </span>
                <p className="mt-3 font-medium text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            <Archive className="h-4 w-4 text-blue-700 dark:text-blue-300" />
            Salida esperada
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cada ejecución conserva una instantánea inmutable del informe ejecutivo o contable con
            periodo, alcance y moneda autorizados.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <OutputRow label="Formato ejecutivo" value="Pantalla / instantánea JSON" />
            <OutputRow label="Audiencia" value="Mi usuario" />
            <OutputRow label="Canal" value="Panel de informes" />
            <OutputRow label="Programación" value="Reglas activas" />
          </div>
          <Button
            type="button"
            disabled={busyId !== null || savedRules.length === 0}
            onClick={() => savedRules[0] && void generate(savedRules[0].id)}
            className="mt-5 h-10 w-full rounded-xl bg-blue-700 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Send className="mr-2 h-4 w-4" />
            Generar primer informe
          </Button>
        </aside>
      </section>
      {editor !== null && <ReportRuleModal rule={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); void load(); }} />}
      {run && <ReportRunModal run={run} onClose={() => setRun(null)} />}
    </div>
  );
}

function RuleDetail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
