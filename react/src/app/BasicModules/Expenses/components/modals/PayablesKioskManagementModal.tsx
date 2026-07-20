import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CircleDollarSign,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { IndiceModalSummary, IndiceModalValidation } from '../../../../components/indice-modal';
import { KioskAdminActionButton, KioskAdminPanelAction } from '../../../../components/kiosk-engine/KioskAdminPrimitives';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { useKioskQrCode } from '../../../../components/kiosk-engine/useKioskQrCode';
import { DEFAULT_FINANCE_CURRENCY } from '../../constants/financeCurrencyOptions';
import type { Provider } from '../../types/expenses.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import {
  payableKiosksService,
  type PayableKiosk,
  type PayableKioskBiometricPolicy,
  type PayableKioskProviderAccess,
  type PayableKioskPayload,
} from '../../services';
import { PayablesKioskAccessFormModal } from './PayablesKioskAccessFormModal';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';

type PayablesKioskManagementModalProps = {
  businessOptions: FinanceReferenceOption[];
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  providers: Provider[];
  unitOptions: FinanceReferenceOption[];
};

export type PayableKioskFormState = {
  businessId: string;
  currencyCode: string;
  name: string;
  unitId: string;
};

const emptyForm: PayableKioskFormState = {
  businessId: '',
  currencyCode: DEFAULT_FINANCE_CURRENCY,
  name: '',
  unitId: '',
};

