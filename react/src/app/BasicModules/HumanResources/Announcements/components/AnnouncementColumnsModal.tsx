import { Columns3, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AnnouncementColumnsModalCopy } from '../translations';

export interface AnnouncementColumn {
  id: string;
  label: string;
  locked?: boolean;
}

interface AnnouncementColumnsModalProps {
  columns: AnnouncementColumn[];
  copy: AnnouncementColumnsModalCopy;
  isOpen: boolean;
  visibleColumns: string[];
  onClose: () => void;
  onToggleColumn: (columnId: string) => void;
}

export function AnnouncementColumnsModal({
  columns,
  copy,
  isOpen,
  visibleColumns,
  onClose,
  onToggleColumn,
}: AnnouncementColumnsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#143675]/20 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        <div className="flex items-start justify-between gap-4 bg-[#143675] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <Columns3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-7 text-white">{copy.title}</h2>
              <p className="mt-1 text-sm leading-5 text-blue-100">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label={copy.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {columns.map((column) => (
              <label
                key={column.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  visibleColumns.includes(column.id)
                    ? 'border-[#143675] bg-[#143675]/5 text-[#143675] dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#143675]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <span className="font-medium">{column.label}</span>
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.id)}
                  disabled={column.locked}
                  onChange={() => onToggleColumn(column.id)}
                  className="h-4 w-4 rounded border-slate-300 text-[#143675] focus:ring-[#143675]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 bg-[#143675] px-6 py-4">
          <Button className="rounded-xl bg-white text-[#143675] hover:bg-blue-50" onClick={onClose}>
            {copy.done}
          </Button>
        </div>
      </div>
    </div>
  );
}
