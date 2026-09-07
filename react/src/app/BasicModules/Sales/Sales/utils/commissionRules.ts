import type { SaleRecord } from '../types/salesTypes';
import type { CommissionRecord, CommissionRule, CommissionStatus, CommissionType } from '../types/commissions';

function mapSaleCommissionStatus(sale: SaleRecord): CommissionStatus {
  if (['cancelled', 'canceled', 'rejected', 'voided'].includes(sale.commercialStatus.toLowerCase())) return 'cancelled';
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
      saleBackendId: sale.backendId,
      componentIndex: index,
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
