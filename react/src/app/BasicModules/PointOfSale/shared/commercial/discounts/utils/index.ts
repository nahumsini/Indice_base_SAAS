import type { DiscountRule } from '../types';

export function calculateDiscountPreview(rule: DiscountRule, amount: number) {
  if (rule.minimumAmount && amount < rule.minimumAmount) {
    return 0;
  }

  return rule.discountType === 'percentage'
    ? amount * (rule.value / 100)
    : Math.min(rule.value, amount);
}

export function isDiscountActive(rule: DiscountRule, date = new Date()) {
  return rule.status === 'active' && rule.startsAt <= date && rule.endsAt >= date;
}
