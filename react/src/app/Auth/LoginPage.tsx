import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import type { MfaRequiredResponse } from '../api/auth.types';
import {
  LoadingBarOverlay,
  runWithMinimumDuration,
} from '../components/LoadingBarOverlay';
import { getLoadingBarCopy } from '../components/loadingTranslations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLanguage } from '../shared/context';
import { isValidEmail, normalizeEmail } from '../shared/validation/email';
import { LoginBrandPanel } from './components/LoginBrandPanel';
import { PublicPlansHeader } from './PublicPlans/PublicPlansHeader';
import { getPublicPlansCopy } from './PublicPlans/publicPlansCopy';
import { LoginFormPanel } from './components/LoginFormPanel';
import { PasswordResetModal } from './components/PasswordResetModal';

const LOGIN_MINIMUM_LOADING_MS = 2500;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    authenticationExpired?: boolean;
    returnTo?: string;
    companyName?: string;
    email?: string;
  } | null;
  const { currentLanguage, t } = useLanguage();
  const [companyName, setCompanyName] = useState(
    typeof locationState?.companyName === 'string' ? locationState.companyName : '',
  );
  const [email, setEmail] = useState(
    typeof locationState?.email === 'string' ? locationState.email : '',
  );
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<MfaRequiredResponse | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [isOtpResending, setIsOtpResending] = useState(false);
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailTouched, setResetEmailTouched] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const copy = t.loginPage;
  const otpLoadingCopy = getLoadingBarCopy(currentLanguage.code, 'verifyingCode');
  const safeReturnTo = locationState?.returnTo?.startsWith('/')
    && !locationState.returnTo.startsWith('//')
    ? locationState.returnTo
    : '/dashboard';

  const normalizedEmail = normalizeEmail(email);
  const normalizedCompanyName = companyName.trim();
  const passwordIsPresent = password.trim().length > 0;
  const emailIsValid = isValidEmail(normalizedEmail);
  const showEmailError = emailTouched && normalizedEmail.length > 0 && !emailIsValid;
  const showCompanyNameError = companyNameTouched && normalizedCompanyName.length <= 1;
  const normalizedResetEmail = normalizeEmail(resetEmail);
  const resetEmailIsValid = isValidEmail(normalizedResetEmail);
  const showResetEmailError = resetEmailTouched && normalizedResetEmail.length > 0 && !resetEmailIsValid;

  const canSubmit = useMemo(
    () => normalizedCompanyName.length > 1 && normalizedEmail.length > 0 && emailIsValid && passwordIsPresent && !isSubmitting,
    [emailIsValid, isSubmitting, normalizedCompanyName, normalizedEmail, passwordIsPresent],
  );

  const canSubmitReset = useMemo(
    () => normalizedResetEmail.length > 0 && resetEmailIsValid && !isResetSubmitting,
    [isResetSubmitting, normalizedResetEmail, resetEmailIsValid],
  );
  const canSubmitOtp = useMemo(
    () => Boolean(mfaChallenge?.challengeId) && otpCode.replace(/\D/g, '').length === 6 && !isOtpSubmitting,
    [isOtpSubmitting, mfaChallenge?.challengeId, otpCode],
  );

  useEffect(() => {
    if (!mfaChallenge) {
      setResendAvailableIn(0);
      return undefined;
    }
    setResendAvailableIn(Math.max(0, mfaChallenge.resendAvailableInSeconds));
    const timer = window.setInterval(() => {
      setResendAvailableIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mfaChallenge]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCompanyNameTouched(true);
    setEmailTouched(true);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await runWithMinimumDuration(
        authApi.login({
          companyName: normalizedCompanyName,
          email: normalizedEmail,
          // Passwords are secrets, not display text: preserve every character
          // exactly as it was supplied during account creation.
          password,
        }),
        LOGIN_MINIMUM_LOADING_MS,
      );

      setIsSubmitting(false);
      if ('mfaRequired' in response && response.mfaRequired) {
        setMfaChallenge(response);
        setPassword('');
        setOtpCode('');
        return;
      }
      navigate(safeReturnTo, {
        replace: true,
        state: {
          successToast: copy.successToast,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorFallback);
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaChallenge || !canSubmitOtp) {
      return;
    }
    try {
      setIsOtpSubmitting(true);
      setErrorMessage('');
      await authApi.verifyLoginOtp({
        challengeId: mfaChallenge.challengeId,
        otpCode: otpCode.replace(/\D/g, ''),
      });
      navigate(safeReturnTo, {
        replace: true,
        state: {
          successToast: copy.successToast,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorFallback);
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleOtpResend = async () => {
    if (!mfaChallenge || resendAvailableIn > 0 || isOtpResending) {
      return;
    }
    try {
      setIsOtpResending(true);
      setErrorMessage('');
      const response = await authApi.resendLoginOtp({ challengeId: mfaChallenge.challengeId });
      setMfaChallenge(response);
      setOtpCode('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorFallback);
    } finally {
      setIsOtpResending(false);
    }
  };

  const returnToPasswordStep = () => {
    setMfaChallenge(null);
    setOtpCode('');
    setPassword('');
    setErrorMessage('');
  };

  const updateCompanyName = (value: string) => {
    setCompanyName(value);
    setErrorMessage('');
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setErrorMessage('');
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    setErrorMessage('');
  };

  const openResetModal = () => {
    setResetEmail(emailIsValid ? normalizedEmail : '');
    setResetEmailTouched(false);
    setResetMessage('');
    setResetErrorMessage('');
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    if (!isResetSubmitting) {
      setShowResetModal(false);
    }
  };

  const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetEmailTouched(true);

    if (!canSubmitReset) {
      return;
    }

    try {
      setIsResetSubmitting(true);
      setResetMessage('');
      setResetErrorMessage('');
      const response = await authApi.requestPasswordReset({ email: normalizedResetEmail });
      setResetMessage(response.message || copy.resetSuccessFallback);
    } catch (error) {
      setResetErrorMessage(error instanceof Error ? error.message : copy.resetErrorFallback);
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const openSignupPage = () => {
    navigate('/signup');
  };

  return (
    <>
      <PublicPlansHeader copy={getPublicPlansCopy(currentLanguage.code)} activePage="login" />
      <main className="flex min-h-[calc(100dvh-84px)] flex-col bg-[linear-gradient(135deg,_#F8FAFC_0%,_#EEF4FA_52%,_#F8FAFC_100%)] px-3 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-4 lg:flex-none lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-6 lg:pb-6 xl:gap-7">
          <LoginBrandPanel copy={copy} />
          {mfaChallenge ? (
            <OtpVerificationPanel
              maskedDestination={mfaChallenge.maskedDestination}
              otpCode={otpCode}
              isSubmitting={isOtpSubmitting}
              isResending={isOtpResending}
              canSubmit={canSubmitOtp}
              resendAvailableIn={resendAvailableIn}
              errorMessage={errorMessage}
              onOtpChange={(value) => {
                setOtpCode(value.replace(/\D/g, '').slice(0, 6));
                setErrorMessage('');
              }}
              onSubmit={handleOtpSubmit}
              onResend={handleOtpResend}
              onBack={returnToPasswordStep}
            />
          ) : (
            <LoginFormPanel
              copy={copy}
              email={email}
              companyName={companyName}
              password={password}
              showPassword={showPassword}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
              showCompanyNameError={showCompanyNameError}
              showEmailError={showEmailError}
              errorMessage={errorMessage}
              sessionMessage={locationState?.authenticationExpired ? copy.sessionExpired : ''}
              onCompanyNameChange={updateCompanyName}
              onCompanyNameBlur={() => setCompanyNameTouched(true)}
              onEmailChange={updateEmail}
              onEmailBlur={() => setEmailTouched(true)}
              onPasswordChange={updatePassword}
              onTogglePassword={() => setShowPassword((current) => !current)}
              onOpenResetModal={openResetModal}
              onOpenSignupMode={openSignupPage}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </main>

      <LoadingBarOverlay
        isVisible={isSubmitting || isOtpSubmitting}
        title={isOtpSubmitting ? otpLoadingCopy.title : copy.signingIn}
        description={isOtpSubmitting ? otpLoadingCopy.description : undefined}
      />

      {showResetModal ? (
        <PasswordResetModal
          copy={copy}
          resetEmail={resetEmail}
          isResetSubmitting={isResetSubmitting}
          canSubmitReset={canSubmitReset}
          showResetEmailError={showResetEmailError}
          resetMessage={resetMessage}
          resetErrorMessage={resetErrorMessage}
          onClose={closeResetModal}
          onEmailChange={(value) => {
            setResetEmail(value);
            setResetMessage('');
            setResetErrorMessage('');
          }}
          onEmailBlur={() => setResetEmailTouched(true)}
          onSubmit={handlePasswordResetRequest}
        />
      ) : null}
    </>
  );
}

function OtpVerificationPanel({
  maskedDestination,
  otpCode,
  isSubmitting,
  isResending,
  canSubmit,
  resendAvailableIn,
  errorMessage,
  onOtpChange,
  onSubmit,
  onResend,
  onBack,
}: {
  maskedDestination: string;
  otpCode: string;
  isSubmitting: boolean;
  isResending: boolean;
  canSubmit: boolean;
  resendAvailableIn: number;
  errorMessage: string;
  onOtpChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <section className="order-1 flex items-start lg:order-2 lg:items-center">
      <div className="w-full rounded-[24px] border border-white/90 bg-white/95 p-5 shadow-[0_24px_70px_-42px_rgba(34,40,49,0.42)] backdrop-blur sm:p-6 lg:rounded-[28px] xl:p-7">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--indice-structural-blue)] underline-offset-4 transition hover:text-[var(--indice-structural-blue-hover)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Use different account
        </button>

        <div className="mb-5 space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1 text-sm font-bold text-[var(--indice-brand-action)]">
            <ShieldCheck className="h-4 w-4" />
            Secure verification
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#222831] sm:text-3xl">
            Enter your verification code
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            We sent a 6-digit code to {maskedDestination}.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Verification code</span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(event) => onOtpChange(event.target.value)}
                placeholder="000000"
                className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-center text-lg font-bold tracking-[0.35em] shadow-sm focus-visible:border-[var(--indice-brand-aqua)] focus-visible:ring-[var(--indice-brand-aqua)]/25"
                required
              />
            </span>
          </label>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl bg-[var(--indice-brand-action)] text-white shadow-sm shadow-emerald-950/15 hover:bg-[var(--indice-brand-action-hover)]"
          >
            {isSubmitting ? 'Verifying...' : (
              <>
                Verify and sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={onResend}
            disabled={resendAvailableIn > 0 || isResending}
            className="inline-flex items-center gap-2 font-bold text-[var(--indice-structural-blue)] underline-offset-4 transition hover:text-[var(--indice-structural-blue-hover)] hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
            {resendAvailableIn > 0 ? `Resend in ${resendAvailableIn}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </section>
  );
}
