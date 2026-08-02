import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[#59C3A5]/30 bg-white shadow-2xl dark:border-[#59C3A5]/25 dark:bg-slate-900">
        <header className="flex items-center justify-between bg-[#59C3A5] px-6 py-4 text-slate-950">
          <div>
            <h2 className="text-lg font-medium">{copy.title}</h2>
            <p className="text-sm text-blue-100">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
            aria-label={copy.close}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {columns.map((column) => (
              <label
                key={column.id}
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
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
        </div>

        <footer className="flex justify-end bg-[#59C3A5] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-[#59C3A5] transition hover:bg-blue-50"
          >
            {copy.done}
          </button>
        </footer>
      </div>
    </div>
  );
}
