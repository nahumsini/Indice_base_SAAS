import type { SaleLine, SaleRecord } from '../types/salesTypes';
import { formatSalesCurrencyBreakdown } from '../../utils/salesCurrency';
import type {
  CommissionCalculationInput,
  CommissionKpis,
  CommissionRecord,
  CommissionRule,
  CommissionStatus,
  CommissionType,
} from '../types/commissions';

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isDateWithinRule(rule: CommissionRule, saleDate?: string) {
  const current = parseDate(saleDate);
  const validFrom = parseDate(rule.validFrom);
  const validUntil = parseDate(rule.validUntil);

  if (!current) return true;
  if (validFrom && current < validFrom) return false;
  if (validUntil && current > validUntil) return false;
  return true;
}

function getRuleMatchScore(rule: CommissionRule, sale: SaleRecord, line?: SaleLine) {
  let score = rule.priority;

  if (rule.userId && rule.userId !== sale.sellerId) return -1;
  if (rule.userName && rule.userName !== sale.sellerName) return -1;
  if (rule.productId && rule.productId !== line?.productId) return -1;

  if (rule.userId || rule.userName) score += 20;
  if (rule.productId) score += 30;

  return score;
}

function mapSaleCommissionStatus(sale: SaleRecord): CommissionStatus {
  if (sale.commercialStatus === 'cancelled') return 'cancelled';
  if (sale.commissionStatus === 'paid') return 'paid';
  if (sale.commissionStatus === 'calculated') return 'approved';
  return 'pending';
}

export function calculateCommission({
  type,
  value,
  saleAmount,
  productAmount = 0,
  quantity = 1,
}: CommissionCalculationInput) {
  if (!Number.isFinite(value) || value <= 0) return 0;

  switch (type) {
    case 'fixed_per_sale':
      return Math.round(value);
    case 'fixed_per_product':
      return Math.round(value * Math.max(quantity, 1));
    case 'percentage_of_sale':
      return Math.round((saleAmount * value) / 100);
    case 'percentage_of_product':
      return Math.round((productAmount * value) / 100);
    default:
      return 0;
  }
}

export function isCommissionRuleActive(rule: CommissionRule, saleDate?: string) {
  return rule.status === 'active' && isDateWithinRule(rule, saleDate);
}

