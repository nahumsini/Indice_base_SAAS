import { useEffect, useState } from 'react';
import { MonitorCog, Save } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import { selfServiceKioskApi, type SelfServiceKioskAdmin } from '../SelfServiceKiosk/selfServiceKioskApi';
import { posKioskAdminApi, type PosKioskAdminItem } from './posKioskAdminApi';
import { PreticketValidityField } from './PreticketValidityField';

type Props = {
  kiosk: PosKioskAdminItem;
  onClose: () => void;
  onSaved: (name: string) => void;
};

export function KioskEditModal({ kiosk, onClose, onSaved }: Props) {
  const restaurant = kiosk.kioskType === 'waiter_station' || kiosk.kioskType === 'table_order_center' || kiosk.kioskType === 'kitchen_display';
  const [detail, setDetail] = useState<SelfServiceKioskAdmin | null>(null);
  const [loading, setLoading] = useState(kiosk.kioskType !== 'customer_display' && !restaurant);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(kiosk.name);
  const [showStock, setShowStock] = useState(true);
  const [customerNameRequired, setCustomerNameRequired] = useState(false);
  const [maxItems, setMaxItems] = useState(30);
  const [preticketTtl, setPreticketTtl] = useState(120);
  const [expiresAt, setExpiresAt] = useState(toLocalDateTime(kiosk.expiresAt));

  useEffect(() => {
    if (kiosk.kioskType === 'customer_display' || restaurant) return;
    let active = true;
    void selfServiceKioskApi.listAdmin()
      .then((items) => {
        if (!active) return;
        const current = items.find((item) => item.id === kiosk.legacyReferenceId) ?? null;
        setDetail(current);
        if (current) {
          setName(current.name);
          setShowStock(current.showStock);
          setCustomerNameRequired(current.customerNameRequired);
          setMaxItems(current.maxItemsPerTicket);
          setPreticketTtl(current.preticketTtlMinutes);
          setExpiresAt(toLocalDateTime(current.expiresAt));
        }
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar la configuración.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [kiosk, restaurant]);

  const save = async () => {
    if (name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (kiosk.kioskType === 'customer_display' || restaurant || !detail) {
        await posKioskAdminApi.update(kiosk.id, {
          name: name.trim(),
          ...(restaurant ? { expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, version: kiosk.version } : {}),
        });
      } else {
        await selfServiceKioskApi.updateAdmin(detail, {
          name: name.trim(),
          expiresAt: expiresAt || null,
          showStock,
          customerNameRequired,
          maxItemsPerTicket: maxItems,
          preticketTtlMinutes: preticketTtl,
        });
      }
      onSaved(name.trim());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = kiosk.kioskType === 'customer_display'
    ? 'Pantalla de cliente'
    : kiosk.kioskType === 'self_checkout'
      ? 'Autocobro'
      : kiosk.kioskType === 'waiter_station'
        ? 'Estación de mesero'
        : kiosk.kioskType === 'table_order_center'
          ? 'Mesas y centro de órdenes'
          : kiosk.kioskType === 'kitchen_display'
            ? 'Pantalla de cocina'
      : 'Autoservicio y pre-ticket';

  return (
    <PosModalFrame
      closeLabel="Cerrar edición"
      eyebrow={`${typeLabel} · ${kiosk.code}`}
      icon={<MonitorCog className="h-5 w-5" />}
      isCloseDisabled={saving}
      modalType="standard-form"
      onClose={onClose}
      title="Editar kiosco"
      subtitle="Actualiza su configuración. El acceso y el estado operativo se administran desde la tabla."
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex w-full gap-2 sm:w-auto">
          <button type="button" className={posModalSecondaryActionClassName} disabled={saving} onClick={onClose}>Cancelar</button>
          <button type="button" className={posModalPrimaryActionClassName} disabled={saving || loading} onClick={() => void save()}><Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      )}
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-[#111827]">Asignación operativa</h3>
          <p className="mt-1 text-sm text-slate-600">{kiosk.assignment.primaryLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{kiosk.assignment.secondaryLabel}</p>
          <p className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">La asignación se fija al crear para proteger el origen del inventario y del turno. Si debe cambiar, crea un kiosco nuevo.</p>
        </section>

        <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Nombre del kiosco</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClassName} /></label>

        {restaurant ? <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Vencimiento del acceso (opcional)</span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={inputClassName} /></label> : null}

        {loading ? <p className="text-sm text-slate-500">Cargando configuración…</p> : null}

        {!loading && !restaurant && kiosk.kioskType !== 'customer_display' && detail ? (
          <section className="grid gap-4 sm:grid-cols-2">
            <Toggle label="Mostrar existencias" checked={showStock} onChange={setShowStock} />
            <Toggle label="Solicitar nombre del cliente" checked={customerNameRequired} onChange={setCustomerNameRequired} />
            <label><span className="mb-2 block text-sm font-medium text-slate-700">Máximo de artículos</span><input type="number" min={1} max={100} value={maxItems} onChange={(event) => setMaxItems(Number(event.target.value))} className={inputClassName} /></label>
            <PreticketValidityField minutes={preticketTtl} onChange={setPreticketTtl} />
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">Vencimiento del acceso (opcional)</span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={inputClassName} /></label>
          </section>
        ) : null}

        {!loading && !restaurant && kiosk.kioskType !== 'customer_display' && !detail ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">La configuración heredada no está disponible. Puedes actualizar el nombre; las demás reglas conservarán su valor actual.</p> : null}
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    </PosModalFrame>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4"><span className="text-sm font-medium text-slate-700">{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#FF6B5E]" /></label>;
}

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const inputClassName = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20';
