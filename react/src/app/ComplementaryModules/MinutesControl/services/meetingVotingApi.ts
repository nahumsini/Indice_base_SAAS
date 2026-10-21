import { apiClient } from "../../../lib/apiClient";
import type { Page } from "./meetingApi";
export type VotingRule = "MAJORITY" | "TWO_THIRDS" | "ALL";
export type VoteChoice = "YES" | "NO" | "ABSTAIN";
export type VotingOutcome = "PENDING" | "APPROVED" | "NOT_APPROVED" | "TIED" | "NO_QUORUM" | "CANCELLED";
export type VotingRole = { key: string; name: string; weight: number };
export type VotingPerson = { userId: number; name: string; eligible: boolean };
export type OpenBallotRequest = { subject: string; description: string; approvalRule: VotingRule; quorumRule: VotingRule; roles: VotingRole[]; voters: {userId: number; roleKey: string}[] };
export type VotingTally = { yes: number; no: number; abstain: number; cast: number; castCount: number; voterCount: number };
export type VotingResult = { id: number; subject: string; outcome: VotingOutcome; approvalRule: VotingRule; totalWeight: number; approvalWeight: number; quorumWeight: number; tally: VotingTally; closedAt: string | null; closeReason?: string };
export type Ballot = VotingResult & { meetingId: number; description: string; status: "OPEN" | "CLOSED" | "CANCELLED"; quorumRule: VotingRule; version: number; createdAt: string; closeReason: string; myChoice: VoteChoice | null; myVoteVersion: number; myWeight: number; myRole: string; canVote: boolean };
export type BallotDetail = { ballot: Ballot; roles: VotingRole[]; voters: (VotingPerson & {roleKey: string; roleName: string; weight: number; choice: VoteChoice | null; voteVersion: number; votedAt: string | null})[]; history: {actorName: string; action: string; choice: VoteChoice | null; reason: string; occurredAt: string}[] };
const root = (meeting: number) => `/api/v1/meetings/${meeting}/ballots`;
const write = <T>(url: string, method: string, body: unknown, key?: string) => apiClient<T>(url, { method, body: JSON.stringify(body), headers: key ? { "Idempotency-Key": key } : undefined });
export const meetingVotingApi = {
 team: (meeting: number, signal: AbortSignal) => apiClient<{people: VotingPerson[]; previous?: {roles: VotingRole[]; assignments: {userId: number; roleKey: string}[]; approvalRule: VotingRule; quorumRule: VotingRule} | null}>(`${root(meeting)}/team`, {signal}),
 list: (meeting: number, page: number, signal: AbortSignal) => apiClient<Page<Ballot>>(`${root(meeting)}?page=${page}`, {signal}),
 detail: (meeting: number, id: number, signal: AbortSignal) => apiClient<BallotDetail>(`${root(meeting)}/${id}`, {signal}),
 open: (meeting: number, body: OpenBallotRequest, key: string) => write<BallotDetail>(root(meeting), "POST", body, key),
 vote: (meeting: number, id: number, choice: VoteChoice, expectedVoteVersion: number) => write<BallotDetail>(`${root(meeting)}/${id}/vote`, "PUT", {choice, expectedVoteVersion}),
 close: (meeting: number, ballot: Ballot, action: "CLOSE" | "CANCEL", reason: string) => write<BallotDetail>(`${root(meeting)}/${ballot.id}/close`, "POST", {action, reason, expectedVersion: ballot.version}),
};
