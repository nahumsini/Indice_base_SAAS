import {
  Ban,
  CheckCircle2,
  Download,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Printer,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
import type { PayrollRunSummary } from '../../../../api/humanResources';
import type { PayrollRunActionsCopy } from '../translations/types';

type PayrollRunActionsMenuProps = {
  copy: PayrollRunActionsCopy;
  run: PayrollRunSummary;
  isBusy: boolean;
  onOpen: () => void;
  onProcess: () => void;
  onApprove: () => void;
  onMarkPaid: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onCancel: () => void;
};

export function PayrollRunActionsMenu({
  copy,
  run,
  isBusy,
  onOpen,
  onProcess,
  onApprove,
  onMarkPaid,
  onExportPdf,
  onExportCsv,
  onCancel,
}: PayrollRunActionsMenuProps) {
  const canProcess = run.status === 'draft';
  const canApprove = run.status === 'processed';
  const canPay = run.status === 'approved';
  const canCancel = run.status !== 'paid' && run.status !== 'cancelled';
  const isPaid = run.status === 'paid';
  const isBlocked = run.users_count === 0 && run.status !== 'paid' && run.status !== 'cancelled';
  const reviewTone = isBlocked
    ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
    : run.status === 'draft'
      ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300'
      : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-slate-900 dark:text-blue-300';
  const actionButtonClassName = 'h-10 w-10 rounded-xl p-0 shadow-none transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-35';

  return (
    <div className="inline-flex items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <Button
        type="button"
        disabled={isBusy}
        onClick={onOpen}
        title={copy.reviewPayroll}
        aria-label={copy.reviewPayroll}
        className={`${actionButtonClassName} border ${reviewTone}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={isBusy || !canProcess}
        onClick={onProcess}
        title={copy.processPayroll}
        aria-label={copy.processPayroll}
        className={`${actionButtonClassName} border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300`}
      >
        <PlayCircle className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={isBusy || !canApprove}
        onClick={onApprove}
        title={copy.approvePayroll}
        aria-label={copy.approvePayroll}
        className={`${actionButtonClassName} border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300`}
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={onExportPdf}
        title={copy.printPayroll}
        aria-label={copy.printPayroll}
        className={`${actionButtonClassName} border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300`}
      >
        <Printer className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={isBusy || !canPay || isPaid}
        onClick={onMarkPaid}
        title={copy.markPayrollAsPaid}
        aria-label={copy.markPayrollAsPaid}
        className={`${actionButtonClassName} border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300`}
      >
        <Wallet className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            className={`${actionButtonClassName} border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
            aria-label={copy.morePayrollActions}
            title={copy.morePayrollActions}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onOpen}>
            <Pencil className="mr-2 h-4 w-4 text-amber-600" />
            {copy.openDetails}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExportCsv}>
            <Download className="mr-2 h-4 w-4 text-slate-600" />
            {copy.exportCsv}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canCancel}
            onClick={canCancel ? onCancel : undefined}
            className="text-rose-700 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-300"
          >
            <Ban className="mr-2 h-4 w-4" />
            {copy.cancel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
