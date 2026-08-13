import type { DistributorClient } from '../types/contractsAccess';

export function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CL';
}

export function formatContract(client: DistributorClient) {
  if (!client.offer_code) return '';
  return client.offer_code.replace(/_/g, ' ');
}

export function formatDate(value: string | null, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatSystemValue(value: string | null) {
  return value ? value.replace(/_/g, ' ').toLowerCase() : '—';
}
