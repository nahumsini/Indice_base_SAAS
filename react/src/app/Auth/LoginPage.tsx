import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { authApi, type SignupCheckoutStatusResponse } from '../api/auth';
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
import {
  DEFAULT_PROFILE_COUNTRY,
  getProfileCountryLabel,
  PROFILE_COUNTRY_OPTIONS,
} from '../shared/profileCountries';
import { isValidEmail, normalizeEmail } from '../shared/validation/email';
import { LoginBrandPanel } from './components/LoginBrandPanel';
import { LoginFormPanel } from './components/LoginFormPanel';
import { PasswordResetModal } from './components/PasswordResetModal';
import { SIGNUP_ALL_MODULE_SLUGS, normalizeSignupModuleSlugs } from './signupModules';

const LOGIN_MINIMUM_LOADING_MS = 2500;
const SIGNUP_DRAFT_STORAGE_KEY = 'indice.auth.signupDraft.v1';
const SIGNUP_DRAFT_VERSION = 2;
const MINIMUM_EXTRA_COLLABORATORS = 0;
type SignupStep = 'account' | 'plan';
type SignupPlanId = 'one-module' | 'two-modules' | 'custom-modules' | 'all-modules';
type SignupValues = {
  companyName: string;
  fullName: string;
  email: string;
  password: string;
  industry: string;
  companySize: string;
  country: string;
  phone: string;
};
type SignupPlan = {
  planId: SignupPlanId;
  moduleCount: number;
  extraCollaborators: number;
  extraCollaboratorsTouched: boolean;
  selectedModuleSlugs: string[];
};
type SignupCheckoutReturn = {
  status: SignupCheckoutStatusResponse['status'] | 'cancelled';
  sessionId: string;
  message: string;
  canRestart: boolean;
  canLogin: boolean;
  isPolling?: boolean;
} | null;
type SignupDraft = {
  version?: number;
  authMode: 'login' | 'signup';
  signupStep: SignupStep;
  signupValues: SignupValues;
  signupPlan: SignupPlan;
};

const DEFAULT_SIGNUP_VALUES: SignupValues = {
  companyName: '',
  fullName: '',
  email: '',
  password: '',
  industry: '',
  companySize: '',
  country: DEFAULT_PROFILE_COUNTRY,
  phone: '',
};

const DEFAULT_SIGNUP_PLAN: SignupPlan = {
  planId: 'one-module',
  moduleCount: 1,
  extraCollaborators: 0,
  extraCollaboratorsTouched: false,
  selectedModuleSlugs: SIGNUP_ALL_MODULE_SLUGS.slice(0, 1),
};

const signupPlanIds = new Set<SignupPlanId>(['one-module', 'two-modules', 'custom-modules', 'all-modules']);

function normalizeSignupPlan(plan: SignupPlan): SignupPlan {
  const selected = normalizeSignupModuleSlugs(plan.selectedModuleSlugs);
  if (plan.planId === 'all-modules') {
    return { ...plan, moduleCount: SIGNUP_ALL_MODULE_SLUGS.length, selectedModuleSlugs: SIGNUP_ALL_MODULE_SLUGS };
  }
  if (plan.planId === 'one-module') {
    const modules = selected.slice(0, 1);
    return { ...plan, moduleCount: 1, selectedModuleSlugs: modules.length ? modules : SIGNUP_ALL_MODULE_SLUGS.slice(0, 1) };
  }
  if (plan.planId === 'two-modules') {
    const modules = fillSignupModules(selected, 2);
    return { ...plan, moduleCount: 2, selectedModuleSlugs: modules };
  }
  const modules = selected.length >= 3 ? selected : fillSignupModules(selected, 3);
  return { ...plan, moduleCount: modules.length, selectedModuleSlugs: modules };
}

function fillSignupModules(selected: string[], minimum: number) {
  const next = [...selected];
  for (const moduleSlug of SIGNUP_ALL_MODULE_SLUGS) {
    if (next.length >= minimum) {
      break;
    }
    if (!next.includes(moduleSlug)) {
      next.push(moduleSlug);
    }
  }
  return next;
}

