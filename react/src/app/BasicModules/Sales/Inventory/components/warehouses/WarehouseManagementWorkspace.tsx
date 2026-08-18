import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2, Warehouse } from 'lucide-react';
import { IndiceModalValidation } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { SalesTitleBar, salesTitleBarPrimaryActionClassName } from '../../../components/SalesTitleBar';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary, getWarehouseMetrics } from '../../utils/inventoryCalculations';
import type { CreateWarehouseDraft, WarehouseResponsibleOption } from './CreateWarehouseModal';
import { WarehouseDeleteView } from './WarehouseDeleteView';
import { WarehouseFormView } from './WarehouseFormView';
import { WarehouseManagerView } from './WarehouseManagerView';

const createEmptyDraft = (): CreateWarehouseDraft => ({
  name: '', type: 'businessWarehouse', businessUnitId: '', businessUnitName: '',
  businessId: '', businessName: '', jurisdiction: '', responsibleUserId: '',
  responsibleName: '', addressNote: '', status: 'active',
});

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
  const [draft, setDraft] = useState<CreateWarehouseDraft>(createEmptyDraft);
  const [editingWarehouse, setEditingWarehouse] = useState<InventoryWarehouse | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<InventoryWarehouse | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
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
  const canCreate = draft.name.trim().length > 0
    && Boolean(draft.businessUnitId)
    && Boolean(draft.businessId)
    && selectedBusiness?.businessUnitId === draft.businessUnitId;
  const canDelete = Boolean(selectedWarehouse) && (!hasSelectedStock || Boolean(targetWarehouseId));
  const editingDraft = editingWarehouse ? toDraft(editingWarehouse) : createEmptyDraft();
  const hasDraftChanges = JSON.stringify(draft) !== JSON.stringify(editingDraft);

  const resetCreateModal = () => {
    setIsCreateOpen(false);
    setCreateView('form');
    setDraft(createEmptyDraft());
    setEditingWarehouse(null);
    setCreateError(false);
  };
  const openCreateModal = () => {
    setEditingWarehouse(null);
    setDraft(createEmptyDraft());
    setCreateError(false);
    setCreateView('form');
    setIsCreateOpen(true);
  };
  const openEditModal = (warehouse: InventoryWarehouse) => {
    setEditingWarehouse(warehouse);
    setDraft(toDraft(warehouse));
    setCreateError(false);
    setCreateView('form');
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
    setDeleteError(false);
  };
  const createWarehouse = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    setCreateError(false);
    try {
      const normalizedDraft = { ...draft, name: draft.name.trim(), responsibleName: draft.responsibleName || t.common.notAvailable, jurisdiction: draft.jurisdiction || t.common.notAvailable, status: draft.status || 'active' };
      if (editingWarehouse) await onUpdate(editingWarehouse.id, normalizedDraft);
      else await onSubmit(normalizedDraft);
      resetCreateModal();
    } catch {
      setCreateError(true);
    } finally {
      setIsCreating(false);
    }
  };
  const deleteWarehouse = async () => {
    if (!selectedWarehouse || !canDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(false);
    try {
      if (hasSelectedStock) await onTransferAndDeleteWarehouse(selectedWarehouse.id, targetWarehouseId);
      else await onDeleteWarehouse(selectedWarehouse.id);
      setSelectedWarehouse(null);
      setTargetWarehouseId('');
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-5">
      <SalesTitleBar icon={<Warehouse className="h-5 w-5" />} rhIndent title={t.operational.modals.manageWarehousesTitle} subtitle={t.operational.modals.manageWarehousesDescription} />
      <WarehouseManagerView warehouses={warehouses} summaries={summaries} invalidWarehouseIds={invalidWarehouseIds} t={t} onCreate={openCreateModal} onEdit={openEditModal} onViewInventory={onViewInventory} onRequestDelete={(warehouse) => { setSelectedWarehouse(warehouse); setTargetWarehouseId(''); setDeleteError(false); }} />
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-600">{t.operational.insight.warehouses(metrics.activeWarehouses, metrics.storedItems, metrics.attentionWarehouses)}</p>

      <SalesModalFrame
        open={isCreateOpen}
        onOpenChange={(open) => { if (!open) requestCreateClose(); }}
        busy={isCreating}
        title={createView === 'discard' ? t.common.unsavedChanges : editingWarehouse ? t.operational.modals.editWarehouseTitle : t.operational.modals.createWarehouseTitle}
        description={createView === 'discard' ? t.common.unsavedChanges : t.operational.modals.createWarehouseHelp}
        icon={createView === 'discard' ? <AlertTriangle className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
        modalType={createView === 'discard' ? 'confirmation' : 'standard-form'}
        contentClassName="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
        bodyClassName="min-h-0 overflow-y-auto overscroll-contain bg-slate-50/70 px-5 py-5 [scrollbar-gutter:stable] sm:px-6"
        footerLeading={<Button type="button" variant="outline" className="h-11 rounded-lg px-5 font-normal" disabled={isCreating} onClick={createView === 'discard' ? () => setCreateView('form') : requestCreateClose}>{createView === 'discard' ? t.common.continueEditing : t.common.cancel}</Button>}
        footer={createView === 'discard' ? (
          <Button type="button" className="h-11 gap-2 rounded-lg bg-red-600 px-5 font-normal text-white hover:bg-red-700" onClick={resetCreateModal}><Trash2 className="h-4 w-4" />{t.common.discardChanges}</Button>
        ) : (
          <Button type="button" className={salesTitleBarPrimaryActionClassName} disabled={!canCreate || isCreating} onClick={() => void createWarehouse()}><Plus className="h-4 w-4" />{createError ? t.common.retry : editingWarehouse ? t.common.save : t.operational.actions.createWarehouse}</Button>
        )}
      >
        {createView === 'discard' ? <IndiceModalValidation tone="warning" messages={[t.common.unsavedChanges]} /> : <div className="space-y-4">
          {createError ? <IndiceModalValidation messages={[t.common.operationFailed]} /> : null}
          {businessUnits.length === 0 || businesses.length === 0 ? (
            <IndiceModalValidation tone="warning" messages={[t.operational.modals.organizationRequired]} />
          ) : null}
          <WarehouseFormView draft={draft} businessUnits={businessUnits} businesses={businesses} responsibleOptions={responsibleOptions} t={t} onChange={setDraft} />
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
        <div className="space-y-4">{deleteError ? <IndiceModalValidation messages={[t.common.operationFailed]} /> : null}{selectedWarehouse ? <WarehouseDeleteView warehouse={selectedWarehouse} totalUnits={selectedSummary?.totalUnits ?? 0} storedItems={selectedSummary?.storedItems ?? 0} estimatedValue={selectedSummary?.estimatedValue ?? 0} targetWarehouseId={targetWarehouseId} warehouses={warehouses} t={t} onTargetChange={setTargetWarehouseId} /> : null}</div>
      </SalesModalFrame>
    </section>
  );
}

function toDraft(warehouse: InventoryWarehouse): CreateWarehouseDraft {
  const { id: _id, lastMovementAt: _lastMovementAt, ...draft } = warehouse;
  return draft;
}
