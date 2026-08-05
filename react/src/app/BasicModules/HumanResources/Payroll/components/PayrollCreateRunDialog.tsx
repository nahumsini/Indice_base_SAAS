import { CalendarPlus, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { PayrollCreateRunsPayload } from '../../../../api/humanResources';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import type { PayrollTranslations } from '../translations';

type PayrollCreateRunDialogProps = {
  open: boolean;
  busy: boolean;
  copy: PayrollTranslations['createRunDialog'];
  frequencyLabels: Record<PayrollCreateRunsPayload['pay_period'], string>;
  groupingLabels: Record<PayrollCreateRunsPayload['grouping_mode'], string>;
  form: PayrollCreateRunsPayload;
  onChange: (value: PayrollCreateRunsPayload) => void;
  onClose: () => void;
  onCreate: () => void;
};

const fieldClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function PayrollCreateRunDialog({
  open,
  busy,
  copy,
  frequencyLabels,
  groupingLabels,
  form,
  onChange,
  onClose,
  onCreate,
}: PayrollCreateRunDialogProps) {
  return (
    <IndiceModalFrame
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      modalType="standard-form"
      tone="aqua"
      busy={busy}
      icon={<CalendarPlus className="h-5 w-5" />}
      title={copy.title}
      description={copy.description}
      closeLabel={copy.cancel}
      contentClassName="max-w-2xl"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button type="button" onClick={onCreate} disabled={busy || !form.period_start_date}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {busy ? copy.creating : copy.create}
          </Button>
        </>
      )}
    >
      <div className="space-y-5 bg-slate-50 p-6 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <span>{copy.frequency}</span>
            <select
              value={form.pay_period}
              className={fieldClassName}
              onChange={(event) => onChange({
                ...form,
                pay_period: event.target.value as PayrollCreateRunsPayload['pay_period'],
              })}
            >
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <span>{copy.grouping}</span>
            <select
              value={form.grouping_mode}
              className={fieldClassName}
              onChange={(event) => onChange({
                ...form,
                grouping_mode: event.target.value as PayrollCreateRunsPayload['grouping_mode'],
              })}
            >
              {Object.entries(groupingLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <span>{copy.startDate}</span>
          <input
            type="date"
            value={form.period_start_date}
            className={fieldClassName}
            onChange={(event) => onChange({ ...form, period_start_date: event.target.value })}
          />
          <span className="block text-xs text-slate-500 dark:text-slate-400">{copy.endDateHint}</span>
        </label>

        <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-3 text-sm text-[#177d66] dark:border-[#59C3A5]/30 dark:bg-[#13362F]/70 dark:text-[#A7F3D0]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{copy.cohortHint}</span>
        </div>
      </div>
    </IndiceModalFrame>
  );
}
