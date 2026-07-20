import { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Loader2, ShieldCheck, Store } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { payableKiosksService, type PayableKiosk, type PayableKioskProviderAccess } from '../../services';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import type { ProviderRecord } from '../useProveedoresLogic';

type ProviderKioskAccessModalProps = {
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  provider: ProviderRecord | null;
};

export function ProviderKioskAccessModal({ onClose, onError, onSuccess, provider }: ProviderKioskAccessModalProps) {
  const t = useExpensesTranslations();
  const copy = t.expenses.payablesKiosk;
  const [accesses, setAccesses] = useState<PayableKioskProviderAccess[]>([]);
  const [generatedPin, setGeneratedPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [kiosks, setKiosks] = useState<PayableKiosk[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState('');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const providerId = Number(provider?.id);
  const activeAccess = useMemo(() => accesses.find(access => (
    access.providerId === providerId && access.status === 'ACTIVE'
  )), [accesses, providerId]);
  const activeKiosks = useMemo(() => kiosks.filter(kiosk => kiosk.status === 'ACTIVE'), [kiosks]);
  const accessUrl = activeAccess
    ? `${window.location.origin}/expenses/kiosk/cuentas-por-pagar/${activeAccess.publicAccessToken}`
    : '';

  useEffect(() => {
    if (!provider) return;
    setGeneratedPin('');
    setShowRevokeConfirm(false);
    setIsLoading(true);
    Promise.all([payableKiosksService.list(), payableKiosksService.listProviderAccesses()])
      .then(([nextKiosks, nextAccesses]) => {
        setKiosks(nextKiosks);
        setAccesses(nextAccesses);
        const existing = nextAccesses.find(access => access.providerId === Number(provider.id) && access.status === 'ACTIVE');
        setSelectedKioskId(String(existing?.kioskId ?? nextKiosks.find(kiosk => kiosk.status === 'ACTIVE')?.id ?? ''));
      })
      .catch(error => onError(error instanceof Error ? error.message : copy.messages.loadFailed))
      .finally(() => setIsLoading(false));
  }, [copy.messages.loadFailed, onError, provider]);

  const refreshAccesses = async () => setAccesses(await payableKiosksService.listProviderAccesses());

  const issueAccess = async () => {
    if (!provider || !Number.isFinite(providerId) || !selectedKioskId) return;
    setIsSaving(true);
    try {
      const saved = await payableKiosksService.issueProviderAccess(Number(selectedKioskId), providerId);
      setGeneratedPin(saved.pin ?? '');
      await refreshAccesses();
      onSuccess(copy.messages.providerAccessIssued);
    } catch (error) {
      onError(error instanceof Error ? error.message : copy.messages.pinFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const rotatePin = async () => {
    if (!activeAccess) return;
    setIsSaving(true);
    try {
      const saved = await payableKiosksService.rotateProviderPin(activeAccess.id);
      setGeneratedPin(saved.pin ?? '');
      await refreshAccesses();
      onSuccess(copy.messages.providerPinRotated);
    } catch (error) {
      onError(error instanceof Error ? error.message : copy.messages.pinFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const revoke = async () => {
    if (!activeAccess) return;
    setIsSaving(true);
    try {
      await payableKiosksService.revokeProviderAccess(activeAccess.id);
      setGeneratedPin('');
      setShowRevokeConfirm(false);
      await refreshAccesses();
      onSuccess(copy.messages.providerAccessRevoked);
    } catch (error) {
      onError(error instanceof Error ? error.message : copy.messages.pinFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const copyValue = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    onSuccess(message);
  };

  return (
    <>
      <KioskModalFrame
        busy={isSaving}
        description={provider?.name ?? copy.providerAccess}
        footer={(
          <button type="button" disabled={isSaving} onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">{t.common.cancel}</button>
        )}
        footerSummary={activeAccess ? copy.accessReady : copy.selectKiosk}
        icon={<KeyRound className="h-5 w-5" />}
        onOpenChange={open => !open && onClose()}
        open={Boolean(provider) && !showRevokeConfirm}
        size="form"
        surface="administration"
        title={copy.manageProviderAccess}
        tone="green"
      >
        <section className="space-y-4">
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#147514]" /></div>
          ) : provider?.status !== 'active' ? (
            <IndiceModalValidation messages={[copy.pendingProviderHint]} title={copy.providerAccess} tone="warning" />
          ) : activeKiosks.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900">{copy.noKiosks}</div>
          ) : (
            <>
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514]"><Store className="h-5 w-5" /></span>
                  <div><p className="font-bold text-slate-950 dark:text-white">{copy.providerAccess}</p><p className="text-xs font-semibold text-slate-500">{activeAccess ? copy.accessReady : copy.selectKiosk}</p></div>
                </div>
                <label className="block text-xs font-medium text-slate-500">
                  {copy.assignedKiosk}
                  <select value={activeAccess ? String(activeAccess.kioskId) : selectedKioskId} disabled={Boolean(activeAccess)} onChange={event => setSelectedKioskId(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                    {activeKiosks.map(kiosk => <option key={kiosk.id} value={kiosk.id}>{kiosk.name} · {kiosk.currencyCode}</option>)}
                  </select>
                </label>
                {!activeAccess ? (
                  <Button type="button" disabled={isSaving || !selectedKioskId} onClick={issueAccess} className="mt-4 h-11 w-full rounded-xl bg-[#147514] text-white hover:bg-[#105f10]">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{copy.generatePin}</Button>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => copyValue(accessUrl, copy.messages.linkCopied)} className="h-11 rounded-xl"><Copy className="h-4 w-4" />{copy.copyLink}</Button>
                    <Button type="button" variant="outline" disabled={isSaving} onClick={rotatePin} className="h-11 rounded-xl"><KeyRound className="h-4 w-4" />{copy.rotateProviderPin}</Button>
                  </div>
                )}
              </div>

              {generatedPin ? (
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-100"><ShieldCheck className="h-5 w-5" />{copy.generatedPin}</div>
                  <button type="button" onClick={() => copyValue(generatedPin, copy.messages.pinCopied)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                    <code className="text-2xl font-semibold tracking-[0.2em] text-slate-950 dark:text-white">{generatedPin}</code><Copy className="h-5 w-5 text-[#147514]" />
                  </button>
                  <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{copy.generatedPinOnce}</p>
                </div>
              ) : null}

              {activeAccess ? <button type="button" onClick={() => setShowRevokeConfirm(true)} className="w-full text-center text-sm font-semibold text-red-600 hover:underline">{copy.revokeAccess}</button> : null}
            </>
          )}
        </section>
      </KioskModalFrame>

      <ConfirmDeleteDialog
        cancelLabel={t.common.cancel}
        confirmDisabled={isSaving}
        confirmLabel={copy.revokeAccess}
        description={copy.deactivateDescription}
        isVisible={showRevokeConfirm}
        itemName={provider?.name}
        onCancel={() => setShowRevokeConfirm(false)}
        onConfirm={revoke}
        title={copy.revokeAccess}
      />
    </>
  );
}
