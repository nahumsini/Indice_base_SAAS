import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Cable, CheckCircle2, CreditCard, Loader2, MapPin, Monitor, Power, RefreshCw, RotateCcw, Unplug } from 'lucide-react';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper, type IndiceModalWizardStep } from '../../../components/indice-modal';
import type { PosCashRegisterResponse } from '../Sale/services/posBackendApi';
import type { PointOfSaleLocale } from '../translations';
import { MercadoPagoBrandMark, PaymentProviderCard, SquareBrandMark, SquareSetupSection, squareSetupButtonClass, squareSetupSelectClass } from './SquareTerminalSetupStep';
import { useSquareTerminalSetupCopy } from './squareTerminalSetupTranslations';
import { squareSetupStepOrder, type SetupStepId, useSquareTerminalSetupState } from './useSquareTerminalSetupState';
import { MercadoPagoTerminalSetupModal } from './MercadoPagoTerminalSetupModal';
import { useMercadoPagoTerminalCopy } from './useMercadoPagoTerminalCopy';

interface SquareTerminalSetupModalProps {
  canManage: boolean;
  onClose: () => void;
  open: boolean;
  registers: PosCashRegisterResponse[];
  initialProvider?: 'MERCADO_PAGO';
}

export function SquareTerminalSetupModal({ canManage, onClose, open, registers, initialProvider }: SquareTerminalSetupModalProps) {
  const [mercadoPagoSelected, setMercadoPagoSelected] = useState(initialProvider === 'MERCADO_PAGO');
  useEffect(() => { if (open) setMercadoPagoSelected(initialProvider === 'MERCADO_PAGO'); }, [open, initialProvider]);
  const { copy, locale } = useSquareTerminalSetupCopy();
  const setup = useSquareTerminalSetupState({ canManage, copy, locale, open, registers });
  const wizardSteps = useMemo<readonly IndiceModalWizardStep<SetupStepId>[]>(() => [
    { id: 'provider', label: copy.steps.provider },
    { id: 'connect', label: copy.steps.connect },
    { id: 'location', label: copy.steps.location },
    { id: 'terminal', label: copy.steps.terminal },
  ], [copy]);
  const modalTitle = setup.activeStep === 'provider' ? copy.modal.providerTitle : copy.modal.squareTitle;
  const modalSubtitle = setup.activeStep === 'provider' ? copy.modal.providerSubtitle : copy.modal.squareSubtitle;
  const footerSummary = setup.activeStep === 'terminal' && setup.selectedTerminal && setup.selectedRegister
    ? copy.terminal.selectedSummary(setup.selectedTerminal.name, setup.selectedRegister.name)
    : copy.modal.stepSummary(setup.currentStepIndex + 1, squareSetupStepOrder.length, wizardSteps[setup.currentStepIndex]?.label ?? '');

  if (mercadoPagoSelected) return <MercadoPagoTerminalSetupModal canManage={canManage} onClose={onClose} onBack={() => setMercadoPagoSelected(false)} open={open} registers={registers} />;

  return (
    <IndiceModalFrame
      bodyClassName="overscroll-contain [scrollbar-gutter:stable]"
      busy={setup.busy}
      closeLabel={copy.modal.close}
      description={modalSubtitle}
      eyebrow={copy.modal.eyebrow}
      footer={setup.activeStep === 'provider' ? undefined : (
        <>
          <button type="button" onClick={setup.goBack} disabled={setup.busy || setup.loading}>
            <ArrowLeft className="h-4 w-4" />{copy.modal.back}
          </button>
          {setup.activeStep === 'connect' || setup.activeStep === 'location' ? (
            <button
              type="button"
              onClick={setup.continueWizard}
              disabled={setup.busy || setup.loading || (setup.activeStep === 'connect' ? !setup.connectionReady : setup.linkedLocationId !== setup.locationId)}
            >
              {copy.modal.continue}<ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={() => void setup.assignTerminal()} disabled={setup.busy || setup.loading || !setup.canAssign}>
              {setup.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{copy.terminal.assign}
            </button>
          )}
        </>
      )}
      footerLeading={<button type="button" onClick={onClose} disabled={setup.busy}>{copy.modal.cancel}</button>}
      footerSummary={footerSummary}
      icon={<CreditCard className="h-6 w-6" />}
      modalType="wizard"
      onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
      open={open}
      title={modalTitle}
      tone="coral"
    >
      <div className="space-y-4">
        <IndiceModalWizardStepper accent="coral" activeStepId={setup.activeStep} progressLabel={copy.modal.progress} steps={wizardSteps} />
        {setup.feedback ? <IndiceModalValidation messages={[setup.feedback.message]} tone={setup.feedback.tone} /> : null}
        {setup.loading ? <LoadingState label={copy.state.loading} /> : null}
        {!setup.loading && setup.activeStep === 'provider' ? <ProviderStep copy={copy} onSelectSquare={setup.selectSquare} onSelectMercadoPago={() => setMercadoPagoSelected(true)} /> : null}
        {!setup.loading && setup.activeStep === 'connect' ? <ConnectionStep copy={copy} setup={setup} /> : null}
        {!setup.loading && setup.activeStep === 'location' ? <LocationStep copy={copy} setup={setup} /> : null}
        {!setup.loading && setup.activeStep === 'terminal' ? <TerminalStep copy={copy} locale={locale} setup={setup} /> : null}
      </div>
    </IndiceModalFrame>
  );
}

type SetupState = ReturnType<typeof useSquareTerminalSetupState>;
type SetupCopy = ReturnType<typeof useSquareTerminalSetupCopy>['copy'];

function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Loader2 className="h-5 w-5 animate-spin text-[#B63B32]" />{label}</div>;
}

