import { Columns3, Download, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AnnouncementHeaderCopy } from '../translations';

interface AnnouncementHeaderBarProps {
  copy: AnnouncementHeaderCopy;
  onAdd: () => void;
  onColumns: () => void;
  onExport: () => void;
}

export function AnnouncementHeaderBar({
  copy,
  onAdd,
  onColumns,
  onExport,
}: AnnouncementHeaderBarProps) {
  return (
    <div className="mb-6 rounded-xl border border-[#143675]/20 bg-[#143675]/10 px-6 py-5 shadow-sm dark:border-blue-400/20 dark:bg-blue-400/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            <span className="text-2xl">📢</span>
            {copy.pageTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {copy.pageSubtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#143675] shadow-none hover:bg-[#143675] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
            {copy.export}
          </Button>
          <Button
            variant="outline"
            className="h-11 justify-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#143675] shadow-none hover:bg-[#143675] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onClick={onColumns}
          >
            <Columns3 className="h-4 w-4" />
            {copy.columns}
          </Button>
          <Button
            className="h-11 justify-center gap-2 rounded-xl bg-[#143675] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0f2855]"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
            {copy.addAnnouncement}
          </Button>
        </div>
      </div>
    </div>
  );
}
