import { apiClient } from "../../../lib/apiClient";
import type { Campaign } from "./mailingApi";
import type { MailingSender } from "../../../ComplementaryModules/Email/emailApi";
export type DeliveryCounts = {
  total: number;
  pending: number;
  submitting: number;
  accepted: number;
  failed: number;
  unknown: number;
  suppressed: number;
  cancelled: number;
};
export type CampaignRow = Pick<
  Campaign,
  | "id"
  | "name"
  | "subject"
  | "senderAccountId"
  | "senderName"
  | "status"
  | "updatedAt"
> & {
  scheduledAt: string | null;
  selectedCount: number;
  delivery: DeliveryCounts;
  requiresAttention: boolean;
};
export type CampaignWorkspace = {
  items: CampaignRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    total: number;
    draft: number;
    scheduled: number;
    running: number;
    paused: number;
    completed: number;
    cancelled: number;
    attention: number;
  };
  senders: MailingSender[];
  publicLinkReady: boolean;
  canEdit: boolean;
  canViewDetails: boolean;
};
export const workspaceApi = {
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    apiClient<CampaignWorkspace>(`/api/v1/mailing/workspace?${query}`, {
      signal,
    }),
};
export function processedCount(counts: DeliveryCounts) {
  return (
    counts.accepted +
    counts.failed +
    counts.unknown +
    counts.suppressed +
    counts.cancelled
  );
}
export function campaignAction(status: Campaign["status"], canEdit: boolean) {
  if (status === "DRAFT") return canEdit ? "continueDraft" : "reviewSend";
  return ["SCHEDULED", "RUNNING", "PAUSED"].includes(status)
    ? "viewProgress"
    : "viewResults";
}
