import type { CommercialCustomer } from '../types';

export function toCommercialCustomer(customer: CommercialCustomer): CommercialCustomer {
  return { ...customer };
}
