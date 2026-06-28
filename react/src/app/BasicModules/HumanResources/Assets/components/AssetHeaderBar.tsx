import { Columns3, Plus } from 'lucide-react';
import type { AssetHeaderCopy } from '../translations';

interface AssetHeaderBarProps {
  canManage: boolean;
  copy: AssetHeaderCopy;
  onAdd: () => void;
  onColumns: () => void;
}

export function AssetHeaderBar({ canManage, copy, onAdd, onColumns }: AssetHeaderBarProps) {
  return (
    <div className="mb-5 rounded-2xl border border-[#59C3A5]/20 bg-[#59C3A5]/10 p-6 shadow-sm dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
            <span className="text-2xl">💼</span>
            {copy.title}
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onColumns}
            className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white px-4 py-3 text-sm font-semibold text-[#59C3A5] shadow-sm transition hover:border-[#59C3A5]/30 hover:bg-[#59C3A5]/5 dark:border-white/10 dark:bg-white/95 dark:text-[#59C3A5]"
          >
            <Columns3 className="h-4 w-4" />
            {copy.columnPicker.button}
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-[#59C3A5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3AAE90]"
            >
              <Plus className="h-4 w-4" />
              {copy.newAsset}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
