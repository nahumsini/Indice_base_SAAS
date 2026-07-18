import { ClipboardCheck } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
} from '../../../../components/indice-modal';
import { defaultAgendaTranslations, type AgendaTranslations } from '../../Agenda/translations';

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
  error?: string | null;
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
  error,
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
  const isWeightingValid = Number.isInteger(parsedWeighting) && parsedWeighting >= 0 && parsedWeighting <= maximumAuditWeighting;

  return (
    <IndiceModalFrame
      busy={isSubmitting}
      closeLabel={copy.close}
      description={task ? copy.description(task.folio) : copy.fallbackDescription}
      footer={(
        <>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={!task || !isWeightingValid || isSubmitting}
            onClick={onConfirm}
          >
            <ClipboardCheck className="h-4 w-4" />
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </>
      )}
      footerSummary={task ? `${task.folio} · ${weighting || 0}/${maximumAuditWeighting}` : undefined}
      icon={<ClipboardCheck className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title={copy.title}
      tone="yellow"
    >
      <div className="space-y-5">
        <IndiceModalValidation messages={error ? [error] : []} />
        {!isWeightingValid ? (
          <IndiceModalValidation messages={[copy.weightingHint(maximumAuditWeighting)]} />
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.weightingLabel}</label>
          <div className="grid grid-cols-6 gap-2">
            {auditWeightingOptions.map((score) => (
              <button
                key={score}
                type="button"
                className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                  weighting === String(score)
                    ? 'border-[#F4C84A] bg-[#F4C84A] text-slate-950 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
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
            className="h-11 rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-600 dark:bg-slate-800"
          />
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.weightingHint(maximumAuditWeighting)}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.notesLabel}</label>
          <Textarea
            value={auditNotes}
            onChange={(event) => onAuditNotesChange(event.target.value)}
            placeholder={copy.notesPlaceholder}
            className="min-h-[120px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 shadow-none dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
      </div>
    </IndiceModalFrame>
  );
}
