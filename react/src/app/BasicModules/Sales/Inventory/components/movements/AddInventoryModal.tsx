import { useEffect, useMemo, useState } from 'react';
import { FileUp, PackagePlus } from 'lucide-react';
import { IndiceModalSummary } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryMovementAttachment, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import {
  InventoryModalField,
  InventoryModalSection,
  inventoryModalControlClassName,
  sortInventoryOptions,
} from '../InventoryModalPrimitives';
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
  const activeWarehouses = useMemo(() => [...warehouses].filter((warehouse) => warehouse.status === 'active').sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })), [warehouses]);
  const supplierOptions = useMemo(() => [...suppliers].filter((supplier) => supplier.name.trim()).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })), [suppliers]);
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
  const destinationWarehouse = activeWarehouses.find((warehouse) => warehouse.id === draft.destinationWarehouseId);

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
      modalType="operational-workspace"
      contentClassName="flex max-h-[88vh] flex-col sm:max-w-[1100px]"
      bodyClassName="!max-h-none flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-5"
      footerLeading={(
        <Button type="button" variant="outline" className={addInventoryActionClassNames.secondary} onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
      )}
      footerSummary={`${t.operational.modals.products}: ${draft.items.length} · ${t.operational.modals.destinationWarehouse}: ${destinationWarehouse?.name ?? t.common.notAvailable}`}
      footer={(
        <Button type="button" className={addInventoryActionClassNames.primary} disabled={!canSubmit} onClick={() => onSubmit(draft)}>
          {t.operational.modals.addStock}
        </Button>
      )}
    >
          <IndiceModalSummary
            columns={2}
            items={[
              { id: 'movement-type', label: t.operational.modals.movementType, value: t.operational.movementTypes.supplierReceipt },
              { id: 'status', label: t.operational.modals.status, value: t.operational.movementStatuses.received },
            ]}
            variant="muted"
          />

          <InventoryModalSection>
            <div className="grid gap-4 md:grid-cols-2">
            {supplierOptions.length > 0 ? (
              <SelectField label={t.operational.modals.supplier} value={draft.supplierName} options={sortInventoryOptions(supplierOptions.map((supplier) => ({ value: supplier.name, label: supplier.name })))} onValueChange={(supplierName) => setDraft({ ...draft, supplierName })} />
            ) : (
              <IndiceModalSummary
                columns={2}
                items={[{ id: 'supplier', label: t.operational.modals.supplier, value: t.common.notAvailable }]}
                variant="muted"
              />
            )}
            <InventoryModalField label={t.operational.modals.destinationWarehouse}>
              <Select value={draft.destinationWarehouseId} onValueChange={(destinationWarehouseId) => {
                const warehouse = activeWarehouses.find((item) => item.id === destinationWarehouseId);
                setDraft({ ...draft, destinationWarehouseId, businessUnitId: warehouse?.businessUnitId ?? '', businessId: warehouse?.businessId ?? '' });
              }}>
                <SelectTrigger className={inventoryModalControlClassName}><SelectValue placeholder={t.operational.emptyStates.noWarehouses} /></SelectTrigger>
                <SelectContent>{activeWarehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
              </Select>
            </InventoryModalField>
            <InputField label={t.operational.modals.referenceNote} value={draft.reference} onChange={(reference) => setDraft({ ...draft, reference })} />
            <InputField label={t.operational.modals.reason} value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
            <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            </div>
          </InventoryModalSection>

          <MovementProductLines rows={rows} items={draft.items} fromWarehouseId="" needsAvailabilityCheck={false} t={t} onItemsChange={(items) => setDraft({ ...draft, items })} />

          <InventoryModalSection>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-slate-900">{t.operational.modals.files}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{draft.attachments.length} {t.operational.modals.files.toLocaleLowerCase()}</p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-white px-3 text-xs font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10">
                <FileUp className="h-4 w-4" />
                {t.operational.modals.addFiles}
                <input type="file" multiple className="hidden" onChange={(event) => handleFilesChange(event.target.files)} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.attachments.length === 0 ? <span className="text-sm font-medium text-slate-400">{t.common.none}</span> : draft.attachments.map((file) => (
                <span key={file.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{file.name}</span>
              ))}
            </div>
          </InventoryModalSection>
    </SalesModalFrame>
  );
}

function InputField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <InventoryModalField label={label}>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inventoryModalControlClassName} />
    </InventoryModalField>
  );
}

function SelectField({ label, value, options, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) {
  return (
    <InventoryModalField label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={inventoryModalControlClassName}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </InventoryModalField>
  );
}
