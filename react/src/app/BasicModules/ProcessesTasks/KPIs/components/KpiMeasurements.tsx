import { ClipboardCheck, Clock3, FileCheck2, ListChecks } from 'lucide-react';
import { measurementCards } from '../measurementPresentation';
import type { KpiMeasurements } from '../measurements';
import { getTaskKpiWorkspaceCopy } from '../translations/workspaceCopy';


export function KpiMeasurementCards({ measurements, locale, onDetails }: { measurements: KpiMeasurements; locale: string; onDetails: () => void }) {
  const c = getTaskKpiWorkspaceCopy(locale);
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    {measurementCards(measurements.summary, c, locale).map(card => <article key={card.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-[#F4C84A]/15 p-2.5 text-[#9A6B05] dark:text-[#FEF3C7]"><ListChecks className="h-5 w-5" /></span><h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{card.label}</h3></div>
      <p className="text-2xl font-medium text-slate-950 dark:text-white">{card.value}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300">{card.helper}</p>
      {card.description ? <p className="text-sm text-slate-500 dark:text-slate-400">{card.description}</p> : null}
      <button type="button" onClick={onDetails} className="mt-auto w-fit rounded-lg py-2 text-sm font-medium text-[#9A6B05] hover:underline focus-visible:outline-2 focus-visible:outline-[#F4C84A] dark:text-[#FEF3C7]">{c.details} →</button>
    </article>)}
  </div>;
}

function Value({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-700"><dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt><dd className="shrink-0 text-sm font-medium text-slate-950 dark:text-white">{value}</dd></div>;
}
export function KpiMeasurementAnalysis({ measurements, locale }: { measurements: KpiMeasurements; locale: string }) {
  const c = getTaskKpiWorkspaceCopy(locale), m = measurements.summary;
  const duration = (value: number | null) => value == null ? c.noSample : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${c.days}`;
  const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800';
  const title = 'flex items-center gap-2 text-base font-medium text-slate-900 dark:text-white';
  return <div className="grid gap-6 xl:grid-cols-3">
    <section className={panel}><h3 className={title}><Clock3 className="h-5 w-5 text-[#9A6B05] dark:text-[#FEF3C7]" />{c.aging}</h3><dl>
      <Value label="1–3" value={m.late1To3Days} /><Value label="4–7" value={m.late4To7Days} /><Value label="8+" value={m.late8PlusDays} />
      <Value label={c.highPriority} value={m.highPriorityLateTasks} /><Value label={c.upcoming} value={m.upcomingTasks} />
      <Value label={c.elapsed} value={duration(m.medianElapsedDays)} /><Value label={c.sample} value={m.elapsedSamples} />
    </dl><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{c.upcomingNote} ({measurements.cutoffDate} – {measurements.upcomingThrough}). {c.elapsedNote}</p></section>
    <section className={panel}><h3 className={title}><ClipboardCheck className="h-5 w-5 text-[#9A6B05] dark:text-[#FEF3C7]" />{c.quality}</h3><dl>
      <Value label={c.audit} value={m.pendingAuditTasks} /><Value label={c.wait} value={duration(m.medianAuditWaitDays)} />
      <Value label={c.reviewTime} value={duration(m.medianAuditDurationDays)} /><Value label={c.sample} value={m.auditDurationSamples} />
      <Value label={c.measured} value={`${m.ratedTasks} / ${m.auditedTasks}`} />
    </dl><p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{c.distribution}</p><div className="mt-2 grid grid-cols-6 gap-1">{m.ratingDistribution.map((count, rating) => <div key={rating} className="rounded-lg bg-[#F4C84A]/10 p-2 text-center"><p className="text-xs text-slate-500 dark:text-slate-400">{rating}/5</p><p className="font-medium text-slate-900 dark:text-white">{count}</p></div>)}</div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{c.qualityNote}</p></section>
    <section className={panel}><h3 className={title}><FileCheck2 className="h-5 w-5 text-[#9A6B05] dark:text-[#FEF3C7]" />{c.evidence}</h3><dl>
      <Value label={c.required} value={m.requiredEvidenceTasks} /><Value label={c.openMissing} value={m.openMissingEvidence} /><Value label={c.closedMissing} value={m.closedMissingEvidence} />
    </dl><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{c.evidenceNote}</p></section>
  </div>;
}
