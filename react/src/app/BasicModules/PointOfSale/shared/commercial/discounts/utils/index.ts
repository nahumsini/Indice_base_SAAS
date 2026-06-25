import { discountRules as defaultDiscountRules } from '../data';
import type { DiscountEligibilityContext, DiscountRule } from '../types';

const DISCOUNT_RULES_STORAGE_KEY = 'indice.pos.discountRules';

function reviveDiscountRule(rule: DiscountRule): DiscountRule {
  return {
    ...rule,
    startsAt: new Date(String(rule.startsAt)),
    endsAt: new Date(String(rule.endsAt)),
  };
}

export function calculateDiscountPreview(rule: DiscountRule, amount: number) {
  if (rule.minimumAmount && amount < rule.minimumAmount) {
    return 0;
  }

  const calculatedAmount = rule.discountType === 'percentage'
    ? amount * (rule.value / 100)
    : Math.min(rule.value, amount);

  return rule.maximumDiscountAmount
    ? Math.min(calculatedAmount, rule.maximumDiscountAmount)
    : calculatedAmount;
}

export function isDiscountActive(rule: DiscountRule, date = new Date()) {
  return rule.status === 'active' && rule.startsAt <= date && rule.endsAt >= date;
}

export function readStoredDiscountRules(): DiscountRule[] {
  if (typeof window === 'undefined') {
    return defaultDiscountRules;
  }

  try {
    const serialized = window.localStorage.getItem(DISCOUNT_RULES_STORAGE_KEY);
    if (!serialized) {
      return defaultDiscountRules;
    }

    return (JSON.parse(serialized) as DiscountRule[]).map(reviveDiscountRule);
  } catch (error) {
    console.warn('Unable to read POS discount rules', error);
    return defaultDiscountRules;
  }
}

export function saveStoredDiscountRules(rules: DiscountRule[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DISCOUNT_RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (error) {
    console.warn('Unable to save POS discount rules', error);
  }
}

export function resetStoredDiscountRules() {
  saveStoredDiscountRules(defaultDiscountRules);
  return defaultDiscountRules;
}

export function getDiscountRuleAmount(rule: DiscountRule, amount: number) {
  return calculateDiscountPreview(rule, amount);
}

export function getEligibleDiscountRules(
  rules: DiscountRule[],
  context: DiscountEligibilityContext,
) {
  const date = context.date ?? new Date();

  return rules
    .filter((rule) => isDiscountActive(rule, date))
    .filter((rule) => !rule.minimumAmount || context.amount >= rule.minimumAmount)
    .filter((rule) => {
      if (context.scope && rule.scope !== context.scope && rule.scope !== 'manual') {
        return false;
      }

      if (rule.scope === 'product') {
        return Boolean(rule.productId && context.productId && rule.productId === context.productId);
      }

      if (rule.scope === 'category') {
        return Boolean(rule.category && context.category && rule.category === context.category);
      }

      if (rule.scope === 'customer') {
        return Boolean(rule.customerType && context.customerType && rule.customerType === context.customerType);
      }

      if (rule.scope === 'order') {
        return context.scope === 'order';
      }

      return true;
    })
    .sort((first, second) => (second.priority ?? 0) - (first.priority ?? 0));
}
