import type { ReactNode } from 'react';
import { Building2, ClipboardCheck, UserRound, Warehouse } from 'lucide-react';
import { IndiceModalSummary } from '../../../../../components/indice-modal';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryBusiness, InventoryBusinessUnit } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { InventoryModalField, inventoryModalControlClassName, sortInventoryOptions } from '../InventoryModalPrimitives';
import type { CreateWarehouseDraft, WarehouseResponsibleOption } from './CreateWarehouseModal';

const formatJurisdiction = (city?: string, country?: string) => [city, country].filter(Boolean).join(', ');

export function WarehouseFormView({
  activeStep,
  draft,
  businessUnits,
  businesses,
  responsibleOptions,
  t,
  onChange,
}: {
  activeStep: 'identity' | 'assignment' | 'review';
  draft: CreateWarehouseDraft;
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  responsibleOptions: WarehouseResponsibleOption[];
  t: InventoryTranslations;
  onChange: (draft: CreateWarehouseDraft) => void;
}) {
  const availableBusinesses = draft.businessUnitId
    ? businesses.filter((business) => business.businessUnitId === draft.businessUnitId)
    : businesses;
  const selectedBusinessUnit = businessUnits.find((unit) => unit.id === draft.businessUnitId);
  const selectedBusiness = businesses.find((business) => business.id === draft.businessId);

  return (
    <section className="mx-auto w-full max-w-3xl">
      {activeStep === 'identity' ? (
          <FormSection step="1" icon={<Warehouse className="h-4 w-4" />} title={t.operational.modals.warehouseIdentitySection} description={t.operational.modals.warehouseNameHelp}>
            <InputField autoFocus label={`${t.operational.modals.warehouseName} *`} value={draft.name} onChange={(name) => onChange({ ...draft, name })} />
          </FormSection>
      ) : null}

      {activeStep === 'assignment' ? (
          <FormSection step="2" icon={<Building2 className="h-4 w-4" />} title={t.operational.modals.warehouseAssignmentSection} description={t.operational.modals.warehouseAssignmentHelp}>
            <SelectField label={`${t.operational.modals.businessUnit} *`} value={draft.businessUnitId || 'none'} options={[{ value: 'none', label: t.locationModal.validation.businessUnit }, ...sortInventoryOptions(businessUnits.map((unit) => ({ value: unit.id, label: unit.name })))]} onValueChange={(businessUnitId) => {
              if (businessUnitId === 'none') {
                onChange({ ...draft, businessUnitId: '', businessUnitName: '', businessId: '', businessName: '' });
                return;
              }
              const unit = businessUnits.find((item) => item.id === businessUnitId);
              onChange({
                ...draft,
                businessUnitId,
                businessUnitName: unit?.name,
                businessId: '',
                businessName: '',
                jurisdiction: formatJurisdiction(unit?.city, unit?.country) || draft.jurisdiction,
              });
            }} />
            <SelectField disabled={!draft.businessUnitId} label={`${t.operational.modals.business} *`} value={draft.businessId || 'none'} options={[{ value: 'none', label: t.locationModal.validation.business }, ...sortInventoryOptions(availableBusinesses.map((business) => ({ value: business.id, label: business.name })))]} onValueChange={(businessId) => {
              if (businessId === 'none') {
                onChange({ ...draft, businessId: '', businessName: '' });
                return;
              }
              const business = businesses.find((item) => item.id === businessId);
              onChange({
                ...draft,
                businessId,
                businessName: business?.name,
                businessUnitId: business?.businessUnitId ?? draft.businessUnitId,
                businessUnitName: business?.businessUnitName ?? draft.businessUnitName,
                jurisdiction: formatJurisdiction(business?.city, business?.country) || business?.address || draft.jurisdiction,
              });
            }} />
          </FormSection>
      ) : null}

      {activeStep === 'review' ? (
          <FormSection step="3" icon={<UserRound className="h-4 w-4" />} title={t.operational.modals.warehouseOperationSection} description={t.operational.modals.warehouseOperationHelp}>
            <SelectField
              label={t.operational.modals.responsiblePerson}
              value={draft.responsibleUserId || 'none'}
              options={[
                { value: 'none', label: t.common.none },
                ...sortInventoryOptions(responsibleOptions.map((responsible) => ({
                  value: responsible.id,
                  label: responsible.email ? `${responsible.name} · ${responsible.email}` : responsible.name,
                }))),
              ]}
              onValueChange={(responsibleUserId) => {
                if (responsibleUserId === 'none') {
                  onChange({ ...draft, responsibleUserId: '', responsibleName: '' });
                  return;
                }
                const responsible = responsibleOptions.find((item) => item.id === responsibleUserId);
                onChange({ ...draft, responsibleUserId, responsibleName: responsible?.name ?? '' });
              }}
            />
            <IndiceModalSummary
              columns={2}
              description={t.operational.modals.warehouseFormHelp}
              icon={<ClipboardCheck className="h-4 w-4" />}
              items={[
                { id: 'name', label: t.operational.modals.warehouseName, value: draft.name.trim() || t.common.notAvailable, emphasized: true },
                { id: 'unit', label: t.operational.modals.businessUnit, value: selectedBusinessUnit?.name ?? draft.businessUnitName ?? t.common.notAvailable },
                { id: 'business', label: t.operational.modals.business, value: selectedBusiness?.name ?? draft.businessName ?? t.common.notAvailable },
                { id: 'responsible', label: t.operational.modals.responsiblePerson, value: draft.responsibleName || t.common.none },
              ]}
              title={t.common.review}
              variant="accent"
            />
          </FormSection>
      ) : null}
    </section>
  );
}

function FormSection({
  children,
  description,
  icon,
  step,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  step: string;
  title: string;
}) {
  return (
    <fieldset className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
        <span className="flex h-9 min-w-9 items-center justify-center gap-1 rounded-full bg-[#FF6B5E]/10 px-2 text-xs font-medium text-[#C43D34] dark:text-[#FF8B81]">
          {icon}<span>{step}</span>
        </span>
        <div>
          <h3 className="text-base font-medium text-slate-950 dark:text-white">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
      </div>
      <div className="grid gap-5 px-5 py-5 sm:px-6">{children}</div>
    </fieldset>
  );
}

function InputField({ autoFocus = false, className, label, value, onChange }: { autoFocus?: boolean; className?: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <InventoryModalField className={className} label={label}>
      <Input autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} className={inventoryModalControlClassName} />
    </InventoryModalField>
  );
}

function SelectField({
  className,
  label,
  value,
  options,
  disabled = false,
  onValueChange,
}: {
  className?: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  return (
    <InventoryModalField className={className} label={label}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={inventoryModalControlClassName}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </InventoryModalField>
  );
}
