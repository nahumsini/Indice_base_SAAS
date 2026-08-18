import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck, Monitor, ShoppingBasket } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import { selfServiceKioskApi, type PosCashRegisterOption } from '../SelfServiceKiosk/selfServiceKioskApi';
import { customerDisplayApi } from '../shared/customerDisplay/customerDisplayApi';
import { PreticketValidityField } from './PreticketValidityField';

export type StandardKioskCreationType = 'customer-display' | 'self-service';

type Props = {
  type: StandardKioskCreationType;
  onClose: () => void;
  onCreated: (name: string) => void;
};

const steps = ['Experiencia', 'Información', 'Asignación', 'Catálogo', 'Acceso', 'Resumen'];

export function StandardKioskCreationFlow({ type, onClose, onCreated }: Props) {
  const isDisplay = type === 'customer-display';
  const [step, setStep] = useState(1);
  const [registers, setRegisters] = useState<PosCashRegisterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [cashRegisterId, setCashRegisterId] = useState<number | null>(null);
  const [showStock, setShowStock] = useState(true);
  const [customerNameRequired, setCustomerNameRequired] = useState(false);
  const [maxItems, setMaxItems] = useState(30);
  const [preticketTtl, setPreticketTtl] = useState(120);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    let active = true;
    void selfServiceKioskApi.listCashRegisters()
      .then((items) => {
        if (!active) return;
        setRegisters(items.filter((item) => item.active && item.unitId && item.businessId && item.warehouseId));
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las cajas.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectedRegister = useMemo(
    () => registers.find((register) => register.id === cashRegisterId) ?? null,
    [cashRegisterId, registers],
  );

  const title = isDisplay ? 'Crear pantalla de cliente' : 'Crear autoservicio y pre-ticket';
  const experience = isDisplay ? 'Pantalla de cliente' : 'Autoservicio y pre-ticket';
  const icon = isDisplay ? <Monitor className="h-5 w-5" /> : <ShoppingBasket className="h-5 w-5" />;

  const canContinue = step === 1
    || (step === 2 && name.trim().length >= 3)
    || (step === 3 && selectedRegister !== null)
    || step === 4
    || step === 5;

  const create = async () => {
    if (!selectedRegister) return;
    setSaving(true);
    setError('');
    try {
      if (isDisplay) {
        await customerDisplayApi.createPairingCode({ cashRegisterId: selectedRegister.id, deviceName: name.trim() });
      } else {
        await selfServiceKioskApi.createAdmin({
          cashRegisterId: selectedRegister.id,
          name: name.trim(),
          expiresAt: expiresAt || null,
          showStock,
          customerNameRequired,
          maxItemsPerTicket: maxItems,
          preticketTtlMinutes: preticketTtl,
        });
      }
      onCreated(name.trim());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el kiosco.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosModalFrame
      closeLabel="Cerrar asistente"
      eyebrow="Kiosk Engine V2"
      icon={icon}
      isCloseDisabled={saving}
      modalType="wizard"
      onClose={onClose}
      title={title}
      subtitle="Completa los datos indispensables; los ajustes posteriores se administran desde la tabla."
      bodyClassName="p-0 sm:p-0"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={<span className="text-sm font-medium">Paso {step} de 6</span>}
      footer={(
        <div className="flex w-full gap-2 sm:w-auto">
          {step > 1 ? (
            <button type="button" className={posModalSecondaryActionClassName} disabled={saving} onClick={() => { setError(''); setStep((current) => current - 1); }}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          ) : null}
          {step < 6 ? (
            <button type="button" className={posModalPrimaryActionClassName} disabled={!canContinue || saving} onClick={() => { setError(''); setStep((current) => current + 1); }}>
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className={posModalPrimaryActionClassName} disabled={saving || !selectedRegister} onClick={() => void create()}>
              <Check className="h-4 w-4" /> {saving ? 'Creando…' : 'Crear kiosco'}
            </button>
          )}
        </div>
      )}
    >
      <nav className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Pasos de creación">
        {steps.map((label, index) => {
          const number = index + 1;
          const completed = number < step;
          const active = number === step;
          return (
            <div key={label} className={`rounded-xl border px-3 py-3 text-center text-xs font-medium ${completed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : active ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32]' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
              <CircleCheck className="mx-auto mb-1 h-4 w-4" /> {number}. {label}
            </div>
          );
        })}
      </nav>

      <div className="space-y-5 p-5 sm:p-6">
        {step === 1 ? <StepSection title="Tipo de experiencia" description="Confirma qué pantalla estás creando."><SummaryCard label="Experiencia" value={experience} /><p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Este tipo queda fijo. Para crear otro, cierra el asistente y selecciónalo desde “Crear kiosco”.</p></StepSection> : null}
        {step === 2 ? <StepSection title="Información general" description="Usa un nombre que permita reconocer la pantalla en la tabla."><Field label="Nombre del kiosco"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder={isDisplay ? 'Ej. Pantalla cliente - Caja 01' : 'Ej. Autoservicio entrada norte'} className={inputClassName} /></Field><p className="text-xs text-slate-500">Mínimo 3 caracteres. Después podrás cambiarlo desde Editar.</p></StepSection> : null}
        {step === 3 ? <StepSection title="Asignación operativa" description="La caja determina el almacén, la unidad y el negocio del kiosco.">{loading ? <p className="text-sm text-slate-500">Cargando cajas disponibles…</p> : registers.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No hay cajas activas con almacén, unidad y negocio completos.</p> : <div className="grid gap-3">{registers.map((register) => <button type="button" key={register.id} onClick={() => setCashRegisterId(register.id)} className={`rounded-xl border p-4 text-left ${cashRegisterId === register.id ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className="block font-medium text-[#222831]">{register.name}</span><span className="mt-1 block text-sm text-slate-500">{register.code} · {register.warehouseName}</span><span className="mt-1 block text-xs text-slate-400">Unidad #{register.unitId} · Negocio #{register.businessId}</span></button>)}</div>}</StepSection> : null}
        {step === 4 ? <StepSection title="Catálogo y reglas" description={isDisplay ? 'La pantalla refleja productos, descuentos y totales de la venta en curso.' : 'Define las reglas iniciales del catálogo público.'}>{isDisplay ? <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">No requiere selección de productos: hereda en tiempo real la venta de la caja asignada.</p> : <div className="grid gap-4 sm:grid-cols-2"><Toggle label="Mostrar existencias" checked={showStock} onChange={setShowStock} /><Toggle label="Solicitar nombre del cliente" checked={customerNameRequired} onChange={setCustomerNameRequired} /><Field label="Máximo de artículos"><input type="number" min={1} max={100} value={maxItems} onChange={(event) => setMaxItems(Number(event.target.value))} className={inputClassName} /></Field><PreticketValidityField minutes={preticketTtl} onChange={setPreticketTtl} /></div>}</StepSection> : null}
        {step === 5 ? <StepSection title="Acceso, vigencia y seguridad" description="El enlace protegido se genera al crear y se administra después desde la tabla.">{isDisplay ? <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Se generará un acceso protegido vinculado a la caja. La pantalla solo estará disponible cuando la caja origen tenga un turno abierto.</p> : <Field label="Vencimiento del acceso (opcional)"><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={inputClassName} /></Field>}</StepSection> : null}
        {step === 6 ? <StepSection title="Resumen y creación" description="Confirma la configuración inicial. Después regresarás a la tabla."><div className="grid gap-3 sm:grid-cols-2"><SummaryCard label="Experiencia" value={experience} /><SummaryCard label="Nombre" value={name.trim()} /><SummaryCard label="Caja y almacén" value={selectedRegister ? `${selectedRegister.name} · ${selectedRegister.warehouseName}` : 'Sin asignar'} /><SummaryCard label="Acceso" value={expiresAt ? `Vence ${expiresAt}` : 'Sin vencimiento'} /></div><p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Crear no abre un menú adicional. El nuevo kiosco aparecerá en la tabla para acceder, copiar enlace, activar o editar.</p></StepSection> : null}
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    </PosModalFrame>
  );
}

function StepSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4"><div><h3 className="text-xl font-medium text-[#111827]">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-14 items-center justify-between rounded-xl border border-slate-200 bg-white px-4"><span className="text-sm font-medium text-slate-700">{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#FF6B5E]" /></label>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 font-medium text-[#111827]">{value}</p></div>;
}

const inputClassName = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20';
