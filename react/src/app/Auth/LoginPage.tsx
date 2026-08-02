import { useMemo, useState, type FormEvent } from 'react';
import { Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { authApi } from '../api/auth';
import {
  LoadingBarOverlay,
  runWithMinimumDuration,
} from '../components/LoadingBarOverlay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { languages, useLanguage } from '../shared/context';
import { isValidEmail, normalizeEmail } from '../shared/validation/email';
import { LoginBrandPanel } from './components/LoginBrandPanel';
import { IndiceBrandLogo } from './components/IndiceBrandLogo';
import { LoginFormPanel } from './components/LoginFormPanel';
import { PasswordResetModal } from './components/PasswordResetModal';

const LOGIN_MINIMUM_LOADING_MS = 2500;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const locationState = location.state as {
    authenticationExpired?: boolean;
    returnTo?: string;
  } | null;
  const safeReturnTo = locationState?.returnTo?.startsWith('/')
    && !locationState.returnTo.startsWith('//')
    ? locationState.returnTo
    : '/dashboard';

  const normalizedEmail = normalizeEmail(email);
  const normalizedCompanyName = companyName.trim();
  const normalizedPassword = password.trim();
  const emailIsValid = isValidEmail(normalizedEmail);
  const showEmailError = emailTouched && normalizedEmail.length > 0 && !emailIsValid;
  const showCompanyNameError = companyNameTouched && normalizedCompanyName.length <= 1;
  const normalizedResetEmail = normalizeEmail(resetEmail);
  const resetEmailIsValid = isValidEmail(normalizedResetEmail);
  const showResetEmailError = resetEmailTouched && normalizedResetEmail.length > 0 && !resetEmailIsValid;

  const canSubmit = useMemo(
    () => normalizedCompanyName.length > 1 && normalizedEmail.length > 0 && emailIsValid && normalizedPassword.length > 0 && !isSubmitting,
    [emailIsValid, isSubmitting, normalizedCompanyName, normalizedEmail, normalizedPassword],
  );

  const canSubmitReset = useMemo(
    () => normalizedResetEmail.length > 0 && resetEmailIsValid && !isResetSubmitting,
    [isResetSubmitting, normalizedResetEmail, resetEmailIsValid],
  );

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
      await runWithMinimumDuration(
        authApi.login({
          companyName: normalizedCompanyName,
          email: normalizedEmail,
          password: normalizedPassword,
        }),
        LOGIN_MINIMUM_LOADING_MS,
      );

      setIsSubmitting(false);
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
      <main className="flex min-h-screen flex-col bg-[linear-gradient(135deg,_#F8FAFC_0%,_#EEF4FA_52%,_#F8FAFC_100%)] px-3 py-3 text-slate-900 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto mb-3 flex w-full max-w-[1420px] items-center justify-between lg:mb-4 lg:justify-end">
          <IndiceBrandLogo alt={copy.logoAlt} className="h-12 w-36 lg:hidden" imageClassName="w-44" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 rounded-full border-slate-200 bg-white/90 px-3 text-[var(--indice-structural-blue)] shadow-sm hover:text-[var(--indice-structural-blue-hover)] sm:px-4">
                <Globe className="h-4 w-4" />
                <span className="text-base">{currentLanguage.flag}</span>
                <span className="hidden sm:inline">{currentLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => setCurrentLanguage(language)}
                  className={currentLanguage.code === language.code ? 'bg-gray-100' : ''}
                >
                  <span className="mr-2 text-xl">{language.flag}</span>
                  {language.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-4 lg:flex-none lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-6 lg:pb-6 xl:gap-7">
          <LoginBrandPanel copy={copy} />
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
        </div>
      </main>

      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={copy.signingIn}
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
