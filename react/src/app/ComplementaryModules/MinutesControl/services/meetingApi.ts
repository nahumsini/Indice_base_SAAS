import { apiClient } from "../../../lib/apiClient";

export type MeetingStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type AgreementStatus = "OPEN" | "DONE" | "CANCELLED";
export type Member = { id: number; name: string };
export type MeetingItem = {
  id: number;
  title: string;
  meetingType: "BOARD" | "WORKING" | "PROJECT";
  status: MeetingStatus;
  startAt: string;
  endAt: string;
  timezone: string;
  ownerId: number;
  ownerName: string;
  participantCount: number;
  hasMinutes: boolean;
  version: number;
};
export type MeetingDetail = {
  meeting: MeetingItem;
  agenda: string;
  location: string;
  minutes: string;
  decisions: string;
  participants: Member[];
  history: {
    action: string;
    actorName: string;
    reason: string;
    occurredAt: string;
  }[];
  planning?: {
    objective: string;
    expectedResult: string;
    minutesOwner: Member;
    reminderMinutes: number;
    seriesId: number | null;
    occurrenceNumber: number | null;
    remindersPaused: boolean;
    seriesVersion: number;
  };
};
export type Agreement = {
  id: number;
  meetingId: number;
  meetingTitle: string;
  title: string;
  assigneeId: number;
  assigneeName: string;
  dueDate: string;
  status: AgreementStatus;
  resolution: string;
  version: number;
  meetingOwnerId: number;
};
export type MeetingChoice = {
  id: number;
  title: string;
  participants: Member[];
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type MeetingRequest = {
  title: string;
  meetingType: string;
  startAt: string;
  endAt: string;
  timezone: string;
  ownerId: number;
  participantIds: number[];
  agenda: string;
  location: string;
  expectedVersion?: number;
  objective?: string;
  expectedResult?: string;
  minutesOwnerId?: number;
  reminderMinutes?: number;
};
export type Recurrence = {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  count: number;
};
export type PlanRequest = {
  meeting: MeetingRequest;
  recurrence: Recurrence | null;
  saveFlowName: string;
  allowConflicts: boolean;
};
export type PlanPreview = {
  occurrences: {
    number: number;
    startAt: string;
    endAt: string;
    conflicts: number;
  }[];
  count: number;
  timezone: string;
  monthlyClamp: boolean;
  overlapUsesEarlierOffset: boolean;
};
export type PlanResult = {
  firstMeetingId: number;
  seriesId: number | null;
  count: number;
  flowId: number | null;
};
export type FlowItem = {
  id: number;
  name: string;
  settings: Omit<
    MeetingRequest,
    "startAt" | "endAt" | "timezone" | "expectedVersion"
  > & { durationMinutes: number };
  version: number;
};
export type SeriesItem = {
  id: number;
  title: string;
  frequency: Recurrence["frequency"];
  interval: number;
  count: number;
  timezone: string;
  remindersPaused: boolean;
  status: "ACTIVE" | "CANCELLED";
  version: number;
  nextAt: string | null;
  futurePlanned: number;
};
export type AgreementRequest = {
  meetingId: number;
  title: string;
  assigneeId: number;
  dueDate: string;
};
export type Metrics = {
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  awaitingClosure: number;
  missingMinutes: number;
  openAgreements: number;
  overdueAgreements: number;
  calculatedAt: string;
  timezone: string;
};
const root = "/api/v1/meetings";
const query = (params: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
const save = <T>(path: string, method: string, body: unknown, key?: string) =>
  apiClient<T>(root + path, {
    method,
    body: JSON.stringify(body),
    headers: key ? { "Idempotency-Key": key } : undefined,
  });
export const meetingApi = {
  preview: (body: PlanRequest) =>
    save<PlanPreview>("/planning/preview", "POST", body),
  plan: (body: PlanRequest, key: string) =>
    save<PlanResult>("/planning", "POST", body, key),
  flows: (signal: AbortSignal) =>
    apiClient<FlowItem[]>(`${root}/flows`, { signal }),
  series: (page: number, signal: AbortSignal) =>
    apiClient<Page<SeriesItem>>(`${root}/series?page=${page}`, { signal }),
  archiveFlow: (id: number, expectedVersion: number) =>
    save<void>(`/flows/${id}/archive`, "POST", { expectedVersion }),
  seriesCommand: (
    id: number,
    action: string,
    reason: string,
    expectedVersion: number,
  ) =>
    save<void>(`/series/${id}/control`, "POST", {
      action,
      reason,
      expectedVersion,
    }),
  previewFuture: (
    id: number,
    meeting: MeetingRequest,
    expectedSeriesVersion: number,
  ) =>
    save<PlanPreview>(`/${id}/future-planning/preview`, "POST", {
      meeting,
      expectedSeriesVersion,
    }),
  editFuture: (
    id: number,
    meeting: MeetingRequest,
    expectedSeriesVersion: number,
  ) =>
    save<MeetingDetail>(`/${id}/future-planning`, "PUT", {
      meeting,
      expectedSeriesVersion,
    }),
  list: (
    params: Record<string, string | number>,
    calendar: boolean,
    signal: AbortSignal,
  ) =>
    apiClient<Page<MeetingItem>>(
      `${root}${calendar ? "/calendar" : ""}?${query(params)}`,
      { signal },
    ),
  detail: (id: number, signal: AbortSignal) =>
    apiClient<MeetingDetail>(`${root}/${id}`, { signal }),
  members: (signal: AbortSignal) =>
    apiClient<{ items: Member[]; total: number }>(`${root}/members`, {
      signal,
    }),
  choices: (signal: AbortSignal) =>
    apiClient<MeetingChoice[]>(`${root}/agreement-meetings`, { signal }),
  assignees: (signal: AbortSignal) =>
    apiClient<{ items: Member[]; total: number }>(
      `${root}/agreement-assignees`,
      { signal },
    ),
  create: (body: MeetingRequest, key: string) =>
    save<MeetingDetail>("", "POST", body, key),
  edit: (id: number, body: MeetingRequest) =>
    save<MeetingDetail>(`/${id}`, "PUT", body),
  minutes: (
    id: number,
    body: { minutes: string; decisions: string; expectedVersion: number },
  ) => save<MeetingDetail>(`/${id}/minutes`, "PUT", body),
  status: (
    id: number,
    status: MeetingStatus,
    reason: string,
    expectedVersion: number,
  ) =>
    save<MeetingDetail>(`/${id}/status`, "POST", {
      status,
      reason,
      expectedVersion,
    }),
  agreements: (params: Record<string, string | number>, signal: AbortSignal) =>
    apiClient<Page<Agreement>>(`${root}/agreements?${query(params)}`, {
      signal,
    }),
  agreement: (body: AgreementRequest, key: string) =>
    save<Agreement>("/agreements", "POST", body, key),
  agreementStatus: (
    id: number,
    status: AgreementStatus,
    reason: string,
    expectedVersion: number,
  ) =>
    save<Agreement>(`/agreements/${id}/status`, "POST", {
      status,
      reason,
      expectedVersion,
    }),
  metrics: (params: Record<string, string | number>, signal: AbortSignal) =>
    apiClient<Metrics>(`${root}/metrics?${query(params)}`, { signal }),
};
