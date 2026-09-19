import type { PlatformBenefit } from '../../api/platformAdmin';

// A stored ACTIVE grant may be expired or scheduled. This is presentation only;
// the backend remains responsible for effective entitlements.
export function benefitEffectiveStatus(benefit: PlatformBenefit, now = Date.now()): string {
  if (benefit.status.toUpperCase() !== 'ACTIVE') return benefit.status.toUpperCase();
  const start = Date.parse(benefit.starts_at);
  const end = benefit.ends_at ? Date.parse(benefit.ends_at) : null;
  if (!Number.isFinite(start) || (end !== null && !Number.isFinite(end))) return 'UNKNOWN';
  if (end !== null && end <= now) return 'EXPIRED';
  if (start > now) return 'SCHEDULED';
  return 'ACTIVE';
}

export function activeProductBenefits(benefits: PlatformBenefit[], now = Date.now()) {
  const grouped = new Map<string, PlatformBenefit[]>();
  for (const benefit of benefits) {
    if (benefit.product_code && benefitEffectiveStatus(benefit, now) === 'ACTIVE') {
      grouped.set(benefit.product_code, [...(grouped.get(benefit.product_code) ?? []), benefit]);
    }
  }
  return grouped;
}

export function nextBenefitEnd(benefits: PlatformBenefit[], now = Date.now()): string | undefined {
  return benefits
    .filter((benefit) => benefit.benefit_type === 'PRODUCT' && benefitEffectiveStatus(benefit, now) === 'ACTIVE' && benefit.ends_at)
    .map((benefit) => benefit.ends_at as string)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}
