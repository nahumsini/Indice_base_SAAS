import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../../components/rh/ColumnasConfigModal';
import { defaultOpportunityColumns } from '../utils/prospectosStatus';

export function ProspectosColumnsModal({
  isOpen,
  columns,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  columns: ColumnConfig[];
  onClose: () => void;
  onSave: (columns: ColumnConfig[]) => void;
}) {
  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={columns}
      defaultColumns={defaultOpportunityColumns}
      fixedColumns={[
        {
          id: 'actions',
          label: 'Acciones',
          visible: true,
          locked: true,
          description: 'Llamar, WhatsApp, email, archivos, historial y edición.',
        },
      ]}
      theme="processes"
      onSave={onSave}
    />
  );
}

