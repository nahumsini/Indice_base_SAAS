import { ColumnasConfigModal, type ColumnConfig as SystemColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { DEFAULT_EXPENSE_COLUMNS } from '../../constants/expenseColumns';
import type { ColumnConfig } from '../../types/expenseView.types';

type ColumnConfigurationModalProps = {
  columns: ColumnConfig[];
  defaultColumns?: ColumnConfig[];
  onClose: () => void;
  onSaveColumns: (columns: ColumnConfig[]) => void | Promise<void>;
};

export function ColumnConfigurationModal({
  columns,
  defaultColumns,
  onClose,
  onSaveColumns,
}: ColumnConfigurationModalProps) {
  return (
    <ColumnasConfigModal
      isOpen
      columns={toSystemColumns(columns)}
      defaultColumns={toSystemColumns(defaultColumns ?? DEFAULT_EXPENSE_COLUMNS)}
      onClose={onClose}
      onSave={(nextColumns) => onSaveColumns(fromSystemColumns(nextColumns, columns))}
      theme="expenses"
    />
  );
}

function toSystemColumns(columns: ColumnConfig[]): SystemColumnConfig[] {
  return columns.map(column => ({
    id: column.key,
    label: column.label,
    locked: column.fixed,
    visible: column.visible,
  }));
}

function fromSystemColumns(columns: SystemColumnConfig[], previousColumns: ColumnConfig[]): ColumnConfig[] {
  const previousByKey = new Map(previousColumns.map(column => [column.key, column]));
  return columns.map(column => {
    const previousColumn = previousByKey.get(column.id);
    return {
      key: column.id,
      label: previousColumn?.label ?? column.label,
      visible: column.visible,
      fixed: previousColumn?.fixed ?? column.locked,
    };
  });
}
