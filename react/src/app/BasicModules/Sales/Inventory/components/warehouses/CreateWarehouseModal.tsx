import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Plus, Trash2, Warehouse } from 'lucide-react';
import { IndiceModalValidation } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary, getWarehouseMetrics } from '../../utils/inventoryCalculations';
import { WarehouseDeleteView } from './WarehouseDeleteView';
import { WarehouseFormView } from './WarehouseFormView';
import { WarehouseManagerView } from './WarehouseManagerView';

export type CreateWarehouseDraft = Omit<InventoryWarehouse, 'id' | 'lastMovementAt'>;

export type WarehouseResponsibleOption = {
  id: string;
  name: string;
  email?: string;
};

type WarehouseModalView = 'manager' | 'create' | 'delete';

const warehouseActionClassNames = getSalesModalActionClassNames('coral');

function createEmptyDraft(): CreateWarehouseDraft {
  return {
    name: '',
    type: 'businessWarehouse',
    businessUnitId: '',
    businessUnitName: '',
    businessId: '',
    businessName: '',
    jurisdiction: '',
    responsibleUserId: '',
    responsibleName: '',
    addressNote: '',
    status: 'active',
  };
}

export function CreateWarehouseModal({
  open,
  warehouses,
  rows,
  businessUnits,
  businesses,
  responsibleOptions,
  t,
  onOpenChange,
  onSubmit,
  onDeleteWarehouse,
  onTransferAndDeleteWarehouse,
}: {
  open: boolean;
  warehouses: InventoryWarehouse[];
  rows: InventoryStockRow[];
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  responsibleOptions: WarehouseResponsibleOption[];
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void | Promise<void>;
  onSubmit: (draft: CreateWarehouseDraft) => void | Promise<void>;
  onDeleteWarehouse: (warehouseId: string) => void | Promise<void>;
  onTransferAndDeleteWarehouse: (sourceWarehouseId: string, targetWarehouseId: string) => void | Promise<void>;
}) {
  const busyRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [view, setView] = useState<WarehouseModalView>('manager');
  const [draft, setDraft] = useState<CreateWarehouseDraft>(() => createEmptyDraft());
  const [selectedWarehouse, setSelectedWarehouse] = useState<InventoryWarehouse | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const summaries = useMemo(() => new Map(warehouses.map((warehouse) => [
    warehouse.id,
    getWarehouseInventorySummary(warehouse, rows),
  ])), [rows, warehouses]);
  const warehouseMetrics = useMemo(() => getWarehouseMetrics(warehouses, rows), [rows, warehouses]);
  const selectedSummary = selectedWarehouse ? summaries.get(selectedWarehouse.id) : undefined;
  const canCreateWarehouse = draft.name.trim().length > 0
    && businessUnits.some(unit => unit.id === draft.businessUnitId)
    && businesses.some(business => business.id === draft.businessId && business.businessUnitId === draft.businessUnitId);
  const canConfirmDeletion = Boolean(selectedWarehouse)
    && ((selectedSummary?.totalUnits ?? 0) === 0 || Boolean(targetWarehouseId));

  const resetToManager = () => {
    if (busyRef.current) return;
    setSaveError('');
    setView('manager');
    setSelectedWarehouse(null);
    setTargetWarehouseId('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (busyRef.current) return;
    if (!nextOpen) {
      resetToManager();
      setDraft(createEmptyDraft());
    }
    onOpenChange(nextOpen);
  };

  const runSave = async (operation: () => void | Promise<void>, created = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSaving(true);
    setSaveError('');
    try {
      await operation();
      if (created) setDraft(createEmptyDraft());
      busyRef.current = false;
      resetToManager();
    } catch (error) {
      setSaveError(error instanceof Error && error.message ? error.message : t.common.operationFailed);
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };
  const handleCreateWarehouse = () => {
    if (!canCreateWarehouse) return;
    void runSave(() => onSubmit({ ...draft, name: draft.name.trim(), status: 'active' }), true);
  };
  const handleConfirmDeletion = () => {
    if (!selectedWarehouse || !canConfirmDeletion) return;
    void runSave(() => (selectedSummary?.totalUnits ?? 0) > 0
      ? onTransferAndDeleteWarehouse(selectedWarehouse.id, targetWarehouseId)
      : onDeleteWarehouse(selectedWarehouse.id));
  };

  const title = view === 'manager'
    ? t.operational.modals.manageWarehousesTitle
    : view === 'create'
      ? t.operational.modals.createWarehouseTitle
      : t.operational.modals.deleteWarehouseTitle;
  const description = view === 'manager'
    ? t.operational.modals.manageWarehousesDescription
    : view === 'create'
      ? t.operational.modals.createWarehouseHelp
      : t.operational.modals.deleteWarehouseDescription;

  return (
    <SalesModalFrame
      busy={isSaving}
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      icon={view === 'delete' ? <AlertTriangle className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
      modalType={view === 'manager' ? 'operational-workspace' : view === 'create' ? 'standard-form' : 'confirmation'}
      contentClassName={`${view === 'manager' ? 'flex max-h-[88dvh] flex-col sm:max-w-[1100px]' : ''} [&_[data-slot=dialog-title]]:!font-normal [&_dd]:!font-normal [&_dt]:!font-normal [&_input]:!font-normal [&_label_span]:!font-normal [&_[role=combobox]]:!font-normal`}
      bodyClassName="!max-h-none flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 sm:px-6"
      footerClassName="[&_button]:!font-normal [&_p]:!font-normal [&_span]:!font-normal"
      footerLeading={(
        <Button
          type="button"
          variant="outline"
          className={warehouseActionClassNames.secondary}
          disabled={isSaving}
          onClick={view === 'manager' ? () => handleOpenChange(false) : resetToManager}
        >
          {view === 'manager' ? null : <ArrowLeft className="h-4 w-4" />}
          {view === 'manager' ? t.common.close : t.common.cancel}
        </Button>
      )}
      footerSummary={view === 'manager' ? t.operational.insight.warehouses(
        warehouseMetrics.activeWarehouses,
        warehouseMetrics.storedItems,
        warehouseMetrics.attentionWarehouses,
      ) : undefined}
      footer={view === 'create' ? (
        <Button type="button" className={warehouseActionClassNames.primary} disabled={!canCreateWarehouse || isSaving} onClick={handleCreateWarehouse}>
          <Plus className="h-4 w-4" />
          {t.operational.actions.createWarehouse}
        </Button>
      ) : view === 'delete' ? (
        <Button type="button" className="h-11 gap-2 rounded-lg bg-red-600 px-5 font-normal text-white shadow-sm hover:bg-red-700" disabled={!canConfirmDeletion || isSaving} onClick={handleConfirmDeletion}>
          <Trash2 className="h-4 w-4" />
          {(selectedSummary?.totalUnits ?? 0) > 0
            ? t.operational.modals.transferAndDeleteWarehouse
            : t.operational.modals.confirmDeleteWarehouse}
        </Button>
      ) : undefined}
    >
      <IndiceModalValidation messages={saveError ? [saveError] : []} />
      <fieldset disabled={isSaving} className="min-w-0 space-y-4">
      {view === 'manager' ? (
        <WarehouseManagerView
          warehouses={warehouses}
          summaries={summaries}
          t={t}
          onCreate={() => setView('create')}
          onRequestDelete={(warehouse) => {
            setSelectedWarehouse(warehouse);
            setTargetWarehouseId('');
            setView('delete');
          }}
        />
      ) : null}
      {view === 'create' ? (
        <WarehouseFormView
          activeStep="all"
          draft={draft}
          businessUnits={businessUnits}
          businesses={businesses}
          responsibleOptions={responsibleOptions}
          t={t}
          onChange={setDraft}
        />
      ) : null}
      {view === 'delete' && selectedWarehouse ? (
        <WarehouseDeleteView
          warehouse={selectedWarehouse}
          totalUnits={selectedSummary?.totalUnits ?? 0}
          storedItems={selectedSummary?.storedItems ?? 0}
          estimatedValue={selectedSummary?.estimatedValue ?? 0}
          targetWarehouseId={targetWarehouseId}
          warehouses={warehouses}
          t={t}
          onTargetChange={setTargetWarehouseId}
        />
      ) : null}
      </fieldset>
    </SalesModalFrame>
  );
}
