import type {
  InventoryColumnId,
  InventoryFiltersState,
  InventoryLocation,
  InventoryMetrics,
  InventoryMovement,
  InventoryStatus,
  InventoryStockItem,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { InventoryFilters } from './InventoryFilters';
import { InventoryHealthPanel } from './InventoryHealthPanel';
import { InventoryInsightBar } from './InventoryInsightBar';
import { InventoryKpiStrip } from './InventoryKpiStrip';
import { InventoryStatusBar } from './InventoryStatusBar';
import { InventoryTable } from './InventoryTable';

export function InventoryStockView({
  filters,
  filteredItems,
  locations,
  metrics,
  movements,
  statusCounts,
  visibleColumns,
  t,
  onFiltersChange,
  onViewMovements,
  onNewMovement,
}: {
  filters: InventoryFiltersState;
  filteredItems: InventoryStockItem[];
  locations: InventoryLocation[];
  metrics: InventoryMetrics;
  movements: InventoryMovement[];
  statusCounts: Record<InventoryStatus, number>;
  visibleColumns: InventoryColumnId[];
  t: InventoryTranslations;
  onFiltersChange: (filters: InventoryFiltersState) => void;
  onViewMovements: (item: InventoryStockItem) => void;
  onNewMovement: (item?: InventoryStockItem, movementType?: 'stockIn' | 'stockOut' | 'adjustment' | 'transfer') => void;
}) {
  return (
    <section className="space-y-5">
      <InventoryFilters filters={filters} locations={locations} t={t} onFiltersChange={onFiltersChange} />
      <InventoryKpiStrip metrics={metrics} t={t} />
      <InventoryStatusBar counts={statusCounts} total={filteredItems.length} t={t} />
      <InventoryInsightBar metrics={metrics} t={t} />
      <InventoryHealthPanel items={filteredItems} movements={movements} t={t} />
      <InventoryTable
        items={filteredItems}
        visibleColumns={visibleColumns}
        t={t}
        onViewMovements={onViewMovements}
        onNewMovement={onNewMovement}
      />
    </section>
  );
}