function getSignupPlanValidation(plan: SignupPlan) {
  if (plan.planId === 'one-module' && plan.selectedModuleSlugs.length !== 1) {
    return 'Choose one module for this plan.';
  }
  if (plan.planId === 'two-modules' && plan.selectedModuleSlugs.length !== 2) {
    return 'Choose two modules for this plan.';
  }
  if (plan.planId === 'custom-modules' && plan.selectedModuleSlugs.length < 3) {
    return 'Choose at least three modules for this plan.';
  }
  return '';
}

function checkoutReturnFromStatus(
  response: SignupCheckoutStatusResponse,
  sessionId: string,
  isPolling = false,
): SignupCheckoutReturn {
  return {
    status: response.status,
    sessionId,
    message: response.message || defaultCheckoutStatusMessage(response.status),
    canRestart: response.canRestart,
    canLogin: response.canLogin,
    isPolling,
  };
}

function defaultCheckoutStatusMessage(status: SignupCheckoutStatusResponse['status']) {
  if (status === 'completed') {
    return 'Account setup is complete. You can sign in.';
  }
  if (status === 'pending') {
    return 'Payment setup received. We are creating your account.';
  }
  if (status === 'expired') {
    return 'Checkout expired after 30 minutes. Start account setup again.';
  }
  if (status === 'superseded') {
    return 'Checkout was replaced by a newer attempt.';
  }
  if (status === 'not_found') {
    return 'Checkout session was not found.';
  }
  return 'Checkout could not be completed.';
}