export function PayablesKioskManagementModal({
  businessOptions,
  isOpen,
  onClose,
  onError,
  onSuccess,
  unitOptions,
}: PayablesKioskManagementModalProps) {
  const t = useExpensesTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const copyText = t.expenses.payablesKiosk;
  const [editing, setEditing] = useState<PayableKiosk | null>(null);
  const [form, setForm] = useState<PayableKioskFormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [kiosks, setKiosks] = useState<PayableKiosk[]>([]);
  const [biometricPolicy, setBiometricPolicy] = useState<PayableKioskBiometricPolicy | null>(null);
  const [providerAccesses, setProviderAccesses] = useState<PayableKioskProviderAccess[]>([]);
  const [pendingDeleteKiosk, setPendingDeleteKiosk] = useState<PayableKiosk | null>(null);
  const [pendingRotateKiosk, setPendingRotateKiosk] = useState<PayableKiosk | null>(null);
  const [shareKioskId, setShareKioskId] = useState<number | null>(null);
  const [optionsKioskId, setOptionsKioskId] = useState<number | null>(null);
  const [qrKioskId, setQrKioskId] = useState<number | null>(null);

  const publicUrl = (kiosk: PayableKiosk) => `${window.location.origin}/expenses/kiosk/cuentas-por-pagar/${kiosk.publicAccessToken}`;
  const activeCount = useMemo(() => kiosks.filter(kiosk => kiosk.status === 'ACTIVE').length, [kiosks]);
  const shareKiosk = kiosks.find(kiosk => kiosk.id === shareKioskId) ?? null;
  const optionsKiosk = kiosks.find(kiosk => kiosk.id === optionsKioskId) ?? null;
  const qrKiosk = kiosks.find(kiosk => kiosk.id === qrKioskId) ?? null;
  const qrDataUrl = useKioskQrCode(qrKiosk ? publicUrl(qrKiosk) : '', '#147514');
  const childViewOpen = Boolean(isFormOpen || shareKiosk || optionsKiosk || qrKiosk || pendingDeleteKiosk || pendingRotateKiosk);
  const optionLabel = (options: FinanceReferenceOption[], id?: number | null) => (
    options.find(option => String(option.value) === String(id))?.label
  );

  useEffect(() => {
    if (!isOpen) return;
    void loadKiosks();
  }, [isOpen]);

  const loadKiosks = async () => {
    setIsLoading(true);
    try {
      const [nextKiosks, nextAccesses, nextBiometricPolicy] = await Promise.all([
        payableKiosksService.list(),
        payableKiosksService.listProviderAccesses(),
        payableKiosksService.biometricPolicy(),
      ]);
      setKiosks(nextKiosks);
      setProviderAccesses(nextAccesses);
      setBiometricPolicy(nextBiometricPolicy);
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, currencyCode: preferredCurrency });
    setIsFormOpen(true);
  };

  const openEdit = (kiosk: PayableKiosk) => {
    setEditing(kiosk);
    setForm({
      businessId: kiosk.businessId ? String(kiosk.businessId) : '',
      currencyCode: kiosk.currencyCode,
      name: kiosk.name,
      unitId: kiosk.unitId ? String(kiosk.unitId) : '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm({ ...emptyForm, currencyCode: preferredCurrency });
  };

  const save = async () => {
    if (!form.name.trim()) {
      onError(copyText.messages.nameRequired);
      return;
    }
    setIsSaving(true);
    try {
      const payload: PayableKioskPayload = {
        businessId: toOptionalNumber(form.businessId),
        code: createCodeFromName(form.name),
        currencyCode: form.currencyCode,
        name: form.name,
        unitId: toOptionalNumber(form.unitId),
      };
      if (editing) {
        await payableKiosksService.update(editing.id, payload);
      } else {
        await payableKiosksService.create(payload);
      }
      onSuccess(editing ? copyText.messages.updated : copyText.messages.created);
      await loadKiosks();
      closeForm();
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteKiosk = async (kiosk: PayableKiosk) => {
    setIsSaving(true);
    try {
      await payableKiosksService.delete(kiosk.id);
      setPendingDeleteKiosk(null);
      onSuccess(copyText.messages.deleted);
      await loadKiosks();
      if (editing?.id === kiosk.id) closeForm();
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.deactivateFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleKiosk = async (kiosk: PayableKiosk) => {
    setIsSaving(true);
    try {
      await payableKiosksService.setEnabled(kiosk.id, kiosk.status !== 'ACTIVE');
      onSuccess(copyText.messages.statusUpdated);
      await loadKiosks();
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.deactivateFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const rotateLink = async (kiosk: PayableKiosk) => {
    setIsSaving(true);
    try {
      await payableKiosksService.rotatePublicAccessToken(kiosk.id);
      setPendingRotateKiosk(null);
      onSuccess(copyText.messages.linkRotated);
      await loadKiosks();
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBiometrics = async () => {
    if (!biometricPolicy) return;
    setIsSaving(true);
    try {
      const nextPolicy = await payableKiosksService.updateBiometricPolicy(!biometricPolicy.enabled);
      setBiometricPolicy(nextPolicy);
      onSuccess(copyText.messages.biometricPolicyUpdated);
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.biometricPolicyFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    onSuccess(message);
  };

  return (
    <>
      <KioskModalFrame
        busy={isSaving}
        description={copyText.configureDescription}
        footer={(
          <button type="button" disabled={isSaving} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" onClick={onClose}>{t.common.cancel}</button>
        )}
        footerSummary={copyText.activeCount(activeCount, kiosks.length)}
        icon={<Store className="h-5 w-5" />}
        onOpenChange={(open) => !open && !childViewOpen && onClose()}
        open={isOpen && !childViewOpen}
        size="workspace"
        surface="administration"
        title={copyText.configureTitle}
        tone="green"
      >
            {biometricPolicy && (
              <section className="mb-4 flex flex-col gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/25 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-emerald-950 dark:text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{copyText.biometricPolicy.title}</h4>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{copyText.biometricPolicy.description}</p>
                    {!biometricPolicy.environmentAvailable && (
                      <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{copyText.biometricPolicy.environmentUnavailable}</p>
                    )}
                  </div>
                </div>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 dark:border-emerald-800 dark:bg-slate-950">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {biometricPolicy.enabled ? copyText.biometricPolicy.enabled : copyText.biometricPolicy.disabled}
                  </span>
                  <input
                    aria-label={copyText.biometricPolicy.toggle}
                    checked={biometricPolicy.enabled}
                    className="h-5 w-5 accent-emerald-700"
                    disabled={isSaving}
                    onChange={() => void toggleBiometrics()}
                    type="checkbox"
                  />
                </label>
              </section>
            )}
            <div className="mb-4">
              <IndiceModalSummary
                columns={3}
                items={[
                  { label: 'Total de kioskos', value: kiosks.length, emphasized: true },
                  { label: 'Activos', value: activeCount },
                  { label: 'Proveedores con acceso', value: providerAccesses.filter(access => access.status === 'ACTIVE').length },
                ]}
              />
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{copyText.configuredAccess}</h4>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{copyText.activeCount(activeCount, kiosks.length)}</p>
                </div>
                <Button type="button" onClick={openCreate} className="h-10 rounded-xl bg-[#147514] px-4 text-white hover:bg-[#105f10]">
                  <Plus className="h-4 w-4" />
                  {copyText.newAccess}
                </Button>
              </div>

              {isLoading ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {copyText.loading}
              </div>
            ) : kiosks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{copyText.emptyTitle}</p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copyText.emptyDescription}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kiosks.map(kiosk => (
                  <article key={kiosk.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-800">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${kiosk.status === 'ACTIVE' ? 'bg-emerald-50 text-[#147514] dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                          <Store className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-slate-950 dark:text-white">{kiosk.name}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${kiosk.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${kiosk.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {kiosk.status === 'ACTIVE' ? t.common.active : t.common.inactive}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{copyText.mobilePortal}</p>
                        </div>
                      </div>

                      <div className="grid shrink-0 grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-end" aria-label={`Acciones de ${kiosk.name}`}>
                        <KioskAdminActionButton accent="green" label={t.common.edit} onClick={() => openEdit(kiosk)} tone="primary"><Pencil className="h-4 w-4" /></KioskAdminActionButton>
                        <KioskAdminActionButton accent="green" disabled={kiosk.status !== 'ACTIVE'} label={copyText.open} onClick={() => window.open(publicUrl(kiosk), '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" /></KioskAdminActionButton>
                        <KioskAdminActionButton accent="green" label="Compartir y administrar liga" onClick={() => setShareKioskId(kiosk.id)}><Share2 className="h-4 w-4" /></KioskAdminActionButton>
                        <KioskAdminActionButton accent="green" label="Más opciones" onClick={() => setOptionsKioskId(kiosk.id)}><MoreHorizontal className="h-4 w-4" /></KioskAdminActionButton>
                      </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <KioskInfoPanel
                          icon={<Building2 className="h-4 w-4" />}
                          label={copyText.kioskScope}
                          value={`${optionLabel(unitOptions, kiosk.unitId) ?? copyText.allUnits} · ${optionLabel(businessOptions, kiosk.businessId) ?? copyText.allBusinesses}`}
                        />
                        <KioskInfoPanel
                          icon={<CircleDollarSign className="h-4 w-4" />}
                          label={copyText.kioskSettings}
                          value={`${kiosk.currencyCode} · ${copyText.providerRegistrationEnabled}`}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <KioskMeta label={copyText.accessReady} />
                        <KioskMeta label={copyText.providerAccessCount(providerAccesses.filter(access => access.kioskId === kiosk.id && access.status === 'ACTIVE').length)} />
                        <KioskMeta icon={<CircleDollarSign className="h-3.5 w-3.5" />} label={kiosk.currencyCode} />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 sm:px-5">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>El portal limita la operación al registro de cuentas por pagar y al proveedor o colaborador identificado.</span>
                    </div>
                  </article>
                ))}
              </div>
              )}
            </div>
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel="Cerrar administración de liga"
        description={shareKiosk ? `Administra la liga pública de ${shareKiosk.name}.` : 'Liga pública del kiosko.'}
        footer={<Button type="button" variant="outline" onClick={() => setShareKioskId(null)}>{t.common.cancel}</Button>}
        icon={<Share2 className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setShareKioskId(null); }}
        open={isOpen && Boolean(shareKiosk)}
        size="compact"
        surface="administration"
        title="Liga del kiosko"
        tone="green"
      >
        {shareKiosk ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514]"><Link2 className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-950 dark:text-white">{shareKiosk.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{shareKiosk.currencyCode} · {shareKiosk.status === 'ACTIVE' ? t.common.active : t.common.inactive}</p></div>
              </div>
            </div>
            <IndiceModalValidation tone="info" title="Liga disponible" messages={['Puedes abrirla, copiarla o convertirla en código QR. Reemplazarla invalida inmediatamente la liga anterior.']} />
            <div className="grid gap-2">
              <KioskAdminPanelAction accent="green" primary disabled={shareKiosk.status !== 'ACTIVE'} icon={<ExternalLink className="h-4 w-4" />} label={copyText.open} onClick={() => window.open(publicUrl(shareKiosk), '_blank', 'noopener,noreferrer')} />
              <KioskAdminPanelAction accent="green" icon={<Copy className="h-4 w-4" />} label={copyText.copyLink} onClick={() => void copy(publicUrl(shareKiosk), copyText.messages.linkCopied)} />
              <KioskAdminPanelAction accent="green" icon={<QrCode className="h-4 w-4" />} label="Mostrar código QR" onClick={() => { setShareKioskId(null); setQrKioskId(shareKiosk.id); }} />
              <KioskAdminPanelAction accent="green" icon={<RefreshCw className="h-4 w-4" />} label={copyText.rotateLink} onClick={() => { setShareKioskId(null); setPendingRotateKiosk(shareKiosk); }} />
            </div>
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        busy={isSaving}
        closeLabel="Cerrar opciones"
        description={optionsKiosk ? `Gestiona el estado de ${optionsKiosk.name}.` : 'Opciones del kiosko.'}
        footer={<Button type="button" variant="outline" onClick={() => setOptionsKioskId(null)}>{t.common.cancel}</Button>}
        icon={<MoreHorizontal className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setOptionsKioskId(null); }}
        open={isOpen && Boolean(optionsKiosk)}
        size="compact"
        surface="administration"
        title="Opciones del kiosko"
        tone="green"
      >
        {optionsKiosk ? (
          <div className="space-y-3">
            <KioskAdminPanelAction
              accent="green"
              disabled
              description="Solo las personas identificadas pueden operar dentro del alcance configurado."
              icon={<KeyRound className="h-4 w-4" />}
              label={copyText.providerAccessCount(providerAccesses.filter(access => access.kioskId === optionsKiosk.id && access.status === 'ACTIVE').length)}
              onClick={() => undefined}
            />
            <KioskAdminPanelAction
              accent="green"
              primary={optionsKiosk.status !== 'ACTIVE'}
              description={optionsKiosk.status === 'ACTIVE' ? 'Es reversible y conserva proveedores, cuentas y documentos.' : 'Permite utilizar nuevamente la liga vigente.'}
              icon={<Power className="h-4 w-4" />}
              label={optionsKiosk.status === 'ACTIVE' ? copyText.deactivate : copyText.enable}
              onClick={() => { setOptionsKioskId(null); void toggleKiosk(optionsKiosk); }}
            />
            <KioskAdminPanelAction
              accent="green"
              danger
              description={copyText.deleteKioskDescription}
              icon={<Trash2 className="h-4 w-4" />}
              label={copyText.deleteKiosk}
              onClick={() => { setOptionsKioskId(null); setPendingDeleteKiosk(optionsKiosk); }}
            />
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel="Cerrar código QR"
        description={qrKiosk ? `Comparte el acceso autorizado de ${qrKiosk.name}.` : 'Código de acceso del kiosko.'}
        footer={<Button type="button" variant="outline" onClick={() => setQrKioskId(null)}>{t.common.cancel}</Button>}
        icon={<QrCode className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setQrKioskId(null); }}
        open={isOpen && Boolean(qrKiosk)}
        size="compact"
        surface="administration"
        title="Código QR del kiosko"
        tone="green"
      >
        <div className="flex flex-col items-center text-center">
          {qrDataUrl ? <img src={qrDataUrl} alt={`Código QR del kiosko ${qrKiosk?.name ?? ''}`} className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" /> : <p className="py-16 text-sm font-medium text-slate-600">Generando código QR seguro...</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">Compártelo únicamente con proveedores o colaboradores autorizados.</p>
        </div>
      </KioskModalFrame>

      <PayablesKioskAccessFormModal
        businessOptions={businessOptions}
        editing={editing}
        form={form}
        isOpen={isFormOpen}
        isSaving={isSaving}
        onClose={closeForm}
        onFormChange={setForm}
        onSave={save}
        unitOptions={unitOptions}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(pendingDeleteKiosk)}
        title={copyText.deleteKioskTitle}
        description={copyText.deleteKioskDescription}
        itemName={pendingDeleteKiosk?.name}
        confirmLabel={copyText.deleteKiosk}
        cancelLabel={t.common.cancel}
        confirmDisabled={isSaving}
        onCancel={() => setPendingDeleteKiosk(null)}
        onConfirm={() => pendingDeleteKiosk && void deleteKiosk(pendingDeleteKiosk)}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(pendingRotateKiosk)}
        title={copyText.rotateLinkTitle}
        description={copyText.rotateLinkDescription}
        itemName={pendingRotateKiosk?.name}
        confirmLabel={copyText.rotateLinkConfirm}
        cancelLabel={t.common.cancel}
        confirmDisabled={isSaving}
        onCancel={() => setPendingRotateKiosk(null)}
        onConfirm={() => pendingRotateKiosk && void rotateLink(pendingRotateKiosk)}
      />
    </>
  );
}

function KioskMeta({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function KioskInfoPanel({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><span className="text-[#147514]">{icon}</span>{label}</div>
      <p className="mt-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function toOptionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function createCodeFromName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `payable-kiosk-${Date.now()}`;
}
