import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SIGNUP_MODULE_OPTIONS } from '../signupModules';
import type { LoginPageCopy } from './loginTypes';

type LoginFormPanelProps = {
  copy: LoginPageCopy;
  authMode: 'login' | 'signup';
  signupStep: SignupStep;
  companyName: string;
  email: string;
  password: string;
  signupValues: SignupValues;
  signupPlan: SignupPlanValues;
  minimumExtraCollaborators: number;
  industryOptions: SelectOption[];
  countryOptions: SelectOption[];
  showPassword: boolean;
  isSubmitting: boolean;
  isSignupSubmitting: boolean;
  canSubmit: boolean;
  showCompanyNameError: boolean;
  showEmailError: boolean;
  errorMessage: string;
  signupErrorMessage: string;
  signupNoticeMessage: string;
  signupCheckoutReturn: SignupCheckoutReturn;
  onCompanyNameChange: (value: string) => void;
  onCompanyNameBlur: () => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordChange: (value: string) => void;
  onSignupValueChange: (field: keyof SignupValues, value: string) => void;
  onSignupPlanChange: (field: keyof SignupPlanValues, value: string | number | boolean | string[]) => void;
  onTogglePassword: () => void;
  onOpenResetModal: () => void;
  onOpenSignupMode: () => void;
  onOpenLoginMode: () => void;
  onSignupBackToAccount: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignupSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type SignupStep = 'account' | 'plan';

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

type SelectOption = {
  value: string;
  label: string;
};

type SignupPlanId = 'one-module' | 'two-modules' | 'custom-modules' | 'all-modules';

type SignupPlanValues = {
  planId: SignupPlanId;
  moduleCount: number;
  extraCollaborators: number;
  extraCollaboratorsTouched: boolean;
  selectedModuleSlugs: string[];
};

type SignupCheckoutReturn = {
  status: 'pending' | 'completed' | 'expired' | 'failed' | 'superseded' | 'not_found' | 'cancelled';
  sessionId: string;
  message: string;
  canRestart: boolean;
  canLogin: boolean;
  isPolling?: boolean;
} | null;

const INCLUDED_COLLABORATORS = 5;
const EXTRA_COLLABORATOR_PRICE = 10;
const MIN_CUSTOM_MODULES = 3;

const planCards: Array<{
  id: SignupPlanId;
  title: string;
  description: string;
  priceLabel: string;
  badge?: string;
}> = [
  {
    id: 'one-module',
    title: 'One module',
    description: 'Start with one selected module after checkout. Includes 5 users.',
    priceLabel: '$59/mo',
  },
  {
    id: 'two-modules',
    title: 'Two modules',
    description: 'Two selected modules with the same trial rules. Includes 5 users.',
    priceLabel: '$99/mo',
  },
  {
    id: 'custom-modules',
    title: 'Additional modules',
    description: '$99 plus $49 for each module after the second. Includes 5 users.',
    priceLabel: '$49/additional',
  },
  {
    id: 'all-modules',
    title: 'All Basic modules',
    description: 'Launch offer package with the full Basic module suite and 5 users.',
    priceLabel: '$199/mo',
    badge: 'Launch offer',
  },
];

export function LoginFormPanel({
  copy,
  authMode,
  signupStep,
  companyName,
  email,
  password,
  signupValues,
  signupPlan,
  minimumExtraCollaborators,
  industryOptions,
  countryOptions,
  showPassword,
  isSubmitting,
  isSignupSubmitting,
  canSubmit,
  showCompanyNameError,
  showEmailError,
  errorMessage,
  signupErrorMessage,
  signupNoticeMessage,
  signupCheckoutReturn,
  onCompanyNameChange,
  onCompanyNameBlur,
  onEmailChange,
  onEmailBlur,
  onPasswordChange,
  onSignupValueChange,
  onSignupPlanChange,
  onTogglePassword,
  onOpenResetModal,
  onOpenSignupMode,
  onOpenLoginMode,
  onSignupBackToAccount,
  onSubmit,
  onSignupSubmit,
}: LoginFormPanelProps) {
  const isSignupMode = authMode === 'signup';
  const isPlanStep = signupStep === 'plan';
  const signupBasePrice = getPlanBasePrice(signupPlan);
  const extraCollaboratorTotal = signupPlan.extraCollaborators * EXTRA_COLLABORATOR_PRICE;
  const signupMonthlyTotal = signupBasePrice + extraCollaboratorTotal;

  return (
    <section className="flex items-center">
      <div className="w-full rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_70px_-42px_rgba(34,40,49,0.42)] backdrop-blur xl:p-8">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#155CFF]/8 px-3 py-1 text-sm font-bold text-[#155CFF]">
            <KeyRound className="h-4 w-4" />
            {copy.accessBadge}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#222831]">
            {isSignupMode && isPlanStep ? 'Choose your plan' : isSignupMode ? 'Create your company account' : copy.welcomeTitle}
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {isSignupMode && isPlanStep
              ? 'Choose the paid modules you will keep after the trial.'
              : isSignupMode
                ? 'Add your company details before selecting a plan.'
                : copy.welcomeText}
          </p>
        </div>

        {!isSignupMode && signupNoticeMessage && !signupCheckoutReturn ? (
          <div className="mb-4">
            <NoticeBox message={signupNoticeMessage} />
          </div>
        ) : null}

        {signupCheckoutReturn ? (
          <CheckoutReturnNotice
            result={signupCheckoutReturn}
            onContinueSignup={onSignupBackToAccount}
          />
        ) : null}

        {isSignupMode ? (
          <form onSubmit={onSignupSubmit} className="space-y-4">
            <SignupStepHeader step={signupStep} />

            {isPlanStep ? (
              <PlanSelectionPanel
                signupPlan={signupPlan}
                minimumExtraCollaborators={minimumExtraCollaborators}
                basePrice={signupBasePrice}
                extraCollaboratorTotal={extraCollaboratorTotal}
                monthlyTotal={signupMonthlyTotal}
                onSignupPlanChange={onSignupPlanChange}
              />
            ) : (
              <>
                <IconInput icon={Building2} label="Company name" value={signupValues.companyName} onChange={(value) => onSignupValueChange('companyName', value)} autoComplete="organization" required />
                <IconInput icon={UserRound} label="Your full name" value={signupValues.fullName} onChange={(value) => onSignupValueChange('fullName', value)} autoComplete="name" required />
                <IconInput icon={Mail} label="Work email" type="email" value={signupValues.email} onChange={(value) => onSignupValueChange('email', value)} autoComplete="email" required />
                <PasswordInput
                  copy={copy}
                  label="Password"
                  value={signupValues.password}
                  autoComplete="new-password"
                  showPassword={showPassword}
                  onChange={(value) => onSignupValueChange('password', value)}
                  onTogglePassword={onTogglePassword}
                  required
                />
                <IconSelect icon={Building2} label="Industry" value={signupValues.industry} onChange={(value) => onSignupValueChange('industry', value)} options={industryOptions} required />
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Company size</label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={signupValues.companySize}
                      onChange={(event) => onSignupValueChange('companySize', event.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155CFF]/30"
                    >
                      <option value="">Select size</option>
                      <option value="1-5">1-5 collaborators</option>
                      <option value="6-20">6-20 collaborators</option>
                      <option value="21-100">21-100 collaborators</option>
                      <option value="101+">101+ collaborators</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-[0.42fr_0.58fr]">
                  <IconSelect icon={Globe2} label="Country" value={signupValues.country} onChange={(value) => onSignupValueChange('country', value)} options={countryOptions} required />
                  <IconInput icon={Phone} label="Phone" value={signupValues.phone} onChange={(value) => onSignupValueChange('phone', value)} autoComplete="tel" required />
                </div>
              </>
            )}

            {signupErrorMessage ? (
              <ErrorBox message={signupErrorMessage} />
            ) : null}

            {signupNoticeMessage && !signupCheckoutReturn ? (
              <NoticeBox message={signupNoticeMessage} />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              {isPlanStep ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSignupBackToAccount}
                  className="h-12 flex-1 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Account details
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={isSignupSubmitting}
                className="h-12 flex-1 rounded-xl bg-[#155CFF] text-white shadow-sm shadow-[#155CFF]/20 hover:bg-[#0B45CC]"
              >
                {isSignupSubmitting ? 'Opening secure checkout' : (
                  <>
                    {isPlanStep ? 'Continue to secure payment' : 'Continue to plan'}
                    {isPlanStep ? <CreditCard className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </>
                )}
              </Button>
            </div>

            {isPlanStep ? (
              <p className="text-center text-xs leading-5 text-slate-500">
                Your card is verified first. Checkout expires after 30 minutes. The 30-day free trial starts after secure payment setup succeeds.
              </p>
            ) : null}
          </form>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <IconInput
              icon={Building2}
              label="Company name"
              value={companyName}
              onChange={onCompanyNameChange}
              onBlur={onCompanyNameBlur}
              placeholder="Enter your company name"
              autoComplete="organization"
              ariaInvalid={showCompanyNameError}
              required
            />
            {showCompanyNameError ? (
              <p className="text-sm text-red-600">Enter your company name.</p>
            ) : null}
            <IconInput
              icon={Mail}
              label={copy.emailLabel}
              type="email"
              value={email}
              onChange={onEmailChange}
              onBlur={onEmailBlur}
              placeholder={copy.emailPlaceholder}
              autoComplete="email"
              ariaInvalid={showEmailError}
            />
            {showEmailError ? (
              <p className="text-sm text-red-600">{copy.emailError}</p>
            ) : null}
            <PasswordInput
              copy={copy}
              label={copy.passwordLabel}
              value={password}
              autoComplete="current-password"
              showPassword={showPassword}
              onChange={onPasswordChange}
              onTogglePassword={onTogglePassword}
              action={(
                <button
                  type="button"
                  onClick={onOpenResetModal}
                  className="text-sm font-bold text-[#155CFF] underline-offset-4 transition hover:text-[#0B45CC] hover:underline"
                >
                  {copy.forgotPassword}
                </button>
              )}
            />

            {errorMessage ? (
              <ErrorBox message={errorMessage} />
            ) : null}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-12 w-full rounded-xl bg-[#155CFF] text-white shadow-sm shadow-[#155CFF]/20 hover:bg-[#0B45CC]"
            >
              {isSubmitting ? copy.signingIn : (
                <>
                  {copy.signIn}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-600">
          <span>{isSignupMode ? 'Already have an account?' : 'New to Indice?'}</span>
          <button
            type="button"
            onClick={isSignupMode ? onOpenLoginMode : onOpenSignupMode}
            className="font-bold text-[#155CFF] underline-offset-4 transition hover:text-[#0B45CC] hover:underline"
          >
            {isSignupMode ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/signup" className="font-bold text-[#155CFF] underline-offset-4 hover:underline">
            Prueba Índice durante 30 días
          </Link>
        </p>

        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
          <p className="text-sm font-bold text-[#222831]">{copy.insideTitle}</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {copy.insideItems.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#59C3A5]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CheckoutReturnNotice({
  result,
  onContinueSignup,
}: {
  result: Exclude<SignupCheckoutReturn, null>;
  onContinueSignup: () => void;
}) {
  const isComplete = result.status === 'completed';
  const isPending = result.status === 'pending';
  const isPositive = isComplete || isPending;
  const title = checkoutReturnTitle(result.status);
  return (
    <div className={`mb-4 rounded-2xl border px-4 py-4 ${
      isPositive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
    }`}
    >
      <div className="flex items-start gap-3">
        {isComplete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : null}
        {isPending ? <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin" /> : null}
        {!isPositive ? <CreditCard className="mt-0.5 h-5 w-5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {title}
          </p>
          <p className="mt-1 text-sm leading-5">
            {result.message}
          </p>
          {isPending && result.isPolling ? (
            <p className="mt-2 text-xs font-semibold opacity-80">
              Checking account status...
            </p>
          ) : null}
          {result.canLogin ? (
            <p className="mt-2 text-xs font-semibold opacity-80">
              Use your company name, email, and password to sign in below.
            </p>
          ) : null}
          {result.canRestart ? (
            <button
              type="button"
              onClick={onContinueSignup}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-amber-100"
            >
              Continue account setup
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function checkoutReturnTitle(status: Exclude<SignupCheckoutReturn, null>['status']) {
  if (status === 'completed') {
    return 'Account created';
  }
  if (status === 'pending') {
    return 'Payment setup received';
  }
  if (status === 'cancelled') {
    return 'Checkout was cancelled';
  }
  if (status === 'expired') {
    return 'Checkout expired';
  }
  if (status === 'superseded') {
    return 'Checkout replaced';
  }
  if (status === 'not_found') {
    return 'Checkout not found';
  }
  return 'Checkout needs attention';
}

function SignupStepHeader({ step }: { step: SignupStep }) {
  const steps = [
    { id: 'account' as const, label: 'Account' },
    { id: 'plan' as const, label: 'Plan' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
      {steps.map((item, index) => {
        const isActive = item.id === step;
        return (
          <div
            key={item.id}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold transition ${
              isActive ? 'bg-white text-[#155CFF] shadow-sm' : 'text-slate-500'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
              isActive ? 'bg-[#155CFF] text-white' : 'bg-white text-slate-500'
            }`}
            >
              {index + 1}
            </span>
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

function PlanSelectionPanel({
  signupPlan,
  minimumExtraCollaborators,
  basePrice,
  extraCollaboratorTotal,
  monthlyTotal,
  onSignupPlanChange,
}: {
  signupPlan: SignupPlanValues;
  minimumExtraCollaborators: number;
  basePrice: number;
  extraCollaboratorTotal: number;
  monthlyTotal: number;
  onSignupPlanChange: (field: keyof SignupPlanValues, value: string | number | boolean | string[]) => void;
}) {
  const userCount = INCLUDED_COLLABORATORS + signupPlan.extraCollaborators;

  const selectPlan = (planId: SignupPlanId) => {
    onSignupPlanChange('planId', planId);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#155CFF]/20 bg-[#155CFF]/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#155CFF]" />
          <div>
            <p className="text-sm font-bold text-[#222831]">30-day free trial before billing</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Every plan includes 5 users. Extra users are $10/mo each. The first 30 days include all Basic modules, no matter which paid plan you choose. Prices exclude taxes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {planCards.map((plan) => {
          const selected = signupPlan.planId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(plan.id)}
              aria-pressed={selected}
              className={`min-h-36 rounded-xl border p-4 text-left transition ${
                selected
                  ? 'border-[#155CFF] bg-[#155CFF]/5 shadow-sm shadow-[#155CFF]/10'
                  : 'border-slate-200 bg-white hover:border-[#155CFF]/40 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers3 className={`h-4 w-4 ${selected ? 'text-[#155CFF]' : 'text-slate-400'}`} />
                  <p className="text-sm font-bold text-[#222831]">{plan.title}</p>
                </div>
                {selected ? <BadgeCheck className="h-4 w-4 text-[#155CFF]" /> : null}
              </div>
              <p className="mt-3 text-xl font-bold text-[#222831]">{plan.priceLabel}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{plan.description}</p>
              {plan.badge ? (
                <span className="mt-3 inline-flex rounded-full bg-[#59C3A5]/15 px-2.5 py-1 text-xs font-bold text-[#1F7D68]">
                  {plan.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ModuleSelectionPanel
        planId={signupPlan.planId}
        selectedModuleSlugs={signupPlan.selectedModuleSlugs}
        onChange={(value) => onSignupPlanChange('selectedModuleSlugs', value)}
      />

      <StepperControl
        icon={Users}
        label="Extra users"
        helper={`${INCLUDED_COLLABORATORS} users are included by default. Add only the users above those ${INCLUDED_COLLABORATORS} at $${EXTRA_COLLABORATOR_PRICE}/mo each.`}
        value={signupPlan.extraCollaborators}
        minimum={minimumExtraCollaborators}
        onChange={(value) => onSignupPlanChange('extraCollaborators', value)}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#222831]">Monthly estimate</p>
            <p className="mt-1 text-xs text-slate-500">
              {userCount} users total: {INCLUDED_COLLABORATORS} included + {signupPlan.extraCollaborators} extra
            </p>
          </div>
          <p className="text-2xl font-bold text-[#155CFF]">{formatUsdMonthly(monthlyTotal)}</p>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <p>Plan: {formatUsdMonthly(basePrice)}</p>
          <p>Included users: {INCLUDED_COLLABORATORS}</p>
          <p>Extra users: {formatUsdMonthly(extraCollaboratorTotal)}</p>
        </div>
      </div>
    </div>
  );
}

function ModuleSelectionPanel({
  planId,
  selectedModuleSlugs,
  onChange,
}: {
  planId: SignupPlanId;
  selectedModuleSlugs: string[];
  onChange: (value: string[]) => void;
}) {
  const isAllModules = planId === 'all-modules';
  const selectedSet = new Set(selectedModuleSlugs);

  const toggleModule = (moduleSlug: string) => {
    if (isAllModules) {
      return;
    }
    if (planId === 'one-module') {
      onChange([moduleSlug]);
      return;
    }
    if (planId === 'two-modules') {
      if (selectedSet.has(moduleSlug)) {
        return;
      }
      const next = selectedModuleSlugs.length >= 2
        ? [selectedModuleSlugs[1], moduleSlug]
        : [...selectedModuleSlugs, moduleSlug];
      onChange(next);
      return;
    }
    if (selectedSet.has(moduleSlug)) {
      if (selectedModuleSlugs.length > MIN_CUSTOM_MODULES) {
        onChange(selectedModuleSlugs.filter((value) => value !== moduleSlug));
      }
      return;
    }
    onChange([...selectedModuleSlugs, moduleSlug]);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Layers3 className="mt-0.5 h-5 w-5 text-[#155CFF]" />
        <div>
          <p className="text-sm font-bold text-[#222831]">Module selection</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {moduleSelectionHelper(planId)} Config Center is included automatically.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {SIGNUP_MODULE_OPTIONS.map((module) => {
          const selected = selectedSet.has(module.slug);
          return (
            <button
              key={module.slug}
              type="button"
              disabled={isAllModules}
              onClick={() => toggleModule(module.slug)}
              aria-pressed={selected}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                selected
                  ? 'border-[#155CFF] bg-[#155CFF]/5 text-[#222831]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#155CFF]/40'
              } ${isAllModules ? 'cursor-default' : ''}`}
            >
              <span>{module.label}</span>
              {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#155CFF]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function moduleSelectionHelper(planId: SignupPlanId) {
  if (planId === 'one-module') {
    return 'Choose one paid module.';
  }
  if (planId === 'two-modules') {
    return 'Choose two paid modules.';
  }
  if (planId === 'custom-modules') {
    return 'Choose three or more paid modules.';
  }
  return 'All paid Basic modules are selected.';
}

function StepperControl({
  icon: Icon,
  label,
  helper,
  value,
  minimum,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  helper: string;
  value: number;
  minimum: number;
  onChange: (value: number) => void;
}) {
  const nextDown = Math.max(minimum, value - 1);
  const nextUp = Math.min(500, value + 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 text-[#155CFF]" />
          <div>
            <p className="text-sm font-bold text-[#222831]">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
          </div>
        </div>
        <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => onChange(nextDown)}
            disabled={value <= minimum}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Decrease ${label}`}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center text-sm font-bold text-[#222831]">{value}</span>
          <button
            type="button"
            onClick={() => onChange(nextUp)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800"
            aria-label={`Increase ${label}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getPlanBasePrice(plan: SignupPlanValues) {
  if (plan.planId === 'one-module') {
    return 59;
  }
  if (plan.planId === 'two-modules') {
    return 99;
  }
  if (plan.planId === 'custom-modules') {
    return 99 + (Math.max(plan.moduleCount, MIN_CUSTOM_MODULES) - 2) * 49;
  }
  return 199;
}

function formatUsdMonthly(value: number) {
  return `$${value}/mo`;
}

function IconInput({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  maxLength,
  onBlur,
  ariaInvalid,
  required = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  onBlur?: () => void;
  ariaInvalid?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm focus-visible:ring-[#155CFF]/30"
          autoComplete={autoComplete}
          aria-invalid={ariaInvalid}
          required={required}
        />
      </div>
    </div>
  );
}

function IconSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155CFF]/30"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PasswordInput({
  copy,
  label,
  value,
  autoComplete,
  showPassword,
  onChange,
  onTogglePassword,
  action,
  required = false,
}: {
  copy: LoginPageCopy;
  label: string;
  value: string;
  autoComplete: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onTogglePassword: () => void;
  action?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {action}
      </div>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm focus-visible:ring-[#155CFF]/30"
          autoComplete={autoComplete}
          required={required}
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={showPassword ? copy.hidePassword : copy.showPassword}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function NoticeBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#155CFF]/20 bg-[#155CFF]/5 px-4 py-3 text-sm text-[#0B45CC]">
      {message}
    </div>
  );
}
