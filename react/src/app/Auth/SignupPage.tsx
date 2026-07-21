import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  billingSignupApi,
  type BillingSignupConfig,
  type BillingSignupRequest,
} from '../api/billingSignup';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const emptyForm: BillingSignupRequest = {
  fullName: '',
  email: '',
  password: '',
  companyName: '',
  countryCode: 'MX',
  phone: '',
  industry: '',
  companySize: '',
  billingInterval: 'MONTH',
  extraSeats: 0,
  selectedProductCodes: [],
};

const newIdempotencyKey = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `signup-${crypto.randomUUID()}`
    : `signup-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const currency = (amountCents: number, interval: 'MONTH' | 'YEAR') => {
  const value = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
  return `${value} USD/${interval === 'YEAR' ? 'año' : 'mes'}`;
};

export default function SignupPage() {
  const [config, setConfig] = useState<BillingSignupConfig | null>(null);
  const [form, setForm] = useState<BillingSignupRequest>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    let active = true;
    billingSignupApi.config()
      .then((value) => {
        if (active) {
          setConfig(value);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'No pudimos cargar los planes disponibles.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCount = form.selectedProductCodes.length;
  const offerCode = config && selectedCount === config.products.length
    ? 'basic_all'
    : `basic_${selectedCount}`;
  const basePrice = config?.prices.find((price) => (
    price.billableCode === offerCode
    && price.priceType === 'BASE'
    && price.billingInterval === form.billingInterval
  ));
  const seatPrice = config?.prices.find((price) => (
    price.billableCode === 'extra_seat'
    && price.priceType === 'ADDON'
    && price.billingInterval === form.billingInterval
  ));
  const estimatedAmount = basePrice?.unitAmountCents == null || seatPrice?.unitAmountCents == null
    ? null
    : basePrice.unitAmountCents + seatPrice.unitAmountCents * form.extraSeats;
  const validSelection = selectedCount === 1
    || selectedCount === 2
    || selectedCount === 3
    || selectedCount === config?.products.length;
  const platformReady = Boolean(config?.checkoutEnabled && config?.provisioningEnabled);
  const canSubmit = useMemo(() => (
    platformReady
    && validSelection
    && estimatedAmount !== null
    && form.fullName.trim().length >= 2
    && form.companyName.trim().length >= 2
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
    && form.password.length >= 10
    && !submitting
  ), [estimatedAmount, form, platformReady, submitting, validSelection]);

  const update = <K extends keyof BillingSignupRequest>(key: K, value: BillingSignupRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const toggleProduct = (code: string) => {
    update(
      'selectedProductCodes',
      form.selectedProductCodes.includes(code)
        ? form.selectedProductCodes.filter((current) => current !== code)
        : [...form.selectedProductCodes, code],
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Completa tus datos y elige 1, 2, 3 o todos los productos disponibles.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const checkout = await billingSignupApi.checkout({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        companyName: form.companyName.trim(),
        phone: form.phone.trim(),
        industry: form.industry.trim(),
        companySize: form.companySize.trim(),
      }, idempotencyKey.current);
      sessionStorage.setItem('indice:billing-signup-reference', checkout.signupReference);
      window.location.assign(checkout.checkoutUrl);
    } catch (reason) {
      idempotencyKey.current = newIdempotencyKey();
      setError(reason instanceof Error ? reason.message : 'No pudimos iniciar el pago seguro. Intenta nuevamente.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(21,92,255,0.10),_transparent_34%),linear-gradient(135deg,_#F8FAFC_0%,_#EEF3F8_55%,_#F8FAFC_100%)] px-4 py-6 text-[#222831] sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 flex items-center justify-between gap-4">
          <Link to="/login" className="text-xl font-black tracking-tight text-[#155CFF]">Índice</Link>
          <Link to="/login" className="text-sm font-bold text-slate-600 transition hover:text-[#155CFF]">
            Ya tengo una cuenta
          </Link>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-[32px] bg-[#155CFF] p-7 text-white shadow-[0_30px_80px_-42px_rgba(21,92,255,0.65)] lg:sticky lg:top-10 lg:self-start lg:p-9">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]">
              <Sparkles className="h-4 w-4" /> Prueba premium
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight">Opera tu empresa con claridad.</h1>
            <p className="mt-4 text-base leading-7 text-blue-100">
              Prueba todos los productos durante 30 días. Al terminar, conservarás el paquete que elijas hoy.
            </p>
            <div className="mt-8 space-y-4 text-sm font-semibold">
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5]" /><span>Tarjeta requerida y cobro automático al terminar la prueba.</span></div>
              <div className="flex gap-3"><Users className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5]" /><span>5 usuarios incluidos; agrega los que tu operación necesite.</span></div>
              <div className="flex gap-3"><CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5]" /><span>Precios en USD antes de impuestos. Stripe procesa tus datos de pago.</span></div>
            </div>
            {estimatedAmount !== null ? (
              <div className="mt-9 rounded-2xl border border-white/15 bg-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">Después de la prueba</p>
                <p className="mt-2 text-3xl font-black">{currency(estimatedAmount, form.billingInterval)}</p>
                {form.billingInterval === 'YEAR' ? <p className="mt-1 text-sm text-blue-100">20% de ahorro anual incluido.</p> : null}
              </div>
            ) : null}
          </aside>

          <section className="rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_28px_80px_-50px_rgba(34,40,49,0.45)] sm:p-8">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#155CFF]/10 text-[#155CFF]"><Building2 className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#155CFF]">Crea tu cuenta corporativa</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Comienza tus 30 días</h2>
                <p className="mt-1 text-sm text-slate-600">Sin configurar unidades todavía; primero aseguramos la cuenta propietaria.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Cargando oferta vigente…</div>
            ) : (
              <form className="mt-6 space-y-7" onSubmit={submit}>
                <fieldset>
                  <legend className="text-sm font-black text-slate-800">1. Elige los productos que conservarás</legend>
                  <p className="mt-1 text-sm text-slate-500">Durante la prueba tendrás acceso a todos, sin importar tu selección.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {config?.products.map((product) => {
                      const selected = form.selectedProductCodes.includes(product.code);
                      return (
                        <button
                          key={product.code}
                          type="button"
                          onClick={() => toggleProduct(product.code)}
                          className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selected ? 'border-[#155CFF] bg-[#155CFF]/6 text-[#155CFF] shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                        >
                          {product.displayName}
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#155CFF] bg-[#155CFF] text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-4 w-4" /></span>
                        </button>
                      );
                    })}
                  </div>
                  {!validSelection && selectedCount > 0 ? <p className="mt-3 text-sm font-semibold text-amber-700">Elige 1, 2, 3 o todos los productos.</p> : null}
                  {basePrice?.status === 'PENDING_PRICE' ? <p className="mt-3 text-sm font-semibold text-amber-700">El precio del paquete completo aún está pendiente de publicación.</p> : null}
                </fieldset>

                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="col-span-full text-sm font-black text-slate-800">2. Datos corporativos y del propietario</legend>
                  <label className="space-y-2 text-sm font-bold text-slate-700">Marca corporativa
                    <Input value={form.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength={120} className="h-12 rounded-xl" placeholder="Nombre de tu empresa" autoComplete="organization" />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">Nombre del propietario
                    <Input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} maxLength={100} className="h-12 rounded-xl" placeholder="Nombre completo" autoComplete="name" />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">Correo principal
                    <Input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} maxLength={190} className="h-12 rounded-xl" placeholder="tu@empresa.com" autoComplete="email" />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">Contraseña
                    <Input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} className="h-12 rounded-xl" placeholder="Mínimo 10 caracteres" autoComplete="new-password" />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">País de lanzamiento
                    <select value={form.countryCode} onChange={(event) => update('countryCode', event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#155CFF] focus:ring-2 focus:ring-[#155CFF]/20">
                      <option value="MX">México</option>
                      <option value="CA">Canadá</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-bold text-slate-700">Teléfono <span className="font-medium text-slate-400">(opcional)</span>
                    <Input value={form.phone} onChange={(event) => update('phone', event.target.value)} maxLength={40} className="h-12 rounded-xl" placeholder="+52…" autoComplete="tel" />
                  </label>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-black text-slate-800">3. Frecuencia y equipo</legend>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                      {(['MONTH', 'YEAR'] as const).map((interval) => (
                        <button key={interval} type="button" onClick={() => update('billingInterval', interval)} className={`h-11 rounded-xl text-sm font-bold transition ${form.billingInterval === interval ? 'bg-white text-[#155CFF] shadow-sm' : 'text-slate-500'}`}>
                          {interval === 'MONTH' ? 'Mensual' : 'Anual -20%'}
                        </button>
                      ))}
                    </div>
                    <label className="space-y-2 text-sm font-bold text-slate-700">Usuarios adicionales a los 5 incluidos
                      <Input type="number" min={0} max={500} value={form.extraSeats} onChange={(event) => update('extraSeats', Math.max(0, Number(event.target.value) || 0))} className="h-12 rounded-xl" />
                    </label>
                  </div>
                </fieldset>

                {!platformReady ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    El registro premium está visible, pero el cobro y aprovisionamiento todavía no están habilitados en este ambiente.
                  </div>
                ) : null}
                {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

                <Button type="submit" disabled={!canSubmit} className="h-13 w-full rounded-xl bg-[#155CFF] text-base font-black text-white hover:bg-[#0B45CC]">
                  {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Preparando Stripe…</> : <>Continuar al pago seguro <ArrowRight className="h-5 w-5" /></>}
                </Button>
                <p className="text-center text-xs leading-5 text-slate-500">Al continuar aceptas iniciar una suscripción con 30 días de prueba. Stripe solicitará una tarjeta y cobrará automáticamente al finalizar.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
