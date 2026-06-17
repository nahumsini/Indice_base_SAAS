import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { ColumnasConfigModal } from '../../../../components/rh/ColumnasConfigModal';
import type { ProspectosCopy } from '../translations';
import type { OpportunityColumnId } from '../types/prospectosTypes';
import { defaultOpportunityColumns } from '../utils/prospectosStatus';

function localizeColumns(columns: ColumnConfig[], copy: ProspectosCopy) {
  return columns.map((column) => {
    const columnCopy = copy.columns[column.id as OpportunityColumnId];
    return columnCopy
      ? { ...column, label: columnCopy.label, description: columnCopy.description }
      : column;
  });
}

export function ProspectosColumnsModal({
  copy,
  isOpen,
  columns,
  onClose,
  onSave,
}: {
  copy: ProspectosCopy;
  isOpen: boolean;
  columns: ColumnConfig[];
  onClose: () => void;
  onSave: (columns: ColumnConfig[]) => void;
}) {
  return (
    <ColumnasConfigModal
      isOpen={isOpen}
      onClose={onClose}
      columns={localizeColumns(columns, copy)}
      defaultColumns={localizeColumns(defaultOpportunityColumns, copy)}
      fixedColumns={[
        {
          id: 'actions',
          label: copy.table.actions,
          visible: true,
          locked: true,
          description: copy.columnsModal.actionsDescription,
        },
      ]}
      theme="sales"
      onSave={onSave}
    />
  );
}
