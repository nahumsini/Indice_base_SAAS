import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bot, Check, Clipboard, Eye, ShieldCheck } from 'lucide-react';
import type { IssuedAiConnection } from '../../../../api/aiConnections';
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import { ACTION_SCOPE_CODES, READ_SCOPE_CODES, type AiScopeCode } from '../constants';
import type { CreateAiConnectionPayload } from '../hooks/useAiConnections';
import type { IntegrationsTranslations } from '../translations';
import { copyText } from '../utils';
import { ConnectionPermissionChoices } from './ConnectionPermissionChoices';

type WizardStep = 'information' | 'actions' | 'review';

type CreateAiConnectionWizardProps = {
  copy: IntegrationsTranslations;
  onCreate: (payload: CreateAiConnectionPayload) => Promise<IssuedAiConnection | null>;
  onOpenChange: (open: boolean) => void;
  onShowGuide: () => void;
  open: boolean;
};

const stepOrder: WizardStep[] = ['information', 'actions', 'review'];

export function CreateAiConnectionWizard({ copy, onCreate, onOpenChange, onShowGuide, open }: CreateAiConnectionWizardProps) {
  const [activeStep, setActiveStep] = useState<WizardStep>('information');
  const [selectedScopes, setSelectedScopes] = useState<AiScopeCode[]>([...READ_SCOPE_CODES]);
  const [label, setLabel] = useState(copy.wizard.defaultName);
  const [expiresInDays, setExpiresInDays] = useState<7 | 30 | 60 | 90>(30);
  const [issuedConnection, setIssuedConnection] = useState<IssuedAiConnection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setActiveStep('information');
    setSelectedScopes([...READ_SCOPE_CODES]);
    setLabel(copy.wizard.defaultName);
    setExpiresInDays(30);
    setIssuedConnection(null);
    setSubmitting(false);
    setCopied(false);
    setError('');
  }, [copy.wizard.defaultName, open]);

  const steps = useMemo(() => stepOrder.map((id) => ({ id, label: copy.wizard.steps[id] })), [copy.wizard.steps]);
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const selectedReadCount = READ_SCOPE_CODES.filter((scope) => selectedScopes.includes(scope)).length;
  const selectedActionCount = ACTION_SCOPE_CODES.filter((scope) => selectedScopes.includes(scope)).length;

  const goForward = () => {
    const nextStep = stepOrder[activeStepIndex + 1];
    if (nextStep) setActiveStep(nextStep);
  };

  const goBack = () => {
    const previousStep = stepOrder[activeStepIndex - 1];
    if (previousStep) setActiveStep(previousStep);
  };

  const createConnection = async () => {
    if (!label.trim() || selectedReadCount === 0) return;
    setSubmitting(true);
    setError('');
    const created = await onCreate({ label: label.trim(), expiresInDays, scopes: selectedScopes });
    setSubmitting(false);
    if (!created) {
      setError(copy.common.genericError);
      return;
    }
    setIssuedConnection(created);
  };

  const close = () => {
    if (!submitting) onOpenChange(false);
  };

  const footer = issuedConnection ? (
    <>
      <Button type="button" variant="outline" onClick={close}>{copy.wizard.finish}</Button>
      <Button type="button" onClick={onShowGuide}>{copy.wizard.showGuide}</Button>
    </>
  ) : (
    <>
      <Button type="button" variant="outline" onClick={activeStepIndex === 0 ? close : goBack} disabled={submitting}>
        {activeStepIndex === 0 ? copy.wizard.cancel : copy.wizard.back}
      </Button>
      {activeStep !== 'review' ? (
        <Button type="button" onClick={goForward} disabled={activeStep === 'information' && selectedReadCount === 0}>
          {copy.wizard.continue}
        </Button>
      ) : (
        <Button type="button" onClick={() => void createConnection()} disabled={submitting || !label.trim() || selectedReadCount === 0}>
          {submitting ? copy.wizard.creating : copy.wizard.create}
        </Button>
      )}
    </>
  );

  return (
    <IndiceModalFrame
      busy={submitting}
      description={issuedConnection ? copy.wizard.successDescription : copy.wizard.description}
      footer={footer}
      footerSummary={!issuedConnection ? copy.wizard.selectedAreasSummary(selectedReadCount) : undefined}
      icon={issuedConnection ? <Check className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      modalType="wizard"
      onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}
      open={open}
      title={issuedConnection ? copy.wizard.successTitle : copy.wizard.title}
      tone="blue"
    >
      {issuedConnection ? (
        <SuccessContent connection={issuedConnection} copy={copy} copied={copied} duration={expiresInDays} onCopied={() => setCopied(true)} />
      ) : (
        <div className="space-y-5">
          <IndiceModalWizardStepper accent="blue" activeStepId={activeStep} progressLabel={copy.wizard.progressLabel} steps={steps} />
          {activeStep === 'information' ? (
            <WizardSection icon={<Eye />} title={copy.wizard.informationTitle} description={copy.wizard.informationDescription}>
              <ConnectionPermissionChoices copy={copy} mode="information" onChange={setSelectedScopes} selectedScopes={selectedScopes} />
            </WizardSection>
          ) : null}
          {activeStep === 'actions' ? (
            <WizardSection icon={<ShieldCheck />} title={copy.wizard.actionsTitle} description={copy.wizard.actionsDescription}>
              <IndiceModalValidation messages={[copy.wizard.actionsSafeNote]} tone="info" />
              <div className="mt-4"><ConnectionPermissionChoices copy={copy} mode="actions" onChange={setSelectedScopes} selectedScopes={selectedScopes} /></div>
            </WizardSection>
          ) : null}
          {activeStep === 'review' ? (
            <ReviewStep
              copy={copy}
              expiresInDays={expiresInDays}
              label={label}
              selectedActionCount={selectedActionCount}
              selectedReadCount={selectedReadCount}
              onDurationChange={setExpiresInDays}
              onLabelChange={setLabel}
            />
          ) : null}
          {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
        </div>
      )}
    </IndiceModalFrame>
  );
}

