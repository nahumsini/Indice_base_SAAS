import {
  ColumnasConfigModal,
  type ColumnConfig,
} from '../../../../components/rh/ColumnasConfigModal';
import type { PermissionColumnId } from './PermissionsTable';

export type PermissionColumn = ColumnConfig & {
  id: PermissionColumnId;
};

interface PermissionColumnsModalProps {
  columns: PermissionColumn[];
  isOpen: boolean;
  onApplyColumns: (columns: PermissionColumn[]) => void;
  onClose: () => void;
}

export function PermissionColumnsModal({
  columns,
  isOpen,
  onApplyColumns,
  onClose,
}: PermissionColumnsModalProps) {
  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={columns}
      defaultColumns={columns}
      onSave={(nextColumns) => onApplyColumns(nextColumns as PermissionColumn[])}
      theme="humanResources"
    />
  );
}
