import { ExternalLink, FileText, Loader2, Paperclip } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
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
    <IndiceModalFrame
      closeLabel={closeLabel}
      contentClassName="sm:max-w-lg"
      description={receipt?.description ?? description}
      footer={(
        <button className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-[#147514] transition hover:bg-emerald-50" onClick={onClose} type="button">
          {closeLabel}
        </button>
      )}
      footerSummary={`${attachments.length} ${title.toLocaleLowerCase(locale)}`}
      icon={<Paperclip className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(receipt)}
      title={title}
      tone="green"
    >
      <div className="space-y-3">
          {isLoading ? (
            <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#147514]" /></div>
          ) : errorMessage ? (
            <IndiceModalValidation messages={[errorMessage]} tone="error" />
          ) : attachments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <Paperclip className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{emptyLabel}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {attachments.map(attachment => (
                <article key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514] dark:bg-emerald-500/10 dark:text-emerald-300"><FileText className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{attachment.original_filename}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatFileSize(attachment.size_bytes)}
                      {attachment.uploaded_by_name ? ` · ${uploadedByLabel}: ${attachment.uploaded_by_name}` : ''}
                      {attachment.created_at ? ` · ${formatCreatedAt(attachment.created_at, locale)}` : ''}
                    </p>
                  </div>
                  {attachment.download_url ? (
                    <a aria-label={`${openFileLabel}: ${attachment.original_filename}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#147514] px-3 text-xs font-semibold text-white transition hover:bg-[#0f5f0f]" href={attachment.download_url} rel="noreferrer" target="_blank"><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">{openFileLabel}</span></a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
      </div>
    </IndiceModalFrame>
  );
}
