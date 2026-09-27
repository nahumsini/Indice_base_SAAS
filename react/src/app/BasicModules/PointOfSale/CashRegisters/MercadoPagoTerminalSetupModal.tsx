import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Cable, CreditCard, Loader2, Monitor, RefreshCw } from 'lucide-react';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../components/indice-modal';
import type { PosCashRegisterResponse } from '../Sale/services/posBackendApi';
import { mercadoPagoTerminalApi } from '../Sale/services/mercadoPagoTerminalApi';
import type { MercadoPagoConnectionStatus, MercadoPagoTerminal } from '../Sale/services/mercadoPagoTerminalTypes';
import { SquareSetupSection, squareSetupButtonClass, squareSetupSelectClass } from './SquareTerminalSetupStep';
import { useMercadoPagoTerminalCopy } from './useMercadoPagoTerminalCopy';
import { useSquareTerminalSetupCopy } from './squareTerminalSetupTranslations';

interface Props { canManage: boolean; open: boolean; registers: PosCashRegisterResponse[]; onClose: () => void; onBack: () => void }
export function MercadoPagoTerminalSetupModal({ canManage, open, registers, onClose, onBack }: Props) {
  const { copy, locale } = useMercadoPagoTerminalCopy();
  const { copy: sharedCopy } = useSquareTerminalSetupCopy();
  const [status, setStatus] = useState<MercadoPagoConnectionStatus | null>(null);
  const [terminals, setTerminals] = useState<MercadoPagoTerminal[]>([]);
  const [terminalId, setTerminalId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [restartRequiredId, setRestartRequiredId] = useState<number | null>(null);
  const activeRegisters = registers.filter((register) => register.active && register.status === 'ACTIVE').sort((a, b) => a.name.localeCompare(b.name, locale));
  const selectedTerminal = terminals.find((terminal) => String(terminal.terminalId) === terminalId);
  const verificationLabel = !selectedTerminal ? '—' : selectedTerminal.verificationFailureCode === 'BINDING_CHANGED' ? copy.reconfigure
    : selectedTerminal.verificationStatus === 'READY' ? copy.providerVerified : selectedTerminal.verificationStatus === 'UNAVAILABLE'
      ? copy.terminalUnavailable : selectedTerminal.verificationStatus === 'STALE' ? copy.stale : copy.pending;
  const activeStep = !status?.connected ? 'connect' : 'terminal';

  const load = useCallback(async () => {
    const next = await mercadoPagoTerminalApi.status();
    setStatus(next);
    if (next.enabled && next.connected) {
      const response = await mercadoPagoTerminalApi.terminals();
      setTerminals(response.items);
    } else setTerminals([]);
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (!canManage || busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError('');
    try { await action(); } catch { setError(copy.error); }
    finally { busyRef.current = false; setBusy(false); }
  };
  useEffect(() => { if (open && canManage) void run(load); }, [open, canManage, load]);
  useEffect(() => { if (!registerId && activeRegisters.length) setRegisterId(String(activeRegisters[0].id)); }, [activeRegisters, registerId]);
  useEffect(() => { if (!terminalId && terminals.length) setTerminalId(String(terminals[0].terminalId)); }, [terminals, terminalId]);
  const canAssign = canManage && status?.connected && selectedTerminal?.status.toUpperCase() === 'READY' && selectedTerminal.verificationStatus === 'READY' && selectedTerminal.operatingMode.toUpperCase() === 'PDV' && restartRequiredId !== selectedTerminal.terminalId && Boolean(registerId);

  return <IndiceModalFrame open={open} onOpenChange={(next) => { if (!next && !busyRef.current) onClose(); }} title={copy.title} description={copy.description} eyebrow={sharedCopy.modal.eyebrow} closeLabel={sharedCopy.modal.close} icon={<CreditCard className="h-6 w-6" />} tone="coral" modalType="wizard" busy={busy}
    footerLeading={<button type="button" onClick={onClose} disabled={busy}>{sharedCopy.modal.cancel}</button>}
    footer={<><button type="button" onClick={onBack} disabled={busy}><ArrowLeft className="h-4 w-4" />{sharedCopy.modal.back}</button>{activeStep === 'terminal' ? <button type="button" disabled={busy || !canAssign} onClick={() => void run(async () => { await mercadoPagoTerminalApi.assign(Number(registerId), Number(terminalId)); setNotice(copy.assigned); await load(); })}>{copy.assign}</button> : null}</>}
    footerSummary={copy.oneProvider}>
    <div className="space-y-4">
      <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} progressLabel={sharedCopy.modal.progress} steps={[{ id: 'provider', label: sharedCopy.steps.provider }, { id: 'connect', label: copy.connection }, { id: 'terminal', label: copy.terminal }]} />
      {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
      {notice ? <IndiceModalValidation messages={[notice]} tone="info" /> : null}
      <SquareSetupSection icon={<Cable className="h-5 w-5" />} title={copy.connection} description={status?.enabled === false ? copy.unavailable : copy.oneProvider}>
        <IndiceModalSummary columns={2} items={[{ id: 'connection', label: copy.connection, value: status?.connected ? copy.connected : copy.disconnected, emphasized: true }, { id: 'environment', label: copy.environment, value: status?.environment ?? '—' }, { id: 'merchant', label: copy.merchant, value: status?.merchantId ?? '—' }]} variant={status?.connected ? 'success' : 'muted'} />
        <div className="flex flex-wrap gap-2"><button type="button" className={squareSetupButtonClass} disabled={busy || !status?.enabled} onClick={() => void run(async () => { const result = await mercadoPagoTerminalApi.startOAuth(); window.location.assign(result.authorizationUrl); })}><Cable className="h-4 w-4" />{copy.connect}</button><button type="button" className={squareSetupButtonClass} disabled={busy} onClick={() => void run(async () => { await load(); setRestartRequiredId(null); })}><RefreshCw className="h-4 w-4" />{copy.refresh}</button></div>
      </SquareSetupSection>
      {status?.connected ? <SquareSetupSection icon={<Monitor className="h-5 w-5" />} title={copy.terminal} description={copy.modeHelp}>
        <button type="button" className={squareSetupButtonClass} disabled={busy} onClick={() => void run(async () => { const result = await mercadoPagoTerminalApi.syncTerminals(); setTerminals(result.items); })}><RefreshCw className="h-4 w-4" />{copy.discover}</button>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium"><span>{copy.terminal}</span><select className={squareSetupSelectClass} value={terminalId} disabled={busy || !terminals.length} onChange={(event) => setTerminalId(event.target.value)}>{!terminals.length ? <option value="">{copy.empty}</option> : null}{terminals.map((terminal) => <option key={terminal.terminalId} value={terminal.terminalId}>{terminal.name} · {terminal.providerTerminalId}</option>)}</select></label>
          <label className="block space-y-2 text-sm font-medium"><span>{copy.register}</span><select className={squareSetupSelectClass} value={registerId} disabled={busy || !activeRegisters.length} onChange={(event) => { setRegisterId(event.target.value); setConfirmUnassign(false); }}>{!activeRegisters.length ? <option value="">{copy.noRegister}</option> : null}{activeRegisters.map((register) => <option key={register.id} value={register.id}>{register.name}</option>)}</select></label>
        </div>
        {selectedTerminal ? <IndiceModalSummary columns={2} items={[{ id: 'mode', label: copy.mode, value: selectedTerminal.operatingMode }, { id: 'status', label: copy.terminal, value: selectedTerminal.status.toUpperCase() === 'READY' ? copy.ready : selectedTerminal.status.toUpperCase() === 'DISABLED' ? copy.disabled : copy.pending }, { id: 'verification', label: copy.providerVerification, value: verificationLabel }, { id: 'assignment', label: copy.assignment, value: activeRegisters.find((register) => register.id === selectedTerminal.assignedRegisterId)?.name ?? (selectedTerminal.assignedRegisterId == null ? copy.unassigned : String(selectedTerminal.assignedRegisterId)) }]} /> : null}
        <div className="flex flex-wrap gap-2"><button type="button" className={squareSetupButtonClass} disabled={busy || !selectedTerminal || selectedTerminal.status.toUpperCase() === 'DISABLED'} onClick={() => void run(async () => { await mercadoPagoTerminalApi.configure(Number(terminalId)); setRestartRequiredId(Number(terminalId)); setNotice(copy.restart); await load(); })}>{copy.configureMode}</button><button type="button" className={squareSetupButtonClass} disabled={busy || !registerId} onClick={() => setConfirmUnassign(true)}>{copy.unassign}</button></div>
        {confirmUnassign ? <div className="space-y-3 rounded-xl border border-amber-200 p-4"><IndiceModalValidation messages={[copy.confirmUnassign]} tone="warning" /><div className="flex gap-2"><button type="button" className={squareSetupButtonClass} disabled={busy} onClick={() => setConfirmUnassign(false)}>{copy.keep}</button><button type="button" className={squareSetupButtonClass} disabled={busy} onClick={() => void run(async () => { await mercadoPagoTerminalApi.unassign(Number(registerId)); setConfirmUnassign(false); await load(); })}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{copy.confirm}</button></div></div> : null}
      </SquareSetupSection> : null}
    </div>
  </IndiceModalFrame>;
}
