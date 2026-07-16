import { ExternalLink, FileText, Loader2, Paperclip, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import type { PublicPettyCashAttachment, PublicPettyCashReceipt } from '../pettyCashKioskApi';

interface PettyCashKioskAttachmentsModalProps {
  attachments: PublicPettyCashAttachment[];
  closeLabel: string;
  description: string;
  emptyLabel: string;
  errorMessage: string;
  isLoading: boolean;
  locale: string;
  onClose: () => void;
  openFileLabel: string;
  receipt: PublicPettyCashReceipt | null;
  title: string;
  uploadedByLabel: string;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCreatedAt(value: string | null | undefined, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function PettyCashKioskAttachmentsModal({
  attachments,
  closeLabel,
  description,
  emptyLabel,
  errorMessage,
  isLoading,
  locale,
  onClose,
  openFileLabel,
  receipt,
  title,
  uploadedByLabel,
}: PettyCashKioskAttachmentsModalProps) {
  return (
    <Dialog open={Boolean(receipt)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="z-[100] w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-[24px] border border-[#147514]/25 bg-white p-0 shadow-2xl dark:border-emerald-500/25 dark:bg-slate-950"
        hideCloseButton
      >
        <div className="bg-[#147514] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><Paperclip className="h-5 w-5" /></span>
              <DialogHeader className="min-w-0 gap-1 text-left">
                <DialogTitle className="text-lg font-black text-white">{title}</DialogTitle>
                <DialogDescription className="line-clamp-2 text-xs font-semibold text-white/75">{receipt?.description ?? description}</DialogDescription>
              </DialogHeader>
            </div>
            <button aria-label={closeLabel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#147514]" /></div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{errorMessage}</div>
          ) : attachments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <Paperclip className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{emptyLabel}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {attachments.map(attachment => (
                <article key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300"><FileText className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">{attachment.original_filename}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatFileSize(attachment.size_bytes)}
                      {attachment.uploaded_by_name ? ` · ${uploadedByLabel}: ${attachment.uploaded_by_name}` : ''}
                      {attachment.created_at ? ` · ${formatCreatedAt(attachment.created_at, locale)}` : ''}
                    </p>
                  </div>
                  {attachment.download_url ? (
                    <a aria-label={`${openFileLabel}: ${attachment.original_filename}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#147514] px-3 text-xs font-black text-white transition hover:bg-[#0f5f0f]" href={attachment.download_url} rel="noreferrer" target="_blank"><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">{openFileLabel}</span></a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end bg-[#147514] px-5 py-3">
          <button className="h-10 rounded-xl bg-white px-4 text-sm font-black text-[#147514] transition hover:bg-emerald-50" onClick={onClose} type="button">{closeLabel}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
