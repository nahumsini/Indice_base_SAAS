import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
} from '../../../../components/indice-modal';
import { defaultAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';
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
  error?: string | null;
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
  error,
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
    <IndiceModalFrame
      busy={isSubmitting}
      closeLabel={copy.cancel}
      description={task ? copy.description(task.folio) : copy.fallbackDescription}
      footer={(
        <>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={!task || !isCompletionValid || isSubmitting}
            onClick={onConfirm}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </>
      )}
      footerSummary={task ? `${task.folio} · ${parsedCompletion}%` : undefined}
      icon={<CheckCircle2 className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title={copy.title}
      tone="yellow"
    >
      <div className="space-y-5">
        <IndiceModalValidation messages={error ? [error] : []} />
        {!isCompletionValid ? (
          <IndiceModalValidation messages={[`${copy.completionLabel}: 0–100`]} />
        ) : null}

        {task ? (
          <IndiceModalSummary
            columns={2}
            items={[
              { label: task.folio, value: task.title },
              ...(task.description ? [{ label: copy.notesLabel, value: task.description }] : []),
            ]}
          />
        ) : null}

        <ProgressSlider
          value={Number(completionPercent || 100)}
          label={copy.completionLabel}
          onChange={(value) => onCompletionPercentChange(String(value))}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.notesLabel}</label>
          <Textarea
            value={completionNotes}
            onChange={(event) => onCompletionNotesChange(event.target.value)}
            placeholder={copy.notesPlaceholder}
            className="min-h-[120px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>
    </IndiceModalFrame>
  );
}
