import { useMemo } from 'react';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import type { CandidateCreditCustomer, CandidateSale, CreditPolicy } from '../types';

export function useCandidateCustomers(policies: CreditPolicy[], candidateSales: CandidateSale[]) {
  const { contacts } = useSalesCrm();

  return useMemo(() => {
    const policyCustomerIds = new Set(policies.map((policy) => policy.customerId));
    const customers = new Map<string, CandidateCreditCustomer>();

    contacts.forEach((contact) => {
      if (!policyCustomerIds.has(contact.id)) {
        customers.set(contact.id, {
          id: contact.id,
          name: contact.company || contact.contactPerson || contact.id,
          unit: 'Unidad general',
          business: 'Negocio general',
        });
      }
    });

    candidateSales.forEach((sale) => {
      if (!policyCustomerIds.has(sale.customerId) && !customers.has(sale.customerId)) {
        customers.set(sale.customerId, {
          id: sale.customerId,
          business: sale.business,
          businessId: sale.businessId ?? null,
          contactId: sale.contactId ?? null,
          name: sale.customerName,
          unit: sale.unit,
          unitId: sale.unitId ?? null,
        });
      }
    });

    return Array.from(customers.values());
  }, [candidateSales, contacts, policies]);
}
