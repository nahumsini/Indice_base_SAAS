import type {
  MeetingRequest,
  PlanRequest,
  Recurrence,
} from "../services/meetingApi";
import type { MeetingWorkflowCopy } from "../translations/meetingWorkflowCopy";
import { ApiClientError } from "../../../lib/apiClient";
import { dateInput } from "./dateScope";

export type PlanningDraft = {
  title: string;
  meetingType: string;
  objective: string;
  expectedResult: string;
  ownerId: number;
  minutesOwnerId: number;
  participantIds: number[];
  agenda: string;
  location: string;
  start: string;
  duration: number;
  reminderMinutes: number;
  recurring: boolean;
  frequency: Recurrence["frequency"];
  interval: number;
  count: number;
  saveFlow: boolean;
  flowName: string;
  allowConflicts: boolean;
};
export const dateTimeInput = (date: Date) =>
  `${dateInput(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
export function initialPlanning(userId: number): PlanningDraft {
  const date = new Date(Date.now() + 3600000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return {
    title: "",
    meetingType: "WORKING",
    objective: "",
    expectedResult: "",
    ownerId: userId,
    minutesOwnerId: userId,
    participantIds: [],
    agenda: "",
    location: "",
    start: dateTimeInput(date),
    duration: 60,
    reminderMinutes: 0,
    recurring: false,
    frequency: "WEEKLY",
    interval: 1,
    count: 4,
    saveFlow: false,
    flowName: "",
    allowConflicts: false,
  };
}
export function planningRequest(
  form: PlanningDraft,
  zone: string,
): PlanRequest {
  const start = new Date(form.start);
  // A native datetime input can describe a DST gap; never silently normalize that wall clock.
  if (!Number.isFinite(start.getTime()) || dateTimeInput(start) !== form.start)
    throw new Error("meeting_time_gap");
  const meeting: MeetingRequest = {
    title: form.title.trim(),
    meetingType: form.meetingType,
    objective: form.objective.trim(),
    expectedResult: form.expectedResult.trim(),
    ownerId: form.ownerId,
    minutesOwnerId: form.minutesOwnerId,
    participantIds: form.participantIds,
    agenda: form.agenda,
    location: form.location,
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + form.duration * 60000).toISOString(),
    timezone: zone,
    reminderMinutes: form.reminderMinutes,
  };
  return {
    meeting,
    recurrence: form.recurring
      ? {
          frequency: form.frequency,
          interval: form.interval,
          count: form.count,
        }
      : null,
    saveFlowName: form.saveFlow ? form.flowName.trim() : "",
    allowConflicts: form.allowConflicts,
  };
}
export function planningError(
  error: unknown,
  w: MeetingWorkflowCopy,
  fallback: string,
): string {
  const code =
    error instanceof ApiClientError
      ? error.code
      : error instanceof Error
        ? error.message
        : "";
  const messages: Record<string, string> = {
    meeting_purpose_required: w.required,
    meeting_start_past: w.startPast,
    meeting_time_gap: w.timeGap,
    meeting_duration_invalid: w.durationInvalid,
    meeting_minutes_owner_invalid: w.peopleInvalid,
    meeting_recurrence_limit: w.seriesLimit,
    meeting_recurrence_invalid: w.seriesLimit,
    meeting_flow_limit: w.flowLimit,
    meeting_conflicts_confirm: w.conflictsHint,
    meeting_future_conflict: w.futureConflict,
  };
  return (code && messages[code]) || fallback;
}
