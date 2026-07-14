import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryMovementEntryType, InventoryOperationalMovement, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { SUPPLIER_SOURCE_ID, getInventoryMovementEntryStatus, isSupplierSource } from '../../utils/inventoryMovementEntries';
import { MovementProductLines, createMovementProductLine, type MovementProductLineDraft } from './MovementProductLines';

export type TransferStockDraft = {
  movementType: InventoryMovementEntryType;
  items: MovementProductLineDraft[];
  fromWarehouseId: string;
  toWarehouseId: string;
  supplierName?: string;
  reason: string;
  reference: string;
  date: string;
};

const movementTypes: InventoryMovementEntryType[] = ['supplierReceipt', 'transfer', 'storeReplenishment', 'sale', 'return', 'adjustment', 'writeOff'];
const transferActionClassNames = getSalesModalActionClassNames('coral');

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

type SupplierOption = {
  id: string;
  name: string;
};

export function TransferStockModal({
  open,
  rows,
  warehouses,
  suppliers,
  t,
  initialProductId,
  initialMovementType = 'transfer',
  initialWarehouseId,
  editingMovement,
  editingMovementLines = [],
  onOpenChange,
  onSubmit,
  onSaveEdit,
}: {
  open: boolean;
  rows: InventoryStockRow[];
  warehouses: InventoryWarehouse[];
  suppliers: SupplierOption[];
  t: InventoryTranslations;
  initialProductId?: string;
  initialMovementType?: InventoryMovementEntryType;
  initialWarehouseId?: string;
  editingMovement?: InventoryOperationalMovement | null;
  editingMovementLines?: InventoryOperationalMovement[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: TransferStockDraft) => void;
  onSaveEdit?: (movementId: string, draft: TransferStockDraft) => void;
}) {
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.status === 'active'), [warehouses]);
  const supplierOptions = useMemo(() => suppliers.filter((supplier) => supplier.name.trim()), [suppliers]);
  const isEditing = Boolean(editingMovement);
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

    if (editingMovement) {
      const editableMovementType = movementTypes.includes(editingMovement.movementType as InventoryMovementEntryType)
        ? editingMovement.movementType as InventoryMovementEntryType
        : 'transfer';
      const movementLines = editingMovementLines.length > 0 ? editingMovementLines : [editingMovement];

      setDraft({
        movementType: editableMovementType,
        items: movementLines.map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: Math.abs(line.quantity),
        })),
        fromWarehouseId: editingMovement.fromWarehouseId ?? (editableMovementType === 'supplierReceipt' ? SUPPLIER_SOURCE_ID : activeWarehouses[0]?.id ?? ''),
        toWarehouseId: editingMovement.toWarehouseId ?? activeWarehouses[0]?.id ?? '',
        supplierName: editingMovement.supplierName ?? supplierOptions[0]?.name ?? '',
        reason: editingMovement.reason,
        reference: editingMovement.reference ?? '',
        date: editingMovement.movementDate,
      });
      return;
    }

    const firstProductId = initialProductId ?? rows[0]?.productId ?? '';
    const initialWarehouse = activeWarehouses.find((warehouse) => warehouse.id === initialWarehouseId);
    const firstWarehouseId = initialWarehouse?.id ?? activeWarehouses[0]?.id ?? '';
    const alternateWarehouseId = activeWarehouses.find((warehouse) => warehouse.id !== firstWarehouseId)?.id ?? firstWarehouseId;
    const shouldUseSupplierSource = initialMovementType === 'supplierReceipt';
    setDraft({
      movementType: initialMovementType,
      items: [createMovementProductLine(firstProductId)],
      fromWarehouseId: shouldUseSupplierSource ? SUPPLIER_SOURCE_ID : firstWarehouseId,
      toWarehouseId: shouldUseSupplierSource ? firstWarehouseId : alternateWarehouseId,
      supplierName: shouldUseSupplierSource ? supplierOptions[0]?.name ?? '' : undefined,
      reason: t.operational.movementTypes[initialMovementType],
      reference: '',
      date: new Date().toISOString().slice(0, 10),
    });
  }, [activeWarehouses, editingMovement, editingMovementLines, initialMovementType, initialProductId, initialWarehouseId, open, rows, supplierOptions, t]);

  const hasValidItems = draft.items.length > 0 && draft.items.every((item) => item.productId && item.quantity > 0);
  const hasValidLocations = (!usesFromWarehouse || draft.fromWarehouseId)
    && (!usesToWarehouse || draft.toWarehouseId)
    && (!(usesFromWarehouse && usesToWarehouse && !sourceIsSupplier) || draft.fromWarehouseId !== draft.toWarehouseId);
  const hasValidStock = !needsAvailabilityCheck || draft.items.every((item) => {
    const row = rows.find((stockRow) => stockRow.productId === item.productId);
    const available = row?.distributions.find((distribution) => distribution.warehouseId === draft.fromWarehouseId)?.available ?? 0;
    return item.quantity <= available;
  });
  const hasValidSupplier = draft.movementType !== 'supplierReceipt' || Boolean(draft.supplierName);
  const canSubmit = hasValidItems && hasValidLocations && hasValidStock && hasValidSupplier;

  const handleTypeChange = (movementType: InventoryMovementEntryType) => {
    setDraft((current) => ({
      ...current,
      movementType,
      fromWarehouseId: movementType === 'supplierReceipt' ? SUPPLIER_SOURCE_ID : current.fromWarehouseId,
      supplierName: movementType === 'supplierReceipt' ? current.supplierName ?? supplierOptions[0]?.name ?? '' : current.supplierName,
      reason: t.operational.movementTypes[movementType],
    }));
  };

  const isAdjustment = !isEditing && draft.movementType === 'adjustment';
  const displayedStatus = editingMovement?.status ?? getInventoryMovementEntryStatus(draft.movementType);
  const HeaderIcon = isAdjustment ? SlidersHorizontal : ArrowRightLeft;
  const title = isEditing
    ? t.operational.modals.editMovementTitle
    : isAdjustment
      ? t.operational.actions.inventoryAdjustment
      : t.operational.modals.movementEntryTitle;
  const subtitle = isEditing ? t.operational.modals.editMovementSubtitle : t.operational.modals.movementEntrySubtitle;

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={subtitle}
      icon={<HeaderIcon className="h-5 w-5" />}
      contentClassName="flex max-h-[86vh] flex-col sm:max-w-[920px]"
      bodyClassName="!max-h-none flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-5"
      footer={(
        <>
          <Button type="button" variant="outline" className={transferActionClassNames.secondary} onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button
            type="button"
            className={transferActionClassNames.primary}
            disabled={!canSubmit}
            onClick={() => {
              if (editingMovement && onSaveEdit) {
                onSaveEdit(editingMovement.id, draft);
                return;
              }

              onSubmit(draft);
            }}
          >
            {isEditing ? t.common.save : t.operational.modals.registerMovement}
          </Button>
        </>
      )}
    >
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <SelectField label={t.operational.modals.movementType} value={draft.movementType} options={movementTypes.map((type) => ({ value: type, label: t.operational.movementTypes[type] }))} onValueChange={(movementType) => handleTypeChange(movementType as InventoryMovementEntryType)} />
            <ReadOnlyField label={t.operational.modals.status} value={t.operational.movementStatuses[displayedStatus]} />
            <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            {draft.movementType === 'supplierReceipt' ? (
              supplierOptions.length > 0 ? (
                <SelectField label={t.operational.modals.supplier} value={draft.supplierName ?? ''} options={supplierOptions.map((supplier) => ({ value: supplier.name, label: supplier.name }))} onValueChange={(supplierName) => setDraft({ ...draft, supplierName })} />
              ) : (
                <ReadOnlyField label={t.operational.modals.supplier} value={t.common.notAvailable} />
              )
            ) : null}
            {usesFromWarehouse ? (
              <SelectField label={t.operational.modals.fromWarehouse} value={draft.fromWarehouseId} options={fromLocationOptions} onValueChange={(fromWarehouseId) => setDraft({ ...draft, fromWarehouseId })} />
            ) : draft.movementType === 'supplierReceipt' ? null : (
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">{value}</span>
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

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-semibold text-slate-700">{children}</span>;
}
