import { toBackendContact, toFrontendContact } from '../../adapters/salesApiAdapters';
import type { CreateContactInput } from '../../types/salesCrmContextTypes';
import type { SalesContact } from '../../types/contacts';
import { salesApi } from '../../salesApi';
import { normalizeTextKey } from '../../utils/salesTextUtils';
import { fallbackFiscalCountry, initialContactForm } from '../constants/contactConstants';
import { useContactosTranslations } from './useContactosTranslations';
import { importContactDrafts } from '../utils/importContacts';
import { normalizePhoneImportKey } from '../utils/contactPageUtils';
import type { ImportedContactDraft } from '../utils/contactImportUtils';

async function createImportedContact(contact: CreateContactInput): Promise<SalesContact> {
  const saved = await salesApi.create('contacts', toBackendContact({ ...contact, id: '' }));
  return toFrontendContact(saved as Record<string, unknown>);
}

export function useContactFileImport(
  ownerPayload = { owner: initialContactForm.owner, ownerUserCompanyId: null as number | null },
  createContactRecord = createImportedContact,
) {
  const t = useContactosTranslations();
  return async (drafts: ImportedContactDraft[], onProgress?: (processed: number, total: number) => void) => {
    // Reconcile before each attempt, including a previous write whose response was lost.
    const persisted = await salesApi.list<{ id: string; email?: string; phone?: string }>('contacts');
    const knownContacts = persisted.items.map(contact => ({ id: contact.id, email: contact.email ?? '', phone: contact.phone ?? '' }));
    return importContactDrafts(drafts, knownContacts, async draft => {
      return createContactRecord({
        company: draft.company.trim() || t.defaults.importedCompany,
        contactPerson: draft.contactPerson.trim() || draft.company.trim() || t.defaults.importedPerson,
        role: draft.role.trim() || t.defaults.commercialContact,
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        source: 'Manual',
        ownerUserCompanyId: ownerPayload.ownerUserCompanyId,
        owner: ownerPayload.owner,
        tags: [t.defaults.importedTag],
        notes: draft.notes.trim() || t.defaults.importedNote,
        fiscalCountry: fallbackFiscalCountry.value,
        fiscalLegalName: '',
        fiscalTaxId: '',
        fiscalRegistryId: '',
        fiscalAddressLine1: '',
        fiscalAddressLine2: '',
        fiscalCity: '',
        fiscalState: '',
        fiscalPostalCode: '',
        fiscalEmail: '',
        fiscalRegime: '',
        fiscalNotes: '',
      });
    }, normalizeTextKey, normalizePhoneImportKey, onProgress);
  };
}
