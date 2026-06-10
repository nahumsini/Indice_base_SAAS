import type { CreditRule } from '../types';

export function calculateCreditStatus(rule: CreditRule) {
  if (rule.status === 'suspended' || rule.blockWhenOverdue) {
    return rule.status;
  }

  return rule.riskLevel === 'high' ? 'review' : 'ok';
}

export function getAveragePaymentTerm(rules: CreditRule[]) {
  if (rules.length === 0) {
    return 0;
  }

  return Math.round(rules.reduce((sum, rule) => sum + rule.paymentTermDays, 0) / rules.length);
}
