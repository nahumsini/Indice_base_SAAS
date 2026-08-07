import { Eye, Paperclip, Trash2 } from 'lucide-react';
import type { PublicPettyCashReceipt } from '../pettyCashKioskApi';

interface PettyCashKioskExpenseCardProps {
  amount: string;
  attachmentsLabel: string;
  date: string;
  deleteLabel: string;
  noReferenceLabel: string;
  onDelete: () => void;
  onViewAttachments: () => void;
  receipt: PublicPettyCashReceipt;
  referenceLabel: string;
  statusLabel: string;
  statusTitle: string;
}

export function PettyCashKioskExpenseCard({
  amount,
  attachmentsLabel,
  date,
  deleteLabel,
  noReferenceLabel,
  onDelete,
  onViewAttachments,
  receipt,
  referenceLabel,
  statusLabel,
  statusTitle,
}: PettyCashKioskExpenseCardProps) {
  const canDelete = receipt.can_delete
    ?? (receipt.status === 'DRAFT' || receipt.status === 'RECEIPT_ATTACHED');

  return (
    <article className="w-full rounded-2xl border border-[#147514]/20 bg-white p-3 shadow-[0_12px_28px_-28px_rgba(15,23,42,0.9)] dark:border-emerald-400/20 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#147514]/75 dark:text-emerald-300/75">{date}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-950 dark:text-white">{receipt.description}</h3>
        </div>
        <p className="shrink-0 text-sm font-medium text-rose-600 dark:text-rose-300">{amount}</p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-400">{referenceLabel}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{receipt.receipt_reference || noReferenceLabel}</p>
        </div>
        <div className="min-w-0 rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-400">{statusTitle}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-[#147514] dark:text-emerald-300">{statusLabel}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700">
        <button
          className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-[#147514]/30 hover:text-[#147514] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          onClick={onViewAttachments}
          type="button"
        >
          {receipt.attachment_count > 0 ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{attachmentsLabel}</span>
        </button>
        <button
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10 dark:disabled:border-slate-700 dark:disabled:text-slate-500"
          disabled={!canDelete}
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleteLabel}
        </button>
      </div>
    </article>
  );
}
