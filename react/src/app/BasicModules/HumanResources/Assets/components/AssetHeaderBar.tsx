import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AssetHeaderCopy } from '../translations';

interface AssetHeaderBarProps {
  canManage: boolean;
  copy: AssetHeaderCopy;
  onAdd: () => void;
  onColumns: () => void;
}

export function AssetHeaderBar({
  canManage,
  copy,
  onAdd,
  onColumns,
}: AssetHeaderBarProps) {
  return (
    <div className="mb-5 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/10 p-6 shadow-sm dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15">
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
          <Button
            variant="outline"
            onClick={onColumns}
            className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 text-[#59C3A5] shadow-none hover:bg-[#59C3A5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <Columns3 className="h-4 w-4" />
            {copy.columnPicker.button}
          </Button>
          {canManage ? (
            <Button
              onClick={onAdd}
              className="h-11 gap-2 rounded-xl bg-[#59C3A5] px-4 text-white shadow-none hover:bg-[#3AAE90]"
            >
              <Plus className="h-4 w-4" />
              {copy.newAsset}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
