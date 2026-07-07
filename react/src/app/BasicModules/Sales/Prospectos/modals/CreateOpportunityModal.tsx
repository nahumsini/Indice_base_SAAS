import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  BriefcaseBusiness,
  Target,
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
import {
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
      <label className="text-sm font-semibold text-slate-700">
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
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32]">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function CreateOpportunityModal({
  copy,
  isOpen,
  editingOpportunity,
  form,
  contacts,
  formOwnerSelectOptions,
  defaultOwnerValue,
  setForm,
  onContactChange,
  getOwnerPayloadFromValue,
  onOpenChange,
  onSave,
}: {
  copy: ProspectosCopy['modal'] & { options: ProspectosCopy['options'] };
  isOpen: boolean;
  editingOpportunity: SalesOpportunity | null;
  form: OpportunityFormState;
  contacts: SalesContact[];
  formOwnerSelectOptions: Array<{ value: string; label: string }>;
  defaultOwnerValue: string;
  setForm: Dispatch<SetStateAction<OpportunityFormState>>;
  onContactChange: (contactId: string) => void;
  getOwnerPayloadFromValue: (value: string) => { ownerUserCompanyId: number | null; owner: string };
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const ownerValue = form.ownerValue || defaultOwnerValue;

  return (
    <SalesModalFrame
      open={isOpen}
      onOpenChange={onOpenChange}
      title={editingOpportunity ? copy.editTitle : copy.createTitle}
      description={editingOpportunity ? copy.editDescription : copy.createDescription}
      icon={<Target className="h-5 w-5" />}
      contentClassName="flex max-h-[calc(100vh-2rem)] w-[min(94vw,768px)] max-w-none flex-col sm:max-w-none"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5"
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
            onClick={onSave}
          >
            {editingOpportunity ? copy.saveChanges : copy.createOpportunity}
          </Button>
        </>
      )}
    >
          <OpportunitySection icon={BriefcaseBusiness} title={copy.sections.quickCapture}>
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

              <OpportunityFormField label={copy.fields.contact} required>
                <Select value={form.contactId} onValueChange={onContactChange}>
                  <SelectTrigger className={opportunitySelectClassName}>
                    <SelectValue placeholder={copy.placeholders.contact} />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.company} · {contact.contactPerson}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <OpportunityFormField label={copy.fields.owner} className="md:col-span-2">
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
