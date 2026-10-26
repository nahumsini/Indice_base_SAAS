import { apiClient } from "../../../lib/apiClient";
export type Audience = {
  contactId: number;
  name: string;
  email: string;
  eligibility: string;
};
import type { MailingFile } from "./mailingApi";
export type CampaignReview = {
  attachments?: MailingFile[];
  id: string;
  version: number;
  status: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  replyTo: string;
  sender: {
    id: string;
    email: string;
    name: string;
    version: number;
    verified: boolean;
  } | null;
  audience: Audience[];
  digest: string;
  canSend: boolean;
  publicLinkReady: boolean;
};
export type CampaignResults = {
  status: string;
  version: number;
  scheduledAt: string | null;
  lastError: string | null;
  items: {
    id: string;
    name: string;
    email: string;
    state: string;
    completedAt: string | null;
  }[];
  canSend: boolean;
};
const base = "/api/v1/mailing";
const post = <T>(path: string, body: unknown) =>
  apiClient<T>(base + path, { method: "POST", body: JSON.stringify(body) });
export const deliveryApi = {
  review: (id: string, signal?: AbortSignal) =>
    apiClient<CampaignReview>(`${base}/campaigns/${id}/review`, { signal }),
  results: (id: string, signal?: AbortSignal) =>
    apiClient<CampaignResults>(`${base}/campaigns/${id}/results`, { signal }),
  launch: (
    id: string,
    value: {
      version: number;
      accountVersion: number;
      digest: string;
      scheduledAt: string | null;
      footer: string;
      contactIds: number[];
    },
  ) => post<CampaignResults>(`/campaigns/${id}/launch`, value),
  test: (id: string, version: number, to: string, requestId: string) =>
    post<{ state: string }>(`/campaigns/${id}/test`, {
      version,
      to,
      requestId,
    }),
  control: (id: string, version: number, action: string) =>
    post<CampaignResults>(`/campaigns/${id}/control`, { version, action }),
};
