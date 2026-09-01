import type { AiConnection } from '../../../api/aiConnections';

export type ConnectionStatus = 'active' | 'expired' | 'revoked';

export function getConnectionStatus(connection: AiConnection): ConnectionStatus {
  if (connection.revokedAt) return 'revoked';
  if (new Date(connection.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

export function formatConnectionDate(
  value: string | null | undefined,
  locale: string,
  emptyLabel: string,
) {
  if (!value) return emptyLabel;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}
