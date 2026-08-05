import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, UserRoundPlus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../../components/ui/command';
import { Input } from '../../../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover';
import { cn } from '../../../../components/ui/utils';
import type { CreateContactInput, SalesContact } from '../../types';
import type { SalesRecordsTranslations } from '../translations';
import { salesFieldClassName } from './SalesModalPrimitives';

type QuickCustomerDraft = {
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
};

const emptyDraft: QuickCustomerDraft = {
  company: '',
  contactPerson: '',
  email: '',
  phone: '',
};

function customerLabel(contact: SalesContact) {
  return contact.company.trim() || contact.contactPerson.trim() || contact.email.trim();
}

export function SalesCustomerSelector({
  contacts,
  selectedContactId,
  selectedCustomerName,
  t,
  onSelectCustomer,
  onCreateCustomer,
}: {
  contacts: SalesContact[];
  selectedContactId?: string;
  selectedCustomerName: string;
  t: SalesRecordsTranslations;
  onSelectCustomer: (contactId: string, contact?: SalesContact) => void;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [draft, setDraft] = useState<QuickCustomerDraft>(emptyDraft);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );
  const selectedLabel = selectedContact ? customerLabel(selectedContact) : selectedCustomerName;

  const handleCreate = async () => {
    const company = draft.company.trim();
    if (!company) {
      setError(t.modal.quickCustomer.requiredError);
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const contact = await onCreateCustomer({
        company,
        contactPerson: draft.contactPerson.trim() || company,
        role: '',
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        source: 'Existing customer',
        ownerUserCompanyId: null,
        owner: '',
        tags: [],
        notes: '',
        fiscalCountry: '',
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
        status: 'Active',
        filesCount: 0,
      });
      onSelectCustomer(contact.id, contact);
      setDraft(emptyDraft);
      setIsQuickCreateOpen(false);
    } catch {
      setError(t.modal.quickCustomer.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={isPickerOpen}
              aria-label={t.modal.fields.customerName}
              className={cn(salesFieldClassName, 'h-11 flex-1 justify-between px-3 font-normal')}
            >
              <span className={cn('truncate', !selectedLabel && 'text-slate-500')}>
                {selectedLabel || t.modal.placeholders.customerSelector}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder={t.modal.placeholders.customerSelector} />
              <CommandList>
                <CommandEmpty>{t.modal.quickCustomer.emptySearch}</CommandEmpty>
                <CommandGroup>
                  {contacts.map((contact) => {
                    const label = customerLabel(contact);
                    return (
                      <CommandItem
                        key={contact.id}
                        value={`${label} ${contact.contactPerson} ${contact.email} ${contact.phone}`}
                        onSelect={() => {
                          onSelectCustomer(contact.id, contact);
                          setIsPickerOpen(false);
                        }}
                      >
                        <Check className={cn('h-4 w-4', contact.id === selectedContactId ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-900">{label}</span>
                          {contact.contactPerson || contact.email ? (
                            <span className="block truncate text-xs text-slate-500">
                              {[contact.contactPerson, contact.email].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl border-emerald-200 px-4 font-medium text-emerald-800 hover:bg-emerald-50"
          onClick={() => {
            setIsQuickCreateOpen((current) => !current);
            setError('');
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.modal.quickCustomer.addAction}
        </Button>
      </div>

      {isQuickCreateOpen ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-200">
              <UserRoundPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h4 className="font-medium text-slate-950">{t.modal.quickCustomer.title}</h4>
              <p className="mt-1 text-sm leading-5 text-slate-600">{t.modal.quickCustomer.description}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={t.modal.quickCustomer.company}
              value={draft.company}
              onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))}
              placeholder={t.modal.quickCustomer.companyPlaceholder}
              className={salesFieldClassName}
              disabled={isSaving}
            />
            <Input
              aria-label={t.modal.quickCustomer.contactPerson}
              value={draft.contactPerson}
              onChange={(event) => setDraft((current) => ({ ...current, contactPerson: event.target.value }))}
              placeholder={t.modal.quickCustomer.contactPlaceholder}
              className={salesFieldClassName}
              disabled={isSaving}
            />
            <Input
              aria-label={t.modal.quickCustomer.email}
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder={t.modal.quickCustomer.emailPlaceholder}
              className={salesFieldClassName}
              disabled={isSaving}
            />
            <Input
              aria-label={t.modal.quickCustomer.phone}
              type="tel"
              value={draft.phone}
              onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
              placeholder={t.modal.quickCustomer.phonePlaceholder}
              className={salesFieldClassName}
              disabled={isSaving}
            />
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setIsQuickCreateOpen(false);
                setError('');
              }}
              disabled={isSaving}
            >
              {t.modal.quickCustomer.cancel}
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-emerald-700 font-medium text-white hover:bg-emerald-800"
              onClick={() => { void handleCreate(); }}
              disabled={isSaving}
            >
              {isSaving ? t.modal.quickCustomer.creating : t.modal.quickCustomer.create}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
