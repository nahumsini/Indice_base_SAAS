import { useEffect, useRef, useState } from "react";
import { ApiClientError } from "../../../lib/apiClient";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { meetingApi, type Availability } from "../services/meetingApi";
import { planningRequest, dateTimeInput, type PlanningDraft } from "../utils/meetingPlanning";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import type { MeetingCopy } from "../translations/meetingCopy";
import { Action, Feedback } from "./MeetingPrimitives";
export function MeetingAvailability({ form, zone, locale, copy, meetingId, update }: {
 form: PlanningDraft; zone: string; locale: string; copy: MeetingCopy; meetingId?: number; update: (patch: Partial<PlanningDraft>) => void;
}) {
 const live = getMeetingLiveCopy(locale), auth = useAuthorizationRevision();
 const fingerprint = JSON.stringify([form.start, form.duration, form.ownerId, form.participantIds, form.minutesOwnerId, auth]);
 const current = useRef(fingerprint); current.current = fingerprint;
 const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
 const [result, setResult] = useState<{ key: string; value?: Availability; error?: string }>();
 const [pending, setPending] = useState<string>();
 const visible = result?.key === fingerprint ? result : undefined;
 return <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
  <Action disabled={pending === fingerprint || !form.ownerId || !form.duration} onClick={async event => {
   if (!event.currentTarget.closest("form")?.reportValidity()) return;
   const key = fingerprint; setPending(key);
   try { const body = planningRequest(form, zone).meeting; const value = await meetingApi.availability(body, meetingId);
     if (alive.current && current.current === key) setResult({ key, value });
   } catch (error) { if (alive.current && current.current === key) setResult({ key, error: error instanceof ApiClientError && error.code === "meeting_employee_unavailable" ? live.employeeUnavailable : copy.error }); }
   finally { if (alive.current) setPending(p => p === key ? undefined : p); }
  }}>🕒 {pending === fingerprint ? copy.loading : live.checkTimes}</Action>
  <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{live.checkHint}</p>
  {visible?.error && <Feedback error>{visible.error}</Feedback>}
  {visible?.value && <>
   <Feedback error={!visible.value.available}>{visible.value.available ? live.available : live.notAvailable}</Feedback>
   <p className="text-xs font-medium">{live.alternatives}</p>
   <div className="flex flex-wrap gap-2">{visible.value.alternatives.map(option => <Action key={option.startAt} onClick={() => update({ start: dateTimeInput(new Date(option.startAt)) })}>{new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: zone }).format(new Date(option.startAt))}</Action>)}</div>
   {!visible.value.alternatives.length && <p className="text-sm">{live.noTimes}</p>}
  </>}
 </section>;
}
