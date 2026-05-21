import { useEffect, useMemo, useState } from 'react';
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
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type PageState = 'loading' | 'ready' | 'invalid' | 'complete';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token = '' } = useParams();
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
        await authApi.validatePasswordResetToken(token);
        if (active) {
          setPageState('ready');
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : 'Password reset link is invalid or expired.');
        setPageState('invalid');
      }
    };

    void validateToken();

    return () => {
      active = false;
    };
  }, [token]);

  const canSubmit = useMemo(
    () => password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword && !isSubmitting,
    [confirmPassword, isSubmitting, password],
  );

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setErrorMessage(
        password !== confirmPassword
          ? 'Password and confirmation must match.'
          : 'Password must be at least 8 characters long.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await authApi.completePasswordReset(token, {
        password,
        confirm_password: confirmPassword,
      });
      setPassword('');
      setConfirmPassword('');
      setPageState('complete');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Password could not be reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = pageState === 'complete'
    ? 'Password reset complete'
    : pageState === 'invalid'
      ? 'Reset link unavailable'
      : 'Create a new password';

  const description = pageState === 'complete'
    ? 'You can now sign in with your new password.'
    : pageState === 'invalid'
      ? (errorMessage || 'This password reset link is invalid or expired.')
      : 'Enter a new password for your Indice account. Reset links expire after 10 minutes.';

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(20,54,117,0.45)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#143675] p-8 text-white sm:p-10">
            <div className="flex h-full min-h-72 flex-col justify-between gap-10">
              <div className="space-y-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/12">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight">Indice</h1>
                  <p className="max-w-sm text-sm leading-6 text-blue-100">
                    Secure account access for your company workspace.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/8 p-4 text-sm leading-6 text-blue-50">
                Reset links are single-use and expire after 10 minutes. Your password is changed only after this form is submitted.
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#143675]/8 px-3 py-1 text-sm font-medium text-[#143675]">
                <KeyRound className="h-4 w-4" />
                Password reset
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              <p className="text-sm leading-6 text-slate-600">{description}</p>
            </div>

            {pageState === 'loading' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Checking reset link...
              </div>
            ) : null}

            {pageState === 'ready' ? (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <PasswordField
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((current) => !current)}
                />
                <PasswordField
                  label="Confirm new password"
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
                  className="h-12 w-full rounded-xl bg-[#143675] text-white hover:bg-[#0f2855]"
                >
                  {isSubmitting ? 'Resetting password...' : (
                    <>
                      Reset password
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : null}

            {pageState === 'invalid' || pageState === 'complete' ? (
              <div className="space-y-5">
                <StatusMessage
                  tone={pageState === 'complete' ? 'success' : 'warning'}
                  message={description}
                />
                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="h-12 w-full rounded-xl bg-[#143675] text-white hover:bg-[#0f2855]"
                >
                  Go to login
                  <ArrowRight className="h-4 w-4" />
                </Button>
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
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-sm ${styles}`}>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
