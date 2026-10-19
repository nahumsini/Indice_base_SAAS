import { apiClient } from '../../lib/apiClient';

export type ConnectionStatus = 'NOT_TESTED' | 'VERIFIED' | 'ERROR';
export type EmailAccount = {
  id: string; label: string; email: string; displayName: string;
  smtpHost: string; smtpPort: number; smtpSecurity: 'TLS' | 'STARTTLS'; smtpUsername: string;
  receiveProtocol: 'NONE' | 'IMAP' | 'POP3'; receiveHost: string; receivePort: number; receiveUsername: string;
  mailingEnabled: boolean; active: boolean; hasSmtpPassword: boolean; hasReceivePassword: boolean;
  smtpStatus: ConnectionStatus; receiveStatus: ConnectionStatus;
  smtpCheckedAt: string | null; receiveCheckedAt: string | null; version: number;
};
export type ConnectionTestResult = EmailAccount & { failureCode?: string | null };
export type AccountInput = Pick<EmailAccount, 'label' | 'email' | 'displayName' | 'smtpHost' | 'smtpPort' |
  'smtpSecurity' | 'smtpUsername' | 'receiveProtocol' | 'receiveHost' | 'receivePort' | 'receiveUsername' |
  'mailingEnabled' | 'version'> & { smtpPassword: string; receivePassword: string };
const base = '/api/v1/email/accounts';
export const emailAccountsApi = {
  list: (signal?: AbortSignal) => apiClient<{ items: EmailAccount[]; configurationAvailable: boolean }>(base, { signal }),
  save: (id: string, input: AccountInput) => apiClient<EmailAccount>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  test: (account: EmailAccount, channel: 'SMTP' | 'RECEIVE') => apiClient<ConnectionTestResult>(`${base}/${account.id}/test`, {
    method: 'POST', body: JSON.stringify({ version: account.version, channel }),
  }),
  disconnect: (account: EmailAccount) => apiClient<void>(`${base}/${account.id}/disconnect`, {
    method: 'POST', body: JSON.stringify({ version: account.version }),
  }),
};

/** Explicit Email → Sales projection. No credentials or mailbox access. */
export type MailingSender = Pick<EmailAccount, 'id' | 'label' | 'email' | 'displayName' | 'smtpStatus'>;
