import { apiClient } from "../../../lib/apiClient";
import type { MailingSender } from "../../../ComplementaryModules/Email/emailApi";
export type MailingFile = { id: string; filename: string; contentType: string; sizeBytes: number };
export type MailingContact = { id: number; name: string; email: string };
export type Campaign = {
  id: string;
  name: string;
  subject: string;
  senderName: string;
  senderAccountId: string | null;
  replyTo: string;
  previewText: string;
  bodyText: string;
  bodyHtml?: string | null;
  attachments?: MailingFile[];
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
  version: number;
  recipientCount: number;
  updatedAt: string;
  recipients: MailingContact[];
};
export type Draft = Pick<
  Campaign,
  | "name"
  | "subject"
  | "senderAccountId"
  | "senderName"
  | "replyTo"
  | "previewText"
  | "bodyText"
  | "bodyHtml"
  | "version"
> & { contactIds: number[]; attachmentIds?: string[] };
export type CampaignPage = {
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canViewDetails: boolean;
};
const base = "/api/v1/mailing";
export const mailingApi = {
  senders: (signal?: AbortSignal) => apiClient<MailingSender[]>(`${base}/senders`, { signal }),
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    apiClient<CampaignPage>(`${base}/campaigns?${query}`, { signal }),
  get: (id: string, signal?: AbortSignal) =>
    apiClient<Campaign>(`${base}/campaigns/${encodeURIComponent(id)}`, { signal }),
  save: (id: string, body: Draft) =>
    apiClient<Campaign>(`${base}/campaigns/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  contacts: (query: URLSearchParams, signal?: AbortSignal) =>
    apiClient<{ items: MailingContact[]; total: number }>(
      `${base}/contacts?${query}`,
      { signal },
    ),
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyText: string;
  bodyHtml?: string | null;
  attachments?: MailingFile[];
  status: "ACTIVE" | "ARCHIVED";
  version: number;
  updatedAt: string;
};
export type TemplateInput = Pick<
  EmailTemplate,
  "name" | "subject" | "previewText" | "bodyText" | "bodyHtml" | "version"
> & { attachmentIds?: string[]; requestId?: string };
export type TemplatePage = {
  items: EmailTemplate[];
  total: number;
  page: number;
  pageSize: number;
  canManage: boolean;
};
export const templateApi = {
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    apiClient<TemplatePage>(`${base}/templates?${query}`, { signal }),
  get: (id: string) =>
    apiClient<EmailTemplate>(`${base}/templates/${encodeURIComponent(id)}`),
  save: (id: string, body: TemplateInput) =>
    apiClient<EmailTemplate>(`${base}/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  status: (template: EmailTemplate, status: EmailTemplate["status"]) =>
    apiClient<EmailTemplate>(
      `${base}/templates/${encodeURIComponent(template.id)}/status`,
      {
        method: "POST",
        body: JSON.stringify({ status, version: template.version }),
      },
    ),
};

export const mailingFileApi = {
  upload: (body: {requestId:string;filename:string;contentType:string;sizeBytes:number}) => apiClient<{id:string;url:string;headers:Record<string,string>}>(`${base}/template-files/upload`, {method:'POST',body:JSON.stringify(body)}),
  register: (id:string) => apiClient<MailingFile>(`${base}/template-files/${encodeURIComponent(id)}/register`, {method:'POST',body:'{}'}),
  downloadUrl: (id:string) => `${base}/template-files/${encodeURIComponent(id)}/download`,
};
