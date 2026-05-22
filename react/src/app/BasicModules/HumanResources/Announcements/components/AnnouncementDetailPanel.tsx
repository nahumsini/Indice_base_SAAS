import { Paperclip, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AnnouncementView } from '../announcementTypes';

interface AnnouncementDetailPanelProps {
  announcement: AnnouncementView | null;
  canManage: boolean;
  isBusy: boolean;
  onClose: () => void;
  onDeleteAttachment: (attachmentId: number) => void;
  onMarkRead: (announcement: AnnouncementView) => void;
  onUploadAttachment: (file: File) => void;
}

export function AnnouncementDetailPanel({
  announcement,
  canManage,
  isBusy,
  onClose,
  onDeleteAttachment,
  onMarkRead,
  onUploadAttachment,
}: AnnouncementDetailPanelProps) {
  if (!announcement) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">
              Announcement details
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{announcement.title}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{announcement.audienceSummary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info label="Status" value={announcement.status} />
          <Info label="Read" value={announcement.readSummary} />
          <Info label="Publication" value={`${announcement.publicationDate} ${announcement.publicationTime}`} />
          <Info label="Author" value={announcement.authorName} />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{announcement.content}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!announcement.isRead ? (
            <Button disabled={isBusy} onClick={() => onMarkRead(announcement)}>Mark as read</Button>
          ) : null}
          {canManage ? (
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-[#59C3A5] hover:bg-slate-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800">
              Upload attachment
              <input
                type="file"
                className="hidden"
                disabled={isBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadAttachment(file);
                    event.currentTarget.value = '';
                  }
                }}
              />
            </label>
          ) : null}
        </div>

        <div className="mt-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Paperclip className="h-4 w-4" />
            Attachments ({announcement.attachmentCount})
          </h4>
          <div className="mt-3 space-y-2">
            {announcement.attachments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No attachments.</p>
            ) : announcement.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <a href={attachment.download_url ?? undefined} target="_blank" rel="noreferrer" className="truncate text-[#59C3A5] dark:text-blue-300">
                  {attachment.original_filename}
                </a>
                {canManage ? (
                  <button type="button" disabled={isBusy} onClick={() => onDeleteAttachment(attachment.id)} className="text-rose-600 disabled:opacity-50">
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
