import { ApiClientError } from "../../../lib/apiClient";
import { Link } from "react-router";
import { getMeetingOutcomeCopy } from "../translations/meetingOutcomeCopy";
import { useCallback, useEffect, useRef, useState } from "react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import { useLanguage } from "../../../shared/context";
import { meetingApi, type Agreement, type MeetingDetail as Detail } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingOperationsCopy } from "../translations/meetingOperationsCopy";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import { Action, Editor, Field, control, Feedback, useMeetingQuery, dateInput } from "./MeetingPrimitives";

type Props = { copy: MeetingCopy; onClose: () => void; onSaved: () => void };
export function AgreementEditor({ copy, onClose, onSaved, record, meetingId = 0, suggestedTitle }: Props & { record?: Agreement; meetingId?: number; suggestedTitle?: string }) {
  const { currentLanguage } = useLanguage(), op = getMeetingOperationsCopy(currentLanguage.code);
  const [term, setTerm] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [form, setForm] = useState({ meetingId: record?.meetingId ?? meetingId, title: record?.title ?? suggestedTitle ?? "",
    assigneeId: record?.assigneeId ?? 0, dueDate: record?.dueDate ?? dateInput(new Date(Date.now() + 7 * 86400000)),
    reason: "", followupEnabled: record?.followupEnabled ?? true });
  const live = getMeetingLiveCopy(currentLanguage.code);
  const retry = useRef({ body: "", key: "" });
  useEffect(() => { const timer = setTimeout(() => { setSearch(term); setPage(1); }, 250); return () => clearTimeout(timer); }, [term]);
  const choices = useMeetingQuery(useCallback(signal => meetingApi.searchChoices(search, page, record ? record.meetingId : 0, signal), [search, page, record?.meetingId]));
  const selection = useMeetingQuery(useCallback(signal => form.meetingId ? meetingApi.searchChoices("", 1, form.meetingId, signal) : Promise.resolve(undefined), [form.meetingId]));
  const selected = selection.data?.items[0];
  return <Editor title={record ? op.editAgreement : copy.newAgreement} copy={copy} onClose={onClose} onSaved={onSaved}
    ready={Boolean(selected && form.assigneeId && !selection.error)} onSave={async () => {
      if (record) return meetingApi.updateAgreement(record, form);
      const body = { meetingId: form.meetingId, title: form.title, assigneeId: form.assigneeId, dueDate: form.dueDate, followupEnabled: form.followupEnabled };
      const fingerprint = JSON.stringify(body);
      if (retry.current.body !== fingerprint) retry.current = { body: fingerprint, key: crypto.randomUUID() };
      return meetingApi.agreement(body, retry.current.key);
    }}>
    {!record && !meetingId && <Field label={op.searchMeeting}><input className={control} maxLength={180} value={term} onChange={e => setTerm(e.target.value)} /></Field>}
    {(choices.error || selection.error) && <Feedback error>{copy.error}</Feedback>}
    {meetingId ? <p className="rounded-xl bg-blue-50 p-3 text-sm dark:bg-blue-950">📅 {selected?.title ?? copy.loading}</p> : choices.loading ? <Feedback>{copy.loading}</Feedback> : <>
      <Field label={copy.meeting}><select className={control} required disabled={Boolean(record)} value={form.meetingId || ""}
        onChange={e => setForm({ ...form, meetingId: Number(e.target.value), assigneeId: 0 })}>
        <option value="">—</option>
        {selected && !choices.data?.items.some(m => m.id === selected.id) && <option value={selected.id}>{selected.title}</option>}
        {choices.data?.items.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
      </select></Field>
      {!record && <div className="flex items-center justify-between gap-3">
        <Action disabled={page === 1} onClick={() => setPage(p => p - 1)}>{op.previous}</Action>
        <span className="text-sm">{page} · {choices.data?.total ?? 0} {copy.records}</span>
        <Action disabled={page * 25 >= (choices.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>{op.next}</Action>
      </div>}
    </>}
    <Field label={live.actionLabel}><input className={control} placeholder={live.actionExample} required maxLength={240} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={copy.assignee}><select className={control} required value={form.assigneeId || ""} onChange={e => setForm({ ...form, assigneeId: Number(e.target.value) })}>
        <option value="">—</option>{selected?.participants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select></Field>
      <Field label={copy.due}><input className={control} type="date" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></Field>
    </div>
    {record && <>
      <Field label={copy.reason}><textarea className={control + " h-28 py-3"} required minLength={3} maxLength={2000} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></Field>
    </>}
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form.followupEnabled} onChange={e => setForm({ ...form, followupEnabled: e.target.checked })} />{op.followup}</label>
    <p className="text-xs leading-5 text-slate-500">{live.reminderHint}</p>
  </Editor>;
}
export function FollowupEditor({ copy, onClose, onSaved, agreement, meeting }: Props & { agreement?: Agreement; meeting?: Detail }) {
  const { currentLanguage } = useLanguage(), op = getMeetingOperationsCopy(currentLanguage.code);
  const [text, setText] = useState("");
  return <Editor title={meeting ? op.addendum : op.note} description={meeting ? op.addendumHint : agreement?.title} copy={copy}
    onClose={onClose} onSaved={onSaved} onSave={() => meeting ? meetingApi.addendum(meeting, text) : meetingApi.agreementNote(agreement!, text)}>
    <Field label={meeting ? op.addendum : op.note}><textarea className={control + " h-48 py-3"} required minLength={3} maxLength={2000} value={text} onChange={e => setText(e.target.value)} /></Field>
  </Editor>;
}
export function AgreementDetail({ id, copy, locale, userId, administrator, onClose, onEdit, onNote }: {
  id: number; copy: MeetingCopy; locale: string; userId: number; administrator: boolean; onClose: () => void;
  onEdit: (record: Agreement) => void; onNote: (record: Agreement) => void;
}) {
  const op = getMeetingOperationsCopy(locale), c = getMeetingOutcomeCopy(locale);
  const [mode, setMode] = useState<"delegate" | "validate" | null>(null);
  const evidence = useMeetingQuery(useCallback(signal => meetingApi.agreementEvidence(id, signal), [id]));
  const query = useMeetingQuery(useCallback(signal => meetingApi.agreementDetail(id, signal), [id]));

  const record = query.data?.agreement, own = record && (administrator || record.meetingOwnerId === userId);
  if (mode && record) return mode === "delegate"
    ? <AgreementTaskEditor record={record} copy={copy} locale={locale} onClose={() => { setMode(null); query.reload(); evidence.reload(); }} onSaved={() => { setMode(null); query.reload(); evidence.reload(); }} />
    : <AgreementFulfilmentEditor record={record} copy={copy} locale={locale} onClose={() => { setMode(null); query.reload(); evidence.reload(); }} onSaved={() => { setMode(null); query.reload(); evidence.reload(); }} />;
  return <IndiceModalFrame open tone="blue" icon="🤝" modalType="operational-workspace" title={record?.title ?? copy.agreements}
    description={record?.meetingTitle ?? op.history} onOpenChange={open => { if (!open) onClose(); }} footer={<><Action onClick={onClose}>{copy.close}</Action>{query.data?.canLinkTask ? <Action primary onClick={() => setMode("delegate")}>{c.delegate}</Action> : record?.status === "OPEN" && (own || record.assigneeId === userId) ? <Action primary onClick={() => setMode("validate")}>{c.validate}</Action> : null}</>}>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : record && <div className="space-y-5">
      <p className="text-sm">{record.assigneeName} · {record.dueDate} · {copy[record.status]}</p>
      {record.status === "OPEN" && <div className="flex flex-wrap gap-3">
        {own && <Action onClick={() => onEdit(record)}>{op.editAgreement}</Action>}
        {(own || record.assigneeId === userId) && <Action onClick={() => onNote(record)}>{op.note}</Action>}
      </div>}
      <section className="space-y-3">
        {query.data?.task && <div className="space-y-3 rounded-xl border p-4 text-sm"><p>{op.task}: {query.data.task.folio} · {query.data.task.title}</p><p>{c.due}: {query.data.task.dueDate}</p><p>{c.taskStatus}: {({ pending: c.taskPending, in_progress: c.taskInProgress, paused: c.taskPaused, completed: c.taskCompleted, cancelled: c.taskCancelled } as Record<string, string>)[query.data.task.status] ?? c.taskPending}</p>
          <Link className="inline-flex min-h-11 items-center rounded-xl border px-4 text-blue-700 dark:text-blue-300" to={`/processes-tasks/calendar?period=all&search=${encodeURIComponent(query.data.task.folio || query.data.task.title)}`}>{c.viewTask}</Link>
          <p className="text-xs leading-5 text-slate-500">{c.independent}</p>
        </div>}
        {query.data?.canLinkTask && record.status === "OPEN" && (own || record.assigneeId === userId) && <Action onClick={() => setMode("validate")}>{c.validate}</Action>}
      </section>
      {evidence.loading ? <Feedback>{copy.loading}</Feedback> : evidence.error ? <Feedback error>{copy.error}<Action onClick={evidence.reload}>{copy.refresh}</Action></Feedback> : evidence.data && <section className="space-y-3 rounded-xl border p-4 text-sm">
        <p className="font-medium">{({ ON_TIME: c.onTime, LATE: c.late, OVERDUE: c.overdue, UPCOMING: c.upcoming, CANCELLED: c.cancelled, UNRATED: c.unknown })[evidence.data.outcome]}</p>
        <p>{c.originalDue}: <strong>{evidence.data.originalDueDate || "—"}</strong></p>
        {evidence.data.fulfilledAt && <p>{copy.DONE} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(evidence.data.fulfilledAt))}</p>}
        {evidence.data.deadlineBasis !== "CREATED" && <p className="text-xs leading-5 text-slate-500">{c.baselineHint}</p>}
        {Boolean(evidence.data.revisions.length) && <details><summary className="min-h-11 cursor-pointer">{c.revisions}</summary>{evidence.data.revisions.length === 100 && <Feedback>{copy.partial}</Feedback>}<ul className="space-y-3">{evidence.data.revisions.map((revision, index) => <li key={index} className="border-t pt-3"><p>{revision.previousAssigneeName} → {revision.assigneeName}</p><p>{revision.previousDueDate} → {revision.dueDate}</p><p className="whitespace-pre-wrap">{revision.reason}</p><p className="text-xs text-slate-500">{revision.actorName} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.occurredAt))}</p></li>)}</ul></details>}
      </section>}
      <h3 className="font-medium">{op.history}</h3>
      {query.data?.history.length === 100 && <Feedback>{copy.partial}</Feedback>}
      <ol className="space-y-3">{query.data?.history.map((entry, i) => <li key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="text-sm">{entry.actorName} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.occurredAt))}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{entry.action === "AGREEMENT_UPDATED" ? op.editAgreement : entry.action === "AGREEMENT_NOTE" ? op.note : entry.action === "AGREEMENT_TASK_LINKED" ? op.task : copy[entry.action as keyof MeetingCopy] ?? op.history}{entry.reason && `: ${entry.reason}`}</p>
      </li>)}</ol>
    </div>}
  </IndiceModalFrame>;
}

