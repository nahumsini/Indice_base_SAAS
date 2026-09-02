import { useId } from 'react';
import {
  CalendarDays,
  ListPlus,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import type {
  EmployeeTaskCreateDraft,
  EmployeeTaskCreatePriority,
} from '../hooks/useEmployeeTaskMultiKioskWorkspace';
import type { TaskKioskTranslations } from '../translations';

interface EmployeeTaskMultiKioskCreateDialogProps {
  busy: boolean;
  copy: TaskKioskTranslations;
  draft: EmployeeTaskCreateDraft;
  employeeName: string;
  errorMessage: string;
  onChange: <Field extends keyof EmployeeTaskCreateDraft>(
    field: Field,
    value: EmployeeTaskCreateDraft[Field],
  ) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  open: boolean;
  scopeLabel: string;
}

export function EmployeeTaskMultiKioskCreateDialog({
  busy,
  copy,
  draft,
  employeeName,
  errorMessage,
  onChange,
  onClose,
  onSubmit,
  open,
  scopeLabel,
}: EmployeeTaskMultiKioskCreateDialogProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const errorId = `${formId}-error`;

  if (!open) return null;

  const closeButton = (
    <Button
      type="button"
      variant="outline"
      className="h-12 rounded-xl border-[#5F4003]/20 bg-white/90 px-4 text-sm font-medium text-[#5F4003] hover:bg-white"
      disabled={busy}
      onClick={onClose}
    >
      {copy.workspace.close}
    </Button>
  );

  return (
    <KioskModalFrame
      busy={busy}
      closeLabel={copy.create.closeModal}
      description={copy.create.selfDescription}
      eyebrow={copy.create.eyebrow}
      footer={(
        <Button
          aria-busy={busy || undefined}
          type="submit"
          form={formId}
          className="h-12 rounded-xl bg-white px-5 text-sm font-medium text-[#7A5204] hover:bg-white/90"
          disabled={busy}
        >
          {busy
            ? <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
            : <ListPlus aria-hidden="true" className="mr-2 h-5 w-5" />}
          {busy ? copy.create.submitting : copy.create.submit}
        </Button>
      )}
      footerLeading={closeButton}
      icon={<ListPlus className="h-5 w-5" />}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
      open
      size="form"
      surface="public"
      title={copy.create.title}
      tone="yellow"
    >
      <form
        aria-busy={busy || undefined}
        className="space-y-4"
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <span className="sr-only" aria-live="polite">
          {busy ? copy.create.submitting : ''}
        </span>

        {errorMessage ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            id={errorId}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <p className="flex items-start gap-3 rounded-2xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-4 py-3 text-sm leading-5 text-slate-700 dark:border-[#F4C84A]/20 dark:bg-[#F4C84A]/10 dark:text-slate-200">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#8A5E05] dark:text-[#FDE68A]" />
          <span>{copy.create.selfAssignment(employeeName, scopeLabel)}</span>
        </p>

        <label className="block" htmlFor={titleId}>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {copy.create.titleLabel}
          </span>
          <Input
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={Boolean(errorMessage) || undefined}
            autoFocus
            className="mt-2 h-12 rounded-xl"
            disabled={busy}
            id={titleId}
            maxLength={220}
            placeholder={copy.create.titlePlaceholder}
            required
            value={draft.title}
            onChange={(event) => onChange('title', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {copy.create.descriptionLabel}
          </span>
          <Textarea
            className="mt-2 min-h-24 rounded-xl"
            disabled={busy}
            maxLength={2000}
            placeholder={copy.create.descriptionPlaceholder}
            value={draft.description}
            onChange={(event) => onChange('description', event.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {copy.create.priorityLabel}
            </span>
            <select
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus-visible:border-[#C38A08] focus-visible:ring-2 focus-visible:ring-[#F4C84A]/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              disabled={busy}
              value={draft.priority}
              onChange={(event) => onChange(
                'priority',
                event.target.value as EmployeeTaskCreatePriority,
              )}
            >
              <option value="low">{copy.create.priorityLow}</option>
              <option value="medium">{copy.create.priorityMedium}</option>
              <option value="high">{copy.create.priorityHigh}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {copy.create.dueDateLabel}
            </span>
            <span className="relative mt-2 block">
              <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A5E05] dark:text-[#FDE68A]"
              />
              <Input
                className="h-12 rounded-xl pl-10"
                disabled={busy}
                type="date"
                value={draft.dueDate}
                onChange={(event) => onChange('dueDate', event.target.value)}
              />
            </span>
          </label>
        </div>
      </form>
    </KioskModalFrame>
  );
}
