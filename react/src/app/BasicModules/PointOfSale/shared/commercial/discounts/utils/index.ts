import type { DiscountEligibilityContext, DiscountRule } from '../types';

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
    .filter((rule) => !context.channel || rule.enabledChannels.includes(context.channel))
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

export function calculateAutomaticDiscounts(
  rules: DiscountRule[],
  lines: Array<{ key: string | number; amount: number; productId?: string; category?: string }>,
  channel: NonNullable<DiscountEligibilityContext['channel']>,
) {
  const lineApplications = lines.map((line) => {
    const candidates = getEligibleDiscountRules(rules, {
      amount: line.amount,
      productId: line.productId,
      category: line.category,
      channel,
    }).filter((rule) => !rule.requiresAuthorization && ['product', 'category'].includes(rule.scope));
    const rule = candidates.reduce<DiscountRule | undefined>((best, candidate) => (
      !best || calculateDiscountPreview(candidate, line.amount) > calculateDiscountPreview(best, line.amount)
        ? candidate : best
    ), undefined);
    return { key: line.key, rule, amount: rule ? calculateDiscountPreview(rule, line.amount) : 0 };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const orderCandidates = getEligibleDiscountRules(rules, { amount: subtotal, scope: 'order', channel })
    .filter((rule) => !rule.requiresAuthorization && rule.scope === 'order');
  const orderRule = orderCandidates.reduce<DiscountRule | undefined>((best, candidate) => (
    !best || calculateDiscountPreview(candidate, subtotal) > calculateDiscountPreview(best, subtotal)
      ? candidate : best
  ), undefined);
  const orderAmount = orderRule ? calculateDiscountPreview(orderRule, subtotal) : 0;
  const lineAmount = lineApplications.reduce((sum, application) => sum + application.amount, 0);
  if (orderAmount >= lineAmount && orderAmount > 0) {
    return { subtotal, discountAmount: orderAmount, total: subtotal - orderAmount, orderRule, lineApplications: [] };
  }
  return { subtotal, discountAmount: lineAmount, total: subtotal - lineAmount, orderRule: undefined, lineApplications };
}
