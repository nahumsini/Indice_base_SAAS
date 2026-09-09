import { useLanguage } from "../../shared/context";
import { ColumnasConfigModal, type ColumnConfig } from "../../components/rh/ColumnasConfigModal";
import {
  defaultModuleAvailabilityColumnIds,
  moduleAvailabilityColumnLabels,
  normalizeModuleAvailabilityColumnIds,
  type ModuleAvailabilityColumnId,
} from "./moduleAvailabilityModel";

export function ModuleColumnsModal({
  english,
  isOpen,
  onClose,
  onVisibleColumnsChange,
  visibleColumns,
}: {
  english: boolean;
  isOpen: boolean;
  onClose: () => void;
  onVisibleColumnsChange: (columns: ModuleAvailabilityColumnId[]) => void;
  visibleColumns: ModuleAvailabilityColumnId[];
}) {
  const { currentLanguage } = useLanguage();
  const labels = moduleAvailabilityColumnLabels(currentLanguage.code);
  const orderedIds = [
    ...visibleColumns,
    ...defaultModuleAvailabilityColumnIds.filter((columnId) => !visibleColumns.includes(columnId)),
  ];
  const columns: ColumnConfig[] = orderedIds.map((columnId) => ({
    id: columnId,
    label: labels[columnId],
    locked: columnId === "module",
    visible: visibleColumns.includes(columnId),
  }));
  const defaultColumns: ColumnConfig[] = defaultModuleAvailabilityColumnIds.map((columnId) => ({
    id: columnId,
    label: labels[columnId],
    locked: columnId === "module",
    visible: true,
  }));

  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={columns}
      defaultColumns={defaultColumns}
      onSave={(nextColumns) => onVisibleColumnsChange(normalizeModuleAvailabilityColumnIds(
        nextColumns.filter((column) => column.visible).map((column) => column.id),
      ))}
      theme="platformAdmin"
    />
  );
}

