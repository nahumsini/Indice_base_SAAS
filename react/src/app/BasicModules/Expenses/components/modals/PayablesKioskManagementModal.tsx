import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
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
  Search,
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
  initialKioskId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
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
  initialKioskId,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pendingBiometricEnabled, setPendingBiometricEnabled] = useState<boolean | null>(null);
  const [formError, setFormError] = useState('');
  const openedInitialKioskId = useRef<number | null>(null);

  const publicUrl = (kiosk: PayableKiosk) => `${window.location.origin}/expenses/kiosk/cuentas-por-pagar/${kiosk.publicAccessToken}`;
  const optionLabel = (options: FinanceReferenceOption[], id?: number | null) => (
    options.find(option => String(option.value) === String(id))?.label
  );
  const activeCount = useMemo(() => kiosks.filter(kiosk => kiosk.status === 'ACTIVE').length, [kiosks]);
  const activeProviderAccessCount = useMemo(
    () => providerAccesses.filter(access => access.status === 'ACTIVE').length,
    [providerAccesses],
  );
  const filteredKiosks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return kiosks.filter(kiosk => {
      if (statusFilter !== 'ALL' && kiosk.status !== statusFilter) return false;
      if (!query) return true;
      const scope = `${optionLabel(unitOptions, kiosk.unitId) ?? copyText.allUnits} ${optionLabel(businessOptions, kiosk.businessId) ?? copyText.allBusinesses}`;
      return `${kiosk.name} ${kiosk.currencyCode} ${scope}`.toLocaleLowerCase().includes(query);
    });
  }, [businessOptions, copyText.allBusinesses, copyText.allUnits, kiosks, searchQuery, statusFilter, unitOptions]);
  const shareKiosk = kiosks.find(kiosk => kiosk.id === shareKioskId) ?? null;
  const optionsKiosk = kiosks.find(kiosk => kiosk.id === optionsKioskId) ?? null;
  const qrKiosk = kiosks.find(kiosk => kiosk.id === qrKioskId) ?? null;
  const qrDataUrl = useKioskQrCode(qrKiosk ? publicUrl(qrKiosk) : '', '#147514');
  const childViewOpen = Boolean(isFormOpen || shareKiosk || optionsKiosk || qrKiosk || pendingDeleteKiosk || pendingRotateKiosk || pendingBiometricEnabled !== null);
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
    setFormError('');
    setEditing(null);
    setForm({ ...emptyForm, currencyCode: preferredCurrency });
    setIsFormOpen(true);
  };

  const openEdit = (kiosk: PayableKiosk) => {
    setFormError('');
    setEditing(kiosk);
    setForm({
      businessId: kiosk.businessId ? String(kiosk.businessId) : '',
      currencyCode: kiosk.currencyCode,
      name: kiosk.name,
      unitId: kiosk.unitId ? String(kiosk.unitId) : '',
    });
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (!isOpen || !initialKioskId || openedInitialKioskId.current === initialKioskId) return;
    const initialKiosk = kiosks.find(kiosk => kiosk.id === initialKioskId);
    if (!initialKiosk) return;
    openedInitialKioskId.current = initialKioskId;
    openEdit(initialKiosk);
  }, [initialKioskId, isOpen, kiosks]);

  const closeForm = () => {
    setFormError('');
    setIsFormOpen(false);
    setEditing(null);
    setForm({ ...emptyForm, currencyCode: preferredCurrency });
  };

  const save = async () => {
    const normalizedName = form.name.trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 3) {
      setFormError('Escribe un nombre descriptivo de al menos 3 caracteres.');
      return;
    }
    if (kiosks.some(kiosk => kiosk.id !== editing?.id && kiosk.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      setFormError('Ya existe un kiosco con ese nombre. Usa un nombre único para poder identificarlo.');
      return;
    }
    setFormError('');
    setIsSaving(true);
    try {
      const payload: PayableKioskPayload = {
        businessId: toOptionalNumber(form.businessId),
        code: createCodeFromName(normalizedName),
        currencyCode: form.currencyCode,
        name: normalizedName,
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

  const toggleBiometrics = async (enabled: boolean) => {
    if (!biometricPolicy) return;
    setIsSaving(true);
    try {
      const nextPolicy = await payableKiosksService.updateBiometricPolicy(enabled);
      setBiometricPolicy(nextPolicy);
      setPendingBiometricEnabled(null);
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
        icon={<Store className="h-5 w-5" />}
        onOpenChange={(open) => !open && !childViewOpen && onClose()}
        open={isOpen && !childViewOpen}
        size="workspace"
        surface="administration"
        title={copyText.configureTitle}
        tone="green"
      >
        <div className="space-y-4">
          <IndiceModalSummary
            columns={3}
            items={[
              { label: 'Kioscos activos', value: activeCount, emphasized: true },
              { label: 'Kioscos inactivos', value: kiosks.length - activeCount },
              { label: 'Proveedores con acceso', value: activeProviderAccessCount },
            ]}
          />

          {biometricPolicy && (
            <details
              className="group rounded-[22px] border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/25"
              onToggle={event => setSecurityOpen(event.currentTarget.open)}
              open={securityOpen}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span>
                  <div><h4 className="text-sm font-medium text-slate-900 dark:text-white">Seguridad e identidad</h4><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Biometría facial para los accesos de proveedores.</p></div>
                </div>
                <div className="flex items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:bg-slate-950">{biometricPolicy.enabled ? copyText.biometricPolicy.enabled : copyText.biometricPolicy.disabled}</span><ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" /></div>
              </summary>
              <div className="flex flex-col gap-3 border-t border-emerald-200 px-4 py-4 dark:border-emerald-900 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{copyText.biometricPolicy.description}</p>{!biometricPolicy.environmentAvailable && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{copyText.biometricPolicy.environmentUnavailable}</p>}</div>
                <Button type="button" variant="outline" className="shrink-0" disabled={isSaving} onClick={() => setPendingBiometricEnabled(!biometricPolicy.enabled)}>{biometricPolicy.enabled ? 'Desactivar biometría' : 'Activar biometría'}</Button>
              </div>
            </details>
          )}

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div><h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">{copyText.configuredAccess}</h4><p className="mt-1 text-xs text-slate-500">Administra el alcance, la liga y el estado de cada portal.</p></div>
              <Button type="button" onClick={openCreate} className="h-10 rounded-xl bg-[#147514] px-4 text-white hover:bg-[#105f10]"><Plus className="h-4 w-4" />{copyText.newAccess}</Button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Buscar kiosco</span><input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950" placeholder="Buscar por nombre, alcance o moneda" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></label>
              <select aria-label="Filtrar kioscos por estado" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="ALL">Todos los estados</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option></select>
            </div>

            {isLoading ? (
              <div className="mt-4 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {copyText.loading}</div>
            ) : kiosks.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-slate-100">{copyText.emptyTitle}</p><p className="mt-1 text-sm text-slate-500">{copyText.emptyDescription}</p></div>
            ) : filteredKiosks.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No hay kioscos que coincidan con la búsqueda y el estado seleccionados.</div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {filteredKiosks.map(kiosk => {
                  const accessCount = providerAccesses.filter(access => access.kioskId === kiosk.id && access.status === 'ACTIVE').length;
                  return (
                    <article key={kiosk.id} className="p-4 transition hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-3 xl:w-64"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kiosk.status === 'ACTIVE' ? 'bg-emerald-50 text-[#147514]' : 'bg-slate-100 text-slate-400'}`}><Store className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{kiosk.name}</p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kiosk.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{kiosk.status === 'ACTIVE' ? t.common.active : t.common.inactive}</span></div><p className="mt-1 text-xs text-slate-500">{copyText.mobilePortal}</p></div></div>
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                          <CompactKioskField icon={<Building2 className="h-4 w-4" />} label={copyText.kioskScope} value={`${optionLabel(unitOptions, kiosk.unitId) ?? copyText.allUnits} · ${optionLabel(businessOptions, kiosk.businessId) ?? copyText.allBusinesses}`} />
                          <CompactKioskField icon={<CircleDollarSign className="h-4 w-4" />} label="Moneda" value={kiosk.currencyCode} />
                          <CompactKioskField icon={<KeyRound className="h-4 w-4" />} label="Proveedores" value={copyText.providerAccessCount(accessCount)} />
                        </div>
                        <div className="flex flex-wrap gap-2" aria-label={`Acciones de ${kiosk.name}`}>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(kiosk)}><Pencil className="h-4 w-4" />Editar</Button>
                          <Button type="button" size="sm" variant="outline" disabled={kiosk.status !== 'ACTIVE'} onClick={() => window.open(publicUrl(kiosk), '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" />Abrir</Button>
                          <Button type="button" size="sm" variant="outline" title="Compartir y administrar liga" onClick={() => setShareKioskId(kiosk.id)}><Share2 className="h-4 w-4" />Compartir</Button>
                          <KioskAdminActionButton accent="green" label="Más opciones" onClick={() => setOptionsKioskId(kiosk.id)}><MoreHorizontal className="h-4 w-4" /></KioskAdminActionButton>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500 dark:bg-slate-950/50"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>Los portales solo permiten registrar cuentas por pagar dentro del alcance configurado y para personas identificadas.</span></div>
          </section>
        </div>
      </KioskModalFrame>

      <KioskModalFrame
        busy={isSaving}
        description={pendingBiometricEnabled ? 'La verificación facial quedará disponible para confirmar identidades en los kioscos.' : 'Los kioscos dejarán de ofrecer verificación facial hasta que vuelvas a activarla.'}
        footer={(
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setPendingBiometricEnabled(null)}>{t.common.cancel}</Button>
            <Button type="button" disabled={isSaving} className="bg-[#147514] text-white hover:bg-[#105f10]" onClick={() => pendingBiometricEnabled !== null && void toggleBiometrics(pendingBiometricEnabled)}>{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{pendingBiometricEnabled ? 'Activar biometría' : 'Desactivar biometría'}</Button>
          </div>
        )}
        icon={<ShieldCheck className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setPendingBiometricEnabled(null); }}
        open={isOpen && pendingBiometricEnabled !== null}
        size="compact"
        surface="administration"
        title={pendingBiometricEnabled ? 'Activar biometría facial' : 'Desactivar biometría facial'}
        tone="green"
      >
        <IndiceModalValidation
          tone={pendingBiometricEnabled ? 'info' : 'warning'}
          title="Confirma el cambio global"
          messages={['Esta configuración afecta todos los kioscos de cuentas por pagar de la empresa. Los registros existentes no se modifican.']}
        />
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
                <div className="min-w-0"><p className="text-sm font-medium text-slate-950 dark:text-white">{shareKiosk.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{shareKiosk.currencyCode} · {shareKiosk.status === 'ACTIVE' ? t.common.active : t.common.inactive}</p></div>
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
        nameError={formError}
        onClose={closeForm}
        onFormChange={(nextForm) => { setFormError(''); setForm(nextForm); }}
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

function CompactKioskField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><span className="text-[#147514]">{icon}</span>{label}</div>
      <p className="mt-1 truncate text-xs font-medium text-slate-800 dark:text-slate-100" title={value}>{value}</p>
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
