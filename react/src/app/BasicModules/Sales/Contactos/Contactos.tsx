import { useEffect, useMemo, useState } from 'react';
import {
  Columns3,
  Mail,
  MessageCircle,
  PencilLine,
  Phone,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../components/ui/utils';
import { useTablePagination } from '../../../hooks/useTablePagination';
import type { ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../components/rh/ColumnasConfigModal';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../components/SalesTitleBar';
import { salesApi } from '../salesApi';
import {
  salesOwners,
  type SalesContact,
  useSalesCrm,
} from '../salesCrmContext';
import { getPhoneHref, getWhatsAppHref } from '../utils/salesCommunicationUtils';
import {
  fallbackOwnerValue,
  getOwnerUserCompanyIdFromValue,
  normalizeSalesOwnerOption,
  ownerOptionValue,
  type SalesOwnerOption,
} from '../utils/salesOwnerOptions';
import { normalizeTextKey } from '../utils/salesTextUtils';
import { ContactActionButton } from './components/ContactActionButton';
import { ContactDeleteDialog } from './components/ContactDeleteDialog';
import { ContactFiscalBadge } from './components/ContactFiscalBadge';
import { ContactFormModal } from './components/ContactFormModal';
import { ContactLearningGuide } from './components/ContactLearningGuide';
import { ImportContactsModal } from './components/ImportContactsModal';
import { ContactRelationshipSignal } from './components/ContactRelationshipSignal';
import {
  defaultContactVisibleColumns,
  fallbackFiscalCountry,
  fiscalCountryOptions,
  initialContactForm,
} from './constants/contactConstants';
import {
  useContactosLearningTranslations,
  useContactosTranslations,
} from './hooks/useContactosTranslations';
import type {
  ContactColumnId,
  ContactFormState,
  ContactosProps,
  ContactSortColumn,
  ContactSortState,
} from './types/contactTypes';
import { getContactFiscalSignal, getContactRelationshipSignal } from './utils/contactTableSignals';
import type { ImportedContactDraft } from './utils/contactImportUtils';
import {
  getContactOwnerSelectValue,
  normalizePhoneImportKey,
  SortIcon,
  sortContacts,
} from './utils/contactPageUtils';

export default function Contactos({ learningModeActive = false }: ContactosProps) {
  const t = useContactosTranslations();
  const learningCopy = useContactosLearningTranslations();
  const { contacts, opportunities, quotes, addContact, updateContact, deleteContact } = useSalesCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SalesContact | null>(null);
  const [pendingDeleteContact, setPendingDeleteContact] = useState<SalesContact | null>(null);
  const [form, setForm] = useState<ContactFormState>(initialContactForm);
  const [contactFormError, setContactFormError] = useState('');
  const [sortState, setSortState] = useState<ContactSortState>({ columnId: 'contact', direction: 'asc' });
  const [visibleContactColumns, setVisibleContactColumns] = useState<ContactColumnId[]>(defaultContactVisibleColumns);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<SalesOwnerOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [contextCurrentUserCompanyId, setContextCurrentUserCompanyId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSalesOwners = async () => {
      const [sessionResult, salesContextResult, hrUsersResult] = await Promise.allSettled([
        authApi.getSessionOrNull(),
        salesApi.context(),
        humanResourcesApi.listHrUsers(),
      ]);

      if (!isMounted) {
        return;
      }

      if (sessionResult.status === 'fulfilled') {
        setCurrentUserId(sessionResult.value?.user.id ?? null);
      }

      if (salesContextResult.status === 'fulfilled') {
        setContextCurrentUserCompanyId(salesContextResult.value.currentUserCompanyId ?? null);
      }

      const ownerMap = new Map<number, SalesOwnerOption>();
      const salesContextOwners = salesContextResult.status === 'fulfilled'
        ? salesContextResult.value.users
        : [];
      const hrOwners = hrUsersResult.status === 'fulfilled'
        ? hrUsersResult.value.items
        : [];

      [...salesContextOwners, ...hrOwners].forEach((user) => {
        const owner = normalizeSalesOwnerOption(user);
        if (owner && !ownerMap.has(owner.userCompanyId)) {
          ownerMap.set(owner.userCompanyId, owner);
        }
      });

      setOwnerOptions(Array.from(ownerMap.values()).sort((left, right) => left.name.localeCompare(right.name)));
    };

    void loadSalesOwners();

    return () => {
      isMounted = false;
    };
  }, []);

  const ownerSelectOptions = useMemo(() => {
    const companyOwnerOptions = ownerOptions.map((owner) => ({
      value: ownerOptionValue(owner),
      label: owner.name,
    }));
    const fallbackOwnerNames = [...salesOwners, ...contacts.map((contact) => contact.owner)]
      .filter((owner, index, owners) => owner && owners.findIndex((candidate) => normalizeTextKey(candidate) === normalizeTextKey(owner)) === index);
    const fallbackOwnerOptions = fallbackOwnerNames
      .map((owner) => ({ value: fallbackOwnerValue(owner), label: owner }))
      .filter((option) => !companyOwnerOptions.some((owner) => normalizeTextKey(owner.label) === normalizeTextKey(option.label)));

    return [...companyOwnerOptions, ...fallbackOwnerOptions];
  }, [contacts, ownerOptions]);

  const ownerNameByValue = useMemo(
    () => new Map(ownerSelectOptions.map((owner) => [owner.value, owner.label])),
    [ownerSelectOptions],
  );
  const currentUserCompanyId = useMemo(
    () => contextCurrentUserCompanyId ?? ownerOptions.find((owner) => owner.userId === currentUserId)?.userCompanyId ?? null,
    [contextCurrentUserCompanyId, currentUserId, ownerOptions],
  );
  const defaultOwnerValue = currentUserCompanyId
    ? `user-company:${currentUserCompanyId}`
    : ownerSelectOptions[0]?.value ?? fallbackOwnerValue(initialContactForm.owner);
  const localizedFiscalCountryOptions = useMemo(
    () => fiscalCountryOptions.map((country) => ({
      value: country.value,
      ...t.fiscalCountries[country.value as keyof typeof t.fiscalCountries],
    })),
    [t.fiscalCountries],
  );

  const getOwnerPayloadFromValue = (value: string) => {
    const userCompanyId = getOwnerUserCompanyIdFromValue(value);
    const ownerName = ownerNameByValue.get(value) ?? value.replace('name:', '');

    return {
      ownerUserCompanyId: userCompanyId,
      owner: ownerName || initialContactForm.owner,
    };
  };

  const buildInitialForm = () => {
    const ownerPayload = getOwnerPayloadFromValue(defaultOwnerValue);
    return {
      ...initialContactForm,
      ownerValue: defaultOwnerValue,
      owner: ownerPayload.owner,
    };
  };

  const hasContactIdentity = (draft: ContactFormState) => [
    draft.company,
    draft.contactPerson,
    draft.phone,
    draft.email,
    draft.fiscalLegalName,
    draft.fiscalTaxId,
  ].some((value) => value.trim());

  useEffect(() => {
    if (contactFormError && hasContactIdentity(form)) {
      setContactFormError('');
    }
  }, [contactFormError, form]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => [
      contact.id,
      contact.company,
      contact.contactPerson,
      contact.role,
      contact.phone,
      contact.email,
      contact.source,
      contact.owner,
      contact.notes,
      contact.fiscalCountry ?? '',
      contact.fiscalLegalName ?? '',
      contact.fiscalTaxId ?? '',
      contact.fiscalRegistryId ?? '',
      contact.fiscalCity ?? '',
      contact.fiscalState ?? '',
    ].some((value) => value.toLowerCase().includes(query)));
  }, [contacts, searchQuery]);

  const sortedContacts = useMemo(
    () => sortContacts(filteredContacts, sortState),
    [filteredContacts, sortState],
  );
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedContacts,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${searchQuery}:${sortState.columnId}:${sortState.direction}:${contacts.map((contact) => contact.id).join('|')}`,
    rows: sortedContacts,
  });

  const handleSort = (columnId: ContactSortColumn) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };

  const renderSortableHead = (columnId: ContactSortColumn, label: string, className?: string) => (
    <TableHead className={cn('whitespace-normal px-5 py-5', className)}>
      <button
        type="button"
        className="inline-flex max-w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-normal text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
        onClick={() => handleSort(columnId)}
      >
        <span className="min-w-0 whitespace-normal break-words">{label}</span>
        <SortIcon columnId={columnId} sortState={sortState} />
      </button>
    </TableHead>
  );
  const contactConfigurableColumns = useMemo<ColumnConfig[]>(() => (
    (['company', 'phone', 'email', 'source', 'owner', 'relationship', 'fiscal', 'notes'] as ContactColumnId[]).map((columnId) => ({
      id: columnId,
      label: t.table.columns[columnId],
      description: t.table.columns[columnId],
      visible: visibleContactColumns.includes(columnId),
    }))
  ), [t.table.columns, visibleContactColumns]);
  const contactDefaultColumns = useMemo<ColumnConfig[]>(() => (
    contactConfigurableColumns.map((column) => ({
      ...column,
      visible: defaultContactVisibleColumns.includes(column.id as ContactColumnId),
    }))
  ), [contactConfigurableColumns]);
  const canShowContactColumn = (columnId: ContactColumnId) => visibleContactColumns.includes(columnId);
  const contactTableColumnCount = 2 + visibleContactColumns.length;

  const handleOpenCreateContact = () => {
    setEditingContact(null);
    setContactFormError('');
    setForm(buildInitialForm());
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (contact: SalesContact) => {
    const ownerValue = getContactOwnerSelectValue(contact, ownerOptions);
    setEditingContact(contact);
    setContactFormError('');
    setForm({
      company: contact.company,
      contactPerson: contact.contactPerson,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      source: contact.source,
      ownerValue,
      owner: ownerNameByValue.get(ownerValue) ?? contact.owner,
      notes: contact.notes,
      fiscalCountry: contact.fiscalCountry ?? fallbackFiscalCountry.value,
      fiscalLegalName: contact.fiscalLegalName ?? '',
      fiscalTaxId: contact.fiscalTaxId ?? '',
      fiscalRegistryId: contact.fiscalRegistryId ?? '',
      fiscalAddressLine1: contact.fiscalAddressLine1 ?? '',
      fiscalAddressLine2: contact.fiscalAddressLine2 ?? '',
      fiscalCity: contact.fiscalCity ?? '',
      fiscalState: contact.fiscalState ?? '',
      fiscalPostalCode: contact.fiscalPostalCode ?? '',
      fiscalEmail: contact.fiscalEmail ?? '',
      fiscalRegime: contact.fiscalRegime ?? '',
      fiscalNotes: contact.fiscalNotes ?? '',
    });
    setIsContactModalOpen(true);
  };

  const handleContactModalOpenChange = (open: boolean) => {
    setIsContactModalOpen(open);
    if (!open) {
      setContactFormError('');
      setEditingContact(null);
      setForm(buildInitialForm());
    }
  };

  const handleOwnerChange = (contact: SalesContact, value: string) => {
    const ownerPayload = getOwnerPayloadFromValue(value);
    updateContact(contact.id, {
      ownerUserCompanyId: ownerPayload.ownerUserCompanyId,
      owner: ownerPayload.owner,
    });
  };

  const handleDeleteContact = (contact: SalesContact) => {
    setPendingDeleteContact(contact);
  };

  const handleConfirmDeleteContact = () => {
    if (!pendingDeleteContact) {
      return;
    }

    deleteContact(pendingDeleteContact.id);
    if (editingContact?.id === pendingDeleteContact.id) {
      setEditingContact(null);
      setIsContactModalOpen(false);
    }
    setPendingDeleteContact(null);
  };

  const handleFormOwnerChange = (value: string) => {
    const ownerPayload = getOwnerPayloadFromValue(value);
    setForm((current) => ({
      ...current,
      ownerValue: value,
      owner: ownerPayload.owner,
    }));
  };

  const handleImportContacts = (drafts: ImportedContactDraft[]) => {
    const ownerPayload = getOwnerPayloadFromValue(defaultOwnerValue);
    const knownContactKeys = new Set<string>();
    let skipped = 0;

    contacts.forEach((contact) => {
      if (contact.email.trim()) {
        knownContactKeys.add(`email:${normalizeTextKey(contact.email)}`);
      }

      const phoneKey = normalizePhoneImportKey(contact.phone);
      if (phoneKey) {
        knownContactKeys.add(`phone:${phoneKey}`);
      }
    });

    drafts.forEach((draft) => {
      const emailKey = draft.email.trim() ? `email:${normalizeTextKey(draft.email)}` : '';
      const phoneKey = normalizePhoneImportKey(draft.phone);
      const normalizedPhoneKey = phoneKey ? `phone:${phoneKey}` : '';
      const isDuplicate = Boolean(
        (emailKey && knownContactKeys.has(emailKey))
        || (normalizedPhoneKey && knownContactKeys.has(normalizedPhoneKey)),
      );

      if (isDuplicate) {
        skipped += 1;
        return;
      }

      if (emailKey) {
        knownContactKeys.add(emailKey);
      }
      if (normalizedPhoneKey) {
        knownContactKeys.add(normalizedPhoneKey);
      }

      addContact({
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
    });

    return {
      imported: drafts.length - skipped,
      skipped,
    };
  };

  const handleSaveContact = () => {
    if (!hasContactIdentity(form)) {
      setContactFormError(t.modal.validation.identityRequired);
      return;
    }

    const ownerPayload = getOwnerPayloadFromValue(form.ownerValue || defaultOwnerValue);
    const companyName = form.company.trim()
      || form.fiscalLegalName.trim()
      || form.fiscalTaxId.trim()
      || form.contactPerson.trim()
      || form.email.trim()
      || form.phone.trim()
      || t.defaults.importedCompany;
    const contactPerson = form.contactPerson.trim()
      || form.company.trim()
      || form.fiscalLegalName.trim()
      || form.fiscalTaxId.trim()
      || form.email.trim()
      || form.phone.trim()
      || t.defaults.importedPerson;
    const contactPayload = {
      company: companyName,
      contactPerson,
      role: form.role.trim() || t.defaults.commercialContact,
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      ownerUserCompanyId: ownerPayload.ownerUserCompanyId,
      owner: ownerPayload.owner,
      tags: editingContact?.tags ?? [],
      notes: form.notes.trim(),
      fiscalCountry: form.fiscalCountry,
      fiscalLegalName: form.fiscalLegalName.trim(),
      fiscalTaxId: form.fiscalTaxId.trim(),
      fiscalRegistryId: form.fiscalRegistryId.trim(),
      fiscalAddressLine1: form.fiscalAddressLine1.trim(),
      fiscalAddressLine2: form.fiscalAddressLine2.trim(),
      fiscalCity: form.fiscalCity.trim(),
      fiscalState: form.fiscalState.trim(),
      fiscalPostalCode: form.fiscalPostalCode.trim(),
      fiscalEmail: form.fiscalEmail.trim(),
      fiscalRegime: form.fiscalRegime.trim(),
      fiscalNotes: form.fiscalNotes.trim(),
    };

    if (editingContact) {
      updateContact(editingContact.id, contactPayload);
    } else {
      addContact(contactPayload);
    }

    setContactFormError('');
    setForm(buildInitialForm());
    setEditingContact(null);
    setIsContactModalOpen(false);
  };

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon="👥"
        rhIndent
        title={t.header.title}
        subtitle={t.header.subtitle}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={() => setIsColumnsModalOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              {t.header.columnsAction}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={() => setIsImportModalOpen(true)}
            >
              <UploadCloud className="h-4 w-4" />
              {t.header.importContacts}
            </Button>
            <Button
              type="button"
              className={salesTitleBarPrimaryActionClassName}
              onClick={handleOpenCreateContact}
            >
              <Plus className="h-4 w-4" />
              {t.header.addContact}
            </Button>
          </>
        )}
      />

      {learningModeActive ? <ContactLearningGuide copy={learningCopy} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.search.placeholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <span>{t.search.visibleContacts}</span>
            <span className="font-black text-[#B63B32]">{sortedContacts.length}</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Table className="min-w-[1740px] table-fixed">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
              {renderSortableHead('contact', t.table.columns.contact, 'w-[230px]')}
              {canShowContactColumn('company') ? renderSortableHead('company', t.table.columns.company, 'w-[220px]') : null}
              {canShowContactColumn('phone') ? renderSortableHead('phone', t.table.columns.phone, 'w-[170px]') : null}
              {canShowContactColumn('email') ? renderSortableHead('email', t.table.columns.email, 'w-[230px]') : null}
              {canShowContactColumn('source') ? renderSortableHead('source', t.table.columns.source, 'w-[170px]') : null}
              {canShowContactColumn('owner') ? renderSortableHead('owner', t.table.columns.owner, 'w-[220px]') : null}
              {canShowContactColumn('relationship') ? <TableHead className="w-[190px] whitespace-normal px-5 py-5 text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-300">{t.table.columns.relationship}</TableHead> : null}
              {canShowContactColumn('fiscal') ? <TableHead className="w-[170px] whitespace-normal px-5 py-5 text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-300">{t.table.columns.fiscal}</TableHead> : null}
              {canShowContactColumn('notes') ? renderSortableHead('notes', t.table.columns.notes, 'w-[300px]') : null}
              <TableHead className="w-[170px] whitespace-normal px-4 py-5 text-center text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-300">{t.table.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={contactTableColumnCount} className="px-5 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t.table.emptyTitle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {t.table.emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedContacts.map((contact) => {
              const ownerValue = getContactOwnerSelectValue(contact, ownerOptions);
              const rowOwnerOptions = ownerSelectOptions.some((owner) => owner.value === ownerValue)
                ? ownerSelectOptions
                : [{ value: ownerValue, label: contact.owner || t.defaults.unassignedOwner }, ...ownerSelectOptions];
              const hasPhone = Boolean(contact.phone.trim());
              const hasEmail = Boolean(contact.email.trim());
              const fiscalSignal = getContactFiscalSignal(contact);
              const relationshipSignal = getContactRelationshipSignal({ contact, opportunities, quotes });

              return (
                <TableRow key={contact.id} className="border-slate-100 hover:bg-[#FF6B5E]/[0.025] dark:border-slate-700 dark:hover:bg-slate-700/40">
                  <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                    <div className="min-w-0 max-w-full space-y-1">
                      <p className="break-words font-bold text-slate-950 dark:text-white">{contact.contactPerson}</p>
                      <p className="break-all text-xs font-semibold text-[#B63B32]">{contact.id}</p>
                      <p className="break-words text-xs text-slate-500">{contact.role}</p>
                    </div>
                  </TableCell>
                  {canShowContactColumn('company') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top text-sm font-semibold text-slate-900 dark:text-slate-200">
                    <div className="min-w-0 max-w-full">
                      <p className={cn('break-words', !contact.company && 'text-slate-400')}>{contact.company || t.table.noCompany}</p>
                      {contact.fiscalTaxId ? (
                        <p className="mt-1 break-all text-xs font-medium text-slate-500">{contact.fiscalTaxId}</p>
                      ) : null}
                    </div>
                  </TableCell> : null}
                  {canShowContactColumn('phone') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top text-sm text-slate-700 dark:text-slate-300">
                    <span className={cn('block min-w-0 break-all', !hasPhone && 'font-medium text-slate-400')}>{hasPhone ? contact.phone : t.table.noPhone}</span>
                  </TableCell> : null}
                  {canShowContactColumn('email') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top text-sm text-slate-700 dark:text-slate-300">
                    <span className={cn('block min-w-0 break-all leading-6', !hasEmail && 'font-medium text-slate-400')}>{hasEmail ? contact.email : t.table.noEmail}</span>
                  </TableCell> : null}
                  {canShowContactColumn('source') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                    <Badge variant="outline" className="h-auto max-w-full whitespace-normal rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {t.sources[contact.source]}
                    </Badge>
                  </TableCell> : null}
                  {canShowContactColumn('owner') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                    <Select value={ownerValue} onValueChange={(value) => handleOwnerChange(contact, value)}>
                      <SelectTrigger className="h-10 w-full min-w-0 max-w-full rounded-full border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-none focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white [&>span]:truncate">
                        <SelectValue placeholder={t.table.ownerPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {rowOwnerOptions.map((owner) => (
                          <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell> : null}
                  {canShowContactColumn('relationship') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                    <ContactRelationshipSignal copy={t.signals.relationship} signal={relationshipSignal} />
                  </TableCell> : null}
                  {canShowContactColumn('fiscal') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                    <ContactFiscalBadge copy={t.signals.fiscal} signal={fiscalSignal} country={contact.fiscalCountry} />
                  </TableCell> : null}
                  {canShowContactColumn('notes') ? <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                    <Textarea
                      value={contact.notes}
                      onChange={(event) => updateContact(contact.id, { notes: event.target.value })}
                      placeholder={t.table.notesPlaceholder}
                      className="min-h-[58px] w-full min-w-0 resize-none rounded-lg border-slate-200 bg-white text-sm text-slate-800 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </TableCell> : null}
                  <TableCell className="overflow-hidden whitespace-normal px-4 py-5 align-top">
                    <div className="mx-auto grid w-fit grid-cols-[repeat(3,2.25rem)] gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <ContactActionButton label={hasPhone ? t.actions.call(contact.contactPerson) : t.actions.noPhone} icon={<Phone className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15 dark:text-blue-300 dark:hover:bg-[#2563EB]/20" href={hasPhone ? getPhoneHref(contact.phone) : undefined} disabled={!hasPhone} />
                      <ContactActionButton label={hasPhone ? t.actions.whatsapp(contact.contactPerson) : t.actions.noPhone} icon={<MessageCircle className="h-4 w-4" />} className="border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20 dark:text-[#7AD8BF] dark:hover:bg-[#59C3A5]/25" href={hasPhone ? getWhatsAppHref(contact.phone) : undefined} disabled={!hasPhone} />
                      <ContactActionButton label={hasEmail ? t.actions.email(contact.contactPerson) : t.actions.noEmail} icon={<Mail className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20" href={hasEmail ? `mailto:${contact.email}` : undefined} disabled={!hasEmail} />
                      <ContactActionButton
                        label={t.actions.edit(contact.contactPerson)}
                        icon={<PencilLine className="h-4 w-4" />}
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={() => handleOpenEditContact(contact)}
                      />
                      <ContactActionButton
                        label={t.actions.delete(contact.contactPerson)}
                        icon={<Trash2 className="h-4 w-4" />}
                        className="border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] hover:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
                        onClick={() => handleDeleteContact(contact)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <DataTablePagination
          currentPage={currentPage}
          itemLabel="contactos"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </section>

      <ContactFormModal
        open={isContactModalOpen}
        editingContact={editingContact}
        form={form}
        setForm={setForm}
        copy={t}
        localizedFiscalCountryOptions={localizedFiscalCountryOptions}
        ownerSelectOptions={ownerSelectOptions}
        defaultOwnerValue={defaultOwnerValue}
        formError={contactFormError}
        onOpenChange={handleContactModalOpenChange}
        onSave={handleSaveContact}
        onOwnerChange={handleFormOwnerChange}
      />

      <ImportContactsModal
        copy={t.importModal}
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportContacts={handleImportContacts}
      />

      <ContactDeleteDialog
        copy={t.actions}
        contact={pendingDeleteContact}
        onCancel={() => setPendingDeleteContact(null)}
        onConfirm={handleConfirmDeleteContact}
      />

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        columns={contactConfigurableColumns}
        defaultColumns={contactDefaultColumns}
        fixedColumns={[
          {
            id: 'contact',
            label: t.table.columns.contact,
            description: t.table.columns.contact,
            locked: true,
            visible: true,
          },
          {
            id: 'actions',
            label: t.table.columns.actions,
            description: t.table.columns.actions,
            locked: true,
            visible: true,
          },
        ]}
        theme="sales"
        onClose={() => setIsColumnsModalOpen(false)}
        onSave={(columns) => {
          setVisibleContactColumns(columns.filter((column) => column.visible).map((column) => column.id as ContactColumnId));
        }}
      />
    </section>
  );
}
