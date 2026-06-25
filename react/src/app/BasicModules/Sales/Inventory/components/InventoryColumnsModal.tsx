import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../../components/rh/ColumnasConfigModal';
import type { InventoryOperationalColumnId } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

const protectedColumns: InventoryOperationalColumnId[] = ['selection', 'photo', 'product', 'actions'];
const configurableColumns: InventoryOperationalColumnId[] = [
  'sku',
  'category',
  'type',
  'totalStock',
  'available',
  'reserved',
  'minimum',
  'status',
  'warehouseDistribution',
  'estimatedValue',
  'lastMovement',
];

function columnLabel(column: InventoryOperationalColumnId, t: InventoryTranslations) {
  if (column === 'selection') return 'Selection';
  if (column === 'photo') return 'Photo';
  if (column === 'actions') return t.operational.columns.actions;
  return t.operational.columns[column];
}

function buildColumnConfig(
  column: InventoryOperationalColumnId,
  t: InventoryTranslations,
  visible: boolean,
  locked = false,
): ColumnConfig {
  const label = columnLabel(column, t);

  return {
    id: column,
    label,
    description: label,
    locked,
    visible,
  };
}

export function InventoryColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: InventoryOperationalColumnId[];
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: InventoryOperationalColumnId[]) => void;
}) {
  const handleSave = (columns: ColumnConfig[]) => {
    const configurableVisibleColumns = columns
      .filter((column) => column.visible)
      .map((column) => column.id as InventoryOperationalColumnId);

    onVisibleColumnsChange([...protectedColumns, ...configurableVisibleColumns]);
  };

  return (
    <ColumnasConfigModal
      isOpen={open}
      columns={configurableColumns.map((column) => (
        buildColumnConfig(column, t, visibleColumns.includes(column))
      ))}
      defaultColumns={configurableColumns.map((column) => (
        buildColumnConfig(column, t, true)
      ))}
      fixedColumns={protectedColumns.map((column) => buildColumnConfig(column, t, true, true))}
      theme="sales"
      onClose={() => onOpenChange(false)}
      onSave={handleSave}
    />
  );
}
