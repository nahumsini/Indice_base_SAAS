import { creditRules } from '../data';
import type { CreditEvaluationContext, CreditEvaluationResult, CreditRule } from '../types';

const STORAGE_KEY = 'indice.pos.creditRules';
const DEFAULT_TERM_DAYS = 15;
const DEFAULT_REVIEW_THRESHOLD = 80;

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

function cloneRules(rules: CreditRule[]) {
  return rules.map((rule) => ({ ...rule }));
}

function sanitizeRule(rule: CreditRule, index: number): CreditRule {
  return {
    ...rule,
    id: rule.id || `credit-${index + 1}`,
    name: rule.name || rule.customerGroup || rule.customerId || `Regla ${index + 1}`,
    currency: rule.currency || 'MXN',
    creditLimit: Number(rule.creditLimit) || 0,
    paymentTermDays: Number(rule.paymentTermDays) || DEFAULT_TERM_DAYS,
    lateInterestRate: Number(rule.lateInterestRate) || 0,
    penaltyFee: Number(rule.penaltyFee) || 0,
    gracePeriodDays: Number(rule.gracePeriodDays) || 0,
    minimumTicketAmount: rule.minimumTicketAmount ? Number(rule.minimumTicketAmount) : undefined,
    requiresApprovalAbove: rule.requiresApprovalAbove ? Number(rule.requiresApprovalAbove) : undefined,
    reviewAtUtilizationPercent: rule.reviewAtUtilizationPercent
      ? Number(rule.reviewAtUtilizationPercent)
      : DEFAULT_REVIEW_THRESHOLD,
    maxOpenInvoices: rule.maxOpenInvoices ? Number(rule.maxOpenInvoices) : undefined,
    blockWhenOverdue: Boolean(rule.blockWhenOverdue),
  };
}

export function calculateCreditStatus(rule: CreditRule) {
  if (rule.status === 'suspended') {
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

export function readStoredCreditRules() {
  if (typeof window === 'undefined') {
    return cloneRules(creditRules);
  }

  try {
    const storedRules = window.localStorage.getItem(STORAGE_KEY);
    if (!storedRules) {
      return cloneRules(creditRules);
    }

    const parsedRules = JSON.parse(storedRules) as CreditRule[];
    return parsedRules.map(sanitizeRule);
  } catch {
    return cloneRules(creditRules);
  }
}

export function saveStoredCreditRules(rules: CreditRule[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules.map(sanitizeRule)));
}

export function resetStoredCreditRules() {
  const defaults = cloneRules(creditRules);
  saveStoredCreditRules(defaults);
  return defaults;
}

export function getCreditDueDate(rule: CreditRule, saleDate = new Date()) {
  const dueDate = new Date(saleDate);
  dueDate.setDate(dueDate.getDate() + rule.paymentTermDays);
  return dueDate;
}

export function findCreditRuleForCustomer(rules: CreditRule[], context: Partial<CreditEvaluationContext>) {
  const exactCustomerRule = rules.find((rule) => rule.customerId && rule.customerId === context.customerId);
  if (exactCustomerRule) {
    return exactCustomerRule;
  }

  const customerGroup = normalize(context.customerGroup);
  const groupRule = rules.find((rule) => rule.customerGroup && normalize(rule.customerGroup) === customerGroup);
  if (groupRule) {
    return groupRule;
  }

  const typeRule = rules.find((rule) => {
    const group = normalize(rule.customerGroup);
    return (context.customerType === 'business' && (group.includes('business') || group.includes('corporate')))
      || (context.customerType === 'individual' && (group.includes('retail') || group.includes('frequent')));
  });

  return typeRule ?? rules.find((rule) => !rule.customerId && !rule.customerGroup);
}

export function evaluateCreditPurchase(
  rule: CreditRule,
  context: CreditEvaluationContext,
): CreditEvaluationResult {
  const ticketAmount = Math.max(0, Number(context.ticketAmount) || 0);
  const currentBalance = Math.max(0, Number(context.currentBalance) || 0);
  const projectedBalance = currentBalance + ticketAmount;
  const availableCredit = Math.max(0, rule.creditLimit - currentBalance);
  const utilizationPercent = rule.creditLimit > 0 ? Math.round((projectedBalance / rule.creditLimit) * 100) : 100;
  const reviewThreshold = rule.reviewAtUtilizationPercent ?? DEFAULT_REVIEW_THRESHOLD;
  const overdueBalance = Number(context.overdueBalance) || 0;
  const openInvoices = Number(context.openInvoices) || 0;
  const messages: string[] = [];
  let decision: CreditEvaluationResult['decision'] = 'approved';

  if (rule.status === 'suspended') {
    decision = 'blocked';
    messages.push('Regla suspendida: no autoriza ventas a credito.');
  } else if (rule.status === 'inactive') {
    decision = 'review';
    messages.push('Regla inactiva: requiere autorizacion comercial.');
  }

  if (ticketAmount <= 0) {
    decision = 'review';
    messages.push('Captura un monto para evaluar el credito.');
  }

  if (rule.minimumTicketAmount && ticketAmount > 0 && ticketAmount < rule.minimumTicketAmount) {
    decision = 'blocked';
    messages.push(`Ticket menor al minimo autorizado (${rule.minimumTicketAmount}).`);
  }

  if (rule.blockWhenOverdue && overdueBalance > 0) {
    decision = 'blocked';
    messages.push('Cliente con saldo vencido: bloquea nueva venta a credito.');
  }

  if (projectedBalance > rule.creditLimit) {
    decision = 'blocked';
    messages.push('El monto excede el limite de credito disponible.');
  }

  if (rule.maxOpenInvoices && openInvoices > rule.maxOpenInvoices && decision !== 'blocked') {
    decision = 'review';
    messages.push('Demasiadas facturas abiertas para aprobacion automatica.');
  }

  if (rule.requiresApprovalAbove && ticketAmount >= rule.requiresApprovalAbove && decision !== 'blocked') {
    decision = 'review';
    messages.push('El monto requiere aprobacion por politica.');
  }

  if (utilizationPercent >= reviewThreshold && decision !== 'blocked') {
    decision = 'review';
    messages.push('La utilizacion de linea queda en zona de revision.');
  }

  if (messages.length === 0) {
    messages.push('Credito aprobado con plazo configurado.');
  }

  return {
    decision,
    availableCredit,
    projectedBalance,
    utilizationPercent,
    dueDate: getCreditDueDate(rule, context.saleDate),
    daysToPay: rule.paymentTermDays,
    lateInterestEstimate: ticketAmount * (rule.lateInterestRate / 100),
    penaltyFee: rule.penaltyFee,
    messages,
  };
}
