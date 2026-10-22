import { useCallback, useState } from "react";
import { Pencil, Play, Check, X } from "lucide-react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import {
  meetingApi,
  type MeetingDetail as Detail,
  type MeetingStatus,
} from "../services/meetingApi";
import { getMeetingSessionCopy } from "../translations/meetingSessionCopy";
import { MeetingVotingPanel } from "./MeetingVotingPanel";
import { getMeetingVotingCopy } from "../translations/meetingVotingCopy";
import { MeetingAttendance, MeetingAgreementsSummary } from "./MeetingExecution";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import { getMeetingOperationsCopy } from "../translations/meetingOperationsCopy";
import { printMeetingMinutes } from "../utils/meetingPrintDocument";
import { downloadCalendarExport } from "../../../shared/utils/calendarDownload";
import {
  Action,
  Feedback,
  Status,
  useMeetingQuery,
  panel,
} from "./MeetingPrimitives";

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
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [dirtyAttendance, setDirtyAttendance] = useState(false);
  const [discardAttendance, setDiscardAttendance] = useState(false);
  const close = () => { if (!savingAttendance) { if (dirtyAttendance) setDiscardAttendance(true); else onClose(); } };
  const live = getMeetingLiveCopy(locale);
  const voting = getMeetingVotingCopy(locale);
  const query = useMeetingQuery(
      useCallback((signal) => meetingApi.detail(id, signal), [id]),
    ),
    detail = query.data,
    row = detail?.meeting;
  const editable = Boolean(row && (administrator || row.ownerId === userId)),
    active = Boolean(row && ["PLANNED", "IN_PROGRESS"].includes(row.status));
  const w = getMeetingWorkflowCopy(locale);
  const op = getMeetingOperationsCopy(locale);
  const canMinutes = editable || detail?.planning?.minutesOwner.id === userId;
  return (
    <IndiceModalFrame
      open
      busy={savingAttendance}
      contentClassName="max-h-[calc(100dvh-1rem)]"
      tone="blue"
      modalType={discardAttendance ? "confirmation" : "operational-workspace"}
      title={discardAttendance ? copy.discard : row?.title ?? copy.detail}
      description={copy.subtitle}
      icon="📝"
      closeLabel={copy.close}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={discardAttendance ? <><Action onClick={() => setDiscardAttendance(false)}>{copy.keepEditing}</Action><Action onClick={onClose}>{copy.close}</Action></> : <Action disabled={savingAttendance} onClick={close}>{copy.close}</Action>}
    >
      <div hidden={discardAttendance}>
      {query.loading ? (
        <Feedback>{copy.loading}</Feedback>
      ) : query.error ? (
        <Feedback error>{copy.error}</Feedback>
      ) : (
        detail &&
        row && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Status status={row.status} copy={copy} />
              <span className="text-sm text-slate-500">
                {copy[row.meetingType]} · {row.ownerName}
              </span>
            </div>
            <p className="text-sm">
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: row.timezone,
              }).format(new Date(row.startAt))}{" "}
              · {row.timezone}
            </p>
            {onSession && <Action primary disabled={savingAttendance || dirtyAttendance} onClick={() => onSession(id)}>📝 {getMeetingSessionCopy(locale).enter}</Action>}
            {(editable || canMinutes) && active && (
              <fieldset disabled={savingAttendance || dirtyAttendance} className="flex flex-wrap gap-2">
                {editable && row.status === "PLANNED" && (
                  <Action onClick={() => onEdit(detail)}>
                    <Pencil className="h-4 w-4" />
                    {copy.edit}
                  </Action>
                )}
                {canMinutes && (
                  <Action onClick={() => onMinutes(detail)}>
                    <Pencil className="h-4 w-4" />
                    {copy.editMinutes}
                  </Action>
                )}
                {editable &&
                  (row.status === "PLANNED" ? (
                    <Action
                      primary
                      onClick={() => onTransition(detail, "IN_PROGRESS")}
                    >
                      <Play className="h-4 w-4" />
                      {copy.begin}
                    </Action>
                  ) : (
                    <Action
                      primary
                      disabled={!row.hasMinutes}
                      title={!row.hasMinutes ? copy.missingMinutes : undefined}
                      onClick={() => onTransition(detail, "COMPLETED")}
                    >
                      <Check className="h-4 w-4" />
                      {copy.finish}
                    </Action>
                  ))}
                {editable && (
                  <Action
                    className="text-red-600 dark:text-red-300"
                    onClick={() => onTransition(detail, "CANCELLED")}
                  >
                    <X className="h-4 w-4" />
                    {copy.cancelMeeting}
                  </Action>
                )}
              </fieldset>
            )}
            {canMinutes && row.status === "COMPLETED" && <Action onClick={()=>onMinutes(detail)}>{op.addendum}</Action>}
            <div className="flex flex-wrap gap-3">
              <Action onClick={() => printMeetingMinutes(detail, copy, locale)}>{op.print}</Action>
              <Action onClick={() => downloadCalendarExport({ uid: `meeting-${row.id}@indice`, title: row.title, startAt: row.startAt, endAt: row.endAt, location: detail.location, version: row.version, status: row.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED" })}>{op.calendar}</Action>
            </div>
            {detail.planning && (
              <section className={panel + " space-y-4"}>
                <h3 className="text-sm font-medium">🎯 {w.peopleStep}</h3>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  {[
                    [w.purpose, detail.planning.objective],
                    [w.expectedResult, detail.planning.expectedResult],
                    [w.coordinator, row.ownerName],
                    [w.minutesOwner, detail.planning.minutesOwner.name],
                    [
                      w.reminder,
                      detail.planning.remindersPaused
                        ? w.paused
                        : detail.planning.reminderMinutes
                          ? `${detail.planning.reminderMinutes} min`
                          : w.none,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-slate-500 dark:text-slate-300">
                        {label}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words">
                        {value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {detail.planning.seriesId && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🔁 {w.series} · {detail.planning.occurrenceNumber}
                  </p>
                )}
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
                  {w.humanControl}
                </p>
              </section>
            )}
            <div className="grid items-start gap-5 lg:grid-cols-2">
            <MeetingAttendance detail={detail} copy={copy} locale={locale} editable={canMinutes && row.status === "IN_PROGRESS"} onSaved={query.reload} onBusy={setSavingAttendance} onDirty={setDirtyAttendance} />
            {onAgreements && <MeetingAgreementsSummary id={id} copy={copy} locale={locale} onOpen={!dirtyAttendance && !savingAttendance ? () => onAgreements(id) : undefined} onNew={!dirtyAttendance && !savingAttendance && editable && active && onNewAgreement ? () => onNewAgreement(detail) : undefined} />}
            </div>
            <MeetingVotingPanel meetingId={id} status={row.status} locale={locale} copy={copy} onNew={!dirtyAttendance && !savingAttendance && editable && onNewBallot ? () => onNewBallot(detail) : undefined} onOpen={!dirtyAttendance && !savingAttendance && onBallot ? ballotId => onBallot(detail, ballotId) : undefined} />
            {row.status === "COMPLETED" && <Feedback>{live.closureHint}</Feedback>}
            {[
              ["agenda", copy.agenda],
              ["minutes", copy.minutes],
              ["decisions", copy.decisions],
              ["location", copy.location],
            ].map(([key, label]) => (
              <section key={key} className={panel}>
                <h3 className="mb-3 text-sm font-medium">{label}</h3>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {detail[key as "agenda"] || "—"}
                </p>
              </section>
            ))}
            <details className={panel}>
              <summary className="min-h-11 cursor-pointer text-sm font-medium">{copy.history}</summary>
              {detail.history.length === 100 && (
                <Feedback>{copy.partial}</Feedback>
              )}
              <ol className="space-y-4">
                {detail.history.map((item, i) => (
                  <li key={i} className="text-sm">
                    <p>
                      {copy[item.action as keyof MeetingCopy] ??
                        {
                          VOTING_OPENED: voting.OPENED,
                          VOTING_CLOSED: voting.CLOSED,
                          VOTING_CANCELLED: voting.CANCELLED,
                          ATTENDANCE_UPDATED: live.attendance,
                          MINUTES_ADDENDUM: op.addendum,
                          AGREEMENT_UPDATED: op.editAgreement,
                          AGREEMENT_NOTE: op.note,
                          AGREEMENT_TASK_LINKED: op.task,
                          PAUSE_REMINDERS: w.pause,
                          RESUME_REMINDERS: w.resume,
                        }[
                          item.action as "PAUSE_REMINDERS" | "RESUME_REMINDERS"
                        ] ??
                        item.action}{" "}
                      · {item.actorName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.occurredAt))}
                    </p>
                    {item.reason && (
                      <p className="mt-1 whitespace-pre-wrap break-words">
                        {item.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        )
      )}
      </div>
    </IndiceModalFrame>
  );
}
