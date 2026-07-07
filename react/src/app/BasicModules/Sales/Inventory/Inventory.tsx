import { useEffect, useMemo, useState } from 'react';
import { useSalesCrm } from '../salesCrmContext';
import { financeReferenceDataService, providersService } from '../../Expenses/services';
import type { ProviderRecord } from '../../Expenses/Providers/useProveedoresLogic';
import type { FinanceReferenceUser } from '../../Expenses/types/finance-reference.types';
import { inventoryBusinesses, inventoryBusinessUnits } from './mocks/inventoryBusinessStructureMocks';
import { InventoryColumnsModal } from './components/InventoryColumnsModal';
import { InventoryFilters } from './components/InventoryFilters';
import { InventoryHeader } from './components/InventoryHeader';
import { InventoryInsightBar } from './components/InventoryInsightBar';
import { InventoryKpiStrip } from './components/InventoryKpiStrip';
import { InventoryViewSwitcher } from './components/InventoryViewSwitcher';
import { AddInventoryModal, type AddInventoryDraft } from './components/movements/AddInventoryModal';
import { MovementPrintModal } from './components/movements/MovementPrintModal';
import { MovementsKanban } from './components/movements/MovementsKanban';
import { MovementsTable } from './components/movements/MovementsTable';
import { TransferStockModal, type TransferStockDraft } from './components/movements/TransferStockModal';
import { StockBulkActionsBar } from './components/stock/StockBulkActionsBar';
import { StockTable } from './components/stock/StockTable';
import { CreateWarehouseModal, type CreateWarehouseDraft } from './components/warehouses/CreateWarehouseModal';
import { WarehousesTable } from './components/warehouses/WarehousesTable';
import { buildInitialInventoryMovements, buildInventoryStockRows, initialInventoryWarehouses, syncInventoryStockRows } from './data/inventoryMockData';
import { useInventorySelection } from './hooks/useInventorySelection';
import { useInventoryTranslations } from './hooks/useInventoryTranslations';
import { inventoryApi } from './services/inventoryApi';
import type {
  InventoryOperationalColumnId,
  InventoryOperationalFiltersState,
  InventoryOperationalMovement,
  InventoryOperationalMovementFiltersState,
  InventoryOperationalView,
  InventoryMovementEntryType,
  InventoryStockRow,
  InventoryWarehouse,
} from './types/inventoryTypes';
import { getMovementMetrics, getStockMetrics, getWarehouseInventoryEntries, getWarehouseMetrics } from './utils/inventoryCalculations';
import {
  SUPPLIER_SOURCE_ID,
  applyMovementEntryToStockRows,
  createInventoryMovementEntries,
  isSupplierSource,
  reverseInventoryMovement,
} from './utils/inventoryMovementEntries';
import {
  getOperationalMovementGroupId,
  getOperationalMovementGroupLines,
  updateMovementGroupFromDraft,
} from './utils/inventoryMovementEditing';
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
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [referenceUsers, setReferenceUsers] = useState<FinanceReferenceUser[]>([]);
  const [stockRows, setStockRows] = useState<InventoryStockRow[]>(() => buildInventoryStockRows(products));
  const [movements, setMovements] = useState<InventoryOperationalMovement[]>(() => buildInitialInventoryMovements());
  const [visibleColumns, setVisibleColumns] = useState<InventoryOperationalColumnId[]>(defaultOperationalColumns);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<InventoryOperationalMovement | null>(null);
  const [printingMovement, setPrintingMovement] = useState<InventoryOperationalMovement | null>(null);
  const [initialProductId, setInitialProductId] = useState<string | undefined>();
  const [initialWarehouseId, setInitialWarehouseId] = useState<string | undefined>();
  const [initialMovementType, setInitialMovementType] = useState<InventoryMovementEntryType>('transfer');
  const [stockFilters, setStockFilters] = useState<InventoryOperationalFiltersState>(defaultStockFilters);
  const [movementFilters, setMovementFilters] = useState<InventoryOperationalMovementFiltersState>(defaultMovementFilters);
  const selection = useInventorySelection<string>();

  useEffect(() => {
    let isMounted = true;

    inventoryApi.loadWorkspace(products)
      .then((workspace) => {
        if (!isMounted) return;
        setWarehouses(workspace.warehouses);
        setStockRows(workspace.stockRows);
        setMovements(workspace.movements);
      })
      .catch((error) => {
        console.warn('[Sales Inventory] backend workspace could not load. Keeping local state.', error);
        if (!isMounted) return;
        setStockRows((currentRows) => syncInventoryStockRows(products, currentRows));
      });

    return () => {
      isMounted = false;
    };
  }, [products]);

  useEffect(() => {
    let isMounted = true;

    providersService.getProviderRecords()
      .then((records) => {
        if (!isMounted) return;
        setProviders(records);
      })
      .catch(() => {
        if (!isMounted) return;
        setProviders([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    financeReferenceDataService.getReferenceData()
      .then((referenceData) => {
        if (!isMounted) return;
        setReferenceUsers(referenceData.users);
      })
      .catch(() => {
        if (!isMounted) return;
        setReferenceUsers([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const supplierOptions = useMemo(() => (
    providers
      .filter((provider) => provider.status === 'active')
      .map((provider) => ({ id: provider.id, name: provider.name }))
      .sort((first, second) => first.name.localeCompare(second.name))
  ), [providers]);

  const warehouseResponsibleOptions = useMemo(() => (
    referenceUsers
      .filter((user) => {
        const status = user.status?.toLowerCase();
        return !status || status === 'active';
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }))
      .sort((first, second) => first.name.localeCompare(second.name))
  ), [referenceUsers]);

  const filteredStockRows = useMemo(() => stockRows.filter((row) => {
    const search = normalizeInventoryText(stockFilters.search);
    const matchesSearch = !search || [row.name, row.sku, row.category, row.type, row.description].some((value) => normalizeInventoryText(value).includes(search));
    const matchesWarehouse = stockFilters.warehouseId === 'all'
      || row.distributions.some((distribution) => distribution.warehouseId === stockFilters.warehouseId);
    const matchesCategory = stockFilters.category === 'all' || row.category === stockFilters.category;
    const matchesType = stockFilters.itemType === 'all' || row.type === stockFilters.itemType;
    const matchesUnit = stockFilters.businessUnitId === 'all' || row.businessUnitId === stockFilters.businessUnitId;
    const matchesBusiness = stockFilters.businessId === 'all' || row.businessId === stockFilters.businessId;
    const matchesTracking = stockFilters.tracking === 'all' || (stockFilters.tracking === 'tracked' ? row.usesInventory : !row.usesInventory);
    return matchesSearch && matchesWarehouse && matchesCategory && matchesType && matchesUnit && matchesBusiness && matchesTracking;
  }), [stockFilters, stockRows]);

  const categoryOptions = useMemo(() => Array.from(new Set(
    stockRows.map((row) => row.category).filter(Boolean),
  )).sort((first, second) => first.localeCompare(second)), [stockRows]);

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
      && (stockFilters.warehouseId === 'all' || warehouse.id === stockFilters.warehouseId)
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
  const editingMovementLines = useMemo(() => {
    return getOperationalMovementGroupLines(movements, editingMovement);
  }, [editingMovement, movements]);

  const activeMetrics = useMemo(() => (
    activeView === 'stock'
      ? getStockMetrics(filteredStockRows)
      : activeView === 'warehouses'
        ? getWarehouseMetrics(filteredWarehouses, stockRows)
        : getMovementMetrics(filteredMovements)
  ), [activeView, filteredMovements, filteredStockRows, filteredWarehouses, stockRows]);

  const persistStockRows = (rows: InventoryStockRow[]) => {
    void inventoryApi.persistStockRows(rows)
      .then((persistedRows) => setStockRows((currentRows) => syncInventoryStockRows(products, persistedRows.length > 0 ? persistedRows : currentRows)))
      .catch((error) => console.warn('[Sales Inventory] stock balances could not sync.', error));
  };

  const persistMovements = (createdMovements: InventoryOperationalMovement[]) => {
    const temporaryIds = new Set(createdMovements.map((movement) => movement.id));

    void inventoryApi.createMovements(createdMovements)
      .then((persistedMovements) => {
        if (persistedMovements.length === 0) return;
        setMovements((current) => [
          ...persistedMovements,
          ...current.filter((movement) => !temporaryIds.has(movement.id)),
        ]);
      })
      .catch((error) => console.warn('[Sales Inventory] movements could not sync.', error));
  };

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

    const nextStockRows = applyMovementEntryToStockRows(stockRows, receiptDraft, undefined, warehouse);
    const createdMovements = createInventoryMovementEntries({ draft: receiptDraft, rows: stockRows, currentLength: movements.length, toWarehouse: warehouse });

    setStockRows(nextStockRows);
    setMovements((current) => [...createdMovements, ...current]);
    persistStockRows(nextStockRows);
    persistMovements(createdMovements);
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

    const nextStockRows = applyMovementEntryToStockRows(stockRows, draft, fromWarehouse, toWarehouse);
    const createdMovements = createInventoryMovementEntries({ draft, rows: stockRows, currentLength: movements.length, fromWarehouse, toWarehouse });

    setStockRows(nextStockRows);
    setMovements((current) => [...createdMovements, ...current]);
    persistStockRows(nextStockRows);
    persistMovements(createdMovements);
    setIsTransferOpen(false);
    setActiveView('movements');
  };

  const handleCreateWarehouse = (draft: CreateWarehouseDraft) => {
    const id = `wh-${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || warehouses.length + 1}`;
    const localWarehouse = { ...draft, id, lastMovementAt: new Date().toISOString().slice(0, 10) };

    setWarehouses((current) => [localWarehouse, ...current]);
    void inventoryApi.createWarehouse(localWarehouse)
      .then((persistedWarehouse) => setWarehouses((current) => current.map((warehouse) => (
        warehouse.id === localWarehouse.id ? persistedWarehouse : warehouse
      ))))
      .catch((error) => console.warn('[Sales Inventory] warehouse could not sync.', error));
  };

  const handleDeleteWarehouse = (warehouseId: string) => {
    setStockRows((current) => current.map((row) => ({
      ...row,
      distributions: row.distributions.filter((distribution) => distribution.warehouseId !== warehouseId),
    })));
    setWarehouses((current) => current.filter((warehouse) => warehouse.id !== warehouseId));
    setStockFilters((current) => current.warehouseId === warehouseId ? { ...current, warehouseId: 'all' } : current);
    void inventoryApi.deleteWarehouse(warehouseId)
      .catch((error) => console.warn('[Sales Inventory] warehouse delete could not sync.', error));
  };

  const handleTransferAndDeleteWarehouse = (sourceWarehouseId: string, targetWarehouseId: string) => {
    if (sourceWarehouseId === targetWarehouseId) return;
    const targetWarehouse = warehouses.find((warehouse) => warehouse.id === targetWarehouseId);
    if (!targetWarehouse) return;

    const today = new Date().toISOString().slice(0, 10);
    const nextStockRows = stockRows.map((row) => {
      const sourceDistribution = row.distributions.find((distribution) => distribution.warehouseId === sourceWarehouseId);
      if (!sourceDistribution) return row;

      const remainingDistributions = row.distributions.filter((distribution) => distribution.warehouseId !== sourceWarehouseId);
      const hasTargetDistribution = remainingDistributions.some((distribution) => distribution.warehouseId === targetWarehouseId);
      const distributions = hasTargetDistribution
        ? remainingDistributions.map((distribution) => (
          distribution.warehouseId === targetWarehouseId
            ? {
              ...distribution,
              available: distribution.available + sourceDistribution.available,
              reserved: distribution.reserved + sourceDistribution.reserved,
              minimum: Math.max(distribution.minimum, sourceDistribution.minimum),
            }
            : distribution
        ))
        : [
          ...remainingDistributions,
          {
            warehouseId: targetWarehouse.id,
            warehouseName: targetWarehouse.name,
            available: sourceDistribution.available,
            reserved: sourceDistribution.reserved,
            minimum: sourceDistribution.minimum,
          },
        ];

      return {
        ...row,
        distributions,
        businessUnitId: targetWarehouse.businessUnitId ?? row.businessUnitId,
        businessUnitName: targetWarehouse.businessUnitName ?? row.businessUnitName,
        businessId: targetWarehouse.businessId ?? row.businessId,
        businessName: targetWarehouse.businessName ?? row.businessName,
        lastMovementAt: today,
      };
    });

    setStockRows(nextStockRows);
    setWarehouses((current) => current.filter((warehouse) => warehouse.id !== sourceWarehouseId));
    setStockFilters((current) => current.warehouseId === sourceWarehouseId ? { ...current, warehouseId: 'all' } : current);
    persistStockRows(nextStockRows);
    void inventoryApi.deleteWarehouse(sourceWarehouseId)
      .catch((error) => console.warn('[Sales Inventory] warehouse transfer delete could not sync.', error));
  };

  const openAddInventoryModal = (productId?: string, warehouseId?: string) => {
    setInitialProductId(productId);
    setInitialWarehouseId(warehouseId);
    setIsAddInventoryOpen(true);
  };

  const openMovementEntryModal = (movementType: InventoryMovementEntryType, productId?: string, warehouseId?: string) => {
    setInitialMovementType(movementType);
    setInitialProductId(productId);
    setInitialWarehouseId(warehouseId);
    setIsTransferOpen(true);
  };

  const handleSaveMovementEdit = (movementId: string, draft: TransferStockDraft) => {
    const nextMovements = updateMovementGroupFromDraft({
      movements,
      movementId,
      draft,
      warehouses,
      stockRows,
    });
    const targetMovement = movements.find((movement) => movement.id === movementId);
    const movementGroupId = targetMovement ? getOperationalMovementGroupId(targetMovement) : undefined;
    const updatedLines = movementGroupId
      ? nextMovements.filter((movement) => getOperationalMovementGroupId(movement) === movementGroupId)
      : [];

    setMovements((current) => updateMovementGroupFromDraft({
      movements: current,
      movementId,
      draft,
      warehouses,
      stockRows,
    }));
    updatedLines.forEach((movement) => {
      void inventoryApi.updateMovement(movement)
        .catch((error) => console.warn('[Sales Inventory] movement edit could not sync.', error));
    });
    setEditingMovement(null);
  };

  const handleMovementStatusChange = (
    movement: InventoryOperationalMovement,
    status: InventoryOperationalMovement['status'],
  ) => {
    if (movement.status === status || movement.status === 'cancelled') {
      return;
    }

    if (status === 'cancelled') {
      handleCancelMovement(movement);
      return;
    }

    const movementGroupId = getOperationalMovementGroupId(movement);
    const updatedLines = movements
      .filter((item) => getOperationalMovementGroupId(item) === movementGroupId)
      .map((item) => ({ ...item, status }));

    setMovements((current) => current.map((item) => (
      getOperationalMovementGroupId(item) === movementGroupId
        ? { ...item, status }
        : item
    )));
    updatedLines.forEach((item) => {
      void inventoryApi.updateMovement(item)
        .catch((error) => console.warn('[Sales Inventory] movement status could not sync.', error));
    });
  };

  const handleCancelMovement = (movement: InventoryOperationalMovement) => {
    if (movement.status === 'cancelled') return;
    const movementGroupId = getOperationalMovementGroupId(movement);
    const movementLines = movements.filter((item) => getOperationalMovementGroupId(item) === movementGroupId);
    const nextStockRows = movementLines.reduce((nextRows, item) => reverseInventoryMovement(nextRows, item, warehouses), stockRows);
    const cancelledLines = movementLines.map((item) => ({ ...item, status: 'cancelled' as const, reason: `${item.reason} ${t.operational.cancelledReturnMessage}` }));

    setStockRows(nextStockRows);
    setMovements((current) => current.map((item) => (
      getOperationalMovementGroupId(item) === movementGroupId
        ? { ...item, status: 'cancelled', reason: `${item.reason} ${t.operational.cancelledReturnMessage}` }
        : item
    )));
    persistStockRows(nextStockRows);
    cancelledLines.forEach((item) => {
      void inventoryApi.updateMovement(item)
        .catch((error) => console.warn('[Sales Inventory] movement cancel could not sync.', error));
    });
  };

  const handleDisableWarehouse = (warehouseId: string) => {
    const targetWarehouse = warehouses.find((warehouse) => warehouse.id === warehouseId);
    const nextWarehouse = targetWarehouse ? { ...targetWarehouse, status: 'inactive' as const } : undefined;

    setWarehouses((current) => current.map((warehouse) => warehouse.id === warehouseId ? { ...warehouse, status: 'inactive' } : warehouse));

    if (nextWarehouse) {
      void inventoryApi.updateWarehouse(nextWarehouse)
        .catch((error) => console.warn('[Sales Inventory] warehouse status could not sync.', error));
    }
  };

  return (
    <section className="space-y-5">
      <InventoryHeader
        t={t}
        isMovementsView={activeView === 'movements'}
        onAddInventory={() => openAddInventoryModal()}
        onTransferStock={() => openMovementEntryModal('transfer')}
        onCreateWarehouse={() => setIsWarehouseOpen(true)}
        onInventoryAdjustment={() => openMovementEntryModal('adjustment')}
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
        categoryOptions={categoryOptions}
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
                isSelected: selection.isSelected,
              }}
              t={t}
              onToggleRow={selection.toggleSelection}
              onAddStock={(row) => openAddInventoryModal(row.productId)}
              onTransfer={(row) => openMovementEntryModal('transfer', row.productId)}
              onAdjust={(row) => openMovementEntryModal('adjustment', row.productId)}
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
            onAddStock={(warehouse) => openAddInventoryModal(undefined, warehouse.id)}
            onTransferStock={(warehouse) => openMovementEntryModal('transfer', undefined, warehouse.id)}
            onViewMovements={(warehouse) => { setMovementFilters({ ...defaultMovementFilters, search: warehouse.name }); setActiveView('movements'); }}
            onDisableWarehouse={handleDisableWarehouse}
          />
        )
      ) : null}

      {activeView === 'movements' ? (
        <>
          <MovementViewModeSwitcher value={movementViewMode} t={t} onChange={setMovementViewMode} />
          {filteredMovements.length === 0 ? (
            <EmptyState title={t.operational.emptyStates.movementsTitle} description={t.operational.emptyStates.movementsDescription} />
          ) : movementViewMode === 'kanban' ? (
            <MovementsKanban movements={filteredMovements} t={t} onStatusChange={handleMovementStatusChange} onCancel={handleCancelMovement} />
          ) : (
            <MovementsTable
              movements={filteredMovements}
              t={t}
              onEdit={setEditingMovement}
              onPrint={setPrintingMovement}
              onTrack={(movement) => setMovementFilters({ ...defaultMovementFilters, search: movement.movementNumber ?? movement.id })}
              onCancel={handleCancelMovement}
              onStatusChange={handleMovementStatusChange}
            />
          )}
        </>
      ) : null}

      <InventoryColumnsModal open={isColumnsOpen} visibleColumns={visibleColumns} t={t} onOpenChange={setIsColumnsOpen} onVisibleColumnsChange={setVisibleColumns} />
      <AddInventoryModal
        open={isAddInventoryOpen}
        rows={stockRows}
        warehouses={warehouses}
        suppliers={supplierOptions}
        t={t}
        initialProductId={initialProductId}
        initialWarehouseId={initialWarehouseId}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddInventoryOpen(false);
            setInitialWarehouseId(undefined);
          }
        }}
        onSubmit={handleAddInventory}
      />
      <TransferStockModal
        open={isTransferOpen || Boolean(editingMovement)}
        rows={stockRows}
        warehouses={warehouses}
        suppliers={supplierOptions}
        t={t}
        initialProductId={initialProductId}
        initialMovementType={initialMovementType}
        initialWarehouseId={initialWarehouseId}
        editingMovement={editingMovement}
        editingMovementLines={editingMovementLines}
        onOpenChange={(open) => {
          if (!open) {
            setIsTransferOpen(false);
            setEditingMovement(null);
            setInitialMovementType('transfer');
            setInitialWarehouseId(undefined);
          }
        }}
        onSubmit={handleTransferStock}
        onSaveEdit={handleSaveMovementEdit}
      />
      <CreateWarehouseModal
        open={isWarehouseOpen}
        warehouses={warehouses}
        rows={stockRows}
        businessUnits={inventoryBusinessUnits}
        businesses={inventoryBusinesses}
        responsibleOptions={warehouseResponsibleOptions}
        t={t}
        onOpenChange={setIsWarehouseOpen}
        onSubmit={handleCreateWarehouse}
        onDeleteWarehouse={handleDeleteWarehouse}
        onTransferAndDeleteWarehouse={handleTransferAndDeleteWarehouse}
      />
      <MovementPrintModal
        movement={printingMovement}
        movementLines={getOperationalMovementGroupLines(movements, printingMovement)}
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
            className={`h-8 rounded-lg px-3 text-sm font-medium transition ${
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
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
