import { MailOpen, Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AnnouncementsTranslations } from '../translations';

interface AnnouncementBulkActionsBarProps {
  copy: AnnouncementsTranslations['bulk'];
  canDelete: boolean;
  readCount: number;
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onMarkUnread: () => void;
}

export function AnnouncementBulkActionsBar({
  copy,
  canDelete,
  readCount,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onMarkUnread,
}: AnnouncementBulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mb-5 rounded-xl border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-3 shadow-sm dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm font-medium text-[#16866f] shadow-sm dark:bg-slate-800 dark:text-blue-200">
            {copy.selectedBadge(selectedCount)}
          </span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {copy.label}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {readCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-center gap-2 rounded-lg border-[#59C3A5]/25 bg-white text-sm font-medium text-[#16866f] hover:bg-[#59C3A5] hover:text-slate-950 dark:border-blue-400/30 dark:bg-slate-800 dark:text-blue-200"
              onClick={onMarkUnread}
            >
              <MailOpen className="h-4 w-4" />
              {copy.markUnread}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-center gap-2 rounded-lg border-rose-200 bg-white text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
              onClick={onDeleteSelected}
            >
              <Trash2 className="h-4 w-4" />
              {copy.deleteSelected}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-center gap-2 rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
            {copy.clearSelection}
          </Button>
        </div>
      </div>
    </div>
  );
}
