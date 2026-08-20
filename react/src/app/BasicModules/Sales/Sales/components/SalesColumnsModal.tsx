import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../../components/rh/ColumnasConfigModal';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesColumnId } from '../types/salesTypes';
import { defaultVisibleSalesColumns, salesColumnConfigs } from '../utils/salesStatuses';

function toColumnConfigs(
  visibleColumns: SalesColumnId[],
  t: SalesRecordsTranslations,
): ColumnConfig[] {
  return salesColumnConfigs
    .filter((column) => !column.locked)
    .map((column) => ({
      id: column.id,
      label: t.table.columns[column.id],
      description: t.table.columns[column.id],
      visible: visibleColumns.includes(column.id),
    }));
}

function toDefaultColumnConfigs(t: SalesRecordsTranslations): ColumnConfig[] {
  return salesColumnConfigs
    .filter((column) => !column.locked)
    .map((column) => ({
      id: column.id,
      label: t.table.columns[column.id],
      description: t.table.columns[column.id],
      visible: defaultVisibleSalesColumns.includes(column.id),
    }));
}

function toFixedColumnConfigs(t: SalesRecordsTranslations): ColumnConfig[] {
  return salesColumnConfigs
    .filter((column) => column.locked)
    .map((column) => ({
      id: column.id,
      label: t.table.columns[column.id],
      description: t.table.columns[column.id],
      locked: true,
      visible: true,
    }));
}

export function SalesColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: SalesColumnId[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: SalesColumnId[]) => void;
}) {
  const handleSave = (columns: ColumnConfig[]) => {
    const selectedConfigurableColumns = new Set(columns
      .filter((column) => column.visible)
      .map((column) => column.id as SalesColumnId));

    onVisibleColumnsChange(salesColumnConfigs
      .filter((column) => column.locked || selectedConfigurableColumns.has(column.id))
      .map((column) => column.id));
  };

  return (
    <ColumnasConfigModal
      isOpen={open}
      columns={toColumnConfigs(visibleColumns, t)}
      defaultColumns={toDefaultColumnConfigs(t)}
      fixedColumns={toFixedColumnConfigs(t)}
      theme="sales"
      onClose={() => onOpenChange(false)}
      onSave={handleSave}
    />
  );
}
