import { formatSalesCurrencyBreakdown } from '../../utils/salesCurrency';
import type { SaleRecord } from '../types/salesTypes';
import type { CommissionKpis, CommissionRecord, CommissionRule, CommissionStatus, CommissionType } from '../types/commissions';

function mapSaleCommissionStatus(sale: SaleRecord): CommissionStatus {
  if (sale.commercialStatus === 'cancelled') return 'cancelled';
  if (sale.commissionStatus === 'paid') return 'paid';
  if (sale.commissionStatus === 'calculated') return 'approved';
  return 'pending';
}

export function formatCommissionStatus(status: CommissionStatus) {
  return ({ pending: 'Pending', approved: 'Approved', paid: 'Paid', cancelled: 'Cancelled' } satisfies Record<CommissionStatus, string>)[status];
}

export function formatCommissionType(type: CommissionType) {
  return ({
    fixed_per_sale: 'Fixed per sale',
    fixed_per_product: 'Fixed per product',
    percentage_of_sale: 'Percentage of sale',
    percentage_of_product: 'Percentage of product',
  } satisfies Record<CommissionType, string>)[type];
}

/**
 * Projects immutable commission snapshots returned by the backend into table rows.
 * No rule resolution or monetary calculation is permitted in the frontend.
 */
export function calculateCommissionRecords(sales: SaleRecord[], _rules: CommissionRule[] = []) {
  return sales.flatMap((sale): CommissionRecord[] => {
    const snapshots = sale.commissionBreakdown?.length ? sale.commissionBreakdown : [{
      ruleId: sale.commissionRuleId,
      ruleCode: sale.commissionRuleCode,
      ruleName: sale.commissionRuleName || 'Not available',
      commissionType: sale.commissionType || 'percentage_of_sale',
      commissionValue: sale.commissionValue ?? sale.commissionRate,
      commissionAmount: sale.commissionAmount,
      productId: sale.saleLines[0]?.productId,
      productName: sale.saleLines[0]?.productName || 'Whole sale',
    }];

    return snapshots.map((snapshot, index) => ({
      id: `COM-${sale.id}-${String(index + 1).padStart(2, '0')}`,
      saleId: sale.id,
      saleCode: sale.saleNumber,
      customerId: sale.customerId ?? sale.contactId ?? '',
      customerName: sale.customerName,
      salesRepId: sale.sellerId ?? '',
      salesRepName: sale.sellerName,
      productId: snapshot.productId ?? '',
      productName: snapshot.productName ?? 'Whole sale',
      commissionRuleId: snapshot.ruleCode ?? String(snapshot.ruleId ?? ''),
      commissionRuleName: snapshot.ruleName,
      commissionType: snapshot.commissionType as CommissionType,
      commissionValue: snapshot.commissionValue,
      saleAmount: sale.totalAmount,
      commissionAmount: snapshot.commissionAmount,
      currency: sale.currency,
      status: mapSaleCommissionStatus(sale),
      createdDate: sale.saleDate,
      approvedDate: ['calculated', 'paid'].includes(sale.commissionStatus) ? sale.saleDate : undefined,
      paidDate: sale.commissionStatus === 'paid' ? sale.saleDate : undefined,
      unitId: sale.businessUnitId,
      unitName: sale.businessUnitName,
      businessId: sale.businessId,
      businessName: sale.businessName,
    }));
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
