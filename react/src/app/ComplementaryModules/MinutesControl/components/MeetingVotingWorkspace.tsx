import { useCallback, useEffect, useRef, useState } from "react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import { getAuthorizationRevision } from "../../../api/authSessionStore";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { meetingVotingApi, type VoteChoice } from "../services/meetingVotingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingVotingCopy } from "../translations/meetingVotingCopy";
import { votingError } from "../utils/meetingVoting";
import { Action, Feedback, Field, control, panel, useMeetingQuery } from "./MeetingPrimitives";
import { VotingBadge, VotingSummary } from "./MeetingVotingPanel";

export function MeetingVotingWorkspace({ meetingId, id, locale, copy, canManage, onClose, onAgreement }: {
  meetingId: number; id: number; locale: string; copy: MeetingCopy; canManage: boolean; onClose: () => void; onAgreement?: (subject: string) => void;
}) {
  const v = getMeetingVotingCopy(locale);
  const query = useMeetingQuery(useCallback(signal => meetingVotingApi.detail(meetingId, id, signal), [meetingId, id]));
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [choice, setChoice] = useState<VoteChoice | "">(""), [dirty, setDirty] = useState(false);
  const [command, setCommand] = useState<"CLOSE" | "CANCEL" | null>(null), [reason, setReason] = useState(""), [discard, setDiscard] = useState(false), [saved, setSaved] = useState(false);
  const auth = useAuthorizationRevision(), openedAuth = useRef(auth), form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (auth !== openedAuth.current) onClose(); }, [auth]);
  useEffect(() => { if (query.data && !dirty) setChoice(query.data.ballot.myChoice ?? ""); }, [query.data, dirty]);
  const ballot = query.data?.ballot;
  const close = () => { if (!busy) { if (dirty || reason) setDiscard(true); else onClose(); } };
  const run = async (operation: () => Promise<unknown>, voted = false) => {
    if (busy || openedAuth.current !== getAuthorizationRevision()) return;
    setBusy(true); setError(""); setSaved(false);
    try { await operation(); if (openedAuth.current === getAuthorizationRevision()) { setDirty(false); setReason(""); setCommand(null); setSaved(voted); query.reload(); } }
    catch (e) { if (openedAuth.current === getAuthorizationRevision()) setError(votingError(e, v, copy.error, copy.conflict)); }
    finally { setBusy(false); }
  };
  const confirmation = command !== null || discard;
  return <IndiceModalFrame open tone="blue" icon="🗳️" busy={busy} modalType={confirmation ? "confirmation" : "operational-workspace"} contentClassName="max-h-[calc(100dvh-1rem)]"
    title={discard ? copy.discard : command === "CLOSE" ? v.closeVote : command === "CANCEL" ? v.cancelVote : ballot?.subject ?? v.title}
    description={command ? v.closeHint : v.hint} closeLabel={copy.close} onOpenChange={open => { if (!open) close(); }}
    footer={discard ? <><Action onClick={() => setDiscard(false)}>{copy.keepEditing}</Action><Action onClick={onClose}>{copy.close}</Action></> : command && ballot ? <><Action disabled={busy} onClick={() => { setCommand(null); setReason(""); setError(""); }}>{v.back}</Action><Action primary data-modal-destructive={command === "CANCEL" || undefined} disabled={busy} onClick={() => { if (!form.current?.reportValidity()) return; void run(() => meetingVotingApi.close(meetingId, ballot, command, reason)); }}>{busy ? copy.loading : command === "CANCEL" ? v.cancelVote : v.confirmClose}</Action></> : <Action disabled={busy} onClick={close}>{v.backMeeting}</Action>}>
    <div hidden={discard} className="space-y-5">
      {error && <Feedback error>{error}<Action disabled={busy} onClick={() => { setError(""); query.reload(); }}>{copy.refresh}</Action></Feedback>}
      {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback> : ballot && <>
        <div className="flex flex-wrap items-center justify-between gap-3"><VotingBadge ballot={ballot} copy={v} />{!command && <Action disabled={busy || dirty} onClick={() => { setSaved(false); query.reload(); }}>{copy.refresh}</Action>}</div>
        {command ? <form ref={form} className="space-y-4" onSubmit={e => e.preventDefault()}><h3 className="break-words font-medium">{ballot.subject}</h3><VotingSummary ballot={ballot} copy={v} />{command === "CANCEL" && <Field label={v.reason + " *"}><textarea className={control + " h-28 py-3"} required minLength={3} maxLength={2000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></Field>}<Feedback>{v.closeHint}</Feedback></form> : <>
          {ballot.description && <p className="whitespace-pre-wrap break-words text-sm">{ballot.description}</p>}
          <VotingSummary ballot={ballot} copy={v} />
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{v.ruleHint}</p>
          {saved && <Feedback>{v.saved}</Feedback>}
          {ballot.canVote ? <section className={panel + " space-y-4"}>
            <h3 className="text-sm font-medium">✋ {v.myVote} · {ballot.myRole} · {ballot.myWeight} {v.points}</h3><p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{v.voteHint}</p>
            <fieldset disabled={busy} className="grid gap-2 sm:grid-cols-3"><legend className="sr-only">{v.myVote}</legend>{(["YES", "NO", "ABSTAIN"] as const).map(option => <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${choice === option ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "border-slate-200 dark:border-slate-700"}`}><input type="radio" name={`ballot-${id}-vote`} checked={choice === option} value={option} className="h-4 w-4 accent-blue-600" onChange={() => { setChoice(option); setDirty(option !== ballot.myChoice); setSaved(false); }} />{v[option]}</label>)}</fieldset>
            <Action primary disabled={busy || !choice || !dirty} onClick={() => { if (choice) void run(() => meetingVotingApi.vote(meetingId, id, choice, ballot.myVoteVersion), true); }}>{busy ? copy.loading : v.confirmVote}</Action>
          </section> : ballot.status === "OPEN" && <Feedback>{ballot.myWeight ? v.ineligible : v.observer}</Feedback>}
          {canManage && ballot.status === "OPEN" && <div className="flex flex-wrap gap-3"><Action primary disabled={busy || dirty} onClick={() => { setCommand("CLOSE"); setError(""); }}>{v.closeVote}</Action><Action disabled={busy || dirty} onClick={() => { setCommand("CANCEL"); setError(""); }}>{v.cancelVote}</Action></div>}
          {ballot.closeReason && <Feedback>{ballot.closeReason}</Feedback>}
          {ballot.outcome === "APPROVED" && onAgreement && canManage && <Action primary disabled={busy} onClick={() => onAgreement(ballot.subject)}>🤝 {v.makeAgreement}</Action>}
          <section className={panel + " space-y-3"}><h3 className="text-sm font-medium">👥 {v.voters}</h3><ul className="divide-y divide-slate-100 dark:divide-slate-700">{query.data?.voters.map(person => <li key={person.userId} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><div className="min-w-0 flex-1"><p className="break-words font-medium">{person.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{person.roleName} · {person.weight} {v.points}</p>{person.weight > 0 && !person.eligible && ballot.status === "OPEN" && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{v.ineligible}</p>}</div><span>{person.weight ? person.choice ? v[person.choice] : v.noVote : v.observer}</span></li>)}</ul></section>
          <details className={panel}><summary className="min-h-11 cursor-pointer text-sm font-medium">{v.history}</summary>{query.data?.history.length === 100 && <Feedback>{copy.partial}</Feedback>}<ol className="space-y-4">{query.data?.history.map((entry, i) => <li key={i} className="text-sm"><p>{entry.actorName} · {v[entry.action as keyof typeof v] ?? entry.action}{entry.choice && ` · ${v[entry.choice]}`}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(entry.occurredAt))}</p>{entry.reason && <p className="mt-1 whitespace-pre-wrap break-words">{entry.reason}</p>}</li>)}</ol></details>
        </>}
      </>}
    </div>
  </IndiceModalFrame>;
}
