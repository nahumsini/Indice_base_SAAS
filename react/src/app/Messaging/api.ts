import { apiClient } from '../lib/apiClient';
import type { Audit, CareSummary, Conversation, CreateConversation, Detail, Message, MessagingContext, MessagingPortal, Page, Person, PhotoUpload } from './types';

export const messagingBase = (portal: MessagingPortal) => portal === 'member' ? '/api/v1/messaging'
  : portal === 'platform' ? '/api/v1/platform-admin/customer-care' : '/api/v1/distributor-portal/customer-care';
export const messagingApi = (portal: MessagingPortal) => {
  const base = messagingBase(portal);
  return {
    context: () => apiClient<MessagingContext>(`${base}/context`),
    directory: (q: string) => apiClient<Person[]>(`${base}/directory?${new URLSearchParams({ q })}`),
    list: (filter: string, q: string, offset = 0) => apiClient<Page<Conversation>>(`${base}/conversations?${new URLSearchParams({ filter, q, offset: String(offset) })}`),
    detail: (id: number, after = 0, before = 0) => apiClient<Detail>(`${base}/conversations/${id}?after=${after}&before=${before}`),
    create: (request: CreateConversation) => apiClient<Detail>(`${base}/conversations`, { method: 'POST', body: JSON.stringify(request) }),
    send: (id: number, body: string, visibility: string, requestKey: string, attachmentIds: string[] = []) => apiClient<Message>(`${base}/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body, visibility, requestKey, attachmentIds }) }),
    presignPhoto: (id: number, file: File, requestKey: string) => apiClient<PhotoUpload>(`${base}/conversations/${id}/attachments`, { method: 'POST', body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size, requestKey }) }),
    photo: (id: number, attachmentId: string) => apiClient<{ url: string }>(`${base}/conversations/${id}/attachments/${encodeURIComponent(attachmentId)}`),
    read: (id: number, messageId: number) => apiClient<void>(`${base}/conversations/${id}/read`, { method: 'POST', body: JSON.stringify({ messageId }) }),
    change: (id: number, version: number, action: string, assigneeUserId: number | null = null, value: string | null = null) => apiClient<void>(`${base}/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ version, action, assigneeUserId, value }) }),
    summary: () => apiClient<CareSummary>(`${base}/summary`),
    assignees: () => apiClient<Person[]>(`${base}/assignees`),
    audit: (id: number, before = 0) => apiClient<Audit[]>(`${base}/conversations/${id}/audit?before=${before}`),
  };
};
