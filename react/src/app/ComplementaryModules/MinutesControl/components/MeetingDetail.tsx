import { useCallback } from "react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import { meetingApi, type MeetingDetail as Detail, type MeetingStatus } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import { getMeetingOperationsCopy } from "../translations/meetingOperationsCopy";
import { getMeetingOutcomeCopy } from "../translations/meetingOutcomeCopy";
import { MeetingAgreementsSummary } from "./MeetingExecution";
import { printMeetingMinutes } from "../utils/meetingPrintDocument";
import { downloadCalendarExport } from "../../../shared/utils/calendarDownload";
import { Action, Feedback, Status, useMeetingQuery, panel } from "./MeetingPrimitives";

export function MeetingDetail({
  id,
  copy,
  locale,
  userId,
  administrator,
  onClose,
  onEdit,
  onMinutes,
  onTransition,
  onAgreements,
  onNewAgreement,
  onNewBallot,
  onBallot,
  onSession,
}: {
  id: number;
  copy: MeetingCopy;
  locale: string;
  userId: number;
  administrator: boolean;
  onClose: () => void;
  onSession?: (meetingId: number) => void;
  onEdit: (detail: Detail) => void;
  onMinutes: (detail: Detail) => void;
  onTransition: (detail: Detail, status: MeetingStatus) => void;
  onAgreements?: (meetingId: number) => void;
  onNewAgreement?: (detail: Detail) => void;
  onNewBallot?: (detail: Detail) => void;
  onBallot?: (detail: Detail, id: number) => void;
}) {
  const query = useMeetingQuery(useCallback(signal => meetingApi.detail(id, signal), [id]));
  const detail = query.data, row = detail?.meeting;
  const w = getMeetingWorkflowCopy(locale), op = getMeetingOperationsCopy(locale), c = getMeetingOutcomeCopy(locale);
  const editable = Boolean(row && (administrator || row.ownerId === userId));
  const canMinutes = editable || detail?.planning?.minutesOwner.id === userId;
  const active = row?.status === "PLANNED" || row?.status === "IN_PROGRESS";
  const primaryLabel = row?.status === "IN_PROGRESS" ? c.continue : row?.status === "COMPLETED" || row?.status === "CANCELLED" ? c.viewMinutes : c.open;
  const date = row ? new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short", timeZone: row.timezone }).format(new Date(row.startAt)) : "";
  return <IndiceModalFrame open tone="blue" icon="📝" modalType="operational-workspace" title={row?.title ?? copy.detail}
    description={row ? `${date} · ${row.timezone}` : copy.loading} closeLabel={copy.close} onOpenChange={open => { if (!open) onClose(); }}
    footer={<><Action onClick={onClose}>{copy.close}</Action>{row && onSession && <Action primary onClick={() => onSession(id)}>{primaryLabel}</Action>}</>}>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback> : detail && row && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><Status status={row.status} copy={copy} /><span className="text-sm text-slate-600 dark:text-slate-300">{copy[row.meetingType]} · {row.ownerName}</span></div>
        <details><summary className="flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 px-4 text-sm dark:border-slate-700">{c.more}</summary>
          <div className="mt-3 flex max-w-full flex-wrap gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            {editable && row.status === "PLANNED" && <Action onClick={() => onEdit(detail)}>{copy.edit}</Action>}
            {canMinutes && active && <Action onClick={() => onMinutes(detail)}>{copy.editMinutes}</Action>}
            {editable && row.status === "PLANNED" && <Action onClick={() => onTransition(detail, "IN_PROGRESS")}>{copy.begin}</Action>}
            {editable && row.status === "IN_PROGRESS" && <Action disabled={!row.hasMinutes} title={!row.hasMinutes ? copy.missingMinutes : undefined} onClick={() => onTransition(detail, "COMPLETED")}>{copy.finish}</Action>}
            {canMinutes && row.status === "COMPLETED" && <Action onClick={() => onMinutes(detail)}>{op.addendum}</Action>}
            <Action onClick={() => printMeetingMinutes(detail, copy, locale)}>{op.print}</Action>
            <Action onClick={() => downloadCalendarExport({ uid: `meeting-${row.id}@indice`, title: row.title, startAt: row.startAt, endAt: row.endAt, location: detail.location, version: row.version, status: row.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED" })}>{op.calendar}</Action>
            {editable && active && <div className="w-full border-t border-slate-200 pt-3 dark:border-slate-700"><Action className="text-red-700 dark:text-red-300" onClick={() => onTransition(detail, "CANCELLED")}>{copy.cancelMeeting}</Action></div>}
          </div>
        </details>
      </div>
      <section className={panel + " space-y-4"}><h3 className="font-medium">{c.preparation}</h3><dl className="grid gap-4 text-sm sm:grid-cols-2">
        {[[w.purpose, detail.planning?.objective], [w.expectedResult, detail.planning?.expectedResult], [w.minutesOwner, detail.planning?.minutesOwner.name || row.ownerName], [copy.location, detail.location]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-300">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || "—"}</dd></div>)}
      </dl><div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h4 className="text-sm font-medium">{c.participants}</h4><p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">{[row.ownerName, ...detail.participants.filter(person => person.id !== row.ownerId).map(person => person.name)].join(" · ")}</p></div></section>
      <section className={panel}><h3 className="mb-3 font-medium">{copy.agenda}</h3><p className="whitespace-pre-wrap break-words text-sm leading-7">{detail.agenda || "—"}</p></section>
      {onAgreements && <MeetingAgreementsSummary id={id} copy={copy} locale={locale} onOpen={() => onAgreements(id)} onNew={editable && active && onNewAgreement ? () => onNewAgreement(detail) : undefined} />}
      {(detail.minutes || detail.decisions) && <details className={panel}><summary className="min-h-11 cursor-pointer font-medium">{copy.minutes}</summary><div className="space-y-4 pt-3">{[[c.minutesLabel, detail.minutes], [c.decisionsLabel, detail.decisions]].map(([label, value]) => <div key={label}><h4 className="text-sm font-medium">{label}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{value || "—"}</p></div>)}</div></details>}
      <details className={panel}><summary className="min-h-11 cursor-pointer text-sm font-medium">{op.history}</summary>{detail.history.length === 100 && <Feedback>{copy.partial}</Feedback>}<ol className="space-y-3 pt-3">{detail.history.map((entry, index) => <li key={index} className="border-t border-slate-100 pt-3 text-sm dark:border-slate-800"><p>{entry.actorName} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.occurredAt))}</p><p className="mt-1 whitespace-pre-wrap break-words">{entry.action === "MINUTES_ADDENDUM" ? op.addendum : copy[entry.action as keyof MeetingCopy] ?? op.history}{entry.reason && `: ${entry.reason}`}</p></li>)}</ol></details>
    </div>}
  </IndiceModalFrame>;
}
