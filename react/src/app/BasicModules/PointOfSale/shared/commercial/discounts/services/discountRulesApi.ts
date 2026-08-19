import { apiClient } from '../../../../../../lib/apiClient';
import type { DiscountRule } from '../types';

export type DiscountRuleWire = Omit<DiscountRule, 'startsAt' | 'endsAt' | 'productId'> & {
  startsAt: string;
  endsAt: string;
  productId?: number | null;
};

type RuleListWire = { items: DiscountRuleWire[]; count: number };
type EvaluationWire = {
  items: Array<{
    rule: DiscountRuleWire;
    discountAmount: number;
    authorizationRequired: boolean;
    currentUserCanAuthorize: boolean;
  }>;
  count: number;
};

export type DiscountEvaluationInput = {
  channel: 'pos' | 'sales' | 'kiosk' | 'publicCatalog';
  amount: number;
  productId?: number | null;
  category?: string;
  customerType?: 'individual' | 'business';
  scope?: 'product' | 'category' | 'customer' | 'order' | 'manual';
  currencyCode: string;
  warehouseId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
};

export const mapDiscountRule = (rule: DiscountRuleWire): DiscountRule => ({
  ...rule,
  startsAt: new Date(rule.startsAt),
  endsAt: new Date(rule.endsAt),
  productId: rule.productId == null ? undefined : String(rule.productId),
});

const bodyFor = (rule: DiscountRule) => JSON.stringify({
  unitId: rule.unitId ?? null,
  businessId: rule.businessId ?? null,
  warehouseId: rule.warehouseId ?? null,
  name: rule.name,
  description: rule.description,
  scope: rule.scope,
  discountType: rule.discountType,
  value: rule.value,
  currencyCode: rule.currencyCode ?? 'MXN',
  startsAt: rule.startsAt.toISOString(),
  endsAt: rule.endsAt.toISOString(),
  minimumAmount: rule.minimumAmount ?? null,
  maximumDiscountAmount: rule.maximumDiscountAmount ?? null,
  customerType: rule.customerType ?? null,
  productId: rule.productId ? Number(rule.productId) : null,
  category: rule.category ?? null,
  requiresAuthorization: rule.requiresAuthorization,
  stackable: Boolean(rule.stackable),
  priority: rule.priority ?? 0,
  enabledChannels: rule.enabledChannels,
  version: rule.version ?? null,
});

export async function listDiscountRules() {
  const response = await apiClient<RuleListWire>('/api/v1/pos/discounts');
  return response.items.map(mapDiscountRule);
}

export async function saveDiscountRule(rule: DiscountRule) {
  const existing = typeof rule.id === 'number';
  const response = await apiClient<DiscountRuleWire>(existing ? `/api/v1/pos/discounts/${rule.id}` : '/api/v1/pos/discounts', {
    method: existing ? 'PUT' : 'POST',
    body: bodyFor(rule),
  });
  return mapDiscountRule(response);
}

export async function setDiscountRuleStatus(rule: DiscountRule, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
  const response = await apiClient<DiscountRuleWire>(`/api/v1/pos/discounts/${rule.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, version: rule.version ?? null }),
  });
  return mapDiscountRule(response);
}

export async function evaluateDiscountRules(input: DiscountEvaluationInput) {
  return evaluateAt('/api/v1/pos/discounts/evaluate', input);
}

export async function evaluateSalesDiscountRules(input: DiscountEvaluationInput) {
  return evaluateAt('/api/v1/sales/discounts/evaluate', input);
}

async function evaluateAt(endpoint: string, input: DiscountEvaluationInput) {
  const response = await apiClient<EvaluationWire>(endpoint, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.items.map((item) => ({
    ...mapDiscountRule(item.rule),
    evaluatedDiscountAmount: Number(item.discountAmount),
    currentUserCanAuthorize: item.currentUserCanAuthorize,
  }));
}

export async function listPublishedDiscountRules(input: Pick<DiscountEvaluationInput, 'channel' | 'currencyCode' | 'warehouseId' | 'unitId' | 'businessId'>) {
  const query = new URLSearchParams({ channel: input.channel, currencyCode: input.currencyCode });
  if (input.warehouseId != null) query.set('warehouseId', String(input.warehouseId));
  if (input.unitId != null) query.set('unitId', String(input.unitId));
  if (input.businessId != null) query.set('businessId', String(input.businessId));
  const response = await apiClient<DiscountRuleWire[]>(`/api/v1/pos/discounts/published?${query.toString()}`);
  return response.map(mapDiscountRule);
}
