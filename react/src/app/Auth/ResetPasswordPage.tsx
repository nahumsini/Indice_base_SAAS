import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { authApi } from '../api/auth';
import { ApiClientError } from '../lib/apiClient';
import { useLanguage } from '../shared/context';
import { getPasswordRecoveryCopy, newPasswordIssue, recoveryError } from './passwordRecoveryCopy';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type PageState = 'loading' | 'ready' | 'invalid' | 'complete' | 'loadError' | 'uncertain';

export default function ResetPasswordPage() {
  const { token = '' } = useParams();
  return <PasswordResetForm key={token} token={token} />;
}

function PasswordResetForm({token}: {token: string}) {
  const navigate = useNavigate();
  const {currentLanguage} = useLanguage();
  const copy = getPasswordRecoveryCopy(currentLanguage.code);
  const alive = useRef(true);
  const pending = useRef(false);
  const loginPending = useRef(false);
  const [loadRevision,setLoadRevision] = useState(0);
  const [touched,setTouched] = useState(false);
  const [confirmationTouched,setConfirmationTouched] = useState(false);
  const [preparingLogin,setPreparingLogin] = useState(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!token.trim()) {
        setPageState('invalid');
        return;
      }

      try {
        setPageState('loading');
        setErrorMessage('');
        const result = await authApi.validatePasswordResetToken(token);
        if (active) {
          setPageState(result.valid ? 'ready' : 'invalid');
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage('');
        setPageState(error instanceof ApiClientError && error.status === 404 ? 'invalid' : 'loadError');
      }
    };

    void validateToken();

    return () => {
      active = false;
    };
  }, [token,loadRevision]);

  const issue = newPasswordIssue(password);
  const mismatch = password !== confirmPassword;
  const canSubmit = pageState === 'ready' && !issue && !mismatch && !isSubmitting;

  const goToLogin = async (requestAnother = false) => {
    if(loginPending.current) return;
    loginPending.current=true;
    setPreparingLogin(true);
    setErrorMessage('');
    try {
      try { await authApi.logout(); }
      catch(error) { if(!(error instanceof ApiClientError && error.status===401)) throw error; }
      if(alive.current) navigate('/login',{replace:true,state:{openPasswordReset:requestAnother}});
    } catch { if(alive.current) setErrorMessage(copy.preparationError); }
    finally { loginPending.current=false; if(alive.current) setPreparingLogin(false); }
  };
  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(pending.current || pageState !== 'ready') return;
    if(!canSubmit){setTouched(true);setConfirmationTouched(true);return;}
    pending.current=true;setIsSubmitting(true);setErrorMessage('');
    try {
      const receipt=await authApi.completePasswordReset(token,{password,confirm_password:confirmPassword});
      if(!alive.current)return;
      if(!receipt.success)throw new Error('Unconfirmed password reset');
      setPassword('');setConfirmPassword('');setPageState('complete');
    } catch(error) {
      if(!alive.current)return;
      if(!(error instanceof ApiClientError) || error.status>=500){
        try {
          const current=await authApi.validatePasswordResetToken(token);
          if(!alive.current)return;
          if(current.valid){setErrorMessage(copy.saveError);return;}
        }catch { /* A consumed/expired link cannot prove that this attempt committed. */ }
        if(!alive.current)return;
        setPassword('');setConfirmPassword('');setPageState('uncertain');return;
      }
      const message=error instanceof Error?error.message:'';
      if(message.toLowerCase().includes('invalid or expired')){
        setPassword('');setConfirmPassword('');setPageState('invalid');return;
      }
      setErrorMessage(recoveryError(message,copy));
    } finally { pending.current=false;if(alive.current)setIsSubmitting(false); }
  };

  const title = pageState==='complete' ? copy.completeTitle : pageState==='invalid' ? copy.invalidTitle
    : pageState==='loadError' ? copy.loadTitle : pageState==='uncertain' ? copy.uncertainTitle : copy.readyTitle;
  const description = pageState==='complete' ? copy.completeDescription : pageState==='invalid' ? copy.invalidDescription
    : pageState==='loadError' ? copy.loadDescription : pageState==='uncertain' ? copy.uncertainDescription : copy.readyDescription;

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-3 py-4 sm:px-4 sm:py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(20,54,117,0.45)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[var(--indice-brand-shell)] p-5 sm:p-8 text-[var(--indice-brand-shell-foreground)] sm:p-10">
            <div className="flex h-full min-h-0 lg:min-h-72 flex-col justify-between gap-5 lg:gap-10">
              <div className="space-y-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/12">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight">Índice</h1>
                  <p className="max-w-sm text-sm leading-6 text-[var(--indice-brand-shell-muted)]">
                    {copy.brand}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/8 p-4 text-sm leading-6 text-[var(--indice-brand-shell-foreground)]/90">
                {copy.safety}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-10">
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--indice-brand-soft)] px-3 py-1 text-sm font-medium text-[var(--indice-brand-text)]">
                <KeyRound className="h-4 w-4" />
                {copy.badge}
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              <p className="text-sm leading-6 text-slate-600">{description}</p>
            </div>

            {pageState === 'loading' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                {copy.loading}
              </div>
            ) : null}

            {pageState === 'ready' ? (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <PasswordField
                  label={copy.password}
                  disabled={isSubmitting}
                  onBlur={()=>setTouched(true)}
                  error={touched && issue ? copy[issue] : ''}
                  showLabel={copy.show} hideLabel={copy.hide}
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((current) => !current)}
                />
                <PasswordField
                  label={copy.confirmation}
                  disabled={isSubmitting}
                  onBlur={()=>setConfirmationTouched(true)}
                  error={confirmationTouched && mismatch ? copy.mismatch : ''}
                  showLabel={copy.show} hideLabel={copy.hide}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword((current) => !current)}
                />

                {errorMessage ? (
                  <StatusMessage tone="error" message={errorMessage} />
                ) : null}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-[var(--indice-brand-shell-foreground)] hover:bg-[var(--indice-brand-action-hover)]"
                >
                  {isSubmitting ? copy.saving : (
                    <>
                      {copy.save}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : null}

            {['invalid','complete','loadError','uncertain'].includes(pageState) ? (
              <div className="space-y-5">
                <StatusMessage
                  tone={pageState === 'complete' ? 'success' : 'warning'}
                  message={description}
                />
                <Button
                  type="button"
                  disabled={preparingLogin}
                  onClick={pageState==='loadError'?()=>setLoadRevision(x=>x+1):()=>void goToLogin(pageState==='invalid')}
                  className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-[var(--indice-brand-shell-foreground)] hover:bg-[var(--indice-brand-action-hover)]"
                >
                  {preparingLogin ? copy.preparing : pageState==='loadError' ? copy.reload : pageState==='invalid' ? copy.newLink : copy.login}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {errorMessage ? <StatusMessage tone="error" message={errorMessage}/> : null}
                {pageState==='uncertain' ? <Button type="button" variant="outline" disabled={preparingLogin} onClick={()=>void goToLogin(true)} className="h-12 w-full rounded-xl">{copy.newLink}</Button> : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusMessage({
  tone,
  message,
}: {
  tone: 'success' | 'warning' | 'error';
  message: string;
}) {
  const styles = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <div role={tone==='error'?'alert':'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-sm ${styles}`}>
      {tone === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  disabled, onBlur, error, showLabel, hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  disabled: boolean; onBlur: () => void; error: string; showLabel: string; hideLabel: string;
}) {
  const id=useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id} disabled={disabled} onBlur={onBlur} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-base sm:text-sm shadow-sm"
          autoComplete="new-password"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
