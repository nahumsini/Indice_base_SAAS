import type { ColumnConfig } from '../../../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../../../components/rh/ColumnasConfigModal';
import type { InventoryTranslations } from '../../translations';

export type WarehouseTableColumnId =
  | 'businessUnit'
  | 'responsible'
  | 'storedItems'
  | 'totalUnits'
  | 'estimatedValue'
  | 'status';

const warehouseColumnIds: WarehouseTableColumnId[] = [
  'businessUnit',
  'responsible',
  'storedItems',
  'totalUnits',
  'estimatedValue',
  'status',
];

export const defaultWarehouseTableVisibleColumns = [...warehouseColumnIds];

function toColumns(visibleColumns: WarehouseTableColumnId[], t: InventoryTranslations): ColumnConfig[] {
  return warehouseColumnIds.map((id) => ({
    id,
    label: t.operational.columns[id],
    visible: visibleColumns.includes(id),
  }));
}

export function WarehouseColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: WarehouseTableColumnId[];
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: WarehouseTableColumnId[]) => void;
}) {
  const defaultColumns = toColumns(defaultWarehouseTableVisibleColumns, t);

  return (
    <ColumnasConfigModal
      isOpen={open}
      columns={toColumns(visibleColumns, t)}
      defaultColumns={defaultColumns}
      fixedColumns={[
        { id: 'warehouse', label: t.operational.columns.warehouse, visible: true, locked: true },
        { id: 'actions', label: t.operational.columns.actions, visible: true, locked: true },
      ]}
      theme="sales"
      onClose={() => onOpenChange(false)}
      onSave={(columns) => onVisibleColumnsChange(columns
        .filter((column) => column.visible)
        .map((column) => column.id as WarehouseTableColumnId))}
    />
  );
}
