import {
  FileSpreadsheet,
  Pencil,
  Printer,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PayrollRunActionsCopy } from '../translations/types';

type PayrollRunActionsMenuProps = {
  copy: PayrollRunActionsCopy;
  isBusy: boolean;
  onOpen: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
};

export function PayrollRunActionsMenu({
  copy,
  isBusy,
  onOpen,
  onExportPdf,
  onExportCsv,
}: PayrollRunActionsMenuProps) {
  const actionButtonClassName = 'h-10 w-10 rounded-xl p-0 shadow-none transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-35';

  return (
    <div className="inline-flex items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <Button
        type="button"
        disabled={isBusy}
        onClick={onOpen}
        title={copy.reviewPayroll}
        aria-label={copy.reviewPayroll}
        className={`${actionButtonClassName} border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300`}
      >
        <Pencil className="h-4 w-4" />
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
        disabled={isBusy}
        onClick={onExportCsv}
        title={copy.exportCsv}
        aria-label={copy.exportCsv}
        className={`${actionButtonClassName} border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300`}
      >
        <FileSpreadsheet className="h-4 w-4" />
      </Button>
    </div>
  );
}
