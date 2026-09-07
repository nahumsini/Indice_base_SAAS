import { apiClient } from '../../../../lib/apiClient';
import type { KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import type { CommissionRecord } from '../types/commissions';

export type CommissionSummary = {
  total: KpiMonetaryAggregate;
  pending: KpiMonetaryAggregate;
  approved: KpiMonetaryAggregate;
  paid: KpiMonetaryAggregate;
  salesBase: KpiMonetaryAggregate;
  commissionRate: number | null;
  incomplete: boolean;
};
export function commissionSelections(records: CommissionRecord[]) {
  const bySale = new Map<number, Set<number>>();
  for (const record of records) {
    const id = record.saleBackendId;
    if (!id || !Number.isSafeInteger(id)) throw new Error('Commission sale identity is unavailable.');
    const indexes = bySale.get(id) ?? new Set<number>();
    indexes.add(record.componentIndex);
    bySale.set(id, indexes);
  }
  return [...bySale].map(([saleId, indexes]) => ({ saleId, componentIndexes: [...indexes].sort((a, b) => a - b) }));
}
export function loadCommissionSummary(preferredCurrency: string, selections: ReturnType<typeof commissionSelections>) {
  return apiClient<CommissionSummary>('/api/v1/sales/commission-summary', {
    method: 'POST', body: JSON.stringify({ preferredCurrency, selections }),
  });
}
