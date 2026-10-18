import { Columns3 } from 'lucide-react';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import type { IncentivesTranslations } from '../translations';

export interface IncentiveColumn {
  id: string;
  label: string;
  locked?: boolean;
}

interface IncentiveColumnsModalProps {
  columns: IncentiveColumn[];
  copy: IncentivesTranslations['columnsModal'];
  isOpen: boolean;
  visibleColumns: string[];
  onClose: () => void;
  onToggleColumn: (columnId: string) => void;
}

export function IncentiveColumnsModal({
  columns,
  copy,
  isOpen,
  visibleColumns,
  onClose,
  onToggleColumn,
}: IncentiveColumnsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={copy.title}
      description={copy.subtitle}
      closeLabel={copy.close}
      icon={<Columns3 className="size-5" />}
      tone="aqua"
      contentClassName="sm:max-w-xl"
      footer={<Button type="button" onClick={onClose}>{copy.done}</Button>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {columns.map((column) => (
          <label
            key={column.id}
            className={`flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm ${
              column.locked
                ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60'
                : 'cursor-pointer border-slate-200 bg-white text-slate-800 hover:border-[#59C3A5]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
            }`}
          >
            <input
              type="checkbox"
              checked={visibleColumns.includes(column.id)}
              disabled={column.locked}
              onChange={() => onToggleColumn(column.id)}
              className="h-4 w-4 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5]"
            />
            <span className="font-medium">{column.label}</span>
            {column.locked ? <span className="ml-auto text-xs">{copy.required}</span> : null}
          </label>
        ))}
      </div>
    </IndiceModalFrame>
  );
}
