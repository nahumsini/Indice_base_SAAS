import { useMemo, type FormEvent, type ReactNode } from 'react';
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  Gift,
  PackageCheck,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import type {
  BenefitPayload,
  PlatformAdminContext,
  PlatformCatalogProduct,
  PlatformCompanyDetail,
} from '../api/platformAdmin';

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:bg-slate-100 disabled:text-slate-400';

export default function CompanyAccountDrawer({
  company,
  context,
  catalogProducts,
  benefit,
  saving,
  onClose,
  onBenefit,
  onSubmitBenefit,
  onGrantProduct,
  onRevokeBenefit,
}: {
  company: PlatformCompanyDetail;
  context: PlatformAdminContext | null;
  catalogProducts: PlatformCatalogProduct[];
  benefit: BenefitPayload;
  saving: boolean;
  onClose: () => void;
  onBenefit: (value: BenefitPayload) => void;
  onSubmitBenefit: (event: FormEvent) => void;
  onGrantProduct: (productCode: string) => void;
  onRevokeBenefit: (reference: string) => void;
}) {
  const activeProductBenefits = useMemo(
    () => new Map(company.benefits
      .filter((item) => item.status === 'ACTIVE' && item.benefit_type === 'PRODUCT' && item.product_code)
      .map((item) => [item.product_code!, item])),
    [company.benefits],
  );
  const activeProducts = new Map(company.products.map((product) => [product.code, product]));
  const basicProducts = catalogProducts.filter((product) => product.product_type.toUpperCase() === 'BASIC');
  const capacity = (company.seat_usage.included ?? 0) + (company.seat_usage.purchased_extra ?? 0) + (company.seat_usage.courtesy_extra ?? 0);
  const accessLabel = company.billing_status === 'active' || company.billing_status === 'trialing'
    ? 'Suscripción administrada'
    : company.benefits.some((item) => item.status === 'ACTIVE')
      ? 'Acceso administrado por Root'
      : 'Sin acceso comercial';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label={`Administrar ${company.name}`}>
      <section className="flex h-full w-full max-w-5xl flex-col bg-[#f4f7fb] shadow-2xl">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#143675] via-[#2054ac] to-[#177D66] p-5 text-white sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-lg font-bold">{initials(company.name)}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-blue-100">Cuenta de cliente</p>
                <h2 className="mt-1 truncate text-2xl font-semibold">{company.name}</h2>
                <p className="mt-1 truncate text-sm text-blue-100">{company.owner_email || 'Propietario pendiente'} · Empresa #{company.id}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 transition hover:bg-white/20" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
            <HeaderMetric label="Estado" value={statusLabel(company.billing_status || company.lifecycle_state || 'legacy')} />
            <HeaderMetric label="Acceso" value={accessLabel} />
            <HeaderMetric label="Módulos" value={`${activeProducts.size} activos`} />
            <HeaderMetric label="Usuarios" value={`${company.seat_usage.active ?? 0} de ${capacity}`} />
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Panel title="Plan y módulos" description="Agrega o quita accesos administrativos sin alterar un contrato activo de Stripe." icon={PackageCheck}>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {basicProducts.map((catalogProduct) => {
                  const active = activeProducts.get(catalogProduct.product_code);
                  const activeBenefit = activeProductBenefits.get(catalogProduct.product_code);
                  const contracted = Boolean(active && active.source.split(',').some((source) => !source.trim().startsWith('BENEFIT_')));
                  return (
                    <article key={catalogProduct.id} className={`rounded-2xl border p-4 transition ${active ? 'border-[#59C3A5] bg-[#f2fbf8]' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-[#dff5ee] text-[#177D66]' : 'bg-slate-100 text-slate-400'}`}><PackageCheck className="h-5 w-5" /></span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Activo' : 'Sin acceso'}</span>
                      </div>
                      <h4 className="mt-3 font-semibold text-slate-900">{catalogProduct.display_name}</h4>
                      <p className="mt-1 min-h-9 text-xs leading-5 text-slate-500">{catalogProduct.capabilities.slice(0, 2).map(humanize).join(' · ') || 'Módulo operativo de Índice.'}</p>
                      {active ? (
                        contracted ? <div className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 text-xs font-semibold text-[#143675]"><CircleDollarSign className="h-4 w-4" /> Incluido en contrato</div>
                          : activeBenefit && context?.can_manage_benefits ? <button type="button" disabled={saving} onClick={() => onRevokeBenefit(activeBenefit.reference)} className="mt-3 h-10 w-full rounded-xl border border-red-200 bg-white text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Quitar acceso</button>
                            : <div className="mt-3 flex h-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-700">Acceso administrativo</div>
                      ) : <button type="button" disabled={saving || !context?.can_manage_benefits} onClick={() => onGrantProduct(catalogProduct.product_code)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#177D66] text-xs font-semibold text-white transition hover:bg-[#126b57] disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar módulo</button>}
                    </article>
                  );
                })}
                {!basicProducts.length ? <p className="col-span-full rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">No hay módulos básicos activos en el catálogo.</p> : null}
              </div>
              <div className="border-t border-slate-100 bg-blue-50/60 px-5 py-3 text-xs leading-5 text-[#143675]"><ShieldCheck className="mr-1.5 inline h-4 w-4" />Los módulos contratados se conservan para no desincronizar Stripe. Los accesos de demo o soporte sí pueden retirarse aquí.</div>
            </Panel>

            <div className="space-y-4">
              <Panel title="Ficha comercial" description="Datos clave de la cuenta." icon={Building2}>
                <div className="divide-y divide-slate-100 px-5">
                  <InfoRow label="Empresa" value={company.name} />
                  <InfoRow label="Propietario" value={company.owner_email || 'Pendiente'} />
                  <InfoRow label="Plan" value={offerLabels[company.offer_code || ''] || (activeProducts.size ? `${activeProducts.size} módulo(s)` : 'Sin plan')} />
                  <InfoRow label="Tarifa" value={formatMoney(company.recurring_amount_cents, company.currency)} />
                  <InfoRow label="Próximo evento" value={formatDate(company.billing_status === 'trialing' ? company.trial_ends_at : company.current_period_ends_at)} />
                </div>
              </Panel>
              <Panel title="Capacidad" description="Uso actual de la cuenta." icon={Users}>
                <div className="grid grid-cols-2 gap-3 p-5">
                  <SmallMetric label="Usuarios activos" value={String(company.seat_usage.active ?? 0)} />
                  <SmallMetric label="Lugares disponibles" value={String(Math.max(0, capacity - (company.seat_usage.active ?? 0)))} />
                  <SmallMetric label="Incluidos" value={String(company.seat_usage.included ?? 0)} />
                  <SmallMetric label="Extra / cortesía" value={String((company.seat_usage.purchased_extra ?? 0) + (company.seat_usage.courtesy_extra ?? 0))} />
                </div>
              </Panel>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Usuarios" description={`${company.members.length} membresía(s) registradas.`} icon={UserRound}>
              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {company.members.map((member) => <div key={member.membership_id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8f5f2] text-xs font-semibold text-[#177D66]">{initials(member.name || member.email)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{member.name || member.email}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div></div><div className="shrink-0 text-right"><p className="text-xs font-medium text-slate-700">{humanize(member.role || 'user')}</p><StatusPill status={member.status || 'active'} /></div></div>)}
              </div>
            </Panel>
            <Panel title="Facturación reciente" description="Movimientos sincronizados con Stripe." icon={CreditCard}>
              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {company.invoices.map((invoice) => <div key={invoice.invoice_id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-semibold text-slate-900">{formatMoney(invoice.amount_due_cents, invoice.currency)}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(invoice.period_ends_at)}</p></div><div className="flex items-center gap-2"><StatusPill status={invoice.status || 'unknown'} />{invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="Abrir factura"><ExternalLink className="h-4 w-4" /></a> : null}</div></div>)}
                {!company.invoices.length ? <EmptyState icon={CreditCard} text="Sin facturas sincronizadas." /> : null}
              </div>
            </Panel>
          </section>

          {context?.can_manage_benefits ? (
            <Panel title="Ajustes rápidos de acceso" description="Asigna usuarios, almacenamiento u otro módulo con motivo auditable." icon={Gift}>
              <form onSubmit={onSubmitBenefit} className="grid gap-3 p-5 sm:grid-cols-2">
                <Field label="Tipo de ajuste"><select value={benefit.benefit_type} onChange={(event) => onBenefit({ ...benefit, benefit_type: event.target.value as BenefitPayload['benefit_type'] })} className={controlClass}><option value="PRODUCT">Módulo</option><option value="SEAT">Usuarios adicionales</option><option value="STORAGE">Almacenamiento</option></select></Field>
                <Field label="Origen"><select value={benefit.source_type} onChange={(event) => onBenefit({ ...benefit, source_type: event.target.value as BenefitPayload['source_type'] })} className={controlClass}><option value="COURTESY">Cortesía</option><option value="PROMOTION">Promoción</option><option value="SUPPORT">Soporte</option><option value="TEST">Prueba</option></select></Field>
                {benefit.benefit_type === 'PRODUCT' ? <Field label="Módulo"><select required value={benefit.product_code || ''} onChange={(event) => onBenefit({ ...benefit, product_code: event.target.value })} className={controlClass}><option value="">Selecciona un módulo</option>{basicProducts.map((product) => <option key={product.id} value={product.product_code}>{product.display_name}</option>)}</select></Field> : <Field label="Cantidad"><input required min={1} max={500} type="number" value={benefit.quantity || 1} onChange={(event) => onBenefit({ ...benefit, quantity: Number(event.target.value) })} className={controlClass} /></Field>}
                <Field label="Vigencia hasta (opcional)"><input type="datetime-local" value={benefit.ends_at || ''} onChange={(event) => onBenefit({ ...benefit, ends_at: event.target.value })} className={controlClass} /></Field>
                <div className="sm:col-span-2"><Field label="Motivo"><textarea required minLength={5} value={benefit.reason} onChange={(event) => onBenefit({ ...benefit, reason: event.target.value })} className={`${controlClass} min-h-20 resize-y py-2`} placeholder="Demo, soporte, ajuste comercial..." /></Field></div>
                <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#143675] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"><Plus className="h-4 w-4" />{saving ? 'Guardando...' : 'Aplicar ajuste'}</button>
              </form>
            </Panel>
          ) : null}

          <Panel title="Historial de accesos administrativos" description="Cortesías, promociones, pruebas y apoyos registrados." icon={BadgeCheck}>
            <div className="divide-y divide-slate-100">
              {company.benefits.map((item) => <article key={item.reference} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{item.benefit_type === 'PRODUCT' ? displayProductName(item.product_code, catalogProducts) : `${item.quantity} ${item.benefit_type === 'SEAT' ? 'usuario(s)' : 'bloque(s) de almacenamiento'}`}</p><StatusPill status={item.status} /></div><p className="mt-1 text-sm text-slate-600">{item.reason}</p><p className="mt-1 text-xs text-slate-500">{humanize(item.source_type)} · {item.ends_at ? `hasta ${formatDate(item.ends_at)}` : 'sin vencimiento'}</p></div>{item.status === 'ACTIVE' && context?.can_manage_benefits ? <button type="button" disabled={saving} onClick={() => onRevokeBenefit(item.reference)} className="h-9 shrink-0 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Revocar</button> : null}</article>)}
              {!company.benefits.length ? <EmptyState icon={Gift} text="Esta cuenta no tiene ajustes administrativos." /> : null}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

const offerLabels: Record<string, string> = { basic_1: 'Un módulo', basic_2: 'Dos módulos', basic_3: 'Tres módulos', basic_all: 'Cuatro o más módulos' };

function Panel({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof Building2; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]"><div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]"><Icon className="h-5 w-5" /></span><div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>{children}</section>;
}

function HeaderMetric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-800" title={value}>{value}</p></div>; }
function SmallMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-slate-500">{label}</span><span className="max-w-[65%] truncate text-right font-semibold text-slate-900" title={value}>{value}</span></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>; }
function EmptyState({ icon: Icon, text }: { icon: typeof Building2; text: string }) { return <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-slate-500"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400"><Icon className="h-5 w-5" /></span>{text}</div>; }

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const positive = ['active', 'paid', 'success', 'trialing'].includes(normalized);
  const warning = ['open', 'pending', 'past_due', 'trial'].includes(normalized);
  const tone = positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : ['revoked', 'failed', 'canceled', 'inactive'].includes(normalized) ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{statusLabel(status)}</span>;
}

function statusLabel(value: string) { const labels: Record<string, string> = { active: 'Activo', trialing: 'En prueba', paid: 'Pagado', past_due: 'Pago pendiente', canceled: 'Cancelado', revoked: 'Revocado', legacy: 'Legacy', inactive: 'Inactivo' }; return labels[value.toLowerCase()] || humanize(value); }
function humanize(value: string) { return value.replace(/[_-]/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'IN'; }
function formatMoney(value?: number | null, currency = 'USD') { if (value === null || value === undefined) return '—'; return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value / 100); }
function formatDate(value?: string | null) { if (!value) return 'Sin fecha'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }
function displayProductName(code: string | null | undefined, products: PlatformCatalogProduct[]) { return products.find((product) => product.product_code === code)?.display_name || code || 'Módulo'; }
