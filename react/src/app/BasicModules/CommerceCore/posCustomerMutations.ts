import type { Customer as PointOfSaleCustomer } from '../PointOfSale/shared/commercial/customers';
import type { CreateContactInput, UpdateContactInput } from '../Sales/types';

export function buildSalesContactInputFromPointOfSale(
  customer: Partial<PointOfSaleCustomer>,
): CreateContactInput {
  const name = customer.name?.trim() || 'Cliente POS';

  return {
    company: name,
    contactPerson: name,
    role: customer.customerType === 'business' ? 'Cliente retail empresarial' : 'Cliente retail',
    phone: customer.phone || '',
    email: customer.email || '',
    source: 'Manual',
    owner: 'Punto de venta',
    tags: ['POS'],
    notes: customer.notes || '',
    fiscalLegalName: customer.customerType === 'business' ? name : undefined,
    fiscalTaxId: customer.rfc,
    fiscalAddressLine1: customer.address,
    fiscalCity: customer.city,
    fiscalState: customer.state,
    fiscalPostalCode: customer.postalCode,
    fiscalEmail: customer.email,
    status: customer.status === 'inactive' ? 'Inactive' : 'Active',
  };
}

export function buildSalesContactPatchFromPointOfSale(
  customer: Partial<PointOfSaleCustomer>,
): UpdateContactInput {
  return buildSalesContactInputFromPointOfSale(customer);
}