function ProviderStep({ copy, onSelectSquare, onSelectMercadoPago }: { copy: SetupCopy; onSelectSquare: () => void; onSelectMercadoPago: () => void }) {
  const { copy: mercadoPagoCopy } = useMercadoPagoTerminalCopy();
  return (
    <SquareSetupSection icon={<CreditCard className="h-5 w-5" />} title={copy.providers.title} description={copy.providers.description}>
      <div className="grid gap-4 md:grid-cols-2">
        <PaymentProviderCard actionLabel={copy.providers.configureSquare} badge={copy.providers.available} brand={copy.providers.squareName} description={copy.providers.squareDescription} logo={<SquareBrandMark />} onSelect={onSelectSquare} />
        {/* Mercado Pago is the explicit provider extension point. Add its own typed flow and backend contract here; never route it through Square APIs. */}
        <PaymentProviderCard actionLabel={mercadoPagoCopy.configure} badge="MX · MXN" brand={copy.providers.mercadoPagoName} description={mercadoPagoCopy.description} logo={<MercadoPagoBrandMark />} onSelect={onSelectMercadoPago} />
      </div>
    </SquareSetupSection>
  );
}

function ConnectionStep({ copy, setup }: { copy: SetupCopy; setup: SetupState }) {
  const connectionTitle = setup.status?.enabled ? (setup.connectionReady ? copy.connect.connected : copy.connect.pending) : copy.connect.unavailable;
  const connectionDescription = setup.status?.enabled ? (setup.connectionReady ? copy.connect.connectedHelp : copy.connect.pendingHelp) : copy.connect.unavailableHelp;
  return (
    <SquareSetupSection icon={<Cable className="h-5 w-5" />} title={copy.connect.title} description={copy.connect.description}>
      <IndiceModalSummary columns={2} description={connectionDescription} items={[
        { id: 'environment', label: copy.connect.environment, value: setup.status?.environment ?? '—' },
        { id: 'connection', label: copy.steps.connect, value: connectionTitle, emphasized: true },
      ]} title={connectionTitle} variant={setup.connectionReady ? 'success' : 'muted'} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void setup.connectSquare()} className={squareSetupButtonClass} disabled={!setup.status?.enabled || setup.busy}><Cable className="h-4 w-4" />{copy.connect.action}</button>
        <button type="button" onClick={() => void setup.loadSquareSetup()} className={squareSetupButtonClass} disabled={setup.busy}><RefreshCw className="h-4 w-4" />{copy.connect.refresh}</button>
      </div>
    </SquareSetupSection>
  );
}

function LocationStep({ copy, setup }: { copy: SetupCopy; setup: SetupState }) {
  const selectedLocation = setup.locations.find((location) => location.id === setup.locationId);
  return (
    <SquareSetupSection icon={<MapPin className="h-5 w-5" />} title={copy.location.title} description={copy.location.description}>
      <IndiceModalSummary columns={2} items={[
        { id: 'available', label: copy.steps.location, value: copy.location.available(setup.locations.length), emphasized: true },
        { id: 'selected', label: copy.location.label, value: selectedLocation?.name ?? '—' },
      ]} variant={setup.linkedLocationId === setup.locationId ? 'success' : 'muted'} />
      <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <span>{copy.location.label}</span>
        <select value={setup.locationId} onChange={(event) => { setup.setLocationId(event.target.value); setup.setLinkedLocationId(''); }} className={squareSetupSelectClass} disabled={!setup.locations.length || setup.busy}>
          {!setup.locations.length ? <option value="">{copy.location.empty}</option> : null}
          {setup.locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.currencyCode || 'CAD'}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => void setup.linkLocation()} className={squareSetupButtonClass} disabled={setup.busy || !setup.locationId}><MapPin className="h-4 w-4" />{copy.location.action}</button>
      {setup.linkedLocationId === setup.locationId ? <IndiceModalValidation messages={[copy.location.linked]} tone="success" /> : null}
    </SquareSetupSection>
  );
}

