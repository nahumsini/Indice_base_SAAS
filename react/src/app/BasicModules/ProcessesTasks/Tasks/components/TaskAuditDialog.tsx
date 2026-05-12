import { ClipboardCheck } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { defaultAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';
import { accentButtonClass } from '../../Processes/processesData';

const maximumAuditWeighting = 5;
const auditWeightingOptions = [0, 1, 2, 3, 4, 5];

interface AuditableTask {
  description: string | null;
  folio: string;
  title: string;
}

interface TaskAuditDialogProps {
  auditNotes: string;
  copy?: AgendaTranslations['auditDialog'];
  isSubmitting: boolean;
  onAuditNotesChange: (value: string) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  onWeightingChange: (value: string) => void;
  open: boolean;
  task: AuditableTask | null;
  weighting: string;
}

export function TaskAuditDialog({
  auditNotes,
  copy = defaultAgendaTranslations.auditDialog,
  isSubmitting,
  onAuditNotesChange,
  onConfirm,
  onOpenChange,
  onWeightingChange,
  open,
  task,
  weighting,
}: TaskAuditDialogProps) {
  const parsedWeighting = Number(weighting);
  const isWeightingValid =
    Number.isInteger(parsedWeighting) && parsedWeighting >= 0 && parsedWeighting <= maximumAuditWeighting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!flex max-h-[calc(100vh-3rem)] w-[calc(100vw-2rem)] !max-w-[680px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:!max-w-[680px] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="shrink-0 bg-[rgb(235,165,52)] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 pr-4">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                <ClipboardCheck className="h-5 w-5 shrink-0" />
                <span className="truncate">{copy.title}</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-white/90">
                {copy.scale(maximumAuditWeighting)}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl border-white/70 bg-white/10 px-3 text-white hover:bg-white/20 hover:text-white"
                disabled={isSubmitting}
              >
                {copy.close}
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="space-y-5 bg-slate-50/70 px-6 py-5 dark:bg-slate-900/60">
          <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {task
              ? copy.description(task.folio)
              : copy.fallbackDescription}
          </DialogDescription>

          {task ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-bold uppercase text-[rgb(176,111,22)]">
                {task.folio}
              </p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{task.title}</p>
              {task.description ? (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {task.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.weightingLabel}</label>
            <div className="grid grid-cols-6 gap-2">
              {auditWeightingOptions.map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`h-10 rounded-xl border text-sm font-bold transition-colors ${
                    weighting === String(score)
                      ? 'border-[rgb(235,165,52)] bg-[rgb(235,165,52)] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[rgb(235,165,52)] hover:text-[rgb(176,111,22)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                  onClick={() => onWeightingChange(String(score))}
                >
                  {score}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min="0"
              max={maximumAuditWeighting}
              value={weighting}
              onChange={(event) => onWeightingChange(event.target.value)}
              placeholder={`0-${maximumAuditWeighting}`}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {copy.weightingHint(maximumAuditWeighting)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.notesLabel}</label>
            <Textarea
              value={auditNotes}
              onChange={(event) => onAuditNotesChange(event.target.value)}
              placeholder={copy.notesPlaceholder}
              className="min-h-[120px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              disabled={isSubmitting}
            >
              {copy.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            className={`h-10 rounded-xl px-4 text-sm font-semibold ${accentButtonClass}`}
            disabled={!task || !isWeightingValid || isSubmitting}
            onClick={onConfirm}
          >
            <ClipboardCheck className="h-4 w-4" />
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
