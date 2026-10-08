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
  status,
  onClose,
  onSaved,
}: EditorProps & {
  meeting?: MeetingDetail;
  agreement?: Agreement;
  status: MeetingStatus | AgreementStatus;
}) {
  const { currentLanguage } = useLanguage();
  const w = getMeetingWorkflowCopy(currentLanguage.code);
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
export function AgreementEditor({ copy, onClose, onSaved }: EditorProps) {
  const choices = useMeetingQuery(
    useCallback((signal) => meetingApi.choices(signal), []),
  );
  const [form, setForm] = useState({
    meetingId: 0,
    title: "",
    assigneeId: 0,
    dueDate: dateInput(new Date(Date.now() + 7 * 86400000)),
  });
  const key = useRequestKey(),
    selected = choices.data?.find((m) => m.id === form.meetingId);
  return (
    <Editor
      title={copy.newAgreement}
      copy={copy}
      ready={Boolean(choices.data?.length && !choices.error)}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() => meetingApi.agreement(form, key(form))}
    >
      {choices.loading ? (
        <Feedback>{copy.loading}</Feedback>
      ) : choices.error ? (
        <Feedback error>{copy.error}</Feedback>
      ) : !choices.data?.length ? (
        <Feedback>{copy.empty}</Feedback>
      ) : (
        <>
          {choices.data.length === 100 && <Feedback>{copy.partial}</Feedback>}
          <Field label={copy.meeting}>
            <select
              className={control}
              required
              value={form.meetingId || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  meetingId: Number(e.target.value),
                  assigneeId: 0,
                })
              }
            >
              <option value="" disabled>
                —
              </option>
              {choices.data.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.name}>
            <input
              className={control}
              required
              maxLength={240}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.assignee}>
              <select
                className={control}
                required
                value={form.assigneeId || ""}
                onChange={(e) =>
                  setForm({ ...form, assigneeId: Number(e.target.value) })
                }
              >
                <option value="" disabled>
                  —
                </option>
                {selected?.participants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={copy.due}>
              <input
                className={control}
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>
          </div>
        </>
      )}
    </Editor>
  );
}