function TerminalStep({ copy, locale, setup }: { copy: SetupCopy; locale: PointOfSaleLocale; setup: SetupState }) {
  return (
    <SquareSetupSection icon={<Monitor className="h-5 w-5" />} title={copy.terminal.title} description={copy.terminal.description}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void setup.pairTerminal()} className={squareSetupButtonClass} disabled={setup.busy || !setup.locationId}><Monitor className="h-4 w-4" />{copy.terminal.generate}</button>
        <button type="button" onClick={() => void setup.loadSquareSetup()} className={squareSetupButtonClass} disabled={setup.busy}><RefreshCw className="h-4 w-4" />{copy.terminal.refresh}</button>
      </div>
      {setup.pairing ? <PairingCode copy={copy} locale={locale} pairingCode={setup.pairing.pairingCode} pairBy={setup.pairing.pairBy} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>{copy.terminal.terminalLabel}</span>
          <select value={setup.terminalId} onChange={(event) => { setup.setTerminalId(event.target.value); setup.setConfirmationAction(null); }} className={squareSetupSelectClass} disabled={!setup.terminals.length || setup.busy}>
            {!setup.terminals.length ? <option value="">{copy.terminal.terminalEmpty}</option> : null}
            {setup.terminals.map((terminal) => <option key={terminal.terminalId} value={terminal.terminalId}>{terminal.name} · {terminalStatusLabel(terminal.status, copy.terminal.statuses)} · {terminal.assignedRegisterId ? copy.terminal.assignedTo(terminal.assignedRegisterId) : copy.terminal.notAssigned}</option>)}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>{copy.terminal.registerLabel}</span>
          <select value={setup.registerId} onChange={(event) => { setup.setRegisterId(event.target.value); setup.setConfirmationAction(null); }} className={squareSetupSelectClass} disabled={!setup.activeRegisters.length || setup.busy}>
            {!setup.activeRegisters.length ? <option value="">{copy.terminal.registerEmpty}</option> : null}
            {setup.activeRegisters.map((register) => <option key={register.id} value={register.id}>{register.name} · {register.code}</option>)}
          </select>
        </label>
      </div>
      <IndiceModalSummary columns={2} items={[
        { id: 'terminals', label: copy.terminal.terminalLabel, value: copy.terminal.terminals(setup.terminals.length) },
        { id: 'selection', label: copy.terminal.registerLabel, value: setup.selectedRegister?.name ?? '—', emphasized: true },
      ]} variant="accent" />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={() => void setup.refreshPairingCode()} className={squareSetupButtonClass} disabled={setup.busy || !setup.terminalId || setup.selectedTerminalStatus === 'PAIRED'}><RotateCcw className="h-4 w-4" />{copy.terminal.refresh}</button>
        <button type="button" onClick={() => setup.setConfirmationAction('unassign')} className={squareSetupButtonClass} disabled={setup.busy || !setup.registerId}><Unplug className="h-4 w-4" />{copy.terminal.unassign}</button>
        <button type="button" onClick={() => setup.setConfirmationAction('disable')} className={`${squareSetupButtonClass} border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30`} disabled={setup.busy || !setup.terminalId}><Power className="h-4 w-4" />{copy.terminal.disable}</button>
      </div>
      {setup.confirmationAction ? <TerminalConfirmation copy={copy} setup={setup} /> : null}
    </SquareSetupSection>
  );
}

function PairingCode({ copy, locale, pairingCode, pairBy }: { copy: SetupCopy; locale: PointOfSaleLocale; pairingCode: string; pairBy?: string | null }) {
  return <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-sm" aria-live="polite"><p className="text-xs font-medium text-slate-300">{copy.terminal.pairingCode}</p><p className="mt-1 font-mono text-2xl font-medium">{pairingCode}</p>{pairBy ? <p className="mt-2 text-xs text-slate-300">{copy.terminal.pairBy(formatDateTime(pairBy, locale))}</p> : null}</div>;
}

function TerminalConfirmation({ copy, setup }: { copy: SetupCopy; setup: SetupState }) {
  return <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/25"><IndiceModalValidation messages={[setup.confirmationAction === 'unassign' ? copy.terminal.confirmUnassign : copy.terminal.confirmDisable]} title={copy.state.reviewStep} tone="warning" /><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setup.setConfirmationAction(null)} className={squareSetupButtonClass} disabled={setup.busy}>{copy.terminal.keep}</button><button type="button" onClick={() => void setup.confirmTerminalAction()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50" disabled={setup.busy}>{setup.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{copy.terminal.confirm}</button></div></div>;
}

function formatDateTime(value: string, locale: PointOfSaleLocale) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function terminalStatusLabel(status: string, labels: Record<'DISABLED' | 'PAIRED' | 'WAITING', string>) {
  const normalized = status.toUpperCase();
  return normalized in labels ? labels[normalized as keyof typeof labels] : status;
}
