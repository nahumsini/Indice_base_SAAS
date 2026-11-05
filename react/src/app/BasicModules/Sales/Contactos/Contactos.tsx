import { AudienceWorkspace } from '../Mailing/components/AudienceWorkspace';
import { workspaceApi } from '../Mailing/workspaceApi';
import { audienceApi, type AudienceList } from '../Mailing/audienceApi';
import { useLanguage } from '../../../shared/context';
import { getFormFeedbackCopy } from '../../../components/indice-modal/formFeedbackCopy';
import { useContactFileImport } from './hooks/useContactFileImport';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CloudDownload,
  ListPlus,
  Columns3,
  Mail,
  MessageCircle,
  PencilLine,
  Phone,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { IndiceTitleBarOverflow } from '../../../components/frontend-os';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import {
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../components/table/IndiceTableEngine';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  TableBody,
  TableCell,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { usePersistentColumnWidths } from '../../../hooks/usePersistentColumnWidths';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import type { ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../components/rh/ColumnasConfigModal';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../components/SalesFilterBar';
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
import { MetaLeadImportModal } from './components/MetaLeadImportModal';
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
import {
  getContactOwnerSelectValue,
  sortContacts,
} from './utils/contactPageUtils';

const contactSelectionWidth = 48;
const contactColumnWidths: Record<ContactColumnId, number> = {
  contact: 230,
  company: 220,
  phone: 170,
  email: 230,
  source: 170,
  owner: 220,
  relationship: 190,
  fiscal: 170,
  notes: 300,
  segmentationLists: 220,
};

const contactMinimumColumnWidths: Record<ContactColumnId, number> = {
  contact: 170,
  company: 170,
  phone: 140,
  email: 190,
  source: 140,
  owner: 180,
  relationship: 170,
  fiscal: 140,
  notes: 220,
  segmentationLists: 160,
};

const contactActionsColumnWidth = 246;
const contactColumnWidthsStorageKey = 'sales-contacts-column-widths-v2';
const sortableContactColumnIds: ContactColumnId[] = ['contact', 'company', 'phone', 'email', 'source', 'owner', 'notes'];

type ContactosWorkspaceState = {
  searchQuery: string;
  sortColumn: ContactSortColumn;
  sortDirection: ContactSortState['direction'];
  currentPage: number;
  pageSize: number;
  visibleColumns: ContactColumnId[];
};

const contactosWorkspaceDefaults: ContactosWorkspaceState = {
  searchQuery: '',
  sortColumn: 'contact',
  sortDirection: 'asc',
  currentPage: 1,
  pageSize: 10,
  visibleColumns: defaultContactVisibleColumns,
};

const contactosWorkspaceUrlFields: Partial<Record<keyof ContactosWorkspaceState, string>> = {
  searchQuery: 'q',
  sortColumn: 'sort',
  sortDirection: 'direction',
  currentPage: 'page',
  pageSize: 'pageSize',
};

export default function Contactos({ learningModeActive = false, titleBarTitle }: ContactosProps) {
  const t = useContactosTranslations();
  const { currentLanguage } = useLanguage();
  const spanish = currentLanguage.code.startsWith('es');
  const labels = {
    manage: spanish ? 'Gestionar listas de segmentación' : 'Manage segmentation lists',
    add: spanish ? 'Añadir a una lista' : 'Add to a list',
    allLists: spanish ? 'Todas las listas' : 'All lists',
    noList: spanish ? 'Sin lista' : 'No list',
    allOwners: spanish ? 'Todos los responsables' : 'All owners',
    selectPage: spanish ? 'Seleccionar esta página' : 'Select this page',
    selectResults: spanish ? 'Seleccionar resultados filtrados' : 'Select filtered results',
    clearSelection: spanish ? 'Limpiar selección' : 'Clear selection',
    selected: spanish ? 'contactos seleccionados' : 'contacts selected',
    limit: spanish ? 'Puedes añadir hasta 500 contactos por operación.' : 'You can add up to 500 contacts per operation.',
    saved: spanish ? 'Contactos asignados a la lista.' : 'Contacts assigned to the list.',
  };
  const feedback = getFormFeedbackCopy(currentLanguage.code);
  const savingContactRef = useRef(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const learningCopy = useContactosLearningTranslations();
  const { contacts, opportunities, quotes, createContactRecord, updateContactRecord, updateContact, deleteContact, reloadAll } = useSalesCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');
  const [listWorkspace, setListWorkspace] = useState<'manage' | 'assign' | null>(null);
  const [listAccess, setListAccess] = useState<{ canEdit: boolean; lists: AudienceList[] } | null>(null);
  const [memberships, setMemberships] = useState<Map<number, { listId: string; name: string }[]> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assignmentSaved, setAssignmentSaved] = useState(false);
  const [listRevision, setListRevision] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMetaImportModalOpen, setIsMetaImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SalesContact | null>(null);
  const [pendingDeleteContact, setPendingDeleteContact] = useState<SalesContact | null>(null);
  const [form, setForm] = useState<ContactFormState>(initialContactForm);
  const [contactFormError, setContactFormError] = useState('');
  const [sortState, setSortState] = useState<ContactSortState>({ columnId: 'contact', direction: 'asc' });
  const [visibleContactColumns, setVisibleContactColumns] = useState<ContactColumnId[]>(defaultContactVisibleColumns);
  const [paginationState, setPaginationState] = useState({ currentPage: 1, pageSize: 10 });
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<SalesOwnerOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [contextCurrentUserCompanyId, setContextCurrentUserCompanyId] = useState<number | null>(null);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<ContactColumnId>({
    defaults: contactColumnWidths,
    headerLabels: t.table.columns,
    minWidths: contactMinimumColumnWidths,
    sortableColumnIds: sortableContactColumnIds,
    storageKey: contactColumnWidthsStorageKey,
  });

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
    if (contactFormError === t.modal.validation.identityRequired && hasContactIdentity(form)) {
      setContactFormError('');
    }
  }, [contactFormError, form, t.modal.validation.identityRequired]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (ownerFilter !== 'all' && getContactOwnerSelectValue(contact, ownerOptions) !== ownerFilter) return false;
      if (listFilter !== 'all' && memberships) {
        const lists = memberships.get(Number(contact.id)) ?? [];
        if (listFilter === 'none' ? lists.length > 0 : !lists.some(list => list.listId === listFilter)) return false;
      }
      return !query || [
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
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [contacts, searchQuery, ownerFilter, ownerOptions, listFilter, memberships]);

  const sortedContacts = useMemo(
    () => sortContacts(filteredContacts, sortState),
    [filteredContacts, sortState],
  );

  const workspaceState = useMemo<ContactosWorkspaceState>(() => ({
    searchQuery,
    sortColumn: sortState.columnId,
    sortDirection: sortState.direction,
    visibleColumns: visibleContactColumns,
    ...paginationState,
  }), [paginationState, searchQuery, sortState, visibleContactColumns]);

  useWorkspaceNavigationMemory({
    moduleKey: 'sales',
    tabKey: 'contacts',
    state: workspaceState,
    defaults: contactosWorkspaceDefaults,
    urlFields: contactosWorkspaceUrlFields,
    onRestore: (restored) => {
      setSearchQuery(restored.searchQuery);
      setSortState({ columnId: restored.sortColumn, direction: restored.sortDirection });
      setVisibleContactColumns(restored.visibleColumns);
      setPaginationState({ currentPage: restored.currentPage, pageSize: restored.pageSize });
    },
  });

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
    controlledCurrentPage: paginationState.currentPage,
    controlledPageSize: paginationState.pageSize,
    onPaginationChange: setPaginationState,
    rows: sortedContacts,
  });

  const handleSort = (columnId: ContactSortColumn) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
    setPaginationState((current) => ({ ...current, currentPage: 1 }));
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPaginationState((current) => ({ ...current, currentPage: 1 }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setOwnerFilter('all');
    setListFilter('all');
    setPaginationState((current) => ({ ...current, currentPage: 1 }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    void Promise.all([
      audienceApi.lists(signal),
      audienceApi.memberships(signal),
      workspaceApi.list(new URLSearchParams({ pageSize: '10' }), signal),
    ]).then(([lists, rows, workspace]) => {
      if (signal.aborted) return;
      const byContact = new Map<number, { listId: string; name: string }[]>();
      for (const { contactId, listId, name } of rows) {
        const entries = byContact.get(contactId) ?? [];
        entries.push({ listId, name });
        byContact.set(contactId, entries);
      }
      setListAccess({ canEdit: workspace.canEdit, lists });
      setMemberships(byContact);
      setListFilter(value => value === 'none' || lists.some(list => list.id === value) ? value : 'all');
    }).catch(() => {
      if (signal.aborted) return;
      setListAccess(null);
      setMemberships(null);
      setListFilter('all');
    });
    return () => controller.abort();
  }, [listRevision, isImportModalOpen]);

  const canAssign = listAccess?.canEdit === true;
  const selectedContacts = contacts
    .filter(contact => selectedIds.has(Number(contact.id)))
    .map(contact => ({ id: Number(contact.id), name: contact.contactPerson, email: contact.email }));
  const contactIds = (rows: SalesContact[]) => rows.map(row => Number(row.id)).filter(id => Number.isSafeInteger(id) && id > 0);
  const pageIds = contactIds(paginatedContacts);
  const filteredIds = contactIds(sortedContacts);
  const pageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const updateSelection = (ids: number[], remove = false) => {
    setAssignmentSaved(false);
    setSelectedIds(current => {
      const next = new Set(current);
      for (const id of ids) {
        if (remove) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const contactConfigurableColumns = useMemo<ColumnConfig[]>(() => (
    (['company', 'phone', 'email', 'source', 'owner', 'relationship', 'fiscal', 'notes', 'segmentationLists'] as ContactColumnId[]).map((columnId) => ({
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
  const contactTableColumnCount = 2 + visibleContactColumns.length + Number(canAssign);
  const renderedContactColumnIds = useMemo<ContactColumnId[]>(
    () => ['contact', ...visibleContactColumns],
    [visibleContactColumns],
  );
  const contactTableColumns = useMemo<Array<IndiceTableColumnDefinition<ContactColumnId>>>(() => (
    renderedContactColumnIds.map((columnId) => ({
      id: columnId,
      label: t.table.columns[columnId],
      width: columnWidths[columnId],
      defaultWidth: contactColumnWidths[columnId],
      contentMinimumWidth: contactMinimumColumnWidths[columnId],
      sortable: sortableContactColumnIds.includes(columnId),
      resizeLabel: `${t.table.columns[columnId]}: ajustar ancho`,
    }))
  ), [columnWidths, renderedContactColumnIds, t.table.columns]);
  const contactTableMinimumWidth = useMemo(
    () => renderedContactColumnIds.reduce((total, columnId) => total + columnWidths[columnId], contactActionsColumnWidth + (canAssign ? contactSelectionWidth : 0)),
    [canAssign, columnWidths, renderedContactColumnIds],
  );

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
    if (savingContactRef.current) return;
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

  const handleImportContacts = useContactFileImport(getOwnerPayloadFromValue(defaultOwnerValue), createContactRecord);

  const handleSaveContact = async () => {
    if (savingContactRef.current) return;
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

    savingContactRef.current = true;
    setIsSavingContact(true);
    setContactFormError('');
    try {
      if (editingContact) {
        await updateContactRecord(editingContact.id, contactPayload);
      } else {
        await createContactRecord(contactPayload);
      }
      setForm(buildInitialForm());
      setEditingContact(null);
      setIsContactModalOpen(false);
    } catch (error) {
      setContactFormError(error instanceof Error && error.message ? error.message : feedback.saveFailed);
    } finally {
      savingContactRef.current = false;
      setIsSavingContact(false);
    }
  };

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon="👥"
        rhIndent
        title={titleBarTitle ?? t.header.title}
        subtitle={t.header.subtitle}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={() => setIsImportModalOpen(true)}
            >
              <UploadCloud className="h-4 w-4" />
              {t.header.importContacts}
            </Button>
            {listAccess && <Button
              type="button"
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={() => setListWorkspace('manage')}
            >
              <ListPlus className="h-4 w-4" />
              {labels.manage}
            </Button>}
            <Button
              type="button"
              className={salesTitleBarPrimaryActionClassName}
              onClick={handleOpenCreateContact}
            >
              <Plus className="h-4 w-4" />
              {t.header.addContact}
            </Button>
            <IndiceTitleBarOverflow
              label={t.table.columns.actions}
              items={[
                {
                  id: 'meta-import',
                  icon: <CloudDownload className="h-4 w-4" />,
                  label: t.metaImport.trigger,
                  onSelect: () => setIsMetaImportModalOpen(true),
                },
                {
                  id: 'columns',
                  icon: <Columns3 className="h-4 w-4" />,
                  label: t.header.columnsAction,
                  onSelect: () => setIsColumnsModalOpen(true),
                },
              ]}
            />
          </>
        )}
      />

      {learningModeActive ? <ContactLearningGuide copy={learningCopy} /> : null}

      <SalesFilterBar
        title={t.search.title}
        gridClassName={listAccess ? "md:grid-cols-[2fr_1fr_1fr]" : "md:grid-cols-[2fr_1fr]"}
      >
        <SalesFilterSearch
          label={t.search.label}
          value={searchQuery}
          onValueChange={handleSearchChange}
          onClear={handleClearFilters}
          clearLabel={t.search.clearFilters}
          placeholder={t.search.placeholder}
        />
        {listAccess && <SalesFilterSelect
          label={t.table.columns.segmentationLists}
          value={listFilter}
          onValueChange={value => { setListFilter(value); setPaginationState(current => ({ ...current, currentPage: 1 })); }}
          options={[
            { value: 'all', label: labels.allLists },
            { value: 'none', label: labels.noList },
            ...listAccess.lists.map(list => ({ value: list.id, label: list.name })),
          ]}
        />}
        <SalesFilterSelect
          label={t.table.columns.owner}
          value={ownerFilter}
          onValueChange={value => { setOwnerFilter(value); setPaginationState(current => ({ ...current, currentPage: 1 })); }}
          options={[{ value: 'all', label: labels.allOwners }, ...ownerSelectOptions]}
        />
      </SalesFilterBar>

      {assignmentSaved && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{labels.saved}</p>}
      {canAssign && selectedContacts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 p-3">
          <span className="mr-auto px-1 text-sm font-semibold" aria-live="polite">{selectedContacts.length} {labels.selected}</span>
          <Button type="button" variant="outline" disabled={!filteredIds.length} onClick={() => updateSelection(filteredIds)}>
            {labels.selectResults} ({filteredIds.length})
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSelectedIds(new Set())}>{labels.clearSelection}</Button>
          <Button type="button" className={salesTitleBarPrimaryActionClassName} disabled={selectedContacts.length > 500}
            onClick={() => setListWorkspace('assign')}>{labels.add}</Button>
          {selectedContacts.length > 500 && <p className="w-full text-sm">{labels.limit}</p>}
        </div>
      )}

      <IndiceTableShell
        pagination={(
          <DataTablePagination
            currentPage={currentPage}
            itemLabel={t.header.title.toLocaleLowerCase()}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageEnd={pageEnd}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageStart={pageStart}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        )}
      >
        <IndiceOperationalTable
          minimumWidth={contactTableMinimumWidth}
          className={canAssign
            ? '[&_thead_th:nth-child(2)]:sticky [&_thead_th:nth-child(2)]:left-12 [&_thead_th:nth-child(2)]:z-10 [&_thead_th:nth-child(2)]:bg-slate-50 dark:[&_thead_th:nth-child(2)]:bg-slate-900'
            : '[&_thead_th:first-child]:sticky [&_thead_th:first-child]:left-0 [&_thead_th:first-child]:z-10 [&_thead_th:first-child]:bg-slate-50 dark:[&_thead_th:first-child]:bg-slate-900'}
        >
          <IndiceTableColGroup leadingControlWidth={canAssign ? contactSelectionWidth : undefined} columns={contactTableColumns} actionsWidth={contactActionsColumnWidth} />
          <IndiceTableHeaderRow
            leadingControl={canAssign ? {
              width: contactSelectionWidth,
              className: 'sticky left-0 z-20 bg-slate-50 dark:bg-slate-900',
              label: labels.selectPage,
              content: <input type="checkbox" aria-label={labels.selectPage} checked={pageSelected}
                disabled={!pageIds.length} onChange={() => updateSelection(pageIds, pageSelected)} className="size-4 accent-[#B63B32]" />,
            } : undefined}
            actions={{ label: t.table.columns.actions, width: contactActionsColumnWidth }}
            columns={contactTableColumns}
            onResize={resizeColumn}
            onSort={(columnId) => handleSort(columnId as ContactSortColumn)}
            sortState={{ columnId: sortState.columnId as ContactColumnId, direction: sortState.direction }}
          />
          <TableBody>
            {sortedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={contactTableColumnCount} className="px-5 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.table.emptyTitle}</p>
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
                <TableRow data-state={selectedIds.has(Number(contact.id)) ? 'selected' : undefined} key={contact.id} className="border-slate-100 hover:bg-[#FF6B5E]/[0.025] dark:border-slate-700 dark:hover:bg-slate-700/40">
                  {canAssign && <TableCell className="sticky left-0 z-10 bg-white px-2 py-3 text-center align-top dark:bg-slate-900">
                    <input type="checkbox" aria-label={`${spanish ? 'Seleccionar' : 'Select'} ${contact.contactPerson}`}
                      checked={selectedIds.has(Number(contact.id))} disabled={!Number.isSafeInteger(Number(contact.id)) || Number(contact.id) <= 0}
                      onChange={event => updateSelection([Number(contact.id)], !event.target.checked)} className="size-4 accent-[#B63B32]" />
                  </TableCell>}
                  <TableCell className={cn("sticky z-10 overflow-hidden whitespace-normal bg-white px-4 py-3 align-top dark:bg-slate-900", canAssign ? "left-12" : "left-0")}>
                    <div className="min-w-0 max-w-full space-y-1">
                      <p className="break-words font-medium text-slate-950 dark:text-white">{contact.contactPerson}</p>
                      <p className="break-all text-xs font-medium text-[#B63B32]">{contact.id}</p>
                      <p className="break-words text-xs text-slate-500">{contact.role}</p>
                    </div>
                  </TableCell>
                  {canShowContactColumn('company') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top text-sm font-medium text-slate-900 dark:text-slate-200">
                    <div className="min-w-0 max-w-full">
                      <p className={cn('break-words', !contact.company && 'text-slate-400')}>{contact.company || t.table.noCompany}</p>
                      {contact.fiscalTaxId ? (
                        <p className="mt-1 break-all text-xs font-medium text-slate-500">{contact.fiscalTaxId}</p>
                      ) : null}
                    </div>
                  </TableCell> : null}
                  {canShowContactColumn('phone') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300">
                    <span className={cn('block min-w-0 break-all', !hasPhone && 'font-medium text-slate-400')}>{hasPhone ? contact.phone : t.table.noPhone}</span>
                  </TableCell> : null}
                  {canShowContactColumn('email') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300">
                    <span className={cn('block min-w-0 break-all leading-6', !hasEmail && 'font-medium text-slate-400')}>{hasEmail ? contact.email : t.table.noEmail}</span>
                  </TableCell> : null}
                  {canShowContactColumn('source') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top">
                    <Badge variant="outline" className="h-auto max-w-full whitespace-normal rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {t.sources[contact.source]}
                    </Badge>
                  </TableCell> : null}
                  {canShowContactColumn('owner') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top">
                    <Select value={ownerValue} onValueChange={(value) => handleOwnerChange(contact, value)}>
                      <SelectTrigger className="h-10 w-full min-w-0 max-w-full rounded-full border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-none focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white [&>span]:truncate">
                        <SelectValue placeholder={t.table.ownerPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {rowOwnerOptions.map((owner) => (
                          <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell> : null}
                  {canShowContactColumn('relationship') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top">
                    <ContactRelationshipSignal copy={t.signals.relationship} signal={relationshipSignal} />
                  </TableCell> : null}
                  {canShowContactColumn('fiscal') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top">
                    <ContactFiscalBadge copy={t.signals.fiscal} signal={fiscalSignal} country={contact.fiscalCountry} />
                  </TableCell> : null}
                  {canShowContactColumn('notes') ? <TableCell className="overflow-hidden whitespace-normal px-4 py-3 align-top">
                    <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300" title={contact.notes || undefined}>
                      {contact.notes || '—'}
                    </p>
                  </TableCell> : null}
                  {canShowContactColumn('segmentationLists') ? <TableCell className="whitespace-normal px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {memberships?.get(Number(contact.id))?.map(list => (
                        <Badge key={list.listId} variant="outline" className="max-w-full whitespace-normal">{list.name}</Badge>
                      )) ?? '—'}
                    </div>
                  </TableCell> : null}
                  <TableCell className="overflow-hidden whitespace-normal px-4 py-3 text-right align-top">
                    <IndiceTableActionGroup>
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
                    </IndiceTableActionGroup>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>

      {listWorkspace && listAccess && (
        <AudienceWorkspace
          title={listWorkspace === 'assign' ? labels.add : labels.manage}
          canManage={listAccess.canEdit}
          assignment={listWorkspace === 'assign' ? selectedContacts : undefined}
          onClose={() => { setListWorkspace(null); setListRevision(value => value + 1); }}
          onAssignmentSaved={() => {
            setListWorkspace(null);
            setSelectedIds(new Set());
            setListRevision(value => value + 1);
            setAssignmentSaved(true);
          }}
        />
      )}

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
        isSaving={isSavingContact}
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

      <MetaLeadImportModal
        copy={t.metaImport}
        open={isMetaImportModalOpen}
        onOpenChange={setIsMetaImportModalOpen}
        onImported={reloadAll}
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
