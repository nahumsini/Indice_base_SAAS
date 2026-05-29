import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FileUp, PackagePlus, Plus, X } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../../components/ui/dialog';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryMovementAttachment, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { MovementProductLines, createMovementProductLine, type MovementProductLineDraft } from './MovementProductLines';

export type AddInventoryDraft = {
  items: MovementProductLineDraft[];
  supplierName: string;
  destinationWarehouseId: string;
  businessUnitId: string;
  businessId: string;
  reason: string;
  reference: string;
  date: string;
  attachments: InventoryMovementAttachment[];
};

const defaultSuppliers = ['Samsung Supplier', 'Central Pharmacy Distributor', 'Moda Norte Wholesale', 'Sportline Distribution'];

export function AddInventoryModal({
  open,
  rows,
  warehouses,
  businessUnits,
  businesses,
  t,
  initialProductId,
  initialWarehouseId,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  rows: InventoryStockRow[];
  warehouses: InventoryWarehouse[];
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  t: InventoryTranslations;
  initialProductId?: string;
  initialWarehouseId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AddInventoryDraft) => void;
}) {
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.status === 'active'), [warehouses]);
  const [suppliers, setSuppliers] = useState(defaultSuppliers);
  const [supplierDraft, setSupplierDraft] = useState('');
  const [draft, setDraft] = useState<AddInventoryDraft>({
    items: [createMovementProductLine()],
    supplierName: defaultSuppliers[0],
    destinationWarehouseId: '',
    businessUnitId: '',
    businessId: '',
    reason: 'Supplier receipt',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
    attachments: [],
  });

  useEffect(() => {
    if (!open) return;
    const warehouse = activeWarehouses.find((item) => item.id === initialWarehouseId) ?? activeWarehouses[0];
    setDraft((current) => ({
      ...current,
      items: [createMovementProductLine(initialProductId ?? rows[0]?.productId ?? '')],
      destinationWarehouseId: warehouse?.id ?? '',
      businessUnitId: warehouse?.businessUnitId ?? '',
      businessId: warehouse?.businessId ?? '',
      date: new Date().toISOString().slice(0, 10),
    }));
  }, [activeWarehouses, initialProductId, initialWarehouseId, open, rows]);

  const canSubmit = draft.supplierName
    && draft.destinationWarehouseId
    && draft.items.length > 0
    && draft.items.every((item) => item.productId && item.quantity > 0);

  const handleAddSupplier = () => {
    const name = supplierDraft.trim();
    if (!name) return;
    setSuppliers((current) => current.includes(name) ? current : [...current, name]);
    setDraft((current) => ({ ...current, supplierName: name }));
    setSupplierDraft('');
  };

  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    const attachments = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));
    setDraft((current) => ({ ...current, attachments: [...current.attachments, ...attachments] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:max-w-[980px] [&>button]:hidden">
        <DialogHeader className="bg-[#FF6B5E] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                <PackagePlus className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-white">{t.operational.modals.addInventoryTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium leading-5 text-white/80">{t.operational.modals.addInventorySubtitle}</DialogDescription>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-5">
          <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <ReadOnlyField label={t.operational.modals.movementType} value={t.operational.movementTypes.supplierReceipt} />
            <ReadOnlyField label={t.operational.modals.status} value={t.operational.movementStatuses.received} />
            <SelectField label={t.operational.modals.supplier} value={draft.supplierName} options={suppliers.map((supplier) => ({ value: supplier, label: supplier }))} onValueChange={(supplierName) => setDraft({ ...draft, supplierName })} />
            <label className="grid gap-2">
              <FieldLabel>{t.operational.modals.quickAddSupplier}</FieldLabel>
              <span className="flex gap-2">
                <Input value={supplierDraft} placeholder={t.operational.modals.newSupplier} onChange={(event) => setSupplierDraft(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
                <Button type="button" size="icon" className="h-11 w-11 rounded-xl bg-[#FF6B5E] text-white hover:bg-[#E85C50]" onClick={handleAddSupplier}>
                  <Plus className="h-4 w-4" />
                </Button>
              </span>
            </label>
            <label className="grid gap-2">
              <FieldLabel>{t.operational.modals.destinationWarehouse}</FieldLabel>
              <Select value={draft.destinationWarehouseId} onValueChange={(destinationWarehouseId) => {
                const warehouse = activeWarehouses.find((item) => item.id === destinationWarehouseId);
                setDraft({ ...draft, destinationWarehouseId, businessUnitId: warehouse?.businessUnitId ?? '', businessId: warehouse?.businessId ?? '' });
              }}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"><SelectValue placeholder={t.operational.emptyStates.noWarehouses} /></SelectTrigger>
                <SelectContent>{activeWarehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <InputField label={t.operational.modals.referenceNote} value={draft.reference} onChange={(reference) => setDraft({ ...draft, reference })} />
            <SelectField label={t.operational.modals.businessUnit} value={draft.businessUnitId} options={businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))} onValueChange={(businessUnitId) => setDraft({ ...draft, businessUnitId })} />
            <SelectField label={t.operational.modals.business} value={draft.businessId} options={businesses.map((business) => ({ value: business.id, label: business.name }))} onValueChange={(businessId) => setDraft({ ...draft, businessId })} />
            <InputField label={t.operational.modals.reason} value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
            <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
          </div>

          <MovementProductLines rows={rows} items={draft.items} fromWarehouseId="" needsAvailabilityCheck={false} t={t} onItemsChange={(items) => setDraft({ ...draft, items })} />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{t.operational.modals.files}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{draft.attachments.length} files</p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#FF6B5E]/25 bg-white px-3 text-xs font-black text-[#B63B32] hover:bg-[#FF6B5E]/10">
                <FileUp className="h-4 w-4" />
                {t.operational.modals.addFiles}
                <input type="file" multiple className="hidden" onChange={(event) => handleFilesChange(event.target.files)} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.attachments.length === 0 ? <span className="text-sm font-semibold text-slate-400">{t.common.none}</span> : draft.attachments.map((file) => (
                <span key={file.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{file.name}</span>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="bg-[#FF6B5E] px-6 py-4">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-white/40 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" className="h-10 rounded-xl bg-white px-4 font-bold text-[#B63B32] shadow-sm hover:bg-white/90" disabled={!canSubmit} onClick={() => onSubmit(draft)}>{t.operational.modals.addStock}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InputField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
    </label>
  );
}

function SelectField({ label, value, options, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">{value}</span>
    </label>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{children}</span>;
}
