import type { PlatformCompanySummary } from '../../api/platformAdmin';

export type CommercialView = 'pending' | 'MX' | 'CA';
export type Attention = 'billing' | 'trial' | 'country' | 'review';
export type DeadlineFilter = 'all' | 'overdue' | 'week' | 'undated';
export type DistributorFilter = 'all' | 'assigned' | 'unassigned';
export const mexicoSteps = ['received', 'diagnosis', 'guidedTrial', 'proposal', 'implementation', 'followUp'] as const;
export const canadaSteps = ['received', 'accessPending', 'selfTrial', 'subscription', 'operating', 'support'] as const;

// Country is geographic evidence, not an entitlement or a commercial contract.
export function registeredCountry(company: PlatformCompanySummary): string | null {
  const code = company.country_code?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

export function trialDeadline(company: PlatformCompanySummary): number | null {
  if (company.trial_permanent || !['trial', 'trialing'].includes((company.lifecycle_state || company.billing_status || '').toLowerCase())) return null;
  const value = company.trial_ends_at ? Date.parse(company.trial_ends_at) : NaN;
  return Number.isFinite(value) ? value : null;
}

export function attentionFor(company: PlatformCompanySummary, now: number): Attention {
  const billing = (company.billing_status ?? '').toLowerCase();
  const lifecycle = (company.lifecycle_state ?? '').toUpperCase();
  if (['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(billing)
    || ['GRACE', 'READ_ONLY', 'SUSPENDED', 'RETENTION', 'PURGE_PENDING'].includes(lifecycle)) return 'billing';
  const deadline = trialDeadline(company);
  if (deadline !== null && deadline <= now + 7 * 86400000) return 'trial';
  if (!registeredCountry(company)) return 'country';
  return 'review';
}

export function filterCompanies(companies: PlatformCompanySummary[], filters: {
  view: CommercialView; attention: 'all' | Attention; distributor: DistributorFilter; deadline: DeadlineFilter;
}, now: number) {
  return companies.filter(company => {
    if (company.platform_status === 'DELETED' || company.user_type !== 'SUPER_ADMIN') return false;
    const attention = attentionFor(company, now);
    if (filters.view === 'pending' ? attention === 'review' : registeredCountry(company) !== filters.view) return false;
    if (filters.attention !== 'all' && attention !== filters.attention) return false;
    if (filters.distributor === 'assigned' && !company.distributor_company_id) return false;
    if (filters.distributor === 'unassigned' && company.distributor_company_id) return false;
    const deadline = trialDeadline(company);
    if (filters.deadline === 'undated' && deadline !== null) return false;
    if (filters.deadline === 'overdue' && (deadline === null || deadline >= now)) return false;
    if (filters.deadline === 'week' && (deadline === null || deadline < now || deadline > now + 7 * 86400000)) return false;
    return true;
  }).sort((a, b) => (trialDeadline(a) ?? Infinity) - (trialDeadline(b) ?? Infinity) || a.id - b.id);
}

export function mergeCompanies(current: PlatformCompanySummary[], incoming: PlatformCompanySummary[]) {
  const byId = new Map(current.map(company => [company.id, company]));
  incoming.forEach(company => byId.set(company.id, company));
  return [...byId.values()];
}
