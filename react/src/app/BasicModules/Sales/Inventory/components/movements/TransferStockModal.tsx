import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../../components/ui/dialog';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryMovementEntryType, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { SUPPLIER_SOURCE_ID, isSupplierSource } from '../../utils/inventoryMovementEntries';
import { MovementProductLines, createMovementProductLine, type MovementProductLineDraft } from './MovementProductLines';

export type TransferStockDraft = {
  movementType: InventoryMovementEntryType;
  items: MovementProductLineDraft[];
  fromWarehouseId: string;
  toWarehouseId: string;
  reason: string;
  reference: string;
  date: string;
};

const movementTypes: InventoryMovementEntryType[] = ['supplierReceipt', 'transfer', 'storeReplenishment', 'sale', 'return', 'adjustment', 'writeOff'];

const movementRules: Record<InventoryMovementEntryType, {
  from: 'warehouse' | 'supplier' | 'customer' | 'system' | 'damaged';
  to: 'warehouse' | 'customer' | 'correction' | 'writeOff';
  needsAvailability: boolean;
}> = {
  supplierReceipt: { from: 'supplier', to: 'warehouse', needsAvailability: false },
  transfer: { from: 'warehouse', to: 'warehouse', needsAvailability: true },
  storeReplenishment: { from: 'warehouse', to: 'warehouse', needsAvailability: true },
  sale: { from: 'warehouse', to: 'customer', needsAvailability: true },
  return: { from: 'customer', to: 'warehouse', needsAvailability: false },
  adjustment: { from: 'warehouse', to: 'correction', needsAvailability: true },
  writeOff: { from: 'warehouse', to: 'writeOff', needsAvailability: true },
};

const locationLabels = {
  supplier: 'Supplier',
  customer: 'Customer',
  system: 'System',
  damaged: 'Damaged',
  correction: 'Inventory correction',
  writeOff: 'Write off',
};

export function TransferStockModal({
  open,
  rows,
  warehouses,
  t,
  initialProductId,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  rows: InventoryStockRow[];
  warehouses: InventoryWarehouse[];
  t: InventoryTranslations;
  initialProductId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: TransferStockDraft) => void;
}) {
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.status === 'active'), [warehouses]);
  const [draft, setDraft] = useState<TransferStockDraft>({
    movementType: 'transfer',
    items: [createMovementProductLine()],
    fromWarehouseId: '',
    toWarehouseId: '',
    reason: 'Transfer',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const rules = movementRules[draft.movementType];
  const usesFromWarehouse = rules.from === 'warehouse';
  const usesToWarehouse = rules.to === 'warehouse';
  const sourceIsSupplier = isSupplierSource(draft.fromWarehouseId);
  const needsAvailabilityCheck = rules.needsAvailability && !sourceIsSupplier;
  const fromLocationOptions = useMemo(() => [
    { value: SUPPLIER_SOURCE_ID, label: t.operational.modals.supplier },
    ...activeWarehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
  ], [activeWarehouses, t]);

  useEffect(() => {
    if (!open) return;
    const firstProductId = initialProductId ?? rows[0]?.productId ?? '';
    setDraft((current) => ({
      ...current,
      items: [createMovementProductLine(firstProductId)],
      fromWarehouseId: activeWarehouses[0]?.id ?? '',
      toWarehouseId: activeWarehouses[1]?.id ?? activeWarehouses[0]?.id ?? '',
      reason: t.operational.movementTypes[current.movementType],
      date: new Date().toISOString().slice(0, 10),
    }));
  }, [activeWarehouses, initialProductId, open, rows, t]);

  const hasValidItems = draft.items.length > 0 && draft.items.every((item) => item.productId && item.quantity > 0);
  const hasValidLocations = (!usesFromWarehouse || draft.fromWarehouseId)
    && (!usesToWarehouse || draft.toWarehouseId)
    && (!(usesFromWarehouse && usesToWarehouse && !sourceIsSupplier) || draft.fromWarehouseId !== draft.toWarehouseId);
  const hasValidStock = !needsAvailabilityCheck || draft.items.every((item) => {
    const row = rows.find((stockRow) => stockRow.productId === item.productId);
    const available = row?.distributions.find((distribution) => distribution.warehouseId === draft.fromWarehouseId)?.available ?? 0;
    return item.quantity <= available;
  });
  const canSubmit = hasValidItems && hasValidLocations && hasValidStock;

  const handleTypeChange = (movementType: InventoryMovementEntryType) => {
    setDraft((current) => ({
      ...current,
      movementType,
      reason: t.operational.movementTypes[movementType],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:max-w-[920px] [&>button]:hidden">
        <DialogHeader className="bg-[#FF6B5E] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                <ArrowRightLeft className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-white">{t.operational.modals.movementEntryTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium leading-5 text-white/80">{t.operational.modals.movementEntrySubtitle}</DialogDescription>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-5">
          <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <SelectField label={t.operational.modals.movementType} value={draft.movementType} options={movementTypes.map((type) => ({ value: type, label: t.operational.movementTypes[type] }))} onValueChange={(movementType) => handleTypeChange(movementType as InventoryMovementEntryType)} />
            <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            {usesFromWarehouse ? (
              <SelectField label={t.operational.modals.fromWarehouse} value={draft.fromWarehouseId} options={fromLocationOptions} onValueChange={(fromWarehouseId) => setDraft({ ...draft, fromWarehouseId })} />
            ) : (
              <ReadOnlyField label={t.operational.modals.source} value={locationLabels[rules.from]} />
            )}
            {usesToWarehouse ? (
              <SelectField label={t.operational.modals.toWarehouse} value={draft.toWarehouseId} options={activeWarehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} onValueChange={(toWarehouseId) => setDraft({ ...draft, toWarehouseId })} />
            ) : (
              <ReadOnlyField label={t.operational.modals.destination} value={locationLabels[rules.to]} />
            )}
            <InputField label={t.operational.modals.reason} value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
            <InputField label={t.operational.modals.referenceNote} value={draft.reference} onChange={(reference) => setDraft({ ...draft, reference })} />
          </div>

          <MovementProductLines
            rows={rows}
            items={draft.items}
            fromWarehouseId={draft.fromWarehouseId}
            needsAvailabilityCheck={needsAvailabilityCheck}
            t={t}
            onItemsChange={(items) => setDraft({ ...draft, items })}
          />
        </div>

        <DialogFooter className="bg-[#FF6B5E] px-6 py-4">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-white/40 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" className="h-10 rounded-xl bg-white px-4 font-bold text-[#B63B32] shadow-sm hover:bg-white/90" disabled={!canSubmit} onClick={() => onSubmit(draft)}>{t.operational.modals.registerMovement}</Button>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">{value}</span>
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

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{children}</span>;
}
