import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Columns3, Plus, Trash2, Warehouse } from 'lucide-react';
import { IndiceModalValidation, IndiceModalWizardStepper } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { useLocalStorageState } from '../../../../../hooks/useLocalStorageState';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { SalesTitleBar, salesTitleBarPrimaryActionClassName, salesTitleBarSecondaryActionClassName } from '../../../components/SalesTitleBar';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary, getWarehouseMetrics } from '../../utils/inventoryCalculations';
import type { CreateWarehouseDraft, WarehouseResponsibleOption } from './CreateWarehouseModal';
import { WarehouseDeleteView } from './WarehouseDeleteView';
import { WarehouseFormView } from './WarehouseFormView';
import { WarehouseManagerView } from './WarehouseManagerView';
import { defaultWarehouseTableVisibleColumns, WarehouseColumnsModal } from './WarehouseColumnsModal';
import { WarehouseColorIcon } from './WarehouseColorIcon';

const createEmptyDraft = (): CreateWarehouseDraft => ({
  name: '', type: 'businessWarehouse', businessUnitId: '', businessUnitName: '',
  businessId: '', businessName: '', jurisdiction: '', responsibleUserId: '',
  responsibleName: '', addressNote: '', status: 'active',
});

type WarehouseWizardStep = 'identity' | 'assignment' | 'review';

