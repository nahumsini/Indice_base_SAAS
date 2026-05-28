import { useMemo, useState } from 'react';
import { useSalesCrm } from '../salesCrmContext';
import { inventoryBusinesses, inventoryBusinessUnits } from './mocks/inventoryBusinessStructureMocks';
import { InventoryColumnsModal } from './components/InventoryColumnsModal';
import { InventoryFilters } from './components/InventoryFilters';
import { InventoryHeader } from './components/InventoryHeader';
import { InventoryInsightBar } from './components/InventoryInsightBar';
import { InventoryKpiStrip } from './components/InventoryKpiStrip';
import { InventoryViewSwitcher } from './components/InventoryViewSwitcher';
import { AddInventoryModal, type AddInventoryDraft } from './components/movements/AddInventoryModal';
import { MovementEditModal } from './components/movements/MovementEditModal';
import { MovementPrintModal } from './components/movements/MovementPrintModal';
import { MovementsKanban } from './components/movements/MovementsKanban';
import { MovementsTable } from './components/movements/MovementsTable';
import { TransferStockModal, type TransferStockDraft } from './components/movements/TransferStockModal';
import { StockBulkActionsBar } from './components/stock/StockBulkActionsBar';
import { StockTable } from './components/stock/StockTable';
import { CreateWarehouseModal, type CreateWarehouseDraft } from './components/warehouses/CreateWarehouseModal';
import { WarehousesTable } from './components/warehouses/WarehousesTable';
import { buildInitialInventoryMovements, buildInventoryStockRows, initialInventoryWarehouses } from './data/inventoryMockData';
import { useInventorySelection } from './hooks/useInventorySelection';
import { useInventoryTranslations } from './hooks/useInventoryTranslations';
import type {
  InventoryOperationalColumnId,
  InventoryOperationalFiltersState,
  InventoryOperationalMovement,
  InventoryOperationalMovementFiltersState,
  InventoryOperationalView,
  InventoryStockRow,
  InventoryWarehouse,
} from './types/inventoryTypes';
import { getMovementMetrics, getStockMetrics, getWarehouseInventoryEntries, getWarehouseMetrics } from './utils/inventoryCalculations';
import { SUPPLIER_SOURCE_ID, applyMovementEntryToStockRows, createInventoryMovementEntries, isSupplierSource, reverseInventoryMovement } from './utils/inventoryMovementEntries';
import {
  defaultMovementFilters,
  defaultOperationalColumns,
  defaultStockFilters,
  normalizeInventoryText,
} from './utils/inventoryOperationalState';

