import type { Dispatch, SetStateAction } from 'react';
import { AlertCircle, BriefcaseBusiness, FileText, UsersRound } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { opportunitySources, type OpportunitySource, type SalesContact } from '../../salesCrmContext';
import {
  contactInputClassName,
  contactModalActionClassNames,
  contactSelectClassName,
} from '../constants/contactConstants';
import type { ContactCopy } from '../translations/types';
import type { ContactFormState, ContactOwnerSelectOption, FiscalCountryOption } from '../types/contactTypes';
import { getFiscalCountryCopy } from '../utils/contactPageUtils';
import { ContactFormField, ContactFormSection } from './ContactFormPrimitives';

type ContactFormModalProps = {
  open: boolean;
  editingContact: SalesContact | null;
  form: ContactFormState;
  setForm: Dispatch<SetStateAction<ContactFormState>>;
  copy: ContactCopy;
  localizedFiscalCountryOptions: FiscalCountryOption[];
  ownerSelectOptions: ContactOwnerSelectOption[];
  defaultOwnerValue: string;
  formError?: string;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onOwnerChange: (value: string) => void;
};

export function ContactFormModal({
  open,
  editingContact,
  form,
  setForm,
  copy,
  localizedFiscalCountryOptions,
  ownerSelectOptions,
  defaultOwnerValue,
  formError,
  onOpenChange,
  onSave,
  onOwnerChange,
}: ContactFormModalProps) {
  const fiscalCopy =
    localizedFiscalCountryOptions.find((option) => option.value === form.fiscalCountry) ??
    localizedFiscalCountryOptions[0] ??
    getFiscalCountryCopy(form.fiscalCountry);

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<UsersRound className="h-5 w-5" />}
      title={editingContact ? copy.modal.editTitle : copy.modal.createTitle}
      description={copy.modal.description}
      contentClassName="flex max-h-[calc(100vh-2rem)] w-[min(94vw,960px)] max-w-none flex-col sm:max-w-none"
      bodyClassName="!max-h-none min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 px-6 py-5"
      footer={
        <>
          <Button
            variant="outline"
            className={contactModalActionClassNames.secondary}
            onClick={() => onOpenChange(false)}
          >
            {copy.modal.cancel}
          </Button>
          <Button className={contactModalActionClassNames.primary} onClick={onSave}>
            {editingContact ? copy.modal.saveChanges : copy.modal.saveContact}
          </Button>
        </>
      }
    >
      {formError ? (
        <div className="flex items-start gap-3 rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 px-4 py-3 text-sm font-bold text-[#B63B32]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{formError}</p>
        </div>
      ) : null}

      <ContactFormSection
        icon={BriefcaseBusiness}
        title={copy.modal.commercialTitle}
        description={copy.modal.commercialDescription}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ContactFormField label={copy.modal.fields.company}>
            <Input
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
              placeholder={copy.modal.placeholders.company}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.contactPerson}>
            <Input
              value={form.contactPerson}
              onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))}
              placeholder={copy.modal.placeholders.contactPerson}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.role}>
            <Input
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              placeholder={copy.modal.placeholders.role}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.phone}>
            <Input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder={copy.modal.placeholders.phone}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.email}>
            <Input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder={copy.modal.placeholders.email}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.source}>
            <Select
              value={form.source}
              onValueChange={(value) => setForm((current) => ({ ...current, source: value as OpportunitySource }))}
            >
              <SelectTrigger className={contactSelectClassName}>
                <SelectValue placeholder={copy.modal.placeholders.source} />
              </SelectTrigger>
              <SelectContent>
                {opportunitySources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {copy.sources[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.owner}>
            <Select value={form.ownerValue || defaultOwnerValue} onValueChange={onOwnerChange}>
              <SelectTrigger className={contactSelectClassName}>
                <SelectValue placeholder={copy.modal.placeholders.owner} />
              </SelectTrigger>
              <SelectContent>
                {ownerSelectOptions.map((owner) => (
                  <SelectItem key={owner.value} value={owner.value}>
                    {owner.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.notes} className="md:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={copy.modal.placeholders.notes}
              className="min-h-24 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </ContactFormField>
        </div>
      </ContactFormSection>

      <ContactFormSection
        icon={FileText}
        title={copy.modal.fiscalTitle}
        description={copy.modal.fiscalDescription}
        tone="coral"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ContactFormField label={copy.modal.fields.fiscalCountry}>
            <Select
              value={form.fiscalCountry}
              onValueChange={(value) => setForm((current) => ({ ...current, fiscalCountry: value }))}
            >
              <SelectTrigger className={contactSelectClassName}>
                <SelectValue placeholder={copy.modal.placeholders.fiscalCountry} />
              </SelectTrigger>
              <SelectContent>
                {localizedFiscalCountryOptions.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalLegalName}>
            <Input
              value={form.fiscalLegalName}
              onChange={(event) => setForm((current) => ({ ...current, fiscalLegalName: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalLegalName}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={fiscalCopy.taxIdLabel}>
            <Input
              value={form.fiscalTaxId}
              onChange={(event) => setForm((current) => ({ ...current, fiscalTaxId: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalTaxId}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={fiscalCopy.registryLabel}>
            <Input
              value={form.fiscalRegistryId}
              onChange={(event) => setForm((current) => ({ ...current, fiscalRegistryId: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalRegistryId}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalAddressLine1}>
            <Input
              value={form.fiscalAddressLine1}
              onChange={(event) => setForm((current) => ({ ...current, fiscalAddressLine1: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalAddressLine1}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalAddressLine2}>
            <Input
              value={form.fiscalAddressLine2}
              onChange={(event) => setForm((current) => ({ ...current, fiscalAddressLine2: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalAddressLine2}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalCity}>
            <Input
              value={form.fiscalCity}
              onChange={(event) => setForm((current) => ({ ...current, fiscalCity: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalCity}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalState}>
            <Input
              value={form.fiscalState}
              onChange={(event) => setForm((current) => ({ ...current, fiscalState: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalState}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalPostalCode}>
            <Input
              value={form.fiscalPostalCode}
              onChange={(event) => setForm((current) => ({ ...current, fiscalPostalCode: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalPostalCode}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalEmail}>
            <Input
              value={form.fiscalEmail}
              onChange={(event) => setForm((current) => ({ ...current, fiscalEmail: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalEmail}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={fiscalCopy.regimeLabel}>
            <Input
              value={form.fiscalRegime}
              onChange={(event) => setForm((current) => ({ ...current, fiscalRegime: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalRegime}
              className={contactInputClassName}
            />
          </ContactFormField>
          <ContactFormField label={copy.modal.fields.fiscalNotes} className="md:col-span-2">
            <Textarea
              value={form.fiscalNotes}
              onChange={(event) => setForm((current) => ({ ...current, fiscalNotes: event.target.value }))}
              placeholder={copy.modal.placeholders.fiscalNotes}
              className="min-h-20 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </ContactFormField>
        </div>
      </ContactFormSection>
    </SalesModalFrame>
  );
}