export function WarehouseManagementWorkspace({
  warehouses, rows, businessUnits, businesses, responsibleOptions, t,
  onSubmit, onDeleteWarehouse, onTransferAndDeleteWarehouse, onViewInventory,
  onUpdate,
}: {
  warehouses: InventoryWarehouse[];
  rows: InventoryStockRow[];
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  responsibleOptions: WarehouseResponsibleOption[];
  t: InventoryTranslations;
  onSubmit: (draft: CreateWarehouseDraft) => Promise<void>;
  onUpdate: (warehouseId: string, draft: CreateWarehouseDraft) => Promise<void>;
  onDeleteWarehouse: (warehouseId: string) => Promise<void>;
  onTransferAndDeleteWarehouse: (sourceWarehouseId: string, targetWarehouseId: string) => Promise<void>;
  onViewInventory: (warehouseId: string) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createView, setCreateView] = useState<'form' | 'discard'>('form');
  const [activeCreateStep, setActiveCreateStep] = useState<WarehouseWizardStep>('identity');
  const [draft, setDraft] = useState<CreateWarehouseDraft>(createEmptyDraft);
  const [editingWarehouse, setEditingWarehouse] = useState<InventoryWarehouse | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<InventoryWarehouse | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useLocalStorageState('indice.inventory.warehouses.columns', defaultWarehouseTableVisibleColumns);
  const summaries = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, getWarehouseInventorySummary(warehouse, rows)])), [rows, warehouses]);
  const metrics = useMemo(() => getWarehouseMetrics(warehouses, rows), [rows, warehouses]);
  const selectedSummary = selectedWarehouse ? summaries.get(selectedWarehouse.id) : undefined;
  const hasSelectedStock = (selectedSummary?.totalUnits ?? 0) > 0;
  const invalidWarehouseIds = useMemo(() => new Set(warehouses
    .filter((warehouse) => {
      const business = businesses.find((item) => item.id === warehouse.businessId);
      return !warehouse.businessUnitId || !business || business.businessUnitId !== warehouse.businessUnitId;
    })
    .map((warehouse) => warehouse.id)), [businesses, warehouses]);
  const selectedBusiness = businesses.find((business) => business.id === draft.businessId);
  const identityStepValid = draft.name.trim().length > 0;
  const assignmentStepValid = Boolean(draft.businessUnitId)
    && Boolean(draft.businessId)
    && selectedBusiness?.businessUnitId === draft.businessUnitId;
  const canCreate = identityStepValid && assignmentStepValid;
  const createSteps = useMemo(() => [
    { id: 'identity' as const, label: t.operational.modals.warehouseIdentitySection },
    { id: 'assignment' as const, label: t.operational.modals.warehouseAssignmentSection },
    { id: 'review' as const, label: t.common.review },
  ], [t]);
  const activeCreateStepIndex = createSteps.findIndex((step) => step.id === activeCreateStep);
  const canContinueCreate = activeCreateStep === 'identity' ? identityStepValid : assignmentStepValid;
  const canDelete = Boolean(selectedWarehouse) && (!hasSelectedStock || Boolean(targetWarehouseId));
  const editingDraft = editingWarehouse ? toDraft(editingWarehouse) : createEmptyDraft();
  const hasDraftChanges = JSON.stringify(draft) !== JSON.stringify(editingDraft);

  const resetCreateModal = () => {
    setIsCreateOpen(false);
    setCreateView('form');
    setActiveCreateStep('identity');
    setDraft(createEmptyDraft());
    setEditingWarehouse(null);
    setCreateError(null);
  };
  const openCreateModal = () => {
    setEditingWarehouse(null);
    setDraft(createEmptyDraft());
    setCreateError(null);
    setCreateView('form');
    setActiveCreateStep('identity');
    setIsCreateOpen(true);
  };
  const openEditModal = (warehouse: InventoryWarehouse) => {
    setEditingWarehouse(warehouse);
    setDraft(toDraft(warehouse));
    setCreateError(null);
    setCreateView('form');
    setActiveCreateStep('identity');
    setIsCreateOpen(true);
  };
  const requestCreateClose = () => {
    if (isCreating) return;
    if (createView === 'form' && hasDraftChanges) setCreateView('discard');
    else resetCreateModal();
  };
  const closeDeleteModal = () => {
    if (isDeleting) return;
    setSelectedWarehouse(null);
    setTargetWarehouseId('');
    setDeleteError(null);
  };
  const continueCreateWizard = () => {
    if (activeCreateStep === 'identity' && identityStepValid) {
      setActiveCreateStep('assignment');
      return;
    }
    if (activeCreateStep === 'assignment' && assignmentStepValid) {
      setActiveCreateStep('review');
    }
  };
  const goBackCreateWizard = () => {
    setActiveCreateStep((current) => current === 'review' ? 'assignment' : 'identity');
  };
  const createWarehouse = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const normalizedDraft = {
        ...draft,
        name: draft.name.trim(),
        responsibleName: draft.responsibleName?.trim() ?? '',
        jurisdiction: draft.jurisdiction?.trim() ?? '',
        addressNote: draft.addressNote?.trim() ?? '',
        status: draft.status || 'active',
      };
      if (editingWarehouse) await onUpdate(editingWarehouse.id, normalizedDraft);
      else await onSubmit(normalizedDraft);
      resetCreateModal();
    } catch (error) {
      setCreateError(getOperationErrorMessage(error, t.common.operationFailed));
    } finally {
      setIsCreating(false);
    }
  };
  const deleteWarehouse = async () => {
    if (!selectedWarehouse || !canDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (hasSelectedStock) await onTransferAndDeleteWarehouse(selectedWarehouse.id, targetWarehouseId);
      else await onDeleteWarehouse(selectedWarehouse.id);
      setSelectedWarehouse(null);
      setTargetWarehouseId('');
    } catch (error) {
      setDeleteError(getOperationErrorMessage(error, t.common.operationFailed));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon={<WarehouseColorIcon className="h-5 w-5" />}
        rhIndent
        title={t.operational.modals.manageWarehousesTitle}
        subtitle={t.operational.modals.manageWarehousesDescription}
        actions={(
          <>
            <Button type="button" variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={() => setIsColumnsOpen(true)}>
              <Columns3 className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
            <Button type="button" className={salesTitleBarPrimaryActionClassName} onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              {t.operational.actions.createWarehouse}
            </Button>
          </>
        )}
      />
      <WarehouseManagerView warehouses={warehouses} summaries={summaries} invalidWarehouseIds={invalidWarehouseIds} visibleColumns={visibleColumns} t={t} onEdit={openEditModal} onViewInventory={onViewInventory} onRequestDelete={(warehouse) => { setSelectedWarehouse(warehouse); setTargetWarehouseId(''); setDeleteError(null); }} />
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-600">{t.operational.insight.warehouses(metrics.activeWarehouses, metrics.storedItems, metrics.attentionWarehouses)}</p>

      <WarehouseColumnsModal open={isColumnsOpen} visibleColumns={visibleColumns} t={t} onOpenChange={setIsColumnsOpen} onVisibleColumnsChange={setVisibleColumns} />

      <SalesModalFrame
        open={isCreateOpen}
        onOpenChange={(open) => { if (!open) requestCreateClose(); }}
        busy={isCreating}
        title={createView === 'discard' ? t.common.unsavedChanges : editingWarehouse ? t.operational.modals.editWarehouseTitle : t.operational.modals.createWarehouseTitle}
        description={createView === 'discard' ? t.common.unsavedChanges : t.operational.modals.createWarehouseHelp}
        icon={createView === 'discard' ? <AlertTriangle className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
        modalType={createView === 'discard' ? 'confirmation' : 'wizard'}
        contentClassName="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col sm:!w-[min(94vw,58rem)] sm:!max-w-[58rem]"
        bodyClassName="min-h-0 overflow-y-auto overscroll-contain bg-slate-50/70 px-5 py-5 [scrollbar-gutter:stable] sm:px-6"
        footerLeading={createView === 'discard' ? (
          <Button type="button" variant="outline" className="h-11 rounded-lg px-5 font-normal" disabled={isCreating} onClick={() => setCreateView('form')}>{t.common.continueEditing}</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-lg px-5 font-normal" disabled={isCreating} onClick={requestCreateClose}>{t.common.cancel}</Button>
            {activeCreateStep !== 'identity' ? (
              <Button type="button" variant="outline" className="h-11 gap-2 rounded-lg px-5 font-normal" disabled={isCreating} onClick={goBackCreateWizard}>
                <ArrowLeft className="h-4 w-4" />
                {t.common.back}
              </Button>
            ) : null}
          </div>
        )}
        footerSummary={createView === 'form' ? (
          <WarehouseWizardFooterProgress
            current={activeCreateStepIndex + 1}
            label={createSteps[activeCreateStepIndex]?.label ?? t.operational.modals.warehouseIdentitySection}
            total={createSteps.length}
          />
        ) : undefined}
        footer={createView === 'discard' ? (
          <Button type="button" className="h-11 gap-2 rounded-lg bg-red-600 px-5 font-normal text-white hover:bg-red-700" onClick={resetCreateModal}><Trash2 className="h-4 w-4" />{t.common.discardChanges}</Button>
        ) : activeCreateStep === 'review' ? (
          <Button type="button" className={salesTitleBarPrimaryActionClassName} disabled={!canCreate || isCreating} onClick={() => void createWarehouse()}><Plus className="h-4 w-4" />{createError ? t.common.retry : editingWarehouse ? t.common.save : t.operational.actions.createWarehouse}</Button>
        ) : (
          <Button type="button" className={salesTitleBarPrimaryActionClassName} disabled={!canContinueCreate || isCreating} onClick={continueCreateWizard}>
            {t.common.continue}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      >
        {createView === 'discard' ? <IndiceModalValidation tone="warning" messages={[t.common.unsavedChanges]} /> : <div className="space-y-4">
          {createError ? <IndiceModalValidation messages={[createError]} /> : null}
          {businessUnits.length === 0 || businesses.length === 0 ? (
            <IndiceModalValidation tone="warning" messages={[t.operational.modals.organizationRequired]} />
          ) : null}
          <IndiceModalWizardStepper accent="coral" activeStepId={activeCreateStep} progressLabel={editingWarehouse ? t.operational.modals.editWarehouseTitle : t.operational.modals.createWarehouseTitle} steps={createSteps} />
          <WarehouseFormView activeStep={activeCreateStep} draft={draft} businessUnits={businessUnits} businesses={businesses} responsibleOptions={responsibleOptions} t={t} onChange={setDraft} />
        </div>}
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(selectedWarehouse)}
        onOpenChange={(open) => { if (!open) closeDeleteModal(); }}
        busy={isDeleting}
        title={hasSelectedStock ? t.operational.modals.transferAndDeleteWarehouse : t.operational.modals.deleteWarehouseTitle}
        description={hasSelectedStock ? t.operational.modals.activeWarehousesDescription : t.operational.modals.deleteWarehouseDescription}
        icon={<AlertTriangle className="h-5 w-5" />}
        modalType={hasSelectedStock ? 'standard-form' : 'confirmation'}
        contentClassName="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
        bodyClassName="min-h-0 overflow-y-auto overscroll-contain bg-slate-50/70 px-5 py-5 [scrollbar-gutter:stable] sm:px-6"
        footerLeading={<Button type="button" variant="outline" className="h-11 rounded-lg px-5 font-normal" disabled={isDeleting} onClick={closeDeleteModal}>{t.common.cancel}</Button>}
        footer={<Button type="button" className="h-11 gap-2 rounded-lg bg-red-600 px-5 font-normal text-white hover:bg-red-700" disabled={!canDelete || isDeleting} onClick={() => void deleteWarehouse()}><Trash2 className="h-4 w-4" />{deleteError ? t.common.retry : hasSelectedStock ? t.operational.modals.transferAndDeleteWarehouse : t.operational.modals.confirmDeleteWarehouse}</Button>}
      >
        <div className="space-y-4">{deleteError ? <IndiceModalValidation messages={[deleteError]} /> : null}{selectedWarehouse ? <WarehouseDeleteView warehouse={selectedWarehouse} totalUnits={selectedSummary?.totalUnits ?? 0} storedItems={selectedSummary?.storedItems ?? 0} estimatedValue={selectedSummary?.estimatedValue ?? 0} targetWarehouseId={targetWarehouseId} warehouses={warehouses} t={t} onTargetChange={setTargetWarehouseId} /> : null}</div>
      </SalesModalFrame>
    </section>
  );
}

function WarehouseWizardFooterProgress({ current, label, total }: { current: number; label: string; total: number }) {
  return (
    <div className="hidden min-w-0 rounded-xl bg-white/20 px-3 py-1.5 sm:block">
      <p className="text-[11px] leading-4 text-[#222831]/65">{current} / {total}</p>
      <p className="max-w-48 truncate text-sm font-medium leading-5 text-[#222831]">{label}</p>
    </div>
  );
}

function toDraft(warehouse: InventoryWarehouse): CreateWarehouseDraft {
  const { id: _id, lastMovementAt: _lastMovementAt, ...draft } = warehouse;
  return draft;
}

function getOperationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