function readSignupDraft(): SignupDraft {
  if (typeof window === 'undefined') {
    return {
      authMode: 'login',
      signupStep: 'account',
      signupValues: DEFAULT_SIGNUP_VALUES,
      signupPlan: DEFAULT_SIGNUP_PLAN,
    };
  }

  try {
    window.localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
    const rawDraft = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      throw new Error('No signup draft.');
    }
    const parsed = JSON.parse(rawDraft) as Partial<SignupDraft>;
    const parsedPlanId = parsed.signupPlan?.planId;
    const parsedSignupValues = {
      ...DEFAULT_SIGNUP_VALUES,
      ...parsed.signupValues,
      password: '',
    };
    const extraCollaboratorsTouched = Boolean(parsed.signupPlan?.extraCollaboratorsTouched);
    const storedExtraCollaborators = Math.max(0, Number(parsed.signupPlan?.extraCollaborators ?? DEFAULT_SIGNUP_PLAN.extraCollaborators));
    const migratedPlanId = parsed.version === SIGNUP_DRAFT_VERSION
      ? parsedPlanId
      : DEFAULT_SIGNUP_PLAN.planId;
    const migratedSelectedModules = parsed.version === SIGNUP_DRAFT_VERSION
      ? normalizeSignupModuleSlugs(parsed.signupPlan?.selectedModuleSlugs)
      : DEFAULT_SIGNUP_PLAN.selectedModuleSlugs;
    const signupPlan: SignupPlan = normalizeSignupPlan({
      ...DEFAULT_SIGNUP_PLAN,
      ...parsed.signupPlan,
      planId: migratedPlanId && signupPlanIds.has(migratedPlanId) ? migratedPlanId : DEFAULT_SIGNUP_PLAN.planId,
      moduleCount: Math.max(1, Number(parsed.signupPlan?.moduleCount ?? DEFAULT_SIGNUP_PLAN.moduleCount)),
      extraCollaborators: storedExtraCollaborators,
      extraCollaboratorsTouched,
      selectedModuleSlugs: migratedSelectedModules,
    });

    return {
      authMode: parsed.authMode === 'signup' ? 'signup' : 'login',
      signupStep: parsed.signupStep === 'plan' ? 'plan' : 'account',
      signupValues: parsedSignupValues,
      signupPlan,
    };
  } catch {
    return {
      authMode: 'login',
      signupStep: 'account',
      signupValues: DEFAULT_SIGNUP_VALUES,
      signupPlan: DEFAULT_SIGNUP_PLAN,
    };
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const [signupDraftSeed] = useState(readSignupDraft);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>(signupDraftSeed.authMode);
  const [signupStep, setSignupStep] = useState<SignupStep>(signupDraftSeed.signupStep);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupValues, setSignupValues] = useState<SignupValues>(signupDraftSeed.signupValues);
  const [signupPlan, setSignupPlan] = useState<SignupPlan>(signupDraftSeed.signupPlan);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [signupErrorMessage, setSignupErrorMessage] = useState('');
  const [signupNoticeMessage, setSignupNoticeMessage] = useState('');
  const [signupCheckoutReturn, setSignupCheckoutReturn] = useState<SignupCheckoutReturn>(null);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailTouched, setResetEmailTouched] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const copy = t.loginPage;
  const countryOptions = useMemo(
    () => PROFILE_COUNTRY_OPTIONS.map((country) => ({
      value: country.code,
      label: getProfileCountryLabel(country, currentLanguage.code),
    })),
    [currentLanguage.code],
  );
  const industryOptions = useMemo(
    () => [
      {
        value: '',
        label: t.panelInicial.structure.fields.selectIndustry,
      },
      ...t.panelInicial.structure.options.businessIdentityIndustries,
    ],
    [t.panelInicial.structure.fields.selectIndustry, t.panelInicial.structure.options.businessIdentityIndustries],
  );

  const normalizedEmail = normalizeEmail(email);
  const normalizedCompanyName = companyName.trim();
  const emailIsValid = isValidEmail(normalizedEmail);
  const normalizedSignupEmail = normalizeEmail(signupValues.email);
  const signupEmailIsValid = isValidEmail(normalizedSignupEmail);
  const showEmailError = emailTouched && normalizedEmail.length > 0 && !emailIsValid;
  const showCompanyNameError = companyNameTouched && normalizedCompanyName.length <= 1;
  const normalizedResetEmail = normalizeEmail(resetEmail);
  const resetEmailIsValid = isValidEmail(normalizedResetEmail);
  const showResetEmailError = resetEmailTouched && normalizedResetEmail.length > 0 && !resetEmailIsValid;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedMode = params.get('mode');
    const signupStatus = params.get('signup');
    const checkoutSessionId = params.get('session_id')?.trim() ?? '';
    if (requestedMode === 'login') {
      window.localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      setAuthMode('login');
      setSignupStep('account');
      setSignupCheckoutReturn(null);
      setSignupErrorMessage('');
      setSignupNoticeMessage('');
      navigate('/login', { replace: true });
      return;
    }
    if (signupStatus === 'success') {
      window.localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      setAuthMode('login');
      setSignupCheckoutReturn(checkoutSessionId
        ? checkoutReturnFromStatus({
          status: 'pending',
          message: 'Payment setup received. We are creating your account.',
          companyId: null,
          canRestart: false,
          canLogin: false,
        }, checkoutSessionId, true)
        : {
          status: 'not_found',
          sessionId: '',
          message: 'Checkout reference was missing. Please restart account setup.',
          canRestart: true,
          canLogin: false,
        });
      setSignupNoticeMessage('');
      setSignupErrorMessage('');
      navigate('/login', { replace: true });
    }
    if (signupStatus === 'cancelled') {
      setAuthMode('signup');
      setSignupStep('plan');
      setSignupCheckoutReturn({
        status: 'cancelled',
        sessionId: '',
        message: 'Checkout was cancelled. No account was created and no charge was made.',
        canRestart: true,
        canLogin: false,
      });
      setSignupErrorMessage('');
      setSignupNoticeMessage('');
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (signupCheckoutReturn?.status !== 'pending' || !signupCheckoutReturn.sessionId) {
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number | undefined;
    const maxAttempts = 8;

    const pollStatus = async () => {
      try {
        const response = await authApi.signupCheckoutStatus(signupCheckoutReturn.sessionId);
        if (cancelled) {
          return;
        }
        const stillPending = response.status === 'pending';
        setSignupCheckoutReturn(checkoutReturnFromStatus(
          response,
          signupCheckoutReturn.sessionId,
          stillPending && attempts < maxAttempts,
        ));
        if (stillPending && attempts < maxAttempts) {
          attempts += 1;
          timeoutId = window.setTimeout(pollStatus, 2000);
        }
      } catch {
        if (!cancelled) {
          setSignupCheckoutReturn({
            status: 'failed',
            sessionId: signupCheckoutReturn.sessionId,
            message: 'We could not check account setup status. Please try signing in or restart setup.',
            canRestart: true,
            canLogin: false,
          });
        }
      }
    };

    pollStatus();
    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [signupCheckoutReturn?.sessionId, signupCheckoutReturn?.status]);

  const canSubmit = useMemo(
    () => normalizedCompanyName.length > 1 && normalizedEmail.length > 0 && emailIsValid && password.trim().length > 0 && !isSubmitting,
    [emailIsValid, isSubmitting, normalizedCompanyName, normalizedEmail, password],
  );

  const canSubmitReset = useMemo(
    () => normalizedResetEmail.length > 0 && resetEmailIsValid && !isResetSubmitting,
    [isResetSubmitting, normalizedResetEmail, resetEmailIsValid],
  );

  const signupValidationMessage = useMemo(() => {
    if (signupValues.companyName.trim().length <= 1) {
      return 'Enter your company name.';
    }
    if (signupValues.fullName.trim().length <= 1) {
      return 'Enter your full name.';
    }
    if (!normalizedSignupEmail) {
      return 'Enter your work email.';
    }
    if (!signupEmailIsValid) {
      return 'Enter a valid work email.';
    }
    if (signupValues.password.length < 8) {
      return 'Enter a password with at least 8 characters. For security, passwords are not saved after refresh.';
    }
    if (!signupValues.industry.trim()) {
      return 'Select your industry.';
    }
    if (!signupValues.companySize.trim()) {
      return 'Select your company size.';
    }
    if (!signupValues.country.trim()) {
      return 'Select your country.';
    }
    if (!signupValues.phone.trim()) {
      return 'Enter your phone number.';
    }
    return '';
  }, [normalizedSignupEmail, signupEmailIsValid, signupValues]);
  const minimumExtraCollaborators = MINIMUM_EXTRA_COLLABORATORS;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const rawDraft = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return;
    }
    try {
      const parsed = JSON.parse(rawDraft) as Partial<SignupDraft>;
      if (parsed.version !== SIGNUP_DRAFT_VERSION && signupPlan.planId === 'all-modules') {
        setSignupPlan(DEFAULT_SIGNUP_PLAN);
      }
    } catch {
      setSignupPlan(DEFAULT_SIGNUP_PLAN);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'login' || params.get('signup') === 'success') {
      window.localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      return;
    }

    const persistedValues = {
      ...signupValues,
      password: '',
    };
    window.localStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
    window.sessionStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify({
      version: SIGNUP_DRAFT_VERSION,
      authMode,
      signupStep,
      signupValues: persistedValues,
      signupPlan,
    }));
  }, [authMode, location.search, signupPlan, signupStep, signupValues]);

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
          password,
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

  const openSignupMode = () => {
    setSignupCheckoutReturn(null);
    setSignupValues((current) => ({
      ...current,
      email: current.email || (emailIsValid ? normalizedEmail : ''),
    }));
    setSignupErrorMessage('');
    setSignupNoticeMessage('');
    setSignupStep('account');
    setAuthMode('signup');
  };

  const openLoginMode = () => {
    if (isSignupSubmitting) {
      return;
    }
    setSignupCheckoutReturn(null);
    setAuthMode('login');
    setSignupErrorMessage('');
    setSignupNoticeMessage('');
    setSignupStep('account');
  };

  const updateSignupValue = (field: keyof typeof signupValues, value: string) => {
    setSignupValues((current) => ({ ...current, [field]: value }));
    setSignupCheckoutReturn(null);
    setSignupErrorMessage('');
    setSignupNoticeMessage('');
  };

  const updateSignupPlan = (field: keyof typeof signupPlan, value: string | number | boolean | string[]) => {
    setSignupPlan((current) => {
      const nextPlan = {
        ...current,
        [field]: value,
        extraCollaboratorsTouched: field === 'extraCollaborators' ? true : current.extraCollaboratorsTouched,
      } as SignupPlan;
      return normalizeSignupPlan(nextPlan);
    });
    setSignupCheckoutReturn(null);
    setSignupErrorMessage('');
    setSignupNoticeMessage('');
  };

  const goBackToSignupAccount = () => {
    setSignupCheckoutReturn(null);
    setAuthMode('signup');
    setSignupStep('account');
    setSignupErrorMessage('');
    setSignupNoticeMessage('');
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupCheckoutReturn(null);
    if (isSignupSubmitting) {
      return;
    }
    if (signupValidationMessage) {
      setSignupErrorMessage(signupValidationMessage);
      setSignupNoticeMessage('');
      if (signupStep === 'plan') {
        setSignupStep('account');
      }
      return;
    }

    if (signupStep === 'account') {
      setSignupErrorMessage('');
      setSignupNoticeMessage('');
      setSignupStep('plan');
      return;
    }

    const planValidationMessage = getSignupPlanValidation(signupPlan);
    if (planValidationMessage) {
      setSignupErrorMessage(planValidationMessage);
      setSignupNoticeMessage('');
      return;
    }

    setSignupErrorMessage('');
    setSignupNoticeMessage('');
    setIsSignupSubmitting(true);
    try {
      const checkout = await authApi.startSignupCheckout({
        companyName: signupValues.companyName.trim(),
        fullName: signupValues.fullName.trim(),
        email: normalizedSignupEmail,
        password: signupValues.password,
        industry: signupValues.industry.trim(),
        companySize: signupValues.companySize.trim(),
        country: signupValues.country.trim(),
        phone: signupValues.phone.trim(),
        planId: signupPlan.planId,
        moduleCount: signupPlan.moduleCount,
        extraCollaborators: signupPlan.extraCollaborators,
        selectedModuleSlugs: signupPlan.selectedModuleSlugs,
      });
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setSignupErrorMessage(error instanceof Error ? error.message : 'Secure payment checkout could not be started.');
      setIsSignupSubmitting(false);
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
            authMode={authMode}
            signupStep={signupStep}
            email={email}
            companyName={companyName}
            password={password}
            signupValues={signupValues}
            signupPlan={signupPlan}
            minimumExtraCollaborators={minimumExtraCollaborators}
            industryOptions={industryOptions}
            countryOptions={countryOptions}
            showPassword={showPassword}
            isSubmitting={isSubmitting}
            isSignupSubmitting={isSignupSubmitting}
            canSubmit={canSubmit}
            showCompanyNameError={showCompanyNameError}
            showEmailError={showEmailError}
            errorMessage={errorMessage}
            signupErrorMessage={signupErrorMessage}
            signupNoticeMessage={signupNoticeMessage}
            signupCheckoutReturn={signupCheckoutReturn}
            onCompanyNameChange={setCompanyName}
            onCompanyNameBlur={() => setCompanyNameTouched(true)}
            onEmailChange={setEmail}
            onEmailBlur={() => setEmailTouched(true)}
            onPasswordChange={setPassword}
            onSignupValueChange={updateSignupValue}
            onSignupPlanChange={updateSignupPlan}
            onTogglePassword={() => setShowPassword((current) => !current)}
            onOpenResetModal={openResetModal}
            onOpenSignupMode={openSignupMode}
            onOpenLoginMode={openLoginMode}
            onSignupBackToAccount={goBackToSignupAccount}
            onSubmit={handleSubmit}
            onSignupSubmit={handleSignupSubmit}
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
