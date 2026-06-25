import { useMemo } from 'react';
import { useSalesCrm } from '../Sales/salesCrmContext';
import type { SalesContact } from '../Sales/types';
import type { SaleRecord } from '../Sales/Sales/types/salesTypes';
import type { Customer } from '../PointOfSale/shared/commercial/customers';

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

function matchesSaleToContact(sale: SaleRecord, contact: SalesContact) {
  const saleCustomer = normalize(sale.customerName);
  return Boolean(
    (sale.contactId && sale.contactId === contact.id)
    || (sale.customerId && sale.customerId === contact.id)
    || saleCustomer === normalize(contact.company)
    || saleCustomer === normalize(contact.contactPerson)
    || saleCustomer === normalize(contact.fiscalLegalName),
  );
}

function toPointOfSaleCustomer(contact: SalesContact, sales: SaleRecord[]): Customer {
  const relatedSales = sales.filter((sale) => matchesSaleToContact(sale, contact));
  const totalPurchases = relatedSales.reduce((total, sale) => total + (Number(sale.totalAmount) || 0), 0);
  const lastSale = relatedSales
    .slice()
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())[0];
  const companyName = contact.company || contact.fiscalLegalName || contact.contactPerson;
  const isBusiness = Boolean(contact.fiscalLegalName || (contact.company && contact.company !== contact.contactPerson));

  return {
    id: contact.id,
    name: companyName,
    email: contact.fiscalEmail || contact.email,
    phone: contact.phone,
    rfc: contact.fiscalTaxId || contact.fiscalRegistryId,
    address: contact.fiscalAddressLine1,
    city: contact.fiscalCity,
    state: contact.fiscalState,
    postalCode: contact.fiscalPostalCode,
    customerType: isBusiness ? 'business' : 'individual',
    status: normalize(contact.status).includes('inactive') ? 'inactive' : 'active',
    totalPurchases,
    lastPurchaseDate: lastSale?.saleDate ? new Date(`${lastSale.saleDate}T00:00:00`) : undefined,
    currentBalance: 0,
    loyaltyPoints: Math.floor(totalPurchases / 100),
    createdAt: new Date(),
    notes: contact.notes,
  };
}

export function usePointOfSaleCustomers() {
  const { contacts, salesRecords } = useSalesCrm();

  return useMemo(
    () => contacts.map((contact) => toPointOfSaleCustomer(contact, salesRecords)),
    [contacts, salesRecords],
  );
}
