import { useCallback } from "react";
import { meetingApi } from "../services/meetingApi";
import { getMeetingOutcomeCopy } from "../translations/meetingOutcomeCopy";
import type { MeetingCopy } from "../translations/meetingCopy";
import { Action, Feedback, useMeetingQuery } from "./MeetingPrimitives";

export function MeetingPerformance({ id, locale, copy }: { id: number; locale: string; copy: MeetingCopy }) {
  const c = getMeetingOutcomeCopy(locale);
  const query = useMeetingQuery(useCallback(signal => meetingApi.agreementPerformance(id, signal), [id]));
  const value = query.data;
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-label={c.performance}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-medium">{c.performance}</h4>
      {value && <strong className="text-lg text-blue-700 dark:text-blue-300">{value.onTimePercent === null ? c.pendingEvaluation : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value.onTimePercent / 100)}</strong>}
    </div>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback> : value && <>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{[[c.onTime, value.onTime], [c.late, value.late], [c.overdue, value.overdue], [c.upcoming, value.upcoming], [c.cancelled, value.cancelled], [c.unknown, value.historicalUnknown]].map(([label, count]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold tabular-nums">{count}</dd></div>)}</dl>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{c.formula} · {value.onTime} / {value.eligible} · {value.timezone}</p>
      {value.historicalUnknown > 0 && <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{c.baselineHint}</p>}
    </>}
  </section>;
}
