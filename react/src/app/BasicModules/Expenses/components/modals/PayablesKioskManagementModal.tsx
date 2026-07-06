import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, KeyRound, Loader2, Plus, Store, Trash2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '../../../../components/ui/dialog';
import { DEFAULT_FINANCE_CURRENCY } from '../../constants/financeCurrencyOptions';
import type { Provider } from '../../types/expenses.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import {
  payableKiosksService,
  type PayableKiosk,
  type PayableKioskAccessType,
  type PayableKioskPayload,
} from '../../services';
import { PayablesKioskAccessFormModal } from './PayablesKioskAccessFormModal';

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
  accessType: PayableKioskAccessType;
  allowProviderRegistration: boolean;
  businessId: string;
  currencyCode: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  unitId: string;
};

export const payableKioskCurrencyOptions = ['MXN', 'USD', 'CAD', 'COP', 'BRL', 'EUR', 'GBP', 'CLP', 'PEN', 'ARS'];

const emptyForm: PayableKioskFormState = {
  accessType: 'MIXED',
  allowProviderRegistration: true,
  businessId: '',
  currencyCode: DEFAULT_FINANCE_CURRENCY,
  name: '',
  status: 'ACTIVE',
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
  const [editing, setEditing] = useState<PayableKiosk | null>(null);
  const [form, setForm] = useState<PayableKioskFormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [kiosks, setKiosks] = useState<PayableKiosk[]>([]);
  const [visiblePin, setVisiblePin] = useState('');

  const publicUrl = (kiosk: PayableKiosk) => `${window.location.origin}/expenses/kiosk/cuentas-por-pagar/${kiosk.publicAccessToken}`;
  const activeCount = useMemo(() => kiosks.filter(kiosk => kiosk.status === 'ACTIVE').length, [kiosks]);

  useEffect(() => {
    if (!isOpen) return;
    void loadKiosks();
  }, [isOpen]);

  const loadKiosks = async () => {
    setIsLoading(true);
    try {
      setKiosks(await payableKiosksService.list());
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudieron cargar los kioskos.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setVisiblePin('');
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (kiosk: PayableKiosk) => {
    setEditing(kiosk);
    setVisiblePin('');
    setForm({
      accessType: kiosk.accessType,
      allowProviderRegistration: kiosk.allowProviderRegistration,
      businessId: kiosk.businessId ? String(kiosk.businessId) : '',
      currencyCode: kiosk.currencyCode,
      name: kiosk.name,
      status: kiosk.status,
      unitId: kiosk.unitId ? String(kiosk.unitId) : '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setVisiblePin('');
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.name.trim()) {
      onError('El nombre del acceso es requerido.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: PayableKioskPayload = {
        accessType: form.accessType,
        allowProviderRegistration: form.allowProviderRegistration,
        businessId: toOptionalNumber(form.businessId),
        code: createCodeFromName(form.name),
        currencyCode: form.currencyCode,
        name: form.name,
        providerId: null,
        status: form.status,
        unitId: toOptionalNumber(form.unitId),
      };
      const saved = editing
        ? await payableKiosksService.update(editing.id, payload)
        : await payableKiosksService.create(payload);
      setVisiblePin(saved.pin ?? '');
      onSuccess(editing ? 'Kiosko actualizado.' : 'Kiosko creado. Copia el PIN antes de cerrar.');
      await loadKiosks();
      if (editing || !saved.pin) {
        closeForm();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo guardar el kiosko.');
    } finally {
      setIsSaving(false);
    }
  };

  const rotatePin = async (kiosk: PayableKiosk) => {
    setIsSaving(true);
    try {
      const saved = await payableKiosksService.rotatePin(kiosk.id);
      openEdit(kiosk);
      setVisiblePin(saved.pin ?? '');
      onSuccess('PIN actualizado. Copialo antes de cerrar.');
      await loadKiosks();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo cambiar el PIN.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteKiosk = async (kiosk: PayableKiosk) => {
    setIsSaving(true);
    try {
      await payableKiosksService.delete(kiosk.id);
      onSuccess('Kiosko desactivado.');
      await loadKiosks();
      if (editing?.id === kiosk.id) closeForm();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo desactivar el kiosko.');
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent hideCloseButton className="max-h-[calc(100vh-1rem)] w-[min(94vw,760px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-2xl">
          <header className="flex items-start justify-between gap-4 bg-[#147514] px-5 py-5 text-white sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <Store className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Payables kiosk</p>
                <DialogTitle className="mt-1 text-2xl font-black text-white">Configurar kiosko CxP</DialogTitle>
                <p className="mt-1 max-w-xl text-sm font-semibold text-white/80">Controla accesos para proveedores y empleados sin acceso completo al modulo.</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 hover:bg-white/20" type="button">
              <X className="h-5 w-5" />
            </button>
          </header>

          <section className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">Accesos configurados</p>
                <p className="text-xs font-semibold text-slate-500">{activeCount} activos de {kiosks.length}</p>
              </div>
              <Button type="button" onClick={openCreate} className="h-11 rounded-xl bg-[#147514] text-white hover:bg-[#105010]">
                <Plus className="h-4 w-4" />
                Nuevo acceso
              </Button>
            </div>

            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando accesos
              </div>
            ) : kiosks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-base font-black text-slate-900">Todavia no hay accesos CxP.</p>
                <p className="mt-1 text-sm font-medium text-slate-500">Crea un kiosko para compartir un link controlado.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {kiosks.map(kiosk => (
                  <article key={kiosk.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-900">{kiosk.name}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{kiosk.accessType} - {kiosk.currencyCode}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${kiosk.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {kiosk.status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <KioskAction onClick={() => openEdit(kiosk)}>Editar</KioskAction>
                      <KioskAction onClick={() => copy(publicUrl(kiosk), 'Link copiado.')} icon={<Copy className="h-4 w-4" />}>Link</KioskAction>
                      <KioskAction onClick={() => window.open(publicUrl(kiosk), '_blank', 'noopener,noreferrer')} icon={<ExternalLink className="h-4 w-4" />}>Abrir</KioskAction>
                      <KioskAction onClick={() => rotatePin(kiosk)} icon={<KeyRound className="h-4 w-4" />}>PIN</KioskAction>
                      <button type="button" onClick={() => deleteKiosk(kiosk)} className="col-span-2 h-10 rounded-xl border border-red-100 bg-white text-sm font-bold text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-2 inline h-4 w-4" /> Desactivar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <DialogFooter className="gap-3 bg-[#147514] px-6 py-4">
            <Button type="button" variant="outline" className="h-10 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PayablesKioskAccessFormModal
        businessOptions={businessOptions}
        editing={editing}
        form={form}
        isOpen={isFormOpen}
        isSaving={isSaving}
        onClose={closeForm}
        onCopyPin={() => copy(visiblePin, 'PIN copiado.')}
        onFormChange={setForm}
        onSave={save}
        unitOptions={unitOptions}
        visiblePin={visiblePin}
      />
    </>
  );
}

function KioskAction({ children, icon, onClick }: { children: React.ReactNode; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
      {icon ? <span className="mr-2 inline-flex align-[-2px]">{icon}</span> : null}
      {children}
    </button>
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
