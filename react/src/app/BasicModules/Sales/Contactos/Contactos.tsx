import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Mail,
  MessageCircle,
  PencilLine,
  Phone,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UsersRound,
} from 'lucide-react';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
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
import { salesApi } from '../salesApi';
import {
  opportunitySources,
  salesOwners,
  type OpportunitySource,
  type SalesContact,
  useSalesCrm,
} from '../salesCrmContext';
import { getSalesModalStyles } from '../salesModalStyles';
import { getPhoneHref, getWhatsAppHref } from '../utils/salesCommunicationUtils';
import {
  fallbackOwnerValue,
  getOwnerUserCompanyIdFromValue,
  normalizeSalesOwnerOption,
  ownerOptionValue,
  type SalesOwnerOption,
} from '../utils/salesOwnerOptions';
import { normalizeTextKey } from '../utils/salesTextUtils';
import { ContactFiscalBadge } from './components/ContactFiscalBadge';
import { ContactLearningGuide } from './components/ContactLearningGuide';
import { ImportContactsModal } from './components/ImportContactsModal';
import { ContactRelationshipSignal } from './components/ContactRelationshipSignal';
import { useContactLearningCopy } from './translations/contactLearning';
import { useContactTranslations } from './translations/contactTranslations';
import { getContactFiscalSignal, getContactRelationshipSignal } from './utils/contactTableSignals';
import type { ImportedContactDraft } from './utils/contactImportUtils';

type ContactSortColumn = 'contact' | 'company' | 'phone' | 'email' | 'source' | 'owner' | 'notes';
type ContactSortDirection = 'asc' | 'desc';

type ContactSortState = {
  columnId: ContactSortColumn;
  direction: ContactSortDirection;
};

type ContactFormState = {
  company: string;
  contactPerson: string;
  role: string;
  phone: string;
  email: string;
  source: OpportunitySource;
  ownerValue: string;
  owner: string;
  notes: string;
  fiscalCountry: string;
  fiscalLegalName: string;
  fiscalTaxId: string;
  fiscalRegistryId: string;
  fiscalAddressLine1: string;
  fiscalAddressLine2: string;
  fiscalCity: string;
  fiscalState: string;
  fiscalPostalCode: string;
  fiscalEmail: string;
  fiscalRegime: string;
  fiscalNotes: string;
};

interface ContactosProps {
  learningModeActive?: boolean;
}

type FiscalCountryOption = {
  value: string;
  label: string;
  taxIdLabel: string;
  registryLabel: string;
  regimeLabel: string;
};

const contactInputClassName = 'h-11 rounded-lg border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';
const contactSelectClassName = 'h-11 rounded-lg border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';
const contactModalStyles = getSalesModalStyles('coral');
const contactSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const fiscalCountryOptions: FiscalCountryOption[] = [
  {
    value: 'MX',
    label: 'México',
    taxIdLabel: 'RFC',
    registryLabel: 'Cédula / constancia fiscal',
    regimeLabel: 'Régimen fiscal',
  },
  {
    value: 'CA',
    label: 'Canadá',
    taxIdLabel: 'Business Number / GST-HST',
    registryLabel: 'Corporation number',
    regimeLabel: 'Tax program account',
  },
  {
    value: 'CO',
    label: 'Colombia',
    taxIdLabel: 'NIT / DIAN',
    registryLabel: 'DV / matrícula mercantil',
    regimeLabel: 'Responsabilidad fiscal',
  },
  {
    value: 'US',
    label: 'Estados Unidos',
    taxIdLabel: 'EIN / tax ID',
    registryLabel: 'State registration / corp number',
    regimeLabel: 'Tax classification',
  },
  {
    value: 'BR',
    label: 'Brasil',
    taxIdLabel: 'CNPJ / CPF',
    registryLabel: 'Inscrição estadual / municipal',
    regimeLabel: 'Regime tributário',
  },
];

const fallbackFiscalCountry = fiscalCountryOptions[0];

function ContactFormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const initialContactForm: ContactFormState = {
  company: '',
  contactPerson: '',
  role: '',
  phone: '',
  email: '',
  source: 'Manual',
  ownerValue: '',
  owner: salesOwners[0],
  notes: '',
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
};

function getContactOwnerSelectValue(contact: SalesContact, ownerOptions: SalesOwnerOption[]) {
  if (contact.ownerUserCompanyId) {
    return `user-company:${contact.ownerUserCompanyId}`;
  }

  const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(contact.owner));
  return matchedOwner ? ownerOptionValue(matchedOwner) : fallbackOwnerValue(contact.owner, 'Sin responsable');
}

function getFiscalCountryCopy(country: string) {
  return fiscalCountryOptions.find((option) => option.value === country) ?? fallbackFiscalCountry;
}

function getContactSortValue(contact: SalesContact, columnId: ContactSortColumn) {
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

function sortContacts(contacts: SalesContact[], sortState: ContactSortState) {
  return [...contacts].sort((left, right) => {
    const leftValue = getContactSortValue(left, sortState.columnId);
    const rightValue = getContactSortValue(right, sortState.columnId);
    const result = contactSortCollator.compare(leftValue, rightValue);
    return sortState.direction === 'asc' ? result : -result;
  });
}

function SortIcon({ columnId, sortState }: { columnId: ContactSortColumn; sortState: ContactSortState }) {
  if (sortState.columnId !== columnId) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
  }

  return sortState.direction === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-[#B63B32]" />
    : <ArrowDown className="h-3.5 w-3.5 text-[#B63B32]" />;
}

function normalizePhoneImportKey(phone: string) {
  return phone.replace(/\D/g, '');
}

function ContactActionButton({
  label,
  icon,
  className,
  href,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const controlClassName = cn(
    'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20',
    className,
    disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 hover:bg-slate-100',
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        title={label}
        aria-label={label}
        className={controlClassName}
        target={href.startsWith('https://') ? '_blank' : undefined}
        rel={href.startsWith('https://') ? 'noreferrer' : undefined}
      >
        {icon}
      </a>
    );
  }

  return (
    <button type="button" title={label} aria-label={label} className={controlClassName} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  );
}

export default function Contactos({ learningModeActive = false }: ContactosProps) {
  const t = useContactTranslations();
  const learningCopy = useContactLearningCopy();
  const { contacts, opportunities, quotes, addContact, updateContact, deleteContact } = useSalesCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SalesContact | null>(null);
  const [form, setForm] = useState<ContactFormState>(initialContactForm);
  const [sortState, setSortState] = useState<ContactSortState>({ columnId: 'contact', direction: 'asc' });
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
  const fiscalCopy = localizedFiscalCountryOptions.find((option) => option.value === form.fiscalCountry) ?? localizedFiscalCountryOptions[0] ?? getFiscalCountryCopy(form.fiscalCountry);

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

  const handleSort = (columnId: ContactSortColumn) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };

  const renderSortableHead = (columnId: ContactSortColumn, label: string, className?: string) => (
    <TableHead className={cn('px-5 py-5', className)}>
      <button
        type="button"
        className="inline-flex items-center gap-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-800"
        onClick={() => handleSort(columnId)}
      >
        {label}
        <SortIcon columnId={columnId} sortState={sortState} />
      </button>
    </TableHead>
  );

  const handleOpenCreateContact = () => {
    setEditingContact(null);
    setForm(buildInitialForm());
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (contact: SalesContact) => {
    const ownerValue = getContactOwnerSelectValue(contact, ownerOptions);
    setEditingContact(contact);
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
    const shouldDelete = window.confirm(t.actions.deleteConfirm(contact.contactPerson));
    if (!shouldDelete) {
      return;
    }

    deleteContact(contact.id);
    if (editingContact?.id === contact.id) {
      setEditingContact(null);
      setIsContactModalOpen(false);
    }
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
    if (!form.company.trim() || !form.contactPerson.trim()) return;

    const ownerPayload = getOwnerPayloadFromValue(form.ownerValue || defaultOwnerValue);
    const contactPayload = {
      company: form.company.trim(),
      contactPerson: form.contactPerson.trim(),
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

    setForm(buildInitialForm());
    setEditingContact(null);
    setIsContactModalOpen(false);
  };

  return (
    <section className="space-y-5">
      <section className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <span className="text-2xl leading-none" aria-hidden="true">👥</span>
              {t.header.title}
            </h2>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
              {t.header.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10"
              onClick={() => setIsImportModalOpen(true)}
            >
              <UploadCloud className="h-4 w-4" />
              {t.header.importContacts}
            </Button>
            <Button
              type="button"
              className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]"
              onClick={handleOpenCreateContact}
            >
              <Plus className="h-4 w-4" />
              {t.header.addContact}
            </Button>
          </div>
        </div>
      </section>

      {learningModeActive ? <ContactLearningGuide copy={learningCopy} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.search.placeholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
            <span>{t.search.visibleContacts}</span>
            <span className="font-bold text-slate-950">{sortedContacts.length}</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table className="min-w-[1660px]">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
              {renderSortableHead('contact', t.table.columns.contact)}
              {renderSortableHead('company', t.table.columns.company)}
              {renderSortableHead('phone', t.table.columns.phone)}
              {renderSortableHead('email', t.table.columns.email)}
              {renderSortableHead('source', t.table.columns.source)}
              {renderSortableHead('owner', t.table.columns.owner)}
              <TableHead className="px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t.table.columns.relationship}</TableHead>
              <TableHead className="px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t.table.columns.fiscal}</TableHead>
              {renderSortableHead('notes', t.table.columns.notes)}
              <TableHead className="px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t.table.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-5 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-sm font-bold text-slate-900">{t.table.emptyTitle}</p>
                    <p className="text-sm text-slate-500">
                      {t.table.emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedContacts.map((contact) => {
              const ownerValue = getContactOwnerSelectValue(contact, ownerOptions);
              const rowOwnerOptions = ownerSelectOptions.some((owner) => owner.value === ownerValue)
                ? ownerSelectOptions
                : [{ value: ownerValue, label: contact.owner || t.defaults.unassignedOwner }, ...ownerSelectOptions];
              const hasPhone = Boolean(contact.phone.trim());
              const hasEmail = Boolean(contact.email.trim());
              const fiscalSignal = getContactFiscalSignal(contact);
              const relationshipSignal = getContactRelationshipSignal({ contact, opportunities, quotes });

              return (
                <TableRow key={contact.id} className="border-slate-200 hover:bg-slate-50/80">
                  <TableCell className="px-5 py-5">
                    <div className="min-w-[210px] whitespace-normal">
                      <p className="font-bold text-slate-950">{contact.contactPerson}</p>
                      <p className="mt-1 text-xs font-semibold text-[#B63B32]">{contact.id}</p>
                      <p className="mt-1 text-xs text-slate-500">{contact.role}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-5 text-sm font-semibold text-slate-900">
                    <div className="min-w-[180px]">
                      <p className={cn(!contact.company && 'text-slate-400')}>{contact.company || t.table.noCompany}</p>
                      {contact.fiscalTaxId ? (
                        <p className="mt-1 text-xs font-medium text-slate-500">{contact.fiscalTaxId}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-5 text-sm text-slate-700">
                    <span className={cn(!hasPhone && 'font-medium text-slate-400')}>{hasPhone ? contact.phone : t.table.noPhone}</span>
                  </TableCell>
                  <TableCell className="px-5 py-5 text-sm text-slate-700">
                    <span className={cn(!hasEmail && 'font-medium text-slate-400')}>{hasEmail ? contact.email : t.table.noEmail}</span>
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
                      {t.sources[contact.source]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <Select value={ownerValue} onValueChange={(value) => handleOwnerChange(contact, value)}>
                      <SelectTrigger className="h-10 min-w-[190px] rounded-full border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-none focus:ring-[#FF6B5E]/20">
                        <SelectValue placeholder={t.table.ownerPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {rowOwnerOptions.map((owner) => (
                          <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <ContactRelationshipSignal copy={t.signals.relationship} signal={relationshipSignal} />
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <ContactFiscalBadge copy={t.signals.fiscal} signal={fiscalSignal} country={contact.fiscalCountry} />
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <Textarea
                      value={contact.notes}
                      onChange={(event) => updateContact(contact.id, { notes: event.target.value })}
                      placeholder={t.table.notesPlaceholder}
                      className="min-h-[58px] min-w-[260px] resize-none rounded-lg border-slate-200 bg-white text-sm text-slate-800 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
                    />
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                      <ContactActionButton label={hasPhone ? t.actions.call(contact.contactPerson) : t.actions.noPhone} icon={<Phone className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15" href={hasPhone ? getPhoneHref(contact.phone) : undefined} disabled={!hasPhone} />
                      <ContactActionButton label={hasPhone ? t.actions.whatsapp(contact.contactPerson) : t.actions.noPhone} icon={<MessageCircle className="h-4 w-4" />} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" href={hasPhone ? getWhatsAppHref(contact.phone) : undefined} disabled={!hasPhone} />
                      <ContactActionButton label={hasEmail ? t.actions.email(contact.contactPerson) : t.actions.noEmail} icon={<Mail className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20" href={hasEmail ? `mailto:${contact.email}` : undefined} disabled={!hasEmail} />
                      <ContactActionButton
                        label={t.actions.edit(contact.contactPerson)}
                        icon={<PencilLine className="h-4 w-4" />}
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        onClick={() => handleOpenEditContact(contact)}
                      />
                      <ContactActionButton
                        label={t.actions.delete(contact.contactPerson)}
                        icon={<Trash2 className="h-4 w-4" />}
                        className="border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] hover:bg-[#FF6B5E]/20"
                        onClick={() => handleDeleteContact(contact)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <Dialog open={isContactModalOpen} onOpenChange={handleContactModalOpenChange}>
        <DialogContent className={cn(contactModalStyles.content, '!flex max-h-[90vh] max-w-4xl flex-col !gap-0')} closeButtonClassName={contactModalStyles.close}>
          <DialogHeader className={cn(contactModalStyles.header, 'shrink-0')}>
            <DialogTitle className={contactModalStyles.title}>
              <UsersRound className="h-6 w-6" />
              {editingContact ? t.modal.editTitle : t.modal.createTitle}
            </DialogTitle>
            <DialogDescription className={contactModalStyles.description}>
              {t.modal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{t.modal.commercialTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">{t.modal.commercialDescription}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ContactFormField label={t.modal.fields.company}>
                  <Input value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} placeholder={t.modal.placeholders.company} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.contactPerson}>
                  <Input value={form.contactPerson} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} placeholder={t.modal.placeholders.contactPerson} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.role}>
                  <Input value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} placeholder={t.modal.placeholders.role} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.phone}>
                  <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder={t.modal.placeholders.phone} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.email}>
                  <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder={t.modal.placeholders.email} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.source}>
                  <Select value={form.source} onValueChange={(value) => setForm((current) => ({ ...current, source: value as OpportunitySource }))}>
                    <SelectTrigger className={contactSelectClassName}><SelectValue placeholder={t.modal.placeholders.source} /></SelectTrigger>
                    <SelectContent>{opportunitySources.map((source) => <SelectItem key={source} value={source}>{t.sources[source]}</SelectItem>)}</SelectContent>
                  </Select>
                </ContactFormField>
                <ContactFormField label={t.modal.fields.owner}>
                  <Select value={form.ownerValue || defaultOwnerValue} onValueChange={handleFormOwnerChange}>
                    <SelectTrigger className={contactSelectClassName}><SelectValue placeholder={t.modal.placeholders.owner} /></SelectTrigger>
                    <SelectContent>
                      {ownerSelectOptions.map((owner) => <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ContactFormField>
                <ContactFormField label={t.modal.fields.notes} className="md:col-span-2">
                  <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.modal.placeholders.notes} className="min-h-24 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
                </ContactFormField>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#B63B32]">{t.modal.fiscalTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t.modal.fiscalDescription}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ContactFormField label={t.modal.fields.fiscalCountry}>
                  <Select value={form.fiscalCountry} onValueChange={(value) => setForm((current) => ({ ...current, fiscalCountry: value }))}>
                    <SelectTrigger className={contactSelectClassName}><SelectValue placeholder={t.modal.placeholders.fiscalCountry} /></SelectTrigger>
                    <SelectContent>
                      {localizedFiscalCountryOptions.map((country) => <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalLegalName}>
                  <Input value={form.fiscalLegalName} onChange={(event) => setForm((current) => ({ ...current, fiscalLegalName: event.target.value }))} placeholder={t.modal.placeholders.fiscalLegalName} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={fiscalCopy.taxIdLabel}>
                  <Input value={form.fiscalTaxId} onChange={(event) => setForm((current) => ({ ...current, fiscalTaxId: event.target.value }))} placeholder={t.modal.placeholders.fiscalTaxId} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={fiscalCopy.registryLabel}>
                  <Input value={form.fiscalRegistryId} onChange={(event) => setForm((current) => ({ ...current, fiscalRegistryId: event.target.value }))} placeholder={t.modal.placeholders.fiscalRegistryId} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalAddressLine1}>
                  <Input value={form.fiscalAddressLine1} onChange={(event) => setForm((current) => ({ ...current, fiscalAddressLine1: event.target.value }))} placeholder={t.modal.placeholders.fiscalAddressLine1} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalAddressLine2}>
                  <Input value={form.fiscalAddressLine2} onChange={(event) => setForm((current) => ({ ...current, fiscalAddressLine2: event.target.value }))} placeholder={t.modal.placeholders.fiscalAddressLine2} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalCity}>
                  <Input value={form.fiscalCity} onChange={(event) => setForm((current) => ({ ...current, fiscalCity: event.target.value }))} placeholder={t.modal.placeholders.fiscalCity} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalState}>
                  <Input value={form.fiscalState} onChange={(event) => setForm((current) => ({ ...current, fiscalState: event.target.value }))} placeholder={t.modal.placeholders.fiscalState} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalPostalCode}>
                  <Input value={form.fiscalPostalCode} onChange={(event) => setForm((current) => ({ ...current, fiscalPostalCode: event.target.value }))} placeholder={t.modal.placeholders.fiscalPostalCode} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalEmail}>
                  <Input value={form.fiscalEmail} onChange={(event) => setForm((current) => ({ ...current, fiscalEmail: event.target.value }))} placeholder={t.modal.placeholders.fiscalEmail} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={fiscalCopy.regimeLabel}>
                  <Input value={form.fiscalRegime} onChange={(event) => setForm((current) => ({ ...current, fiscalRegime: event.target.value }))} placeholder={t.modal.placeholders.fiscalRegime} className={contactInputClassName} />
                </ContactFormField>
                <ContactFormField label={t.modal.fields.fiscalNotes} className="md:col-span-2">
                  <Textarea value={form.fiscalNotes} onChange={(event) => setForm((current) => ({ ...current, fiscalNotes: event.target.value }))} placeholder={t.modal.placeholders.fiscalNotes} className="min-h-20 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
                </ContactFormField>
              </div>
            </section>
          </div>

          <DialogFooter className={cn(contactModalStyles.footer, 'shrink-0')}>
            <Button variant="outline" className={contactModalStyles.secondaryButton} onClick={() => handleContactModalOpenChange(false)}>{t.modal.cancel}</Button>
            <Button className={contactModalStyles.primaryButton} onClick={handleSaveContact}>
              {editingContact ? t.modal.saveChanges : t.modal.saveContact}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportContactsModal
        copy={t.importModal}
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportContacts={handleImportContacts}
      />
    </section>
  );
}
