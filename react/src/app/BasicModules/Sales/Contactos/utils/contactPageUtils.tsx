import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SalesContact } from '../../salesCrmContext';
import { fallbackOwnerValue, ownerOptionValue, type SalesOwnerOption } from '../../utils/salesOwnerOptions';
import { normalizeTextKey } from '../../utils/salesTextUtils';
import {
  contactSortCollator,
  fallbackFiscalCountry,
  fiscalCountryOptions,
} from '../constants/contactConstants';
import type { ContactSortColumn, ContactSortState } from '../types/contactTypes';

export function getContactOwnerSelectValue(contact: SalesContact, ownerOptions: SalesOwnerOption[]) {
  if (contact.ownerUserCompanyId) {
    return `user-company:${contact.ownerUserCompanyId}`;
  }

  const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(contact.owner));
  return matchedOwner ? ownerOptionValue(matchedOwner) : fallbackOwnerValue(contact.owner, 'Sin responsable');
}

export function getFiscalCountryCopy(country: string) {
  return fiscalCountryOptions.find((option) => option.value === country) ?? fallbackFiscalCountry;
}

export function getContactSortValue(contact: SalesContact, columnId: ContactSortColumn) {
  switch (columnId) {
    case 'contact':
      return `${contact.contactPerson} ${contact.id} ${contact.role}`;
    case 'company':
      return contact.company;
    case 'phone':
      return contact.phone;
    case 'email':
      return contact.email;
    case 'source':
      return contact.source;
    case 'owner':
      return contact.owner;
    case 'notes':
      return contact.notes;
    default:
      return '';
  }
}

export function sortContacts(contacts: SalesContact[], sortState: ContactSortState) {
  return [...contacts].sort((left, right) => {
    const leftValue = getContactSortValue(left, sortState.columnId);
    const rightValue = getContactSortValue(right, sortState.columnId);
    const result = contactSortCollator.compare(leftValue, rightValue);
    return sortState.direction === 'asc' ? result : -result;
  });
}

export function SortIcon({ columnId, sortState }: { columnId: ContactSortColumn; sortState: ContactSortState }) {
  if (sortState.columnId !== columnId) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
  }

  return sortState.direction === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-[#B63B32]" />
    : <ArrowDown className="h-3.5 w-3.5 text-[#B63B32]" />;
}

export function normalizePhoneImportKey(phone: string) {
  return phone.replace(/\D/g, '');
}
