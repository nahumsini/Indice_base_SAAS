import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Store,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import { DEFAULT_FINANCE_CURRENCY } from '../../constants/financeCurrencyOptions';
import type { Provider } from '../../types/expenses.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import {
  payableKiosksService,
  type PayableKiosk,
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
  const [providerAccesses, setProviderAccesses] = useState<PayableKioskProviderAccess[]>([]);
  const [pendingDeleteKiosk, setPendingDeleteKiosk] = useState<PayableKiosk | null>(null);

  const publicUrl = (kiosk: PayableKiosk) => `${window.location.origin}/expenses/kiosk/cuentas-por-pagar/${kiosk.publicAccessToken}`;
  const activeCount = useMemo(() => kiosks.filter(kiosk => kiosk.status === 'ACTIVE').length, [kiosks]);
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
      const [nextKiosks, nextAccesses] = await Promise.all([
        payableKiosksService.list(),
        payableKiosksService.listProviderAccesses(),
      ]);
      setKiosks(nextKiosks);
      setProviderAccesses(nextAccesses);
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
      onSuccess(copyText.messages.deactivated);
      await loadKiosks();
      if (editing?.id === kiosk.id) closeForm();
    } catch (error) {
      onError(error instanceof Error ? error.message : copyText.messages.deactivateFailed);
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
      <IndiceModalFrame
        busy={isSaving}
        contentClassName="sm:max-w-[760px]"
        description={copyText.configureDescription}
        footer={(
          <button type="button" disabled={isSaving} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50" onClick={onClose}>{t.common.cancel}</button>
        )}
        footerSummary={copyText.activeCount(activeCount, kiosks.length)}
        icon={<Store className="h-5 w-5" />}
        modalType="standard-form"
        onOpenChange={(open) => !open && !isFormOpen && !pendingDeleteKiosk && onClose()}
        open={isOpen && !isFormOpen && !pendingDeleteKiosk}
        title={copyText.configureTitle}
        tone="green"
      >
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

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <KioskAction ariaLabel={t.common.edit} onClick={() => openEdit(kiosk)} icon={<Pencil className="h-4 w-4" />} />
                        <KioskAction ariaLabel="Link" onClick={() => copy(publicUrl(kiosk), copyText.messages.linkCopied)} icon={<Copy className="h-4 w-4" />} />
                        <button type="button" onClick={() => window.open(publicUrl(kiosk), '_blank', 'noopener,noreferrer')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-semibold text-white transition hover:bg-[#105f10]">
                          {copyText.open} <ExternalLink className="h-4 w-4" />
                        </button>
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
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/40 sm:px-5">
                      <p className="min-w-0 truncate font-mono text-[11px] font-semibold text-slate-400">{publicUrl(kiosk)}</p>
                      <button type="button" onClick={() => setPendingDeleteKiosk(kiosk)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" /> {copyText.deactivate}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              )}
            </div>
      </IndiceModalFrame>

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
        title={copyText.deactivateTitle}
        description={copyText.deactivateDescription}
        itemName={pendingDeleteKiosk?.name}
        confirmLabel={copyText.deactivate}
        cancelLabel={t.common.cancel}
        confirmDisabled={isSaving}
        onCancel={() => setPendingDeleteKiosk(null)}
        onConfirm={() => pendingDeleteKiosk && void deleteKiosk(pendingDeleteKiosk)}
      />
    </>
  );
}

function KioskAction({ ariaLabel, icon, onClick }: { ariaLabel: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} title={ariaLabel} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40">
      {icon}
    </button>
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
