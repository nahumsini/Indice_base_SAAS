import { useCallback, useState } from "react";
import { meetingVotingApi, type Ballot, type VotingResult } from "../services/meetingVotingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingVotingCopy, type MeetingVotingCopy } from "../translations/meetingVotingCopy";
import { Action, Feedback, panel, useMeetingQuery } from "./MeetingPrimitives";

export function VotingSummary({ ballot, copy }: { ballot: VotingResult; copy: MeetingVotingCopy }) {
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-2">
      {([["YES", ballot.tally.yes, "text-emerald-700 dark:text-emerald-300"], ["NO", ballot.tally.no, "text-red-700 dark:text-red-300"], ["ABSTAIN", ballot.tally.abstain, "text-amber-700 dark:text-amber-300"]] as const).map(([choice, count, color]) => <div key={choice} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <strong className={`block text-2xl ${color}`}>{count}</strong><span className="mt-1 block text-xs">{choice === "ABSTAIN" ? copy.abstentions : copy[choice]}</span><span className="text-[11px] text-slate-500 dark:text-slate-300">{copy.points}</span>
      </div>)}
    </div>
    <div className="space-y-2">
      <div className="flex flex-wrap justify-between gap-2 text-xs"><span>{copy.participation}</span><strong>{ballot.tally.cast} / {ballot.totalWeight} {copy.points}</strong></div>
      <progress aria-label={copy.participation} className="h-2 w-full overflow-hidden rounded-full accent-blue-600" value={ballot.tally.cast} max={Math.max(1, ballot.totalWeight)} />
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{copy.approval}: {ballot.approvalWeight} {copy.points} · {copy.quorum}: {ballot.quorumWeight} {copy.points}</p>
    </div>
  </div>;
}
export function VotingBadge({ ballot, copy }: { ballot: Pick<Ballot,"status"|"outcome">; copy: MeetingVotingCopy }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${ballot.outcome === "APPROVED" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : ballot.status === "OPEN" ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{ballot.status === "OPEN" ? copy.OPEN : copy[ballot.outcome]}</span>;
}
export function MeetingVotingPanel({ meetingId, status, locale, copy, onNew, onOpen }: {
  meetingId: number; status: string; locale: string; copy: MeetingCopy; onNew?: () => void; onOpen?: (id: number) => void;
}) {
  const v = getMeetingVotingCopy(locale), [page, setPage] = useState(1);
  const query = useMeetingQuery(useCallback(signal => meetingVotingApi.list(meetingId, page, signal), [meetingId, page]));
  return <section className={panel + " space-y-4"}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">🗳️ {v.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{v.hint}</p></div><div className="flex flex-wrap gap-2"><Action disabled={query.loading} onClick={query.reload}>{copy.refresh}</Action>{onNew && status === "IN_PROGRESS" && <Action primary onClick={onNew}>＋ {v.newVote}</Action>}</div></div>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : query.data && <>
      {!query.data.total && <p className="text-sm text-slate-500 dark:text-slate-300">{v.empty} {status === "PLANNED" && v.startFirst}</p>}
      <div className="grid gap-4 lg:grid-cols-2">{query.data.items.map(ballot => <article key={ballot.id} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3"><h4 className="min-w-0 flex-1 break-words text-sm font-medium">{ballot.subject}</h4><VotingBadge ballot={ballot} copy={v} /></div>
        <VotingSummary ballot={ballot} copy={v} />
        {ballot.myWeight > 0 && <p className="text-xs">{v.myVote}: {ballot.myChoice ? v[ballot.myChoice] : v.noVote} · {ballot.myWeight} {v.points}</p>}
        {onOpen && <Action onClick={() => onOpen(ballot.id)}>{v.view}</Action>}
      </article>)}</div>
      {query.data.total > 10 && <div className="flex items-center justify-between gap-3"><Action aria-label={copy.previous} disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</Action><span className="text-xs">{page} / {Math.ceil(query.data.total / 10)}</span><Action aria-label={copy.next} disabled={page * 10 >= query.data.total} onClick={() => setPage(p => p + 1)}>→</Action></div>}
    </>}
  </section>;
}
