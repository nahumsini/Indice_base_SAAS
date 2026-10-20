import { apiClient } from "../../../lib/apiClient";
import type { MailingContact } from "./mailingApi";
export type AudienceContact = MailingContact & {
  companyName: string;
  contactPerson: string;
  ownerName: string;
  source: string;
  eligibility: string;
};
export type AudiencePage = {
  items: AudienceContact[];
  total: number;
  page: number;
  pageSize: number;
};
export type AudienceSummary = {
  selected: number;
  ready: number;
  consentRequired: number;
  excluded: number;
  items: AudienceContact[];
};
export type AudienceOptions = {
  sources: string[];
  owners: { value: string; label: string }[];
  tags: string[];
};
export type AudienceList = {
  id: string;
  name: string;
  version: number;
  contactCount: number;
  updatedAt: string;
};
export type ContactHistory = {
  items: {
    campaignId: string;
    name: string;
    subject: string;
    campaignStatus: string;
    deliveryState: string;
    email: string;
    scheduledAt: string | null;
    completedAt: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
};
const base = "/api/v1/mailing";
export const audienceApi = {
  contacts: (q: URLSearchParams, signal?: AbortSignal) =>
    apiClient<AudiencePage>(`${base}/audience?${q}`, { signal }),
  options: (signal?: AbortSignal) =>
    apiClient<AudienceOptions>(`${base}/audience/options`, { signal }),
  selection: (q: URLSearchParams, signal?: AbortSignal) =>
    apiClient<AudienceContact[]>(`${base}/audience/selection?${q}`, { signal }),
  preview: (contactIds: number[], signal?: AbortSignal) =>
    apiClient<AudienceSummary>(`${base}/audience/preview`, {
      method: "POST",
      body: JSON.stringify({ contactIds }),
      signal,
    }),
  lists: (signal?: AbortSignal) =>
    apiClient<AudienceList[]>(`${base}/audience/lists`, { signal }),
  list: (id: string) =>
    apiClient<{
      list: AudienceList;
      items: AudienceContact[];
      unavailable: number;
    }>(`${base}/audience/lists/${encodeURIComponent(id)}`),
  save: (id: string, name: string, contactIds: number[], version: number) =>
    apiClient<AudienceList>(
      `${base}/audience/lists/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify({ name, contactIds, version }) },
    ),
  archive: (list: AudienceList) =>
    apiClient<void>(
      `${base}/audience/lists/${encodeURIComponent(list.id)}/archive`,
      { method: "POST", body: JSON.stringify({ version: list.version }) },
    ),
  history: (id: string, page: number, signal?: AbortSignal) =>
    apiClient<ContactHistory>(
      `${base}/contacts/${encodeURIComponent(id)}/history?page=${page}&pageSize=10`,
      { signal },
    ),
};
