import { salesApi } from '../../salesApi';
import type { CommissionRule } from '../types/commissions';

type CommissionRuleRow = Record<string, unknown>;

const text = (value: unknown) => value == null ? '' : String(value);
const number = (value: unknown) => Number(value) || 0;
const texts = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];

function fromApi(row: CommissionRuleRow): CommissionRule {
  const backendId = number(row.id);
  return {
    id: text(row.ruleCode) || `CR-${backendId}`,
    backendId: backendId || undefined,
    name: text(row.name),
    userId: text(row.userId),
    userName: text(row.userName),
    userIds: texts(row.userIds),
    userNames: texts(row.userNames),
    productId: text(row.productId),
    productName: text(row.productName),
    productIds: texts(row.productIds),
    productNames: texts(row.productNames),
    categoryId: text(row.categoryId),
    categoryName: text(row.categoryName),
    type: (text(row.type) || 'percentage_of_sale') as CommissionRule['type'],
    value: number(row.value),
    validFrom: text(row.validFrom),
    validUntil: text(row.validUntil),
    status: (text(row.status) || 'active') as CommissionRule['status'],
    priority: number(row.priority),
    notes: text(row.notes),
  };
}

function toApi(rule: CommissionRule): Record<string, unknown> {
  return {
    ruleCode: rule.id || undefined,
    name: rule.name,
    userId: rule.userId || null,
    userName: rule.userName || null,
    userIds: rule.userIds,
    userNames: rule.userNames,
    productId: rule.productId || null,
    productName: rule.productName || null,
    productIds: rule.productIds,
    productNames: rule.productNames,
    categoryId: rule.categoryId || null,
    categoryName: rule.categoryName || null,
    type: rule.type,
    value: rule.value,
    validFrom: rule.validFrom || null,
    validUntil: rule.validUntil || null,
    status: rule.status,
    priority: rule.priority,
    notes: rule.notes || null,
  };
}

export const commissionRulesService = {
  async list() {
    const response = await salesApi.list<CommissionRuleRow>('commission-rules');
    return response.items.map(fromApi);
  },
  async save(rule: CommissionRule) {
    const saved = rule.backendId
      ? await salesApi.update<CommissionRuleRow>('commission-rules', rule.backendId, toApi(rule))
      : await salesApi.create<CommissionRuleRow>('commission-rules', toApi(rule));
    return fromApi(saved);
  },
  async delete(rule: CommissionRule) {
    if (rule.backendId) await salesApi.delete('commission-rules', rule.backendId);
  },
  async preview(rule: CommissionRule, input: { saleAmount: number; productAmount: number; quantity: number; currency: string }) {
    return salesApi.previewCommissionRule({ rule: toApi(rule), input });
  },
};