function WizardSection({ children, description, icon, title }: { children: ReactNode; description: string; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#93C5FD] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <div><h3 className="text-base font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p></div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReviewStep({ copy, expiresInDays, label, onDurationChange, onLabelChange, selectedActionCount, selectedReadCount }: {
  copy: IntegrationsTranslations; expiresInDays: 7 | 30 | 60 | 90; label: string;
  onDurationChange: (days: 7 | 30 | 60 | 90) => void; onLabelChange: (label: string) => void;
  selectedActionCount: number; selectedReadCount: number;
}) {
  return (
    <WizardSection icon={<ShieldCheck />} title={copy.wizard.reviewTitle} description={copy.wizard.reviewDescription}>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <label className="text-sm text-slate-900 dark:text-white">{copy.wizard.nameLabel}
          <input value={label} onChange={(event) => onLabelChange(event.target.value)} maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 dark:border-slate-700 dark:bg-slate-950" placeholder={copy.wizard.namePlaceholder} />
        </label>
        <label className="text-sm text-slate-900 dark:text-white">{copy.wizard.durationLabel}
          <select value={expiresInDays} onChange={(event) => onDurationChange(Number(event.target.value) as 7 | 30 | 60 | 90)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            {([7, 30, 60, 90] as const).map((days) => <option key={days} value={days}>{copy.wizard.durationOptions[days]}</option>)}
          </select>
        </label>
      </div>
      <IndiceModalSummary className="mt-5" columns={3} variant="muted" items={[
        { label: copy.wizard.summaryInformation, value: selectedReadCount, emphasized: true },
        { label: copy.wizard.summaryActions, value: selectedActionCount || copy.wizard.noActions, emphasized: true },
        { label: copy.wizard.summaryDuration, value: copy.wizard.durationOptions[expiresInDays], emphasized: true },
      ]} />
    </WizardSection>
  );
}

function SuccessContent({ connection, copied, copy, duration, onCopied }: { connection: IssuedAiConnection; copied: boolean; copy: IntegrationsTranslations; duration: 7 | 30 | 60 | 90; onCopied: () => void }) {
  return (
    <div className="space-y-5">
      <IndiceModalSummary variant="success" icon={<Check className="h-5 w-5" />} title={copy.wizard.successTitle} description={copy.wizard.keyDescription} items={[
        { label: copy.wizard.nameLabel, value: connection.label }, { label: copy.wizard.summaryDuration, value: copy.wizard.durationOptions[duration] },
      ]} columns={2} />
      <div>
        <label className="text-sm font-medium text-slate-900 dark:text-white">{copy.wizard.keyLabel}</label>
        <p className="mt-1 text-xs leading-5 text-slate-500">{copy.wizard.keyDescription}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-emerald-300">{connection.accessToken}</code>
          <Button type="button" onClick={() => void copyText(connection.accessToken).then(onCopied)} className="h-11 rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied ? copy.wizard.keyCopied : copy.wizard.copyKey}
          </Button>
        </div>
      </div>
      <IndiceModalValidation messages={[copy.wizard.keyWarning]} tone="warning" />
    </div>
  );
}
