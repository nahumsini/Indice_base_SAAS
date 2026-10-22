import { apiClient } from '../../lib/apiClient';
export type MailboxAccount = { id: string; label: string; email: string; displayName: string; receiveProtocol: string; version: number };
export type MailboxFolder = { id: string; name: string; kind: string; unreadCount?: number; uidValidity: number; newestUid: number; oldestUid: number; hasOlder: boolean; syncedAt: string | null };
export type MailboxWorkspace = { folders: MailboxFolder[]; lastSyncAt: string | null; lastError: string | null };
export type MailboxMessage = {
  id: string; folderId: string | null; state: 'RECEIVED' | 'DRAFT' | 'SUBMITTING' | 'ACCEPTED' | 'FAILED' | 'UNKNOWN'; subject: string;
  fromAddress: string; fromName: string; to: string[]; cc: string[]; bcc: string[]; replyTo: string[];
  bodyHtml?: string | null; sentCopyState?: string; bodyText: string | null; bodyTruncated: boolean; hasAttachments: boolean; read: boolean; starred: boolean;
  occurredAt: string; version: number; failureCode: string | null;
};
export type MailDraft = { version: number; accountVersion: number; to: string[]; cc: string[]; bcc: string[]; subject: string; bodyText: string; replyToMessageId: string | null; bodyHtml?: string | null };
export type MailPage = { items: MailboxMessage[]; hasMore: boolean };
export type MailPreferencesData = {backgroundEnabled:boolean;sentFolder:string|null;version:number;nextSyncAt:string|null;failures:number;signature?:string;signatureHtml?:string|null;signatureNew?:boolean;signatureReply?:boolean};
export type MailAttachment = {id:string;filename:string;contentType:string;sizeBytes:number;remote:boolean};
const base = '/api/v1/email/mailboxes';
const request = <T,>(path: string, method: string, body: unknown) => apiClient<T>(path, { method, body: JSON.stringify(body) });
export type MailOperationalCounts = {unread:number;starred:number;drafts:number;review:number};
export const mailboxApi = {
  counts:(id:string,query:string,signal?:AbortSignal)=>apiClient<MailOperationalCounts>(`${base}/${id}/counts?query=${encodeURIComponent(query)}`,{signal}),
  preferences: (id:string,signal?:AbortSignal)=>apiClient<MailPreferencesData>(`${base}/${id}/preferences`,{signal}),
  savePreferences: (id:string,value:MailPreferencesData&{accountVersion:number})=>request<MailPreferencesData>(`${base}/${id}/preferences`,'PUT',value),
  sentCopy: (account:string,id:string)=>request<MailboxMessage>(`${base}/${account}/messages/${id}/sent-copy`,'POST',{}),
  attachments: (account:string,id:string,signal?:AbortSignal)=>apiClient<MailAttachment[]>(`${base}/${account}/messages/${id}/attachments`,{signal}),
  upload: (account:string,id:string,value:{filename:string;contentType:string;sizeBytes:number;version:number;accountVersion:number})=>request<{id:string;url:string;headers:Record<string,string>}>(`${base}/${account}/messages/${id}/attachments/upload`,'POST',value),
  register: (account:string,id:string,file:string,version:number,accountVersion:number)=>request<MailboxMessage>(`${base}/${account}/messages/${id}/attachments/${file}/register`,'POST',{version,accountVersion}),
  removeAttachment: (account:string,id:string,file:string,version:number,accountVersion:number)=>request<MailboxMessage>(`${base}/${account}/messages/${id}/attachments/${file}/remove`,'POST',{version,accountVersion}),
  downloadUrl: (account:string,id:string,file:string)=>`${base}/${account}/messages/${id}/attachments/${file}/download`,
  accounts: (signal?: AbortSignal) => apiClient<MailboxAccount[]>(base, { signal }),
  createFolder: (id:string,name:string,accountVersion:number)=>request<MailboxWorkspace>(`${base}/${id}/folders`,'POST',{name,accountVersion}),
  workspace: (id: string, signal?: AbortSignal) => apiClient<MailboxWorkspace>(`${base}/${id}`, { signal }),
  list: (id: string, folder: string, query: string, offset: number, signal?: AbortSignal, filter = 'ALL') => apiClient<MailPage>(`${base}/${id}/messages?${new URLSearchParams({ folder, query, filter, offset: String(offset) })}`, { signal }),
  get: (account: string, id: string) => apiClient<MailboxMessage>(`${base}/${account}/messages/${id}`),
  open: (account: string, id: string) => request<MailboxMessage>(`${base}/${account}/messages/${id}/open`, 'POST', {}),
  sync: (id: string, folderId: string | null = null, older = false) => request<MailboxWorkspace>(`${base}/${id}/sync`, 'POST', { folderId, older }),
  save: (account: string, id: string, draft: MailDraft) => request<MailboxMessage>(`${base}/${account}/drafts/${id}`, 'PUT', draft),
  send: (account: string, message: MailboxMessage, accountVersion: number) => request<MailboxMessage>(`${base}/${account}/drafts/${message.id}/send`, 'POST', { version: message.version, accountVersion }),
  discard: (account: string, message: MailboxMessage, accountVersion: number) => request<void>(`${base}/${account}/drafts/${message.id}/discard`, 'POST', { version: message.version, accountVersion }),
  action: (account: string, message: MailboxMessage, accountVersion: number, action: string, targetFolderId: string | null = null) => request<MailboxMessage>(`${base}/${account}/messages/${message.id}/action`, 'POST', { version: message.version, accountVersion, action, targetFolderId }),
};
