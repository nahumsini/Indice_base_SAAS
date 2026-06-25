import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../../components/rh/ColumnasConfigModal';
import type { ProductsTranslations } from '../translations';

export type ProductTableColumnId =
  | 'sku'
  | 'category'
  | 'type'
  | 'price'
  | 'cost'
  | 'profit'
  | 'status'
  | 'visibility'
  | 'availableIn'
  | 'lastUpdated';

type ProductFixedColumnId = 'selection' | 'cover' | 'item' | 'actions';

type ProductColumnConfig = {
  id: ProductTableColumnId;
  defaultVisible: boolean;
};

const productColumnConfigs: ProductColumnConfig[] = [
  { id: 'sku', defaultVisible: false },
  { id: 'category', defaultVisible: true },
  { id: 'type', defaultVisible: false },
  { id: 'price', defaultVisible: true },
  { id: 'cost', defaultVisible: true },
  { id: 'profit', defaultVisible: true },
  { id: 'status', defaultVisible: true },
  { id: 'visibility', defaultVisible: true },
  { id: 'availableIn', defaultVisible: true },
  { id: 'lastUpdated', defaultVisible: true },
];

const fixedColumnIds: ProductFixedColumnId[] = ['selection', 'cover', 'item', 'actions'];

export const defaultProductTableVisibleColumns = productColumnConfigs
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

function toConfigurableColumns(
  visibleColumns: ProductTableColumnId[],
  t: ProductsTranslations,
): ColumnConfig[] {
  return productColumnConfigs.map((column) => {
    const copy = t.columnsModal.columns[column.id];

    return {
      id: column.id,
      label: copy.label,
      description: copy.description,
      visible: visibleColumns.includes(column.id),
    };
  });
}

function toDefaultColumns(t: ProductsTranslations): ColumnConfig[] {
  return productColumnConfigs.map((column) => {
    const copy = t.columnsModal.columns[column.id];

    return {
      id: column.id,
      label: copy.label,
      description: copy.description,
      visible: column.defaultVisible,
    };
  });
}

function toFixedColumns(t: ProductsTranslations): ColumnConfig[] {
  return fixedColumnIds.map((columnId) => {
    const copy = t.columnsModal.fixedColumns[columnId];

    return {
      id: columnId,
      label: copy.label,
      description: copy.description,
      locked: true,
      visible: true,
    };
  });
}

export function ProductsColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: ProductTableColumnId[];
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: ProductTableColumnId[]) => void;
}) {
  const handleSave = (columns: ColumnConfig[]) => {
    onVisibleColumnsChange(
      columns
        .filter((column) => column.visible)
        .map((column) => column.id as ProductTableColumnId),
    );
  };

  return (
    <ColumnasConfigModal
      isOpen={open}
      columns={toConfigurableColumns(visibleColumns, t)}
      defaultColumns={toDefaultColumns(t)}
      fixedColumns={toFixedColumns(t)}
      theme="sales"
      onClose={() => onOpenChange(false)}
      onSave={handleSave}
    />
  );
}
