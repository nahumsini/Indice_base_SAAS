import { type ReactNode } from 'react';
import { KeyRound, Loader2, Store, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '../../../../components/ui/dialog';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { PayableKiosk } from '../../services';
import type { PayableKioskFormState } from './PayablesKioskManagementModal';

type PayablesKioskAccessFormModalProps = {
  businessOptions: FinanceReferenceOption[];
  editing: PayableKiosk | null;
  form: PayableKioskFormState;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onCopyPin: () => void;
  onFormChange: (form: PayableKioskFormState) => void;
  onSave: () => void;
  unitOptions: FinanceReferenceOption[];
  visiblePin: string;
};

const inputClass = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15';
const payableKioskCurrencyOptions = ['MXN', 'USD', 'CAD', 'COP', 'BRL', 'EUR', 'GBP', 'CLP', 'PEN', 'ARS'];

export function PayablesKioskAccessFormModal({
  businessOptions,
  editing,
  form,
  isOpen,
  isSaving,
  onClose,
  onCopyPin,
  onFormChange,
  onSave,
  unitOptions,
  visiblePin,
}: PayablesKioskAccessFormModalProps) {
  const update = (patch: Partial<PayableKioskFormState>) => onFormChange({ ...form, ...patch });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton className="max-h-[calc(100vh-1rem)] w-[min(94vw,560px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-[#147514] px-5 py-5 text-white sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Store className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                {editing ? 'Editar acceso' : 'Nuevo acceso'}
              </p>
              <DialogTitle className="mt-1 text-2xl font-black text-white">
                {editing ? 'Actualizar kiosko CxP' : 'Crear acceso CxP'}
              </DialogTitle>
              <p className="mt-1 text-sm font-semibold text-white/80">
                Define quien puede entrar, con que alcance operativo y en que divisa captura cuentas por pagar.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 hover:bg-white/20" type="button">
            <X className="h-5 w-5" />
          </button>
        </header>

        <section className="max-h-[calc(100vh-13rem)] overflow-y-auto bg-slate-50 p-4 sm:p-5">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4">
              <Field label="Nombre" required>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={event => update({ name: event.target.value })}
                  placeholder="Kiosko proveedores Cancun"
                />
              </Field>

              <Field label="Tipo">
                <select className={inputClass} value={form.accessType} onChange={event => update({ accessType: event.target.value as PayableKioskFormState['accessType'] })}>
                  <option value="MIXED">Proveedor o empleado</option>
                  <option value="PROVIDER">Solo proveedor</option>
                  <option value="EMPLOYEE">Solo empleado</option>
                  <option value="PROVIDER_REGISTRATION">Registro de proveedor</option>
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unidad">
                  <select className={inputClass} value={form.unitId} onChange={event => update({ unitId: event.target.value, businessId: '' })}>
                    <option value="">Todas</option>
                    {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Negocio">
                  <select className={inputClass} value={form.businessId} onChange={event => update({ businessId: event.target.value })}>
                    <option value="">Todos</option>
                    {businessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Divisa">
                  <select className={inputClass} value={form.currencyCode} onChange={event => update({ currencyCode: event.target.value })}>
                    {payableKioskCurrencyOptions.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </Field>
                <Field label="Estado">
                  <select className={inputClass} value={form.status} onChange={event => update({ status: event.target.value as PayableKioskFormState['status'] })}>
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </Field>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                <input
                  type="checkbox"
                  checked={form.allowProviderRegistration}
                  onChange={event => update({ allowProviderRegistration: event.target.checked })}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  Permitir registro de proveedor
                  <span className="mt-1 block text-xs font-semibold text-emerald-700">
                    Si un proveedor no existe, podra registrarse desde el kiosko antes de capturar su cuenta por pagar.
                  </span>
                </span>
              </label>

              {visiblePin ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                    <KeyRound className="h-4 w-4" />
                    PIN generado
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <code className="rounded-xl bg-white px-4 py-3 text-2xl font-black text-slate-950 shadow-sm">{visiblePin}</code>
                    <Button type="button" variant="outline" className="h-11 rounded-xl bg-white" onClick={onCopyPin}>Copiar PIN</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <DialogFooter className="flex-col gap-3 bg-[#147514] px-5 py-4 sm:flex-row sm:px-6">
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" disabled={isSaving} className="h-11 w-full rounded-xl bg-white text-[#147514] hover:bg-slate-100 sm:w-auto" onClick={onSave}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? 'Guardar cambios' : 'Crear acceso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ children, label, required }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
