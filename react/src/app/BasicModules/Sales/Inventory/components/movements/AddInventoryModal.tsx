import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FileUp, PackagePlus } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryMovementAttachment, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
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

type SupplierOption = {
  id: string;
  name: string;
};

const addInventoryActionClassNames = getSalesModalActionClassNames('coral');

export function AddInventoryModal({
  open,
  rows,
  warehouses,
  suppliers,
  t,
  initialProductId,
  initialWarehouseId,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  rows: InventoryStockRow[];
  warehouses: InventoryWarehouse[];
  suppliers: SupplierOption[];
  t: InventoryTranslations;
  initialProductId?: string;
  initialWarehouseId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AddInventoryDraft) => void;
}) {
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.status === 'active'), [warehouses]);
  const supplierOptions = useMemo(() => suppliers.filter((supplier) => supplier.name.trim()), [suppliers]);
  const [draft, setDraft] = useState<AddInventoryDraft>({
    items: [createMovementProductLine()],
    supplierName: '',
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
      supplierName: supplierOptions.some((supplier) => supplier.name === current.supplierName)
        ? current.supplierName
        : supplierOptions[0]?.name ?? '',
      destinationWarehouseId: warehouse?.id ?? '',
      businessUnitId: warehouse?.businessUnitId ?? '',
      businessId: warehouse?.businessId ?? '',
      date: new Date().toISOString().slice(0, 10),
    }));
  }, [activeWarehouses, initialProductId, initialWarehouseId, open, rows, supplierOptions]);

  const canSubmit = draft.supplierName
    && draft.destinationWarehouseId
    && draft.items.length > 0
    && draft.items.every((item) => item.productId && item.quantity > 0);

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
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.operational.modals.addInventoryTitle}
      description={t.operational.modals.addInventorySubtitle}
      icon={<PackagePlus className="h-5 w-5" />}
      contentClassName="flex max-h-[88vh] flex-col sm:max-w-[980px]"
      bodyClassName="!max-h-none flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-5"
      footer={(
        <>
          <Button type="button" variant="outline" className={addInventoryActionClassNames.secondary} onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" className={addInventoryActionClassNames.primary} disabled={!canSubmit} onClick={() => onSubmit(draft)}>{t.operational.modals.addStock}</Button>
        </>
      )}
    >
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <ReadOnlyField label={t.operational.modals.movementType} value={t.operational.movementTypes.supplierReceipt} />
            <ReadOnlyField label={t.operational.modals.status} value={t.operational.movementStatuses.received} />
            {supplierOptions.length > 0 ? (
              <SelectField label={t.operational.modals.supplier} value={draft.supplierName} options={supplierOptions.map((supplier) => ({ value: supplier.name, label: supplier.name }))} onValueChange={(supplierName) => setDraft({ ...draft, supplierName })} />
            ) : (
              <ReadOnlyField label={t.operational.modals.supplier} value={t.common.notAvailable} />
            )}
            <label className="grid gap-2">
              <FieldLabel>{t.operational.modals.destinationWarehouse}</FieldLabel>
              <Select value={draft.destinationWarehouseId} onValueChange={(destinationWarehouseId) => {
                const warehouse = activeWarehouses.find((item) => item.id === destinationWarehouseId);
                setDraft({ ...draft, destinationWarehouseId, businessUnitId: warehouse?.businessUnitId ?? '', businessId: warehouse?.businessId ?? '' });
              }}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"><SelectValue placeholder={t.operational.emptyStates.noWarehouses} /></SelectTrigger>
                <SelectContent>{activeWarehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <InputField label={t.operational.modals.referenceNote} value={draft.reference} onChange={(reference) => setDraft({ ...draft, reference })} />
            <InputField label={t.operational.modals.reason} value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
            <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
          </div>

          <MovementProductLines rows={rows} items={draft.items} fromWarehouseId="" needsAvailabilityCheck={false} t={t} onItemsChange={(items) => setDraft({ ...draft, items })} />

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{t.operational.modals.files}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{draft.attachments.length} files</p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-white px-3 text-xs font-semibold text-[#B63B32] hover:bg-[#FF6B5E]/10">
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
    </SalesModalFrame>
  );
}

function InputField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
    </label>
  );
}

function SelectField({ label, value, options, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">{value}</span>
    </label>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-semibold text-slate-700">{children}</span>;
}
