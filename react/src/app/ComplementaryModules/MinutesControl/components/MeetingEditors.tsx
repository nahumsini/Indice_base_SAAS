import { useCallback, useRef, useState } from "react";
import {
  meetingApi,
  type MeetingDetail,
  type MeetingStatus,
  type Agreement,
  type AgreementStatus,
} from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { useLanguage } from "../../../shared/context";
import { getMeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import { MeetingVotingPanel } from "./MeetingVotingPanel";
import { MeetingAttendance, MeetingAgreementsSummary } from "./MeetingExecution";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import { FollowupEditor } from "./AgreementEditors";
import {
  Editor,
  Field,
  control,
  Feedback,
  useMeetingQuery,
  dateInput,
} from "./MeetingPrimitives";

/** Retries keep the same key only for the exact same payload, without persisting private content. */
function useRequestKey() {
  const last = useRef({ body: "", key: "" });
  return (body: unknown) => {
    const value = JSON.stringify(body);
    if (last.current.body !== value)
      last.current = { body: value, key: crypto.randomUUID() };
    return last.current.key;
  };
}
type EditorProps = {
  copy: MeetingCopy;
  onClose: () => void;
  onSaved: () => void;
};
export { MeetingPlanningModal as MeetingEditor } from "./MeetingPlanningModal";
export function MinutesEditor({
  copy,
  detail,
  onClose,
  onSaved,
}: EditorProps & { detail: MeetingDetail }) {
  const { currentLanguage } = useLanguage();
  const w = getMeetingWorkflowCopy(currentLanguage.code);
  const [minutes, setMinutes] = useState(detail.minutes),
    [decisions, setDecisions] = useState(detail.decisions);
  if (detail.meeting.status === "COMPLETED") return <FollowupEditor meeting={detail} copy={copy} onClose={onClose} onSaved={onSaved}/>;
  return (
    <Editor
      title={copy.editMinutes}
      submitLabel={w.saveMinutes}
      description={w.humanControl}
      copy={copy}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        meetingApi.minutes(detail.meeting.id, {
          minutes,
          decisions,
          expectedVersion: detail.meeting.version,
        })
      }
    >
      <Field label={copy.minutes}>
        <textarea
          className={control + " h-48 py-3"}
          maxLength={20000}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </Field>
      <Field label={copy.decisions}>
        <textarea
          className={control + " h-32 py-3"}
          maxLength={10000}
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
        />
      </Field>
    </Editor>
  );
}
export function TransitionEditor({
  copy,
  meeting,
  agreement,
  canAgreements = false,
  status,
  onClose,
  onSaved,
}: EditorProps & {
  meeting?: MeetingDetail;
  agreement?: Agreement;
  canAgreements?: boolean;
  status: MeetingStatus | AgreementStatus;
}) {
  const { currentLanguage } = useLanguage();
  const w = getMeetingWorkflowCopy(currentLanguage.code);
  const live = getMeetingLiveCopy(currentLanguage.code);
  const [reason, setReason] = useState("");
  const action =
    status === "CANCELLED"
      ? meeting
        ? copy.cancelMeeting
        : copy.cancelAgreement
      : status === "COMPLETED"
        ? copy.finish
        : status === "IN_PROGRESS"
          ? copy.begin
          : copy.complete;
  return (
    <Editor
      title={action}
      submitLabel={action}
      description={
        status === "CANCELLED"
          ? w.cancelHint
          : status === "COMPLETED"
            ? w.concludeHint
            : w.humanControl
      }
      copy={copy}
      onClose={onClose}
      onSaved={onSaved}
      destructive={status === "CANCELLED"}
      onSave={() =>
        meeting
          ? meetingApi.status(
              meeting.meeting.id,
              status as MeetingStatus,
              reason,
              meeting.meeting.version,
            )
          : meetingApi.agreementStatus(
              agreement!.id,
              status as AgreementStatus,
              reason,
              agreement!.version,
            )
      }
    >
      <Feedback>
        {status === "CANCELLED"
          ? copy.retained
          : (meeting?.meeting.title ?? agreement?.title)}
      </Feedback>
      {status === "COMPLETED" && meeting && <div className="space-y-4">
        <h3 className="font-medium">✅ {live.closure}</h3>
        <section className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h4 className="text-sm font-medium">{copy.decisions}</h4><p className="whitespace-pre-wrap break-words text-sm">{meeting.decisions || "—"}</p></section>
        <MeetingAttendance detail={meeting} copy={copy} locale={currentLanguage.code} />
        <MeetingVotingPanel meetingId={meeting.meeting.id} status={meeting.meeting.status} locale={currentLanguage.code} copy={copy} />
        {canAgreements && <MeetingAgreementsSummary id={meeting.meeting.id} copy={copy} locale={currentLanguage.code} />}
        <Feedback>{live.closureHint}</Feedback>
      </div>}
      <Field label={status === "DONE" ? w.outcomeEvidence : copy.reason}>
        <textarea
          className={control + " h-32 py-3"}
          required={Boolean(agreement) || status === "CANCELLED"}
          minLength={
            Boolean(agreement) || status === "CANCELLED" ? 3 : undefined
          }
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </Editor>
  );
}
export { AgreementEditor } from "./AgreementEditors";
