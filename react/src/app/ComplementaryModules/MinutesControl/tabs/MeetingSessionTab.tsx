import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceFilterBar } from "../../../components/frontend-os/IndiceFilterBar";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { meetingApi } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingSessionCopy } from "../translations/meetingSessionCopy";
import { Action, Feedback, Field, Status, control, dateInput, instantRange, panel, useMeetingQuery } from "../components/MeetingPrimitives";
import { dayCount } from "../utils/dateScope";
import { MeetingSessionWorkspace } from "../components/MeetingSessionWorkspace";

type Props = { copy: MeetingCopy; locale: string; userId: number; administrator: boolean; onAgreements?: (id: number) => void };
export default function MeetingSessionTab(props: Props) {
  const { copy, locale } = props, c = getMeetingSessionCopy(locale);
  const [params] = useSearchParams(), navigate = useNavigate(), auth = useAuthorizationRevision();
  const requested = params.get("meeting");
  const id = requested && /^\d+$/.test(requested) && Number.isSafeInteger(Number(requested)) && Number(requested) > 0 ? Number(requested) : 0;
  if (id) return <MeetingSessionWorkspace key={`${auth}:${id}`} {...props} id={id} onChangeMeeting={() => navigate("/minutes-control/session")} />;
  return <>
    <IndiceTitleBar tone="blue" title={c.title} subtitle={c.hint} icon="📝" />
    {requested ? <Feedback error>{copy.error}</Feedback> : <MeetingSessionPicker copy={copy} locale={locale} onChoose={id => navigate(`/minutes-control/session?meeting=${id}`)} />}
  </>;
}
function MeetingSessionPicker({ copy, locale, onChoose }: { copy: MeetingCopy; locale: string; onChoose: (id: number) => void }) {
  const c = getMeetingSessionCopy(locale), now = new Date();
  const [term, setTerm] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [from, setFrom] = useState(dateInput(new Date(now.getFullYear(), now.getMonth(), 1))), [to, setTo] = useState(dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const [status, setStatus] = useState("");
  useEffect(() => { const timer = setTimeout(() => { setSearch(term); setPage(1); }, 250); return () => clearTimeout(timer); }, [term]);
  let valid = Boolean(from && to && from <= to);
  try { dayCount(from, to); instantRange(from, to); } catch { valid = false; }
  const query = useMeetingQuery(useCallback(signal => valid ? meetingApi.list({ ...instantRange(from, to), search, status, sort: "start", direction: "asc", page, pageSize: 25 }, false, signal) : Promise.resolve(undefined), [valid, from, to, search, status, page]));
  return <>
    <IndiceFilterBar title={c.choose} subtitle={c.empty} summary={query.data ? `${query.data.total} · ${copy.meetings}` : undefined} gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label={copy.search}><input type="search" className={control} maxLength={180} value={term} onChange={e => setTerm(e.target.value)} /></Field>
      <Field label={copy.from}><input type="date" className={control} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></Field>
      <Field label={copy.to}><input type="date" className={control} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></Field>
      <Field label={copy.status}><select className={control} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">{copy.all}</option>{(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map(s => <option key={s} value={s}>{copy[s]}</option>)}</select></Field>
    </IndiceFilterBar>
    {!valid ? <Feedback error>{copy.partial}</Feedback> : query.loading || term !== search ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback> : query.data && <>
      {!query.data.total && <Feedback>{copy.empty}</Feedback>}
      <div className="grid gap-4 lg:grid-cols-2">{query.data.items.map(row => <article key={row.id} className={panel + " min-w-0 space-y-4"}>
        <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 break-words font-medium">{row.title}</h3><Status status={row.status} copy={copy} /></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{new Intl.DateTimeFormat(locale, {dateStyle:"medium",timeStyle:"short",timeZone:row.timezone}).format(new Date(row.startAt))} · {row.timezone}</p>
        <p className="break-words text-sm">👥 {row.ownerName} · {row.participantCount} {copy.participants.toLowerCase()}</p>
        <Action primary onClick={() => onChoose(row.id)}>📝 {c.enter}</Action>
      </article>)}</div>
      {query.data.total > 25 && <div className="flex flex-wrap items-center justify-between gap-3"><Action disabled={page === 1} onClick={() => setPage(p => p - 1)}>{copy.previous}</Action><span className="text-sm">{page} / {Math.ceil(query.data.total / 25)}</span><Action disabled={page * 25 >= query.data.total} onClick={() => setPage(p => p + 1)}>{copy.next}</Action></div>}
    </>}
  </>;
}
