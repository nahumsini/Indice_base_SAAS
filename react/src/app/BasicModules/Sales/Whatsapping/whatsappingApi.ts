import { apiClient } from "../../../lib/apiClient";
export type Step = { name: string; delayDays: number; body: string };
export type CampaignInput = {
  name: string;
  objective: string;
  offer: string;
  defaultRegion: string;
  resourceUrl: string;
  steps: Step[];
  contactIds: number[];
  version: number;
};
export type Campaign = Omit<CampaignInput, "contactIds"> & {
  id: string;
  status: string;
  ownerUserId: number;
  ownerName: string;
  updatedAt: string;
  total: number;
  done: number;
  pending: number;
  due: number;
  canEdit: boolean;
};
export type Contact = {
  id: number;
  name: string;
  companyName: string;
  phone: string;
  ownerName: string;
  source: string;
  eligibility: string;
};
export type Recipient = {
  contact: Contact;
  stepIndex: number;
  state: string;
  nextActionAt: string | null;
  notes: string;
  version: number;
  message: string;
  eligibility: string;
};
export type Event = {
  id: number;
  contactId: number | null;
  actorName: string;
  action: string;
  stepIndex: number | null;
  occurredAt: string;
};
export type Detail = {
  campaign: Campaign;
  recipients: Recipient[];
  events: Event[];
};
export type Page = {
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  owners: { id: number; name: string }[];
};
export type ContactPage = {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
};
export type Template = {
  id: string;
  name: string;
  body: string;
  status: string;
  version: number;
};
export type SavedList = {
  id: string;
  name: string;
  contactIds: number[];
  version: number;
};
export type Action = "PREPARE" | "SENT" | "SKIP" | "REPLIED" | "BLOCK" | "NOTE";
const base = "/api/v1/sales/whatsapping";
const write = <T>(path: string, body: unknown, method = "PUT") =>
  apiClient<T>(base + path, { method, body: JSON.stringify(body) });
export const whatsappingApi = {
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    apiClient<Page>(`${base}/campaigns?${query}`, { signal }),
  get: (id: string, signal?: AbortSignal) =>
    apiClient<Detail>(`${base}/campaigns/${encodeURIComponent(id)}`, {
      signal,
    }),
  save: (id: string, input: CampaignInput) =>
    write<Detail>(`/campaigns/${id}`, input),
  state: (id: string, version: number, status: string) =>
    write<Detail>(`/campaigns/${id}/state`, { version, status }, "POST"),
  action: (
    id: string,
    contact: number,
    version: number,
    action: Action,
    notes: string,
    nextActionAt: string | null,
  ) =>
    write<{ detail: Detail; whatsappUrl: string | null }>(
      `/campaigns/${id}/recipients/${contact}/actions`,
      { version, action, notes, nextActionAt },
      "POST",
    ),
  contacts: (query: URLSearchParams, signal?: AbortSignal) =>
    apiClient<ContactPage>(`${base}/contacts?${query}`, { signal }),
  selection: (search: string, region: string, signal?: AbortSignal) =>
    apiClient<Contact[]>(
      `${base}/contacts/selection?${new URLSearchParams({ search, region })}`,
      { signal },
    ),
  templates: (signal?: AbortSignal) =>
    apiClient<Template[]>(`${base}/templates`, { signal }),
  saveTemplate: (input: Template) =>
    write<Template[]>(`/templates/${input.id}`, input),
  lists: (signal?: AbortSignal) =>
    apiClient<SavedList[]>(`${base}/lists`, { signal }),
  saveList: (input: SavedList) =>
    write<SavedList[]>(`/lists/${input.id}`, input),
};
