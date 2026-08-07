import { useMemo } from 'react';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { fallbackCandidateSales } from '../data';
import type { CandidateSale, CreditSale } from '../types';
import { numericId, todayIso } from '../utils';

export function useCandidateSales(
  existingCreditSales: CreditSale[],
  apiCandidateSales: CandidateSale[],
  isBackendReady: boolean,
) {
  const { salesRecords } = useSalesCrm();

  return useMemo(() => {
    const transformedSales: CandidateSale[] = salesRecords.map((sale) => ({
      id: sale.backendId ? `sales:${sale.backendId}` : sale.id,
      salesRecordId: sale.backendId ?? null,
      contactId: numericId(sale.contactId ?? sale.customerId),
      unitId: numericId(sale.businessUnitId),
      businessId: numericId(sale.businessId),
      saleNumber: sale.saleNumber,
      customerId: sale.customerId || sale.contactId || `customer-${sale.customerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      customerName: sale.customerName || 'Cliente sin nombre',
      unit: sale.businessUnitName || 'Unidad general',
      business: sale.businessName || 'Negocio general',
      saleDate: sale.saleDate || todayIso(),
      amount: sale.totalAmount || 0,
      currency: sale.currency || 'MXN',
      source: sale.saleNumber.toLowerCase().startsWith('pos') ? 'pos' : 'sales',
    }));
    const existingSaleIds = new Set(existingCreditSales.map((sale) => sale.saleId));
    const merged = isBackendReady
      ? [...apiCandidateSales, ...transformedSales]
      : [...transformedSales, ...fallbackCandidateSales];
    const unique = new Map<string, CandidateSale>();

    merged.forEach((sale) => {
      if (!existingSaleIds.has(sale.id) && sale.amount > 0 && !unique.has(sale.id)) {
        unique.set(sale.id, sale);
      }
    });

    return Array.from(unique.values()).sort((left, right) => {
      const customerComparison = left.customerName.localeCompare(right.customerName, undefined, { sensitivity: 'base' });
      return customerComparison || left.saleNumber.localeCompare(right.saleNumber, undefined, { sensitivity: 'base' });
    });
  }, [apiCandidateSales, existingCreditSales, isBackendReady, salesRecords]);
}
