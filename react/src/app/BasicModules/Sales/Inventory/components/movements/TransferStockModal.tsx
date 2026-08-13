import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryMovementEntryType, InventoryOperationalMovement, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { SUPPLIER_SOURCE_ID, getInventoryMovementEntryStatus, isSupplierSource } from '../../utils/inventoryMovementEntries';
import {
  InventoryModalField,
  InventoryModalSection,
  inventoryModalControlClassName,
  sortInventoryOptions,
} from '../InventoryModalPrimitives';
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
  adjustmentDirection?: 'increase' | 'decrease';
};

const movementTypes: InventoryMovementEntryType[] = ['supplierReceipt', 'transfer', 'storeReplenishment', 'sale', 'return', 'adjustment', 'writeOff'];
const creatableMovementTypes = movementTypes.filter((type) => type !== 'sale');
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

type MovementWizardStep = 'movement' | 'products' | 'review';

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
  const activeWarehouses = useMemo(() => [...warehouses].filter((warehouse) => warehouse.status === 'active').sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })), [warehouses]);
  const supplierOptions = useMemo(() => [...suppliers].filter((supplier) => supplier.name.trim()).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })), [suppliers]);
  const isEditing = Boolean(editingMovement);
  const [draft, setDraft] = useState<TransferStockDraft>({
    movementType: 'transfer',
    items: [createMovementProductLine()],
    fromWarehouseId: '',
    toWarehouseId: '',
    reason: 'Transfer',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
    adjustmentDirection: 'decrease',
  });
  const [activeStep, setActiveStep] = useState<MovementWizardStep>('movement');
  const [showStepError, setShowStepError] = useState(false);

  const rules = movementRules[draft.movementType];
  const usesFromWarehouse = rules.from === 'warehouse';
  const usesToWarehouse = rules.to === 'warehouse';
  const sourceIsSupplier = isSupplierSource(draft.fromWarehouseId);
  const needsAvailabilityCheck = rules.needsAvailability && !sourceIsSupplier && (draft.movementType !== 'adjustment' || draft.adjustmentDirection !== 'increase');
  const fromLocationOptions = useMemo(() => [
    { value: SUPPLIER_SOURCE_ID, label: t.operational.modals.supplier },
    ...sortInventoryOptions(activeWarehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))),
  ], [activeWarehouses, t]);

  useEffect(() => {
    if (!open) return;
    setActiveStep('movement');
    setShowStepError(false);

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
        adjustmentDirection: editingMovement.quantity > 0 ? 'increase' : 'decrease',
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
      adjustmentDirection: 'decrease',
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
  const hasValidReason = draft.movementType !== 'adjustment' || Boolean(draft.reason.trim());
  const canSubmit = hasValidItems && hasValidLocations && hasValidStock && hasValidSupplier && hasValidReason;
  const movementStepValid = hasValidLocations && hasValidSupplier && hasValidReason;
  const productsStepValid = hasValidItems && hasValidStock;
  const steps = useMemo(() => [
    { id: 'movement' as const, label: draft.movementType === 'adjustment' ? t.operational.adjustmentLabels.criteria : t.operational.adjustmentLabels.route },
    { id: 'products' as const, label: draft.movementType === 'adjustment' ? t.operational.adjustmentLabels.difference : t.operational.modals.products },
    { id: 'review' as const, label: t.common.review },
  ], [draft.movementType, t]);

  const continueWizard = () => {
    if (activeStep === 'movement') {
      if (!movementStepValid) { setShowStepError(true); return; }
      setActiveStep('products');
      setShowStepError(false);
      return;
    }
    if (activeStep === 'products') {
      if (!productsStepValid) { setShowStepError(true); return; }
      setActiveStep('review');
      setShowStepError(false);
    }
  };
  const goBack = () => {
    setShowStepError(false);
    setActiveStep((current) => current === 'review' ? 'products' : 'movement');
  };

  const handleTypeChange = (movementType: InventoryMovementEntryType) => {
    setDraft((current) => ({
      ...current,
      movementType,
      fromWarehouseId: movementType === 'supplierReceipt' ? SUPPLIER_SOURCE_ID : current.fromWarehouseId,
      toWarehouseId: movementType === 'transfer' && current.toWarehouseId === current.fromWarehouseId
        ? activeWarehouses.find((warehouse) => warehouse.id !== current.fromWarehouseId)?.id ?? current.toWarehouseId
        : current.toWarehouseId,
      supplierName: movementType === 'supplierReceipt' ? current.supplierName ?? supplierOptions[0]?.name ?? '' : current.supplierName,
      reason: t.operational.movementTypes[movementType],
      adjustmentDirection: movementType === 'adjustment' ? current.adjustmentDirection ?? 'decrease' : current.adjustmentDirection,
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
  const fromLocationLabel = sourceIsSupplier
    ? draft.supplierName || t.operational.modals.supplier
    : activeWarehouses.find((warehouse) => warehouse.id === draft.fromWarehouseId)?.name
      ?? locationLabels[rules.from];
  const toLocationLabel = draft.movementType === 'adjustment'
    ? t.operational.adjustmentLabels.correction
    : activeWarehouses.find((warehouse) => warehouse.id === draft.toWarehouseId)?.name ?? locationLabels[rules.to];

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={subtitle}
      icon={<HeaderIcon className="h-5 w-5" />}
      modalType="wizard"
      contentClassName="flex max-h-[88vh] flex-col"
      bodyClassName="!max-h-none flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-5"
      footerLeading={(
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className={transferActionClassNames.secondary} onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          {activeStep !== 'movement' ? <Button type="button" variant="outline" className={transferActionClassNames.secondary} onClick={goBack}>{t.common.back}</Button> : null}
        </div>
      )}
      footerSummary={`${t.operational.modals.products}: ${draft.items.length} · ${fromLocationLabel} → ${toLocationLabel}`}
      footer={(
        activeStep === 'review' ? <Button
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
        </Button> : <Button type="button" className={transferActionClassNames.primary} onClick={continueWizard}>{t.common.continue}</Button>
      )}
    >
          <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} progressLabel={title} steps={steps} />
          {showStepError ? <IndiceModalValidation messages={[activeStep === 'movement' ? t.common.completeMovementData : t.common.reviewProductQuantities]} /> : null}
          <IndiceModalSummary
            columns={3}
            items={[
              { id: 'status', label: t.operational.modals.status, value: t.operational.movementStatuses[displayedStatus] },
              { id: 'source', label: t.operational.modals.source, value: fromLocationLabel },
              { id: 'destination', label: t.operational.modals.destination, value: toLocationLabel },
            ]}
            variant="muted"
          />

          {activeStep === 'movement' ? <InventoryModalSection>
            <div className="grid gap-4 md:grid-cols-2">
            <SelectField label={t.operational.modals.movementType} value={draft.movementType} options={(isEditing ? movementTypes : creatableMovementTypes).map((type) => ({ value: type, label: t.operational.movementTypes[type] }))} onValueChange={(movementType) => handleTypeChange(movementType as InventoryMovementEntryType)} />
            <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            {draft.movementType === 'adjustment' ? <SelectField label={t.operational.adjustmentLabels.direction} value={draft.adjustmentDirection ?? 'decrease'} options={[{ value: 'increase', label: t.operational.adjustmentLabels.increase }, { value: 'decrease', label: t.operational.adjustmentLabels.decrease }]} onValueChange={(adjustmentDirection) => setDraft({ ...draft, adjustmentDirection: adjustmentDirection as 'increase' | 'decrease' })} /> : null}
            {draft.movementType === 'supplierReceipt' ? (
              supplierOptions.length > 0 ? (
              <SelectField label={t.operational.modals.supplier} value={draft.supplierName ?? ''} options={sortInventoryOptions(supplierOptions.map((supplier) => ({ value: supplier.name, label: supplier.name })))} onValueChange={(supplierName) => setDraft({ ...draft, supplierName })} />
              ) : (
                <ReadOnlyField label={t.operational.modals.supplier} value={t.common.notAvailable} />
              )
            ) : null}
            {usesFromWarehouse ? (
              <SelectField label={t.operational.modals.fromWarehouse} value={draft.fromWarehouseId} options={fromLocationOptions} onValueChange={(fromWarehouseId) => setDraft({ ...draft, fromWarehouseId, toWarehouseId: usesToWarehouse && draft.toWarehouseId === fromWarehouseId ? activeWarehouses.find((warehouse) => warehouse.id !== fromWarehouseId)?.id ?? draft.toWarehouseId : draft.toWarehouseId })} />
            ) : draft.movementType === 'supplierReceipt' ? null : (
              <ReadOnlyField label={t.operational.modals.source} value={locationLabels[rules.from]} />
            )}
            {usesToWarehouse ? (
              <SelectField label={t.operational.modals.toWarehouse} value={draft.toWarehouseId} options={activeWarehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} onValueChange={(toWarehouseId) => setDraft({ ...draft, toWarehouseId })} />
            ) : (
              <ReadOnlyField label={t.operational.modals.destination} value={locationLabels[rules.to]} />
            )}
            <InputField label={`${t.operational.modals.reason}${draft.movementType === 'adjustment' ? ' *' : ''}`} value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
            <InputField label={t.operational.modals.referenceNote} value={draft.reference} onChange={(reference) => setDraft({ ...draft, reference })} />
            </div>
          </InventoryModalSection> : null}

          {activeStep === 'products' ? <MovementProductLines
            rows={rows}
            items={draft.items}
            fromWarehouseId={draft.fromWarehouseId}
            needsAvailabilityCheck={needsAvailabilityCheck}
            t={t}
            onItemsChange={(items) => setDraft({ ...draft, items })}
          /> : null}

          {activeStep === 'review' ? (
            <div className="space-y-4">
              <IndiceModalSummary
                columns={3}
                items={[
                  { id: 'type', label: t.operational.modals.movementType, value: t.operational.movementTypes[draft.movementType] },
                  { id: 'date', label: t.operational.modals.date, value: draft.date },
                  { id: 'status-review', label: t.operational.modals.status, value: t.operational.movementStatuses[displayedStatus] },
                  { id: 'source-review', label: t.operational.modals.source, value: fromLocationLabel },
                  { id: 'destination-review', label: t.operational.modals.destination, value: toLocationLabel },
                  { id: 'products-review', label: t.operational.modals.products, value: String(draft.items.length) },
                ]}
                variant="accent"
              />
              <InventoryModalSection>
                <div className="divide-y divide-slate-200">
                  {draft.items.map((item) => {
                    const product = rows.find((row) => row.productId === item.productId);
                    return <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{product?.name ?? t.common.notAvailable}</p><p className="mt-0.5 truncate text-xs text-slate-500">{product?.sku ?? t.common.notAvailable}</p></div><span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">{t.operational.modals.quantity}: {item.quantity}</span></div>;
                  })}
                </div>
              </InventoryModalSection>
              {draft.reason || draft.reference ? <IndiceModalSummary columns={2} items={[{ id: 'reason-review', label: t.operational.modals.reason, value: draft.reason || t.common.notAvailable }, { id: 'reference-review', label: t.operational.modals.referenceNote, value: draft.reference || t.common.notAvailable }]} variant="muted" /> : null}
            </div>
          ) : null}
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <InventoryModalField label={label}>
      <span className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{value}</span>
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
