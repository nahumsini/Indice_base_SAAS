import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Play } from 'lucide-react';
import type {
  EmployeeOccasionalProcessCreateResponse,
  EmployeeOccasionalProcessPreviewResponse,
} from '../../../../api/multiKiosks';
import { IndiceModalValidation, IndiceModalWizardStepper } from '../../../../components/indice-modal';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import type { OccasionalProcessOption, ProcessRunPreview } from '../../Processes/processesApi';
import type { EmployeeTaskAgendaCopy } from '../employeeTaskAgendaTranslations';
import {
  employeeTaskCapabilities,
  localEmployeeTaskDate,
  type EmployeeTaskMultiKioskAction,
} from '../hooks/useEmployeeTaskMultiKioskWorkspace';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';

type ProcessStep = 'details' | 'review';

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function EmployeeTaskOccasionalProcessDialog({
  canCreate,
  canPreview,
  copy,
  onAction,
  onAuthorizationFailure,
  onCreated,
  onOpenChange,
  open,
  options,
}: {
  canCreate: boolean;
  canPreview: boolean;
  copy: EmployeeTaskAgendaCopy;
  onAction: EmployeeTaskMultiKioskAction;
  onAuthorizationFailure: (error: unknown) => boolean;
  onCreated: (items: PublicTaskKioskTask[], message: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: OccasionalProcessOption[];
}) {
  const [step, setStep] = useState<ProcessStep>('details');
  const [processId, setProcessId] = useState('');
  const [reference, setReference] = useState('');
  const [startDate, setStartDate] = useState(localEmployeeTaskDate);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<ProcessRunPreview | null>(null);
  const [operationId, setOperationId] = useState(requestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const labels = copy.processUi;
  const selected = useMemo(
    () => options.find(option => option.id === Number(processId)) ?? null,
    [options, processId],
  );

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setProcessId('');
    setReference('');
    setStartDate(localEmployeeTaskDate());
    setNotes('');
    setPreview(null);
    setOperationId(requestId());
    setError('');
  }, [open]);

  const loadPreview = async () => {
    if (!canPreview || !processId || !reference.trim() || !startDate || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await onAction<EmployeeOccasionalProcessPreviewResponse>(
        employeeTaskCapabilities.occasionalPreview,
        { process_id: Number(processId), reference: reference.trim(), start_date: startDate },
      );
      setPreview(result.preview);
      setStep('review');
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(labels.failure);
    } finally {
      setBusy(false);
    }
  };

  const createRun = async () => {
    if (!canCreate || !preview || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await onAction<EmployeeOccasionalProcessCreateResponse>(
        employeeTaskCapabilities.occasionalCreate,
        {
          process_id: preview.processId,
          reference: reference.trim(),
          start_date: startDate,
          notes: notes.trim() || null,
          allow_duplicate_reference: preview.duplicateReference,
          request_id: operationId,
        },
      );
      onCreated(result.items, labels.started(result.run.folio));
      onOpenChange(false);
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(labels.failure);
    } finally {
      setBusy(false);
    }
  };

  const footer = step === 'details' ? (
    <>
      <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>{labels.cancel}</Button>
      <Button type="button" className="h-auto min-h-12 whitespace-normal rounded-xl bg-[#143675] px-4 py-3 text-white hover:bg-[#102c60]" disabled={busy || !canPreview || !processId || !reference.trim() || !startDate} onClick={() => void loadPreview()}>
        {labels.review}
      </Button>
    </>
  ) : (
    <>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { setStep('details'); setPreview(null); }}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />{labels.back}
      </Button>
      <Button type="button" className="h-auto min-h-12 whitespace-normal rounded-xl bg-[#143675] px-4 py-3 text-white hover:bg-[#102c60]" disabled={busy || !canCreate} onClick={() => void createRun()}>
        <Play aria-hidden="true" className="h-4 w-4" />
        {preview?.duplicateReference ? labels.startAnyway : labels.start}
      </Button>
    </>
  );

  return (
    <KioskModalFrame
      contentClassName="[&_button]:min-h-11 [&_button]:min-w-11"
      busy={busy}
      closeLabel={labels.cancel}
      description={labels.description}
      footer={footer}
      footerSummary={selected ? `${selected.folio} · ${selected.taskCount}` : undefined}
      icon={<span aria-hidden="true" className="text-2xl">🚀</span>}
      onOpenChange={onOpenChange}
      open={open}
      size="wizard"
      surface="public"
      title={labels.title}
      tone="yellow"
    >
      <div className="space-y-4">
        <IndiceModalWizardStepper
          accent="yellow"
          activeStepId={step}
          density="compact"
          progressLabel={labels.title}
          steps={[{ id: 'details', label: labels.process }, { id: 'review', label: labels.review }]}
        />
        <IndiceModalValidation messages={error ? [error] : []} />

        {options.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {labels.empty}
          </p>
        ) : step === 'details' ? (
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.process}</span>
              <select className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={processId} onChange={event => { setProcessId(event.target.value); setPreview(null); setOperationId(requestId()); }}>
                <option value="">{labels.select}</option>
                {options.map(option => <option key={option.id} value={option.id}>{option.folio} · {option.title} · {option.taskCount}</option>)}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.reference}</span>
              <Input className="h-12 min-w-0 rounded-xl text-base" maxLength={220} placeholder={labels.referencePlaceholder} value={reference} onChange={event => { setReference(event.target.value); setOperationId(requestId()); }} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.startDate}</span>
              <Input className="h-12 min-w-0 rounded-xl text-base" type="date" value={startDate} onChange={event => { setStartDate(event.target.value); setOperationId(requestId()); }} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{labels.notes}</span>
              <Textarea className="min-h-28 rounded-xl text-base" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} />
            </label>
          </fieldset>
        ) : preview ? (
          <div className="space-y-3">
            {preview.duplicateReference ? <IndiceModalValidation tone="warning" messages={[labels.duplicate(preview.matchingRuns)]} /> : null}
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <p className="font-medium text-slate-950 dark:text-white">{preview.reference}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{preview.startDate} · v{preview.version}</p>
            </div>
            {preview.tasks.map(task => (
              <article key={task.templateId} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-950 dark:text-white"><span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF3CB] text-sm text-[#684708]">{task.position}</span>{task.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{labels.stage} {task.stage} · {task.assignees.join(', ') || labels.unassigned}</p>
                  </div>
                  {task.evidenceRequired ? <span className="max-w-full rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">{labels.evidenceRequired}</span> : null}
                </div>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{task.scheduledDate} → {task.dueDate}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </KioskModalFrame>
  );
}
