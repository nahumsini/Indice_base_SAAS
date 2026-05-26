import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { defaultAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';
import { accentButtonClass } from '../../Processes/processesData';
import { ProgressSlider } from '../../shared/ProgressSlider';

interface CompletableTask {
  description: string | null;
  folio: string;
  title: string;
}

interface TaskCompletionDialogProps {
  completionNotes: string;
  completionPercent: string;
  copy?: AgendaTranslations['completionDialog'];
  isSubmitting: boolean;
  onCompletionNotesChange: (value: string) => void;
  onCompletionPercentChange: (value: string) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  task: CompletableTask | null;
}

export function TaskCompletionDialog({
  completionNotes,
  completionPercent,
  copy = defaultAgendaTranslations.completionDialog,
  isSubmitting,
  onCompletionNotesChange,
  onCompletionPercentChange,
  onConfirm,
  onOpenChange,
  open,
  task,
}: TaskCompletionDialogProps) {
  const parsedCompletion = Number(completionPercent || 100);
  const isCompletionValid = Number.isInteger(parsedCompletion) && parsedCompletion >= 0 && parsedCompletion <= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!flex max-h-[calc(100vh-3rem)] max-w-[560px] flex-col gap-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="shrink-0 bg-[#F4C84A] px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950">
            <CheckCircle2 className="h-5 w-5" />
            {copy.title}
          </DialogTitle>
        </div>

        <div className="space-y-5 px-6 py-5">
          <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {task ? copy.description(task.folio) : copy.fallbackDescription}
          </DialogDescription>

          {task ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
              {task.description ? (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {task.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <ProgressSlider
              value={Number(completionPercent || 100)}
              label={copy.completionLabel}
              onChange={(value) => onCompletionPercentChange(String(value))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.notesLabel}</label>
            <Textarea
              value={completionNotes}
              onChange={(event) => onCompletionNotesChange(event.target.value)}
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
            disabled={!task || !isCompletionValid || isSubmitting}
            onClick={onConfirm}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
