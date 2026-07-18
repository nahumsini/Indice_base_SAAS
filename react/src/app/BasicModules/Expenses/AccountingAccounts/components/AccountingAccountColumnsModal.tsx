import { ColumnasConfigModal, type ColumnConfig as SystemColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { AccountingColumnConfig } from '../accountingAccountsTableConfig';

type AccountingAccountColumnsModalProps = {
  columns: AccountingColumnConfig[];
  defaultColumns: AccountingColumnConfig[];
  onClose: () => void;
  onSave: (columns: AccountingColumnConfig[]) => void;
};

export function AccountingAccountColumnsModal({ columns, defaultColumns, onClose, onSave }: AccountingAccountColumnsModalProps) {
  return (
    <ColumnasConfigModal
      isOpen
      columns={toSystemColumns(columns)}
      defaultColumns={toSystemColumns(defaultColumns)}
      onClose={onClose}
      onSave={(nextColumns) => onSave(fromSystemColumns(nextColumns, columns))}
      theme="expenses"
    />
  );
}

function toSystemColumns(columns: AccountingColumnConfig[]): SystemColumnConfig[] {
  return columns.map(column => ({
    id: column.key,
    label: column.label,
    description: column.description,
    locked: column.fixed,
    visible: column.visible,
  }));
}

function fromSystemColumns(columns: SystemColumnConfig[], previous: AccountingColumnConfig[]): AccountingColumnConfig[] {
  const previousByKey = new Map(previous.map(column => [column.key, column]));
  return columns.flatMap(column => {
    const key = column.id as AccountingColumnConfig['key'];
    const previousColumn = previousByKey.get(key);
    return previousColumn ? [{ ...previousColumn, visible: column.visible }] : [];
  });
}
