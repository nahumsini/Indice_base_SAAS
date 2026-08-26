import { Download, FileText } from 'lucide-react';
import type { ExpenseAttachment } from '../../services/expense-attachments.service';

type ExpenseAttachmentLinkProps = {
  file: ExpenseAttachment;
  label: string;
};

export function ExpenseAttachmentLink({ file, label }: ExpenseAttachmentLinkProps) {
  const isImage = file.mimeType.startsWith('image/') && Boolean(file.downloadUrl);

  return (
    <a
      href={file.downloadUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm hover:border-[#147514]/30 dark:border-slate-700 dark:bg-slate-900/60"
    >
      {isImage
        ? <img alt="" src={file.downloadUrl} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        : <FileText className="h-4 w-4 shrink-0 text-[#147514]" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{file.originalFilename}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </span>
      <Download className="h-4 w-4 text-slate-400" />
    </a>
  );
}
