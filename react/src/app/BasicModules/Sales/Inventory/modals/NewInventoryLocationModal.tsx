import { useEffect, useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type {
  InventoryBusiness,
  InventoryBusinessUnit,
  InventoryLocationDraft,
  InventoryLocationType,
  InventoryScopeType,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

const locationTypes: InventoryLocationType[] = [
  'warehouse',
  'storeFloor',
  'onlineStock',
  'serviceUnit',
  'corporateOffice',
  'headquarters',
  'branchStorage',
  'damagedStock',
  'quarantine',
  'inTransit',
  'temporary',
];

const initialDraft: InventoryLocationDraft = {
  name: '',
  code: '',
  type: 'warehouse',
  scopeType: 'company',
  businessUnitId: '',
  businessId: '',
  address: '',
  city: '',
  country: '',
  managerUserId: '',
  managerName: '',
  isVirtual: false,
  isSellable: true,
  isActive: true,
  notes: '',
};

const locationActionClassNames = getSalesModalActionClassNames('coral');

function FieldLabel({ children }: { children: string }) {
  return <label className="text-sm font-bold text-slate-700">{children}</label>;
}

export function NewInventoryLocationModal({
  open,
  businessUnits,
  businesses,
  t,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: InventoryLocationDraft) => void;
}) {
  const [draft, setDraft] = useState<InventoryLocationDraft>(initialDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const filteredBusinesses = useMemo(() => (
    draft.businessUnitId
      ? businesses.filter((business) => business.businessUnitId === draft.businessUnitId)
      : businesses
  ), [businesses, draft.businessUnitId]);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
    setErrors([]);
  }, [open]);

  const validate = () => {
    const nextErrors: string[] = [];

    if (!draft.name.trim()) nextErrors.push(t.locationModal.validation.name);
    if (!draft.code.trim()) nextErrors.push(t.locationModal.validation.code);
    if ((draft.scopeType === 'businessUnit' || draft.scopeType === 'business') && !draft.businessUnitId) {
      nextErrors.push(t.locationModal.validation.businessUnit);
    }
    if (draft.scopeType === 'business' && !draft.businessId) {
      nextErrors.push(t.locationModal.validation.business);
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(draft);
  };

  const setScopeType = (scopeType: InventoryScopeType) => {
    setDraft({
      ...draft,
      scopeType,
      businessUnitId: scopeType === 'company' ? '' : draft.businessUnitId,
      businessId: scopeType === 'business' ? draft.businessId : '',
    });
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.locationModal.title}
      description={t.locationModal.subtitle}
      icon={<MapPinned className="h-6 w-6" />}
      contentClassName="flex max-h-[92vh] max-w-5xl flex-col"
      bodyClassName="!max-h-none flex-1 overflow-y-auto bg-slate-50/70 p-6"
      footer={(
        <>
          <Button variant="outline" className={locationActionClassNames.secondary} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button className={locationActionClassNames.primary} onClick={handleSubmit}>
            {t.locationModal.submit}
          </Button>
        </>
      )}
    >
          <div className="mb-5 rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 py-3 text-sm font-semibold text-slate-700">
            {t.locationModal.helper}
          </div>

          {errors.length > 0 ? (
            <div className="mb-5 rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 px-4 py-3 text-sm font-semibold text-[#B63B32]">
              {errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.name}</FieldLabel>
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.code}</FieldLabel>
              <Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.type}</FieldLabel>
              <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as InventoryLocationType })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {locationTypes.map((type) => <SelectItem key={type} value={type}>{t.locationTypes[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.scope}</FieldLabel>
              <Select value={draft.scopeType} onValueChange={(value) => setScopeType(value as InventoryScopeType)}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['company', 'businessUnit', 'business'] as InventoryScopeType[]).map((scopeType) => (
                    <SelectItem key={scopeType} value={scopeType}>{t.scopeTypes[scopeType]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.scopeType !== 'company' ? (
              <div className="space-y-2">
                <FieldLabel>{t.locationLabels.businessUnit}</FieldLabel>
                <Select value={draft.businessUnitId || 'none'} onValueChange={(value) => setDraft({ ...draft, businessUnitId: value === 'none' ? '' : value, businessId: '' })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.common.none}</SelectItem>
                    {businessUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {draft.scopeType === 'business' ? (
              <div className="space-y-2">
                <FieldLabel>{t.locationLabels.business}</FieldLabel>
                <Select value={draft.businessId || 'none'} onValueChange={(value) => setDraft({ ...draft, businessId: value === 'none' ? '' : value })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.common.none}</SelectItem>
                    {filteredBusinesses.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.city}</FieldLabel>
              <Input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.country}</FieldLabel>
              <Input value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>{t.locationLabels.address}</FieldLabel>
              <Input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t.locationLabels.manager}</FieldLabel>
              <Input value={draft.managerName} onChange={(event) => setDraft({ ...draft, managerName: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'isVirtual', label: draft.isVirtual ? t.locationLabels.virtual : t.locationLabels.physical },
                { key: 'isSellable', label: draft.isSellable ? t.locationLabels.sellable : t.locationLabels.nonSellable },
                { key: 'isActive', label: draft.isActive ? t.locationLabels.active : t.locationLabels.inactive },
              ].map((option) => (
                <label key={option.key} className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">
                  <Checkbox
                    checked={Boolean(draft[option.key as keyof InventoryLocationDraft])}
                    onCheckedChange={(checked) => setDraft({ ...draft, [option.key]: Boolean(checked) })}
                    className="data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>{t.locationLabels.notes}</FieldLabel>
              <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="min-h-24 rounded-lg border-slate-200" />
            </div>
          </div>
    </SalesModalFrame>
  );
}
