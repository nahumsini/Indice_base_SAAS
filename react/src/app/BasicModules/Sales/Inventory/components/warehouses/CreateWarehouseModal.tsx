import { useState } from 'react';
import { Warehouse, X } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../../components/ui/dialog';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';

export type CreateWarehouseDraft = Omit<InventoryWarehouse, 'id' | 'lastMovementAt'>;

const warehouseTypes: InventoryWarehouse['type'][] = [
  'corporateWarehouse',
  'businessUnitWarehouse',
  'businessWarehouse',
  'temporaryStorage',
  'vehicleStorage',
];

export function CreateWarehouseModal({
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
  onSubmit: (draft: CreateWarehouseDraft) => void;
}) {
  const [draft, setDraft] = useState<CreateWarehouseDraft>({
    name: '',
    type: 'businessWarehouse',
    businessUnitId: '',
    businessUnitName: '',
    businessId: '',
    businessName: '',
    jurisdiction: '',
    responsibleName: '',
    addressNote: '',
    status: 'active',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:max-w-[720px] [&>button]:hidden">
        <DialogHeader className="bg-[#FF6B5E] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                <Warehouse className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-white">{t.operational.modals.createWarehouseTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium leading-5 text-white/80">
                  {t.operational.emptyStates.warehousesDescription}
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="bg-slate-50/70 px-6 py-5">
          <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <InputField label={t.operational.modals.warehouseName} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <SelectField label={t.operational.modals.warehouseType} value={draft.type} options={warehouseTypes.map((type) => ({ value: type, label: t.operational.warehouseTypes[type] }))} onValueChange={(type) => setDraft({ ...draft, type: type as InventoryWarehouse['type'] })} />
            <SelectField label={t.operational.modals.businessUnit} value={draft.businessUnitId ?? ''} options={businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))} onValueChange={(businessUnitId) => {
              const unit = businessUnits.find((item) => item.id === businessUnitId);
              setDraft({
                ...draft,
                businessUnitId,
                businessUnitName: unit?.name,
                jurisdiction: unit?.city ? `${unit.city}, ${unit.country ?? ''}` : draft.jurisdiction,
              });
            }} />
            <SelectField label={t.operational.modals.business} value={draft.businessId ?? ''} options={businesses.map((business) => ({ value: business.id, label: business.name }))} onValueChange={(businessId) => {
              const business = businesses.find((item) => item.id === businessId);
              setDraft({
                ...draft,
                businessId,
                businessName: business?.name,
                businessUnitId: business?.businessUnitId ?? draft.businessUnitId,
                businessUnitName: business?.businessUnitName ?? draft.businessUnitName,
                jurisdiction: business?.city ? `${business.city}, ${business.country ?? ''}` : draft.jurisdiction,
              });
            }} />
            <InputField label={t.operational.modals.responsiblePerson} value={draft.responsibleName} onChange={(responsibleName) => setDraft({ ...draft, responsibleName })} />
            <InputField label={t.operational.columns.jurisdiction} value={draft.jurisdiction} onChange={(jurisdiction) => setDraft({ ...draft, jurisdiction })} />
            <InputField label={t.operational.modals.addressNote} value={draft.addressNote ?? ''} onChange={(addressNote) => setDraft({ ...draft, addressNote })} />
            <SelectField label={t.operational.modals.status} value={draft.status} options={[{ value: 'active', label: t.filters.active }, { value: 'inactive', label: t.filters.inactive }]} onValueChange={(status) => setDraft({ ...draft, status: status as InventoryWarehouse['status'] })} />
          </div>
        </div>
        <DialogFooter className="bg-[#FF6B5E] px-6 py-4">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-white/40 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-white px-4 font-bold text-[#B63B32] shadow-sm hover:bg-white/90"
            disabled={!draft.name.trim()}
            onClick={() => onSubmit({ ...draft, responsibleName: draft.responsibleName || t.common.notAvailable, jurisdiction: draft.jurisdiction || t.common.notAvailable })}
          >
            {t.operational.actions.createWarehouse}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
    </label>
  );
}

function SelectField({ label, value, options, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  );
}
