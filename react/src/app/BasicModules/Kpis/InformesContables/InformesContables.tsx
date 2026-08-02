import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer, RotateCcw, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import {
  financialStatements,
  formatCurrency,
  statusClasses,
  statusLabels,
  type FinancialStatement,
  type StatementId,
  type StatementLine,
} from '../kpisExecutiveData';
import { LearningModeTitleBarBridge } from '../../../learningMode';
import { useLanguage } from '../../../shared/context';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { printStandardKpiReport } from '../../shared/print/standardKpiPrintReport';

type PeriodPreset = {
  id: string;
  label: string;
  from: string;
  to: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

const today = new Date();
const currentMonthStart = startOfMonth(today);
const previousMonthStart = startOfMonth(addMonths(today, -1));
const currentQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
const currentSemesterStart = new Date(today.getFullYear(), today.getMonth() < 6 ? 0 : 6, 1);

const periodPresets: PeriodPreset[] = [
  { id: 'current-month', label: 'Mensual', from: isoDate(currentMonthStart), to: isoDate(endOfMonth(today)) },
  { id: 'previous-month', label: 'Mes anterior', from: isoDate(previousMonthStart), to: isoDate(endOfMonth(previousMonthStart)) },
  { id: 'bimonthly', label: 'Bimestral', from: isoDate(currentMonthStart), to: isoDate(endOfMonth(addMonths(currentMonthStart, 1))) },
  { id: 'quarter', label: 'Trimestral', from: isoDate(currentQuarterStart), to: isoDate(endOfMonth(addMonths(currentQuarterStart, 2))) },
  { id: 'semester', label: 'Semestral', from: isoDate(currentSemesterStart), to: isoDate(endOfMonth(addMonths(currentSemesterStart, 5))) },
  { id: 'year', label: 'Anual', from: isoDate(new Date(today.getFullYear(), 0, 1)), to: isoDate(new Date(today.getFullYear(), 11, 31)) },
  { id: 'custom', label: 'Personalizado', from: isoDate(currentMonthStart), to: isoDate(endOfMonth(today)) },
];

function StatusBadge({ status }: { status: FinancialStatement['status'] }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', statusClasses[status])}>
      {statusLabels[status]}
    </span>
  );
}

function formatCellValue(value: string | number) {
  if (typeof value === 'number') return formatCurrency(value);
  return value;
}

function lineClassName(line: StatementLine) {
  if (line.kind === 'total') {
    return 'bg-blue-50 font-medium text-blue-950 dark:bg-blue-950/30 dark:text-blue-100';
  }
  if (line.kind === 'subtotal') {
    return 'bg-slate-50 font-medium text-slate-950 dark:bg-slate-950 dark:text-white';
  }
  return 'text-slate-700 dark:text-slate-200';
}

function amountClassName(value: number, kind?: StatementLine['kind']) {
  if (kind === 'total' || kind === 'subtotal') return 'text-slate-950 dark:text-white';
  if (value < 0) return 'text-rose-700 dark:text-rose-300';
  return 'text-slate-800 dark:text-slate-100';
}

function inputClassName(extra?: string) {
  return cn(
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950',
    extra,
  );
}

