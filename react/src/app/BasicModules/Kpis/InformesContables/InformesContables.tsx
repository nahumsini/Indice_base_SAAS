import { useMemo, useState } from 'react';
import { FileSpreadsheet, PackageOpen, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import {
  financialStatements,
  formatCurrency,
  reportPackages,
  statusClasses,
  statusLabels,
  type FinancialStatement,
  type StatementId,
  type StatementLine,
} from '../kpisExecutiveData';

function StatusBadge({ status }: { status: FinancialStatement['status'] }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', statusClasses[status])}>
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
    return 'bg-emerald-50 font-bold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100';
  }
  if (line.kind === 'subtotal') {
    return 'bg-slate-50 font-semibold text-slate-950 dark:bg-slate-950 dark:text-white';
  }
  return 'text-slate-700 dark:text-slate-200';
}

function amountClassName(value: number, kind?: StatementLine['kind']) {
  if (kind === 'total' || kind === 'subtotal') return 'text-slate-950 dark:text-white';
  if (value < 0) return 'text-rose-700 dark:text-rose-300';
  return 'text-slate-800 dark:text-slate-100';
}

export default function InformesContables() {
  const [activeStatementId, setActiveStatementId] = useState<StatementId>('income');
  const activeStatement = useMemo(
    () => financialStatements.find((statement) => statement.id === activeStatementId) ?? financialStatements[0],
    [activeStatementId],
  );

  const healthyCount = financialStatements.filter((statement) => statement.status === 'healthy').length;
  const watchCount = financialStatements.filter((statement) => statement.status === 'watch').length;
  const criticalCount = financialStatements.filter((statement) => statement.status === 'critical').length;
  const ActiveIcon = activeStatement.icon;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Estados disponibles
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{financialStatements.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Sanos
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{healthyCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            En atencion
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{watchCount}</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-900 dark:bg-rose-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
            Criticos
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-100">{criticalCount}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <FileSpreadsheet className="h-4 w-4" />
              Estados financieros proforma
            </div>
          </div>
          <div className="max-h-[720px] overflow-y-auto p-2">
            {financialStatements.map((statement) => {
              const Icon = statement.icon;
              const isActive = statement.id === activeStatementId;

              return (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => setActiveStatementId(statement.id)}
                  className={cn(
                    'mb-2 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    isActive
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-950',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                      isActive
                        ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{statement.title}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {statement.category} - {statement.period}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-5">
          <article className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                    <ActiveIcon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={activeStatement.status} />
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {activeStatement.period}
                      </span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                        Proforma
                      </span>
                    </div>
                    <h2 className="text-xl font-bold tracking-normal text-slate-950 dark:text-white">
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
                    onClick={() => window.print()}
                    className="h-9 rounded-lg border-slate-300 text-sm font-semibold dark:border-slate-700"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  Lectura ejecutiva
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
                  {activeStatement.insight}
                </p>
              </div>

              {activeStatement.lines ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Concepto</th>
                        <th className="px-4 py-3 text-right font-semibold">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeStatement.lines.map((line) => (
                        <tr key={`${activeStatement.id}-${line.label}`} className={lineClassName(line)}>
                          <td className="px-4 py-3">{line.label}</td>
                          <td className={cn('px-4 py-3 text-right font-semibold', amountClassName(line.value, line.kind))}>
                            {formatCurrency(line.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeStatement.rows && activeStatement.columns ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Concepto</th>
                        {activeStatement.columns.map((column) => (
                          <th key={column} className="px-4 py-3 font-semibold">{column}</th>
                        ))}
                        <th className="px-4 py-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeStatement.rows.map((row) => (
                        <tr key={`${activeStatement.id}-${row.label}`} className="align-top">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{row.label}</td>
                          {row.columns.map((column, index) => (
                            <td
                              key={`${activeStatement.id}-${row.label}-${index}`}
                              className={cn(
                                'px-4 py-3 text-slate-700 dark:text-slate-200',
                                typeof column === 'number' && column < 0 ? 'font-semibold text-rose-700 dark:text-rose-300' : '',
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

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <PackageOpen className="h-4 w-4" />
                Paquetes de reporte
              </div>
            </div>
            <div className="grid gap-3 p-5 lg:grid-cols-3">
              {reportPackages.map((report) => {
                const Icon = report.icon;
                const packageStatements = report.statements
                  .map((statementId) => financialStatements.find((statement) => statement.id === statementId)?.title)
                  .filter(Boolean);

                return (
                  <article
                    key={report.title}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', report.status === 'ready' ? statusClasses.healthy : statusClasses.watch)}>
                        {report.status === 'ready' ? 'Listo' : 'Borrador'}
                      </span>
                    </div>
                    <h3 className="mt-4 font-bold text-slate-950 dark:text-white">{report.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{report.description}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Incluye
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {packageStatements.join(', ')}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
