import { ColumnasConfigModal, type ColumnConfig as SystemColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { ProviderColumnConfig } from '../providerTableConfig';
import type { ProviderModalVariant } from './providerModalTheme';

type ProviderColumnsModalProps = {
  columns: ProviderColumnConfig[];
  defaultColumns: ProviderColumnConfig[];
  onClose: () => void;
  onSave: (columns: ProviderColumnConfig[]) => void;
  variant?: ProviderModalVariant;
};

export function ProviderColumnsModal({ columns, defaultColumns, onClose, onSave, variant = 'finance' }: ProviderColumnsModalProps) {
  return (
    <ColumnasConfigModal
      isOpen
      columns={toSystemColumns(columns)}
      defaultColumns={toSystemColumns(defaultColumns)}
      onClose={onClose}
      onSave={(nextColumns) => onSave(fromSystemColumns(nextColumns, columns))}
      theme={variant === 'sales' ? 'sales' : 'expenses'}
    />
  );
}

function toSystemColumns(columns: ProviderColumnConfig[]): SystemColumnConfig[] {
  return columns.map(column => ({
    id: column.key,
    label: column.label,
    description: column.description,
    locked: column.fixed,
    visible: column.visible,
  }));
}

function fromSystemColumns(columns: SystemColumnConfig[], previous: ProviderColumnConfig[]): ProviderColumnConfig[] {
  const previousByKey = new Map(previous.map(column => [column.key, column]));
  return columns.flatMap(column => {
    const key = column.id as ProviderColumnConfig['key'];
    const previousColumn = previousByKey.get(key);
    return previousColumn ? [{ ...previousColumn, visible: column.visible }] : [];
  });
}
