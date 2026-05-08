import { Columns3, Plus } from 'lucide-react';

interface PermissionHeaderBarProps {
  onColumns: () => void;
  onCreate: () => void;
}

export function PermissionHeaderBar({ onColumns, onCreate }: PermissionHeaderBarProps) {
  return (
    <div className="rounded-lg border border-[#143675]/20 bg-[#143675]/10 p-6 shadow-sm dark:border-[#4a7bc8]/30 dark:bg-[#143675]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
            <span className="text-2xl">✅</span>
            Permissions
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Manage requests, absences, vacations, and approval status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onColumns}
            className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white px-4 py-3 text-sm font-semibold text-[#143675] shadow-sm transition hover:border-[#143675]/30 hover:bg-[#143675]/5 dark:border-white/10 dark:bg-white/95 dark:text-[#143675]"
          >
            <Columns3 className="h-4 w-4" />
            Columns
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#143675] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2855]"
          >
            <Plus className="h-4 w-4" />
            Add request
          </button>
        </div>
      </div>
    </div>
  );
}