export function resolveCommissionRule({
  sale,
  line,
  rules,
  allowedTypes,
}: {
  sale: SaleRecord;
  line?: SaleLine;
  rules: CommissionRule[];
  allowedTypes?: CommissionType[];
}) {
  return rules
    .filter((rule) => isCommissionRuleActive(rule, sale.saleDate))
    .filter((rule) => !allowedTypes || allowedTypes.includes(rule.type))
    .map((rule) => ({ rule, score: getRuleMatchScore(rule, sale, line) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.rule ?? null;
}

export function formatCommissionStatus(status: CommissionStatus) {
  const labels: Record<CommissionStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    cancelled: 'Cancelled',
  };

  return labels[status];
}

export function formatCommissionType(type: CommissionType) {
  const labels: Record<CommissionType, string> = {
    fixed_per_sale: 'Fixed per sale',
    fixed_per_product: 'Fixed per product',
    percentage_of_sale: 'Percentage of sale',
    percentage_of_product: 'Percentage of product',
  };

  return labels[type];
}

function createCommissionRecord({
  sale,
  line,
  rule,
  commissionAmount,
  index,
  fallbackRuleName,
}: {
  sale: SaleRecord;
  line?: SaleLine;
  rule?: CommissionRule | null;
  commissionAmount: number;
  index: number;
  fallbackRuleName?: string;
}): CommissionRecord {
  const status = mapSaleCommissionStatus(sale);
  const product = line ?? sale.saleLines[0];
  const commissionType = rule?.type ?? 'percentage_of_sale';
  const commissionValue = rule?.value ?? sale.commissionRate;

  return {
    id: `COM-${sale.id}-${String(index + 1).padStart(2, '0')}`,
    saleId: sale.id,
    saleCode: sale.saleNumber,
    customerId: sale.customerId ?? sale.contactId ?? '',
    customerName: sale.customerName,
    salesRepId: sale.sellerId ?? '',
    salesRepName: sale.sellerName,
    productId: product?.productId ?? '',
    productName: product?.productName ?? 'Whole sale',
    commissionRuleId: rule?.id ?? 'sale-default-commission',
    commissionRuleName: rule?.name ?? fallbackRuleName ?? 'Sale default commission',
    commissionType,
    commissionValue,
    saleAmount: line?.subtotal ?? sale.totalAmount,
    commissionAmount,
    currency: sale.currency,
    status,
    createdDate: sale.saleDate,
    approvedDate: ['approved', 'paid'].includes(status) ? sale.saleDate : undefined,
    paidDate: status === 'paid' ? sale.saleDate : undefined,
    unitId: sale.businessUnitId,
    unitName: sale.businessUnitName,
    businessId: sale.businessId,
    businessName: sale.businessName,
  };
}

export function calculateCommissionRecords(sales: SaleRecord[], rules: CommissionRule[]) {
  return sales.flatMap((sale) => {
    const saleRule = resolveCommissionRule({
      sale,
      rules,
      allowedTypes: ['fixed_per_sale', 'percentage_of_sale'],
    });

    if (saleRule) {
      return [createCommissionRecord({
        sale,
        rule: saleRule,
        commissionAmount: calculateCommission({
          type: saleRule.type,
          value: saleRule.value,
          saleAmount: sale.totalAmount,
        }),
        index: 0,
      })];
    }

    const productRecords = sale.saleLines
      .map((line, index) => {
        const productRule = resolveCommissionRule({
          sale,
          line,
          rules,
          allowedTypes: ['fixed_per_product', 'percentage_of_product'],
        });

        if (!productRule) return null;

        return createCommissionRecord({
          sale,
          line,
          rule: productRule,
          commissionAmount: calculateCommission({
            type: productRule.type,
            value: productRule.value,
            saleAmount: sale.totalAmount,
            productAmount: line.subtotal,
            quantity: line.quantity,
          }),
          index,
        });
      })
      .filter((record): record is CommissionRecord => Boolean(record));

    if (productRecords.length) return productRecords;

    return [createCommissionRecord({
      sale,
      commissionAmount: sale.commissionAmount ?? 0,
      index: 0,
      fallbackRuleName: sale.commissionRate ? 'Sale rate fallback' : 'Not available',
    })];
  });
}

export function calculateCommissionKpis(records: CommissionRecord[]): CommissionKpis {
  const totalCommissions = records.reduce((total, record) => total + record.commissionAmount, 0);
  const totalSaleAmount = records.reduce((total, record) => total + record.saleAmount, 0);
  const pendingRecords = records.filter((record) => record.status === 'pending');
  const approvedRecords = records.filter((record) => record.status === 'approved');
  const paidRecords = records.filter((record) => record.status === 'paid');

  return {
    totalCommissions,
    totalCommissionsLabel: formatSalesCurrencyBreakdown(records, (record) => record.commissionAmount, (record) => record.currency),
    pendingCommissions: pendingRecords.reduce((total, record) => total + record.commissionAmount, 0),
    pendingCommissionsLabel: formatSalesCurrencyBreakdown(pendingRecords, (record) => record.commissionAmount, (record) => record.currency),
    approvedCommissions: approvedRecords.reduce((total, record) => total + record.commissionAmount, 0),
    approvedCommissionsLabel: formatSalesCurrencyBreakdown(approvedRecords, (record) => record.commissionAmount, (record) => record.currency),
    paidCommissions: paidRecords.reduce((total, record) => total + record.commissionAmount, 0),
    paidCommissionsLabel: formatSalesCurrencyBreakdown(paidRecords, (record) => record.commissionAmount, (record) => record.currency),
    commissionRate: totalSaleAmount > 0 ? (totalCommissions / totalSaleAmount) * 100 : 0,
    commissionCount: records.length,
  };
}
