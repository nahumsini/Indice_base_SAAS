import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi, type PublicDemoCompany } from '../api/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { isValidEmail, normalizeEmail } from '../shared/validation/email';
import { IndiceBrandLogo } from './components/IndiceBrandLogo';

export default function PublicDemoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCompanyId = useMemo(() => {
    const value = Number(searchParams.get('companyId'));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [searchParams]);
  const [companies, setCompanies] = useState<PublicDemoCompany[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDistributorHandoff, setIsDistributorHandoff] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setError('');
    try {
      const response = await authApi.getPublicDemos();
      setCompanies(response.companies);
      setCompanyName((current) => {
        if (response.companies.some((company) => company.name === current)) return current;
        return response.companies.find((company) => company.id === requestedCompanyId)?.name
          || response.companies[0]?.name
          || '';
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar las demostraciones disponibles.');
    } finally {
      setLoadingCompanies(false);
    }
  }, [requestedCompanyId]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    let active = true;
    authApi.getSessionOrNull()
      .then((session) => {
        if (!active) return;
        setIsDistributorHandoff(Boolean(
          session
          && !session.demoMode
          && session.company.commercial_account_type === 'DISTRIBUTOR',
        ));
      })
      .catch(() => {
        if (active) setIsDistributorHandoff(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedEmail = normalizeEmail(email);
  const canSubmit = useMemo(
    () => Boolean(companyName && isValidEmail(normalizedEmail) && password && !submitting),
    [companyName, normalizedEmail, password, submitting],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await authApi.demoLogin({ companyName, email: normalizedEmail, password });
      navigate('/dashboard', {
        replace: true,
        state: { successToast: `Entraste a ${companyName} en modo demostración.` },
      });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar la demostración.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#f5f8fc] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-40 h-[32rem] w-[32rem] rounded-full bg-[var(--indice-brand-soft-strong)] opacity-40 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-emerald-200/35 blur-3xl" />
      </div>

      <header className="relative border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <IndiceBrandLogo alt="Índice" className="h-11 w-40" imageClassName="w-[185px]" />
          <Link
            to={isDistributorHandoff ? '/dashboard' : '/login'}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--indice-brand-border)] hover:text-[var(--indice-brand-text)]"
          >
            <LockKeyhole className="h-4 w-4" />
            {isDistributorHandoff ? 'Volver al ERP' : 'Acceso de clientes'}
          </Link>
        </div>
      </header>

      <div className="relative mx-auto grid min-h-[calc(100dvh-77px)] max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-12">
        <section className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--indice-brand-text)]">
            <Sparkles className="h-4 w-4" />
            Centro público de demostraciones
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Conoce Índice con escenarios listos para explorar.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Selecciona la empresa de ejemplo y utiliza las credenciales que te compartió tu asesor. Todos los datos son ficticios.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
              ['Datos de ejemplo', 'Opera libremente sin afectar información real.'],
              ['Acceso protegido', 'Solo las empresas autorizadas por Índice aparecen aquí.'],
              ['Sesión temporal', 'El acceso demo termina automáticamente después de 60 minutos.'],
              ['Entorno controlado', 'Administración, facturación y seguridad permanecen bloqueadas.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,0.38)]">
          <div className="bg-[var(--indice-brand-shell)] px-6 py-6 text-[var(--indice-brand-shell-foreground)] sm:px-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--indice-brand-shell-muted)]">Acceso a escenarios demo</p>
                <h2 className="mt-1 text-2xl font-bold">Elige una empresa e ingresa</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--indice-brand-shell-muted)]">El inicio de sesión normal y su verificación permanecen separados.</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-6 p-6 sm:p-8">
            {isDistributorHandoff ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                <strong className="block font-semibold">Acceso desde la cuenta distribuidora</strong>
                Al entrar, la sesión actual será reemplazada temporalmente por la demostración seleccionada. Para volver a tu cartera deberás iniciar sesión nuevamente.
              </div>
            ) : null}
            <fieldset>
              <div className="flex items-center justify-between gap-3">
                <legend className="text-sm font-semibold text-slate-800">Empresa demostrativa</legend>
                <button
                  type="button"
                  onClick={() => void loadCompanies()}
                  disabled={loadingCompanies}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--indice-brand-text)] hover:text-[var(--indice-brand-action-hover)] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingCompanies ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
              {loadingCompanies ? (
                <div className="mt-3 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Cargando demostraciones…
                </div>
              ) : companies.length ? (
                <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {companies.map((company) => {
                    const selected = company.name === companyName;
                    return (
                      <button
                        type="button"
                        key={company.id}
                        onClick={() => {
                          setCompanyName(company.name);
                          setError('');
                        }}
                        className={`min-h-16 rounded-xl border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-[var(--indice-brand-action)] bg-[var(--indice-brand-soft)] text-[var(--indice-brand-text)] ring-2 ring-[var(--indice-brand-action)]/15'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-[var(--indice-brand-border)] hover:bg-[var(--indice-brand-soft)]'
                        }`}
                      >
                        <span className="block truncate text-sm font-semibold">{company.name}</span>
                        <span className="mt-1 block text-xs text-slate-500">Datos ficticios</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Todavía no hay empresas habilitadas. Un administrador Root debe marcar una cuenta como demo pública.
                </div>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-800">
                Correo demo
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="demo@ejemplo.com"
                  className="h-12 rounded-xl"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-800">
                Contraseña
                <span className="relative block">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                    placeholder="Contraseña compartida"
                    className="h-12 rounded-xl pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            </div>

            {error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={!canSubmit || companies.length === 0}
              className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-base font-semibold text-[var(--indice-brand-shell-foreground)] hover:bg-[var(--indice-brand-action-hover)]"
            >
              {submitting ? (
                <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Validando acceso…</>
              ) : (
                <>Entrar a la demostración <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>

            <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Este acceso solo funciona con empresas marcadas como demo pública. Las cuentas normales continúan utilizando el inicio seguro con verificación.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
