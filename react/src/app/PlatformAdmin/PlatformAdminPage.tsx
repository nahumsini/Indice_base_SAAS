import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Gift,
  HardDrive,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  platformAdminApi,
  type BenefitPayload,
  type CourtesyCodeCatalog,
  type CourtesyCodePayload,
  type PlatformAdminContext,
  type PlatformCompanyDetail,
  type PlatformCompanySummary,
  type PlatformOverview,
} from '../api/platformAdmin';

const initialCourtesy: CourtesyCodePayload = {
  label: '',
  allowed_email: '',
  product_codes: [],
  included_extra_seats: 0,
  access_days: 30,
  permanent: false,
  max_redemptions: 1,
  reason: '',
  campaign_code: '',
};

const initialBenefit: BenefitPayload = {
  benefit_type: 'PRODUCT',
  product_code: '',
  quantity: 1,
  source_type: 'COURTESY',
  reason: '',
  campaign_code: '',
};

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/10';

export default function PlatformAdminPage() {
  const navigate = useNavigate();
  const [context, setContext] = useState<PlatformAdminContext | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [selected, setSelected] = useState<PlatformCompanyDetail | null>(null);
  const [query, setQuery] = useState('');
  const [benefit, setBenefit] = useState<BenefitPayload>(initialBenefit);
  const [courtesyCatalog, setCourtesyCatalog] = useState<CourtesyCodeCatalog | null>(null);
  const [courtesy, setCourtesy] = useState<CourtesyCodePayload>(initialCourtesy);
  const [createdCourtesyCode, setCreatedCourtesyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const [access, data, courtesyCodes] = await Promise.all([
        platformAdminApi.getContext(),
        platformAdminApi.getOverview(search),
        platformAdminApi.getCourtesyCodes(),
      ]);
      setContext(access);
      setOverview(data);
      setCourtesyCatalog(courtesyCodes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la plataforma.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const openCompany = async (company: PlatformCompanySummary) => {
    setError('');
    try {
      setSelected(await platformAdminApi.getCompany(company.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la cuenta.');
    }
  };

  const submitBenefit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await platformAdminApi.grantBenefit(selected.id, {
        ...benefit,
        product_code: benefit.benefit_type === 'PRODUCT' ? benefit.product_code?.trim() : undefined,
        quantity: benefit.benefit_type === 'PRODUCT' ? 1 : Number(benefit.quantity || 1),
        reason: benefit.reason.trim(),
        campaign_code: benefit.campaign_code?.trim() || undefined,
        ends_at: benefit.ends_at ? new Date(benefit.ends_at).toISOString() : undefined,
      });
      setSelected(await platformAdminApi.getCompany(selected.id));
      setBenefit(initialBenefit);
      setOverview(await platformAdminApi.getOverview(query));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo otorgar el beneficio.');
    } finally {
      setSaving(false);
    }
  };

  const revokeBenefit = async (reference: string) => {
    if (!selected || saving) return;
    const reason = window.prompt('Motivo de revocación', 'Fin de cortesía o promoción');
    if (reason === null) return;
    setSaving(true);
    setError('');
    try {
      await platformAdminApi.revokeBenefit(selected.id, reference, reason);
      setSelected(await platformAdminApi.getCompany(selected.id));
      setOverview(await platformAdminApi.getOverview(query));
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'No se pudo revocar el beneficio.');
    } finally {
      setSaving(false);
    }
  };

  const submitCourtesyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await platformAdminApi.createCourtesyCode({
        ...courtesy,
        label: courtesy.label.trim(),
        allowed_email: courtesy.allowed_email?.trim().toLowerCase() || undefined,
        access_days: courtesy.permanent ? undefined : Number(courtesy.access_days || 30),
        included_extra_seats: Number(courtesy.included_extra_seats || 0),
        max_redemptions: Number(courtesy.max_redemptions || 1),
        reason: courtesy.reason.trim(),
        campaign_code: courtesy.campaign_code?.trim() || undefined,
      });
      setCreatedCourtesyCode(created.code || '');
      setCourtesy(initialCourtesy);
      setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo generar el código de cortesía.');
    } finally {
      setSaving(false);
    }
  };

  const revokeCourtesyCode = async (reference: string) => {
    const reason = window.prompt('Motivo de revocación', 'Fin de cortesía o promoción');
    if (reason === null || saving) return;
    setSaving(true);
    setError('');
    try {
      await platformAdminApi.revokeCourtesyCode(reference, reason);
      setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'No se pudo revocar el código.');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => overview?.totals, [overview]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#143675] text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#143675]">Índice · Operación de plataforma</p>
              <h1 className="text-xl font-semibold tracking-tight">Control comercial y beneficios</h1>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> Volver al ERP
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-7 lg:px-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Building2} label="Cuentas" value={totals?.companies ?? 0} />
          <Metric icon={BadgeCheck} label="Premium inscritas" value={totals?.premium_companies ?? 0} />
          <Metric icon={Sparkles} label="Suscripciones activas" value={totals?.active_subscriptions ?? 0} />
          <Metric icon={Gift} label="Beneficios activos" value={totals?.active_benefits ?? 0} />
        </section>

        {context?.can_manage_benefits ? (
          <section className="grid gap-5 rounded-3xl border border-emerald-200 bg-white p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.5)] xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={submitCourtesyCode} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><KeyRound className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-lg font-medium">Alta por cortesía</h2>
                  <p className="text-sm text-slate-500">Genera un código auditable que omite Stripe y la captura de tarjeta.</p>
                </div>
              </div>

              {createdCourtesyCode ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-800">Cópialo ahora. Por seguridad no volverá a mostrarse.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-white px-3 py-2 text-sm text-slate-900">{createdCourtesyCode}</code>
                    <button type="button" onClick={() => void navigator.clipboard.writeText(createdCourtesyCode)} className="h-10 rounded-xl bg-emerald-700 px-3 text-sm font-medium text-white">Copiar</button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre interno"><input required value={courtesy.label} onChange={(event) => setCourtesy((current) => ({ ...current, label: event.target.value }))} className={controlClass} placeholder="Cliente piloto agosto" /></Field>
                <Field label="Correo autorizado"><input type="email" value={courtesy.allowed_email || ''} onChange={(event) => setCourtesy((current) => ({ ...current, allowed_email: event.target.value }))} className={controlClass} placeholder="Opcional, recomendado" /></Field>
              </div>

              <fieldset className="rounded-2xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">Módulos incluidos</legend>
                <p className="mb-3 text-xs text-slate-500">Sin selección concede todos los módulos básicos.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {courtesyCatalog?.products.map((product) => {
                    const checked = courtesy.product_codes.includes(product.code);
                    return (
                      <label key={product.code} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        <input type="checkbox" checked={checked} onChange={() => setCourtesy((current) => ({
                          ...current,
                          product_codes: checked
                            ? current.product_codes.filter((code) => code !== product.code)
                            : [...current.product_codes, product.code],
                        }))} />
                        {product.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Asientos extra"><input min={0} max={500} type="number" value={courtesy.included_extra_seats} onChange={(event) => setCourtesy((current) => ({ ...current, included_extra_seats: Number(event.target.value) }))} className={controlClass} /></Field>
                <Field label="Usos máximos"><input min={1} max={1000} type="number" value={courtesy.max_redemptions} onChange={(event) => setCourtesy((current) => ({ ...current, max_redemptions: Number(event.target.value) }))} className={controlClass} /></Field>
                <Field label="Días de acceso"><input disabled={courtesy.permanent} min={1} max={3650} type="number" value={courtesy.access_days || 30} onChange={(event) => setCourtesy((current) => ({ ...current, access_days: Number(event.target.value) }))} className={controlClass} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={courtesy.permanent} onChange={(event) => setCourtesy((current) => ({ ...current, permanent: event.target.checked }))} /> Acceso permanente</label>
              <Field label="Motivo"><textarea required minLength={5} value={courtesy.reason} onChange={(event) => setCourtesy((current) => ({ ...current, reason: event.target.value }))} className={`${controlClass} min-h-20 resize-y py-2`} placeholder="Justificación comercial, soporte o piloto" /></Field>
              <Field label="Campaña"><input value={courtesy.campaign_code || ''} onChange={(event) => setCourtesy((current) => ({ ...current, campaign_code: event.target.value }))} className={controlClass} placeholder="Opcional" /></Field>
              <button disabled={saving} className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Generando...' : 'Generar código seguro'}</button>
            </form>

            <div className="min-w-0 border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
              <div>
                <h3 className="font-medium">Códigos emitidos</h3>
                <p className="mt-1 text-sm text-slate-500">Sólo se conserva el hash; el código claro se muestra una vez.</p>
              </div>
              <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {courtesyCatalog?.codes.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay códigos emitidos.</div> : null}
                {courtesyCatalog?.codes.map((item) => (
                  <article key={item.reference} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.allowed_email || 'Sin correo restringido'} · {item.redemption_count}/{item.max_redemptions} usos</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{item.all_basic_products ? 'Todos los módulos básicos' : item.product_codes.join(', ')}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.permanent ? 'Permanente' : `${item.access_days} días`} · {item.included_extra_seats} asientos extra</p>
                    <p className="mt-3 text-sm text-slate-600">{item.reason}</p>
                    {item.status === 'ACTIVE' ? <button type="button" disabled={saving} onClick={() => void revokeCourtesyCode(item.reference)} className="mt-3 text-xs font-medium text-red-600">Revocar código</button> : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.5)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Cuentas corporativas</h2>
              <p className="mt-1 text-sm text-slate-500">Busca, audita y otorga cortesías sin modificar la suscripción de Stripe.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void loadOverview(query); }} className="flex w-full max-w-md gap-2">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o ID de compañía" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/10" />
              </label>
              <button className="h-11 rounded-xl bg-[#143675] px-4 text-sm font-semibold text-white">Buscar</button>
            </form>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando...</div> : null}
            {!loading && overview?.companies.map((company) => (
              <button key={company.id} type="button" onClick={() => void openCompany(company)} className="grid w-full gap-4 p-5 text-left transition hover:bg-slate-50 md:grid-cols-[1.4fr_repeat(3,minmax(0,0.6fr))] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{company.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Company #{company.id} · {company.entitlement_mode || 'Legacy'}</p>
                </div>
                <Summary label="Ciclo comercial" value={company.lifecycle_state || company.billing_status || 'Legacy'} />
                <Summary label="Asientos" value={`${company.active_members} / ${company.included_seats + company.purchased_extra_seats}`} />
                <Summary label="Beneficios" value={String(company.active_benefits)} />
              </button>
            ))}
          </div>
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <section className="flex h-full w-full max-w-xl flex-col bg-[#f8fafc] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#143675]">Company #{selected.id}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{selected.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.owner_email || 'Propietario pendiente'} · {selected.billing_status || 'Sin suscripción'}</p>
                <p className="mt-1 text-xs font-semibold text-[#143675]">{selected.lifecycle_state || 'Legacy'} · {selected.access_mode || 'Sin control comercial'}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Activos" value={selected.seat_usage.active ?? 0} />
                <SummaryCard label="Reservados" value={selected.seat_usage.reserved ?? 0} />
                <SummaryCard label="Cortesía" value={selected.seat_usage.courtesy_extra ?? 0} />
              </div>

              {selected.storage_usage?.metered ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#143675]"><HardDrive className="h-5 w-5" /></span>
                    <div><h3 className="font-semibold">Almacenamiento</h3><p className="text-xs text-slate-500">Uso auditado por compañía.</p></div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <SummaryCard label="Usado GB" value={toGigabytes(selected.storage_usage.used_bytes + selected.storage_usage.reserved_bytes)} />
                    <SummaryCard label="Límite GB" value={toGigabytes(selected.storage_usage.limit_bytes)} />
                    <SummaryCard label="Bloques" value={selected.storage_usage.purchased_blocks + selected.storage_usage.benefit_blocks} />
                  </div>
                </div>
              ) : null}

              {context?.can_manage_benefits ? (
                <form onSubmit={submitBenefit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#143675]"><Gift className="h-5 w-5" /></span>
                    <div><h3 className="font-semibold">Otorgar beneficio</h3><p className="text-xs text-slate-500">Auditado y separado de cupones Stripe.</p></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Tipo"><select value={benefit.benefit_type} onChange={(event) => setBenefit((current) => ({ ...current, benefit_type: event.target.value as BenefitPayload['benefit_type'] }))} className={controlClass}><option value="PRODUCT">Módulo</option><option value="SEAT">Asientos</option><option value="STORAGE">Bloques de almacenamiento</option></select></Field>
                    <Field label="Origen"><select value={benefit.source_type} onChange={(event) => setBenefit((current) => ({ ...current, source_type: event.target.value as BenefitPayload['source_type'] }))} className={controlClass}><option value="COURTESY">Cortesía</option><option value="PROMOTION">Promoción</option><option value="SUPPORT">Soporte</option><option value="TEST">Prueba</option></select></Field>
                  </div>
                  {benefit.benefit_type === 'PRODUCT' ? <Field label="Código de producto"><input required value={benefit.product_code} onChange={(event) => setBenefit((current) => ({ ...current, product_code: event.target.value }))} className={controlClass} placeholder="hr, process_tasks..." /></Field> : <Field label="Cantidad"><input required min={1} type="number" value={benefit.quantity} onChange={(event) => setBenefit((current) => ({ ...current, quantity: Number(event.target.value) }))} className={controlClass} /></Field>}
                  <Field label="Motivo"><textarea required minLength={5} value={benefit.reason} onChange={(event) => setBenefit((current) => ({ ...current, reason: event.target.value }))} className={`${controlClass} min-h-20 resize-y py-2`} placeholder="Motivo comercial o de soporte" /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Campaña"><input value={benefit.campaign_code} onChange={(event) => setBenefit((current) => ({ ...current, campaign_code: event.target.value }))} className={controlClass} placeholder="Opcional" /></Field>
                    <Field label="Vigencia hasta"><input type="datetime-local" value={benefit.ends_at || ''} onChange={(event) => setBenefit((current) => ({ ...current, ends_at: event.target.value }))} className={controlClass} /></Field>
                  </div>
                  <button disabled={saving} className="h-11 w-full rounded-xl bg-[#143675] text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Otorgar beneficio'}</button>
                </form>
              ) : null}

              <div className="space-y-3">
                <h3 className="px-1 text-sm font-semibold">Historial de beneficios</h3>
                {selected.benefits.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Esta cuenta no tiene beneficios.</div> : null}
                {selected.benefits.map((item) => (
                  <article key={item.reference} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold">{item.benefit_type === 'PRODUCT' ? item.product_code : `${item.quantity} ${item.benefit_type === 'SEAT' ? 'asiento(s)' : 'bloque(s)'}`}</p><p className="mt-1 text-xs text-slate-500">{item.source_type} · {item.campaign_code || 'Sin campaña'}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{item.reason}</p>
                    {item.status === 'ACTIVE' && context?.can_manage_benefits ? <button type="button" disabled={saving} onClick={() => void revokeBenefit(item.reference)} className="mt-4 text-xs font-semibold text-red-600 hover:text-red-700">Revocar beneficio</button> : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#143675]"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="text-2xl font-semibold tracking-tight">{value}</p></div></div></div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-700">{value}</p></div>; }
function SummaryCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
function toGigabytes(bytes: number) { return Number((bytes / (1024 ** 3)).toFixed(1)); }
