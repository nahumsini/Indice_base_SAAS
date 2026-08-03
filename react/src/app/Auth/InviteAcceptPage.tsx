import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  configCenterApi,
  type InvitationDetails,
} from '../api/configCenter';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { languages, useLanguage } from '../shared/context';
import { IndiceBrandLogo } from './components/IndiceBrandLogo';
import {
  getInviteAcceptCopy,
  localizeInvitationError,
  type InviteAcceptCopy,
} from './inviteAcceptCopy';

type PageState = 'loading' | 'ready' | 'accepted' | 'expired' | 'invalid' | 'complete';

export default function InviteAcceptPage() {
  const navigate = useNavigate();
  const { token = '' } = useParams();
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const copy = getInviteAcceptCopy(currentLanguage.code);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const loadInvitation = async () => {
      if (!token.trim()) {
        setPageState('invalid');
        return;
      }

      try {
        setPageState('loading');
        setErrorMessage('');
        const details = await configCenterApi.getInvitation(token);
        if (!active) {
          return;
        }

        setInvitation(details);
        if (details.status === 'accepted') {
          setPageState('accepted');
        } else if (details.status === 'expired') {
          setPageState('expired');
        } else {
          setPageState('ready');
        }
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : copy.loadFallback;
        setErrorMessage(localizeInvitationError(message, copy));
        setPageState('invalid');
      }
    };

    void loadInvitation();

    return () => {
      active = false;
    };
  }, [copy, token]);

  const canSubmit = useMemo(
    () => password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword && !isSubmitting,
    [confirmPassword, isSubmitting, password],
  );

  const handleAcceptInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setErrorMessage(password !== confirmPassword ? copy.passwordMismatch : copy.passwordLength);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await configCenterApi.acceptInvitation(token, {
        password,
        confirm_password: confirmPassword,
      });
      setPageState('complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.acceptFallback;
      setErrorMessage(localizeInvitationError(message, copy));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = pageState === 'complete'
    ? (invitation?.existing_user ? copy.titles.connected : copy.titles.complete)
    : pageState === 'accepted'
      ? copy.titles.accepted
      : pageState === 'expired'
        ? copy.titles.expired
        : pageState === 'invalid'
          ? copy.titles.invalid
          : (invitation?.existing_user ? copy.titles.existing : copy.titles.ready);

  const description = pageState === 'complete'
    ? (invitation?.existing_user ? copy.descriptions.connected : copy.descriptions.complete)
    : pageState === 'accepted'
      ? copy.descriptions.accepted
      : pageState === 'expired'
        ? copy.descriptions.expired
        : pageState === 'invalid'
          ? (errorMessage || copy.descriptions.invalid)
          : (invitation?.existing_user ? copy.descriptions.existing : copy.descriptions.ready);

  const companyName = invitation?.company_name || copy.workspaceFallback;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#F8FAFC_0%,_#EEF4FA_52%,_#F8FAFC_100%)] px-3 py-3 text-slate-900 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between">
        <IndiceBrandLogo alt={copy.logoAlt} className="h-12 w-40" imageClassName="w-[184px]" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2 rounded-full border-slate-200 bg-white/90 px-3 font-medium text-[var(--indice-structural-blue)] shadow-sm hover:text-[var(--indice-structural-blue-hover)] sm:px-4">
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

      <div className="mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-[1180px] items-center py-5 lg:py-8">
        <section className="relative grid w-full overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_28px_90px_-54px_rgba(15,58,91,0.45)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="absolute inset-x-0 top-0 z-10 h-1 bg-[linear-gradient(90deg,#59C3A5_0_25%,#F7C948_25%_50%,#FF6B63_50%_75%,#2F6BFF_75%_100%)]" />

          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(89,195,165,0.20),_transparent_52%),linear-gradient(145deg,#F8FCFB_0%,#F3F8FC_100%)] p-7 sm:p-9 lg:border-b-0 lg:border-r lg:p-11">
            <div className="flex h-full min-h-64 flex-col justify-between gap-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#59C3A5]/40 bg-[#59C3A5]/10 px-3 py-1.5 text-sm font-medium text-[#157760]">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.secureAccess}
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-md text-[34px] font-medium leading-[1.12] text-slate-950 sm:text-[40px]">
                    {copy.brandTitle}
                  </h1>
                  <p className="max-w-md text-base leading-7 text-slate-600">
                    {copy.brandBody(companyName)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <InvitationPromise icon={KeyRound} text={copy.singleUse} />
                <InvitationPromise icon={UsersRound} text={copy.samePassword} />
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-9 lg:p-11">
            <div className="mb-7 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#59C3A5]/35 bg-[#59C3A5]/10 px-3 py-1.5 text-sm font-medium text-[#157760]">
                <KeyRound className="h-4 w-4" />
                {copy.userInvitation}
              </div>
              <h2 className="text-[30px] font-medium leading-tight text-slate-950 sm:text-[34px]">{title}</h2>
              <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
            </div>

            {pageState === 'loading' ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                {copy.loading}
              </div>
            ) : null}

            {pageState === 'ready' && invitation ? (
              <form onSubmit={handleAcceptInvitation} className="space-y-5">
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 sm:p-5">
                  <InviteDetail label={copy.company} value={companyName} />
                  <InviteDetail label={copy.role} value={copy.roles[invitation.role] || invitation.role} />
                  <InviteDetail label={copy.name} value={invitation.full_name || copy.invitedUserFallback} />
                  <InviteDetail label={copy.email} value={invitation.email} />
                </div>

                <PasswordField
                  label={invitation.existing_user ? copy.currentPassword : copy.createPassword}
                  hint={copy.passwordHint}
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((current) => !current)}
                  autoComplete={invitation.existing_user ? 'current-password' : 'new-password'}
                  copy={copy}
                />
                <PasswordField
                  label={invitation.existing_user ? copy.confirmCurrentPassword : copy.confirmPassword}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword((current) => !current)}
                  autoComplete={invitation.existing_user ? 'current-password' : 'new-password'}
                  copy={copy}
                />

                {errorMessage ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    <TriangleAlert className="mt-1 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-12 w-full rounded-xl bg-[#15866B] font-medium text-white shadow-[0_12px_28px_-18px_rgba(21,134,107,0.8)] hover:bg-[#10735B]"
                >
                  {isSubmitting ? (invitation.existing_user ? copy.connecting : copy.creating) : (
                    <>
                      {invitation.existing_user ? copy.connectWorkspace : copy.acceptInvitation}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : null}

            {['accepted', 'expired', 'invalid', 'complete'].includes(pageState) ? (
              <div className="space-y-5">
                <div className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm leading-6 ${
                  pageState === 'complete'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
                >
                  {pageState === 'complete' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <span>{description}</span>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="h-12 w-full rounded-xl bg-[#15866B] font-medium text-white hover:bg-[#10735B]"
                >
                  {copy.goToLogin}
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

function InvitationPromise({ icon: Icon, text }: { icon: typeof KeyRound; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 text-sm leading-6 text-slate-700 shadow-sm">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#59C3A5]/12 text-[#157760]">
        <Icon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}

function InviteDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900" title={value}>{value}</p>
    </div>
  );
}

function PasswordField({
  label,
  hint,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete = 'new-password',
  copy,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
  copy: InviteAcceptCopy;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm focus-visible:ring-[#59C3A5]"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={show ? copy.hidePassword : copy.showPassword}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