export default function InformesContables() {
  const { currentLanguage } = useLanguage();
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const [activeStatementId, setActiveStatementId] = useState<StatementId>('income');
  const [periodPresetId, setPeriodPresetId] = useState('current-month');
  const [periodFrom, setPeriodFrom] = useState(periodPresets[0].from);
  const [periodTo, setPeriodTo] = useState(periodPresets[0].to);
  const [calculationBasis, setCalculationBasis] = useState('accrual');
  const [documentScope, setDocumentScope] = useState('all');
  const [documentSearch, setDocumentSearch] = useState('');
  const activeStatement = useMemo(
    () => financialStatements.find((statement) => statement.id === activeStatementId) ?? financialStatements[0],
    [activeStatementId],
  );

  const filteredStatements = useMemo(() => {
    const search = documentSearch.trim().toLowerCase();
    return financialStatements.filter((statement) => {
      const matchesScope = documentScope === 'all' || statement.category === documentScope;
      const matchesSearch = !search || `${statement.title} ${statement.category} ${statement.description}`.toLowerCase().includes(search);
      return matchesScope && matchesSearch;
    });
  }, [documentScope, documentSearch]);
  const documentCategories = useMemo(
    () => Array.from(new Set(financialStatements.map((statement) => statement.category))),
    [],
  );
  const selectedPreset = periodPresets.find((preset) => preset.id === periodPresetId) ?? periodPresets[0];
  const ActiveIcon = activeStatement.icon;

  const handlePeriodPresetChange = (presetId: string) => {
    const preset = periodPresets.find((option) => option.id === presetId);
    if (!preset) return;

    setPeriodPresetId(presetId);
    setPeriodFrom(preset.from);
    setPeriodTo(preset.to);
  };

  const resetPeriodFilters = () => {
    setPeriodPresetId(periodPresets[0].id);
    setPeriodFrom(periodPresets[0].from);
    setPeriodTo(periodPresets[0].to);
    setCalculationBasis('accrual');
    setDocumentScope('all');
    setDocumentSearch('');
  };

  const handleDocumentScopeChange = (scope: string) => {
    setDocumentScope(scope);

    const nextStatements = scope === 'all'
      ? financialStatements
      : financialStatements.filter((statement) => statement.category === scope);

    if (nextStatements.length > 0 && !nextStatements.some((statement) => statement.id === activeStatementId)) {
      setActiveStatementId(nextStatements[0].id);
    }
  };

  const exportActiveStatement = () => {
    exportStatementCsv(activeStatement, {
      basis: calculationBasis,
      from: periodFrom,
      preset: selectedPreset.label,
      to: periodTo,
    });
  };

  const handlePrintStatement = () => {
    const basisLabel = calculationBasis === 'accrual'
      ? 'Devengado'
      : calculationBasis === 'cash'
        ? 'Flujo de caja'
        : 'Proforma';
    const statementTable = activeStatement.lines
      ? {
          emptyLabel: 'No hay conceptos para este documento.',
          headers: ['Concepto', 'Importe', 'Detalle'],
          rows: activeStatement.lines.map((line) => [
            line.label,
            formatCurrency(line.value),
            line.detail ?? '',
          ]),
          title: activeStatement.title,
        }
      : {
          emptyLabel: 'No hay registros para este documento.',
          headers: ['Concepto', ...(activeStatement.columns ?? []), 'Estado'],
          rows: (activeStatement.rows ?? []).map((row) => [
            row.label,
            ...row.columns.map(formatCellValue).map(String),
            row.status ? statusLabels[row.status] : '',
          ]),
          title: activeStatement.title,
        };

    printStandardKpiReport({
      companyIdentity: companyPrintIdentity,
      documentName: activeStatement.title,
      locale: currentLanguage.code,
      meta: [
        { label: 'Periodo', value: `${selectedPreset.label} · ${periodFrom} - ${periodTo}` },
        { label: 'Base', value: basisLabel },
        { label: 'Categoría', value: activeStatement.category },
        { label: 'Estado', value: statusLabels[activeStatement.status] },
      ],
      metrics: [
        { detail: activeStatement.description, label: 'Documento', value: activeStatement.title },
        { detail: activeStatement.insight, label: 'Lectura ejecutiva', value: statusLabels[activeStatement.status] },
      ],
      reportTitle: activeStatement.title,
      subtitle: activeStatement.description,
      tables: [statementTable],
    });
  };
  const titleActions = (
    <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
      <Button type="button" variant="outline" onClick={exportActiveStatement} className="h-10 rounded-xl border-blue-200 bg-white text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200"><Download className="mr-2 h-4 w-4" />Exportar</Button>
      <Button type="button" variant="outline" disabled={!isCompanyPrintIdentityReady} onClick={handlePrintStatement} className="h-10 rounded-xl border-blue-200 bg-white text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200"><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <LearningModeTitleBarBridge actions={titleActions}>
      <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm dark:border-blue-900 dark:bg-slate-950 dark:text-blue-200">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Estados financieros
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-normal text-slate-950 dark:text-white">
                Documentos proforma por periodo
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                Calcula y revisa documentos contables con filtros de periodo, base y tipo de reporte.
              </p>
            </div>
          </div>
          {titleActions}
        </div>
      </section>
      </LearningModeTitleBarBridge>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
              <SlidersHorizontal className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              Periodo de calculo
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Define el rango con el que se calcularan los estados financieros proforma.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={resetPeriodFilters}
            className="h-10 w-fit rounded-xl border-slate-300 text-sm font-medium dark:border-slate-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Periodo
            </span>
            <select
              value={periodPresetId}
              onChange={(event) => handlePeriodPresetChange(event.target.value)}
              className={inputClassName()}
            >
              {periodPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Desde
            </span>
            <input
              type="date"
              value={periodFrom}
              onChange={(event) => {
                setPeriodPresetId('custom');
                setPeriodFrom(event.target.value);
              }}
              className={inputClassName()}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hasta
            </span>
            <input
              type="date"
              value={periodTo}
              onChange={(event) => {
                setPeriodPresetId('custom');
                setPeriodTo(event.target.value);
              }}
              className={inputClassName()}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Base
            </span>
            <select
              value={calculationBasis}
              onChange={(event) => setCalculationBasis(event.target.value)}
              className={inputClassName()}
            >
              <option value="accrual">Devengado</option>
              <option value="cash">Flujo de caja</option>
              <option value="proforma">Proforma</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Documento
            </span>
            <select
              value={documentScope}
              onChange={(event) => handleDocumentScopeChange(event.target.value)}
              className={inputClassName()}
            >
              <option value="all">Todos</option>
              {documentCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            {selectedPreset.label}: {periodFrom} a {periodTo}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
            Base: {calculationBasis === 'accrual' ? 'Devengado' : calculationBasis === 'cash' ? 'Flujo de caja' : 'Proforma'}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
            Documentos: {filteredStatements.length}
          </span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
              <FileSpreadsheet className="h-4 w-4" />
              Estados financieros proforma
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Buscar documento"
                className={inputClassName('pl-9')}
              />
            </div>
          </div>
          <div className="max-h-[720px] overflow-y-auto p-2">
            {filteredStatements.map((statement) => {
              const Icon = statement.icon;
              const isActive = statement.id === activeStatementId;

              return (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => setActiveStatementId(statement.id)}
                  className={cn(
                    'mb-2 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                    isActive
                      ? 'border-blue-700 bg-blue-50 text-blue-950 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-950',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                      isActive
                        ? 'border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{statement.title}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {statement.category} - {periodFrom} / {periodTo}
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredStatements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">No hay documentos en este filtro.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cambia el tipo de documento para ampliar el listado.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-5">
          <article className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                    <ActiveIcon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={activeStatement.status} />
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {periodFrom} / {periodTo}
                      </span>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        {calculationBasis === 'accrual' ? 'Devengado' : calculationBasis === 'cash' ? 'Caja' : 'Proforma'}
                      </span>
                    </div>
                    <h2 className="text-xl font-medium tracking-normal text-slate-950 dark:text-white">
                      {activeStatement.title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {activeStatement.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isCompanyPrintIdentityReady}
                    onClick={handlePrintStatement}
                    className="h-9 rounded-xl border-slate-300 text-sm font-medium dark:border-slate-700"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                  <ShieldCheck className="h-4 w-4" />
                  Lectura ejecutiva
                </div>
                <p className="mt-2 text-sm leading-6 text-blue-950 dark:text-blue-100">
                  {activeStatement.insight}
                </p>
              </div>

              {activeStatement.lines ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Concepto</th>
                        <th className="px-4 py-3 text-right font-medium">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeStatement.lines.map((line) => (
                        <tr key={`${activeStatement.id}-${line.label}`} className={lineClassName(line)}>
                          <td className="px-4 py-3">{line.label}</td>
                          <td className={cn('px-4 py-3 text-right font-medium', amountClassName(line.value, line.kind))}>
                            {formatCurrency(line.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeStatement.rows && activeStatement.columns ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Concepto</th>
                        {activeStatement.columns.map((column) => (
                          <th key={column} className="px-4 py-3 font-medium">{column}</th>
                        ))}
                        <th className="px-4 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeStatement.rows.map((row) => (
                        <tr key={`${activeStatement.id}-${row.label}`} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.label}</td>
                          {row.columns.map((column, index) => (
                            <td
                              key={`${activeStatement.id}-${row.label}-${index}`}
                              className={cn(
                                'px-4 py-3 text-slate-700 dark:text-slate-200',
                                typeof column === 'number' && column < 0 ? 'font-medium text-rose-700 dark:text-rose-300' : '',
                              )}
                            >
                              {formatCellValue(column)}
                            </td>
                          ))}
                          <td className="px-4 py-3">{row.status ? <StatusBadge status={row.status} /> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function exportStatementCsv(
  statement: FinancialStatement,
  context: { basis: string; from: string; preset: string; to: string },
) {
  const rows: Array<Array<string | number>> = [
    [statement.title],
    ['Categoria', statement.category],
    ['Periodo', context.preset],
    ['Desde', context.from],
    ['Hasta', context.to],
    ['Base', context.basis],
    ['Estado', statusLabels[statement.status]],
    [],
    ['Lectura ejecutiva'],
    [statement.insight],
    [],
  ];

  if (statement.lines) {
    rows.push(['Concepto', 'Importe']);
    statement.lines.forEach((line) => rows.push([line.label, line.value]));
  }

  if (statement.rows && statement.columns) {
    rows.push(['Concepto', ...statement.columns, 'Estado']);
    statement.rows.forEach((row) => {
      rows.push([
        row.label,
        ...row.columns,
        row.status ? statusLabels[row.status] : '',
      ]);
    });
  }

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${statement.id}-${context.from}-${context.to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
