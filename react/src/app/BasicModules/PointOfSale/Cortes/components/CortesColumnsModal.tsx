import {
  ColumnasConfigModal,
  type ColumnConfig,
} from '../../../../components/rh/ColumnasConfigModal';
import type { CortesCopy } from '../cortesTranslations';
import { defaultCortesColumns, type CortesColumnId } from '../utils/cortesColumns';

interface CortesColumnsModalProps {
  copy: CortesCopy;
  open: boolean;
  visibleColumns: CortesColumnId[];
  onClose: () => void;
  onVisibleColumnsChange: (columns: CortesColumnId[]) => void;
}

type CortesColumnConfig = ColumnConfig & {
  id: CortesColumnId;
};

function buildColumnConfig(
  copy: CortesCopy,
  orderedColumns: CortesColumnId[],
  visibleColumns: CortesColumnId[],
): CortesColumnConfig[] {
  return orderedColumns.map((id) => ({
    id,
    label: copy.table.columns[id],
    description: copy.columnsModal.descriptions[id],
    visible: visibleColumns.includes(id),
  }));
}

export function CortesColumnsModal({
  copy,
  open,
  visibleColumns,
  onClose,
  onVisibleColumnsChange,
}: CortesColumnsModalProps) {
  const orderedColumns = [
    ...visibleColumns,
    ...defaultCortesColumns.filter((id) => !visibleColumns.includes(id)),
  ];
  const columns = buildColumnConfig(copy, orderedColumns, visibleColumns);
  const defaultColumns = buildColumnConfig(copy, defaultCortesColumns, defaultCortesColumns);

  return (
    <ColumnasConfigModal
      isOpen={open}
      onClose={onClose}
      columns={columns}
      defaultColumns={defaultColumns}
      onSave={(nextColumns) => {
        const nextVisibleColumns = nextColumns
          .filter((column) => column.visible)
          .map((column) => column.id as CortesColumnId);

        onVisibleColumnsChange(
          nextVisibleColumns.length > 0 ? nextVisibleColumns : defaultCortesColumns,
        );
      }}
      theme="pointOfSale"
    />
  );
}
