import { ColumnasConfigModal, type ColumnConfig } from "../../components/rh/ColumnasConfigModal";
import type { CustomerTableCopy } from "./customerTableCopy";
import {
  defaultCustomerTableColumnIds,
  getCustomerTableColumnLabels,
  normalizeCustomerTableColumnIds,
  type CustomerTableColumnId,
} from "./customerTableColumns";

export function CustomerColumnsModal({
  copy,
  isOpen,
  onClose,
  onVisibleColumnsChange,
  visibleColumns,
}: {
  copy: CustomerTableCopy;
  isOpen: boolean;
  onClose: () => void;
  onVisibleColumnsChange: (columns: CustomerTableColumnId[]) => void;
  visibleColumns: CustomerTableColumnId[];
}) {
  const labels = getCustomerTableColumnLabels(copy);
  const orderedColumnIds = [
    ...visibleColumns,
    ...defaultCustomerTableColumnIds.filter((columnId) => !visibleColumns.includes(columnId)),
  ];
  const columns: ColumnConfig[] = orderedColumnIds.map((columnId) => ({
    id: columnId,
    label: labels[columnId],
    locked: columnId === "customer",
    visible: visibleColumns.includes(columnId),
  }));
  const defaultColumns: ColumnConfig[] = defaultCustomerTableColumnIds.map((columnId) => ({
    id: columnId,
    label: labels[columnId],
    locked: columnId === "customer",
    visible: true,
  }));

  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={columns}
      defaultColumns={defaultColumns}
      onSave={(nextColumns) =>
        onVisibleColumnsChange(normalizeCustomerTableColumnIds(
          nextColumns.filter((column) => column.visible).map((column) => column.id),
        ))
      }
      theme="platformAdmin"
    />
  );
}
