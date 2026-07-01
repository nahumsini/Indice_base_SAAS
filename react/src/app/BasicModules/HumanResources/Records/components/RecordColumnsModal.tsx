import {
  ColumnasConfigModal,
  type ColumnConfig,
} from '../../../../components/rh/ColumnasConfigModal';
import type { RecordColumnId } from './RecordsList';

export type RecordColumn = ColumnConfig & {
  id: RecordColumnId;
};

interface RecordColumnsModalProps {
  columns: RecordColumn[];
  isOpen: boolean;
  onApplyColumns: (columns: RecordColumn[]) => void;
  onClose: () => void;
}

export function RecordColumnsModal({
  columns,
  isOpen,
  onApplyColumns,
  onClose,
}: RecordColumnsModalProps) {
  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={columns}
      defaultColumns={columns}
      onSave={(nextColumns) => onApplyColumns(nextColumns as RecordColumn[])}
      theme="humanResources"
    />
  );
}
