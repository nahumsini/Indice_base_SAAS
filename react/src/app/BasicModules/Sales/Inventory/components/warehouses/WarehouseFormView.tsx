import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { InventoryModalField, inventoryModalControlClassName, sortInventoryOptions } from '../InventoryModalPrimitives';
import type { CreateWarehouseDraft, WarehouseResponsibleOption } from './CreateWarehouseModal';

const warehouseTypes: InventoryWarehouse['type'][] = [
  'corporateWarehouse',
  'businessUnitWarehouse',
  'businessWarehouse',
  'temporaryStorage',
  'vehicleStorage',
];

const formatJurisdiction = (city?: string, country?: string) => [city, country].filter(Boolean).join(', ');

export function WarehouseFormView({
  draft,
  businessUnits,
  businesses,
  responsibleOptions,
  t,
  onChange,
}: {
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

  return (
    <section className="mx-auto max-w-3xl">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label={t.operational.modals.warehouseName} value={draft.name} onChange={(name) => onChange({ ...draft, name })} />
        <SelectField label={t.operational.modals.warehouseType} value={draft.type} options={warehouseTypes.map((type) => ({ value: type, label: t.operational.warehouseTypes[type] }))} onValueChange={(type) => onChange({ ...draft, type: type as InventoryWarehouse['type'] })} />
        <SelectField label={t.operational.modals.businessUnit} value={draft.businessUnitId || 'none'} options={[{ value: 'none', label: t.common.none }, ...sortInventoryOptions(businessUnits.map((unit) => ({ value: unit.id, label: unit.name })))]} onValueChange={(businessUnitId) => {
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
        <SelectField label={t.operational.modals.business} value={draft.businessId || 'none'} options={[{ value: 'none', label: t.common.none }, ...sortInventoryOptions(availableBusinesses.map((business) => ({ value: business.id, label: business.name })))]} onValueChange={(businessId) => {
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
            jurisdiction: formatJurisdiction(business?.city, business?.country) || draft.jurisdiction,
          });
        }} />
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
        <InputField label={t.operational.modals.addressNote} value={draft.addressNote ?? ''} onChange={(addressNote) => onChange({ ...draft, addressNote })} />
      </div>
    </section>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <InventoryModalField label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className={inventoryModalControlClassName} />
    </InventoryModalField>
  );
}

function SelectField({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <InventoryModalField label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={inventoryModalControlClassName}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </InventoryModalField>
  );
}
