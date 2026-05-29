import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import {
  opportunityNextActions,
  opportunityProbabilities,
  opportunitySources,
  opportunityStages,
  opportunityStatuses,
  opportunityTemperatures,
  type OpportunityNextAction,
  type OpportunityProbability,
  type OpportunitySource,
  type OpportunityStage,
  type OpportunityStatus,
  type OpportunityTemperature,
  type SalesContact,
  type SalesOpportunity,
} from '../../salesCrmContext';
import { getSalesModalStyles } from '../../salesModalStyles';
import type { ProspectosCopy } from '../translations/prospectosTranslations';
import type { OpportunityFormState } from '../types/prospectosTypes';
import { getOpportunityStatusForStage, normalizeEstimatedValueInput } from '../utils/prospectosFormatters';
import { opportunityInputClassName, opportunitySelectClassName } from '../utils/prospectosStatus';

const opportunityModalStyles = getSalesModalStyles('coral');

function OpportunityFormField({
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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(opportunityModalStyles.content, 'max-h-[90vh] max-w-5xl')} closeButtonClassName={opportunityModalStyles.close}>
        <DialogHeader className={opportunityModalStyles.header}>
          <DialogTitle className={opportunityModalStyles.title}>
            {editingOpportunity ? copy.editTitle : copy.createTitle}
          </DialogTitle>
          <DialogDescription className={opportunityModalStyles.description}>
            {editingOpportunity ? copy.editDescription : copy.createDescription}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(opportunityModalStyles.body, 'grid grid-cols-1 gap-4 md:grid-cols-3')}>
          <OpportunityFormField label={copy.fields.opportunityName} className="md:col-span-2">
            <Input value={form.opportunityName} onChange={(event) => setForm((current) => ({ ...current, opportunityName: event.target.value }))} placeholder={copy.placeholders.opportunityName} className={opportunityInputClassName} />
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.contact}>
            <Select value={form.contactId} onValueChange={onContactChange}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.contact} /></SelectTrigger>
              <SelectContent>{contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.company} · {contact.contactPerson}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.source}>
            <Select value={form.source} onValueChange={(value) => setForm((current) => ({ ...current, source: value as OpportunitySource }))}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.source} /></SelectTrigger>
              <SelectContent>{opportunitySources.map((source) => <SelectItem key={source} value={source}>{copy.options.sources[source]}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.stage}>
            <Select value={form.stage} onValueChange={(value) => setForm((current) => {
              const stage = value as OpportunityStage;
              return {
                ...current,
                stage,
                status: getOpportunityStatusForStage(stage, current.status),
              };
            })}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.stage} /></SelectTrigger>
              <SelectContent>{opportunityStages.map((stage) => <SelectItem key={stage} value={stage}>{copy.options.stages[stage]}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.temperature}>
            <Select value={form.temperature} onValueChange={(value) => setForm((current) => ({ ...current, temperature: value as OpportunityTemperature }))}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.temperature} /></SelectTrigger>
              <SelectContent>{opportunityTemperatures.map((temperature) => <SelectItem key={temperature} value={temperature}>{copy.options.temperatures[temperature]}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.owner}>
            <Select
              value={form.ownerValue || defaultOwnerValue}
              onValueChange={(value) => {
                const ownerPayload = getOwnerPayloadFromValue(value);
                setForm((current) => ({
                  ...current,
                  ownerValue: value,
                  owner: ownerPayload.owner,
                }));
              }}
            >
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.owner} /></SelectTrigger>
              <SelectContent>{formOwnerSelectOptions.map((owner) => <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.estimatedValue}>
            <Input value={form.estimatedValue} inputMode="decimal" onChange={(event) => setForm((current) => ({ ...current, estimatedValue: normalizeEstimatedValueInput(event.target.value) }))} placeholder={copy.placeholders.estimatedValue} className={opportunityInputClassName} />
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.probability}>
            <Select value={form.probability} onValueChange={(value) => setForm((current) => ({ ...current, probability: value as OpportunityProbability }))}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.probability} /></SelectTrigger>
              <SelectContent>{opportunityProbabilities.map((probability) => <SelectItem key={probability} value={probability}>{probability}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.expectedCloseDate}>
            <Input type="date" value={form.expectedCloseDate} onChange={(event) => setForm((current) => ({ ...current, expectedCloseDate: event.target.value }))} className={opportunityInputClassName} />
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.nextAction}>
            <Select value={form.nextAction} onValueChange={(value) => setForm((current) => ({ ...current, nextAction: value as OpportunityNextAction }))}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.nextAction} /></SelectTrigger>
              <SelectContent>{opportunityNextActions.map((action) => <SelectItem key={action} value={action}>{copy.options.nextActions[action]}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.nextActionDate}>
            <Input value={form.nextActionDate} onChange={(event) => setForm((current) => ({ ...current, nextActionDate: event.target.value }))} placeholder={copy.placeholders.nextActionDate} className={opportunityInputClassName} />
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.lastContact}>
            <Input type="date" value={form.lastContact} onChange={(event) => setForm((current) => ({ ...current, lastContact: event.target.value }))} className={opportunityInputClassName} />
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.status}>
            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as OpportunityStatus }))}>
              <SelectTrigger className={opportunitySelectClassName}><SelectValue placeholder={copy.placeholders.status} /></SelectTrigger>
              <SelectContent>{opportunityStatuses.map((status) => <SelectItem key={status} value={status}>{copy.options.statuses[status]}</SelectItem>)}</SelectContent>
            </Select>
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.files} className="md:col-span-2">
            <Input value={form.files} onChange={(event) => setForm((current) => ({ ...current, files: event.target.value }))} placeholder={copy.placeholders.files} className={opportunityInputClassName} />
          </OpportunityFormField>
          <OpportunityFormField label={copy.fields.notes} className="md:col-span-3">
            <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={copy.placeholders.notes} className="min-h-24 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
          </OpportunityFormField>
        </div>

        <DialogFooter className={opportunityModalStyles.footer}>
          <Button variant="outline" className={opportunityModalStyles.secondaryButton} onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
          <Button className={opportunityModalStyles.primaryButton} onClick={onSave}>
            {editingOpportunity ? copy.saveChanges : copy.createOpportunity}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