export function AgreementTaskEditor({ record, copy, locale, onClose, onSaved }: Props & { record: Agreement; locale: string }) {
  const c = getMeetingOutcomeCopy(locale);
  const selection = useMeetingQuery(useCallback(signal => meetingApi.searchChoices("", 1, record.meetingId, signal), [record.meetingId]));
  const [assigneeId, setAssigneeId] = useState(record.assigneeId), [dueDate, setDueDate] = useState(record.dueDate), [reason, setReason] = useState("");
  const [stale, setStale] = useState(false);
  const changed = assigneeId !== record.assigneeId || dueDate !== record.dueDate;
  return <Editor title={c.delegate} description={c.delegateHint} copy={copy} submitLabel={c.delegate} onClose={onClose} onSaved={onSaved}
    ready={!stale && Boolean(selection.data?.items[0]?.participants.some(person => person.id === assigneeId) && dueDate && (!changed || reason.trim().length >= 3))}
    onSave={async () => { try { return await meetingApi.delegateTask(record, { assigneeId, dueDate, reason }); } catch (error) { if (error instanceof ApiClientError && error.status === 409) setStale(true); throw error; } }}>
    <p className="break-words text-sm font-medium">{record.title}</p>
    {selection.error && <Feedback error>{copy.error}</Feedback>}
    <Field label={copy.assignee}><select className={control} required value={assigneeId} onChange={event => setAssigneeId(Number(event.target.value))}>
      <option value="">—</option>{selection.data?.items[0]?.participants.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select></Field>
    <Field label={c.due}><input className={control} type="date" required value={dueDate} onChange={event => setDueDate(event.target.value)} /></Field>
    {changed && <Field label={c.delegateReason}><textarea className={control + " h-28 py-3"} required minLength={3} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></Field>}
    <p className="text-xs leading-5 text-slate-500">{c.independent}</p>
  </Editor>;
}
export function AgreementFulfilmentEditor({ record, copy, locale, onClose, onSaved }: Props & { record: Agreement; locale: string }) {
  const c = getMeetingOutcomeCopy(locale), [reason, setReason] = useState("");
  const [stale, setStale] = useState(false);
  return <Editor title={c.validate} description={c.validationHint} copy={copy} submitLabel={c.confirmResult} onClose={onClose} onSaved={onSaved} ready={!stale}
    onSave={async () => { try { return await meetingApi.agreementStatus(record.id, "DONE", reason, record.version); } catch (error) { if (error instanceof ApiClientError && error.status === 409) setStale(true); throw error; } }}>
    <p className="break-words text-sm font-medium">{record.title}</p>
    <Field label={copy.reason}><textarea className={control + " h-40 py-3"} required minLength={3} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></Field>
  </Editor>;
}
