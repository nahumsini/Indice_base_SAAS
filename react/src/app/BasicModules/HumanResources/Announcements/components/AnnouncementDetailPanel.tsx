import { Megaphone, Paperclip, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AnnouncementView } from '../announcementTypes';
import type { AnnouncementDetailCopy } from '../translations';

interface AnnouncementDetailPanelProps {
  announcement: AnnouncementView | null;
  canManage: boolean;
  copy: AnnouncementDetailCopy;
  isBusy: boolean;
  onClose: () => void;
  onDeleteAttachment: (attachmentId: number) => void;
  onMarkRead: (announcement: AnnouncementView) => void;
  onUploadAttachment: (file: File) => void;
}

export function AnnouncementDetailPanel({
  announcement,
  canManage,
  copy,
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
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/55 backdrop-blur-[2px]">
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[#59C3A5]/25 bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5 text-white dark:bg-[#269C82]">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-white/15">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-current/75">{copy.eyebrow}</p>
              <h3 className="mt-0.5 text-xl font-semibold leading-7">{announcement.title}</h3>
              <p className="mt-0.5 text-sm text-current/75">{announcement.audienceSummary}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info label={copy.status} value={announcement.status} />
          <Info label={copy.read} value={announcement.readSummary} />
          <Info label={copy.publication} value={`${announcement.publicationDate} ${announcement.publicationTime}`} />
          <Info label={copy.author} value={announcement.authorName} />
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{announcement.content}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!announcement.isRead ? (
            <Button disabled={isBusy} onClick={() => onMarkRead(announcement)}>{copy.markAsRead}</Button>
          ) : null}
          {canManage ? (
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-[#59C3A5] hover:bg-slate-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800">
              {copy.uploadAttachment}
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
            {copy.attachments(announcement.attachmentCount)}
          </h4>
          <div className="mt-3 space-y-2">
            {announcement.attachments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noAttachments}</p>
            ) : announcement.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <a href={attachment.download_url ?? undefined} target="_blank" rel="noreferrer" className="truncate text-[#59C3A5] dark:text-blue-300">
                  {attachment.original_filename}
                </a>
                {canManage ? (
                  <button type="button" disabled={isBusy} onClick={() => onDeleteAttachment(attachment.id)} className="text-rose-600 disabled:opacity-50">
                    {copy.removeAttachment}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        </div>

        <footer className="flex shrink-0 justify-end bg-[#269C82] px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {copy.close}
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
