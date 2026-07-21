import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Gift,
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
  type PlatformAdminContext,
  type PlatformCompanyDetail,
  type PlatformCompanySummary,
  type PlatformOverview,
} from '../api/platformAdmin';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const [access, data] = await Promise.all([
        platformAdminApi.getContext(),
        platformAdminApi.getOverview(search),
      ]);
      setContext(access);
      setOverview(data);
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
