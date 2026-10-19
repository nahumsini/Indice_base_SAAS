import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import type { MfaRequiredResponse } from '../api/auth.types';
import {
  LoadingBarOverlay,
  runWithMinimumDuration,
} from '../components/LoadingBarOverlay';
import { getLoadingBarCopy } from '../components/loadingTranslations';
import { ApiClientError } from '../lib/apiClient';
import { OtpVerificationPanel } from './components/OtpVerificationPanel';
import { getLoginVerificationCopy } from './loginVerificationCopy';
import { useLanguage } from '../shared/context';
import { isValidEmail, normalizeEmail } from '../shared/validation/email';
import { LoginBrandPanel } from './components/LoginBrandPanel';
import { LoginFormPanel } from './components/LoginFormPanel';
import { LoginSiteFooter } from './components/LoginSiteFooter';
import { LoginSiteHeader } from './components/LoginSiteHeader';
import { OAuthLoginBrandPanel } from './components/OAuthLoginBrandPanel';
import { PasswordResetModal } from './components/PasswordResetModal';
import { getLoginShellCopy } from './translations/loginShell';

const LOGIN_MINIMUM_LOADING_MS = 2500;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    authenticationExpired?: boolean;
    returnTo?: string;
    companyName?: string;
    email?: string;
    openPasswordReset?: boolean;
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
  const [mfaChallenge, setMfaChallenge] = useState<(MfaRequiredResponse & { receivedAt: number }) | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [isOtpResending, setIsOtpResending] = useState(false);
  const [now, setNow] = useState(Date.now);
  const authPending = useRef(false);
  const [otpUnavailable, setOtpUnavailable] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const remaining = (seconds: number) => mfaChallenge ? Math.max(0, Math.ceil((mfaChallenge.receivedAt + seconds * 1000 - now) / 1000)) : 0;
  const resendAvailableIn = remaining(mfaChallenge?.resendAvailableInSeconds ?? 0);
  const expiresIn = remaining(mfaChallenge?.expiresInSeconds ?? 0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showResetModal, setShowResetModal] = useState(locationState?.openPasswordReset === true);
  const resetPending = useRef(false);
  const alive = useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [resetEmail, setResetEmail] = useState(typeof locationState?.email==='string'?locationState.email:'');
  const [resetEmailTouched, setResetEmailTouched] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const copy = t.loginPage;
  const shellCopy = getLoginShellCopy(currentLanguage.code);
  const verificationCopy = getLoginVerificationCopy(currentLanguage.code);
  const otpLoadingCopy = getLoadingBarCopy(currentLanguage.code, 'verifyingCode');
  const safeReturnTo = locationState?.returnTo?.startsWith('/')
    && !locationState.returnTo.startsWith('//')
    && !/[\\\u0000-\u0020]/.test(locationState.returnTo)
    ? locationState.returnTo
    : '/dashboard';
  const isOAuthContinuation = safeReturnTo.startsWith('/oauth/authorize')
    || (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'oauth');

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
    () => normalizedResetEmail.length > 0 && resetEmailIsValid && !isResetSubmitting && !resetMessage,
    [isResetSubmitting, normalizedResetEmail, resetEmailIsValid, resetMessage],
  );
  const canSubmitOtp = useMemo(
    () => Boolean(mfaChallenge?.challengeId) && otpCode.replace(/\D/g, '').length === 6 && !isOtpSubmitting && !isOtpResending && expiresIn > 0 && !otpUnavailable,
    [isOtpSubmitting, isOtpResending, expiresIn, otpUnavailable, mfaChallenge?.challengeId, otpCode],
  );

  useEffect(() => {
    if (!mfaChallenge) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [mfaChallenge]);

  const enterChallenge = (response: MfaRequiredResponse) => {
    setNow(Date.now());
    setMfaChallenge({ ...response, receivedAt: Date.now() });
    setOtpUnavailable(false);
  };
  const finishSignIn = () => navigate(safeReturnTo, { replace: true, state: { successToast: copy.successToast } });
  const showAuthError = (error: unknown, step: 'login' | 'verify' | 'resend') => {
    const code = error instanceof ApiClientError ? error.code : undefined;
    const status = error instanceof ApiClientError ? error.status : 0;
    const unavailable = status === 423 || ['MFA_OTP_EXPIRED', 'MFA_CHALLENGE_UNAVAILABLE'].includes(code ?? '');
    if (step !== 'login' && unavailable) setOtpUnavailable(true);
    const unconfirmed = !status || status >= 500;
    setUncertain(step !== 'resend' && unconfirmed && code !== 'MFA_EMAIL_FAILED');
    setErrorMessage(status === 423 ? verificationCopy.locked
      : code === 'MFA_OTP_EXPIRED' ? verificationCopy.expired
      : code === 'MFA_OTP_INVALID' ? verificationCopy.invalid
      : code === 'MFA_CHALLENGE_UNAVAILABLE' || (step !== 'login' && status === 401) ? verificationCopy.unavailable
      : code === 'MFA_EMAIL_FAILED' ? (step === 'login' ? verificationCopy.initialSendFailed : verificationCopy.sendFailed)
      : step === 'resend' ? verificationCopy.resendUncertain
      : unconfirmed ? verificationCopy.network
      : step === 'login' ? verificationCopy.loginFailed : verificationCopy.unavailable);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompanyNameTouched(true);
    setEmailTouched(true);
    if (!canSubmit || authPending.current) return;
    authPending.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    setUncertain(false);
    try {
      // Preserve the exact password, including intentional spaces.
      const response = await runWithMinimumDuration(authApi.login({
        companyName: normalizedCompanyName,
        email: normalizedEmail,
        password,
      }), LOGIN_MINIMUM_LOADING_MS);
      if (!alive.current) return;
      setPassword('');
      setShowPassword(false);
      if ('mfaRequired' in response && response.mfaRequired) {
        enterChallenge(response);
        setOtpCode('');
        setOtpStatus('');
      } else finishSignIn();
    } catch (error) {
      if (alive.current) showAuthError(error, 'login');
    } finally {
      authPending.current = false;
      if (alive.current) setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaChallenge || !canSubmitOtp || authPending.current) return;
    authPending.current = true;
    setIsOtpSubmitting(true);
    setErrorMessage('');
    setOtpStatus('');
    setUncertain(false);
    try {
      await authApi.verifyLoginOtp({ challengeId: mfaChallenge.challengeId, otpCode: otpCode.replace(/\D/g, '') });
      if (alive.current) { setOtpCode(''); finishSignIn(); }
    } catch (error) {
      if (alive.current) showAuthError(error, 'verify');
    } finally {
      authPending.current = false;
      if (alive.current) setIsOtpSubmitting(false);
    }
  };

  const handleOtpResend = async () => {
    if (!mfaChallenge || resendAvailableIn > 0 || expiresIn <= 0 || otpUnavailable || authPending.current) return;
    authPending.current = true;
    setIsOtpResending(true);
    setErrorMessage('');
    setOtpStatus('');
    setUncertain(false);
    try {
      const response = await authApi.resendLoginOtp({ challengeId: mfaChallenge.challengeId });
      if (!alive.current) return;
      enterChallenge(response);
      if (response.codeSent !== false) {
        setOtpCode('');
        setOtpStatus(verificationCopy.resent);
      }
    } catch (error) {
      if (alive.current) showAuthError(error, 'resend');
    } finally {
      authPending.current = false;
      if (alive.current) setIsOtpResending(false);
    }
  };

  const returnToPasswordStep = () => {
    if (authPending.current) return;
    setMfaChallenge(null);
    setOtpCode('');
    setPassword('');
    setOtpUnavailable(false);
    setErrorMessage('');
    setOtpStatus('');
    setUncertain(false);
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
    if (authPending.current) return;
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

    if (resetPending.current || !canSubmitReset) {
      return;
    }

    resetPending.current=true;
    try {
      setIsResetSubmitting(true);
      setResetMessage('');
      setResetErrorMessage('');
      await authApi.requestPasswordReset({ email: normalizedResetEmail });
      if(alive.current) setResetMessage(copy.resetSuccessFallback);
    } catch (error) {
      if(alive.current) setResetErrorMessage(copy.resetErrorFallback);
    } finally {
      resetPending.current=false;
      if(alive.current) setIsResetSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen flex-col text-slate-900">
        <LoginSiteHeader copy={shellCopy} />
        <main id="login-main" className="flex flex-1 flex-col bg-[linear-gradient(135deg,_#F8FAFC_0%,_#EEF4FA_52%,_#F8FAFC_100%)] px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-4 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-6 lg:py-8 xl:gap-7">
            {isOAuthContinuation ? (
              <OAuthLoginBrandPanel companyName={normalizedCompanyName} logoAlt={copy.logoAlt} />
            ) : (
              <LoginBrandPanel copy={copy} />
            )}
            {mfaChallenge ? (
              <OtpVerificationPanel
                copy={verificationCopy}
                expiresIn={expiresIn}
                unavailable={otpUnavailable}
                uncertain={uncertain}
                statusMessage={otpStatus}
                maskedDestination={mfaChallenge.maskedDestination}
                otpCode={otpCode}
                isSubmitting={isOtpSubmitting}
                isResending={isOtpResending}
                canSubmit={canSubmitOtp}
                resendAvailableIn={resendAvailableIn}
                errorMessage={errorMessage}
                onOtpChange={(value) => {
                  if (authPending.current) return;
                  setOtpStatus('');
                  setOtpCode(value.replace(/\D/g, '').slice(0, 6));
                  setErrorMessage('');
                }}
                onSubmit={handleOtpSubmit}
                onResend={handleOtpResend}
                onBack={returnToPasswordStep}
              />
            ) : (
              <div className="order-1 min-w-0 lg:order-2">
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
                onSubmit={handleSubmit}
              />
              {uncertain ? <button type="button" disabled={isSubmitting} onClick={()=>window.location.reload()} className="mt-3 min-h-11 w-full text-sm font-bold text-[var(--indice-structural-blue)] underline">{verificationCopy.reload}</button> : null}
              </div>
            )}
          </div>
        </main>
        <LoginSiteFooter copy={shellCopy} />
      </div>

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
