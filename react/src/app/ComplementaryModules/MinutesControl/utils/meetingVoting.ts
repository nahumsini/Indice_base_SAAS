import { ApiClientError } from "../../../lib/apiClient";
import type { OpenBallotRequest, VotingPerson, VotingRule } from "../services/meetingVotingApi";
import type { MeetingVotingCopy } from "../translations/meetingVotingCopy";
export const requiredWeight = (rule: VotingRule, total: number) => rule === "ALL" ? total : rule === "TWO_THIRDS" ? Math.ceil(total * 2 / 3) : Math.floor(total / 2) + 1;
/** This is a draft preview only. The server validates identities and freezes authoritative weights. */
export function votingPreview(form: OpenBallotRequest, people: VotingPerson[]) {
 const roles = new Map(form.roles.map(r => [r.key, r]));
 if (!form.roles.length || form.roles.length > 12 || roles.size !== form.roles.length || new Set(form.roles.map(r => r.name.trim().toLocaleLowerCase())).size !== form.roles.length || form.roles.some(r => !r.name.trim() || !Number.isInteger(r.weight) || r.weight < 0 || r.weight > 1000)) throw new Error("meeting_voting_roles_invalid");
 if (form.voters.length !== people.length || new Set(form.voters.map(p => p.userId)).size !== people.length) throw new Error("meeting_voting_team_changed");
 let total = 0;
 for (const assignment of form.voters) {
  const person = people.find(p => p.userId === assignment.userId), role = roles.get(assignment.roleKey);
  if (!person || !role) throw new Error("meeting_voting_team_changed");
  if (role.weight && !person.eligible) throw new Error("meeting_voting_member_unavailable");
  total += role.weight;
 }
 if (!total) throw new Error("meeting_voting_no_weight");
 return {total, approval: requiredWeight(form.approvalRule, total), quorum: requiredWeight(form.quorumRule, total)};
}
export function votingError(error: unknown, copy: MeetingVotingCopy, fallback: string, conflict: string) {
 const code = error instanceof ApiClientError ? error.code : error instanceof Error ? error.message : "";
 if (error instanceof ApiClientError && error.status === 409) return conflict;
 return ({meeting_voting_team_changed: copy.teamChanged, meeting_voting_member_unavailable: copy.unavailable, meeting_voting_roles_invalid: copy.rolesInvalid, meeting_voting_no_weight: copy.noWeight, meeting_voting_open: copy.openBallots, meeting_voting_limit: copy.limit, meeting_voting_not_running: copy.notRunning} as Record<string,string>)[code ?? ""] || fallback;
}