export default function Inventory() {
  const t = useInventoryTranslations();
  const { products } = useSalesCrm();
  const [activeView, setActiveView] = useState<InventoryOperationalView>('stock');
  const [movementViewMode, setMovementViewMode] = useState<'table' | 'kanban'>('table');
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>(initialInventoryWarehouses);
  const [stockRows, setStockRows] = useState<InventoryStockRow[]>(() => buildInventoryStockRows(products, initialInventoryWarehouses));
  const [movements, setMovements] = useState<InventoryOperationalMovement[]>(() => buildInitialInventoryMovements(buildInventoryStockRows(products, initialInventoryWarehouses), initialInventoryWarehouses));
  const [visibleColumns, setVisibleColumns] = useState<InventoryOperationalColumnId[]>(defaultOperationalColumns);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<InventoryOperationalMovement | null>(null);
  const [printingMovement, setPrintingMovement] = useState<InventoryOperationalMovement | null>(null);
  const [initialProductId, setInitialProductId] = useState<string | undefined>();
  const [stockFilters, setStockFilters] = useState<InventoryOperationalFiltersState>(defaultStockFilters);
  const [movementFilters, setMovementFilters] = useState<InventoryOperationalMovementFiltersState>(defaultMovementFilters);
  const selection = useInventorySelection<string>();

  const filteredStockRows = useMemo(() => stockRows.filter((row) => {
    const search = normalizeInventoryText(stockFilters.search);
    const matchesSearch = !search || [row.name, row.sku, row.category, row.type, row.description].some((value) => normalizeInventoryText(value).includes(search));
    const matchesCategory = stockFilters.category === 'all' || row.category === stockFilters.category;
    const matchesType = stockFilters.itemType === 'all' || row.type === stockFilters.itemType;
    const matchesUnit = stockFilters.businessUnitId === 'all' || row.businessUnitId === stockFilters.businessUnitId;
    const matchesBusiness = stockFilters.businessId === 'all' || row.businessId === stockFilters.businessId;
    const matchesTracking = stockFilters.tracking === 'all' || (stockFilters.tracking === 'tracked' ? row.usesInventory : !row.usesInventory);
    return matchesSearch && matchesCategory && matchesType && matchesUnit && matchesBusiness && matchesTracking;
  }), [stockFilters, stockRows]);

  const filteredWarehouseRows = useMemo(() => stockRows.filter((row) => {
    const matchesCategory = stockFilters.category === 'all' || row.category === stockFilters.category;
    const matchesType = stockFilters.itemType === 'all' || row.type === stockFilters.itemType;
    const matchesTracking = stockFilters.tracking === 'all' || (stockFilters.tracking === 'tracked' ? row.usesInventory : !row.usesInventory);
    return matchesCategory && matchesType && matchesTracking;
  }), [stockFilters, stockRows]);

  const filteredWarehouses = useMemo(() => warehouses.filter((warehouse) => {
    const search = normalizeInventoryText(stockFilters.search);
    const entries = getWarehouseInventoryEntries(warehouse.id, filteredWarehouseRows);
    const matchesWarehouseSearch = !search || [warehouse.name, warehouse.businessUnitName, warehouse.businessName, warehouse.responsibleName, warehouse.jurisdiction].some((value) => normalizeInventoryText(value).includes(search));
    const matchesProductSearch = !search || entries.some(({ row }) => [row.name, row.sku, row.category, row.type, row.description].some((value) => normalizeInventoryText(value).includes(search)));
    const needsProductMatch = stockFilters.category !== 'all' || stockFilters.itemType !== 'all' || stockFilters.tracking !== 'all';
    return (matchesWarehouseSearch || matchesProductSearch)
      && (!needsProductMatch || entries.length > 0)
      && (stockFilters.businessUnitId === 'all' || warehouse.businessUnitId === stockFilters.businessUnitId)
      && (stockFilters.businessId === 'all' || warehouse.businessId === stockFilters.businessId);
  }), [filteredWarehouseRows, stockFilters, warehouses]);

  const filteredMovements = useMemo(() => movements.filter((movement) => {
    const search = normalizeInventoryText(movementFilters.search);
    const responsible = normalizeInventoryText(movementFilters.responsible);
    const matchesSearch = !search || [movement.movementNumber, movement.productName, movement.productSku, movement.reason, movement.reference, movement.responsibleName, movement.fromWarehouseName, movement.toWarehouseName].some((value) => normalizeInventoryText(value).includes(search));
    const matchesResponsible = !responsible || normalizeInventoryText(movement.responsibleName).includes(responsible);
    const matchesDateFrom = !movementFilters.dateFrom || movement.movementDate >= movementFilters.dateFrom;
    const matchesDateTo = !movementFilters.dateTo || movement.movementDate <= movementFilters.dateTo;
    return matchesSearch
      && matchesResponsible
      && matchesDateFrom
      && matchesDateTo
      && (movementFilters.movementType === 'all' || movement.movementType === movementFilters.movementType)
      && (movementFilters.productId === 'all' || movement.productId === movementFilters.productId)
      && (movementFilters.fromWarehouseId === 'all' || movement.fromWarehouseId === movementFilters.fromWarehouseId)
      && (movementFilters.toWarehouseId === 'all' || movement.toWarehouseId === movementFilters.toWarehouseId)
      && (movementFilters.businessUnitId === 'all' || movement.businessUnitId === movementFilters.businessUnitId)
      && (movementFilters.businessId === 'all' || movement.businessId === movementFilters.businessId)
      && (movementFilters.status === 'all' || movement.status === movementFilters.status);
  }), [movementFilters, movements]);

  const movementResponsibleOptions = useMemo(() => Array.from(new Set(
    movements.map((movement) => movement.responsibleName).filter(Boolean),
  )).sort((first, second) => first.localeCompare(second)), [movements]);

  const activeMetrics = useMemo(() => (
    activeView === 'stock'
      ? getStockMetrics(filteredStockRows)
      : activeView === 'warehouses'
        ? getWarehouseMetrics(filteredWarehouses, stockRows)
        : getMovementMetrics(filteredMovements)
  ), [activeView, filteredMovements, filteredStockRows, filteredWarehouses, stockRows]);

  const visibleIds = useMemo(() => filteredStockRows.map((row) => row.id), [filteredStockRows]);
  const visibleSelectionState = selection.visibleSelectionState(visibleIds);

  const handleAddInventory = (draft: AddInventoryDraft) => {
    const warehouse = warehouses.find((item) => item.id === draft.destinationWarehouseId);
    if (!warehouse) return;

    const receiptDraft = {
      movementType: 'supplierReceipt' as const,
      items: draft.items,
      fromWarehouseId: SUPPLIER_SOURCE_ID,
      toWarehouseId: warehouse.id,
      supplierName: draft.supplierName,
      attachments: draft.attachments,
      reason: draft.reason,
      reference: draft.reference,
      date: draft.date,
    };

    setStockRows((current) => applyMovementEntryToStockRows(current, receiptDraft, undefined, warehouse));
    setMovements((current) => [
      ...createInventoryMovementEntries({ draft: receiptDraft, rows: stockRows, currentLength: current.length, toWarehouse: warehouse }),
      ...current,
    ]);
    setIsAddInventoryOpen(false);
    setActiveView('movements');
  };

  const handleTransferStock = (draft: TransferStockDraft) => {
    const fromWarehouse = warehouses.find((item) => item.id === draft.fromWarehouseId);
    const toWarehouse = warehouses.find((item) => item.id === draft.toWarehouseId);
    const sourceIsSupplier = isSupplierSource(draft.fromWarehouseId);
    const needsFromWarehouse = ['transfer', 'storeReplenishment', 'sale', 'adjustment', 'writeOff'].includes(draft.movementType) && !sourceIsSupplier;
    const needsToWarehouse = ['supplierReceipt', 'transfer', 'storeReplenishment', 'return'].includes(draft.movementType);
    if ((needsFromWarehouse && !fromWarehouse) || (needsToWarehouse && !toWarehouse)) return;

    setStockRows((current) => applyMovementEntryToStockRows(current, draft, fromWarehouse, toWarehouse));
    setMovements((current) => [
      ...createInventoryMovementEntries({ draft, rows: stockRows, currentLength: current.length, fromWarehouse, toWarehouse }),
      ...current,
    ]);
    setIsTransferOpen(false);
    setActiveView('movements');
  };

  const handleCreateWarehouse = (draft: CreateWarehouseDraft) => {
    const id = `wh-${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || warehouses.length + 1}`;
    setWarehouses((current) => [{ ...draft, id, lastMovementAt: new Date().toISOString().slice(0, 10) }, ...current]);
    setIsWarehouseOpen(false);
  };

  const handleCreateAdjustment = () => {
    const row = filteredStockRows[0] ?? stockRows[0];
    if (!row) return;

    setMovements((current) => [{
      id: `ADJ-${String(1300 + current.length).padStart(6, '0')}`,
      movementNumber: `ADJ-${String(1300 + current.length).padStart(6, '0')}`,
      productId: row.productId,
      productName: row.name,
      productSku: row.sku,
      productImageUrl: row.thumbnailUrl,
      productImageAlt: row.thumbnailAlt,
      movementType: 'adjustment',
      quantity: -1,
      unitCost: row.averageCost,
      fromWarehouseName: 'System',
      toWarehouseName: 'Inventory correction',
      businessUnitId: row.businessUnitId,
      businessUnitName: row.businessUnitName,
      businessId: row.businessId,
      businessName: row.businessName,
      reason: 'Inventory adjustment draft.',
      reference: `ADJ-${String(current.length + 1).padStart(5, '0')}`,
      responsibleName: 'Nahum Pena',
      movementDate: new Date().toISOString().slice(0, 10),
      status: 'draft',
    }, ...current]);
    setActiveView('movements');
  };

  const handleSaveMovementEdit = (movementId: string, patch: Pick<InventoryOperationalMovement, 'movementDate' | 'reference' | 'reason' | 'responsibleName' | 'status'>) => {
    setMovements((current) => {
      const target = current.find((movement) => movement.id === movementId);
      const targetGroupId = target?.groupId ?? target?.movementNumber ?? target?.id;
      return current.map((movement) => (
        targetGroupId && (movement.groupId ?? movement.movementNumber ?? movement.id) === targetGroupId
          ? { ...movement, ...patch }
          : movement
      ));
    });
    setEditingMovement(null);
  };

  const handleCancelMovement = (movement: InventoryOperationalMovement) => {
    if (movement.status === 'cancelled') return;
    const movementGroupId = movement.groupId ?? movement.movementNumber ?? movement.id;
    const movementLines = movements.filter((item) => (item.groupId ?? item.movementNumber ?? item.id) === movementGroupId);
    setStockRows((current) => movementLines.reduce((nextRows, item) => reverseInventoryMovement(nextRows, item, warehouses), current));
    setMovements((current) => current.map((item) => (
      (item.groupId ?? item.movementNumber ?? item.id) === movementGroupId
        ? { ...item, status: 'cancelled', reason: `${item.reason} Cancelled and reversed locally.` }
        : item
    )));
  };

  return (
    <section className="space-y-5">
      <InventoryHeader
        t={t}
        isMovementsView={activeView === 'movements'}
        onAddInventory={() => { setInitialProductId(undefined); setIsAddInventoryOpen(true); }}
        onTransferStock={() => { setInitialProductId(undefined); setIsTransferOpen(true); }}
        onCreateWarehouse={() => setIsWarehouseOpen(true)}
        onInventoryAdjustment={handleCreateAdjustment}
        onOpenColumns={() => setIsColumnsOpen(true)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <InventoryViewSwitcher activeView={activeView} t={t} onViewChange={setActiveView} />
      </div>

      <InventoryFilters
        activeView={activeView}
        filters={activeView === 'movements' ? movementFilters : stockFilters}
        warehouses={warehouses}
        businessUnits={inventoryBusinessUnits}
        businesses={inventoryBusinesses}
        responsibleOptions={movementResponsibleOptions}
        t={t}
        onFiltersChange={(filters) => {
          if (activeView === 'stock' || activeView === 'warehouses') setStockFilters(filters as InventoryOperationalFiltersState);
          if (activeView === 'movements') setMovementFilters(filters as InventoryOperationalMovementFiltersState);
        }}
      />

      <InventoryKpiStrip activeView={activeView} metrics={activeMetrics} t={t} />
      <InventoryInsightBar activeView={activeView} metrics={activeMetrics} t={t} />

      {activeView === 'stock' ? (
        <>
          <StockBulkActionsBar selectedCount={selection.selectedCount} t={t} onClearSelection={selection.clearSelection} />
          {filteredStockRows.length === 0 ? (
            <EmptyState title={t.operational.emptyStates.stockTitle} description={t.operational.emptyStates.stockDescription} />
          ) : (
            <StockTable
              rows={filteredStockRows}
              visibleColumns={visibleColumns}
              selectedState={{
                allVisibleSelected: visibleSelectionState.allVisibleSelected,
                someVisibleSelected: visibleSelectionState.someVisibleSelected,
                isSelected: selection.isSelected,
              }}
              t={t}
              onToggleRow={selection.toggleSelection}
              onToggleAll={(checked) => selection.toggleAllVisible(visibleIds, checked)}
              onAddStock={(row) => { setInitialProductId(row.productId); setIsAddInventoryOpen(true); }}
              onTransfer={(row) => { setInitialProductId(row.productId); setIsTransferOpen(true); }}
              onViewMovements={(row) => { setMovementFilters({ ...defaultMovementFilters, productId: row.productId, search: row.name }); setActiveView('movements'); }}
              onCategoryChange={(row, category) => setStockRows((current) => current.map((item) => item.id === row.id ? { ...item, category } : item))}
            />
          )}
        </>
      ) : null}

      {activeView === 'warehouses' ? (
        filteredWarehouses.length === 0 ? <EmptyState title={t.operational.emptyStates.warehousesTitle} description={t.operational.emptyStates.warehousesDescription} /> : (
          <WarehousesTable
            warehouses={filteredWarehouses}
            rows={filteredWarehouseRows}
            visibleColumns={visibleColumns}
            t={t}
            onAddStock={() => setIsAddInventoryOpen(true)}
            onTransferStock={() => setIsTransferOpen(true)}
            onDisableWarehouse={(warehouseId) => setWarehouses((current) => current.map((warehouse) => warehouse.id === warehouseId ? { ...warehouse, status: 'inactive' } : warehouse))}
          />
        )
      ) : null}

      {activeView === 'movements' ? (
        <>
          <MovementViewModeSwitcher value={movementViewMode} t={t} onChange={setMovementViewMode} />
          {filteredMovements.length === 0 ? (
            <EmptyState title={t.operational.emptyStates.movementsTitle} description={t.operational.emptyStates.movementsDescription} />
          ) : movementViewMode === 'kanban' ? (
            <MovementsKanban movements={filteredMovements} t={t} />
          ) : (
            <MovementsTable
              movements={filteredMovements}
              t={t}
              onEdit={setEditingMovement}
              onPrint={setPrintingMovement}
              onTrack={(movement) => setMovementFilters({ ...defaultMovementFilters, search: movement.movementNumber ?? movement.id })}
              onCancel={handleCancelMovement}
            />
          )}
        </>
      ) : null}

      <InventoryColumnsModal open={isColumnsOpen} visibleColumns={visibleColumns} t={t} onOpenChange={setIsColumnsOpen} onVisibleColumnsChange={setVisibleColumns} />
      <AddInventoryModal open={isAddInventoryOpen} rows={stockRows} warehouses={warehouses} businessUnits={inventoryBusinessUnits} businesses={inventoryBusinesses} t={t} initialProductId={initialProductId} onOpenChange={setIsAddInventoryOpen} onSubmit={handleAddInventory} />
      <TransferStockModal open={isTransferOpen} rows={stockRows} warehouses={warehouses} t={t} initialProductId={initialProductId} onOpenChange={setIsTransferOpen} onSubmit={handleTransferStock} />
      <CreateWarehouseModal open={isWarehouseOpen} businessUnits={inventoryBusinessUnits} businesses={inventoryBusinesses} t={t} onOpenChange={setIsWarehouseOpen} onSubmit={handleCreateWarehouse} />
      <MovementEditModal movement={editingMovement} t={t} onClose={() => setEditingMovement(null)} onSave={handleSaveMovementEdit} />
      <MovementPrintModal
        movement={printingMovement}
        movementLines={printingMovement ? movements.filter((movement) => (movement.groupId ?? movement.movementNumber ?? movement.id) === (printingMovement.groupId ?? printingMovement.movementNumber ?? printingMovement.id)) : []}
        t={t}
        onClose={() => setPrintingMovement(null)}
      />
    </section>
  );
}

function MovementViewModeSwitcher({
  value,
  t,
  onChange,
}: {
  value: 'table' | 'kanban';
  t: ReturnType<typeof useInventoryTranslations>;
  onChange: (value: 'table' | 'kanban') => void;
}) {
  const modes = [
    { id: 'table' as const, label: t.operational.movementViewModes.table },
    { id: 'kanban' as const, label: t.operational.movementViewModes.kanban },
  ];

  return (
    <div className="flex justify-end">
      <div className="inline-flex h-10 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`h-8 rounded-lg px-3 text-sm font-black transition ${
              value === mode.id ? 'bg-[#FF6B5E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => onChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="max-w-md">
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
