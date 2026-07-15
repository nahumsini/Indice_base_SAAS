import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Database,
  Filter,
  Gauge,
  Layers3,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Variable,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import {
  KPI_ACCENT,
  basicKpiModules,
  complementaryKpiModules,
  compositeKpis,
  executiveMetrics,
  kpiBuilderTemplates,
  kpiVariableLibrary,
  scoreBarClasses,
  statusClasses,
  statusLabels,
  type KpiSourceModule,
  type KpiStatus,
  type KpiVariable,
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
      <div className={cn('h-full rounded-full', scoreBarClasses[status])} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
    </div>
  );
}

function getStatusFromScore(score: number): KpiStatus {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'watch';
  return 'critical';
}

function getVariableWeight(variableId: string, selectedTemplateId: string, selectedCount: number) {
  const template = kpiBuilderTemplates.find((item) => item.id === selectedTemplateId);
  const configuredWeight = template?.components.find((component) => component.variableId === variableId)?.weight;

  if (configuredWeight) return configuredWeight;
  if (selectedCount === 0) return 0;

  return Math.round(100 / selectedCount);
}

function ModuleCard({
  module,
  isSelected,
  onSelect,
}: {
  module: KpiSourceModule;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = module.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex min-h-[188px] flex-col rounded-lg border bg-white p-4 text-left shadow-sm transition-colors dark:bg-slate-900',
        isSelected
          ? 'border-blue-700 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-950'
          : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: module.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <StatusBadge status={module.status} />
      </div>
      <div className="mt-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {module.domain}
        </p>
        <h3 className="mt-1 text-base font-bold tracking-normal text-slate-950 dark:text-white">{module.name}</h3>
        <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{module.summary}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-bold text-slate-950 dark:text-white">{module.availableVariables}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Variables</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-bold text-slate-950 dark:text-white">{module.activeKpis}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">KPIs</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
          <p className={cn('text-sm font-bold', module.alerts > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-950 dark:text-white')}>
            {module.alerts}
          </p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Alertas</p>
        </div>
      </div>
    </button>
  );
}

function VariableRow({
  variable,
  isSelected,
  onToggle,
}: {
  variable: KpiVariable;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const module = basicKpiModules.concat(complementaryKpiModules).find((item) => item.id === variable.moduleId);
  const ModuleIcon = module?.icon ?? Database;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'grid w-full gap-3 rounded-lg border p-3 text-left transition-colors lg:grid-cols-[minmax(220px,1fr)_120px_120px_96px]',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20',
      )}
    >
      <div className="flex min-w-0 gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: module?.color ?? KPI_ACCENT }}
        >
          <ModuleIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{variable.name}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {module?.name ?? variable.moduleId} - {variable.category}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{variable.description}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Valor</p>
        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{variable.valueLabel}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Frecuencia</p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{variable.cadence}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{variable.freshness}</p>
      </div>
      <div className="flex items-start justify-between gap-2 lg:justify-end">
        <StatusBadge status={variable.status} />
      </div>
    </button>
  );
}

