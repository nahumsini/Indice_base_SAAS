import { useMemo, useState, type FormEvent } from 'react';
import { Globe } from 'lucide-react';
import { useNavigate } from 'react-router';
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
import { LoginFormPanel } from './components/LoginFormPanel';
import { PasswordResetModal } from './components/PasswordResetModal';

const LOGIN_MINIMUM_LOADING_MS = 2500;

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailTouched, setResetEmailTouched] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const copy = t.loginPage;

  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = password.trim();
  const emailIsValid = isValidEmail(normalizedEmail);
  const showEmailError = emailTouched && normalizedEmail.length > 0 && !emailIsValid;
  const normalizedResetEmail = normalizeEmail(resetEmail);
  const resetEmailIsValid = isValidEmail(normalizedResetEmail);
  const showResetEmailError = resetEmailTouched && normalizedResetEmail.length > 0 && !resetEmailIsValid;

  const canSubmit = useMemo(
    () => normalizedEmail.length > 0 && emailIsValid && normalizedPassword.length > 0 && !isSubmitting,
    [emailIsValid, isSubmitting, normalizedEmail, normalizedPassword],
  );

  const canSubmitReset = useMemo(
    () => normalizedResetEmail.length > 0 && resetEmailIsValid && !isResetSubmitting,
    [isResetSubmitting, normalizedResetEmail, resetEmailIsValid],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setEmailTouched(true);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await runWithMinimumDuration(
        authApi.login({
          email: normalizedEmail,
          password: normalizedPassword,
        }),
        LOGIN_MINIMUM_LOADING_MS,
      );

      setIsSubmitting(false);
      navigate('/dashboard', {
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
    if (isResetSubmitting) {
      return;
    }

    setShowResetModal(false);
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

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(135deg,_#F7F8FA_0%,_#EEF3F8_48%,_#F8FAFC_100%)] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex max-w-[1420px] justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 rounded-full border-slate-200 bg-white/90 px-4 text-[#155CFF] shadow-sm">
                <Globe className="h-4 w-4" />
                <span className="text-base">{currentLanguage.flag}</span>
                <span>{currentLanguage.name}</span>
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

        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[1420px] gap-6 lg:grid-cols-[1.18fr_0.82fr] xl:gap-8">
          <LoginBrandPanel copy={copy} />
          <LoginFormPanel
            copy={copy}
            email={email}
            password={password}
            showPassword={showPassword}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            showEmailError={showEmailError}
            errorMessage={errorMessage}
            onEmailChange={updateEmail}
            onEmailBlur={() => setEmailTouched(true)}
            onPasswordChange={updatePassword}
            onTogglePassword={() => setShowPassword((current) => !current)}
            onOpenResetModal={openResetModal}
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
