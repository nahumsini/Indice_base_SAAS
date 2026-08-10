import { useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  PlatformAccountCreatePayload,
  PlatformAccountCreateResult,
  PlatformCatalogProduct,
} from '../api/platformAdmin';

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 disabled:bg-slate-100 disabled:text-slate-400';

const emptyForm: PlatformAccountCreatePayload = {
  company_name: '',
  owner_name: '',
  owner_email: '',
  temporary_password: '',
  country_code: 'MX',
  phone: '',
  industry: '',
  company_size: '',
  product_codes: [],
  extra_seats: 0,
  access_days: 30,
  permanent: false,
};

type CreatedAccess = PlatformAccountCreateResult & { temporaryPassword: string };

export default function AccountCreationModal({
  products,
  onClose,
  onCreate,
  onOpenAccount,
}: {
  products: PlatformCatalogProduct[];
  onClose: () => void;
  onCreate: (payload: PlatformAccountCreatePayload) => Promise<PlatformAccountCreateResult>;
  onOpenAccount: (companyId: number) => void;
}) {
  const selectableProducts = useMemo(
    () => products.filter((product) => product.active && product.product_type.toUpperCase() === 'BASIC'),
    [products],
  );
  const [form, setForm] = useState<PlatformAccountCreatePayload>(() => ({
    ...emptyForm,
    temporary_password: generateTemporaryPassword(),
    product_codes: selectableProducts.map((product) => product.product_code),
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [created, setCreated] = useState<CreatedAccess | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!form.product_codes.length) {
      setError('Selecciona al menos un módulo para crear la cuenta.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await onCreate({
        ...form,
        company_name: form.company_name.trim(),
        owner_name: form.owner_name?.trim() || undefined,
        owner_email: form.owner_email.trim().toLowerCase(),
        phone: form.phone?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        company_size: form.company_size?.trim() || undefined,
        access_days: form.permanent ? undefined : Number(form.access_days || 30),
        extra_seats: Number(form.extra_seats || 0),
      });
      setCreated({ ...result, temporaryPassword: form.temporary_password });
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'No se pudo crear la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  };

  const toggleProduct = (code: string) => {
    const selected = form.product_codes.includes(code);
    setForm({
      ...form,
      product_codes: selected
        ? form.product_codes.filter((item) => item !== code)
        : [...form.product_codes, code],
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/55 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="create-account-title">
      <section className="flex h-full w-full max-w-4xl flex-col bg-[#f4f7fb] shadow-2xl">
        <header className="border-b border-blue-100 bg-gradient-to-r from-[#143675] via-[#2054ac] to-[#2563EB] px-5 py-5 text-white sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10"><UserPlus className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Alta directa Root</p>
                <h2 id="create-account-title" className="mt-1 text-xl font-semibold">{created ? 'Cuenta lista para entregar' : 'Crear una cuenta de Índice'}</h2>
                <p className="mt-1 max-w-2xl text-sm text-blue-100">{created ? 'Copia los datos de acceso y compártelos por un canal seguro.' : 'Aprovisiona empresa, propietario y módulos en una sola operación auditable.'}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 transition hover:bg-white/20" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </header>

        {created ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7">
            <div className="mx-auto max-w-2xl space-y-5">
              <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><BadgeCheck className="h-7 w-7" /></span>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">{created.company_name}</h3>
                <p className="mt-1 text-sm text-slate-500">Empresa #{created.company_id} · propietario creado correctamente</p>
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-semibold text-slate-900">Acceso inicial</h3>
                  <p className="mt-1 text-xs text-slate-500">La contraseña sólo se muestra en esta ventana.</p>
                </div>
                <AccessRow label="Página de acceso" value={`${window.location.origin}/login`} copied={copied === 'login'} onCopy={() => copy('login', `${window.location.origin}/login`)} />
                <AccessRow label="Empresa" value={created.company_name} copied={copied === 'company'} onCopy={() => copy('company', created.company_name)} />
                <AccessRow label="Correo" value={created.owner_email} copied={copied === 'email'} onCopy={() => copy('email', created.owner_email)} />
                <AccessRow label="Contraseña temporal" value={created.temporaryPassword} secret copied={copied === 'password'} onCopy={() => copy('password', created.temporaryPassword)} />
              </section>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Pide al usuario cambiar esta contraseña al ingresar desde <strong>Panel Inicial → Perfil → Seguridad de la cuenta</strong>. Índice no la enviará por correo ni la conservará en la auditoría Root.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => onOpenAccount(created.company_id)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-semibold text-white transition hover:bg-[#126b57]"><Building2 className="h-4 w-4" /> Administrar cuenta</button>
                <button type="button" onClick={onClose} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Terminar</button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex-1 overflow-y-auto">
            <div className="space-y-5 p-5 sm:p-7">
              {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle number="1" icon={Building2} title="Empresa" description="Identidad básica de la nueva cuenta." />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre de la empresa"><input required minLength={2} maxLength={120} autoFocus value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} className={controlClass} placeholder="Ej. Grupo Horizonte" /></Field>
                  <Field label="País"><select value={form.country_code} onChange={(event) => setForm({ ...form, country_code: event.target.value as PlatformAccountCreatePayload['country_code'] })} className={controlClass}><option value="MX">🇲🇽 México</option><option value="CA">🇨🇦 Canadá</option><option value="US">🇺🇸 Estados Unidos</option><option value="CO">🇨🇴 Colombia</option><option value="BR">🇧🇷 Brasil</option></select></Field>
                  <Field label="Industria (opcional)"><input maxLength={120} value={form.industry || ''} onChange={(event) => setForm({ ...form, industry: event.target.value })} className={controlClass} placeholder="Hotelería, retail, servicios..." /></Field>
                  <Field label="Tamaño (opcional)"><select value={form.company_size || ''} onChange={(event) => setForm({ ...form, company_size: event.target.value })} className={controlClass}><option value="">Sin especificar</option><option value="1-10">1 a 10 personas</option><option value="11-50">11 a 50 personas</option><option value="51-200">51 a 200 personas</option><option value="201+">Más de 200 personas</option></select></Field>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle number="2" icon={KeyRound} title="Propietario y acceso" description="Se creará como dueño de la empresa con acceso inicial." />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre del propietario (opcional)"><input maxLength={100} value={form.owner_name || ''} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} className={controlClass} placeholder="Nombre y apellidos" /></Field>
                  <Field label="Correo electrónico"><input required type="email" maxLength={190} value={form.owner_email} onChange={(event) => setForm({ ...form, owner_email: event.target.value })} className={controlClass} placeholder="direccion@empresa.com" /></Field>
                  <Field label="Teléfono (opcional)"><input maxLength={40} value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={controlClass} placeholder="+52 998 000 0000" /></Field>
                  <Field label="Contraseña temporal">
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1"><input required minLength={10} maxLength={72} type={showPassword ? 'text' : 'password'} value={form.temporary_password} onChange={(event) => setForm({ ...form, temporary_password: event.target.value })} className={`${controlClass} pr-10 font-mono`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center text-slate-500" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                      <button type="button" onClick={() => { setForm({ ...form, temporary_password: generateTemporaryPassword() }); setShowPassword(true); }} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-[#143675]"><Sparkles className="h-4 w-4" /> Generar</button>
                    </div>
                  </Field>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle number="3" icon={PackageCheck} title="Plan y módulos" description="Define el acceso inicial; después podrás agregar o quitar módulos desde la cuenta." />
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-slate-800">Módulos disponibles</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {selectableProducts.map((product) => {
                      const selected = form.product_codes.includes(product.product_code);
                      return <label key={product.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${selected ? 'border-[#59C3A5] bg-[#f1fbf8] ring-1 ring-[#59C3A5]/30' : 'border-slate-200 hover:border-slate-300'}`}><input type="checkbox" checked={selected} onChange={() => toggleProduct(product.product_code)} className="mt-1 h-4 w-4 accent-[#177D66]" /><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{product.display_name}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{product.capabilities.slice(0, 3).map(humanize).join(' · ') || 'Acceso operativo al módulo.'}</span></span></label>;
                    })}
                  </div>
                  {!selectableProducts.length ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">No hay módulos básicos activos en el catálogo. Revisa Productos y precios.</p> : null}
                </fieldset>

                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                  <Field label="Tipo de acceso"><select value={form.permanent ? 'permanent' : 'demo'} onChange={(event) => setForm({ ...form, permanent: event.target.value === 'permanent' })} className={controlClass}><option value="demo">Demo con vigencia</option><option value="permanent">Cortesía permanente</option></select></Field>
                  <Field label="Usuarios adicionales"><input min={0} max={500} type="number" value={form.extra_seats} onChange={(event) => setForm({ ...form, extra_seats: Number(event.target.value) })} className={controlClass} /></Field>
                  {!form.permanent ? <Field label="Duración del demo"><select value={form.access_days || 30} onChange={(event) => setForm({ ...form, access_days: Number(event.target.value) })} className={controlClass}><option value={7}>7 días</option><option value={15}>15 días</option><option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option></select></Field> : <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-800"><ShieldCheck className="h-5 w-5" /> Sin fecha de expiración</div>}
                </div>
              </section>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-[#143675]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Esta acción crea una empresa real, su usuario propietario y los accesos seleccionados. Quedará registrada en auditoría y no generará cargos de Stripe.</p></div>
            </div>
            <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <p className="hidden text-xs text-slate-500 sm:block">{form.product_codes.length} módulo(s) · {form.permanent ? 'acceso permanente' : `${form.access_days || 30} días`}</p>
              <div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancelar</button><button disabled={saving || !selectableProducts.length} className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50">{saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Creando cuenta...</> : <><Plus className="h-4 w-4" /> Crear y habilitar</>}</button></div>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>;
}

function SectionTitle({ number, icon: Icon, title, description }: { number: string; icon: typeof Building2; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]"><Icon className="h-5 w-5" /><span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#143675] text-[10px] font-bold text-white">{number}</span></span><div><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>;
}

function AccessRow({ label, value, secret = false, copied, onCopy }: { label: string; value: string; secret?: boolean; copied: boolean; onCopy: () => void }) {
  const [revealed, setRevealed] = useState(!secret);
  return <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900">{revealed ? value : '••••••••••••••••'}</p></div>{secret ? <button type="button" onClick={() => setRevealed((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label={revealed ? 'Ocultar' : 'Mostrar'}>{revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button> : null}<button type="button" onClick={onCopy} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${copied ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiado' : 'Copiar'}</button></div>;
}

function generateTemporaryPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const random = crypto.getRandomValues(new Uint32Array(12));
  return `Indice-${Array.from(random, (value) => letters[value % letters.length]).join('')}!`;
}

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
