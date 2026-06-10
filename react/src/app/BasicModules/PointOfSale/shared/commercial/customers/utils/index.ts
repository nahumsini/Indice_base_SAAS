import type { CommercialCustomer } from '../types';

export function getActiveCustomers(customers: CommercialCustomer[]) {
  return customers.filter((customer) => customer.status === 'active');
}

export function getCustomerCreditAvailable(customer: CommercialCustomer) {
  return Math.max((customer.creditLimit ?? 0) - customer.currentBalance, 0);
}
