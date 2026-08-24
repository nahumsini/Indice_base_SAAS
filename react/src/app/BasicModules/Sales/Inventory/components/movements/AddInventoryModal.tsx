import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp, PackagePlus, Trash2 } from 'lucide-react';
import { IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryMovementAttachment, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { InventoryModalField, InventoryModalSection, inventoryModalControlClassName, sortInventoryOptions } from '../InventoryModalPrimitives';
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

type SupplierOption = { id: string; name: string };
type ReceiptWizardStep = 'receipt' | 'products' | 'review';
const actions = getSalesModalActionClassNames('coral');

const newDraft = (reason: string): AddInventoryDraft => ({
  items: [createMovementProductLine()], supplierName: '', destinationWarehouseId: '',
  businessUnitId: '', businessId: '', reason, reference: '',
  date: new Date().toISOString().slice(0, 10), attachments: [],
});

export function AddInventoryModal({ open, rows, warehouses, suppliers, t, initialProductId, initialWarehouseId, onOpenChange, onSubmit }: {
  open: boolean;
  rows: InventoryStockRow[];
  warehouses: InventoryWarehouse[];
  suppliers: SupplierOption[];
  t: InventoryTranslations;
  initialProductId?: string;
  initialWarehouseId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AddInventoryDraft) => Promise<void>;
}) {
  const activeWarehouses = useMemo(() => [...warehouses].filter((warehouse) => warehouse.status === 'active').sort((a, b) => a.name.localeCompare(b.name)), [warehouses]);
  const supplierOptions = useMemo(() => [...suppliers].filter((supplier) => supplier.name.trim()).sort((a, b) => a.name.localeCompare(b.name)), [suppliers]);
  const [draft, setDraft] = useState<AddInventoryDraft>(() => newDraft(t.operational.movementTypes.supplierReceipt));
  const [view, setView] = useState<'workspace' | 'discard'>('workspace');
  const [activeStep, setActiveStep] = useState<ReceiptWizardStep>('receipt');
  const [showStepError, setShowStepError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const baselineRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const warehouse = activeWarehouses.find((item) => item.id === initialWarehouseId) ?? activeWarehouses[0];
    const nextDraft: AddInventoryDraft = {
      ...newDraft(t.operational.movementTypes.supplierReceipt),
      items: initialProductId ? [createMovementProductLine(initialProductId)] : [],
      supplierName: supplierOptions[0]?.name ?? '',
      destinationWarehouseId: warehouse?.id ?? '',
      businessUnitId: warehouse?.businessUnitId ?? '',
      businessId: warehouse?.businessId ?? '',
    };
    setDraft(nextDraft);
    baselineRef.current = JSON.stringify(nextDraft);
    setView('workspace');
    setActiveStep('receipt');
    setShowStepError(false);
    setSaveError(null);
  }, [activeWarehouses, initialProductId, initialWarehouseId, open, rows, supplierOptions, t.operational.movementTypes.supplierReceipt]);

  const supplierIsValid = supplierOptions.some((supplier) => supplier.name === draft.supplierName);
  const destinationWarehouse = activeWarehouses.find((warehouse) => warehouse.id === draft.destinationWarehouseId);
  const totalUnits = draft.items.reduce((total, item) => total + (Number.isFinite(item.quantity) ? item.quantity : 0), 0);
  const selectedProductsAreValid = draft.items.length > 0 && draft.items.every((item) => (
    item.quantity > 0 && rows.some((row) => row.productId === item.productId)
  ));
  const canSubmit = supplierIsValid && Boolean(destinationWarehouse) && Boolean(draft.date) && selectedProductsAreValid;
  const receiptStepValid = supplierIsValid && Boolean(destinationWarehouse) && Boolean(draft.date);
  const productsStepValid = selectedProductsAreValid;
  const steps = useMemo(() => [
    { id: 'receipt' as const, label: t.operational.movementTypes.supplierReceipt },
    { id: 'products' as const, label: t.operational.modals.products },
    { id: 'review' as const, label: t.common.review },
  ], [t]);
  const hasChanges = JSON.stringify(draft) !== baselineRef.current;

  const resetAndClose = () => {
    setView('workspace');
    setActiveStep('receipt');
    setSaveError(null);
    onOpenChange(false);
  };
  const requestClose = () => {
    if (isSaving) return;
    if (view === 'workspace' && hasChanges) setView('discard');
    else resetAndClose();
  };
  const submit = async () => {
    if (!canSubmit || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit(draft);
      resetAndClose();
    } catch (error) {
      setSaveError(getOperationErrorMessage(error, t.common.operationFailed));
    } finally {
      setIsSaving(false);
    }
  };
  const continueWizard = () => {
    if (activeStep === 'receipt') {
      if (!receiptStepValid) { setShowStepError(true); return; }
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
    setActiveStep((current) => current === 'review' ? 'products' : 'receipt');
  };
  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    const attachments = Array.from(files).map((file) => ({ id: `file-${Date.now()}-${file.name}`, name: file.name, size: file.size, type: file.type || 'application/octet-stream' }));
    setDraft((current) => ({ ...current, attachments: [...current.attachments, ...attachments] }));
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen) requestClose(); }}
      busy={isSaving}
      title={view === 'discard' ? t.common.unsavedChanges : t.operational.modals.addInventoryTitle}
      description={view === 'discard' ? t.common.unsavedChanges : t.operational.modals.addInventorySubtitle}
      icon={view === 'discard' ? <AlertTriangle className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
      modalType={view === 'discard' ? 'confirmation' : 'wizard'}
      contentClassName="flex max-h-[calc(100dvh-2rem)] flex-col sm:!w-[min(96vw,68rem)] sm:!max-w-[68rem]"
      bodyClassName="!max-h-none flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6 sm:py-5"
      footerClassName="[&_[aria-live=polite]]:!overflow-visible [&_[aria-live=polite]]:!whitespace-normal"
      footerLeading={<div className="flex items-center gap-2"><Button type="button" variant="outline" className={actions.secondary} disabled={isSaving} onClick={view === 'discard' ? () => setView('workspace') : requestClose}>{view === 'discard' ? t.common.continueEditing : t.common.cancel}</Button>{view === 'workspace' && activeStep !== 'receipt' ? <Button type="button" variant="outline" className={actions.secondary} disabled={isSaving} onClick={goBack}>{t.common.back}</Button> : null}</div>}
      footerSummary={view === 'workspace' ? <InventoryReceiptFooterSummary
        productsLabel={t.operational.modals.products}
        productsValue={draft.items.length}
        totalUnitsLabel={t.operational.columns.totalUnits}
        totalUnitsValue={totalUnits}
        warehouseLabel={t.operational.modals.destinationWarehouse}
        warehouseValue={destinationWarehouse?.name ?? t.common.notAvailable}
      /> : undefined}
      footer={view === 'discard' ? (
        <Button type="button" className="h-11 gap-2 rounded-lg bg-red-600 px-5 font-normal text-white hover:bg-red-700" onClick={resetAndClose}><Trash2 className="h-4 w-4" />{t.common.discardChanges}</Button>
      ) : activeStep === 'review' ? (
        <Button type="button" className={actions.primary} disabled={!canSubmit || isSaving} onClick={() => void submit()}>{saveError ? t.common.retry : t.operational.modals.addStock}</Button>
      ) : (
        <Button type="button" className={actions.primary} disabled={isSaving} onClick={continueWizard}>{t.common.continue}</Button>
      )}
    >
      {view === 'discard' ? <IndiceModalValidation tone="warning" messages={[t.common.unsavedChanges]} /> : (
        <div className="space-y-4">
          <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} progressLabel={t.operational.modals.addInventoryTitle} steps={steps} />
          {saveError ? <IndiceModalValidation messages={[saveError]} /> : null}
          {showStepError ? <IndiceModalValidation messages={[activeStep === 'receipt' ? t.common.completeMovementData : t.common.reviewProductQuantities]} /> : null}
          {activeStep === 'receipt' && !supplierIsValid ? <IndiceModalValidation messages={[t.common.selectValidSupplier]} /> : null}

          {activeStep === 'receipt' ? <InventoryModalSection title={t.operational.movementTypes.supplierReceipt}>
            <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
              <SelectField label={t.operational.modals.supplier} value={draft.supplierName || 'none'} options={[{ value: 'none', label: t.common.none }, ...sortInventoryOptions(supplierOptions.map((supplier) => ({ value: supplier.name, label: supplier.name })))]} invalid={!supplierIsValid} onValueChange={(supplierName) => setDraft({ ...draft, supplierName: supplierName === 'none' ? '' : supplierName })} />
              <InventoryModalField label={t.operational.modals.destinationWarehouse}>
                <Select value={draft.destinationWarehouseId} onValueChange={(destinationWarehouseId) => { const warehouse = activeWarehouses.find((item) => item.id === destinationWarehouseId); setDraft({ ...draft, destinationWarehouseId, businessUnitId: warehouse?.businessUnitId ?? '', businessId: warehouse?.businessId ?? '' }); }}>
                  <SelectTrigger className={inventoryModalControlClassName}><SelectValue placeholder={t.operational.emptyStates.noWarehouses} /></SelectTrigger>
                  <SelectContent>{activeWarehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{[warehouse.name, warehouse.businessUnitName, warehouse.businessName].filter(Boolean).join(' · ')}</SelectItem>)}</SelectContent>
                </Select>
              </InventoryModalField>
              <InputField label={t.operational.modals.referenceNote} value={draft.reference} onChange={(reference) => setDraft({ ...draft, reference })} />
              <InputField label={t.operational.modals.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            </div>
            <div className="mt-5"><IndiceModalSummary columns={2} items={[{ id: 'unit', label: t.operational.modals.businessUnit, value: destinationWarehouse?.businessUnitName ?? t.common.notAvailable }, { id: 'business', label: t.operational.modals.business, value: destinationWarehouse?.businessName ?? t.common.notAvailable }]} variant="muted" /></div>
          </InventoryModalSection> : null}

          {activeStep === 'products' ? <MovementProductLines layout="workspace" rows={rows} items={draft.items} fromWarehouseId="" needsAvailabilityCheck={false} t={t} onItemsChange={(items) => setDraft({ ...draft, items })} /> : null}

          {activeStep === 'review' ? <div className="space-y-4">
            <IndiceModalSummary columns={4} items={[{ id: 'supplier-review', label: t.operational.modals.supplier, value: draft.supplierName || t.common.notAvailable }, { id: 'warehouse-review', label: t.operational.modals.destinationWarehouse, value: destinationWarehouse?.name ?? t.common.notAvailable }, { id: 'date-review', label: t.operational.modals.date, value: draft.date }, { id: 'units-review', label: t.operational.columns.totalUnits, value: String(totalUnits), emphasized: true }]} variant="accent" />
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
              <InventoryModalSection title={t.operational.modals.products}>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">{draft.items.map((item) => { const product = rows.find((row) => row.productId === item.productId); return <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{product?.name ?? t.common.notAvailable}</p><p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{product?.sku ?? t.common.notAvailable}</p></div><span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium tabular-nums text-slate-900 dark:bg-slate-800 dark:text-white">{t.operational.modals.quantity}: {item.quantity}</span></div>; })}</div>
              </InventoryModalSection>
              <InventoryModalSection title={t.operational.modals.files} description={`${draft.attachments.length} ${t.operational.modals.files.toLocaleLowerCase()}`}>
                <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#FF6B5E]/35 bg-[#FF6B5E]/5 px-3 text-sm font-medium text-[#B63B32] transition hover:bg-[#FF6B5E]/10"><FileUp className="h-4 w-4" />{t.operational.modals.addFiles}<input type="file" multiple className="hidden" onChange={(event) => handleFilesChange(event.target.files)} /></label>
                {draft.attachments.length > 0 ? <div className="mt-3 grid gap-2">{draft.attachments.map((file) => <span key={file.id} className="truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{file.name}</span>)}</div> : null}
              </InventoryModalSection>
            </div>
          </div> : null}
        </div>
      )}
    </SalesModalFrame>
  );
}

function getOperationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function InventoryReceiptFooterSummary({
  productsLabel,
  productsValue,
  totalUnitsLabel,
  totalUnitsValue,
  warehouseLabel,
  warehouseValue,
}: {
  productsLabel: string;
  productsValue: number;
  totalUnitsLabel: string;
  totalUnitsValue: number;
  warehouseLabel: string;
  warehouseValue: string;
}) {
  return (
    <dl className="flex min-w-0 flex-wrap items-center gap-2 whitespace-normal">
      <FooterMetric label={productsLabel} value={String(productsValue)} />
      <FooterMetric label={totalUnitsLabel} value={String(totalUnitsValue)} />
      <div className="hidden min-w-0 max-w-48 rounded-xl bg-white/20 px-3 py-1.5 lg:block">
        <dt className="truncate text-[11px] leading-4 text-[#222831]/65 dark:text-white/70">{warehouseLabel}</dt>
        <dd className="truncate text-sm font-medium leading-5 text-[#222831] dark:text-white">{warehouseValue}</dd>
      </div>
    </dl>
  );
}

function FooterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[5.5rem] rounded-xl bg-white/20 px-3 py-1.5">
      <dt className="text-[11px] leading-4 text-[#222831]/65 dark:text-white/70">{label}</dt>
      <dd className="text-base font-medium leading-5 tabular-nums text-[#222831] dark:text-white">{value}</dd>
    </div>
  );
}

function InputField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return <InventoryModalField label={label}><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inventoryModalControlClassName} /></InventoryModalField>;
}

function SelectField({ label, value, options, invalid, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; invalid?: boolean; onValueChange: (value: string) => void }) {
  return <InventoryModalField label={label}><Select value={value} onValueChange={onValueChange}><SelectTrigger aria-invalid={invalid} className={`${inventoryModalControlClassName} ${invalid ? 'border-red-400' : ''}`}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></InventoryModalField>;
}
