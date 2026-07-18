import { ColumnasConfigModal, type ColumnConfig as SystemColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { PaymentColumnConfig } from '../paymentAccountsTableConfig';

type PaymentAccountColumnsModalProps = {
  columns: PaymentColumnConfig[];
  defaultColumns: PaymentColumnConfig[];
  onClose: () => void;
  onSave: (columns: PaymentColumnConfig[]) => void;
};

export function PaymentAccountColumnsModal({ columns, defaultColumns, onClose, onSave }: PaymentAccountColumnsModalProps) {
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

function toSystemColumns(columns: PaymentColumnConfig[]): SystemColumnConfig[] {
  return columns.map(column => ({
    id: column.key,
    label: column.label,
    description: column.description,
    locked: column.fixed,
    visible: column.visible,
  }));
}

function fromSystemColumns(columns: SystemColumnConfig[], previous: PaymentColumnConfig[]): PaymentColumnConfig[] {
  const previousByKey = new Map(previous.map(column => [column.key, column]));
  return columns.flatMap(column => {
    const key = column.id as PaymentColumnConfig['key'];
    const previousColumn = previousByKey.get(key);
    return previousColumn ? [{ ...previousColumn, visible: column.visible }] : [];
  });
}
