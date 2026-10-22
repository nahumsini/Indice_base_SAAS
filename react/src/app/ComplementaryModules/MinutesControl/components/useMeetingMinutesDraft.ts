import { useEffect, useRef, useState } from "react";
import { getAuthorizationRevision } from "../../../api/authSessionStore";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { ApiClientError } from "../../../lib/apiClient";
import { meetingApi, type MeetingDetail } from "../services/meetingApi";

/** One meeting/version per mounted editor. Business drafts stay in memory only. */
export function useMeetingMinutesDraft(detail: MeetingDetail, editable: boolean, onSaved: () => void) {
  const [minutes, setMinutes] = useState(detail.minutes), [decisions, setDecisions] = useState(detail.decisions);
  const [busy, setBusy] = useState(false), [error, setError] = useState<"" | "conflict" | "error">("");
  const authorization = useAuthorizationRevision(), openedAuthorization = useRef(authorization);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const current = authorization === openedAuthorization.current;
  const dirty = minutes !== detail.minutes || decisions !== detail.decisions;
  const update = (field: "minutes" | "decisions", value: string) => {
    if (!editable || !current || pending.current || openedAuthorization.current !== getAuthorizationRevision()) return;
    if (field === "minutes") setMinutes(value.slice(0, 20000)); else setDecisions(value.slice(0, 10000));
    // A version conflict is never silently rebased by editing the draft.
    if (error !== "conflict") setError("");
  };
  const save = async () => {
    if (!editable || !dirty || error === "conflict" || pending.current || openedAuthorization.current !== getAuthorizationRevision()) return;
    pending.current = true; setBusy(true); setError("");
    const revision = openedAuthorization.current;
    try {
      await meetingApi.minutes(detail.meeting.id, { minutes, decisions, expectedVersion: detail.meeting.version });
      if (alive.current && revision === getAuthorizationRevision()) onSaved();
    } catch (e) {
      if (alive.current && revision === getAuthorizationRevision()) setError(e instanceof ApiClientError && e.status === 409 ? "conflict" : "error");
    } finally {
      pending.current = false;
      if (alive.current && revision === getAuthorizationRevision()) setBusy(false);
    }
  };
  return { minutes: current ? minutes : "", decisions: current ? decisions : "", dirty: current && dirty, busy, error, current, update, save };
}
