import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, PackageOpen, Plus, Trash2, Warehouse } from 'lucide-react';
import { IndiceModalSummary } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryBusiness, InventoryBusinessUnit, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary, getWarehouseMetrics } from '../../utils/inventoryCalculations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import {
  InventoryModalField,
  inventoryModalControlClassName,
} from '../InventoryModalPrimitives';

export type CreateWarehouseDraft = Omit<InventoryWarehouse, 'id' | 'lastMovementAt'>;

type WarehouseResponsibleOption = {
  id: string;
  name: string;
  email?: string;
};

type PendingWarehouseDeletion = {
  warehouse: InventoryWarehouse;
  targetWarehouseId?: string;
};

const warehouseTypes: InventoryWarehouse['type'][] = [
  'corporateWarehouse',
  'businessUnitWarehouse',
  'businessWarehouse',
  'temporaryStorage',
  'vehicleStorage',
];
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

const formatJurisdiction = (city?: string, country?: string) => [city, country].filter(Boolean).join(', ');

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
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: CreateWarehouseDraft) => void;
  onDeleteWarehouse: (warehouseId: string) => void;
  onTransferAndDeleteWarehouse: (sourceWarehouseId: string, targetWarehouseId: string) => void;
}) {
  const [draft, setDraft] = useState<CreateWarehouseDraft>(() => createEmptyDraft());
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [pendingDeletion, setPendingDeletion] = useState<PendingWarehouseDeletion | null>(null);
  const summaries = useMemo(() => new Map(warehouses.map((warehouse) => [
    warehouse.id,
    getWarehouseInventorySummary(warehouse, rows),
  ])), [rows, warehouses]);
  const warehouseMetrics = useMemo(() => getWarehouseMetrics(warehouses, rows), [rows, warehouses]);
  const availableBusinesses = draft.businessUnitId
    ? businesses.filter((business) => business.businessUnitId === draft.businessUnitId)
    : businesses;

  const canCreateWarehouse = draft.name.trim().length > 0;

  const handleCreateWarehouse = () => {
    if (!canCreateWarehouse) return;

    onSubmit({
      ...draft,
      name: draft.name.trim(),
      responsibleName: draft.responsibleName || t.common.notAvailable,
      jurisdiction: draft.jurisdiction || t.common.notAvailable,
    });
    setDraft(createEmptyDraft());
  };

  const handleTransferTargetChange = (warehouseId: string, targetWarehouseId: string) => {
    setTransferTargets((current) => ({
      ...current,
      [warehouseId]: targetWarehouseId === 'none' ? '' : targetWarehouseId,
    }));
  };

  const requestDelete = (warehouse: InventoryWarehouse) => {
    const summary = summaries.get(warehouse.id) ?? getWarehouseInventorySummary(warehouse, rows);
    if (summary.totalUnits > 0) {
      const targetWarehouseId = transferTargets[warehouse.id];
      if (targetWarehouseId) {
        setPendingDeletion({ warehouse, targetWarehouseId });
      }
      return;
    }

    setPendingDeletion({ warehouse });
  };

  const confirmDelete = () => {
    if (!pendingDeletion) return;

    if (pendingDeletion.targetWarehouseId) {
      onTransferAndDeleteWarehouse(pendingDeletion.warehouse.id, pendingDeletion.targetWarehouseId);
    } else {
      onDeleteWarehouse(pendingDeletion.warehouse.id);
    }

    setPendingDeletion(null);
  };

  const pendingSummary = pendingDeletion
    ? summaries.get(pendingDeletion.warehouse.id) ?? getWarehouseInventorySummary(pendingDeletion.warehouse, rows)
    : null;
  const pendingDestination = pendingDeletion?.targetWarehouseId
    ? warehouses.find((warehouse) => warehouse.id === pendingDeletion.targetWarehouseId)?.name ?? t.common.notAvailable
    : t.common.none;

  return (
    <>
      <SalesModalFrame
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setPendingDeletion(null);
        onOpenChange(nextOpen);
      }}
      title={t.operational.modals.manageWarehousesTitle}
      description={t.operational.modals.manageWarehousesDescription}
      icon={<Warehouse className="h-5 w-5" />}
      modalType="operational-workspace"
      contentClassName="flex max-h-[92vh] flex-col sm:max-w-[1200px]"
      bodyClassName="!max-h-none flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5"
      footerLeading={(
        <Button type="button" variant="outline" className={warehouseActionClassNames.secondary} onClick={() => onOpenChange(false)}>{t.common.close}</Button>
      )}
      footerSummary={t.operational.insight.warehouses(
        warehouseMetrics.activeWarehouses,
        warehouseMetrics.storedItems,
        warehouseMetrics.attentionWarehouses,
      )}
    >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{t.operational.actions.createWarehouse}</h3>
                  <p className="mt-1 text-sm font-normal leading-5 text-slate-500">
                    {t.operational.modals.createWarehouseHelp}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField label={t.operational.modals.warehouseName} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
                <SelectField label={t.operational.modals.warehouseType} value={draft.type} options={warehouseTypes.map((type) => ({ value: type, label: t.operational.warehouseTypes[type] }))} onValueChange={(type) => setDraft({ ...draft, type: type as InventoryWarehouse['type'] })} />
                <SelectField label={t.operational.modals.businessUnit} value={draft.businessUnitId || 'none'} options={[{ value: 'none', label: t.common.none }, ...businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))]} onValueChange={(businessUnitId) => {
                  if (businessUnitId === 'none') {
                    setDraft({ ...draft, businessUnitId: '', businessUnitName: '', businessId: '', businessName: '' });
                    return;
                  }
                  const unit = businessUnits.find((item) => item.id === businessUnitId);
                  setDraft({
                    ...draft,
                    businessUnitId,
                    businessUnitName: unit?.name,
                    businessId: '',
                    businessName: '',
                    jurisdiction: formatJurisdiction(unit?.city, unit?.country) || draft.jurisdiction,
                  });
                }} />
                <SelectField label={t.operational.modals.business} value={draft.businessId || 'none'} options={[{ value: 'none', label: t.common.none }, ...availableBusinesses.map((business) => ({ value: business.id, label: business.name }))]} onValueChange={(businessId) => {
                  if (businessId === 'none') {
                    setDraft({ ...draft, businessId: '', businessName: '' });
                    return;
                  }
                  const business = businesses.find((item) => item.id === businessId);
                  setDraft({
                    ...draft,
                    businessId,
                    businessName: business?.name,
                    businessUnitId: business?.businessUnitId ?? draft.businessUnitId,
                    businessUnitName: business?.businessUnitName ?? draft.businessUnitName,
                    jurisdiction: formatJurisdiction(business?.city, business?.country) || draft.jurisdiction,
                  });
                }} />
                <SelectField
                  label={t.operational.modals.responsiblePerson}
                  value={draft.responsibleUserId || 'none'}
                  options={[
                    { value: 'none', label: t.common.none },
                    ...responsibleOptions.map((responsible) => ({
                      value: responsible.id,
                      label: responsible.email ? `${responsible.name} · ${responsible.email}` : responsible.name,
                    })),
                  ]}
                  onValueChange={(responsibleUserId) => {
                    if (responsibleUserId === 'none') {
                      setDraft({ ...draft, responsibleUserId: '', responsibleName: '' });
                      return;
                    }
                    const responsible = responsibleOptions.find((item) => item.id === responsibleUserId);
                    setDraft({
                      ...draft,
                      responsibleUserId,
                      responsibleName: responsible?.name ?? '',
                    });
                  }}
                />
                <InputField label={t.operational.modals.addressNote} value={draft.addressNote ?? ''} onChange={(addressNote) => setDraft({ ...draft, addressNote })} />
                <SelectField label={t.operational.modals.status} value={draft.status} options={[{ value: 'active', label: t.filters.active }, { value: 'inactive', label: t.filters.inactive }]} onValueChange={(status) => setDraft({ ...draft, status: status as InventoryWarehouse['status'] })} />
              </div>

              <Button
                type="button"
                className="mt-5 h-11 w-full gap-2 rounded-lg bg-[#FF6B5E] text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]"
                disabled={!canCreateWarehouse}
                onClick={handleCreateWarehouse}
              >
                <Plus className="h-4 w-4" />
                {t.operational.actions.createWarehouse}
              </Button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <PackageOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{t.operational.modals.activeWarehouses}</h3>
                    <p className="mt-1 text-sm font-normal leading-5 text-slate-500">
                      {t.operational.modals.activeWarehousesDescription}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {t.operational.modals.warehouseCount(warehouses.length)}
                </span>
              </div>

              <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
                {warehouses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-semibold text-slate-700">{t.operational.emptyStates.warehousesTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{t.operational.emptyStates.warehousesDescription}</p>
                  </div>
                ) : warehouses.map((warehouse) => {
                  const summary = summaries.get(warehouse.id) ?? getWarehouseInventorySummary(warehouse, rows);
                  const hasStock = summary.totalUnits > 0;
                  const transferTargetId = transferTargets[warehouse.id] ?? '';
                  const targetWarehouses = warehouses.filter((item) => item.id !== warehouse.id);

                  return (
                    <article key={warehouse.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold leading-5 text-slate-950">{warehouse.name}</p>
                            <span className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2 py-0.5 text-[11px] font-medium text-[#B63B32]">
                              {t.operational.warehouseTypes[warehouse.type]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            {warehouse.businessUnitName ?? t.common.notAvailable} · {warehouse.businessName ?? t.common.notAvailable}
                          </p>
                          <p className="text-xs font-semibold leading-5 text-slate-500">
                            {warehouse.jurisdiction} · {warehouse.responsibleName}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <MiniMetric label={t.operational.columns.storedItems} value={formatInventoryNumber(summary.storedItems)} />
                          <MiniMetric label={t.operational.columns.totalUnits} value={formatInventoryNumber(summary.totalUnits)} />
                          <MiniMetric label={t.operational.columns.estimatedValue} value={formatInventoryCurrency(summary.estimatedValue)} />
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        {hasStock ? (
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                            <SelectField
                              label={t.operational.modals.transferStockTo}
                              value={transferTargetId || 'none'}
                              options={[{ value: 'none', label: t.operational.modals.selectDestinationWarehouse }, ...targetWarehouses.map((target) => ({ value: target.id, label: target.name }))]}
                              onValueChange={(value) => handleTransferTargetChange(warehouse.id, value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 gap-2 rounded-lg border-cyan-200 bg-cyan-50 px-4 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
                              disabled={!transferTargetId}
                              onClick={() => requestDelete(warehouse)}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                              {t.operational.modals.transferAndDeleteWarehouse}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              {t.operational.modals.warehouseReadyToDelete}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 gap-2 rounded-lg border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
                              onClick={() => requestDelete(warehouse)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t.operational.modals.deleteWarehouse}
                            </Button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(pendingDeletion)}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDeletion(null)}
        title={t.operational.modals.deleteWarehouseTitle}
        description={t.operational.modals.deleteWarehouseDescription}
        icon={<AlertTriangle className="h-5 w-5" />}
        modalType="confirmation"
        bodyClassName="bg-slate-50/70 px-7 py-6"
        footerLeading={(
          <Button type="button" variant="outline" className={warehouseActionClassNames.secondary} onClick={() => setPendingDeletion(null)}>
            {t.common.cancel}
          </Button>
        )}
        footer={(
          <Button type="button" className="h-11 rounded-lg bg-red-600 px-5 font-semibold text-white shadow-sm hover:bg-red-700" onClick={confirmDelete}>
            {pendingDeletion?.targetWarehouseId
              ? t.operational.modals.transferAndDeleteWarehouse
              : t.operational.modals.confirmDeleteWarehouse}
          </Button>
        )}
      >
        <IndiceModalSummary
          columns={3}
          items={[
            { id: 'warehouse', label: t.operational.columns.warehouse, value: pendingDeletion?.warehouse.name ?? t.common.notAvailable, emphasized: true },
            { id: 'stock', label: t.operational.columns.totalUnits, value: formatInventoryNumber(pendingSummary?.totalUnits ?? 0) },
            { id: 'destination', label: t.operational.modals.destination, value: pendingDestination },
          ]}
          variant="accent"
        />
      </SalesModalFrame>
    </>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <InventoryModalField label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className={inventoryModalControlClassName} />
    </InventoryModalField>
  );
}

function SelectField({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <InventoryModalField label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={inventoryModalControlClassName}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </InventoryModalField>
  );
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[84px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
      <p className="text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
