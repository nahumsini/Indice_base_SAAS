import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChefHat, Check, LayoutGrid, UtensilsCrossed } from 'lucide-react';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';
import { selfServiceKioskApi, type PosCashRegisterOption } from '../SelfServiceKiosk/selfServiceKioskApi';
import {
  posKioskAdminApi,
  type PosKioskAdminItem,
  type RestaurantEcosystem,
} from './posKioskAdminApi';

export type RestaurantCreationType = 'restaurant-waiter' | 'restaurant-tables' | 'restaurant-kitchen';

const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#B63B32] shadow-sm disabled:opacity-50';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#222831]/25 bg-transparent px-4 py-2 text-sm font-medium text-[#222831] disabled:opacity-50 dark:text-white';
const control = 'mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function RestaurantKioskCreationFlow({
  type,
  onClose,
  onCreated,
}: {
  type: RestaurantCreationType;
  onClose: () => void;
  onCreated: (kiosk: PosKioskAdminItem) => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadMessage, setLoadMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [ecosystems, setEcosystems] = useState<RestaurantEcosystem[]>([]);
  const [registers, setRegisters] = useState<PosCashRegisterOption[]>([]);
  const [ecosystemId, setEcosystemId] = useState('new');
  const [name, setName] = useState('');
  const [ecosystemName, setEcosystemName] = useState('Operación de restaurante');
  const [areaName, setAreaName] = useState('Salón principal');
  const [tableCount, setTableCount] = useState(12);
  const [cashRegisterId, setCashRegisterId] = useState('');
  const [stationCode] = useState('ALL');
  const [expiresAt, setExpiresAt] = useState('');

  const config = {
    'restaurant-waiter': { apiType: 'waiter_station' as const, title: 'Crear estación móvil de mesero', label: 'Estación de mesero', icon: UtensilsCrossed, intro: 'El enlace puede abrirse desde el teléfono de cada mesero. Su PIN personal identifica quién abre la mesa, captura productos, envía la ronda y solicita la cuenta.', operation: 'Teléfono o terminal táctil' },
    'restaurant-tables': { apiType: 'table_order_center' as const, title: 'Crear centro de órdenes', label: 'Mesas y centro de órdenes', icon: LayoutGrid, intro: 'Centraliza la asignación de mesas, el avance de cocina y los tiempos de servicio del salón.', operation: 'Pantalla de capitán o hostess' },
    'restaurant-kitchen': { apiType: 'kitchen_display' as const, title: 'Crear pantalla de cocina', label: 'Pantalla de cocina', icon: ChefHat, intro: 'Recibe las rondas del ecosistema y conserva el avance de cada comanda hasta que está lista.', operation: 'Pantalla táctil de cocina' },
  }[type];
  const Icon = config.icon;
  const selectedEcosystem = useMemo(() => ecosystems.find(item => String(item.id) === ecosystemId), [ecosystemId, ecosystems]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadMessage('');
    Promise.allSettled([
      posKioskAdminApi.listRestaurantEcosystems(),
      selfServiceKioskApi.listCashRegisters(),
    ]).then(([ecosystemsResult, registersResult]) => {
      if (!active) return;
      const messages: string[] = [];

      if (ecosystemsResult.status === 'fulfilled') {
        setEcosystems(ecosystemsResult.value);
      } else {
        setEcosystems([]);
        messages.push('Las cajas pueden seguir utilizándose, pero no fue posible consultar los ecosistemas existentes.');
      }

      if (registersResult.status === 'fulfilled') {
        const activeRegisters = registersResult.value.filter(item => (
          item.active && item.unitId != null && item.businessId != null
        ));
        const incompleteCount = registersResult.value.filter(item => (
          item.active && (item.unitId == null || item.businessId == null)
        )).length;
        setRegisters(activeRegisters);
        setCashRegisterId(current => (
          activeRegisters.some(item => String(item.id) === current)
            ? current
            : activeRegisters[0] ? String(activeRegisters[0].id) : ''
        ));
        if (activeRegisters.length === 0) {
          messages.push(incompleteCount > 0
            ? `${incompleteCount} caja${incompleteCount === 1 ? '' : 's'} activa${incompleteCount === 1 ? '' : 's'} requiere${incompleteCount === 1 ? '' : 'n'} asignación de unidad y negocio en Cajas y turnos.`
            : 'No hay cajas activas disponibles para liquidar las órdenes.');
        }
      } else {
        setRegisters([]);
        setCashRegisterId('');
        messages.push('No fue posible cargar las cajas de liquidación.');
      }

      setLoadMessage(messages.join(' '));
      setLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey]);

  const validation = () => {
    if (step === 1 && name.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    if (step === 2 && ecosystemId === 'new' && (!cashRegisterId || ecosystemName.trim().length < 3)) return 'Selecciona una caja y asigna un nombre al ecosistema.';
    if (step === 2 && ecosystemId === 'new' && (tableCount < 1 || tableCount > 100)) return 'Las mesas iniciales deben estar entre 1 y 100.';
    if (step === 2 && ecosystemId !== 'new' && !selectedEcosystem) return 'Selecciona un ecosistema válido.';
    return '';
  };

  const next = () => {
    const message = validation();
    if (message) { setError(message); return; }
    setError('');
    setStep(current => Math.min(4, current + 1));
  };

  const create = async () => {
    setSaving(true);
    setError('');
    try {
      const kiosk = await posKioskAdminApi.createRestaurant(config.apiType, {
        ecosystemId: ecosystemId === 'new' ? null : Number(ecosystemId),
        cashRegisterId: ecosystemId === 'new' ? Number(cashRegisterId) : selectedEcosystem?.cashRegisterId ?? null,
        name: name.trim(),
        ecosystemName: ecosystemName.trim(),
        areaName: areaName.trim(),
        tableCount,
        kitchenStationCode: type === 'restaurant-kitchen' ? stationCode.trim().toUpperCase() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onCreated(kiosk);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el kiosco.');
    } finally {
      setSaving(false);
    }
  };

  const steps = ['Experiencia', 'Información', 'Ecosistema', 'Operación', 'Resumen'];
  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open) onClose(); }}
      busy={saving}
      surface="administration"
      size="wizard"
      tone="coral"
      eyebrow="Kiosk Engine V2"
      icon={<Icon className="h-5 w-5" />}
      title={config.title}
      description="Configura una experiencia conectada a la misma comanda, cocina y caja del restaurante."
      bodyClassName="!p-0"
      footerLeading={<span className="text-xs font-medium text-[#222831] dark:text-white">Paso {step + 1} de {steps.length}</span>}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          {step > 0 ? <button type="button" className={secondary} disabled={saving} onClick={() => { setError(''); setStep(current => current - 1); }}><ArrowLeft className="h-4 w-4" />Atrás</button> : null}
          {step < 4 ? <button type="button" className={primary} disabled={saving || loading} onClick={next}>Continuar<ArrowRight className="h-4 w-4" /></button> : <button type="button" className={primary} disabled={saving} onClick={() => void create()}><Check className="h-4 w-4" />{saving ? 'Creando…' : 'Crear kiosco'}</button>}
        </div>
      )}
    >
      <ol className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-white p-4 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-950">
        {steps.map((label, index) => <li key={label} className={`rounded-xl border px-2 py-2 text-center text-xs font-medium ${index === step ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32]' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 dark:border-slate-700'}`}>{index + 1}. {label}</li>)}
      </ol>
      <div className="min-h-[390px] space-y-5 p-5 sm:p-6">
        {step === 0 ? <Section title={config.label} description="Esta experiencia compartirá mesas, comandas, preparación y liquidación con el ecosistema seleccionado."><div className="rounded-2xl border-2 border-[#FF6B5E] bg-[#FF6B5E]/10 p-5"><Icon className="h-8 w-8 text-[#B63B32]" /><h4 className="mt-3 font-medium">{config.label}</h4><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{config.intro}</p><span className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#B63B32] shadow-sm dark:bg-slate-900">{config.operation}</span></div></Section> : null}
        {step === 1 ? <Section title="Información general" description="Usa un nombre reconocible en la tabla administrativa."><label className="block text-sm font-medium">Nombre del kiosco<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={`Ej. ${config.label} principal`} maxLength={180} className={control} /></label><label className="block text-sm font-medium">Vencimiento del acceso (opcional)<input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className={control} /></label></Section> : null}
        {step === 2 ? <Section title="Ecosistema conectado" description="Conecta este kiosco a una operación existente o crea la primera.">{loadMessage ? <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span>{loadMessage}</span><button type="button" disabled={loading} onClick={() => setReloadKey(current => current + 1)} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium disabled:opacity-50">{loading ? 'Cargando…' : 'Reintentar'}</button></div> : null}<label className="block text-sm font-medium">Ecosistema<select value={ecosystemId} onChange={event => setEcosystemId(event.target.value)} className={control}><option value="new">Crear nuevo ecosistema</option>{ecosystems.map(item => <option key={item.id} value={item.id}>{item.name} · {item.cashRegisterName}</option>)}</select></label>{ecosystemId === 'new' ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre del ecosistema<input value={ecosystemName} onChange={event => setEcosystemName(event.target.value)} className={control} /></label><label className="text-sm font-medium">Caja de liquidación<select value={cashRegisterId} onChange={event => setCashRegisterId(event.target.value)} disabled={loading || registers.length === 0} className={control}><option value="">{loading ? 'Cargando cajas…' : 'Selecciona una caja'}</option>{registers.map(item => <option key={item.id} value={item.id}>{item.name} · {item.warehouseName}</option>)}</select></label><label className="text-sm font-medium">Área inicial<input value={areaName} onChange={event => setAreaName(event.target.value)} className={control} /></label><label className="text-sm font-medium">Mesas iniciales<input type="number" min={1} max={100} value={tableCount} onChange={event => setTableCount(Number(event.target.value))} className={control} /></label></div> : selectedEcosystem ? <Summary label="Operación seleccionada" value={`${selectedEcosystem.name} · ${selectedEcosystem.tableCount} mesas · ${selectedEcosystem.cashRegisterName}`} /> : null}</Section> : null}
        {step === 3 ? <Section title="Reglas operativas" description="La configuración conserva el alcance y la trazabilidad del ecosistema.">{type === 'restaurant-kitchen' ? <div className="grid gap-3 sm:grid-cols-2"><Summary label="Cobertura de cocina" value="Todas las estaciones" /><Summary label="Actualización" value="Comandas nuevas cada 5 segundos" /><Summary label="Identidad" value="PIN personal controlado" /><Summary label="Trazabilidad" value="Partida → preparación → entrega" /></div> : <div className="grid gap-3 sm:grid-cols-2"><Summary label="Identidad" value={type === 'restaurant-waiter' ? 'PIN personal atribuye cada acción al mesero' : 'PIN personal controlado'} /><Summary label="Dispositivo" value={config.operation} /><Summary label="Comandas" value="Compartidas en tiempo real" /><Summary label="Liquidación" value={selectedEcosystem?.cashRegisterName || registers.find(item => String(item.id) === cashRegisterId)?.name || 'Caja seleccionada'} /><Summary label="Trazabilidad" value="Kiosco → empleado → mesa → cocina → ticket" /></div>}</Section> : null}
        {step === 4 ? <Section title="Resumen y creación" description="Al crear, regresarás a la tabla con las acciones y conexiones disponibles."><div className="grid gap-3 sm:grid-cols-2"><Summary label="Experiencia" value={config.label} /><Summary label="Nombre" value={name} /><Summary label="Ecosistema" value={selectedEcosystem?.name || ecosystemName} /><Summary label="Caja" value={selectedEcosystem?.cashRegisterName || registers.find(item => String(item.id) === cashRegisterId)?.name || 'Sin seleccionar'} /></div></Section> : null}
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    </KioskModalFrame>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="space-y-4"><div><h3 className="text-xl font-medium">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>{children}</section>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}
