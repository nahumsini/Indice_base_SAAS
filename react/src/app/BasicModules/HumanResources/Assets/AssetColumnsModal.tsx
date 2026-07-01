import {
  ColumnasConfigModal,
  type ColumnConfig,
} from '../../../components/rh/ColumnasConfigModal';
import type { AssetColumnPickerCopy } from './translations';

export type AssetColumnConfig = ColumnConfig;

interface AssetColumnsModalProps {
  copy: AssetColumnPickerCopy;
  isOpen: boolean;
  onClose: () => void;
  columns: AssetColumnConfig[];
  onApply: (columns: AssetColumnConfig[]) => void;
}

export function AssetColumnsModal({
  isOpen,
  onClose,
  columns,
  onApply,
}: AssetColumnsModalProps) {
  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={columns}
      defaultColumns={columns}
      onSave={(nextColumns) => onApply(nextColumns as AssetColumnConfig[])}
      theme="humanResources"
    />
  );
}
