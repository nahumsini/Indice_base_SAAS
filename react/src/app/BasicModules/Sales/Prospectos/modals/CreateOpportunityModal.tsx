import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  BriefcaseBusiness,
  ChevronRight,
  Mail,
  Phone,
  Target,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { SalesCustomerSelector } from '../../Sales/components/SalesCustomerSelector';
import type { SalesRecordsTranslations } from '../../Sales/translations';
import {
  type CreateContactInput,
  opportunitySources,
  type OpportunitySource,
  type SalesContact,
  type SalesOpportunity,
} from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import type { OpportunityFormState } from '../types/prospectosTypes';
import { opportunityInputClassName, opportunitySelectClassName } from '../utils/prospectosStatus';

const opportunityActionClassNames = getSalesModalActionClassNames('coral');

function OpportunityFormField({
  label,
  required = false,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-[#B63B32]">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function OpportunitySection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-medium text-slate-950">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function CreateOpportunityModal({
  copy,
  customerCopy,
  isOpen,
  editingOpportunity,
  form,
  contacts,
  formOwnerSelectOptions,
  defaultOwnerValue,
  setForm,
  onContactChange,
  onCreateCustomer,
  getOwnerPayloadFromValue,
  onOpenChange,
  onSave,
}: {
  copy: ProspectosCopy['modal'] & { options: ProspectosCopy['options'] };
  customerCopy: SalesRecordsTranslations;
  isOpen: boolean;
  editingOpportunity: SalesOpportunity | null;
  form: OpportunityFormState;
  contacts: SalesContact[];
  formOwnerSelectOptions: Array<{ value: string; label: string }>;
  defaultOwnerValue: string;
  setForm: Dispatch<SetStateAction<OpportunityFormState>>;
  onContactChange: (contactId: string, contact?: SalesContact) => void;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
  getOwnerPayloadFromValue: (value: string) => { ownerUserCompanyId: number | null; owner: string };
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const ownerValue = form.ownerValue || defaultOwnerValue;
  const selectedContact = contacts.find((contact) => contact.id === form.contactId) ?? null;
  const canSave = Boolean(
    form.opportunityName.trim()
    && form.contactId
    && ownerValue.startsWith('user-company:'),
  );

  return (
    <SalesModalFrame
      open={isOpen}
      onOpenChange={onOpenChange}
      title={editingOpportunity ? copy.editTitle : copy.createTitle}
      description={editingOpportunity ? copy.editDescription : copy.createDescription}
      icon={<Target className="h-5 w-5" />}
      closeLabel={copy.cancel}
      modalType="wizard"
      contentClassName="max-h-[min(92dvh,800px)]"
      bodyClassName="space-y-4 bg-slate-50/70"
      footerSummary={selectedContact
        ? `${selectedContact.company} · ${form.opportunityName.trim() || copy.placeholders.opportunityName}`
        : copy.summary.noContact}
      footer={(
        <>
          <Button
            variant="outline"
            className={opportunityActionClassNames.secondary}
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            className={opportunityActionClassNames.primary}
            disabled={!canSave}
            onClick={onSave}
          >
            {editingOpportunity ? copy.saveChanges : copy.createOpportunity}
          </Button>
        </>
      )}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm font-medium text-slate-700">
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6B5E] text-xs text-white">1</span>
          {copy.fields.contact}
        </span>
        <ChevronRight className="h-4 w-4 text-[#B63B32]" aria-hidden="true" />
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs text-[#B63B32] ring-1 ring-[#FF6B5E]/30">2</span>
          {copy.sections.quickCapture}
        </span>
      </div>

      <OpportunitySection
        icon={UsersRound}
        title={copy.fields.contact}
        description={customerCopy.modal.quickCustomer.description}
      >
        <SalesCustomerSelector
          contacts={contacts}
          selectedContactId={form.contactId}
          selectedCustomerName={selectedContact?.company ?? ''}
          t={customerCopy}
          onSelectCustomer={onContactChange}
          onCreateCustomer={onCreateCustomer}
        />

        {selectedContact ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{copy.fields.contact}</p>
              <p className="mt-1 truncate font-medium text-slate-900">{selectedContact.contactPerson || selectedContact.company}</p>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4 shrink-0 text-[#B63B32]" aria-hidden="true" />
              <span className="truncate">{selectedContact.email || '—'}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-slate-600">
              <Phone className="h-4 w-4 shrink-0 text-[#B63B32]" aria-hidden="true" />
              <span className="truncate">{selectedContact.phone || '—'}</span>
            </div>
          </div>
        ) : null}
      </OpportunitySection>

      <OpportunitySection
        icon={BriefcaseBusiness}
        title={copy.sections.quickCapture}
        description={copy.createDescription}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <OpportunityFormField label={copy.fields.opportunityName} required className="md:col-span-2">
            <Input
              value={form.opportunityName}
              onChange={(event) => setForm((current) => ({ ...current, opportunityName: event.target.value }))}
              placeholder={copy.placeholders.opportunityName}
              required
              className={opportunityInputClassName}
            />
          </OpportunityFormField>

          <OpportunityFormField label={copy.fields.source}>
            <Select value={form.source} onValueChange={(value) => setForm((current) => ({ ...current, source: value as OpportunitySource }))}>
              <SelectTrigger className={opportunitySelectClassName}>
                <SelectValue placeholder={copy.placeholders.source} />
              </SelectTrigger>
              <SelectContent>
                {opportunitySources.map((source) => (
                  <SelectItem key={source} value={source}>{copy.options.sources[source]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OpportunityFormField>

          <OpportunityFormField label={copy.fields.owner} required>
            <Select
              value={ownerValue}
              onValueChange={(value) => {
                const ownerPayload = getOwnerPayloadFromValue(value);
                setForm((current) => ({
                  ...current,
                  ownerValue: value,
                  owner: ownerPayload.owner,
                }));
              }}
            >
              <SelectTrigger className={opportunitySelectClassName}>
                <SelectValue placeholder={copy.placeholders.owner} />
              </SelectTrigger>
              <SelectContent>
                {formOwnerSelectOptions.map((owner) => (
                  <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OpportunityFormField>
        </div>
      </OpportunitySection>
    </SalesModalFrame>
  );
}