export default function KPIs() {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(kpiBuilderTemplates[0].id);
  const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>(
    kpiBuilderTemplates[0].components.map((component) => component.variableId),
  );
  const [scenarioImpact, setScenarioImpact] = useState(0);

  const averageScore = Math.round(
    compositeKpis.reduce((total, kpi) => total + kpi.score, 0) / compositeKpis.length,
  );
  const watchCount = compositeKpis.filter((kpi) => kpi.status !== 'healthy').length;
  const weakestComponent = compositeKpis
    .flatMap((kpi) => kpi.components.map((component) => ({ ...component, kpi: kpi.title })))
    .sort((a, b) => a.score - b.score)[0];

  const allModules = basicKpiModules.concat(complementaryKpiModules);
  const selectedTemplate = kpiBuilderTemplates.find((template) => template.id === selectedTemplateId) ?? kpiBuilderTemplates[0];

  const filteredVariables = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return kpiVariableLibrary.filter((variable) => {
      const module = allModules.find((item) => item.id === variable.moduleId);
      const matchesModule = selectedModuleId === 'all' || variable.moduleId === selectedModuleId;
      const matchesSearch =
        !normalizedSearch ||
        variable.name.toLowerCase().includes(normalizedSearch) ||
        variable.category.toLowerCase().includes(normalizedSearch) ||
        variable.formula.toLowerCase().includes(normalizedSearch) ||
        module?.name.toLowerCase().includes(normalizedSearch);

      return matchesModule && matchesSearch;
    });
  }, [allModules, searchTerm, selectedModuleId]);

  const selectedVariables = selectedVariableIds
    .map((variableId) => kpiVariableLibrary.find((variable) => variable.id === variableId))
    .filter(Boolean) as KpiVariable[];

  const totalWeight = selectedVariableIds.reduce(
    (total, variableId) => total + getVariableWeight(variableId, selectedTemplateId, selectedVariableIds.length),
    0,
  );
  const builderScore = selectedVariables.length
    ? Math.round(
      selectedVariables.reduce((total, variable) => {
        const weight = getVariableWeight(variable.id, selectedTemplateId, selectedVariableIds.length);
        return total + variable.sampleValue * weight;
      }, 0) / Math.max(1, totalWeight),
    )
    : 0;
  const simulatedScore = Math.max(0, Math.min(100, builderScore + scenarioImpact));
  const builderStatus = getStatusFromScore(simulatedScore);
  const connectedModuleCount = new Set(selectedVariables.map((variable) => variable.moduleId)).size;

  const handleTemplateSelect = (templateId: string) => {
    const template = kpiBuilderTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setSelectedVariableIds(template.components.map((component) => component.variableId));
    setScenarioImpact(0);
  };

  const handleVariableToggle = (variableId: string) => {
    setSelectedVariableIds((current) => (
      current.includes(variableId)
        ? current.filter((id) => id !== variableId)
        : [...current, variableId]
    ));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 shadow-sm dark:border-blue-900 dark:bg-slate-950 dark:text-blue-200">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Panel ejecutivo
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950 dark:text-white">
                Centro de composicion KPI
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Cruza variables de los ocho modulos base y complementarios para construir indicadores compuestos.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-9 w-fit rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo KPI
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {executiveMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
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
        <div className="rounded-lg border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                <Gauge className="h-4 w-4" />
                Lectura ejecutiva
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-slate-950 dark:text-white">
                Score compuesto {averageScore}/100 con {watchCount} frentes en atencion
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                El panel consolida modulos base y complementarios para crear KPIs compuestos con origen,
                ponderacion, umbrales y lectura accionable.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Modulos</p>
                <p className="text-xl font-bold text-slate-950 dark:text-white">{basicKpiModules.length}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Variables</p>
                <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{kpiVariableLibrary.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Plantillas</p>
                <p className="text-xl font-bold text-slate-950 dark:text-white">{kpiBuilderTemplates.length}</p>
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
            {weakestComponent.kpi} cae por {weakestComponent.source}. Origen: {weakestComponent.drilldown}.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-9 rounded-lg border-blue-200 text-blue-800 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-200 dark:hover:bg-blue-950/40"
          >
            Ver origen
          </Button>
        </aside>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
              <Layers3 className="h-4 w-4" />
              Mapa de modulos conectados
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Variables disponibles por modulo para armar KPIs compuestos desde una sola vista.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedModuleId('all')}
            className="h-9 w-fit rounded-lg border-slate-300 text-sm font-semibold dark:border-slate-700"
          >
            <Filter className="mr-2 h-4 w-4" />
            Ver todos
          </Button>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          {basicKpiModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              isSelected={selectedModuleId === module.id}
              onSelect={() => setSelectedModuleId(module.id)}
            />
          ))}
        </div>
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Modulos complementarios
          </p>
          <div className="flex flex-wrap gap-2">
            {complementaryKpiModules.map((module) => {
              const Icon = module.icon;
              const isSelected = selectedModuleId === module.id;

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelectedModuleId(module.id)}
                  className={cn(
                    'flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors',
                    isSelected
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40',
                  )}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.18)' : module.color }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {module.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_440px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                  <Variable className="h-4 w-4" />
                  Biblioteca de variables
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Variables normalizadas por modulo, con formula, estado y frecuencia.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <label className="relative block min-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar variable, modulo o formula"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                  />
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(event) => setSelectedModuleId(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950"
                >
                  <option value="all">Todos los modulos</option>
                  {allModules.map((module) => (
                    <option key={module.id} value={module.id}>{module.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-5">
            {filteredVariables.map((variable) => (
              <VariableRow
                key={variable.id}
                variable={variable}
                isSelected={selectedVariableIds.includes(variable.id)}
                onToggle={() => handleVariableToggle(variable.id)}
              />
            ))}
            {filteredVariables.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-white">No hay variables con el filtro actual.</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ajusta busqueda o modulo para ampliar el alcance.</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                <SlidersHorizontal className="h-4 w-4" />
                Constructor de KPI compuesto
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {selectedTemplate.description}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-2">
                {kpiBuilderTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template.id)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors',
                        isSelected
                          ? 'border-blue-700 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 dark:hover:bg-blue-950/20',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950 dark:text-white">{template.title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.category}</p>
                        </div>
                        <StatusBadge status={template.status} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      Score simulado
                    </p>
                    <p className="mt-1 text-3xl font-bold text-blue-950 dark:text-blue-50">{simulatedScore}</p>
                  </div>
                  <StatusBadge status={builderStatus} />
                </div>
                <div className="mt-3">
                  <ScoreBar score={simulatedScore} status={builderStatus} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-blue-200 bg-white px-2 py-2 dark:border-blue-900 dark:bg-slate-950">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{selectedVariables.length}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Variables</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-white px-2 py-2 dark:border-blue-900 dark:bg-slate-950">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{connectedModuleCount}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Modulos</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-white px-2 py-2 dark:border-blue-900 dark:bg-slate-950">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{totalWeight}%</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Peso</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Simulador de impacto
                  <span className={cn('rounded-full px-2 py-1 text-xs', scenarioImpact >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200')}>
                    {scenarioImpact > 0 ? '+' : ''}{scenarioImpact} pts
                  </span>
                </label>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  value={scenarioImpact}
                  onChange={(event) => setScenarioImpact(Number(event.target.value))}
                  className="mt-3 w-full accent-blue-700"
                />
              </div>

              <div className="space-y-3">
                {selectedVariables.map((variable) => {
                  const module = allModules.find((item) => item.id === variable.moduleId);
                  const weight = getVariableWeight(variable.id, selectedTemplateId, selectedVariableIds.length);

                  return (
                    <div key={variable.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{variable.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module?.name} - {variable.category}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                          {weight}%
                        </span>
                      </div>
                      <div className="mt-3">
                        <ScoreBar score={variable.sampleValue} status={variable.status} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Formula preview</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {selectedVariables.map((variable) => `${variable.name} ${getVariableWeight(variable.id, selectedTemplateId, selectedVariableIds.length)}%`).join(' + ') || 'Sin variables seleccionadas'}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg border-slate-300 text-sm font-semibold dark:border-slate-700"
                >
                  Duplicar plantilla
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear KPI
                </Button>
              </div>
            </div>
          </section>
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
                      KPI compuesto activo
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
                      <ScoreBar score={component.score} status={getStatusFromScore(component.score)} />
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
    </div>
  );
}
