import { AlertTriangle, ArrowRight, CheckCircle2, Lightbulb, Target } from 'lucide-react';

import type { BusinessDiagnosisEngineReport } from '../diagnosisEngine';

type BusinessDiagnosisResultProps = {
  locale: string;
  report: BusinessDiagnosisEngineReport;
};

export function BusinessDiagnosisResult({ locale, report }: BusinessDiagnosisResultProps) {
  const spanish = locale.toLowerCase().startsWith('es');
  const priority = report.insights.find((insight) => insight.type === 'single_priority') ?? report.insights[0];
  const quickWin = report.insights.find((insight) => insight.type === 'quick_win') ?? report.insights[1];
  const mainRisk = report.insights.find((insight) => insight.type === 'main_risk') ?? report.insights[2];
  const selectedInsights = [priority, quickWin, mainRisk].filter(Boolean);

  return (
    <section className="overflow-hidden rounded-xl border border-blue-200 bg-white dark:border-blue-900/60 dark:bg-gray-800">
      <header className="grid gap-4 border-b border-blue-100 bg-blue-50/70 px-4 py-5 dark:border-blue-900/50 dark:bg-blue-950/20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 dark:border-blue-900 dark:bg-gray-900">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-medium text-[#222831] dark:text-white">
                {spanish ? 'Resultado de tu empresa' : 'Your company result'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {spanish ? 'Una lectura práctica para decidir qué mejorar primero.' : 'A practical reading to decide what to improve first.'}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-5xl text-sm leading-6 text-gray-700 dark:text-gray-200">{report.executiveSummary}</p>
        </div>
        <div className="grid min-w-64 grid-cols-2 overflow-hidden rounded-xl border border-blue-100 bg-white dark:border-blue-900/50 dark:bg-gray-900">
          <Metric label={spanish ? 'Madurez' : 'Maturity'} value={`${Math.round(report.scoreReport.overall.averageScore)}%`} />
          <Metric label={spanish ? 'Confianza' : 'Confidence'} value={`${report.confidenceScore}%`} />
        </div>
      </header>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
        {selectedInsights.map((insight, index) => {
          const Icon = index === 0 ? Target : index === 1 ? Lightbulb : AlertTriangle;
          const label = index === 0
            ? (spanish ? 'Prioridad' : 'Priority')
            : index === 1
              ? 'Quick win'
              : (spanish ? 'Riesgo principal' : 'Main risk');

          return (
            <article key={insight.type} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                <Icon className="h-4 w-4" /> {label}
              </div>
              <h3 className="mt-3 text-base font-medium text-[#222831] dark:text-white">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{insight.message}</p>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-900/60 dark:text-gray-100">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>{insight.recommendedAction}</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-4 py-5 dark:border-gray-700 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="font-medium text-[#222831] dark:text-white">
            {spanish ? 'Plan recomendado' : 'Recommended plan'}
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {report.roadmap.slice(0, 3).map((item) => (
            <div key={`${item.label}-${item.title}`} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-[#222831] dark:text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center first:border-r first:border-blue-100 dark:first:border-blue-900/50">
      <p className="text-2xl font-medium text-blue-600">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
