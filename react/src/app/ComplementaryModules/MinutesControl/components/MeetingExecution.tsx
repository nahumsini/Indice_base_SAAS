import { MeetingPerformance } from "./MeetingPerformance";
import { useCallback, useRef, useState, useEffect } from "react";
import { getAuthorizationRevision } from "../../../api/authSessionStore";
import { ApiClientError } from "../../../lib/apiClient";
import { meetingApi, type Attendance, type MeetingDetail } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import { Action, Feedback, Status, panel, control, useMeetingQuery } from "./MeetingPrimitives";

export function MeetingAttendance({ detail, copy, locale, editable = false, onSaved, onBusy, onDirty }: {
 detail: MeetingDetail; copy: MeetingCopy; locale: string; editable?: boolean; onSaved?: () => void; onBusy?: (busy: boolean) => void; onDirty?: (dirty: boolean) => void;
}) {
 const live = getMeetingLiveCopy(locale);
 const query = useMeetingQuery(useCallback(signal => meetingApi.attendance(detail.meeting.id, signal), [detail.meeting.id]));
 const [draft, setDraft] = useState<Record<number, string>>({});
 const [busy, setBusy] = useState(false), [error, setError] = useState("");
 const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
 const people = query.data?.people ?? [];
 const counts = (status: string) => people.filter(p => (draft[p.userId] ?? p.status) === status).length;
 const dirty = people.some(p => draft[p.userId] && draft[p.userId] !== p.status);
 useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
 return <section className={panel + " space-y-4"}>
  <h3 className="font-medium">👥 {live.attendance}</h3>
  <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{live.attendanceHint}</p>
  {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback> : <>
   <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-300">{(["PRESENT", "ABSENT", "UNMARKED"] as const).map(status => <span key={status}>{({ PRESENT: live.present, ABSENT: live.absent, UNMARKED: live.unmarked })[status]}: <strong>{counts(status)}</strong></span>)}</div>
   <ul className="divide-y divide-slate-100 dark:divide-slate-700">{people.map(person => <li key={person.userId} className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
    <span className="min-w-0 flex-1 break-words text-sm">{person.name}</span>
    {editable ? <select aria-label={`${live.attendance}: ${person.name}`} className={control + " w-full sm:w-44"} disabled={busy} value={draft[person.userId] ?? person.status} onChange={e => { setDraft(d => ({ ...d, [person.userId]: e.target.value })); setError(""); }}>
     <option value="UNMARKED">{live.unmarked}</option><option value="PRESENT">{live.present}</option><option value="ABSENT">{live.absent}</option>
    </select> : <span className="text-sm">{({ PRESENT: live.present, ABSENT: live.absent, UNMARKED: live.unmarked })[person.status]}</span>}
   </li>)}</ul>
   {editable && <Action primary disabled={busy || !dirty} onClick={async () => {
    if (!query.data || busy) return;
    const revision = getAuthorizationRevision(); setBusy(true); onBusy?.(true); setError("");
    try { await meetingApi.saveAttendance(detail.meeting.id, { expectedVersion: query.data.version, entries: people.filter(p => draft[p.userId] && draft[p.userId] !== p.status).map(p => ({ userId: p.userId, status: draft[p.userId] })) });
     if (alive.current && revision === getAuthorizationRevision()) { setDraft({}); query.reload(); onSaved?.(); }
    } catch (e) { if (alive.current && revision === getAuthorizationRevision()) setError(e instanceof ApiClientError && e.status === 409 ? copy.conflict : copy.error); }
    finally { if (alive.current) { setBusy(false); onBusy?.(false); } }
   }}>{busy ? copy.loading : live.saveAttendance}</Action>}
   {error && <Feedback error>{error}<Action disabled={busy} onClick={() => { setDraft({}); setError(""); query.reload(); onSaved?.(); }}>{copy.refresh}</Action></Feedback>}
  </>}
 </section>;
}

export function MeetingAgreementsSummary({ id, copy, locale, onOpen, onNew, onSelect }: {
 id: number; copy: MeetingCopy; locale: string; onOpen?: () => void; onNew?: () => void; onSelect?: (id: number) => void;
}) {
 const live = getMeetingLiveCopy(locale), zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
 const query = useMeetingQuery(useCallback(async signal => {
  const params = { meetingId: id, from: "2000-01-01", to: "2000-01-02", timezone: zone, pageSize: 10 };
  const [list, open, overdue, done] = await Promise.all([
    meetingApi.agreements(params, signal), meetingApi.agreements({ ...params, status: "OPEN" }, signal),
    meetingApi.agreements({ ...params, attention: "allOverdue" }, signal), meetingApi.agreements({ ...params, status: "DONE" }, signal)
  ]);
  return { list, open: open.total, overdue: overdue.total, done: done.total };
 }, [id, zone]));
 return <section className={panel + " space-y-4"}>
  <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">🤝 {copy.agreements}</h3>{onNew && <Action onClick={onNew}>＋ {copy.newAgreement}</Action>}</div>
  {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback> : query.data && <>
   <div className="grid grid-cols-3 gap-2">{[[live.pending, query.data.open], [live.overdue, query.data.overdue], [live.done, query.data.done]].map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800"><strong className="block text-xl">{count}</strong><span className="block break-words text-xs text-slate-500 dark:text-slate-300">{label}</span></div>)}</div>
   {!query.data.list.total && <p className="text-sm text-slate-500">{live.noAgreements}</p>}
   <ul className="space-y-3">{query.data.list.items.map(item => <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="break-words text-sm font-medium">{onSelect ? <button type="button" className="min-h-11 w-full break-words text-left text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300" onClick={() => onSelect(item.id)}>{item.title}</button> : item.title}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{item.assigneeName} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${item.dueDate}T12:00:00`))}</span><Status status={item.status} copy={copy} /></div></li>)}</ul>
   {query.data.list.total > query.data.list.items.length && <p className="text-xs text-slate-500">{query.data.list.items.length} / {query.data.list.total} · {copy.partial}</p>}
  </>}
  <MeetingPerformance id={id} locale={locale} copy={copy} />
  {onOpen && <Action onClick={onOpen}>{copy.view} · {copy.agreements}</Action>}
 </section>;
}
